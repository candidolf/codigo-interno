// ef_mp_webhook — Webhook do Mercado Pago.
//
// PARA ATIVAR:
// 1. Cadastre os secrets MERCADO_PAGO_ACCESS_TOKEN e MP_WEBHOOK_SECRET
//    no painel do Supabase em: Edge Functions → Manage secrets.
// 2. Faça deploy: supabase functions deploy ef_mp_webhook --no-verify-jwt
// 3. Configure a URL pública desta função no painel do Mercado Pago,
//    em Webhooks/Notificações: https://<project-ref>.functions.supabase.co/ef_mp_webhook
//
// Enquanto MERCADO_PAGO_ACCESS_TOKEN estiver vazio, o app trabalha em modo
// simulado (createPurchase marca status='pago' imediatamente).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!mpToken) return new Response("MP not configured", { status: 503 });

  const rawBody = await req.text();

  // Validação simples de assinatura (placeholder — adapte ao header real do MP).
  if (secret) {
    const sig = req.headers.get("x-signature") ?? "";
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (!sig.includes(expected)) {
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return new Response("bad json", { status: 400 }); }

  const paymentId = payload?.data?.id ?? payload?.id;
  if (!paymentId) return new Response("no payment id", { status: 400 });

  const mp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  });
  if (!mp.ok) return new Response("mp fetch failed", { status: 502 });
  const payment = await mp.json();

  const purchaseId = payment?.external_reference;
  if (!purchaseId) return new Response("no external_reference", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await supabase.from("payments").upsert({
    purchase_id: purchaseId,
    mp_payment_id: String(paymentId),
    method: payment?.payment_type_id ?? null,
    status: payment?.status ?? null,
    raw: payment,
  }, { onConflict: "mp_payment_id" });

  if (payment?.status === "approved") {
    await supabase.from("test_purchases")
      .update({ status: "pago", updated_at: new Date().toISOString() })
      .eq("id", purchaseId)
      .eq("status", "aguardando_pagamento");
  }

  return new Response("ok", { headers: corsHeaders });
});

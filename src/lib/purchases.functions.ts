import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createInput = z.object({
  paymentMethod: z.enum(["pix", "card"]).default("pix"),
  sellerCode: z.string().trim().max(64).optional().nullable(),
});

export const createPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const mpEnabled = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);

    const initialStatus = mpEnabled ? "aguardando_pagamento" : "pago";

    const { data: purchase, error } = await supabase
      .from("test_purchases")
      .insert({
        master_id: userId,
        status: initialStatus,
        amount_cents: 2990,
        seller_code: data.sellerCode || null,
        payment_method: data.paymentMethod,
        simulated: !mpEnabled,
      })
      .select("id, status, simulated")
      .single();

    if (error || !purchase) {
      throw new Error(error?.message ?? "Falha ao criar compra");
    }

    if (!mpEnabled) {
      return {
        purchaseId: purchase.id,
        simulated: true,
        status: "pago" as const,
        initPoint: null,
      };
    }

    // Stub real Mercado Pago — quando ativar, criar preference aqui.
    return {
      purchaseId: purchase.id,
      simulated: false,
      status: "aguardando_pagamento" as const,
      initPoint: null,
    };
  });

export const getPurchaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("test_purchases")
      .select("id, status, testando_user_id, testando_name")
      .eq("id", data.purchaseId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Não encontrado");
    return row;
  });

export const listMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("test_purchases")
      .select("id, status, testando_user_id, testando_name, amount_cents, created_at, simulated")
      .eq("master_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const assignSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabase
      .from("test_purchases")
      .update({
        testando_user_id: userId,
        testando_name: profile?.full_name ?? null,
        status: "em_andamento",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.purchaseId)
      .eq("master_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
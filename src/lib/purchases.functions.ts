import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

const createInput = z.object({
  sellerCode: z.string().trim().max(64).optional().nullable(),
  fullName: z.string().trim().min(2).max(120),
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
  phone: z.string().regex(/^\d{10,11}$/).optional().nullable(),
});

export const createPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, userEmail } = context;
    const asaas = await import("./asaas.server");
    const host = getRequestHeader("host") ?? null;
    const proto = getRequestHeader("x-forwarded-proto") ?? "https";
    const origin = process.env.APP_BASE_URL || (host ? `${proto}://${host}` : "");
    const cfg = asaas.getAsaasConfig(host);

    // 1) Cria/recupera customer no Asaas
    const { data: profile } = await supabase
      .from("profiles")
      .select("asaas_customer_id, cpf_cnpj, phone, full_name")
      .eq("id", userId)
      .maybeSingle();

    let customerId = profile?.asaas_customer_id as string | undefined;
    if (!customerId) {
      const customer = await asaas.createCustomer(cfg, {
        name: data.fullName,
        cpfCnpj: data.cpfCnpj,
        email: userEmail ?? undefined,
        phone: data.phone ?? undefined,
      });
      customerId = customer.id;
    }

    await supabase
      .from("profiles")
      .update({
        asaas_customer_id: customerId,
        cpf_cnpj: data.cpfCnpj,
        full_name: data.fullName,
        ...(data.phone ? { phone: data.phone } : {}),
      })
      .eq("id", userId);

    // 2) Cria compra local (aguardando_pagamento)
    const { data: purchase, error } = await supabase
      .from("test_purchases")
      .insert({
        master_id: userId,
        status: "aguardando_pagamento",
        amount_cents: 2990,
        seller_code: data.sellerCode || null,
        payment_method: "hosted",
        simulated: false,
      })
      .select("id")
      .single();

    if (error || !purchase) {
      throw new Error(error?.message ?? "Falha ao criar compra");
    }

    // 3) Cria payment no Asaas (fatura unificada: cliente escolhe PIX/Cartão/Boleto na página do Asaas)
    const dueDate = asaas.dueDateFromNow(3);
    const successUrl = origin
      ? `${origin}/pagamento/${purchase.id}`
      : `https://codigo-interno.lovable.app/pagamento/${purchase.id}`;

    let payment: Awaited<ReturnType<typeof asaas.createPayment>>;
    try {
      payment = await asaas.createPayment(cfg, {
        customer: customerId,
        billingType: "UNDEFINED",
        value: 29.9,
        dueDate,
        description: "Teste Código Interno",
        externalReference: purchase.id,
        callback: { successUrl, autoRedirect: true },
      });
    } catch (err) {
      await supabase
        .from("test_purchases")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
      throw err;
    }

    // 4) Persiste payment local
    await supabase.from("payments").insert({
      purchase_id: purchase.id,
      asaas_customer_id: customerId,
      asaas_payment_id: payment.id,
      method: "UNDEFINED",
      status: payment.status,
      invoice_url: payment.invoiceUrl ?? null,
      due_date: dueDate,
      raw: payment as any,
    });

    return {
      purchaseId: purchase.id,
      asaasPaymentId: payment.id,
      invoiceUrl: payment.invoiceUrl ?? null,
    };
  });

export const getPaymentDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: purchase, error } = await supabase
      .from("test_purchases")
      .select("id, status, master_id")
      .eq("id", data.purchaseId)
      .single();
    if (error || !purchase) throw new Error("Compra não encontrada");
    if (purchase.master_id !== userId) throw new Error("Acesso negado");

    const { data: payment } = await supabase
      .from("payments")
      .select("status, invoice_url, due_date")
      .eq("purchase_id", data.purchaseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      purchaseStatus: purchase.status as string,
      paymentStatus: payment?.status ?? null,
      invoiceUrl: payment?.invoice_url ?? null,
      dueDate: payment?.due_date ?? null,
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

export const getPurchaseTestando = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: purchase, error } = await supabase
      .from("test_purchases")
      .select("id, testando_user_id, testando_name")
      .eq("id", data.purchaseId)
      .single();
    if (error || !purchase) throw new Error(error?.message ?? "Compra não encontrada");

    let birthDate: string | null = null;
    if (purchase.testando_user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("birth_date")
        .eq("id", purchase.testando_user_id)
        .maybeSingle();
      birthDate = profile?.birth_date ?? null;
    }

    return {
      testandoUserId: purchase.testando_user_id,
      testandoName: purchase.testando_name,
      birthDate,
    };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const cardSchema = z.object({
  holderName: z.string().min(2).max(120),
  number: z.string().regex(/^\d{13,19}$/),
  expiryMonth: z.string().regex(/^\d{2}$/),
  expiryYear: z.string().regex(/^\d{4}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
  holderCpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
  holderPostalCode: z.string().regex(/^\d{8}$/),
  holderAddressNumber: z.string().min(1).max(20),
  holderPhone: z.string().regex(/^\d{10,11}$/).optional(),
});

const createInput = z.object({
  paymentMethod: z.enum(["pix", "card", "boleto"]).default("pix"),
  sellerCode: z.string().trim().max(64).optional().nullable(),
  fullName: z.string().trim().min(2).max(120),
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
  phone: z.string().regex(/^\d{10,11}$/).optional().nullable(),
  card: cardSchema.optional().nullable(),
});

export const createPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, userEmail } = context;
    const asaas = await import("./asaas.server");

    if (data.paymentMethod === "card" && !data.card) {
      throw new Error("Dados do cartão são obrigatórios");
    }

    // 1) Cria/recupera customer no Asaas
    const { data: profile } = await supabase
      .from("profiles")
      .select("asaas_customer_id, cpf_cnpj, phone, full_name")
      .eq("id", userId)
      .maybeSingle();

    let customerId = profile?.asaas_customer_id as string | undefined;
    if (!customerId) {
      const customer = await asaas.createCustomer({
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
        payment_method: data.paymentMethod,
        simulated: false,
      })
      .select("id")
      .single();

    if (error || !purchase) {
      throw new Error(error?.message ?? "Falha ao criar compra");
    }

    // 3) Cria payment no Asaas
    const billingType =
      data.paymentMethod === "pix" ? "PIX" :
      data.paymentMethod === "card" ? "CREDIT_CARD" : "BOLETO";
    const dueDate = asaas.dueDateFromNow(billingType === "PIX" ? 1 : 3);

    let payment: Awaited<ReturnType<typeof asaas.createPayment>>;
    try {
      payment = await asaas.createPayment({
        customer: customerId,
        billingType,
        value: 29.9,
        dueDate,
        description: "Teste Código Interno",
        externalReference: purchase.id,
        ...(data.card && billingType === "CREDIT_CARD"
          ? {
              creditCard: {
                holderName: data.card.holderName,
                number: data.card.number,
                expiryMonth: data.card.expiryMonth,
                expiryYear: data.card.expiryYear,
                ccv: data.card.ccv,
              },
              creditCardHolderInfo: {
                name: data.card.holderName,
                email: userEmail ?? "",
                cpfCnpj: data.card.holderCpfCnpj,
                postalCode: data.card.holderPostalCode,
                addressNumber: data.card.holderAddressNumber,
                phone: data.card.holderPhone,
              },
            }
          : {}),
      });
    } catch (err) {
      await supabase
        .from("test_purchases")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
      throw err;
    }

    // 4) PIX: busca QR code
    let pixQrCode: string | null = null;
    let pixCopyPaste: string | null = null;
    if (billingType === "PIX") {
      const qr = await asaas.getPixQrCode(payment.id);
      pixQrCode = qr.encodedImage;
      pixCopyPaste = qr.payload;
    }

    // 5) Persiste payment local
    await supabase.from("payments").insert({
      purchase_id: purchase.id,
      asaas_customer_id: customerId,
      asaas_payment_id: payment.id,
      method: billingType,
      status: payment.status,
      invoice_url: payment.invoiceUrl ?? null,
      boleto_url: payment.bankSlipUrl ?? null,
      pix_qr_code: pixQrCode,
      pix_copy_paste: pixCopyPaste,
      due_date: dueDate,
      raw: payment as any,
    });

    // 6) Se cartão já aprovou, marca pago
    const approvedNow =
      billingType === "CREDIT_CARD" &&
      ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(payment.status);
    if (approvedNow) {
      await supabase
        .from("test_purchases")
        .update({ status: "pago", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
    }

    return {
      purchaseId: purchase.id,
      method: billingType,
      status: approvedNow ? ("pago" as const) : ("aguardando_pagamento" as const),
      asaasPaymentId: payment.id,
      invoiceUrl: payment.invoiceUrl ?? null,
      boletoUrl: payment.bankSlipUrl ?? null,
      pixQrCode,
      pixCopyPaste,
      dueDate,
    };
  });

export const getPaymentDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: purchase, error } = await supabase
      .from("test_purchases")
      .select("id, status, payment_method, master_id")
      .eq("id", data.purchaseId)
      .single();
    if (error || !purchase) throw new Error("Compra não encontrada");
    if (purchase.master_id !== userId) throw new Error("Acesso negado");

    const { data: payment } = await supabase
      .from("payments")
      .select("status, invoice_url, boleto_url, pix_qr_code, pix_copy_paste, due_date, method")
      .eq("purchase_id", data.purchaseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      purchaseStatus: purchase.status as string,
      paymentMethod: purchase.payment_method as string | null,
      paymentStatus: payment?.status ?? null,
      invoiceUrl: payment?.invoice_url ?? null,
      boletoUrl: payment?.boleto_url ?? null,
      pixQrCode: payment?.pix_qr_code ?? null,
      pixCopyPaste: payment?.pix_copy_paste ?? null,
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
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

const createInput = z.object({
  sellerCode: z.string().trim().max(64).optional().nullable(),
  fullName: z.string().trim().min(2).max(120),
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .optional()
    .nullable(),
});

export const validateSellerCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin } = context;
    const code = data.code.trim().toUpperCase();
    const { data: seller } = await admin
      .from("sellers")
      .select("full_name, active")
      .eq("code", code)
      .maybeSingle();
    if (!seller || !seller.active) return { valid: false as const };
    return { valid: true as const, name: seller.full_name as string };
  });

export const createPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, admin, userId, userEmail } = context;
    const host = getRequestHeader("host") ?? null;
    const proto = getRequestHeader("x-forwarded-proto") ?? "https";
    const origin = process.env.APP_BASE_URL || (host ? `${proto}://${host}` : "");

    // Fail-safe: cobranças reais só são habilitadas por uma opção explícita.
    const { paymentsEnabled } = await import("./pagbank.server");
    const simulatePayment = !paymentsEnabled();

    // Valida código de vendedor quando informado (campo opcional) e captura a rate
    // para snapshot da comissão na compra.
    const sellerCodeNormalized = data.sellerCode?.trim()
      ? data.sellerCode.trim().toUpperCase()
      : null;
    let sellerRate: number | null = null;
    if (sellerCodeNormalized) {
      const { data: seller } = await admin
        .from("sellers")
        .select("active, commission_rate")
        .eq("code", sellerCodeNormalized)
        .maybeSingle();
      if (!seller || !seller.active) {
        throw new Error("Código de vendedor inválido");
      }
      sellerRate = Number(seller.commission_rate ?? 0);
    }

    const amountCents = 2990;
    const commissionCents = sellerRate != null ? Math.round(amountCents * sellerRate) : null;

    // ===== Modo simulado (PagBank desligado) =====
    if (simulatePayment) {
      await supabase
        .from("profiles")
        .update({
          cpf_cnpj: data.cpfCnpj,
          full_name: data.fullName,
          ...(data.phone ? { phone: data.phone } : {}),
        })
        .eq("id", userId);

      const { data: purchase, error } = await supabase
        .from("test_purchases")
        .insert({
          master_id: userId,
          status: "pago",
          amount_cents: amountCents,
          seller_code: sellerCodeNormalized,
          commission_rate: sellerRate,
          commission_cents: commissionCents,
          payment_method: "simulated",
          simulated: true,
        })
        .select("id")
        .single();

      if (error || !purchase) {
        throw new Error(error?.message ?? "Falha ao criar compra (simulada)");
      }

      await supabase.from("payments").insert({
        purchase_id: purchase.id,
        pagbank_order_id: `SIMULATED-${purchase.id}`,
        pagbank_charge_id: `SIMULATED-${purchase.id}`,
        method: "SIMULATED",
        status: "PAID",
        invoice_url: null,
        due_date: new Date().toISOString().slice(0, 10),
        raw: { simulated: true } as never,
      });

      return {
        purchaseId: purchase.id,
        pagbankOrderId: `SIMULATED-${purchase.id}`,
      };
    }

    // ===== Fluxo real PagBank (PIX) =====
    if (!userEmail) throw new Error("E-mail do pagador não disponível");
    await supabase
      .from("profiles")
      .update({
        cpf_cnpj: data.cpfCnpj,
        full_name: data.fullName,
        ...(data.phone ? { phone: data.phone } : {}),
      })
      .eq("id", userId);

    // 1) Cria compra local (aguardando_pagamento)
    const { data: purchase, error } = await supabase
      .from("test_purchases")
      .insert({
        master_id: userId,
        status: "aguardando_pagamento",
        amount_cents: amountCents,
        seller_code: sellerCodeNormalized,
        commission_rate: sellerRate,
        commission_cents: commissionCents,
        payment_method: "pix",
        simulated: false,
      })
      .select("id")
      .single();

    if (error || !purchase) {
      throw new Error(error?.message ?? "Falha ao criar compra");
    }

    // 2) Cria a cobrança PIX no PagBank.
    const pagbank = await import("./pagbank.server");
    const config = pagbank.getPagBankConfig();
    const callbackBase = (process.env.PAGBANK_CALLBACK_BASE_URL || origin).replace(/\/+$/, "");
    if (!callbackBase) throw new Error("PAGBANK_CALLBACK_BASE_URL não configurada");

    let order: Awaited<ReturnType<typeof pagbank.createPixOrder>>;
    try {
      order = await pagbank.createPixOrder(config, {
        purchaseId: purchase.id,
        amountCents,
        customer: {
          name: data.fullName,
          email: userEmail,
          taxId: data.cpfCnpj,
          phone: data.phone,
        },
        notificationUrl: `${callbackBase}/api/public/pagbank-webhook`,
      });
    } catch (err) {
      await supabase
        .from("test_purchases")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
      throw err;
    }

    const payment = pagbank.paymentData(order);
    if (!payment.charge) {
      await supabase
        .from("test_purchases")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
      throw new Error("PagBank não retornou os dados da cobrança PIX");
    }

    // 3) Persiste o pedido e a cobrança localmente.
    await supabase.from("payments").insert({
      purchase_id: purchase.id,
      pagbank_order_id: order.id,
      pagbank_charge_id: payment.charge.id,
      method: "PIX",
      status: payment.charge.status,
      invoice_url: null,
      pix_qr_code: payment.qrCodeUrl,
      pix_copy_paste: payment.copyPaste,
      due_date: payment.expirationDate?.slice(0, 10) ?? null,
      raw: order as never,
    });

    if (["DECLINED", "CANCELED"].includes(payment.charge.status)) {
      await supabase
        .from("test_purchases")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
    }

    return {
      purchaseId: purchase.id,
      pagbankOrderId: order.id,
    };
  });

export const getPaymentDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const purchaseResult = await supabase
      .from("test_purchases")
      .select("id, status, master_id")
      .eq("id", data.purchaseId)
      .single();
    let purchase = purchaseResult.data;
    const error = purchaseResult.error;
    if (error || !purchase) throw new Error("Compra não encontrada");
    if (purchase.master_id !== userId) throw new Error("Acesso negado");

    let { data: payment } = await supabase
      .from("payments")
      .select("id, status, pix_qr_code, pix_copy_paste, due_date, pagbank_order_id")
      .eq("purchase_id", data.purchaseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Reconciliação ativa como fallback ao webhook do PagBank.
    if (
      purchase.status === "aguardando_pagamento" &&
      payment?.pagbank_order_id &&
      !payment.pagbank_order_id.startsWith("SIMULATED-")
    ) {
      try {
        const pagbank = await import("./pagbank.server");
        const remote = await pagbank.getOrder(pagbank.getPagBankConfig(), payment.pagbank_order_id);
        const remotePayment = pagbank.paymentData(remote);
        const remoteStatus = remotePayment.charge?.status;
        if (remoteStatus === "PAID") {
          await supabase
            .from("test_purchases")
            .update({ status: "pago", updated_at: new Date().toISOString() })
            .eq("id", purchase.id);
          await supabase
            .from("payments")
            .update({ status: remoteStatus, raw: remote as never })
            .eq("id", payment.id);
          purchase = { ...purchase, status: "pago" };
          payment = { ...payment, status: remoteStatus };
        } else if (remoteStatus && ["DECLINED", "CANCELED"].includes(remoteStatus)) {
          await supabase
            .from("test_purchases")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("id", purchase.id)
            .eq("status", "aguardando_pagamento");
          purchase = { ...purchase, status: "cancelado" };
          payment = { ...payment, status: remoteStatus };
        }
      } catch (e) {
        console.warn("[pagbank] reconcile failed", (e as Error)?.message);
      }
    }

    return {
      purchaseStatus: purchase.status as string,
      paymentStatus: payment?.status ?? null,
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

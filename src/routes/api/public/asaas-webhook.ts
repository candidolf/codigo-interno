import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  event: z.string(),
  payment: z.object({
    id: z.string(),
    status: z.string(),
    externalReference: z.string().uuid().nullable().optional(),
    invoiceUrl: z.string().optional().nullable(),
    bankSlipUrl: z.string().optional().nullable(),
  }),
});

const APPROVED_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_RECEIVED_IN_CASH",
]);
const CANCELED_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
]);

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        if (!expected) return new Response("Webhook not configured", { status: 503 });

        const received = request.headers.get("asaas-access-token");
        if (!received || received !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.text();
        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(body));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { event, payment } = parsed;
        const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = getSupabaseAdmin();

        await admin
          .from("payments")
          .update({
            status: payment.status,
            invoice_url: payment.invoiceUrl ?? null,
            boleto_url: payment.bankSlipUrl ?? null,
            raw: parsed as any,
            updated_at: new Date().toISOString(),
          })
          .eq("asaas_payment_id", payment.id);

        const purchaseId = payment.externalReference;
        if (purchaseId) {
          if (APPROVED_EVENTS.has(event)) {
            await admin
              .from("test_purchases")
              .update({ status: "pago", updated_at: new Date().toISOString() })
              .eq("id", purchaseId)
              .eq("status", "aguardando_pagamento");
          } else if (CANCELED_EVENTS.has(event)) {
            await admin
              .from("test_purchases")
              .update({ status: "cancelado", updated_at: new Date().toISOString() })
              .eq("id", purchaseId)
              .in("status", ["aguardando_pagamento"]);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
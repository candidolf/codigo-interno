import { createHash, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z
  .object({
    id: z.string(),
    reference_id: z.string().uuid().optional(),
    charges: z
      .array(
        z
          .object({
            id: z.string(),
            reference_id: z.string().uuid().optional(),
            status: z.string(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

function validSignature(token: string, body: string, received: string | null): boolean {
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHash("sha256").update(`${token}-${body}`, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export const Route = createFileRoute("/api/public/pagbank-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getPagBankConfig } = await import("@/lib/pagbank.server");
        let config: ReturnType<typeof getPagBankConfig>;
        try {
          config = getPagBankConfig();
        } catch {
          return new Response("Webhook not configured", { status: 503 });
        }

        const body = await request.text();
        if (!validSignature(config.token, body, request.headers.get("x-authenticity-token"))) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: z.infer<typeof payloadSchema>;
        try {
          payload = payloadSchema.parse(JSON.parse(body));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const charge = payload.charges?.[0];
        const purchaseId = payload.reference_id ?? charge?.reference_id;
        const status = charge?.status ?? "UNKNOWN";
        const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = getSupabaseAdmin();

        await admin
          .from("payments")
          .update({
            pagbank_charge_id: charge?.id ?? null,
            status,
            raw: payload as never,
            updated_at: new Date().toISOString(),
          })
          .eq("pagbank_order_id", payload.id);

        if (purchaseId && status === "PAID") {
          await admin
            .from("test_purchases")
            .update({ status: "pago", updated_at: new Date().toISOString() })
            .eq("id", purchaseId)
            .eq("status", "aguardando_pagamento");
        } else if (purchaseId && ["DECLINED", "CANCELED"].includes(status)) {
          await admin
            .from("test_purchases")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("id", purchaseId)
            .eq("status", "aguardando_pagamento");
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

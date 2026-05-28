import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = new Proxy({}, {
  get(_t, prop) {
    // @ts-expect-error dynamic forward
    return getSupabaseAdmin()[prop];
  },
}) as ReturnType<typeof getSupabaseAdmin>;

function genToken(len = 24) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      purchaseId: z.string().uuid(),
      testandoName: z.string().trim().min(1).max(120),
      testandoEmail: z.string().email().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const token = genToken(24);

    const { error: invErr } = await supabase.from("invites").insert({
      token,
      purchase_id: data.purchaseId,
      master_id: userId,
      testando_name: data.testandoName,
      testando_email: data.testandoEmail ?? null,
    });
    if (invErr) throw new Error(invErr.message);

    const { error: upErr } = await supabase
      .from("test_purchases")
      .update({
        testando_name: data.testandoName,
        testando_email: data.testandoEmail ?? null,
        status: "aguardando_convidado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.purchaseId)
      .eq("master_id", userId);
    if (upErr) throw new Error(upErr.message);

    return { token };
  });

export const getInviteByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("invites")
      .select("token, testando_name, testando_email, consumed_at, expires_at, purchase_id, master_id")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: master } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", row.master_id)
      .maybeSingle();

    return {
      token: row.token,
      testandoName: row.testando_name,
      testandoEmail: row.testando_email,
      consumed: !!row.consumed_at,
      expired: new Date(row.expires_at) < new Date(),
      purchaseId: row.purchase_id,
      masterName: master?.full_name ?? "alguém",
    };
  });

export const consumeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: invite, error: fetchErr } = await supabaseAdmin
      .from("invites")
      .select("token, purchase_id, master_id, consumed_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!invite) throw new Error("Convite inválido");
    if (invite.consumed_at) throw new Error("Convite já utilizado");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Convite expirado");

    const { error: invUpdate } = await supabaseAdmin
      .from("invites")
      .update({ consumed_by: userId, consumed_at: new Date().toISOString() })
      .eq("token", invite.token);
    if (invUpdate) throw new Error(invUpdate.message);

    const { error: pUpdate } = await supabaseAdmin
      .from("test_purchases")
      .update({
        testando_user_id: userId,
        status: "em_andamento",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.purchase_id);
    if (pUpdate) throw new Error(pUpdate.message);

    await supabaseAdmin
      .from("profiles")
      .update({ linked_master_id: invite.master_id })
      .eq("id", userId);

    return { purchaseId: invite.purchase_id };
  });

export const checkInviteEmailStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("testando_email")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const email = invite?.testando_email ?? null;
    if (!email) return { emailExists: false, email: null };

    // Check auth.users via admin listUsers (filter client-side by email)
    let emailExists = false;
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const lower = email.toLowerCase();
      emailExists = !!list?.users?.some((u: any) => (u.email ?? "").toLowerCase() === lower);
    } catch {
      emailExists = false;
    }
    return { emailExists, email };
  });
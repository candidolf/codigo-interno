import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: isAdminData } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdminData) throw new Error("Acesso negado");

    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = getSupabaseAdmin();

    const [{ data: profs }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("id, full_name, birth_date, phone, linked_master_id"),
      admin.from("user_roles").select("user_id, role"),
    ]);

    const emailMap = new Map<string, string>();
    let page = 1;
    // paginate up to ~2000 users
    while (page <= 20) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !list?.users?.length) break;
      for (const u of list.users) {
        if (u.id && u.email) emailMap.set(u.id, u.email);
      }
      if (list.users.length < 200) break;
      page++;
    }

    const roleMap = new Map<string, string>();
    const rank = (x: string) => (x === "admin" ? 3 : x === "master" ? 2 : 1);
    (roles ?? []).forEach((r: any) => {
      const prev = roleMap.get(r.user_id);
      if (!prev || rank(r.role) > rank(prev)) roleMap.set(r.user_id, r.role);
    });

    return (profs ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      birth_date: p.birth_date,
      phone: p.phone,
      linked_master_id: p.linked_master_id,
      email: emailMap.get(p.id) ?? null,
      role: (roleMap.get(p.id) as "admin" | "master" | "user" | undefined) ?? null,
    }));
  });
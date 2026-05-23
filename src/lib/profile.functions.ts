import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, userEmail } = context;

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, birth_date, linked_master_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    return {
      userId,
      email: userEmail,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      birthDate: profile?.birth_date ?? null,
      linkedMasterId: profile?.linked_master_id ?? null,
      roles: (roles ?? []).map((r) => r.role as "master" | "user" | "admin"),
    };
  });
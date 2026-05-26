import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Role = "admin" | "master" | "user";

export const getSessionHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, userId, userEmail } = context as any;
    // Use admin (service role) para evitar qualquer surpresa de RLS
    // ao validar o papel do usuário.
    const { data, error } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      // não derruba sessão; devolve fallback seguro
      return { userId, email: userEmail, roles: [] as Role[], primaryRole: "user" as Role, home: "/dashboard" as const, isAdmin: false };
    }
    const roles = (data ?? []).map((r: any) => r.role as Role);
    const isAdmin = roles.includes("admin");
    const primaryRole: Role = isAdmin
      ? "admin"
      : roles.includes("master")
      ? "master"
      : "user";
    const home = isAdmin ? "/admin" : "/dashboard";
    return { userId, email: userEmail, roles, primaryRole, home, isAdmin };
  });
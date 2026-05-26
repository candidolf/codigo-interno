import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    if (!supabaseConfigured) return;
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return; // _authenticated trata

    const cacheKey = `admin-role:${uid}`;
    // Cache apenas confirmação positiva — nunca cachear "não-admin" porque uma
    // consulta momentaneamente vazia (RLS/race) trancaria o usuário fora.
    try {
      if (sessionStorage.getItem(cacheKey) === "1") return;
    } catch {}

    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    // Se a consulta falhar, não derruba o usuário — deixa o componente lidar.
    if (error) return;

    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (isAdmin) {
      try { sessionStorage.setItem(cacheKey, "1"); } catch {}
      return;
    }
    // Confirmado não-admin → manda para dashboard, nunca para login.
    throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
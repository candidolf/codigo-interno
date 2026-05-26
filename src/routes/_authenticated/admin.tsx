import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    if (!supabaseConfigured) return;
    // _authenticated pai já garantiu sessão; aqui usamos getSession() (sem rede)
    // para evitar redirects em race conditions de token refresh.
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return; // _authenticated trata

    const cacheKey = `admin-role:${uid}`;
    let isAdmin: boolean | null = null;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached === "1") isAdmin = true;
      else if (cached === "0") isAdmin = false;
    } catch {}

    if (isAdmin === null) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      try {
        sessionStorage.setItem(cacheKey, isAdmin ? "1" : "0");
      } catch {}
    }

    if (!isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
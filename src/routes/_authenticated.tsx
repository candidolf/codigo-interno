import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (!supabaseConfigured) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    // Usar getSession (sem rede) para evitar race com refresh de token.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
  },
  component: () => <Outlet />,
});
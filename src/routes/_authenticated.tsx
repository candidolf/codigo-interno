import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (!supabaseConfigured) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
  },
  component: () => <Outlet />,
});
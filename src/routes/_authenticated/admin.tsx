import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    const me = await getCurrentUser();
    if (!me?.isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
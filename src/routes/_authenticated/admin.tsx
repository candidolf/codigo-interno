import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    if (!supabaseConfigured) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
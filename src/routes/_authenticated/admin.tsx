import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    const me = await getCurrentUser();
    if (!me) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    if (!me.isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
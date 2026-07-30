import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Leitura local da sessão (sem round-trip). A validação real do token
    // continua no servidor via requireSupabaseAuth.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
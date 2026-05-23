import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export type Role = "guest" | "master" | "user" | "admin";

export function useCurrentRole(): { role: Role; loading: boolean } {
  const [role, setRole] = useState<Role>("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    const refresh = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        if (mounted) { setRole("guest"); setLoading(false); }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roles = (data ?? []).map((r) => r.role as Role);
      const pick: Role = roles.includes("admin")
        ? "admin"
        : roles.includes("master")
        ? "master"
        : roles.includes("user")
        ? "user"
        : "guest";
      if (mounted) { setRole(pick); setLoading(false); }
    };

    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { role, loading };
}
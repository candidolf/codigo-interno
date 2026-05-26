import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { getSessionHome } from "@/lib/session.functions";

export type Role = "guest" | "master" | "user" | "admin";

// Cache em memória do papel para evitar refazer a consulta a cada montagem.
const roleCache = new Map<string, Role>();

export function useCurrentRole(): { role: Role; loading: boolean } {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("guest");
  const [loading, setLoading] = useState(true);
  const fetchHome = useServerFn(getSessionHome);

  // 1) Apenas observa o usuário. NUNCA chama supabase.from(...) dentro do
  //    callback de onAuthStateChange — isso pode causar deadlock no client.
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUid(data.session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // callback síncrono — apenas atualiza estado local
      setUid(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Busca papel em um efeito separado, fora do lock do auth.
  useEffect(() => {
    if (!supabaseConfigured) return;
    let mounted = true;
    if (!uid) {
      setRole("guest");
      setLoading(false);
      return;
    }
    const cached = roleCache.get(uid);
    if (cached) {
      setRole(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchHome()
      .then((info) => {
        if (!mounted) return;
        const pick = (info.primaryRole as Role) ?? "user";
        roleCache.set(uid, pick);
        setRole(pick);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setRole("user");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [uid, fetchHome]);

  return { role, loading };
}
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth.functions";

/**
 * Estado local da sessão Supabase (browser). É a verdade imediata para
 * decidir se o header mostra o modo logado ou offline. Os roles/admin vêm
 * depois do server fn, sem bloquear a UI.
 */
function useBrowserSession() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data.session;
      setHasSession(!!s);
      setEmail(s?.user?.email ?? null);
      setUserId(s?.user?.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { ready, hasSession, email, userId };
}

export function useAuth() {
  const fetchMe = useServerFn(getCurrentUser);
  const queryClient = useQueryClient();
  const { ready, hasSession, email, userId } = useBrowserSession();

  const { data, isLoading } = useQuery<CurrentUser>({
    queryKey: ["auth", "me", userId],
    queryFn: () => fetchMe(),
    enabled: ready && hasSession,
    staleTime: 60_000,
  });

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
    queryClient.setQueryData(["auth", "me", userId], null);
    await queryClient.invalidateQueries();
  }, [queryClient, userId]);

  // Verdade imediata: se há sessão no browser, o usuário está logado, mesmo
  // enquanto roles ainda não chegaram do servidor.
  const isAuthenticated = hasSession || !!data;
  const fallbackUser: CurrentUser = hasSession && !data
    ? { userId: userId ?? "", email, roles: [], isAdmin: false }
    : null;

  return {
    user: data ?? fallbackUser,
    isAuthenticated,
    isAdmin: !!data?.isAdmin,
    roles: data?.roles ?? [],
    // Só consideramos "loading" antes da sessão do browser estar resolvida.
    // Roles carregando em background não devem deixar o header offline.
    loading: !ready,
    signOut,
  };
}
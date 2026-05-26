import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth.functions";

export function useAuth() {
  const fetchMe = useServerFn(getCurrentUser);
  const { data, isLoading } = useQuery<CurrentUser>({
    queryKey: ["auth", "me"],
    queryFn: () => fetchMe(),
    staleTime: 60_000,
  });

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  return {
    user: data ?? null,
    isAuthenticated: !!data,
    isAdmin: !!data?.isAdmin,
    roles: data?.roles ?? [],
    loading: isLoading,
    signOut,
  };
}
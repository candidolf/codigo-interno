import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth.functions";

export function useAuth() {
  const fetchMe = useServerFn(getCurrentUser);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<CurrentUser>({
    queryKey: ["auth", "me"],
    queryFn: () => fetchMe(),
    staleTime: 60_000,
  });

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
    queryClient.setQueryData(["auth", "me"], null);
    await queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    user: data ?? null,
    isAuthenticated: !!data,
    isAdmin: !!data?.isAdmin,
    roles: data?.roles ?? [],
    loading: isLoading,
    signOut,
  };
}
import { createServerFn } from "@tanstack/react-start";
import { createServerSupabase, supabaseAdmin } from "@/integrations/supabase/client.server";

export type Role = "admin" | "master" | "user";

export type CurrentUser = {
  userId: string;
  email: string | null;
  roles: Role[];
  isAdmin: boolean;
} | null;

/**
 * Returns the current authenticated user with roles, or null when no session.
 * Reads cookies + re-validates the token via getUser().
 */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser> => {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    // Use admin client to read roles — bypasses any RLS surprises.
    const { data: rolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const roles = ((rolesData ?? []) as { role: Role }[]).map((r) => r.role);
    return {
      userId: data.user.id,
      email: data.user.email ?? null,
      roles,
      isAdmin: roles.includes("admin"),
    };
  },
);
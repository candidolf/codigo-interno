import { createMiddleware } from "@tanstack/react-start";
import { createServerSupabase, getSupabaseAdmin } from "./client.server";

/**
 * Middleware for server fns that require an authenticated user.
 * Reads the session from Supabase cookies (set by @supabase/ssr).
 * Re-validates the JWT with the Auth server via getUser().
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Unauthorized");
    }
    return next({
      context: {
        supabase,
        get admin() {
          return getSupabaseAdmin();
        },
        userId: data.user.id,
        userEmail: data.user.email ?? null,
      },
    });
  },
);
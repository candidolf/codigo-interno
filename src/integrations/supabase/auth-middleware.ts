import { createMiddleware } from "@tanstack/react-start";
import { createServerSupabase, getSupabaseAdmin } from "./client.server";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Middleware for server fns that require an authenticated user.
 * Reads the session from Supabase cookies (set by @supabase/ssr).
 * Re-validates the JWT with the Auth server via getUser().
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabase = createServerSupabase();

    // Prefer Authorization: Bearer (attached by client middleware) — robust
    // em iframe/preview onde cookies podem não atravessar a fronteira.
    let bearer: string | undefined;
    try {
      const h = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
      if (h?.toLowerCase().startsWith("bearer ")) bearer = h.slice(7);
    } catch {
      /* fora de contexto de request */
    }

    const { data, error } = bearer
      ? await supabase.auth.getUser(bearer)
      : await supabase.auth.getUser();

    if (error || !data.user) {
      throw new Error("Unauthorized: sessão expirada. Faça login novamente.");
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
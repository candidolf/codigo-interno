import { createMiddleware } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "./client";

/**
 * Client-side function middleware: attaches the current Supabase access token
 * as `Authorization: Bearer ...` on every server fn call. Cookies alone are
 * unreliable in iframe/preview contexts, so the bearer is the source of truth.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (!supabaseConfigured) return next();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token
      ? next({ headers: { Authorization: `Bearer ${token}` } })
      : next();
  },
);
import { createMiddleware } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (!supabaseConfigured) return next();
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        return next({ headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // ignore
    }
    return next();
  },
);
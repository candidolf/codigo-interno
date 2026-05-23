import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    const token = authHeader.slice(7);

    const url = process.env.EXT_SUPABASE_URL!;
    const serviceKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY!;

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      throw new Error("Unauthorized: Invalid token");
    }

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    return next({
      context: {
        supabase,
        admin,
        userId: data.user.id,
        userEmail: data.user.email ?? null,
      },
    });
  },
);
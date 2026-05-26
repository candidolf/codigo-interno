import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Server-side Supabase client scoped to the current request's user.
 * Reads/writes the Supabase auth cookies via TanStack's cookie helpers.
 * RLS applies as that user.
 */
export function createServerSupabase(): SupabaseClient {
  const url = env("EXT_SUPABASE_URL");
  const anonKey =
    process.env.EXT_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) throw new Error("Missing env: EXT_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY");

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        const all = getCookies() ?? {};
        return Object.entries(all)
          .filter(([, value]) => value !== undefined)
          .map(([name, value]) => ({ name, value: value as string }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            setCookie(name, value, options as CookieOptions);
          } catch {
            // best-effort: some contexts have no response yet
          }
        }
      },
    },
  }) as unknown as SupabaseClient;
}

/**
 * Admin client (service role). RLS bypassed. Server-only.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env("EXT_SUPABASE_URL"),
  env("EXT_SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
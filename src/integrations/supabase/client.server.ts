import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCookies, setCookie, getRequestHeader } from "@tanstack/react-start/server";

function readEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

function requireEnv(...names: string[]): string {
  const v = readEnv(...names);
  if (!v) throw new Error(`Missing env: ${names.join(" / ")}`);
  return v;
}

const SUPABASE_URL = () =>
  requireEnv("EXT_SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = () =>
  requireEnv(
    "EXT_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "EXT_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );

/**
 * Server-side Supabase client scoped to the current request's user.
 * Reads/writes the Supabase auth cookies via TanStack's cookie helpers.
 * RLS applies as that user.
 */
export function createServerSupabase(): SupabaseClient {
  // Prefer Authorization: Bearer (sent by the client-side attacher) — robust
  // in iframe/preview contexts where cookies don't reach the server fn.
  let bearer: string | undefined;
  try {
    const h = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
    if (h?.toLowerCase().startsWith("bearer ")) bearer = h.slice(7);
  } catch {
    // outside request context
  }

  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined,
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
 * Lazily constructed — only throws if used without a service role key.
 */
let _admin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = SUPABASE_URL();
  const key = requireEnv(
    "EXT_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
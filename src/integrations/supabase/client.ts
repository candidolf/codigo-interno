import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  (import.meta as any).env?.VITE_SUPABASE_URL ??
  (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : undefined);
const key =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  (typeof process !== "undefined" ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY : undefined);

export const supabaseConfigured = Boolean(url && key);

function makeStub(): SupabaseClient {
  const err = new Error(
    "Supabase ainda não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.",
  );
  const handler: ProxyHandler<any> = {
    get() {
      throw err;
    },
  };
  return new Proxy({}, handler) as SupabaseClient;
}

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "ci-auth",
      },
    })
  : makeStub();
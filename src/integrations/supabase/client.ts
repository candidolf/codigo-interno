import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

function makeStub(): SupabaseClient {
  const err = new Error(
    "Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.",
  );
  return new Proxy({}, { get() { throw err; } }) as SupabaseClient;
}

export const supabase: SupabaseClient = supabaseConfigured
  ? (createBrowserClient(url!, key!) as SupabaseClient)
  : makeStub();
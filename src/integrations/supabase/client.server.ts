import { createClient } from "@supabase/supabase-js";

const url = process.env.EXT_SUPABASE_URL;
const serviceKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase admin] EXT_SUPABASE_URL ou EXT_SUPABASE_SERVICE_ROLE_KEY ausentes — operações admin vão falhar.",
  );
}

export const supabaseAdmin = createClient(url ?? "http://localhost", serviceKey ?? "stub", {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function getSupabaseAuthClient(accessToken: string) {
  return createClient(url ?? "http://localhost", serviceKey ?? "stub", {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
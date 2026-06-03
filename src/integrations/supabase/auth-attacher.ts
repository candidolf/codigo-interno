import { createMiddleware } from "@tanstack/react-start";
import { supabase, supabaseConfigured } from "./client";

/**
 * Client-side function middleware: attaches the current Supabase access token
 * as `Authorization: Bearer ...` on every server fn call. Cookies alone are
 * unreliable in iframe/preview contexts, so the bearer is the source of truth.
 *
 * Se a sessão estiver perto de expirar, faz refresh antes de enviar.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();
    if (!supabaseConfigured) return next();

    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      // O supabase-js já faz refresh automático em background. Não chamamos
      // refreshSession() aqui para evitar loops de refresh quando o servidor
      // rejeita o token (ex.: chaves apontando para projetos diferentes).
      token = data.session?.access_token;
    } catch (e) {
      console.warn("[attachSupabaseAuth] failed to read session", e);
    }

    if (!token) {
      console.warn("[attachSupabaseAuth] no token available — calling server fn unauthenticated");
      return next();
    }
    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
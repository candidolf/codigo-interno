## Causa

- `.env` (com `VITE_SUPABASE_*`) só alimenta o **browser**. O **servidor** (server functions) lê de `process.env.EXT_SUPABASE_*`.
- Secrets atuais: `EXT_SUPABASE_URL` ✅, `EXT_SUPABASE_SERVICE_ROLE_KEY` ✅, **`EXT_SUPABASE_PUBLISHABLE_KEY` ❌ ausente**.
- Sem essa chave no server, `createServerSupabase()` quebra → `requireSupabaseAuth` não valida o bearer → `getCurrentUser` retorna `null` → loop em `/login`.

## Plano

1. Solicitar o secret `EXT_SUPABASE_PUBLISHABLE_KEY` (valor: a mesma anon/publishable key — `sb_publishable_I6dvDKIIm7j_k6pZAA3BRw_K9lcwS8h`) via tool de secrets do Lovable. Esses secrets ficam armazenados no backend de forma segura, não no `.env`.
2. (Opcional, mas recomendado) Remover/limpar duplicação no `.env` — manter apenas o necessário ao browser.
3. Testar o fluxo:
   - login admin → `/dashboard` + acesso a `/admin` pelo menu;
   - login usuário comum → `/dashboard`, `/admin` redireciona de volta.
4. Se ainda falhar, ler `server-function-logs` para diagnosticar a próxima causa.

## Detalhe técnico

A publishable key é pública por design (vai pro browser de qualquer forma). O ganho de colocá-la também como secret server-side é apenas operacional: o servidor precisa lê-la em runtime para criar o cliente Supabase que valida o JWT do usuário com RLS.
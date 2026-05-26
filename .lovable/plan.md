
# Plano: Reset completo do Auth (Supabase SSR + cookies)

Vamos descartar toda a camada de auth atual e reimplementar seguindo o padrão oficial do Supabase SSR (`@supabase/ssr`), adaptado para TanStack Start. A sessão passa a viver em cookies httpOnly lidos no servidor — fim das corridas client/server, fim do redirect-loop para `/login`.

## O que será removido

Arquivos descartados (substituídos):
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/hooks/use-auth.ts`
- `src/hooks/use-current-role.ts`
- `src/lib/session.functions.ts`
- `src/routes/_authenticated.tsx`
- `src/routes/_authenticated/admin.tsx` (componente AdminGate)
- `src/routes/login.tsx`

Mantido sem alterações: tabelas (`profiles`, `user_roles`), migrations, RLS, função `has_role`, todas as telas de negócio (admin/vendedores, salas, dashboard, etc.).

## O que será criado

### 1. Camada Supabase (3 clients)
- `src/integrations/supabase/client.browser.ts` — `createBrowserClient` do `@supabase/ssr`. Único client usado em componentes React.
- `src/integrations/supabase/client.server.ts` — duas factories server-only:
  - `createServerSupabase()` — `createServerClient` lendo/escrevendo cookies via `@tanstack/react-start/server` (`getCookie`/`setCookie`). RLS como usuário logado.
  - `supabaseAdmin` — service role, RLS bypass, só para operações administrativas.

### 2. Middleware de sessão
- `src/integrations/supabase/session-middleware.ts` — `createMiddleware` global que roda em todo server fn, chama `supabase.auth.getUser()` (revalida token) e injeta `{ supabase, user }` no `context`. Substitui `auth-middleware` e `auth-attacher`.
- Registrado em `src/start.ts` como `requestMiddleware` global.

### 3. Server functions de auth
- `src/lib/auth.functions.ts`:
  - `signInWithPassword({ email, password })` — chama `supabase.auth.signInWithPassword`, cookies são setados pelo middleware SSR.
  - `signInWithGoogle()` — retorna URL OAuth do broker Lovable (`lovable.auth.signInWithOAuth("google")` client-side; server fn só finaliza).
  - `signOut()` — limpa cookies.
  - `getCurrentUser()` — retorna `{ user, roles, isAdmin }` ou `null`. Usa `supabaseAdmin` para ler `user_roles` (evita problemas de RLS).

### 4. Hook único de auth
- `src/hooks/use-auth.ts` — React Query wrapping `getCurrentUser()` server fn. Expõe `{ user, isAdmin, roles, isLoading, signOut }`. Invalida no `onAuthStateChange` do browser client.

### 5. Guards de rota
- `src/routes/_authenticated.tsx` — `beforeLoad` chama `getCurrentUser()`; se `null`, `throw redirect({ to: "/login", search: { redirect: location.href }})`. Sem `useEffect`, sem `sessionStorage`, sem AdminGate em componente.
- `src/routes/_authenticated/admin.tsx` — `beforeLoad` reusa `getCurrentUser()`; se `!isAdmin`, redireciona para `/dashboard`. Componente vira layout simples com `<Outlet/>`.

### 6. Telas
- `src/routes/login.tsx` — form email/senha + botão Google. Após sucesso: `navigate({ to: search.redirect ?? "/dashboard" })`. Sem lógica de role.
- Menu/Sidebar (onde existir): mostra link "/admin" só quando `useAuth().isAdmin === true`.

### 7. OAuth Google
- Callback: usar `/login` como redirect URI; `@supabase/ssr` detecta o `code` na query e troca por sessão via `exchangeCodeForSession()` em `beforeLoad` do `login.tsx`.
- Provider Google deve estar habilitado no Supabase (usuário confirma).

## Fluxo final

```text
Browser                          Server fn                    Supabase
  │                                  │                            │
  │ signIn(email,pw) ───────────────▶│                            │
  │                                  │ signInWithPassword ───────▶│
  │                                  │◀───────────── session ─────│
  │◀──── Set-Cookie sb-* (httpOnly) ─│                            │
  │                                  │                            │
  │ getCurrentUser() ───────────────▶│                            │
  │                                  │ getUser() (revalida) ─────▶│
  │                                  │ select user_roles (admin) ▶│
  │◀──── {user, isAdmin, roles} ─────│                            │
```

## Verificação

1. Login email/senha → cookies `sb-*` setados → `/dashboard`.
2. Acessar `/admin` como user comum → redirect para `/dashboard`.
3. Acessar `/admin` como admin → entra; cria/edita vendedor sem voltar para `/login`.
4. F5 em qualquer rota protegida → mantém sessão (cookies persistem).
5. Logout → cookies limpos → redirect `/login`.
6. F12 → sem erros no console na tela de login.

## Pontos técnicos importantes

- `@supabase/ssr` precisa ser instalado (`bun add @supabase/ssr`).
- Cookies são setados pelo server (httpOnly) — o browser client lê apenas via `getSession()` para `onAuthStateChange`, mas a fonte de verdade é o server.
- `getCurrentUser` sempre usa `getUser()` (revalida com Auth server), nunca `getSession()` para decisões de autorização.
- Roles lidas com `supabaseAdmin` no server fn — elimina o problema de `user_roles` retornar `[]` por RLS.
- Single source of truth: o React Query do `useAuth` é invalidado pelo listener `onAuthStateChange` registrado uma vez no `__root.tsx`.

## Fora do escopo

- Não mexer em migrations nem RLS existentes.
- Não tocar telas de negócio (vendedores, salas, dashboard, relatórios).
- Não configurar email templates / reset de senha agora (pode ser feito depois).
- Magic link não será implementado.

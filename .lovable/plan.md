# Revisar Auth no padrão Supabase

## Diagnóstico

O fluxo atual:
1. Login chama `supabase.auth.signInWithPassword` → `navigate({ to: "/dashboard" })`.
2. `/dashboard` está sob `src/routes/_authenticated.tsx`, cujo `beforeLoad` chama o **server fn** `getCurrentUser()`.
3. Esse server fn lê a sessão pelo header `Authorization: Bearer` injetado pelo `attachSupabaseAuth` no client.

Problemas com esse desenho (e por que "nada acontece"):
- `_authenticated.tsx` **não tem `ssr: false`**. Em SSR/preview/iframe (cookies não chegam, sessão fica só no `localStorage`), o `beforeLoad` roda no server sem bearer → `getCurrentUser` retorna `null` → redireciona de volta para `/login` silenciosamente. Resultado: o usuário vê "nada aconteceu".
- Existe uma janela de corrida: imediatamente após `signInWithPassword`, a sessão pode ainda não ter sido persistida quando o `beforeLoad` dispara o RPC.
- O padrão recomendado para Lovable + Supabase é ter um único gate **client-only** que usa `supabase.auth.getUser()` diretamente, sem round-trip de server fn em cada navegação. Server fns continuam protegidas via `requireSupabaseAuth` (a defesa real).

## O que mudar

### 1. `src/routes/_authenticated.tsx` — gate client-only no padrão Supabase

Reescrever para usar `ssr: false` + `supabase.auth.getUser()` direto, redirecionando para `/login` com `redirect=` quando não houver sessão. Sem chamar `getCurrentUser` server fn aqui.

```tsx
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as any });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
```

### 2. `src/routes/_authenticated/admin.tsx` — mesma mudança

`ssr: false`, valida `supabase.auth.getUser()` no client e depois consulta `is_admin` via server fn `getCurrentUser` (esse sim faz sentido pois precisa checar `user_roles` com RLS). Se não for admin → redirect para `/dashboard`.

### 3. `src/routes/login.tsx` — sem RPC desnecessário

- Mantém o try/catch/finally já adicionado.
- Após `signInWithPassword`, aguarda `supabase.auth.getUser()` retornar com sucesso (garante sessão persistida) antes do `navigate`.
- Destino: `search.redirect || "/dashboard"`. O redirect admin → `/admin` continua sendo feito dentro de `dashboard.tsx` (já implementado).

### 4. `src/routes/cadastro.tsx` — sem mudança extra

Já trata o caso `session === null` (confirmação de e-mail) mostrando mensagem.

### 5. Sanidade

- `attachSupabaseAuth` já está em `functionMiddleware` (`src/start.ts`) — manter.
- `requireSupabaseAuth` continua protegendo os server fns (defesa real). O gate de rota é só UX.
- Não tocar em `getCurrentUser` (ainda usado por `useAuth` e pelo gate de admin para descobrir roles).

## Não muda

- Schema, RLS, policies, env vars.
- `client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`.
- Rotas filhas de `_authenticated/` — herdam o novo gate automaticamente.

## Verificação

1. Cadastrar usuário novo → deve cair no `/dashboard`.
2. Logout → tentar acessar `/dashboard` → redireciona para `/login?redirect=/dashboard`.
3. Login → volta para `/dashboard`.
4. Login como admin → `dashboard.tsx` redireciona para `/admin`.
5. Refresh em `/dashboard` autenticado → permanece (sem loop).

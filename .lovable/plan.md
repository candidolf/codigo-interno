## Causa raiz

Na imagem o usuário está em `/dashboard` (rota protegida, então a sessão Supabase existe — a chamada `listMyPurchases` funciona), mas o `BrandHeader` continua mostrando a versão de visitante ("Início | Login | Criar conta") em vez do avatar + dropdown.

O motivo está em `src/lib/auth.functions.ts`:

```ts
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser(); // <- SEM passar o bearer
  ...
});
```

- No preview (iframe), os cookies do Supabase frequentemente não atravessam a fronteira do server fn — por isso o projeto já usa um `attachSupabaseAuth` que injeta `Authorization: Bearer <token>` em cada chamada.
- `createServerSupabase()` lê esse bearer e injeta como `global.headers`, mas isso só afeta chamadas PostgREST. **`supabase.auth.getUser()` ignora esse header** quando chamado sem argumento — ele tenta ler a sessão pelos cookies, não encontra, e retorna `null`.
- Resultado: `useAuth()` recebe `null` → `isAuthenticated=false` → `BrandHeader` renderiza a versão de visitante mesmo logado.

A função `requireSupabaseAuth` faz certo (`supabase.auth.getUser(bearer)`), mas o `getCurrentUser` não — esse é o único ponto que ainda quebra.

## Correção (1 arquivo)

**`src/lib/auth.functions.ts`** — passar o bearer explicitamente para `auth.getUser`, mantendo o comportamento "retorna `null` quando não autenticado" (não pode usar `requireSupabaseAuth` porque essa middleware lança erro, e o `useAuth` precisa do `null` para a rota `/login`).

```ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createServerSupabase } from "@/integrations/supabase/client.server";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser> => {
    const supabase = createServerSupabase();

    // Extrai o bearer attachado pelo attachSupabaseAuth (cookies não chegam no preview)
    let bearer: string | undefined;
    try {
      const h = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
      if (h?.toLowerCase().startsWith("bearer ")) bearer = h.slice(7);
    } catch { /* fora de contexto de request */ }

    const { data, error } = bearer
      ? await supabase.auth.getUser(bearer)
      : await supabase.auth.getUser();

    if (error || !data.user) return null;

    const { data: rolesData } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user.id);
    const roles = ((rolesData ?? []) as { role: Role }[]).map((r) => r.role);
    return {
      userId: data.user.id,
      email: data.user.email ?? null,
      roles,
      isAdmin: roles.includes("admin"),
    };
  },
);
```

## Verificação

1. Logar e cair em `/dashboard` (ou `/admin`).
2. Cabeçalho deve mostrar avatar com iniciais à direita, e ao clicar abre o dropdown com nome/e-mail/badge e "Sair".
3. Em < 768px, deve aparecer o botão hambúrguer ao lado do avatar abrindo o Sheet com a navegação.
4. `/login` (deslogado) continua mostrando "Criar conta" como antes.

Nenhuma mudança no `BrandHeader.tsx` é necessária — ele já está correto; só não estava recebendo o usuário de volta.

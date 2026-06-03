## 1) Checkout — mover mensagem para abaixo do card de Resumo

Arquivo: `src/routes/_authenticated/comprar.tsx`

- Remover o `<Alert>` "Você será direcionado a uma página segura do Asaas…" de dentro da coluna esquerda (form).
- Renderizá-lo **abaixo da `<aside>` de Resumo**, dentro da mesma coluna lateral (continua sendo `h-fit` o card; o Alert fica logo abaixo dele, com `mt-4`).
- Em telas pequenas (1 coluna), o Alert aparece naturalmente depois do resumo. Nenhuma mudança de estilo no resto do form.

## 2) Header — "Sair" encerra sessão e vai para `/login`

### `src/components/brand/BrandHeader.tsx`
- No `onLogout`:
  - Aguardar `signOut()`.
  - Invalidar as queries de auth/profile no `queryClient` para limpar estado em cache (`["auth","me"]`, `["profile","me"]`, `["my-profile"]`).
  - Navegar para `/login` (em vez de `/`), usando `replace: true` para não voltar via "back" para área autenticada.

### `src/hooks/use-auth.ts`
- Ajustar `signOut` para também limpar/invalidar `["auth","me"]` via `queryClient` (usar `useQueryClient`) e retornar somente após `supabase.auth.signOut()` resolver. Isso garante que `isAuthenticated` vire `false` imediatamente, evitando que o guard de `_authenticated` redirecione antes da navegação manual para `/login` causar um flicker.

## Fora de escopo
- Não alterar layout/visual do card de resumo.
- Não mexer em outras rotas/headers.

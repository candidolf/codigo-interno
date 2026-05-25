## Causa raiz

No roteamento por arquivo do TanStack, `salas.$id.tsx`, `salas.nova.tsx`, `vendedores.$code.tsx` e `vendedores.novo.tsx` são automaticamente **filhos** de `salas.tsx` e `vendedores.tsx` (mesmo prefixo com `.`).

Hoje `salas.tsx` e `vendedores.tsx` renderizam a **listagem inteira** em vez de `<Outlet />`. Resultado: ao clicar em "Editar", "Novo vendedor", "Nova sala" etc., a URL muda corretamente, mas a tela continua mostrando a lista — **o filho casa, mas não tem onde renderizar**. É exatamente o sintoma de "os links do admin não funcionam".

Os outros links (`/admin`, `/admin/usuarios`, `/admin/comissoes`) funcionam porque essas rotas não têm filhos.

## Ajuste (mínimo)

1. **`src/routes/_authenticated/admin/salas.tsx`** — virar layout enxuto:
   ```tsx
   import { Outlet, createFileRoute } from "@tanstack/react-router";
   export const Route = createFileRoute("/_authenticated/admin/salas")({
     component: () => <Outlet />,
   });
   ```

2. **`src/routes/_authenticated/admin/salas.index.tsx`** (novo) — receber o conteúdo atual de `AdminSalas` (a listagem).

3. **`src/routes/_authenticated/admin/vendedores.tsx`** — mesmo tratamento: virar layout com `<Outlet />`.

4. **`src/routes/_authenticated/admin/vendedores.index.tsx`** (novo) — conteúdo atual de `AdminVendedores`.

Nenhum outro arquivo precisa mudar. `routeTree.gen.ts` será regerado automaticamente. Os `<Link to="/admin/salas">`, `to="/admin/salas/$id"`, `to="/admin/vendedores"`, `to="/admin/vendedores/$code"`, `to="/admin/vendedores/novo"`, `to="/admin/salas/nova"` já estão corretos e passarão a funcionar.

## Fora de escopo

- Mudar guarda de admin, hooks de auth, ou políticas RLS.
- Reescrever telas, refatorar componentes, mexer em migrations.
- Tocar em qualquer link/rota fora de `/admin/salas/*` e `/admin/vendedores/*`.

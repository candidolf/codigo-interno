## Diagnóstico

Investigando os arquivos do admin, encontrei **uma única causa raiz** que explica os itens 1, 3 e em parte o 4, além de uma causa secundária para o 5:

- **`<Toaster />` do sonner nunca é montado** em `__root.tsx`. Todos os `toast.success`/`toast.error` ficam silenciosos. Por isso "salva sem mensagem" e "cliquei e nada aconteceu" (na verdade um `toast.error` invisível com erro de RLS).
- **`_authenticated/admin.tsx` chama `supabase.auth.getUser()` + consulta `user_roles` em todo `beforeLoad`**, e com `defaultPreloadStaleTime: 0` isso executa em cada preload de `<Link>` e em cada `router.invalidate()` disparado pelo listener `onAuthStateChange` da root (inclusive em `TOKEN_REFRESHED`). Qualquer race condition retorna sessão nula por um instante e o guard joga para `/login` — é o "trava tudo e volta para login".
- **CPF do vendedor** hoje é opcional e só é validado se preenchido. Precisa ser obrigatório e com validação real.

## Mudanças (mínimas, foco no que está quebrado)

### 1. Montar Toaster do sonner — `src/routes/__root.tsx`
- Importar `Toaster` de `@/components/ui/sonner` e renderizar dentro de `<QueryClientProvider>`, ao lado do `<Outlet />`.
- Resolve: mensagem ausente em Sala (1), feedback inexistente no Vendedor (3) e qualquer outro `toast` do admin (Usuários, Comissões, etc.).

### 2. Estabilizar guard do admin — `src/routes/_authenticated/admin.tsx`
- Trocar a consulta direta a `user_roles` por uma checagem cacheada na ordem: `supabase.auth.getSession()` (sem rede) → se há `user`, consultar `user_roles` apenas uma vez e cachear o resultado em `sessionStorage` por `user.id`.
- Não redirecionar para `/login` no admin: se não houver sessão, deixa o `_authenticated` pai tratar. Se houver sessão mas não for admin, redireciona para `/dashboard` (mantém o comportamento atual, só mais resiliente).
- Resolve: o "volta para login" em cliques (5) e indiretamente o "Usuários não faz nada" (4), quando o clique era engolido pelo redirect.

### 3. Filtrar eventos em `onAuthStateChange` — `src/routes/__root.tsx`
- Disparar `router.invalidate()` + `queryClient.invalidateQueries()` apenas para `SIGNED_IN`, `SIGNED_OUT` e `USER_UPDATED`. Ignorar `TOKEN_REFRESHED` e `INITIAL_SESSION`, que hoje re-executam todos os `beforeLoad` sem necessidade.
- Reforço para (5).

### 4. CPF obrigatório e validado — `src/components/brand/VendedorForm.tsx`
- Marcar o input de CPF como `required`.
- No `onSubmit`, antes do `save.mutate()`, validar com `isValidCPF` e abortar com `toast.error("CPF inválido")` se falhar (hoje a validação só ocorre dentro do `mutationFn`, então com `<Toaster />` faltando o usuário não via nada).
- Resolve (2). Combinado com (1), o usuário passa a ver claramente "CPF inválido" ou "Vendedor salvo".

### 5. Tela de Usuários — `src/routes/_authenticated/admin/usuarios.tsx`
- Adicionar exibição de erro da `useQuery` (hoje, se a query falhar por RLS, a tabela só mostra "Nenhum usuário"). Mostrar `query.error.message` quando `isError`.
- Pequena melhoria, sem mudar comportamento de sucesso.

## Itens explicitamente fora do escopo

- Não mexer em migrations (RLS já contempla admin via 010). Se após o ajuste a tela de Usuários ainda vier vazia, é porque a migração 010 não foi aplicada no Supabase — o erro agora ficará visível.
- Não mexer em layout, design tokens ou outras telas fora do admin.
- Não tocar no Dashboard financeiro (mantém mock conforme decidido).

## Como validar depois de aplicar

1. Logar como admin → ir em Salas → criar/editar → deve aparecer toast "Sala salva".
2. Vendedores → Novo → salvar sem CPF → toast "CPF obrigatório"; com CPF inválido → toast "CPF inválido"; com CPF válido → toast "Vendedor salvo" e redireciona para a lista.
3. Menu Usuários → carrega a lista; alterar papel → toast "Papel atualizado".
4. Navegar entre as páginas do admin várias vezes seguidas (Salas → Vendedores → Comissões → Usuários) — não deve cair em `/login`.

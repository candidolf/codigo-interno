## Objetivo
Implementar o perfil **admin** com dados reais no Supabase. **Apenas os KPIs financeiros do dashboard são mockup**; todo o resto (usuários, salas, perguntas, vendedores, comissões) lê e grava de verdade. Perguntas das salas são **100% cadastradas manualmente** pelo admin — sem IA.

## Situação atual
- Banco já tem: `profiles`, `user_roles` (enum `master|user|admin`), `test_purchases` (com `seller_code`, `amount_cents`, `status`), `payments`, `invites` + função `has_role`.
- Telas admin atuais em `src/routes/admin/*` consomem `src/data/mock.ts` — serão substituídas.
- Faltam tabelas: `rooms`, `questions`, `answers`, `sellers`. Faltam policies para admin enxergar tudo. Rotas admin sem proteção por papel.

## Banco — novas migrations

**008_rooms_questions.sql**
- `rooms(id uuid pk, slug text unique, title text not null, theme text check in joy|fear|anger|discovery, description text, age_min int default 6, age_max int default 99, primary_color text, active bool default true, sort_order int default 0, created_at, updated_at)`.
- `questions(id uuid pk, room_id uuid fk rooms on delete cascade, text text not null, sort_order int default 0, created_at)`.
- `answers(id uuid pk, question_id uuid fk questions on delete cascade, label text not null, emoji text, sort_order int default 0)`.
- RLS habilitado. Policies:
  - SELECT autenticado liberado em `rooms`, `questions`, `answers` (para o teste consumir).
  - INSERT/UPDATE/DELETE apenas para `has_role(auth.uid(),'admin')`.
- Seed `on conflict do nothing` das 4 salas atuais (alegria/medo/raiva/descobertas) para não perder o conteúdo já apresentado. **Não** semear perguntas — admin cadastra manualmente.

**009_sellers.sql**
- `sellers(id uuid pk, code text unique not null, full_name text not null, email text, phone text, cpf text, commission_rate numeric(5,4) not null default 0.20, active bool default true, created_at, updated_at)`.
- Índice em `code`. RLS: SELECT/INSERT/UPDATE/DELETE somente admin via `has_role`.

**010_admin_policies_and_rpc.sql**
- Policies adicionais p/ admin enxergar/gerenciar:
  - `profiles`: admin SELECT/UPDATE all.
  - `user_roles`: admin SELECT/INSERT/DELETE all.
  - `test_purchases` + `payments`: admin SELECT all.
- Function `public.admin_monthly_commissions(month_start date)` retornando `seller_code, seller_name, tests, gross_cents, commission_cents, rate`, juntando `test_purchases` pagos (`status in ('pago','em_andamento','concluido')`) no mês ao `sellers`. `security definer`, com guard `if not has_role(auth.uid(),'admin') then raise exception 'forbidden'`.

## Frontend

### Proteção de rotas
- Mover `src/routes/admin/*` → `src/routes/_authenticated/admin.*.tsx`.
- Criar layout `src/routes/_authenticated/admin.tsx` com `beforeLoad` que consulta `user_roles` do usuário; se não for admin, `redirect → /dashboard`. Componente: `<Outlet />`.

### Hooks/queries (browser, TanStack Query + cliente `supabase`)
Em `src/hooks/admin/`:
- `useRooms`, `useUpsertRoom`, `useDeleteRoom`.
- `useRoomQuestions(roomId)`, `useUpsertQuestion`, `useDeleteQuestion`, `useUpsertAnswer`, `useDeleteAnswer`.
- `useSellers`, `useUpsertSeller`, `useDeleteSeller`.
- `useAdminUsers` (join `profiles` + `user_roles`), `useSetUserRole`, `useRemoveUser` (remove role + profile, sem mexer em `auth.users`).
- `useMonthlyCommissions(month)` chamando a RPC.
- `useAdminStats` (counts de usuários e testes por status).

### Telas

**`/admin` — Dashboard**
- KPIs **mock** (financeiro, com badge "mock"): Receita do mês, Acumulada, Ticket médio, Comissões a pagar.
- KPIs **reais**: nº masters, nº testandos, testes vendidos, em andamento, concluídos.
- Gráfico de barras mock (últimos 6 meses).
- Cards de atalho: Usuários, Salas, Vendedores, Comissões.

**`/admin/usuarios`** (real)
- Lista `profiles + user_roles`, filtro por papel, busca por nome/e-mail.
- Editar papel (Dialog com select admin/master/user) → grava `user_roles`.
- Excluir com `ConfirmDialog` → remove role + profile.

**`/admin/salas`** + `/admin/salas/nova` + `/admin/salas/$id` (real)
- CRUD real sobre `rooms` (nome, descrição, tema, faixa etária, cor, ativo, ordem).
- Subseção "Perguntas da sala" com CRUD real em `questions` e `answers`:
  - Botão "Nova pergunta" abre form com texto + até 4 alternativas (label + emoji).
  - Editar pergunta/alternativas inline.
  - Reordenar via campo numérico `sort_order` (sem drag-and-drop).
  - Excluir pergunta/alternativa com `ConfirmDialog`.
- Excluir sala com `ConfirmDialog`.

**`/admin/vendedores`** + `/novo` + `/$code` (real)
- CRUD real em `sellers`. Form: Nome*, CPF (máscara + validação), E-mail, Telefone (máscara), % comissão (0–100), Código (autogerado `VEND-XXX` se vazio), Ativo.
- Lista exibe "Testes no mês" agregando `test_purchases` por `seller_code`.
- Excluir com `ConfirmDialog`.

**`/admin/comissoes`** (real)
- Seletor mês/ano (últimos 12 meses).
- KPIs: vendedores ativos, receita rastreada, comissão a pagar, ticket médio.
- Tabela: Código, Vendedor, Testes, Bruto, %, Comissão (via RPC).
- Total no rodapé. Botão "Exportar CSV" gera CSV no browser a partir dos dados carregados.

### Menu (`BrandHeader`)
- `navByRole.admin`: Início, Salas, **Vendedores**, Usuários, Comissões.

## Detalhes técnicos
- Máscaras CPF/telefone em `src/lib/masks.ts` (criar) + validação de CPF.
- Reaproveitar `Dialog`, `AlertDialog`/ConfirmDialog, `Table`, `StatCard`, `GradientButton`.
- Queries via `@/integrations/supabase/client` (RLS faz o gating real; check de papel no front é só UX).
- Cursor pointer em todas as áreas clicáveis (regra do projeto).

## Fora do escopo
- Geração de perguntas por IA (decidido: cadastro 100% manual).
- Criar/excluir contas em `auth.users`.
- Drag-and-drop de perguntas (usar `sort_order`).
- Pagamento real de comissões.
- Substituir KPIs financeiros mock por dados reais.

## Objetivo

Implementar 100% da jornada do **master**: cadastrar → logar → comprar 1 teste (R$ 29,90) com **Mercado Pago real (PIX/cartão)** → escolher destinatário (ele mesmo ou convidado que cria conta `user` vinculada) → teste disponível no dashboard.

Backend: **Supabase externo**. Toda lógica server-side sensível (criar preferência MP, webhook, consumir convite) roda em **Edge Functions do Supabase**, com prefixo `ef_`, cada uma inline em um único arquivo. Secrets da MP ficam nas secrets do Supabase.

---

## 1. Conexão Supabase externo

- Criar `src/integrations/supabase/client.ts` com `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)`, `persistSession: true`, `autoRefreshToken: true`.
- Adicionar via tool de secrets (lado client, prefixo VITE): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Secrets no painel Supabase (para as Edge Functions): `MERCADO_PAGO_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_BASE_URL`.

## 2. Migrations (arquivos com prefixo sequencial)

Entregar prontos em `supabase/migrations/` para o usuário rodar:

- `001_init_enums_and_profiles.sql` — enum `app_role ('admin','master','user')`, tabela `profiles` (id FK auth.users, full_name, phone, birth_date, linked_master_id), trigger `handle_new_user` que popula `profiles` + insere role default em `user_roles` a partir de `raw_user_meta_data`.
- `002_user_roles.sql` — tabela `user_roles (user_id, role)` unique, função `has_role(uuid, app_role)` `security definer`.
- `003_test_purchases.sql` — `test_purchases` (id, master_id, testando_user_id, testando_name, status check-list `aguardando_pagamento|pago|aguardando_convidado|em_andamento|concluido|cancelado`, amount_cents 2990, seller_code, timestamps).
- `004_payments.sql` — `payments` (purchase_id, mp_preference_id, mp_payment_id unique, method, status, raw jsonb).
- `005_invites.sql` — `invites` (token PK, purchase_id, testando_name, testando_email, consumed_by, consumed_at, expires_at).
- `006_rls_policies.sql` — habilita RLS em todas e cria políticas:
  - `profiles`: self select/update; master lê profiles com `linked_master_id = auth.uid()`.
  - `user_roles`: self select.
  - `test_purchases`: master CRUD onde `master_id = auth.uid()`; user select onde `testando_user_id = auth.uid()`.
  - `payments`: select via join no purchase do master; writes só service role (Edge Function).
  - `invites`: select público filtrado por token; writes só service role.

## 3. Edge Functions (todas inline, prefixo `ef_`)

Cada uma em `supabase/functions/ef_<nome>/index.ts`, usando `Deno.serve` + CORS, validação Zod, e `createClient` com `SUPABASE_SERVICE_ROLE_KEY`.

- **`ef_create_purchase`** (auth obrigatória — lê JWT do header `Authorization`)
  1. Valida usuário tem role `master`.
  2. Insere `test_purchases` (status `aguardando_pagamento`, seller_code opcional).
  3. Cria *preference* na API Mercado Pago (`POST https://api.mercadopago.com/checkout/preferences`) com `items`, `payer.email`, `external_reference = purchase.id`, `back_urls` para `${APP_BASE_URL}/comprar/retorno?purchase=<id>`, `notification_url` para `${SUPABASE_URL}/functions/v1/ef_mp_webhook`, `payment_methods` conforme PIX/cartão.
  4. Insere `payments` com `mp_preference_id`. Retorna `{ purchase_id, init_point }`.

- **`ef_mp_webhook`** (pública)
  1. Valida `x-signature` HMAC-SHA256 com `MP_WEBHOOK_SECRET`. 401 se falhar.
  2. Se `type=payment`, busca `GET /v1/payments/{id}` na API MP com `MERCADO_PAGO_ACCESS_TOKEN`.
  3. Upsert `payments` por `mp_payment_id`. Se `status='approved'`, atualiza `test_purchases.status = 'pago'` (idempotente).

- **`ef_consume_invite`** (auth obrigatória — convidado já logado)
  1. Valida token (existe, não consumido, não expirado).
  2. Set `invites.consumed_by = auth.uid()`, `consumed_at = now()`.
  3. Update `test_purchases`: `testando_user_id = auth.uid()`, `status = 'em_andamento'`.
  4. Update `profiles.linked_master_id = purchase.master_id`.

(Operações simples — `assignSelf`, `createInvite`, `listMyPurchases`, `getInvite` por token — ficam no client usando `supabase-js` + RLS, sem Edge Function.)

## 4. Auth real (master)

- `cadastro.tsx`: substituir mock por `supabase.auth.signUp({ email, password, options: { data: { full_name, phone, birth_date, role: 'master' }, emailRedirectTo: window.location.origin } })`. Manter máscara/validação de telefone, data e maioridade. Mostrar `Alert` em erro.
- `login.tsx`: `supabase.auth.signInWithPassword`. Erros traduzidos PT-BR em `src/lib/auth-errors.ts`.
- `__root.tsx`: adicionar `onAuthStateChange` listener que invalida queries/router.
- `_authenticated.tsx` (layout pathless): `beforeLoad` chama `supabase.auth.getUser()` e redireciona `/login` se não autenticado. Provê `<Outlet />`.
- Mover `dashboard.tsx`, `comprar.tsx`, `comprar.retorno.tsx`, `testes.$id.destinatario.tsx` para `src/routes/_authenticated/`.
- `BrandHeader`: derivar role real via hook `useCurrentRole` (consulta `user_roles`); remover seletor mock; botão Sair chama `supabase.auth.signOut()`. `cursor-pointer` em todos clicáveis.

## 5. Compra (Mercado Pago real)

- `_authenticated/comprar.tsx`: form com radio PIX/cartão e campo opcional "Código do vendedor" (mantém estética glass atual). Botão "Pagar agora" chama `supabase.functions.invoke('ef_create_purchase', { body: { method, seller_code } })` → `window.location.href = init_point`.
- `_authenticated/comprar.retorno.tsx` (novo): lê `?purchase=` da query, faz polling do status via `supabase.from('test_purchases').select('status').eq('id', id)` a cada 3 s (máx ~60 s). Quando `pago` → redireciona `/testes/<id>/destinatario`. `cancelado` → mostra erro + "Tentar novamente".

## 6. Destinatário e convite

- `_authenticated/testes.$id.destinatario.tsx` (reescrever lógica):
  - **Self**: update purchase set `testando_user_id = auth.uid()`, `testando_name = profile.full_name`, `status = 'em_andamento'` → navega `/teste/$id/intro`.
  - **Convidar**: form Nome + Email (opcional) + Data nascimento. Insere em `invites` com token (`crypto.randomUUID().replaceAll('-','')` slice 24, `expires_at = now()+7d`), atualiza purchase com `testando_name` e `status='aguardando_convidado'`. Exibe URL `${origin}/convite/<token>` com botão "Copiar link" (clipboard). Email desabilitado com tooltip "em breve".
- `convite.$token.tsx` (reescrever): loader busca `invites` por token (RLS público). Se inválido/expirado → tela amigável. Form de cadastro do convidado (email, senha, nome pré-preenchido). Pula validação de maioridade (master já garantiu). Submit: `signUp` com `role: 'user'` → `signInWithPassword` → `supabase.functions.invoke('ef_consume_invite', { body: { token } })` → navega `/teste/<id>/intro`.

## 7. Dashboard real

`_authenticated/dashboard.tsx`:
- `useQuery` chamando `supabase.from('test_purchases').select('*, profiles!testando_user_id(full_name)').order('created_at', desc)`.
- Remove uso de `purchases` mock. Mantém `StatCard`s. Mapa de status:
  - `aguardando_pagamento` → badge "Pagamento pendente" + "Retomar pagamento" (gera novo `init_point` via `ef_create_purchase` se preferência expirou — fora de escopo: usar o existente).
  - `pago` → "Não iniciado" + link `/testes/$id/destinatario`.
  - `aguardando_convidado` → badge + botão "Copiar link do convite".
  - `em_andamento` → link `/teste/$id/salas`.
  - `concluido` → link relatório.
- Página 100% responsiva (grid colapsa mobile já está ok no template).

## 8. UX / regras do projeto

- Máscaras já existentes de telefone e data mantidas (não há CPF/CNPJ/CEP nesta etapa).
- `cursor-pointer` em todos botões/links/cards clicáveis.
- Todos os formulários com feedback de erro via `Alert`.
- Sem rotinas de exclusão nesta etapa → ConfirmDialog não se aplica.
- Layout responsivo verificado em 360px / 768px / 1280px.

## 9. Fora de escopo (próximas etapas)

- Fluxo de resposta do teste (salas/perguntas), relatórios reais, painel admin, comissões reais, envio de email do convite, login com Google.

---

## Arquivos a criar / alterar

**Criar**
- `src/integrations/supabase/client.ts`
- `src/lib/auth-errors.ts`
- `src/hooks/use-auth.ts`, `src/hooks/use-current-role.ts`
- `src/routes/_authenticated.tsx`
- `src/routes/_authenticated/dashboard.tsx`, `_authenticated/comprar.tsx`, `_authenticated/comprar.retorno.tsx`, `_authenticated/testes.$id.destinatario.tsx`
- `supabase/migrations/001_…` a `006_rls_policies.sql`
- `supabase/functions/ef_create_purchase/index.ts`
- `supabase/functions/ef_mp_webhook/index.ts`
- `supabase/functions/ef_consume_invite/index.ts`

**Alterar**
- `src/routes/cadastro.tsx`, `src/routes/login.tsx`, `src/routes/__root.tsx`, `src/routes/convite.$token.tsx`
- `src/components/brand/BrandHeader.tsx`
- Remover/aposentar uso de `purchases` mock em `src/data/mock.ts` no fluxo master (mock fica só para admin/relatórios por enquanto).

## Inputs do usuário antes de codar

1. `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (via add_secret).
2. No painel do Supabase dele: configurar secrets `MERCADO_PAGO_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_BASE_URL` para as Edge Functions.
3. Rodar as migrations `001_…006_` no SQL editor (entregarei os arquivos prontos).
4. Configurar a URL de webhook (`…/functions/v1/ef_mp_webhook`) no painel Mercado Pago.

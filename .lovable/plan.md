## Mudanças desta revisão

- **Supabase externo** mantido (sem Lovable Cloud).
- **Mercado Pago adiado**: estrutura pronta, mas a "compra" é simulada — clica em "Pagar" → status vira `pago` imediatamente. Quando você colocar o token MP depois, é só trocar uma flag.
- **Lógica interna** vai em `createServerFn` (TanStack) em vez de Edge Functions, porque é o padrão do stack. **Apenas o webhook MP** ficará como Edge Function `ef_mp_webhook` (criada já, mas inerte até as keys chegarem).

---

## 1. Secrets — o que VOCÊ coloca onde

### A) No painel do **Lovable** (secrets do app — server-side)
Não posso usar prefixo `SUPABASE_` nem `VITE_` (a plataforma reserva). Vou usar nomes alternativos:

| Nome do secret | Valor | Onde encontrar |
|---|---|---|
| `EXT_SUPABASE_URL` | URL do seu projeto Supabase | Settings → API → Project URL |
| `EXT_SUPABASE_SERVICE_ROLE_KEY` | service_role key | Settings → API → service_role (secret) |
| `MERCADO_PAGO_ACCESS_TOKEN` | (deixe vazio por enquanto) | Mais tarde |
| `MP_WEBHOOK_SECRET` | (deixe vazio por enquanto) | Mais tarde |
| `APP_BASE_URL` | ✅ já cadastrado | — |

### B) No arquivo `.env` da raiz do projeto (chaves públicas — browser)
Vou criar um `.env.example`; você duplica para `.env` e preenche:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJI...   # anon/publishable key
```

### C) No painel do **Supabase** (secrets das Edge Functions)
Só relevante quando ativar Mercado Pago. Por enquanto **não precisa configurar nada**. Quando chegar a hora:

| Nome (Edge Function Secrets) | Valor |
|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | token de produção/teste MP |
| `MP_WEBHOOK_SECRET` | chave HMAC do webhook MP |

---

## 2. Migrations (entregues prontas em `supabase/migrations/`)

Você roda manualmente no SQL editor do seu Supabase, em ordem:

- `001_enums_and_profiles.sql` — enum `app_role`, tabela `profiles` (id, full_name, phone, birth_date, linked_master_id), trigger `handle_new_user` que cria profile + role default a partir de `raw_user_meta_data.role`.
- `002_user_roles.sql` — tabela `user_roles` + função `has_role(uuid, app_role)` security definer.
- `003_test_purchases.sql` — colunas: id, master_id, testando_user_id, testando_name, status (`aguardando_pagamento|pago|aguardando_convidado|em_andamento|concluido|cancelado`), amount_cents (default 2990), seller_code, timestamps.
- `004_payments.sql` — payments (purchase_id, mp_preference_id, mp_payment_id, method, status, raw jsonb). Vazia agora; alimentada depois pelo webhook.
- `005_invites.sql` — invites (token PK, purchase_id, testando_name, testando_email, consumed_by, consumed_at, expires_at).
- `006_rls_policies.sql` — RLS em todas as tabelas, políticas conforme regras (master CRUD seus purchases, user lê o próprio profile, etc.).

## 3. Auth real (master e user)

- `src/integrations/supabase/client.ts` → `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)` com persistência.
- `src/integrations/supabase/client.server.ts` → admin client com `EXT_SUPABASE_URL` + `EXT_SUPABASE_SERVICE_ROLE_KEY` (server-only).
- `src/integrations/supabase/auth-middleware.ts` → middleware `requireSupabaseAuth` lê JWT do header e devolve `supabase` + `userId` no context.
- `src/integrations/supabase/auth-attacher.ts` + registro em `src/start.ts` (functionMiddleware) anexa Bearer automaticamente.
- `cadastro.tsx`: `supabase.auth.signUp` com `options.data = { full_name, phone, birth_date, role: 'master' }`.
- `login.tsx`: `signInWithPassword`. Erros traduzidos em `src/lib/auth-errors.ts`.
- `__root.tsx`: `onAuthStateChange` único → `router.invalidate()` + `queryClient.invalidateQueries()`.
- `_authenticated.tsx` (layout pathless) + child `beforeLoad` chamando `supabase.auth.getUser()` para hidratar sessão antes do loader.
- `BrandHeader`: hook `useCurrentRole` (consulta `user_roles`) substitui o seletor mock. Botão Sair real.

## 4. Compra (mock por enquanto, MP pronto)

- `src/lib/purchases.functions.ts`:
  - `createPurchase` (server fn, auth obrigatória): insere `test_purchases` (status `aguardando_pagamento`). Lê flag `MERCADO_PAGO_ACCESS_TOKEN`. Se vazia/ausente → **modo simulado**: marca status `pago` imediatamente e retorna `{ purchase_id, simulated: true }`. Se presente → cria preference MP e retorna `{ purchase_id, init_point }`.
  - `getPurchaseStatus` (server fn): consulta status atual.
- `_authenticated/comprar.tsx`: form (PIX/cartão visível, código vendedor opcional) → "Pagar agora" chama `createPurchase`. Se `simulated` → toast "Pagamento simulado aprovado" + navega `/testes/$id/destinatario`. Se `init_point` → `window.location.href`.
- `_authenticated/comprar.retorno.tsx`: stub pronto para polling quando MP estiver ativo.

## 5. Edge Function `ef_mp_webhook` (criada vazia, ativável depois)

- `supabase/functions/ef_mp_webhook/index.ts`: handler completo com validação `x-signature` (HMAC `MP_WEBHOOK_SECRET`), busca `GET /v1/payments/{id}`, upsert em `payments`, atualiza `test_purchases.status='pago'` quando `approved`. Idempotente.
- Comentário no topo do arquivo com instruções: "para ativar, configure secrets X/Y no painel Supabase Functions e cadastre a URL no painel MP".

## 6. Destinatário e convite

- `_authenticated/testes.$id.destinatario.tsx`:
  - **Self** (`assignSelf` server fn): update purchase `testando_user_id = auth.uid()`, status `em_andamento` → `/teste/$id/intro`.
  - **Convidar** (`createInvite` server fn): gera token, insere em `invites`, purchase vira `aguardando_convidado`, devolve URL `${origin}/convite/<token>` com botão copiar.
- `convite.$token.tsx`: loader busca invite (RLS público por token). Form de cadastro do convidado (email, senha, nome pré-preenchido). Submit: `signUp` com `role:'user'` → login → `consumeInvite` server fn (vincula `testando_user_id`, `linked_master_id`, marca consumed) → `/teste/<id>/intro`.

## 7. Dashboard real

`_authenticated/dashboard.tsx`: `useSuspenseQuery` com server fn `listMyPurchases` (RLS escopo master). Mapa de status → ações (Retomar / Definir destinatário / Copiar convite / Continuar / Ver relatório).

## 8. UX / regras do projeto

- Máscaras existentes mantidas. `cursor-pointer` em clicáveis. Feedback de erro com `Alert`. Layout responsivo (360 / 768 / 1280).

## 9. Fora de escopo

Resposta do teste (salas), relatórios reais, painel admin, comissões, email do convite, Google sign-in.

---

## Arquivos a criar / alterar

**Criar**
- `.env.example`
- `src/integrations/supabase/{client.ts, client.server.ts, auth-middleware.ts, auth-attacher.ts}`
- `src/lib/{auth-errors.ts, purchases.functions.ts, invites.functions.ts, profile.functions.ts}`
- `src/hooks/{use-current-role.ts}`
- `src/routes/_authenticated.tsx`
- `src/routes/_authenticated/{dashboard.tsx, comprar.tsx, comprar.retorno.tsx, testes.$id.destinatario.tsx}`
- `supabase/migrations/001_…006_*.sql`
- `supabase/functions/ef_mp_webhook/index.ts`

**Alterar**
- `src/routes/{cadastro.tsx, login.tsx, __root.tsx, convite.$token.tsx}`
- `src/components/brand/BrandHeader.tsx`
- `src/start.ts` (anexar `attachSupabaseAuth` em `functionMiddleware`)

## Ordem de execução

1. Você cria o `.env` com as 2 VITE_* e me avisa quando rodar as 6 migrations.
2. Eu codo tudo (auth + compra simulada + convite + dashboard + edge function inerte).
3. Você testa fim a fim no modo simulado.
4. Quando quiser ativar MP: cadastra os 2 secrets no Supabase + 2 no Lovable, configura URL do webhook no MP, e a flag passa a usar o fluxo real automaticamente.

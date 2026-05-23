## Diagnóstico

O arquivo `supabase/migrations/005_invites.sql` foi gerado errado — ele contém o mesmo SQL do `004_payments.sql` (cria a tabela `payments` novamente, não cria `invites`). Por isso o `006_rls_policies.sql` falhou com `relation "public.invites" does not exist`.

Você não fez nada de errado. Os passos 001→004 rodaram bem; o 005 rodou sem efeito útil (a tabela `payments` já existia, então o `create table if not exists` foi no-op); o 006 quebrou na primeira referência a `invites`.

## Plano de correção

1. **Reescrever `supabase/migrations/005_invites.sql`** com o conteúdo correto da tabela `invites`, alinhado ao que `src/lib/invites.functions.ts` e o `006` esperam:
   - `token text primary key`
   - `purchase_id uuid → test_purchases(id) on delete cascade`
   - `master_id uuid → auth.users(id)`
   - `testando_name text`, `testando_email text`
   - `consumed_by uuid → auth.users(id)`, `consumed_at timestamptz`
   - `expires_at timestamptz not null default now() + interval '30 days'`
   - `created_at timestamptz not null default now()`
   - `alter table ... enable row level security`
   - índice em `purchase_id` e em `master_id`

2. **Nenhuma alteração nos outros arquivos.** O `006` já está correto e vai funcionar assim que `invites` existir.

## O que você precisa rodar no Supabase SQL Editor

Apenas dois arquivos, nessa ordem:

1. `supabase/migrations/005_invites.sql` (versão corrigida)
2. `supabase/migrations/006_rls_policies.sql` (re-rodar — é idempotente, usa `drop policy if exists`)

Não precisa reverter nada dos arquivos 001–004 que já rodaram.

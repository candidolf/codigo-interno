## Problema

A tela "Para quem é o teste?" falha ao gerar convite com:
`new row violates row-level security policy for table "invites"`

A server fn `createInvite` (em `src/lib/invites.functions.ts`) faz o INSERT usando o client autenticado do usuário (`context.supabase`), mas a tabela `public.invites` só tem uma policy de SELECT (`invites_select_master`). Não existe policy de INSERT, então a RLS bloqueia.

## Correção

Criar nova migration `supabase/migrations/011_invites_insert_policy.sql` adicionando:

```sql
drop policy if exists "invites_insert_master" on public.invites;
create policy "invites_insert_master" on public.invites
  for insert to authenticated
  with check (
    master_id = auth.uid()
    and exists (
      select 1 from public.test_purchases p
      where p.id = invites.purchase_id
        and p.master_id = auth.uid()
    )
  );
```

Isso permite que o master logado crie convites apenas para compras que sejam dele, mantendo a segurança. Consumo do convite continua via service role no server fn (`consumeInvite`), sem alteração.

Nenhuma alteração de código frontend ou de server fn é necessária.

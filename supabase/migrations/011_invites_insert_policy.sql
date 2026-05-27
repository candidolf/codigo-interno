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

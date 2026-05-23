-- profiles: usuário lê/atualiza seu próprio. Master lê profiles vinculados.
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select to authenticated
  using (id = auth.uid() or linked_master_id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- user_roles: cada usuário lê seus próprios roles
drop policy if exists "user_roles_select_self" on public.user_roles;
create policy "user_roles_select_self" on public.user_roles for select to authenticated
  using (user_id = auth.uid());

-- test_purchases: master CRUD seus; testando lê o próprio
drop policy if exists "purchases_select" on public.test_purchases;
create policy "purchases_select" on public.test_purchases for select to authenticated
  using (master_id = auth.uid() or testando_user_id = auth.uid());

drop policy if exists "purchases_insert" on public.test_purchases;
create policy "purchases_insert" on public.test_purchases for insert to authenticated
  with check (master_id = auth.uid());

drop policy if exists "purchases_update" on public.test_purchases;
create policy "purchases_update" on public.test_purchases for update to authenticated
  using (master_id = auth.uid() or testando_user_id = auth.uid())
  with check (master_id = auth.uid() or testando_user_id = auth.uid());

-- payments: lê quem é master da purchase
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = payments.purchase_id and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ));

-- invites: master vê seus convites; consumo é via service role (server fn)
drop policy if exists "invites_select_master" on public.invites;
create policy "invites_select_master" on public.invites for select to authenticated
  using (master_id = auth.uid());

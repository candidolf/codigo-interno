-- Admin policies extras (read-all em profiles/user_roles/test_purchases/payments)
drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "profiles_admin_delete_all" on public.profiles;
create policy "profiles_admin_delete_all" on public.profiles for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

drop policy if exists "user_roles_admin_select_all" on public.user_roles;
create policy "user_roles_admin_select_all" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
drop policy if exists "user_roles_admin_insert_all" on public.user_roles;
create policy "user_roles_admin_insert_all" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "user_roles_admin_delete_all" on public.user_roles;
create policy "user_roles_admin_delete_all" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

drop policy if exists "purchases_admin_select_all" on public.test_purchases;
create policy "purchases_admin_select_all" on public.test_purchases for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

drop policy if exists "payments_admin_select_all" on public.payments;
create policy "payments_admin_select_all" on public.payments for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- RPC de comissões mensais
create or replace function public.admin_monthly_commissions(month_start date)
returns table (
  seller_code text,
  seller_name text,
  tests bigint,
  gross_cents bigint,
  rate numeric,
  commission_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'forbidden';
  end if;
  return query
  select
    s.code,
    s.full_name,
    count(p.id)::bigint as tests,
    coalesce(sum(p.amount_cents),0)::bigint as gross_cents,
    s.commission_rate as rate,
    coalesce(round(sum(p.amount_cents) * s.commission_rate),0)::bigint as commission_cents
  from public.sellers s
  left join public.test_purchases p
    on p.seller_code = s.code
   and p.status in ('pago','em_andamento','concluido')
   and p.created_at >= month_start
   and p.created_at <  (month_start + interval '1 month')
  group by s.code, s.full_name, s.commission_rate
  order by commission_cents desc;
end;
$$;

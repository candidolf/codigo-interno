create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  full_name text not null,
  email text,
  phone text,
  cpf text,
  commission_rate numeric(5,4) not null default 0.20,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sellers enable row level security;
create index if not exists idx_sellers_code on public.sellers(code);

drop policy if exists "sellers_admin_sel" on public.sellers;
create policy "sellers_admin_sel" on public.sellers for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "sellers_admin_ins" on public.sellers;
create policy "sellers_admin_ins" on public.sellers for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "sellers_admin_upd" on public.sellers;
create policy "sellers_admin_upd" on public.sellers for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "sellers_admin_del" on public.sellers;
create policy "sellers_admin_del" on public.sellers for delete to authenticated using (public.has_role(auth.uid(),'admin'));

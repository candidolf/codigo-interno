-- Revelação individual exibida ao concluir cada sala.
create table if not exists public.test_room_reports (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.test_purchases(id) on delete cascade,
  room_slug text not null,
  status text not null default 'gerando' check (status in ('gerando','pronto','erro')),
  content text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_id, room_slug)
);

create index if not exists idx_test_room_reports_purchase on public.test_room_reports(purchase_id);
grant select on public.test_room_reports to authenticated;
grant all on public.test_room_reports to service_role;
alter table public.test_room_reports enable row level security;

drop policy if exists "test_room_reports_select" on public.test_room_reports;
create policy "test_room_reports_select" on public.test_room_reports for select to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = test_room_reports.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ) or public.has_role(auth.uid(),'admin'));

drop trigger if exists test_room_reports_set_updated_at on public.test_room_reports;
create trigger test_room_reports_set_updated_at before update on public.test_room_reports
for each row execute function public.set_updated_at();

-- Respostas do teste e relatórios gerados por IA
create table if not exists public.test_answers (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.test_purchases(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete set null,
  answer_label text not null,
  other_text text,
  created_at timestamptz not null default now(),
  unique (purchase_id, question_id)
);

create index if not exists idx_test_answers_purchase on public.test_answers(purchase_id);

grant select, insert, update, delete on public.test_answers to authenticated;
grant all on public.test_answers to service_role;

alter table public.test_answers enable row level security;

drop policy if exists "test_answers_select" on public.test_answers;
create policy "test_answers_select" on public.test_answers for select to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = test_answers.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ) or public.has_role(auth.uid(),'admin'));

drop policy if exists "test_answers_insert" on public.test_answers;
create policy "test_answers_insert" on public.test_answers for insert to authenticated
  with check (exists (
    select 1 from public.test_purchases p
    where p.id = test_answers.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ));

drop policy if exists "test_answers_update" on public.test_answers;
create policy "test_answers_update" on public.test_answers for update to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = test_answers.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ))
  with check (exists (
    select 1 from public.test_purchases p
    where p.id = test_answers.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ));

drop policy if exists "test_answers_delete" on public.test_answers;
create policy "test_answers_delete" on public.test_answers for delete to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = test_answers.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ));

create table if not exists public.test_reports (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.test_purchases(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  model text,
  status text not null default 'gerando' check (status in ('gerando','pronto','erro')),
  content text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.test_reports to authenticated;
grant all on public.test_reports to service_role;

alter table public.test_reports enable row level security;

drop policy if exists "test_reports_select" on public.test_reports;
create policy "test_reports_select" on public.test_reports for select to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = test_reports.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ) or public.has_role(auth.uid(),'admin'));

drop policy if exists "test_reports_insert" on public.test_reports;
create policy "test_reports_insert" on public.test_reports for insert to authenticated
  with check (exists (
    select 1 from public.test_purchases p
    where p.id = test_reports.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ));

drop policy if exists "test_reports_update" on public.test_reports;
create policy "test_reports_update" on public.test_reports for update to authenticated
  using (exists (
    select 1 from public.test_purchases p
    where p.id = test_reports.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ))
  with check (exists (
    select 1 from public.test_purchases p
    where p.id = test_reports.purchase_id
      and (p.master_id = auth.uid() or p.testando_user_id = auth.uid())
  ));

drop trigger if exists test_reports_set_updated_at on public.test_reports;
create trigger test_reports_set_updated_at
before update on public.test_reports
for each row execute function public.set_updated_at();

-- Contexto opcional usado pelo gerador de perguntas por IA
alter table public.rooms add column if not exists generation_hint text;

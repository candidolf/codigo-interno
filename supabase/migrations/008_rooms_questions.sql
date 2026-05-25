-- Salas, perguntas e alternativas (CRUD admin; leitura para autenticados)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  theme text not null check (theme in ('joy','fear','anger','discovery')),
  description text,
  age_min int not null default 6,
  age_max int not null default 99,
  primary_color text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rooms enable row level security;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create index if not exists idx_questions_room on public.questions(room_id);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  emoji text,
  sort_order int not null default 0
);
alter table public.answers enable row level security;
create index if not exists idx_answers_question on public.answers(question_id);

drop policy if exists "rooms_select_auth" on public.rooms;
create policy "rooms_select_auth" on public.rooms for select to authenticated using (true);
drop policy if exists "questions_select_auth" on public.questions;
create policy "questions_select_auth" on public.questions for select to authenticated using (true);
drop policy if exists "answers_select_auth" on public.answers;
create policy "answers_select_auth" on public.answers for select to authenticated using (true);

drop policy if exists "rooms_admin_ins" on public.rooms;
create policy "rooms_admin_ins" on public.rooms for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "rooms_admin_upd" on public.rooms;
create policy "rooms_admin_upd" on public.rooms for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "rooms_admin_del" on public.rooms;
create policy "rooms_admin_del" on public.rooms for delete to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "questions_admin_ins" on public.questions;
create policy "questions_admin_ins" on public.questions for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "questions_admin_upd" on public.questions;
create policy "questions_admin_upd" on public.questions for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "questions_admin_del" on public.questions;
create policy "questions_admin_del" on public.questions for delete to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "answers_admin_ins" on public.answers;
create policy "answers_admin_ins" on public.answers for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "answers_admin_upd" on public.answers;
create policy "answers_admin_upd" on public.answers for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "answers_admin_del" on public.answers;
create policy "answers_admin_del" on public.answers for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.rooms (slug, title, theme, description, age_min, age_max, sort_order)
values
  ('alegria','Sala da Alegria','joy','Explorando o que te traz luz e entusiasmo.',6,99,1),
  ('medo','Sala do Medo','fear','Conhecendo o que te paralisa e o que te protege.',8,99,2),
  ('raiva','Sala da Raiva','anger','Entendendo seus limites e gatilhos.',10,99,3),
  ('descobertas','Sala das Descobertas','discovery','O que move sua curiosidade.',6,99,4)
on conflict (slug) do nothing;

-- Run no SQL Editor do seu Supabase externo, em ordem
do $$ begin
  create type public.app_role as enum ('master', 'user', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  birth_date date,
  linked_master_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  role_text text := coalesce(meta->>'role', 'user');
begin
  insert into public.profiles (id, full_name, phone, birth_date)
  values (
    new.id, meta->>'full_name', meta->>'phone',
    case when (meta->>'birth_date') is not null and (meta->>'birth_date') <> ''
         then (meta->>'birth_date')::date else null end
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, role_text::public.app_role)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

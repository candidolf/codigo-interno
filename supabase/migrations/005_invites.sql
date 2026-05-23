create table if not exists public.invites (
  token text primary key,
  purchase_id uuid not null references public.test_purchases(id) on delete cascade,
  master_id uuid not null references auth.users(id) on delete cascade,
  testando_name text,
  testando_email text,
  consumed_by uuid references auth.users(id) on delete set null,
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;

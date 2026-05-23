create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.test_purchases(id) on delete cascade,
  mp_preference_id text,
  mp_payment_id text unique,
  method text,
  status text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create index if not exists idx_payments_purchase on public.payments(purchase_id);

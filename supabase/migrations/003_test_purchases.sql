create table if not exists public.test_purchases (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references auth.users(id) on delete cascade,
  testando_user_id uuid references auth.users(id) on delete set null,
  testando_name text,
  testando_email text,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','aguardando_convidado','em_andamento','concluido','cancelado')),
  amount_cents integer not null default 2990,
  seller_code text,
  payment_method text,
  simulated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.test_purchases enable row level security;
create index if not exists idx_test_purchases_master on public.test_purchases(master_id);
create index if not exists idx_test_purchases_testando on public.test_purchases(testando_user_id);

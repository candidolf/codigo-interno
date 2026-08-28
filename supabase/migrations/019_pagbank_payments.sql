-- PagBank Orders API. The application remains simulated until
-- PAGBANK_PAYMENTS_ENABLED=true is explicitly configured.

alter table public.payments
  add column if not exists pagbank_order_id text,
  add column if not exists pagbank_charge_id text;

create unique index if not exists uq_payments_pagbank_order_id
  on public.payments(pagbank_order_id) where pagbank_order_id is not null;

create unique index if not exists uq_payments_pagbank_charge_id
  on public.payments(pagbank_charge_id) where pagbank_charge_id is not null;

grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;

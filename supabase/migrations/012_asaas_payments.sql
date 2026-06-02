-- Asaas integration (sandbox). Replaces Mercado Pago columns/concepts.

alter table public.profiles
  add column if not exists cpf_cnpj text,
  add column if not exists asaas_customer_id text;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='payments' and column_name='mp_preference_id'
  ) then
    alter table public.payments rename column mp_preference_id to asaas_customer_id;
  end if;
exception when others then null; end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='payments' and column_name='mp_payment_id'
  ) then
    alter table public.payments rename column mp_payment_id to asaas_payment_id;
  end if;
exception when others then null; end $$;

alter table public.payments
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_payment_id text,
  add column if not exists invoice_url text,
  add column if not exists pix_qr_code text,
  add column if not exists pix_copy_paste text,
  add column if not exists boleto_url text,
  add column if not exists due_date date;

create unique index if not exists uq_payments_asaas_payment_id
  on public.payments(asaas_payment_id) where asaas_payment_id is not null;

grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

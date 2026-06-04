-- Snapshot da comissão por compra (rate e valor congelados no momento da compra)
alter table public.test_purchases
  add column if not exists commission_rate numeric(5,4),
  add column if not exists commission_cents integer;

-- RPC de comissões mensais: usa o snapshot quando disponível,
-- senão recalcula com a rate atual do vendedor (compras antigas).
create or replace function public.admin_monthly_commissions(month_start date)
returns table (
  seller_code text,
  seller_name text,
  tests bigint,
  gross_cents bigint,
  rate numeric,
  commission_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'forbidden';
  end if;
  return query
  select
    s.code,
    s.full_name,
    count(p.id)::bigint as tests,
    coalesce(sum(p.amount_cents),0)::bigint as gross_cents,
    s.commission_rate as rate,
    coalesce(
      sum(coalesce(p.commission_cents, round(p.amount_cents * s.commission_rate)))::bigint,
      0
    ) as commission_cents
  from public.sellers s
  left join public.test_purchases p
    on p.seller_code = s.code
   and p.status in ('pago','em_andamento','concluido')
   and p.created_at >= month_start
   and p.created_at <  (month_start + interval '1 month')
  group by s.code, s.full_name, s.commission_rate
  order by commission_cents desc;
end;
$$;

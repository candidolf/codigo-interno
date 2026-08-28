-- Totais do painel administrativo calculados no banco para evitar dados
-- incompletos por limite de linhas do cliente.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  with paid_purchases as (
    select
      p.created_at,
      p.amount_cents,
      coalesce(p.commission_cents, round(p.amount_cents * coalesce(p.commission_rate, s.commission_rate, 0)))::bigint as commission_cents
    from public.test_purchases p
    left join public.sellers s on s.code = p.seller_code
    where p.status in ('pago', 'em_andamento', 'concluido')
  ),
  monthly as (
    select
      date_trunc('month', month_start)::date as month_start,
      coalesce(sum(pp.amount_cents), 0)::bigint as revenue_cents
    from generate_series(
      date_trunc('month', current_date) - interval '5 months',
      date_trunc('month', current_date),
      interval '1 month'
    ) as gs(month_start)
    left join paid_purchases pp
      on pp.created_at >= month_start
     and pp.created_at < month_start + interval '1 month'
    group by month_start
    order by month_start
  ),
  purchase_totals as (
    select
      count(*)::bigint as sold,
      count(*) filter (where status = 'em_andamento')::bigint as in_progress,
      count(*) filter (where status = 'concluido')::bigint as completed
    from public.test_purchases
    where status in ('pago', 'em_andamento', 'concluido')
  ),
  revenue_totals as (
    select
      coalesce(sum(amount_cents) filter (where created_at >= date_trunc('month', current_date)), 0)::bigint as current_month_cents,
      coalesce(sum(amount_cents) filter (where created_at >= date_trunc('month', current_date) - interval '1 month' and created_at < date_trunc('month', current_date)), 0)::bigint as previous_month_cents,
      coalesce(sum(amount_cents) filter (where created_at >= date_trunc('month', current_date) - interval '11 months'), 0)::bigint as accumulated_cents,
      coalesce(avg(amount_cents), 0)::numeric as average_ticket_cents,
      coalesce(sum(commission_cents), 0)::bigint as commissions_cents
    from paid_purchases
  ),
  role_totals as (
    select
      count(distinct user_id) filter (where role = 'master')::bigint as masters,
      count(distinct user_id) filter (where role = 'user')::bigint as users
    from public.user_roles
  )
  select jsonb_build_object(
    'masters', role_totals.masters,
    'users', role_totals.users,
    'sold', purchase_totals.sold,
    'in_progress', purchase_totals.in_progress,
    'completed', purchase_totals.completed,
    'current_month_cents', revenue_totals.current_month_cents,
    'previous_month_cents', revenue_totals.previous_month_cents,
    'accumulated_cents', revenue_totals.accumulated_cents,
    'average_ticket_cents', round(revenue_totals.average_ticket_cents)::bigint,
    'commissions_cents', revenue_totals.commissions_cents,
    'monthly', coalesce((select jsonb_agg(monthly order by month_start) from monthly), '[]'::jsonb)
  ) into result
  from role_totals, purchase_totals, revenue_totals;

  return result;
end;
$$;

-- 016: Correções de segurança
-- 1) Signup não pode auto-atribuir papel 'admin'
-- 2) Integridade financeira/status de test_purchases

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested text := coalesce(meta->>'role', 'user');
  safe_role public.app_role;
begin
  -- NUNCA confiar em metadata do cliente para papéis privilegiados.
  -- 'admin' só pode ser concedido por ação administrativa (service role).
  safe_role := case when requested = 'master' then 'master'::public.app_role
                    else 'user'::public.app_role end;

  insert into public.profiles (id, full_name, phone, birth_date)
  values (
    new.id, meta->>'full_name', meta->>'phone',
    case when (meta->>'birth_date') is not null and (meta->>'birth_date') <> ''
         then (meta->>'birth_date')::date else null end
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, safe_role)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bloqueia alteração de campos financeiros e de status pago por usuários finais.
create or replace function public.guard_test_purchase_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
begin
  if jwt_role is null or jwt_role = 'service_role' or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if new.amount_cents is distinct from old.amount_cents
     or new.commission_cents is distinct from old.commission_cents
     or new.commission_rate is distinct from old.commission_rate
     or new.seller_code is distinct from old.seller_code
     or new.master_id is distinct from old.master_id then
    raise exception 'Alteração não permitida em campos financeiros da compra';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('em_andamento', 'concluido') then
    raise exception 'Alteração de status não permitida';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_test_purchase_update on public.test_purchases;
create trigger trg_guard_test_purchase_update
  before update on public.test_purchases
  for each row execute function public.guard_test_purchase_update();

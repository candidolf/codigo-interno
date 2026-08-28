-- Geração assíncrona de relatórios com telemetria e proteção contra duplicidade.

alter table public.ai_agents
  add column if not exists reasoning_effort text not null default 'low'
  check (reasoning_effort in ('none', 'low', 'medium', 'high', 'xhigh', 'max'));

-- O relatório é uma tarefa estruturada e sensível à latência. Terra + low é o
-- ponto inicial recomendado; o limite inclui raciocínio e saída visível.
update public.ai_agents
set
  model = 'gpt-5.6-terra',
  reasoning_effort = 'low',
  max_tokens = greatest(max_tokens, 16000),
  response_format = 'json_object',
  updated_at = now()
where kind = 'report_analyzer';

update public.ai_agents
set
  reasoning_effort = 'none',
  max_tokens = greatest(max_tokens, 6000),
  updated_at = now()
where kind = 'question_generator';

alter table public.test_reports
  add column if not exists generation_id uuid,
  add column if not exists provider_response_id text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists duration_ms bigint,
  add column if not exists finish_reason text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists reasoning_tokens integer,
  add column if not exists total_tokens integer;

create unique index if not exists idx_test_reports_provider_response
  on public.test_reports(provider_response_id)
  where provider_response_id is not null;

create or replace function public.claim_test_report_generation(
  _purchase_id uuid,
  _agent_id uuid,
  _model text
)
returns table(generation_id uuid, acquired boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_generation_id uuid := gen_random_uuid();
  v_current_id uuid;
begin
  insert into public.test_reports (
    purchase_id,
    agent_id,
    model,
    status,
    content,
    error,
    generation_id,
    provider_response_id,
    started_at,
    completed_at,
    duration_ms,
    finish_reason,
    input_tokens,
    output_tokens,
    reasoning_tokens,
    total_tokens
  ) values (
    _purchase_id,
    _agent_id,
    _model,
    'gerando',
    null,
    null,
    v_generation_id,
    null,
    now(),
    null,
    null,
    null,
    null,
    null,
    null,
    null
  )
  on conflict (purchase_id) do nothing
  returning test_reports.generation_id into v_current_id;

  if found then
    return query select v_current_id, true;
    return;
  end if;

  -- Uma execução presa pode ser retomada após 15 minutos. Antes disso, uma
  -- segunda aba recebe a geração atual em vez de iniciar outra cobrança.
  update public.test_reports
  set
    agent_id = _agent_id,
    model = _model,
    status = 'gerando',
    content = null,
    error = null,
    generation_id = v_generation_id,
    provider_response_id = null,
    started_at = now(),
    completed_at = null,
    duration_ms = null,
    finish_reason = null,
    input_tokens = null,
    output_tokens = null,
    reasoning_tokens = null,
    total_tokens = null
  where purchase_id = _purchase_id
    and (
      status <> 'gerando'
      or started_at is null
      or started_at < now() - interval '15 minutes'
    )
  returning test_reports.generation_id into v_current_id;

  if found then
    return query select v_current_id, true;
    return;
  end if;

  select tr.generation_id
  into v_current_id
  from public.test_reports tr
  where tr.purchase_id = _purchase_id;

  return query select v_current_id, false;
end;
$$;

revoke all on function public.claim_test_report_generation(uuid, uuid, text) from public;
revoke all on function public.claim_test_report_generation(uuid, uuid, text) from anon;
revoke all on function public.claim_test_report_generation(uuid, uuid, text) from authenticated;
grant execute on function public.claim_test_report_generation(uuid, uuid, text) to service_role;

-- A Edge Function passa a ser a única responsável por alterar relatórios.
drop policy if exists "test_reports_insert" on public.test_reports;
drop policy if exists "test_reports_update" on public.test_reports;
drop policy if exists "test_reports_delete" on public.test_reports;
revoke insert, update, delete on public.test_reports from authenticated;

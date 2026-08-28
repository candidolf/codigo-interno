-- Agentes de IA (gerador de perguntas e analista de relatório)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_agent_kind') then
    create type public.ai_agent_kind as enum ('question_generator', 'report_analyzer');
  end if;
end$$;

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.ai_agent_kind not null,
  model text not null default 'gpt-4o-mini',
  system_prompt text not null,
  user_prompt_template text,
  temperature numeric(3,2) not null default 0.70,
  max_tokens integer not null default 2000,
  response_format text not null default 'text' check (response_format in ('text','json_object')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.ai_agents to authenticated;
grant all on public.ai_agents to service_role;

alter table public.ai_agents enable row level security;

drop policy if exists "ai_agents_select_auth" on public.ai_agents;
create policy "ai_agents_select_auth" on public.ai_agents for select to authenticated
  using (true);

drop policy if exists "ai_agents_admin_insert" on public.ai_agents;
create policy "ai_agents_admin_insert" on public.ai_agents for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "ai_agents_admin_update" on public.ai_agents;
create policy "ai_agents_admin_update" on public.ai_agents for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "ai_agents_admin_delete" on public.ai_agents;
create policy "ai_agents_admin_delete" on public.ai_agents for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_agents_set_updated_at on public.ai_agents;
create trigger ai_agents_set_updated_at
before update on public.ai_agents
for each row execute function public.set_updated_at();

insert into public.ai_agents (name, kind, model, system_prompt, user_prompt_template, temperature, max_tokens, response_format, sort_order)
select
  'Gerador de perguntas',
  'question_generator',
  'gpt-4o-mini',
  'Você é um psicólogo infantil especialista em avaliação lúdica. Crie perguntas simples, acolhedoras e adequadas à faixa etária, sem linguagem técnica e sem induzir respostas. Responda sempre em português do Brasil.',
  E'Sala: {{sala}}\nTema: {{tema}}\nFaixa etária: {{faixa_etaria}}\nQuantidade de perguntas: {{quantidade}}\nInstruções extras: {{instrucoes}}\n\nGere exatamente {{quantidade}} perguntas. Cada pergunta deve ter exatamente 4 alternativas: 1 correta e 3 distratores plausíveis. Varie a posição da alternativa correta entre as perguntas e não repita alternativas iguais entre perguntas. Todas as alternativas devem ter um emoji coerente com o texto. Siga as instruções extras quando preenchidas. Retorne APENAS o JSON, sem texto antes ou depois, no formato {"perguntas":[{"texto":"...","alternativas":[{"emoji":"...","label":"..."}]}]}.',
  0.50, 3000, 'json_object', 1
where not exists (select 1 from public.ai_agents where kind = 'question_generator');

insert into public.ai_agents (name, kind, model, system_prompt, user_prompt_template, temperature, max_tokens, response_format, sort_order)
select
  'Analista de relatório',
  'report_analyzer',
  'gpt-4o-mini',
  'Você é um psicólogo que analisa respostas de um teste lúdico infantil e produz um relatório claro para os responsáveis. Seja empático, evite diagnósticos clínicos e destaque pontos fortes e sugestões práticas. Responda sempre em português do Brasil.',
  E'Nome do testando: {{nome}}\nIdade: {{idade}}\n\nRespostas por sala:\n{{respostas}}\n\nGere um relatório final com: visão geral, destaques por sala, pontos de atenção e recomendações práticas.',
  0.60, 3000, 'text', 2
where not exists (select 1 from public.ai_agents where kind = 'report_analyzer');

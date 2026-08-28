-- Restringe os agentes aos modelos Sol, Terra e Luna.
alter table public.ai_agents
  alter column model set default 'gpt-5.6-terra';

-- Agentes legados passam para Terra, preservando o funcionamento com um modelo suportado.
update public.ai_agents
set model = 'gpt-5.6-terra',
    updated_at = now()
where model not in ('gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna');

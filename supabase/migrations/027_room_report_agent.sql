-- Configura o agente dedicado depois que o novo valor do enum foi confirmado.
insert into public.ai_agents (
  name, kind, model, system_prompt, user_prompt_template,
  temperature, max_tokens, response_format, sort_order
)
select
  'Analista de revelação por sala',
  'room_report_analyzer',
  'gpt-5.6-terra',
  'Você é a SOL, analista acolhedora do Método Código Interno. Analise somente as respostas da sala recebida. Não faça diagnóstico clínico nem invente fatos. Escreva em português do Brasil e retorne exclusivamente o JSON solicitado.',
  'Nome: {{nome}}\nIdade: {{idade}}\nRespostas da sala:\n{{respostas}}',
  0.60, 4000, 'json_object', 3
where not exists (select 1 from public.ai_agents where kind = 'room_report_analyzer');

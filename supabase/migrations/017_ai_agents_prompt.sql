-- 017: Melhora o template do gerador de perguntas (campo instrucoes + regras de formato)
-- Só atualiza agentes que ainda usam o template padrão antigo; templates personalizados ficam intactos.
update public.ai_agents
set
  user_prompt_template = E'Sala: {{sala}}\nTema: {{tema}}\nFaixa etária: {{faixa_etaria}}\nQuantidade de perguntas: {{quantidade}}\nInstruções extras: {{instrucoes}}\n\nGere exatamente {{quantidade}} perguntas. Cada pergunta deve ter exatamente 4 alternativas: 1 correta e 3 distratores plausíveis. Varie a posição da alternativa correta entre as perguntas e não repita alternativas iguais entre perguntas. Todas as alternativas devem ter um emoji coerente com o texto. Siga as instruções extras quando preenchidas. Retorne APENAS o JSON, sem texto antes ou depois, no formato {"perguntas":[{"texto":"...","alternativas":[{"emoji":"...","label":"..."}]}]}.',
  temperature = 0.50,
  max_tokens = 3000,
  updated_at = now()
where kind = 'question_generator'
  and user_prompt_template like '%Gere as perguntas com 4 alternativas cada%';
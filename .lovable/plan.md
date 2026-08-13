# Corrigir "não retornou perguntas em formato válido (JSON)"

## Situação atual (verificada no código)
A edge function `ef_ai_agent` já foi ajustada nesta sessão:
- para modelos de raciocínio (`o1/o3/o4/gpt-5`) envia `max_completion_tokens` com no mínimo 4000 e omite `temperature`;
- se a OpenAI devolver conteúdo vazio, retorna erro explicando o motivo (`finish_reason`).

Essas mudanças estão no repositório, mas a função ainda **não foi implantada** no seu Supabase — por isso o erro continua igual na sala 2.

## O que fazer
1. Fazer o deploy da edge function `ef_ai_agent` no seu Supabase (é o passo que resolve o erro atual).
2. Se após o deploy ainda falhar, o retorno agora dirá exatamente o motivo (tokens esgotados no raciocínio ou resposta vazia).

## Ajuste opcional recomendado
Trocar o modelo do agente "Gerador de perguntas" de `o4-mini` para `gpt-4o-mini` em Admin → Agentes: modelos de raciocínio gastam boa parte do orçamento de tokens "pensando" e são mais lentos e caros para uma saída JSON simples. Nenhuma mudança de código é necessária, apenas o cadastro do agente.

## Detalhes técnicos
- Arquivo: `supabase/functions/ef_ai_agent/index.ts` (já contém `max_completion_tokens` mínimo de 4000 e checagem de `finish_reason`).
- Arquivo: `src/lib/ai-agents.ts` (mensagem de erro mais clara, incluindo trecho da resposta recebida).

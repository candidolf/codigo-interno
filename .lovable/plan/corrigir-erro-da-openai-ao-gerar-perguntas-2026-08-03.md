# Corrigir erro da OpenAI ao gerar perguntas

## Problema
A edge function `ef_ai_agent` envia sempre `max_tokens`. Modelos mais novos (série o / raciocínio, como `o4-mini`) rejeitam esse parâmetro e exigem `max_completion_tokens`. Além disso, esses modelos normalmente só aceitam `temperature` padrão (1), o que gera o próximo erro logo depois.

## Ajuste
Em `supabase/functions/ef_ai_agent/index.ts`, montar o corpo da requisição conforme o modelo:

- Detectar modelos de raciocínio pelo id (`o1*`, `o3*`, `o4*`, `gpt-5*`).
- Para esses modelos: enviar `max_completion_tokens` e **não** enviar `temperature`.
- Para os demais (`gpt-4o`, `gpt-4.1`, etc.): manter `max_tokens` e `temperature` como hoje.
- Resiliência: se a OpenAI ainda responder com `unsupported_parameter` para `max_tokens` ou `temperature`, refazer a chamada uma vez sem/com o parâmetro correto, para não quebrar com modelos futuros.

Mensagem de erro exibida ao admin continua a mesma, apenas mais legível (usa a `message` da OpenAI quando existir).

## Depois de aplicar
É necessário fazer o deploy da edge function `ef_ai_agent` no seu Supabase para o efeito valer.

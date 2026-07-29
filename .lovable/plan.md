## Objetivo

Criar a tabela `ai_agents` para armazenar os agentes de IA (gerador de perguntas e analisador de respostas/relatório), uma tela de administração completa e uma Edge Function no Supabase que executa o agente usando a API da OpenAI.

## 1. Migration `014_ai_agents.sql`

Tabela `public.ai_agents`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| name | text not null | nome do agente |
| kind | enum `ai_agent_kind` | `question_generator` \| `report_analyzer` |
| model | text not null | default `gpt-4o-mini` |
| system_prompt | text not null | instruções do agente |
| user_prompt_template | text | template com placeholders (ex.: `{{sala}}`, `{{respostas}}`) |
| temperature | numeric | default `0.7` |
| max_tokens | int | default `2000` |
| response_format | text | `text` \| `json_object` |
| active | boolean | default true |
| sort_order | int | default 0 |
| created_at / updated_at | timestamptz | trigger de updated_at |

Segurança (na mesma migration, nesta ordem):
1. `CREATE TYPE` + `CREATE TABLE`
2. `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated;` e `GRANT ALL ... TO service_role;` (sem `anon`)
3. `ENABLE ROW LEVEL SECURITY`
4. Políticas: leitura para `authenticated`; insert/update/delete apenas para `public.has_role(auth.uid(), 'admin')`

Também inclui INSERT dos 2 agentes iniciais (gerador de perguntas e analista de relatório) com prompts base em português.

## 2. Tela admin — CRUD completo

- `src/routes/_authenticated/admin/agentes.tsx` (layout com `<Outlet />`)
- `agentes.index.tsx` — lista (nome, tipo, modelo, ativo), busca, botões editar/excluir com `ConfirmDialog`
- `agentes.novo.tsx` e `agentes.$id.tsx` — usam um componente compartilhado `src/components/brand/AgenteForm.tsx`
- Ao salvar (criar ou editar) volta automaticamente para a lista
- Todos os elementos clicáveis com `cursor-pointer`; layout responsivo
- Link "Agentes de IA" adicionado no painel `/admin`

## 3. Edge Function `ef_ai_agent`

Arquivo único inline: `supabase/functions/ef_ai_agent/index.ts`

- Recebe `{ agentKind | agentId, variables: Record<string,string> }`
- Valida o JWT do chamador via `Authorization` header
- Busca o agente ativo na tabela `ai_agents` (service role)
- Interpola as variáveis no `user_prompt_template`
- Chama `https://api.openai.com/v1/chat/completions` com `OPENAI_API_KEY` lido de `Deno.env.get()`
- Retorna o conteúdo gerado (texto ou JSON) com tratamento de erros (401/429/402) e CORS

## 4. Secret

Vou solicitar a chave `OPENAI_API_KEY` pelo formulário seguro. Você também precisa cadastrá-la no seu Supabase externo:

```
supabase secrets set OPENAI_API_KEY="sk-..."
```

## Fora de escopo

Não altero header, autenticação, Asaas, checkout nem o fluxo atual de testes. A ligação do agente ao fluxo real (gerar perguntas na sala / gerar relatório final) fica para uma etapa seguinte, após validarmos o cadastro e a execução do agente.

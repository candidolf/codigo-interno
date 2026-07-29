## Objetivo

1. No cadastro/edição de sala: gerar perguntas usando um dos agentes cadastrados, pré-visualizar/editar e então salvar na sala.
2. No teste: usar as perguntas reais das salas (hoje o teste usa dados fictícios) e gravar as respostas no banco.
3. Ao concluir todas as salas: enviar perguntas + respostas ao agente analista, gerar o relatório, exibir na tela e permitir baixar em PDF.

## 1. Banco de dados (migração `015_test_answers_reports.sql`)

- `test_answers`: `id`, `purchase_id`, `room_id`, `question_id`, `answer_id` (nullable), `answer_label`, `other_text`, `created_at`; único por (`purchase_id`, `question_id`).
- `test_reports`: `id`, `purchase_id` (único), `agent_id`, `content` (texto do relatório), `model`, `status` (`gerando`/`pronto`/`erro`), `error`, `created_at`.
- GRANTs para `authenticated` e `service_role`; RLS: dono da compra (ou admin) lê/escreve suas respostas e seu relatório.
- Opcional em `rooms`: coluna `generation_hint` (tema/contexto padrão para o gerador de perguntas).

## 2. Geração de perguntas na sala (admin)

Em `SalaForm.tsx`, na seção "Perguntas da sala", novo botão **"Gerar com IA"** que abre um modal:

- Seleção do agente (lista de `ai_agents` com `kind = 'question_generator'`, ativos).
- Campos: quantidade de perguntas, faixa etária (pré-preenchida com a sala), tema/contexto, instruções extras.
- Chama a Edge Function `ef_ai_agent` com `agentId` e `variables` (`sala`, `tema`, `faixa_etaria`, `quantidade`), lê `parsed.perguntas`.
- Resultado exibido em **painel de pré-visualização**: cada pergunta editável (texto, ordem, 4 alternativas com emoji), com possibilidade de remover itens; botão "Descartar" e "Salvar na sala" (grava em `questions` + `answers` na ordem seguinte às existentes).
- Erros da OpenAI (401/429/JSON inválido) exibidos de forma clara com opção de tentar de novo.

## 3. Teste com perguntas reais + respostas no banco

- Trocar `src/data/mock.ts` pelas salas/perguntas do banco nas rotas `teste/$id/salas`, `teste/$id/sala/$slug` e `sala-concluida` (query por `rooms` ativos + `questions`/`answers`).
- Manter o `localStorage` como cache de andamento, mas gravar cada resposta em `test_answers` (upsert) via server function autenticada.
- Ao concluir a última sala ativa, redirecionar para `teste/$id/concluido` já disparando a geração do relatório.

## 4. Relatório final por IA

- Server function `generateReport`: valida dono da compra, monta o texto "Sala → Pergunta → Resposta" a partir de `test_answers`, chama `ef_ai_agent` com o agente `report_analyzer` (variáveis `nome`, `idade`, `respostas`), grava em `test_reports` e retorna o conteúdo.
- Tela `teste/$id/concluido`: estado "gerando…" com polling e mensagem de erro com botão "Tentar novamente".
- Tela `relatorio/$id`: substituir o conteúdo fictício pelo relatório real (renderização em markdown simples), com dados do testando, data e a marca.

## 5. PDF

- Botão "Baixar PDF" gerando o arquivo no navegador (jsPDF + html2canvas ou `jspdf` com texto formatado), com cabeçalho da marca, nome do testando, data e o conteúdo do relatório paginado.
- Nome do arquivo: `relatorio-<nome>-<data>.pdf`.

## Detalhes técnicos

- Chamadas de IA continuam na Edge Function `ef_ai_agent` (chave OpenAI só no servidor).
- Todas as ações destrutivas (descartar perguntas geradas, excluir) usam `ConfirmDialog`.
- Responsivo em todas as telas novas; ponteiro de mouse em áreas clicáveis.
- Ao salvar perguntas geradas, permanece na tela da sala; ao salvar a sala, volta para a lista (comportamento atual mantido).

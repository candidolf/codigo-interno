## Objetivo

Implementar o fluxo de execução do teste: testando entra, vê só as salas compatíveis com a idade dele, completa uma sala por vez (não pula entre salas), recebe um mini-relatório no fim de cada sala e, ao concluir todas, vê um placeholder do relatório completo.

Perguntas continuam **hardcoded** em `src/data/mock.ts` nesta fase. Salas também ficam hardcoded (admin já é mock); apenas a faixa etária por sala será respeitada.

## Escopo

### 1. Estado de progresso (client-side, por compra)
- Criar `src/lib/test-progress.ts`: helpers `loadProgress(purchaseId)`, `saveAnswer(purchaseId, roomSlug, questionId, answerId)`, `completeRoom(purchaseId, roomSlug)`, `getRoomProgress`, `isRoomComplete`, `getCurrentRoom` (sala que o testando iniciou e ainda não terminou), `allRoomsCompleted(eligibleSlugs)`.
- Persistência em `localStorage` com chave `pg:test:{purchaseId}` (estrutura: `{ rooms: { [slug]: { answers: {qid: aid|"other"}, otherTexts: {}, completedAt: string|null } }, startedRoom: slug|null }`).
- Persistência local é suficiente nesta fase; integração com Supabase fica para a fase de IA.

### 2. Idade do testando + filtro de salas (`teste.$id.salas.tsx`)
- Substituir `testandoAge = 11` mock por idade real:
  - Criar serverFn `getPurchaseTestando(purchaseId)` em `src/lib/purchases.functions.ts` que retorna `{ testandoUserId, testandoName, birthDate }` (busca `test_purchases` + `profiles` do `testando_user_id`).
  - Calcular idade a partir de `birth_date`. Se sem birth_date (convidado sem cadastro), fallback: assumir adulto (`99`? não — usar 18 default) e logar.
- Filtrar `rooms` por `ageMin..ageMax`. Salas fora da faixa **não aparecem**.
- Bloqueio de navegação entre salas:
  - Se `startedRoom` existe e ainda não foi concluída, os cards das outras salas ficam **desabilitados** (cursor-not-allowed, opacidade reduzida, sem link). Só o card da `startedRoom` é clicável (continua).
  - Se nenhuma sala iniciada, todos os cards elegíveis são clicáveis.
- Progresso por sala lido do `loadProgress` (substitui `progressBySlug` mock).
- Botão "Finalizar teste" só aparece quando `allRoomsCompleted(eligibleSlugs)` for true → leva para `/teste/$id/concluido`.

### 3. Execução da sala (`teste.$id.sala.$slug.tsx` + `QuestionFlow.tsx`)
- Ao montar a sala, marcar como `startedRoom` no progresso (se nenhuma outra já iniciada e inacabada — guardar contra reentradas).
- Se o usuário tentar acessar uma sala diferente da `startedRoom`, redirecionar de volta a `/teste/$id/salas`.
- `QuestionFlow`:
  - Receber `purchaseId` e `roomSlug` como props.
  - A cada `next()`, salvar a resposta (`saveAnswer`).
  - Se `picked === "other"`, persistir `otherText` também.
  - Permitir retomar do ponto em que parou: ao montar, pular para a primeira pergunta sem resposta.
  - Ao terminar a última pergunta: `completeRoom`, e navegar para `/teste/$id/sala/$slug/concluida` (mini-relatório da sala).

### 4. Mini-relatório por sala (novo arquivo `teste.$id.sala.$slug.concluida.tsx`)
- Tela "Parabéns, você concluiu a Sala da X".
- Mostrar um resumo gerado a partir das respostas (placeholder simples agora):
  - Total de perguntas respondidas, distribuição das respostas (a/b/c/d), texto fake "Sua tendência nesta sala é...".
- Dois botões: "Voltar ao mapa" (`/teste/$id/salas`) e — se ainda há salas elegíveis não concluídas — "Próxima sala" leva ao mapa; se todas concluídas, "Ver relatório final" (`/teste/$id/concluido`).

### 5. Relatório completo placeholder (`teste.$id.concluido.tsx` já existe)
- Adicionar nota visível "Relatório completo será gerado pela IA na próxima fase." (manter link para `/relatorio/$id` como mock).

### 6. RoomCard
- Aceitar prop `locked?: boolean`. Quando locked: sem `<Link>`, `<div>` com `cursor-not-allowed`, opacidade 50%, badge "Bloqueada — termine a sala em andamento".

## Fora de escopo (próxima fase)
- Geração real de relatório por IA.
- Persistência de respostas no Supabase.
- Edição de salas/perguntas no admin (continua mock).
- Validação de que o `testando_user_id` é o usuário logado (assume que sim, já controlado por RLS na compra).

## Arquivos tocados

- `src/lib/test-progress.ts` (novo)
- `src/lib/purchases.functions.ts` (+ `getPurchaseTestando`)
- `src/data/mock.ts` (sem mudança estrutural, apenas garantir 5 perguntas por sala já existe)
- `src/components/brand/RoomCard.tsx` (prop `locked`)
- `src/components/brand/QuestionFlow.tsx` (persistência + retomada)
- `src/routes/teste.$id.salas.tsx` (idade real, filtro, lock)
- `src/routes/teste.$id.sala.$slug.tsx` (guard de sala iniciada)
- `src/routes/teste.$id.sala.$slug.concluida.tsx` (novo)
- `src/routes/teste.$id.concluido.tsx` (nota placeholder)

Sem migrations. Sem mudanças de auth/RLS.

Posso seguir?
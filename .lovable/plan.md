## Bugs

### 1. Progresso mostra 100% antes do tempo
`QuestionFlow.tsx` calcula `progress = ((idx + 1) / questions.length) * 100`. Isso conta a pergunta **atual** como já feita, então na última pergunta a barra já marca 100% antes do clique. Usuário percebeu isso como "100% na penúltima".

**Fix:** trocar para `Math.round((idx / questions.length) * 100)` — barra reflete o que já foi respondido. 1ª pergunta = 0%, última (idx=4 de 5) = 80%, e a tela de conclusão da sala é o 100%.

### 2. Tela "travada" após terminar a sala
A rota de conclusão da sala foi criada como **filha aninhada** de `/teste/$id/sala/$slug`:
- arquivo: `teste.$id.sala.$slug.concluida.tsx`
- registrada em `routeTree.gen.ts` com `path: '/concluida'` sob o pai `/teste/$id/sala/$slug`.

Para uma rota filha renderizar, o componente pai precisa de `<Outlet />`. O `Sala` (`teste.$id.sala.$slug.tsx`) renderiza só o `QuestionFlow` — não tem `Outlet`. Resultado: ao navegar para `.../concluida`, a URL muda mas o pai continua mostrando o flow de perguntas e nada do mini-relatório aparece (parece travado).

**Fix:** tornar a rota de conclusão **irmã**, não filha:
- Renomear `src/routes/teste.$id.sala.$slug.concluida.tsx` → `src/routes/teste.$id.sala-concluida.$slug.tsx`.
- Mudar `createFileRoute` para `"/teste/$id/sala-concluida/$slug"`.
- Atualizar a navegação em `QuestionFlow.next()` para `to: "/teste/$id/sala-concluida/$slug"`.
- Atualizar o link "Voltar ao mapa"/"Próxima sala" dentro do mini-relatório (já apontam para `/teste/$id/salas`, sem mudança).

Sem mudança em `routeTree.gen.ts` manual — o plugin do TanStack regenera após o rename.

### 3. Guarda em `Sala` não bloquear retorno a uma sala já concluída
Como já temos a tela de conclusão, ao clicar "Voltar ao mapa" e depois reabrir a mesma sala (já concluída), o `useEffect` em `Sala` só redireciona se outra sala estiver iniciada. Se a sala já foi concluída, o componente carrega e o `QuestionFlow` reinicia em idx 0 (não há `firstUnanswered`) — pode reescrever respostas. Pequeno ajuste preventivo: se `roomState.completedAt` existe, redirecionar para a tela de conclusão da sala em vez de mostrar perguntas de novo.

## Arquivos tocados
- `src/components/brand/QuestionFlow.tsx` — fórmula do progresso + nova URL de navegação.
- `src/routes/teste.$id.sala-concluida.$slug.tsx` (novo, conteúdo igual ao antigo com novo `createFileRoute`).
- `src/routes/teste.$id.sala.$slug.concluida.tsx` (excluir).
- `src/routes/teste.$id.sala.$slug.tsx` — guard: se sala já concluída, redirecionar para a tela de conclusão.

Posso seguir?
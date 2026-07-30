# Otimização de performance da interface

Revisei carregamento de dados, guardas de rota e bundle. A lentidão vem de quatro causas concretas, todas confirmadas no código atual.

## O que está causando a lentidão

1. **Toda navegação na área logada faz uma chamada de rede ao servidor de auth.** `src/routes/_authenticated.tsx` usa `supabase.auth.getUser()` no `beforeLoad`, que é uma requisição HTTP ao Supabase e bloqueia a renderização da página. A sessão já está no navegador e pode ser lida localmente.
2. **Nenhum cache padrão no React Query.** O `QueryClient` em `src/router.tsx` é criado sem `defaultOptions`, então `staleTime` é 0: cada tela refaz as mesmas consultas a cada montagem e a cada volta do foco da janela (voltar de outra aba, navegar e voltar).
3. **Cascata de 3 consultas sequenciais para carregar as salas.** `fetchRoomsWithQuestions` busca salas → depois perguntas → depois alternativas, uma esperando a outra. É o "Carregando sala…" demorado no fluxo do teste.
4. **Bundle inicial maior que o necessário.** `jspdf` é importado estaticamente em `src/lib/report-pdf.ts`, usado direto pela rota `/relatorio/$id` — a biblioteca inteira entra no carregamento da tela mesmo sem clicar em baixar PDF.

Há também invalidação global de cache (`queryClient.invalidateQueries()` sem chave) disparada em eventos de auth em `__root.tsx` e no `signOut`, o que derruba todo o cache e força refetch de tudo.

## Mudanças propostas

**Rotas e cache**
- `src/router.tsx`: criar o `QueryClient` com `defaultOptions` — `staleTime` 60s, `gcTime` 5min, `refetchOnWindowFocus: false`, `retry: 1`. Ativar `defaultPreload: "intent"` para pré-carregar a rota no hover dos links, deixando a navegação instantânea.
- `src/routes/_authenticated.tsx`: trocar `getUser()` por `getSession()` (leitura local, sem ida à rede) no `beforeLoad`, mantendo o redirect para `/login`. A validação real do token continua no servidor via `requireSupabaseAuth`, então não há perda de segurança.

**Dados do teste**
- `src/lib/rooms-data.ts`: substituir as três consultas encadeadas por uma única consulta aninhada (`rooms` → `questions` → `answers`), montando o resultado em memória. De 3 idas ao banco para 1.
- `staleTime` de 5 min na query `rooms-with-questions`, que muda raramente.

**Bundle**
- `src/lib/report-pdf.ts`: carregar `jspdf` sob demanda com `await import("jspdf")` dentro da função de download.

**Invalidações**
- `src/routes/__root.tsx` e `src/hooks/use-auth.ts`: trocar o `invalidateQueries()` global por invalidação das chaves realmente afetadas por login/logout (`auth`, `my-purchases`, `profile`), mantendo limpeza total apenas no logout.

**Escritas em lote**
- `src/components/brand/SalaForm.tsx`: a gravação das perguntas geradas por IA faz um insert por pergunta dentro de um `for`. Passar para insert em lote das perguntas e depois das alternativas, acelerando bastante o salvamento.

## Fora de escopo

Nenhuma mudança visual, de fluxo ou de regra de negócio. Só carregamento, cache e tamanho de bundle.

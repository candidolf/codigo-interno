Plano para corrigir "Sua sessão expirou" no Comprar.

## O que esse erro realmente é
A mensagem "Sua sessão expirou" é uma tradução que a tela `comprar` faz quando o servidor responde com qualquer erro que contenha a palavra "Unauthorized". Ou seja, o Asaas nem chegou a ser chamado — o erro acontece antes, no momento em que a server function `createPurchase` valida quem é o usuário logado.

Como você confirmou que acontece mesmo logo após o login, descarto a hipótese de "token vencido". A real causa é que o token de autenticação não está chegando ao servidor nessa chamada específica.

## Sobre preview vs publicado
O Asaas é chamado pelo seu servidor (não pelo navegador), então tanto faz preview ou publicado para o Asaas em si. A diferença entre os dois ambientes só importaria se tivesse variável de ambiente faltando — mas, como o erro ocorre antes do Asaas, isso não é o problema agora.

## O que vou fazer
Sem mexer no header (`BrandHeader`, `useAuth`) e sem mexer no fluxo de login.

1. Instrumentar diagnóstico no servidor
   - Em `src/integrations/supabase/auth-middleware.ts`: logar (server-side) quando o cabeçalho `Authorization` chega vazio ou inválido, para confirmar se o token está sendo anexado pelo client.
   - Esse log é temporário e me permite ler `server-function-logs` para entender o que está acontecendo.

2. Garantir que o token é anexado em todas as chamadas
   - Em `src/integrations/supabase/auth-attacher.ts`: revalidar a forma como o `Authorization: Bearer ...` é anexado e garantir que se aplica a POST/GET igualmente. Se necessário, trocar `getSession()` por uma leitura que aguarda o token estar pronto (evita o caso em que o middleware roda antes da sessão carregar do `localStorage`).
   - Em `src/routes/_authenticated/comprar.tsx`: antes de chamar `createPurchase`, garantir explicitamente que a sessão está carregada (`getSession()` + `refreshSession()` se necessário). Sem `window.location.href` extra; mantém o fluxo atual.

3. Tornar a mensagem de erro mais honesta
   - Substituir o `Unauthorized: sessão expirada...` por uma mensagem que diferencie:
     - Sessão de fato expirada → "Sessão expirada, faça login novamente"
     - Token não foi enviado → "Falha ao autenticar a requisição. Recarregue e tente novamente"
   - Isso ajuda a entender se for um caso residual.

4. Validação
   - Logar como master, abrir `/comprar`, preencher CPF e tentar pagar.
   - Verificar nos logs do servidor se o `Authorization` chegou.
   - Se chegou e foi rejeitado pelo Supabase, partir para checar `EXT_SUPABASE_URL`/keys do ambiente.
   - Se não chegou, o ajuste no `auth-attacher` resolve.

## Fora do escopo (não vou tocar)
- `src/components/brand/BrandHeader.tsx`
- `src/hooks/use-auth.ts`
- `src/routes/login.tsx`
- `src/routes/__root.tsx` (no que diz respeito ao listener de auth)
Plano para corrigir o header após login:

1. Separar o problema real do aviso do console
   - Os erros `Failed to execute 'postMessage'... target origin` vêm do ambiente/preview do Lovable tentando conversar com domínios diferentes (`lovable.dev`, `gptengineer.app`, etc.).
   - Eles não são a causa direta do header offline, porque também aparecem fora do fluxo de autenticação.

2. Corrigir a fonte de autenticação do header
   - Hoje o `BrandHeader` depende do `useAuth()`, e o `useAuth()` depende de uma server function (`getCurrentUser`).
   - Quando o login acontece, a sessão já existe no navegador, mas a query `['auth','me']` pode continuar com `null` em cache ou refazer antes do token estar pronto.
   - Vou ajustar `src/hooks/use-auth.ts` para usar a sessão do navegador como fonte imediata de verdade (`supabase.auth.getSession()` + `onAuthStateChange`) e usar `getCurrentUser` apenas para enriquecer com roles/admin.
   - Resultado: se existe sessão local, o header já renderiza como logado, mesmo que a busca de roles ainda esteja carregando.

3. Corrigir a navegação pós-login
   - Em `src/routes/login.tsx`, depois de `signInWithPassword`, vou atualizar/invalidate a query de auth antes de navegar para o dashboard.
   - Isso evita que o dashboard abra com o cache antigo de usuário offline.

4. Manter compatibilidade com admin/master
   - O header continua usando `isAdmin` quando a role chegar do servidor.
   - Enquanto a role carrega, o usuário logado não verá mais o menu offline; verá o header autenticado padrão.

5. Validação
   - Conferir que `/dashboard` depois do login mostra avatar/dropdown/Sair.
   - Conferir que logout volta para `/login` e o header volta ao modo offline.
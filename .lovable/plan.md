## Diagnóstico

O comportamento atual tem dois pontos frágeis:

1. O login sempre faz `navigate({ to: "/dashboard" })`, então mesmo uma conta admin é enviada primeiro para o dashboard.
2. A validação de admin ainda depende de consulta client-side em `user_roles`. No snapshot de rede do preview, essa consulta retornou `[]` para o usuário logado (`006cfa39-1392-4507-a393-15ada79b848b`), então o app não consegue confirmar admin de forma confiável no navegador.

## Plano de correção definitiva

1. **Criar uma função central de sessão/rota pós-login**
   - Adicionar uma server function autenticada, por exemplo `getSessionHome`, que recebe o token do usuário via middleware já existente.
   - No servidor, validar o usuário e consultar `user_roles` com acesso seguro do backend.
   - Retornar a rota correta:
     - `admin` → `/admin`
     - `master` ou `user` → `/dashboard`
     - sem papel → `/dashboard` com fallback controlado.

2. **Corrigir o login**
   - Depois de `signInWithPassword`, chamar essa função de sessão/rota.
   - Redirecionar admin diretamente para `/admin`, não para `/dashboard`.
   - Manter suporte a `redirect` na URL, mas só usar se for compatível com o papel do usuário; por exemplo, admin pode ir para `/admin/...`, usuário comum não.
   - Mostrar erro claro se a sessão entrou mas a validação de rota falhou, sem travar.

3. **Trocar o AdminGate para validação server-side**
   - Remover a decisão de admin baseada apenas em `supabase.from("user_roles")` no cliente.
   - Usar a mesma server function para confirmar admin.
   - Se for admin, renderiza o admin; se não for, mostra “Acesso restrito” ou manda para `/dashboard` sem cair no login.
   - Evitar cache positivo amplo em `sessionStorage` que possa mascarar mudança de papel; se mantiver cache, será por usuário e curto/só como otimização.

4. **Reutilizar o mesmo papel no menu**
   - Ajustar `useCurrentRole` para poder usar a validação central ou pelo menos não contradizer o AdminGate.
   - Assim o menu mostra links de admin apenas quando o backend confirmou admin.

5. **Blindar o dashboard contra admin indevido**
   - Se um admin cair em `/dashboard` por link manual ou fallback, redirecionar para `/admin` após confirmar o papel.
   - Isso elimina o loop “login → dashboard” para admins.

6. **Verificação no preview**
   - Testar fluxo: logout/login → admin deve abrir `/admin`.
   - Abrir `/admin/vendedores` e `/admin/salas` sem voltar para login.
   - Confirmar pelo Network que a checagem de role não retorna mais `[]` como fonte da decisão final.

## Observação importante

Se o banco realmente não tiver nenhum registro `admin` para o usuário logado, a correção de código vai passar a mostrar uma mensagem clara de “conta sem papel admin”, em vez de travar ou mandar para login. Nesse caso, será necessário inserir/ajustar o papel desse usuário no Supabase externo.
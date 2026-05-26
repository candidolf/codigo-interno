Plano para corrigir o fluxo:

1. Atualizar o login para, após autenticar, buscar o usuário/roles atualizados antes de navegar.
2. Se o usuário tiver role `admin`, redirecionar para `/admin`; caso contrário, manter `/dashboard` ou o `redirect` recebido.
3. Preservar exceção: se o admin tentou acessar uma URL específica via `redirect`, respeitar esse destino em vez de forçar `/admin`.
4. Ajustar também o login com Google para voltar com um `redirect` adequado, se necessário.
5. Validar o fluxo esperado: admin entra em `/admin`; usuário comum entra em `/dashboard`; acesso direto a `/admin` sem role admin volta para `/dashboard`.
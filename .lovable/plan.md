Na tela Admin > Usuários (`/admin/usuarios`), exibir o e-mail de cada usuário logo após o nome na tabela.

Alterações:
1. `src/routes/_authenticated/admin/usuarios.tsx`:
   - Incluir `email` no `select` da consulta ao Supabase (`profiles`).
   - Adicionar coluna "Email" no cabeçalho da tabela, imediatamente após "Nome".
   - Renderizar o valor `u.email` na linha de dados, também após o nome.
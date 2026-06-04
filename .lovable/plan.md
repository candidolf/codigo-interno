
## Objetivo

Implementar o fluxo completo de "Esqueci minha senha" usando Supabase Auth — sem dependências externas, sem novos secrets. Os e-mails usam o template padrão do Supabase (a customização visual com Lovable Emails fica fora de escopo até o usuário pedir).

## Fluxo

1. Usuário clica em "Esqueci minha senha" em `/login` → vai para `/recuperar-senha`.
2. Informa o e-mail → recebe link de recuperação do Supabase.
3. Link abre `/redefinir-senha` (já autenticado via token de recovery do Supabase).
4. Define nova senha → redireciona para `/dashboard`.

## Mudanças

### 1. `src/routes/recuperar-senha.tsx` (novo)

- Form com campo de e-mail (validação básica).
- Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${window.location.origin}/redefinir-senha })`.
- Mensagem genérica de sucesso ("Se o e-mail existir, enviamos um link...") — não revela se o e-mail está cadastrado.
- Link "Voltar para o login".
- `head()` com title/description próprios.

### 2. `src/routes/redefinir-senha.tsx` (novo)

- Detecta sessão de recovery: ao montar, escuta `supabase.auth.onAuthStateChange` para evento `PASSWORD_RECOVERY` e/ou valida `supabase.auth.getSession()`.
- Se não houver sessão de recovery válida, mostra alerta "Link inválido ou expirado" + botão para `/recuperar-senha`.
- Form com **nova senha** + **confirmar senha** (toggle mostrar/ocultar, igual `/login`).
- Validação: mínimo 8 caracteres, senhas iguais.
- Chama `supabase.auth.updateUser({ password })`.
- Sucesso → toast + `navigate({ to: "/dashboard" })`.
- Tratamento de erro via `translateAuthError`.

### 3. `src/routes/login.tsx`

- Adicionar `<Link to="/recuperar-senha">Esqueci minha senha</Link>` abaixo do campo de senha (alinhado à direita, estilo discreto).

### 4. `src/routes/convite.$token.tsx`

- O texto "Esqueci minha senha" já existe (linha 120) — transformar em `<Link to="/recuperar-senha">` se ainda não for.

### 5. `src/routes/__root.tsx` — sem mudanças necessárias

O listener global de `onAuthStateChange` já existente trata `PASSWORD_RECOVERY` como qualquer outra mudança de sessão (invalida queries). A página `/redefinir-senha` adiciona seu próprio handler local apenas para detectar o evento durante o mount.

## Configuração necessária no Supabase (informar ao usuário, sem código)

No Dashboard do novo Supabase:
- **Authentication → URL Configuration → Redirect URLs**: adicionar
  - `https://codigo-interno.lovable.app/redefinir-senha`
  - `https://id-preview--910449f5-acc5-4f98-825e-af298045f1a4.lovable.app/redefinir-senha`
  - `http://localhost:*/redefinir-senha` (para dev, se aplicável)
- **Authentication → Email Templates → Reset Password**: o template padrão já funciona; o link aponta para a URL acima.

Sem essa configuração, o link do e-mail é rejeitado pelo Supabase.

## Validação

1. `/login` → clicar em "Esqueci minha senha" → preenche e-mail → mensagem de sucesso.
2. Abrir e-mail recebido → clicar no link → cai em `/redefinir-senha` com sessão de recovery ativa.
3. Definir nova senha (com confirmação) → redirect para `/dashboard` logado.
4. Tentar abrir `/redefinir-senha` direto (sem token) → mostra "Link inválido ou expirado".
5. Login com a nova senha funciona.

## Fora de escopo

- Customização visual dos e-mails (Lovable Emails / templates React Email).
- 2FA, rate limiting próprio, expiração customizada de token.

## Objetivo

Manter o fluxo atual: o usuário só é criado quando aceita o convite e define uma senha. Corrigir apenas a UX da tela `/convite/:token` para o caso em que o e-mail informado pelo master já tem conta.

## Problema

Em `src/routes/convite.$token.tsx` hoje:
1. Tenta `supabase.auth.signUp({ email, password })`.
2. Se falha, tenta `signInWithPassword` com a MESMA senha.
3. Se o login também falha, exibe a mensagem do signUp: "Este e-mail já está cadastrado. Faça login." — sem caminho de ação para o convidado (foi o caso da tela enviada).

## Mudanças (somente frontend + 1 server fn de leitura)

Arquivo principal: `src/routes/convite.$token.tsx`

1. Novo estado `mode: "signup" | "login"` (default `"signup"`).
2. Ao carregar o convite, chamar nova server fn `checkInviteEmailStatus({ token })` que retorna `{ emailExists, email }`. Se `emailExists` → `mode = "login"`.
3. Renderização condicional:
   - **signup**: campos Nome, E-mail, Senha (≥6), botão "Aceitar e começar".
   - **login**: subtítulo "Você já tem uma conta. Informe sua senha para aceitar o convite." + E-mail readonly + campo Senha + botão "Entrar e aceitar convite" + link "Esqueci minha senha" → `/login?reset=1&email=...`.
4. `onSubmit`:
   - `signup`: `signUp` → se erro de e-mail existente, trocar para `mode = "login"` e mostrar aviso amigável (não tentar login com a senha do cadastro).
   - `login`: `signInWithPassword`. Erro → "Senha incorreta. Tente novamente ou recupere sua senha."
   - Em ambos os sucessos: `consumeInvite({ token })` e `navigate` para `/teste/$id/intro`.

Arquivo: `src/lib/invites.functions.ts`

5. Adicionar `checkInviteEmailStatus`:
   - Input: `{ token }` (não confia em e-mail vindo do cliente).
   - Lê o invite pelo token via admin, pega `testando_email`, verifica em `auth.users` (via `supabaseAdmin.auth.admin.listUsers` filtrado por e-mail) e retorna `{ emailExists, email }`.

## Sem alterações em

- Backend de criação/consume de invite, RLS, migrations.
- Fluxo do master criando o convite.
- Estrutura de auth/profiles.

## Resultado

- E-mail novo: cadastro normal → cria usuário → consome convite.
- E-mail existente: tela abre em modo login, pede a senha da conta, autentica, consome o convite e segue para o teste. Sem mensagem confusa sem caminho de ação.

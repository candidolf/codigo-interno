## Diagnóstico

Como o cadastro não pede confirmação de e-mail, o usuário já entra com sessão válida. O bug real está em `src/routes/login.tsx`:

```ts
try {
  const { error: err } = await supabase.auth.signInWithPassword(...);
  if (err) { setError(...); return; }
  await qc.invalidateQueries(...);
  let dest = search.redirect ?? "";
  if (!dest) {
    const { getCurrentUser } = await import("@/lib/auth.functions");
    const me = await getCurrentUser();   // ← pode lançar
    dest = me?.isAdmin ? "/admin" : "/dashboard";
  }
  navigate({ to: dest });
} finally { setLoading(false); }
```

Não há `catch`. Se `getCurrentUser()` lança (token ainda não anexado pelo `attachSupabaseAuth`, RLS em `user_roles`, etc.), o `throw` sobe, `navigate` nunca executa, `setLoading(false)` roda no `finally` e a UI fica como "nada aconteceu, sem erro" — exatamente o sintoma.

O mesmo problema, em menor grau, existe no `cadastro.tsx`: depois do `signUp` ele navega direto para `/dashboard`, mas se a sessão ainda não estiver hidratada o `_authenticated` empurra de volta para `/login`.

## Correções (somente frontend)

### 1. `src/routes/login.tsx`
- Remover a chamada a `getCurrentUser()` daqui. Decisão de destino fica simples:
  - se `search.redirect` existe → vai para ele;
  - senão → `/dashboard` (o próprio `/dashboard` ou guarda admin redireciona se for admin, ou adicionamos esse redirecionamento depois).
- Envolver tudo em `try / catch / finally` de verdade: no `catch`, `setError(translateAuthError(e.message ?? "Erro ao entrar"))`.
- Após `signInWithPassword`, aguardar `supabase.auth.getSession()` (rápido, local) antes de `navigate`, para garantir que a próxima rota já leia a sessão.

### 2. `src/routes/cadastro.tsx`
- Após `signUp` sem erro, checar `data.session`:
  - se existir → `navigate({ to: "/dashboard" })`;
  - se `null` (confirmação ligada) → mostrar mensagem "Enviamos um link de confirmação para seu e-mail" e não navegar.
- Adicionar `try / catch` em volta da chamada para capturar exceções inesperadas.

### 3. Redirecionamento admin
Para não perder o comportamento "admin vai pra /admin": adicionar um pequeno guard em `src/routes/_authenticated/dashboard.tsx` (ou no `_authenticated.tsx`) que, se `useAuth().isAdmin`, faz `navigate({ to: "/admin", replace: true })`. Isso tira essa lógica frágil do submit do login.

## Sem mudanças em

- Server functions, RLS, migrations, fluxo de convite.
- `auth-attacher`, `auth-middleware`, clients do Supabase.

## Resultado esperado

- Login com credenciais corretas → vai direto para `/dashboard` (ou `/admin` via redirect interno).
- Login com credenciais erradas → mostra erro traduzido.
- Qualquer exceção inesperada → mostra erro no `Alert` em vez de "nada acontece".
- Cadastro com confirmação desligada → entra direto no dashboard. Com confirmação ligada → mensagem clara, sem loop.

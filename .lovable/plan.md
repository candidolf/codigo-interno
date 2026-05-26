## Plano mínimo para deixar o admin funcional

Vou ajustar o fluxo de autenticação e o cadastro de vendedor sem mexer em layout nem criar funcionalidades extras.

### 1. Corrigir o redirect indevido para login
- Alterar o guard de `/_authenticated` para não depender de `getUser()` em toda navegação do admin.
- Usar sessão local já hidratada (`getSession`) com uma tentativa de recuperação antes de redirecionar.
- Redirecionar para `/login` somente quando realmente não existir sessão.

### 2. Tornar o guard do admin mais estável
- Remover cache negativo permanente de admin (`admin-role:uid = 0`), porque uma consulta momentaneamente vazia trava o usuário fora do admin.
- Cachear apenas confirmação positiva de admin, ou usar cache com validade curta.
- Se a sessão existir, nunca mandar direto para login dentro do admin; no máximo redirecionar para `/dashboard` quando ficar confirmado que o usuário não é admin.

### 3. Corrigir salvamento do vendedor
- Manter validação obrigatória de CPF.
- Normalizar dados antes de salvar: CPF/telefone mascarados, código em maiúsculo, comissão numérica válida.
- Garantir que erro de banco/RLS apareça em toast visível e que o botão não pareça “travado”.
- Após salvar, invalidar corretamente as queries de vendedores e voltar para `/admin/vendedores`.

### 4. Melhorar telas do admin contra falhas silenciosas
- Em Vendedores/lista e edição, mostrar erro real quando a consulta falhar.
- Evitar que telas vazias pareçam “sem ação” quando o problema for permissão, sessão ou banco.

### 5. Validação final
- Testar mentalmente o fluxo principal: abrir admin → novo vendedor → CPF inválido → CPF válido → salvar → voltar para lista sem cair no login.
- Conferir que os links do admin continuam usando as rotas existentes: `/admin`, `/admin/salas`, `/admin/vendedores`, `/admin/usuarios`, `/admin/comissoes`.

## Arquivos previstos
- `src/routes/_authenticated.tsx`
- `src/routes/_authenticated/admin.tsx`
- `src/components/brand/VendedorForm.tsx`
- `src/routes/_authenticated/admin/vendedores.index.tsx`
- `src/routes/_authenticated/admin/vendedores.$code.tsx`
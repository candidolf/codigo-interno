## Objetivo

No checkout (`/comprar`), validar que o **código do vendedor** existe na tabela `sellers` quando preenchido. Campo continua **opcional** — se vazio, segue normalmente.

## Mudanças

### 1. Nova server function: `validateSellerCode`
Arquivo: `src/lib/purchases.functions.ts`

- Recebe `{ code: string }`, retorna `{ valid: boolean, name?: string }`.
- Consulta `sellers` por `code` (uppercase), `active = true`.
- Usa `requireSupabaseAuth` (consistente com as outras funcs do arquivo).

### 2. Validação no servidor em `createPurchase`
Mesmo arquivo:
- Se `sellerCode` foi enviado e não-vazio, consultar `sellers` e abortar com mensagem clara ("Código de vendedor inválido") caso não exista ou esteja inativo.
- Normalizar para uppercase antes de gravar em `test_purchases.seller_code`.

### 3. Validação no cliente em `comprar.tsx`
- Adicionar estado `sellerStatus: "idle" | "checking" | "valid" | "invalid"` e `sellerName`.
- `onBlur` do input (e quando o campo for não-vazio antes do submit): chamar `validateSellerCode` via `useServerFn`, com debounce simples.
- Feedback inline abaixo do campo:
  - Vazio → nenhuma mensagem (mantém o texto "Se alguém indicou…").
  - Checando → "Verificando código…".
  - Válido → "Vendedor: {nome}" em verde.
  - Inválido → "Código de vendedor não encontrado" em vermelho.
- No `onSubmit`: se `sellerCode` preenchido e `sellerStatus !== "valid"`, bloquear envio com `setError("Código de vendedor inválido. Deixe em branco ou corrija.")`.
- Campo continua sem `required`.

## Fora de escopo
- Sem mudanças visuais no resto do form.
- Sem mudanças na lógica de pagamento Asaas.

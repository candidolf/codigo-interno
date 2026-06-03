# Correções Asaas + pré-preenchimento do checkout

## Diagnóstico do 401 ("não autorizado")

Conforme a doc oficial (`https://docs.asaas.com/docs/authentication-2.md`):

- A URL **correta** do sandbox é `https://api-sandbox.asaas.com/v3`. Hoje o código usa `https://sandbox.asaas.com/api/v3`, que é o endpoint legado/descontinuado e devolve 401.
- O header `User-Agent` passou a ser **obrigatório** para contas root criadas a partir de 11/06/2024 — sem ele a API também responde 401.
- As chaves de sandbox novas têm prefixo `$aact_hmlg_...`. Se a secret atual for de produção, retorna `invalid_environment`.

## 1. Ajustar o cliente Asaas (`src/lib/asaas.server.ts`)

- Trocar `BASE_URL` para `https://api-sandbox.asaas.com/v3`.
- Adicionar header `User-Agent: "codigo-interno-app"` em todas as chamadas.
- Melhorar o tratamento de erro: incluir `code` + `description` do primeiro erro do Asaas na mensagem lançada (hoje só pega `description`, mas alguns erros vêm só com `code` — útil para distinguir `invalid_environment`, `invalid_api_key`, etc.).
- Logar `console.error("[asaas]", status, body)` no caminho de erro para facilitar diagnóstico nos logs do worker.

## 2. Pré-preencher checkout com dados do master (`/comprar`)

- Estender `getMyProfile` (`src/lib/profile.functions.ts`) para retornar também `cpf_cnpj` e `asaas_customer_id` (já existem na tabela).
- Em `src/routes/_authenticated/comprar.tsx`:
  - Consumir `useAuth()` (já usa `getCurrentUser` via React Query) **ou** chamar `getMyProfile` via `useQuery` para obter `fullName`, `phone`, `cpfCnpj`.
  - Inicializar os states `fullName`, `phone`, `cpfCnpj` a partir do profile assim que ele carrega (via `useEffect` que só preenche se o campo ainda estiver vazio — não sobrescreve digitação do usuário).
  - Para cartão, default do `cardHolderName` (já cai em `fullName` no submit) e `cardHolderCpf` (já cai em `cpfCnpj`) — apenas garantir que os placeholders/UX refletem isso (campos opcionais quando iguais ao pagador).
- Vale tanto para "Para mim" quanto "Para outra pessoa" — em ambos os casos os dados do **pagador** são do master logado.

## 3. Validação manual após o deploy

1. Confirmar com o usuário que a secret `ASAAS_API_KEY` é uma chave de sandbox (`$aact_hmlg_...`). Se for de produção, gerar nova chave em **Integrações → Sandbox** e atualizar a secret.
2. Abrir `/comprar`: campos Nome, CPF/CNPJ e Telefone aparecem pré-preenchidos.
3. Pagar com PIX → tela `/pagamento/:id` mostra QR Code (sem 401).
4. Confirmar pagamento no painel sandbox → webhook → status `pago`.

## Arquivos afetados

- `src/lib/asaas.server.ts` — URL, User-Agent, mensagem de erro.
- `src/lib/profile.functions.ts` — retornar `cpf_cnpj`.
- `src/routes/_authenticated/comprar.tsx` — pré-preenchimento via query.

Nenhuma migration necessária (colunas `cpf_cnpj`, `phone`, `full_name` já existem em `profiles`).

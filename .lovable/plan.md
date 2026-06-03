## Objetivo

1. Remover a coleta de dados de cartão do nosso form. Cliente paga na página hospedada do Asaas (`invoiceUrl`), com PIX + cartão + boleto na mesma tela. Sai do escopo PCI-DSS SAQ D.
2. Separar credenciais por ambiente: usar **sandbox** agora (homologação) e deixar o código pronto para alternar automaticamente para **produção** quando publicarmos.

## Parte A — Asaas Checkout (redirect)

### Como funciona
1. `POST /payments` (já fazemos) retorna `invoiceUrl`.
2. Redirecionamos o cliente para essa URL.
3. Cliente escolhe método e paga na página hospedada do Asaas.
4. Webhook `PAYMENT_CONFIRMED` atualiza o status (já implementado).
5. Asaas redireciona o cliente de volta via `successUrl` configurado na cobrança.

### Mudanças de código

**`src/lib/asaas.server.ts`**
- `createPayment`: remover envio de `creditCard`, `creditCardHolderInfo`, `remoteIp`.
- Enviar sempre `billingType: "UNDEFINED"` (cliente escolhe na fatura).
- Adicionar `callback: { successUrl, autoRedirect: true }` apontando para `{origin}/pagamento/{purchaseId}`.

**`src/lib/purchases.functions.ts` — `createPurchase`**
- Remover do `inputValidator`: `method`, `cardNumber`, `cardCvv`, `cardExpiry`, `cardHolderName`, `cardHolderEmail`, `cardHolderCpf`, `cardHolderPostalCode`, `cardHolderAddressNumber`, `cardHolderPhone`.
- Manter: `recipient`, `fullName`, `cpfCnpj`, `phone`, `email` (quando "outra pessoa").
- Retornar `{ purchaseId, invoiceUrl }`.

**`src/routes/_authenticated/comprar.tsx`**
- Remover tabs PIX/Cartão/Boleto e todos os campos de cartão/endereço.
- Manter: destinatário, nome, CPF/CNPJ, telefone, email.
- Submit: `window.location.href = invoiceUrl`.
- Botão: "Ir para pagamento".
- Pré-preenchimento do master continua.

**`src/routes/_authenticated/pagamento.$id.tsx`**
- Vira tela de retorno/status pós-pagamento.
- Remover QR Code, copia-e-cola, link de boleto.
- Mostrar status + polling (já existe) + "Reabrir fatura" (usa `invoice_url` salvo) se ainda pendente.

**Webhook**: nenhuma mudança.

## Parte B — Sandbox agora, produção depois (sem mexer no código)

### Estratégia
- Usar **dois secrets separados** no Supabase: `ASAAS_API_KEY_SANDBOX` e `ASAAS_API_KEY_PROD` (este último já existe como `ASAAS_API_KEY` — vou renomear conceitualmente).
- Detectar ambiente em runtime via `process.env.NODE_ENV` (ou via host `request.headers.get('host')`).
- `asaas.server.ts` escolhe automaticamente:
  - Se ambiente = produção → `ASAAS_API_KEY_PROD` + `BASE_URL = https://api.asaas.com/v3`.
  - Senão → `ASAAS_API_KEY_SANDBOX` + `BASE_URL = https://api-sandbox.asaas.com/v3`.

### Mudanças
- **`src/lib/asaas.server.ts`**: adicionar função `getAsaasConfig()` que retorna `{ apiKey, baseUrl }` conforme o ambiente. Usar nos fetches.
- **Secrets**: criar `ASAAS_API_KEY_SANDBOX` (novo) e `ASAAS_API_KEY_PROD` (renomear/copiar do `ASAAS_API_KEY` atual). Manter `ASAAS_WEBHOOK_TOKEN` igual (Asaas permite o mesmo token nos dois ambientes; se preferir separar, criar `ASAAS_WEBHOOK_TOKEN_SANDBOX` / `_PROD` da mesma forma).

### Detecção de ambiente
Vou usar: `const isProd = process.env.NODE_ENV === 'production' && !host.includes('preview') && !host.includes('-dev.')`. Assim:
- Preview Lovable (`id-preview--*` / `*-dev.lovable.app`) → sandbox.
- Domínio publicado (`codigo-interno.lovable.app` e custom domain) → produção.

## Passo manual necessário
Você precisa fornecer a **chave de sandbox do Asaas** (começa com `$aact_hmlg_...`). Vou pedir via tool de secret na sequência.

## Fora de escopo
- Tokenização (Checkout Transparente).
- Remover colunas antigas do banco (`pix_qr_code`, `pix_copy_paste`, `boleto_url`) — preserva histórico.

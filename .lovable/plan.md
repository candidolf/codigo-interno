# Integração Asaas (Sandbox) — substituir Mercado Pago

Pagamento único de R$ 29,90 com PIX, cartão de crédito ou boleto via API do Asaas. Substitui completamente as referências a Mercado Pago.

## 1. Secrets (Supabase)

Adicionar via tool de secrets:
- `ASAAS_API_KEY` — chave de sandbox do Asaas
- `ASAAS_WEBHOOK_TOKEN` — token que o Asaas envia no header `asaas-access-token` do webhook (definido por nós no painel do Asaas)

URL base fixa no código: `https://sandbox.asaas.com/api/v3`.

## 2. Banco — migration `012_asaas_payments.sql`

Ajustar `public.payments` para o modelo Asaas (mantendo histórico):

```sql
alter table public.payments rename column mp_preference_id to asaas_customer_id;
alter table public.payments rename column mp_payment_id to asaas_payment_id;
alter table public.payments add column if not exists invoice_url text;
alter table public.payments add column if not exists pix_qr_code text;
alter table public.payments add column if not exists pix_copy_paste text;
alter table public.payments add column if not exists boleto_url text;
alter table public.payments add column if not exists due_date date;
```

Adicionar em `profiles` (para reuso do `customer` Asaas):
```sql
alter table public.profiles add column if not exists cpf_cnpj text;
alter table public.profiles add column if not exists asaas_customer_id text;
```

GRANTs já cobertos por migrations anteriores (mesma tabela).

## 3. Checkout (`/comprar`)

Adicionar no formulário:
- Campo **CPF/CNPJ** (com máscara dinâmica via `src/lib/masks.ts` e validação real de dígitos)
- Campo **Nome completo** (pré-preenchido com `profile.full_name`)
- Adicionar opção **Boleto** no `RadioGroup` (PIX | Cartão | Boleto)
- Quando cartão: campos cartão (número, validade, CVV, nome impresso, CPF do titular)
- Quando boleto: aviso "vencimento em 3 dias úteis"

Após pagar:
- **PIX** → tela com QR Code + copia-e-cola + polling do status a cada 4s
- **Cartão** → cobrança imediata; se aprovado, segue para `intro`/`destinatario`
- **Boleto** → tela com link/visualização do boleto + instruções

## 4. Server functions — `src/lib/purchases.functions.ts`

Reescrever `createPurchase` para:
1. Validar input ampliado (cpfCnpj, fullName, paymentMethod ∈ pix|card|boleto, dados cartão opcionais)
2. Criar/obter `customer` no Asaas (`POST /customers`), salvar `asaas_customer_id` no profile
3. Criar `payment` no Asaas (`POST /payments`) com `externalReference = purchase.id`
4. Para PIX: chamar `GET /payments/{id}/pixQrCode` e salvar QR
5. Para Cartão: enviar `creditCard` + `creditCardHolderInfo` no mesmo POST
6. Gravar linha em `public.payments` e atualizar `test_purchases.status`
7. Retornar `{ purchaseId, method, status, pixQrCode?, pixCopyPaste?, boletoUrl?, invoiceUrl? }`

Adicionar `getPaymentDetails(purchaseId)` para a tela de PIX/boleto fazer polling.

Remover totalmente a flag `MERCADO_PAGO_ACCESS_TOKEN` e o modo "simulado".

## 5. Webhook — `src/routes/api/public/asaas-webhook.ts`

Server route TanStack (não usaremos Edge Function — segue padrão moderno do projeto):
- Validar header `asaas-access-token` contra `process.env.ASAAS_WEBHOOK_TOKEN`
- Validar payload com Zod (`event`, `payment.id`, `payment.status`, `payment.externalReference`)
- Atualizar `public.payments.status` e mapear para `test_purchases.status`:
  - `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `pago`
  - `PAYMENT_OVERDUE` / `PAYMENT_REFUNDED` / `PAYMENT_DELETED` → `cancelado`
- Usar `supabaseAdmin` (service role)
- Responder 200 sempre que processado (Asaas reenvia em caso de erro)

URL pública estável para configurar no painel Asaas:
`https://project--910449f5-acc5-4f98-825e-af298045f1a4.lovable.app/api/public/asaas-webhook`

## 6. Limpeza Mercado Pago

- Remover `supabase/functions/ef_mp_webhook/`
- Remover referências a `MERCADO_PAGO_ACCESS_TOKEN`, `mpEnabled`, `simulated` (manter coluna `simulated` no banco por compatibilidade, mas sempre `false`)
- Remover texto "Mercado Pago ainda não ativo — pagamento simulado" do `/comprar`

## 7. Testes manuais

1. PIX sandbox → confirmar manualmente no painel Asaas → webhook → status `pago` → liberação do teste
2. Cartão sandbox (`5162306219378829`) → aprovação imediata
3. Boleto sandbox → confirmar manualmente → webhook

## Detalhes técnicos relevantes

- Asaas API auth: header `access_token: <ASAAS_API_KEY>` (não é Bearer)
- Endpoints: `POST /customers`, `POST /payments`, `GET /payments/{id}`, `GET /payments/{id}/pixQrCode`
- Valor enviado em **reais** (number): `value: 29.90`
- Máscara/validação CPF/CNPJ já requerida pelo project-knowledge — adicionar helpers em `src/lib/masks.ts` se faltar
- Tudo client-server via `createServerFn`; webhook via server route em `/api/public/*`

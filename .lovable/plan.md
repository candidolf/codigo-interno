
## Objetivo

1. Desligar **temporariamente** a integração com o Asaas. Ao clicar em "Ir para pagamento" em `/comprar`, simular pagamento aprovado e seguir o fluxo normal pós-pagamento.
2. Quando houver `seller_code` **válido**, calcular e persistir a **comissão do vendedor** no momento da compra (snapshot), garantindo cálculo correto mesmo se a `commission_rate` mudar depois.

## Escopo

Fluxo de criação de compra (`createPurchase`) + tela `/comprar`. Webhook, telas de pagamento e liberação de teste continuam funcionando. Tela admin de comissões passa a usar o valor persistido.

## Mudanças

### 1. Migration nova `013_purchase_commission.sql`

Adicionar à `public.test_purchases`:
- `commission_rate numeric(5,4)` — snapshot da taxa no momento da compra (null quando sem vendedor).
- `commission_cents integer` — valor calculado e congelado (null quando sem vendedor).

Atualizar `public.admin_monthly_commissions(month_start date)` para somar `coalesce(p.commission_cents, round(p.amount_cents * s.commission_rate))` — assim compras antigas seguem usando a rate atual e as novas usam o snapshot.

### 2. `src/lib/purchases.functions.ts` — `createPurchase`

**Bypass do Asaas (controlado por `ASAAS_BYPASS=true`, default ligado agora):**
- Pular `createCustomer` e `createPayment`.
- Inserir `test_purchases` com `status = "pago"`, `simulated = true`, `payment_method = "simulated"`.
- Inserir `payments` com `asaas_payment_id = "SIMULATED-<purchaseId>"`, `status = "CONFIRMED"`, `method = "SIMULATED"`, `invoice_url = null`.
- Retornar `{ purchaseId, asaasPaymentId, invoiceUrl: null }`.

**Comissão (vale para bypass e fluxo real):**
- Na validação do `sellerCodeNormalized`, além de checar `active`, **também ler `commission_rate`** do `sellers`.
- Calcular `commissionCents = Math.round(amount_cents * commission_rate)`.
- Gravar `commission_rate` e `commission_cents` no insert de `test_purchases`.
- Sem `seller_code`: ambos ficam `null`.

### 3. `src/routes/_authenticated/comprar.tsx` — `onSubmit`

Se `invoiceUrl` vier `null` (modo simulado), `navigate({ to: "/pagamento/$id", params: { id: res.purchaseId } })` em vez de `window.location.href`. A página `pagamento.$id.tsx` já detecta status pago via polling e segue o fluxo.

### 4. `src/routes/_authenticated/admin/comissoes.tsx`

Sem mudanças no front — a RPC já retorna `commission_cents` consolidado (agora usando o snapshot quando disponível).

## Como religar o Asaas depois

Remover/zerar a env `ASAAS_BYPASS`. Cálculo de comissão permanece (é independente do bypass).

## Validação

1. `/comprar` sem código → paga simulado, `commission_*` null, segue para intro do teste.
2. `/comprar` com código válido → `commission_rate` e `commission_cents` (= `amount_cents * rate`, arredondado) persistidos em `test_purchases`.
3. `/admin/comissoes` no mês corrente exibe vendedor com total = soma dos `commission_cents` das compras simuladas pagas.
4. Sem chamadas à API do Asaas nos logs.

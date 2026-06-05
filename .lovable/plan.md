## Reconciliação ativa do pagamento Asaas

Hoje a tela `/pagamento/$id` depende do webhook do Asaas para sair de "Aguardando pagamento". Em preview (sandbox) o webhook frequentemente não chega, e mesmo em produção pode atrasar — a tela fica travada mesmo após o pagamento ser concluído na aba do Asaas.

### Mudanças

**1. `src/lib/purchases.functions.ts` — `getPaymentDetails`**

Adicionar reconciliação ativa dentro do handler (executa a cada polling, 4s):

- Buscar o `payments` mais recente da compra (já feito) e capturar `asaas_payment_id`.
- Se `purchase.status === "aguardando_pagamento"` E `asaas_payment_id` existe E não começa com `SIMULATED-`:
  - `const asaas = await import("./asaas.server")`
  - `const cfg = asaas.getAsaasConfig(host)` (usar `getRequestHeader("host")` — mesma lógica do `createPurchase`, garante sandbox vs prod automaticamente)
  - `const remote = await asaas.getPayment(cfg, asaas_payment_id)` dentro de try/catch (erros só logam, não quebram polling)
  - Se `remote.status` ∈ {`CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH`}:
    - `UPDATE test_purchases SET status='pago', updated_at=now() WHERE id=...`
    - `UPDATE payments SET status=remote.status, raw=remote WHERE id=<payment.id>`
    - Recarregar `purchase` e `payment` para retornar o estado atualizado na mesma resposta (a tela já redireciona quando vê `pago`).
- Verificar antes se `asaas.server.ts` exporta `getPayment`; se não, adicionar função simples `GET /payments/{id}` reaproveitando o cliente HTTP existente.

**2. `src/routes/_authenticated/pagamento.$id.tsx` — botão "Já paguei, verificar agora"**

Pequeno botão secundário ao lado de "Abrir fatura", visível enquanto `!PAID.has(status)`:
- Ao clicar: `queryClient.invalidateQueries({ queryKey: ["payment", id] })` (força refetch imediato → dispara reconciliação no server) + estado local `checking` para mostrar spinner por ~1s.
- Toast informativo se continuar `aguardando_pagamento` após o refetch ("Pagamento ainda não confirmado pelo Asaas").

### Não muda

- Webhook `/api/public/asaas-webhook` (continua sendo o caminho rápido em prod).
- `createPurchase`, fluxo de checkout, UI da `comprar.tsx`.
- Banco, migrations, RLS, secrets.

### Verificação

1. Preview/sandbox: pagar na aba do Asaas → em até 4s a tela atual sai de "Aguardando" e redireciona para o teste.
2. Botão "Já paguei, verificar agora": confirma na hora sem esperar o ciclo de 4s.
3. Produção: webhook continua liberando em 1–2s; reconciliação serve como fallback transparente.

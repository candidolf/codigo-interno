
# Corrigir fluxo "Ir para pagamento": aba atual nunca vai para o Asaas

## Problema

Hoje em `src/routes/_authenticated/comprar.tsx`, ao clicar em **Ir para pagamento**:

```ts
const opened = window.open(res.invoiceUrl, "_blank", "noopener,noreferrer");
if (!opened) {
  window.location.href = res.invoiceUrl; // ← aba atual vai para o Asaas
  return;
}
navigate({ to: "/pagamento/$id", params: { id: res.purchaseId } });
```

Quando o navegador bloqueia a popup (comum em Chrome/Brave/Safari, principalmente em preview), `opened` vem `null` e o fallback **redireciona a aba atual para o Asaas**. Resultado percebido pelo usuário: "abre uma aba e a atual também vai pro Asaas". Em alguns navegadores, mesmo com popup permitida, o comportamento de `window.open` dentro de um `await` (após o `await buy(...)`) é tratado como não-iniciado-por-gesto-do-usuário e cai no mesmo caminho.

Comportamento desejado:
- Aba atual **sempre** navega para `/pagamento/$id` (tela de "aguardando pagamento" com spinner + polling/webhook).
- Asaas **sempre** abre em nova aba.
- Se a popup for bloqueada, mostrar na tela de pagamento um botão "Abrir fatura do Asaas" para o usuário abrir manualmente (gesto direto = nunca bloqueado).

## Mudanças

### 1. `src/routes/_authenticated/comprar.tsx`
- Remover o fallback `window.location.href = res.invoiceUrl`.
- Sempre `navigate({ to: "/pagamento/$id", params: { id: res.purchaseId } })` após criar a compra.
- Tentar abrir a fatura em nova aba **antes** de navegar; se `opened` for `null`, guardar `sessionStorage.setItem('purchase:<id>:invoiceUrl', res.invoiceUrl)` para a tela de pagamento oferecer o botão manual.
- Manter o `sessionStorage` já existente do destinatário.

### 2. `src/routes/_authenticated/pagamento.$id.tsx` (ajuste pequeno na UI)
- Ler `sessionStorage.getItem('purchase:<id>:invoiceUrl')` no mount. Se existir e o status ainda for `aguardando_pagamento`, mostrar um aviso discreto: "Não conseguimos abrir a aba do Asaas automaticamente" + botão **Abrir fatura** que faz `window.open(url, "_blank")` (clique direto do usuário → não é bloqueado).
- Quando o status virar `pago` / `em_andamento`, limpar o item do sessionStorage.
- Manter o spinner + mensagem "Aguardando confirmação do pagamento…" já existentes (sem mudanças no polling/webhook).

## Não muda

- Server function `createPurchase` e integração Asaas.
- Webhook `/api/public/asaas-webhook`.
- Banco de dados, migrations, secrets.
- `successUrl` (já corrigido na rodada anterior).

## Verificação

1. Clicar **Ir para pagamento** com popup permitida: aba atual vai para `/pagamento/<id>` mostrando spinner; nova aba abre no Asaas. ✅
2. Clicar com popup bloqueada: aba atual vai para `/pagamento/<id>` mostrando spinner **+ botão "Abrir fatura"**; nenhuma navegação da aba atual para o Asaas. ✅
3. Pagar no sandbox → webhook libera o teste → tela avança normalmente.

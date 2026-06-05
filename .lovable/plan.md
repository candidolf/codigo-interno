## Objetivo

Quando o usuário clicar em **"Ir para pagamento"** em `/comprar`, em vez de redirecionar a aba atual para o ASAAS (comportamento atual), vamos:

1. Abrir a fatura do ASAAS (`invoiceUrl`) em **uma nova aba**.
2. Manter a aba original do app e navegá-la para `/pagamento/$id`, que já faz polling do status e libera o teste automaticamente quando o webhook confirmar.

Isso preserva a sessão do usuário no nosso app, evita o problema do iframe bloqueado pelo ASAAS (X-Frame-Options: SAMEORIGIN) e dá uma experiência próxima à de um "checkout flutuante".

## Mudanças

### 1. `src/routes/_authenticated/comprar.tsx`

No bloco `if (res.invoiceUrl) { ... }` do `onSubmit`:

- Trocar `window.location.href = res.invoiceUrl` por:
  - `window.open(res.invoiceUrl, "_blank", "noopener,noreferrer")`
  - Em seguida, `navigate({ to: "/pagamento/$id", params: { id: res.purchaseId } })` para a aba atual já entrar na tela de aguardando pagamento.
- Se `window.open` retornar `null` (popup bloqueada pelo navegador — raro com nova aba, mas pode acontecer com bloqueadores agressivos), fazer fallback navegando a própria aba para `invoiceUrl`.

### 2. `src/routes/_authenticated/pagamento.$id.tsx`

Pequenos ajustes de UX, já que agora o usuário sempre cai aqui imediatamente:

- O bloco "Aguardando confirmação / Abrir fatura" já existe e funciona como reentrada caso o usuário feche a aba do ASAAS. Vou apenas ajustar o copy:
  - Título / texto explicando que a fatura foi aberta em outra aba.
  - Manter o botão **"Abrir fatura"** (com `target="_blank"`) para reabrir quando necessário.
- Nenhuma mudança na lógica de polling (`refetchInterval` 4s) nem no redirecionamento automático após `PAID`.

## Fora de escopo

- Não muda nenhuma server function, webhook, secret, schema, nem o cliente `asaas.server.ts`.
- Não altera o fluxo de "destinatário" (eu/outro) — o `sessionStorage` já persiste corretamente entre as abas.
- Não tenta embutir o ASAAS em iframe (o próprio ASAAS bloqueia via `X-Frame-Options: SAMEORIGIN` e CSP `frame-ancestors`).

## Detalhes técnicos

- `window.open(url, "_blank", "noopener,noreferrer")` cria nova aba (não popup) na maioria dos navegadores modernos quando chamado dentro de um handler de clique síncrono. Como o `onSubmit` é `async` e o `await buy(...)` ocorre antes do `window.open`, alguns navegadores podem tratar como popup. Mitigação: chamamos `window.open` imediatamente após o `await` resolver e, em caso de bloqueio (`opened == null`), caímos no fallback de mesma aba.
- A tela `/pagamento/$id` já trata o estado "pago" e roteia para `/teste/$id/intro` ou `/testes/$id/destinatario` automaticamente.
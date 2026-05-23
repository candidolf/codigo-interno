## Problema

Depois da compra simulada o app navega para `/comprar/retorno?purchase=...`, rota que **não existe** no `routeTree.gen.ts`. Resultado: 404 → guard de auth redireciona para `/login?redirect=/comprar/retorno...` (exatamente o que aparece no print).

A causa: em `src/routes/_authenticated/comprar.tsx` há um `else` fallback que navega para `/comprar/retorno` quando `res.simulated === false` e não há `initPoint`. Como o backend só marca `simulated: true` quando `MERCADO_PAGO_ACCESS_TOKEN` está vazio, qualquer outro cenário cai no fallback quebrado.

## Correção (apenas frontend, 1 arquivo)

Editar `src/routes/_authenticated/comprar.tsx → onSubmit`:

1. Remover o `else` que navega para `/comprar/retorno`.
2. Tratar como sucesso sempre que `res.simulated === true` **ou** `res.status === "pago"` **ou** `!res.initPoint` (ou seja: sem checkout externo, libera direto).
3. Nesse caso, aplicar a mesma lógica de destinatário já existente:
   - `destinatario === "eu"` → `assignSelf` + `/teste/$id/intro`
   - `destinatario === "outro"` → `/testes/$id/destinatario`
4. Só redirecionar para `window.location.href = res.initPoint` quando `initPoint` existir de fato (Mercado Pago real).

Sem alteração de backend, migration, ou outras rotas.

## Detalhe técnico

```ts
const goAfterPaid = async (purchaseId: string) => {
  if (destinatario === "eu") {
    await assign({ data: { purchaseId } });
    navigate({ to: "/teste/$id/intro", params: { id: purchaseId } });
  } else {
    navigate({ to: "/testes/$id/destinatario", params: { id: purchaseId } });
  }
};

const res = await buy({ data: { ... } });
if (res.initPoint) {
  window.location.href = res.initPoint;
  return;
}
if (res.simulated) {
  toast.success("Pagamento simulado aprovado", { description: "..." });
}
await goAfterPaid(res.purchaseId);
```

Posso seguir?
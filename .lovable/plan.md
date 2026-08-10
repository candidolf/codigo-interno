# Desligar pagamento temporariamente (modo simulado)

Objetivo: ao comprar o teste, nada é enviado ao Asaas e a compra já nasce como **paga**, liberando o teste na hora.

## O que muda

1. `src/lib/purchases.functions.ts`
   - Inverter o padrão do modo simulado: passa a ser **ligado por padrão**, sem depender de secret. Só volta ao Asaas real quando `ASAAS_BYPASS=false` estiver definido explicitamente.
   - O fluxo simulado já existente é reaproveitado: grava a compra com `status: "pago"`, `simulated: true`, método `simulated`, e um registro em `payments` com status `CONFIRMED` — sem chamada ao Asaas, sem link de fatura.
   - `getPaymentDetails`: manter a reconciliação com o Asaas apenas para pagamentos reais antigos (já é ignorada quando o id começa com `SIMULATED-`).

2. `src/routes/_authenticated/comprar.tsx`
   - Como não há `invoiceUrl`, o usuário segue direto para `/pagamento/$id`, que detecta "pago" e libera o teste (comportamento já implementado).
   - Ajustar os textos do resumo/aviso para indicar que o pagamento está em **modo de teste** (sem cobrança real), em vez de "processado pelo Asaas".

3. `src/routes/_authenticated/pagamento.$id.tsx`
   - Quando a compra for simulada, não exibir botões de "Abrir fatura"/"Já paguei", apenas a confirmação e o avanço para o teste.

## Observações

- Nada é removido da integração Asaas: o código real continua no lugar e volta a valer definindo `ASAAS_BYPASS=false` nas variáveis de ambiente.
- O webhook público do Asaas continua funcionando normalmente para compras reais já existentes.

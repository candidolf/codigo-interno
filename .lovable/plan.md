# Forçar successUrl com o domínio cadastrado no Asaas

## Problema

A conta Asaas exige que a `successUrl` seja do **mesmo domínio cadastrado** em "Configurações da conta → Informações". Você já cadastrou `https://codigo-interno.lovable.app/`. Hoje o código monta `successUrl` a partir de `${origin}/pagamento/${id}`, e o `origin` vem do header da requisição — quando você compra pelo preview, vira `id-preview--...lovable.app`, que **não está cadastrado** e o Asaas recusa.

## Solução

Sempre enviar `successUrl` no domínio publicado, ignorando o `origin` da requisição.

### Regra
- Base sempre = `https://codigo-interno.lovable.app` (domínio cadastrado no Asaas).
- Opcional: secret `ASAAS_CALLBACK_BASE_URL` sobrescreve a base, caso futuramente queira trocar para outro domínio cadastrado sem deploy.
- `successUrl` final = `${base}/pagamento/${purchase.id}`.

O usuário continua sendo redirecionado para o app publicado após pagar — mesmo que tenha iniciado a compra pelo preview (a aba do Asaas abre na URL pública e o webhook libera o teste para qualquer ambiente, já que o `purchase.id` é o mesmo).

## Mudanças

- `src/lib/purchases.functions.ts`
  - Remover o uso de `origin` no cálculo do `successUrl`.
  - Calcular `base` na ordem: `process.env.ASAAS_CALLBACK_BASE_URL` → `"https://codigo-interno.lovable.app"`.
  - Garantir que `base` não termina com `/` antes de concatenar.
  - Log no servidor com a URL final (sem dados sensíveis) para diagnóstico.

## Verificação

1. Comprar pelo preview: a fatura do Asaas deve abrir sem erro 400.
2. Pagar no sandbox: o redirect leva para `https://codigo-interno.lovable.app/pagamento/<id>`.
3. Webhook em `/api/public/asaas-webhook` libera o teste.

Nenhuma migration, nenhum novo secret obrigatório, nenhuma mudança de UI.

# Vercel: mesmo Supabase, mas servidor sem variáveis

## O que os dados mostram

A requisição que você capturou no domínio publicado na Vercel vai para:

`https://ddzrinyvmrkqjgezggvr.supabase.co` com a chave `sb_publishable_sJnR5P_AJZBAEWjPB9bHgw_RQOR3hQ-`

Isso é **exatamente** o mesmo projeto e a mesma chave do `.env` deste repositório (arquivo versionado no git, não ignorado). Ou seja: o front-end na Vercel **já está no Supabase correto**, não em um antigo.

Motivo de funcionar sem nada cadastrado na Vercel: o `.env` está commitado, e o Vite lê `VITE_*` dele no momento do build.

## O problema real (provável)

O que está inconsistente não é o banco do front-end, e sim o **lado servidor**. O código do servidor lê:

- `EXT_SUPABASE_URL` / `SUPABASE_URL` (com fallback para `VITE_SUPABASE_URL`)
- `EXT_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`
- `EXT_SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ASAAS_API_KEY_SANDBOX`, `ASAAS_API_KEY_PROD`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_BYPASS`
- `APP_BASE_URL`, `ASAAS_CALLBACK_BASE_URL`

Na Vercel nenhuma dessas existe. Consequência: server functions (perfil, compras, convites, admin, IA, webhook Asaas) falham ou caem no fallback do `.env`, sem service role — o app "parece" apontar para outro ambiente porque partes dos dados simplesmente não carregam.

Além disso, o projeto está configurado para Cloudflare Workers (`wrangler.jsonc` + plugin cloudflare no build). O deploy na Vercel não é o alvo suportado do template, então o runtime do servidor pode não funcionar como no preview/publicado do Lovable.

## Passos propostos

1. Confirmar em campo: abrir o site da Vercel e verificar se as chamadas `/_serverFn/...` retornam 500/erro (é o sintoma esperado). Sem isso, qualquer ajuste é chute.
2. Cadastrar as variáveis de ambiente no projeto da Vercel (Settings → Environment Variables), Production + Preview:
   - `EXT_SUPABASE_URL`, `EXT_SUPABASE_PUBLISHABLE_KEY`, `EXT_SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `APP_BASE_URL=https://metodocodigointerno.com.br`
   - `ASAAS_*` conforme o ambiente desejado
   Depois, redeploy (build cache limpo).
3. Higiene de segredos no repositório: parar de versionar o `.env` (adicionar ao `.gitignore` e manter as chaves só como variáveis de ambiente). A chave publishable não é sigilosa, mas o padrão evita que uma chave sensível vá para o git no futuro.
4. Definir onde o app vive de verdade: se a Vercel for o destino oficial, ajusto o build/adaptador para lá; se o oficial é o domínio publicado pelo Lovable, aponto o `metodocodigointerno.com.br` para o projeto do Lovable e removo o deploy paralelo, que hoje duplica ambientes e confunde diagnóstico.

## Decisão necessária

Antes de mexer em build/adaptador, preciso saber se a Vercel é o destino definitivo ou se foi um teste. Os passos 1–3 valem em qualquer caso.

## Objetivo
Corrigir o erro **Unauthorized** ao clicar em **Ir para pagamento**, para que a compra crie a fatura no Asaas e abra o checkout hospedado com segurança.

## Diagnóstico provável
O erro aparece antes de abrir o checkout porque a chamada protegida `createPurchase` está chegando ao servidor sem autenticação válida. O projeto já tem um middleware para anexar o token do usuário, mas o middleware de autenticação do servidor ainda depende de `supabase.auth.getUser()` via cliente SSR; em alguns contextos de preview/iframe isso pode não reconhecer corretamente o bearer enviado e retorna `Unauthorized`.

## Plano de correção
1. **Fortalecer a autenticação dos server functions**
   - Ajustar `requireSupabaseAuth` para ler explicitamente o header `Authorization: Bearer ...` recebido na requisição.
   - Validar o usuário com esse token quando ele existir.
   - Manter fallback por cookies para não quebrar outros fluxos.

2. **Garantir cliente de banco autenticado corretamente**
   - Continuar usando o cliente atual com RLS, mas garantir que o token do usuário seja aplicado nas queries feitas por `createPurchase`.
   - Preservar a separação segura: chave de serviço somente no servidor/admin, nunca no cliente.

3. **Melhorar a mensagem de erro no checkout**
   - Trocar o texto genérico `Unauthorized` por uma mensagem amigável: pedir para entrar novamente se a sessão expirou.
   - Não expor detalhes técnicos do backend na tela.

4. **Verificar o próximo possível bloqueio do Asaas**
   - Depois da autenticação corrigida, se o Asaas responder erro de credencial, o ajuste esperado será cadastrar a secret `ASAAS_API_KEY_SANDBOX` correta.
   - O código já está preparado para usar sandbox no preview e produção no domínio publicado.

## Resultado esperado
Ao clicar em **Ir para pagamento**, a sessão será reconhecida, a compra será criada, a fatura será gerada no Asaas e o usuário será redirecionado para a página segura do Asaas.
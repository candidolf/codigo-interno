## Plano

1. **Separar o destino do logo e do menu “Início”**
   - Manter o logo sempre apontando para `/`, como combinado, para voltar à landing.
   - Garantir que o item textual **“Início”** nunca use `/` quando houver sessão ativa.

2. **Corrigir a causa provável do erro**
   - O header começa com `role = "guest"` enquanto ainda está carregando a sessão/papel do usuário.
   - Nesse intervalo, o menu renderiza o **“Início” de visitante**, que aponta para `/`.
   - Vou ajustar o `BrandHeader` para respeitar o `loading` do `useCurrentRole()` e não renderizar o menu de visitante enquanto o papel real ainda está sendo carregado.

3. **Adicionar fallback seguro para usuário logado sem role carregada**
   - Se houver sessão ativa, mas a role ainda não estiver disponível, o “Início” deve apontar para a área interna padrão, não para a landing.
   - `master` e `user`: `/dashboard`
   - `admin`: `/admin`
   - Visitante real: `/`

4. **Validar o comportamento esperado**
   - Usuário logado clicando em **“Início”**: vai para a home interna do perfil.
   - Usuário clicando no **logo**: vai para `/` landing.
   - Usuário deslogado clicando em **“Início”**: vai para `/` landing.
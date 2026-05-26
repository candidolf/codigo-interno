## Diagnóstico

O problema principal não parece ser o F12 da tela de login. Os avisos `postMessage` vêm do ambiente de preview/Lovable Script e não do código da aplicação. O aviso de autocomplete também é apenas recomendação do navegador.

O travamento ao salvar vendedor tem duas causas prováveis no código atual:

1. `useCurrentRole` chama consulta ao banco diretamente dentro do callback de `onAuthStateChange`. A própria documentação do Supabase alerta que isso pode causar deadlock/travamento quando o callback executa APIs assíncronas do Supabase.
2. O admin está sendo validado pelo cliente consultando `user_roles`. No snapshot de rede, essa consulta retornou `[]` para o usuário atual, então o app pode interpretar momentaneamente como “não admin”, redirecionar para `/dashboard`, e o dashboard chama server functions protegidas. Se a sessão ainda não estiver totalmente pronta, volta para `/login`.

## Plano de correção definitivo

1. **Corrigir o hook de papel do usuário**
   - Remover qualquer consulta `supabase.from(...)` de dentro do `onAuthStateChange`.
   - O callback passará a apenas atualizar a sessão/usuário em estado local.
   - A busca de `user_roles` ficará em um `useEffect` separado, disparado depois que o usuário estiver definido.
   - Isso elimina a causa clássica de congelamento do Supabase JS.

2. **Padronizar guarda de admin sem derrubar para login**
   - Ajustar `_authenticated/admin.tsx` para não depender de consulta frágil no cliente em toda navegação.
   - Manter a sessão como requisito no `_authenticated`, mas no admin evitar redirecionamentos agressivos quando a consulta de role falhar ou vier temporariamente vazia.
   - Se a consulta confirmar que o usuário não é admin, redireciona para `/dashboard`; se houver falha/incerteza, deixa a tela mostrar erro controlado em vez de travar/deslogar.

3. **Blindar o formulário de vendedor**
   - Validar nome, CPF, comissão e código antes de chamar o banco.
   - Gerar código único com mais segurança no cadastro novo para reduzir erro de `duplicate key`.
   - Enviar CPF normalizado ou mascarado de forma consistente.
   - Trocar `insert(payload)` por `insert(payload).select('id, code').single()` para capturar erro real e confirmar que criou.
   - Exibir `toast` claro para erro de permissão, código duplicado, CPF inválido e falha genérica.
   - Impedir duplo clique enquanto `save.isPending`.

4. **Separar operações admin sensíveis do cliente, se necessário**
   - Se as políticas atuais continuarem retornando `[]` para `user_roles` ou negando `sellers.insert`, criar server functions admin usando service role no servidor, validando admin com `has_role`/`user_roles` antes de inserir/editar/excluir.
   - Isso remove a dependência do RLS do navegador para operações administrativas e deixa o fluxo padrão de mercado: cliente chama uma função autenticada, servidor valida permissão e grava.

5. **Melhorar erros nas telas admin**
   - Lista de vendedores, edição e usuários devem mostrar erro visível em tela, não estado vazio.
   - Dashboard admin deve tratar erro de `user_roles`/`test_purchases` sem quebrar navegação.

6. **Verificação final**
   - Reproduzir fluxo: login → admin → vendedores → novo vendedor → CPF inválido → CPF válido → salvar → voltar para lista.
   - Confirmar que não há redirect inesperado para `/login` e que mensagens aparecem.

## Observação importante

Os erros do screenshot no F12 são do container de preview e não explicam o cadastro não criar vendedor. Vou focar a correção no travamento real: auth listener, guarda admin, permissões e fluxo de salvamento.
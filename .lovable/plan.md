## Plano

1. **Substituir o logo do header pelo asset oficial sem edição**
   - Copiar `user-uploads://Logo_CodigoINterno-2.png` para `src/assets/logo-full.png` (sem nenhum processamento — já tem fundo transparente).
   - Atualizar `BrandHeader.tsx` para usar essa imagem como logo único (logo + texto embutidos), removendo o `<span>"Código Interno"</span>` ao lado, já que o texto já faz parte do asset.
   - Ajustar a altura para caber no header (ex.: `h-9` mantendo proporção).
   - Remover o import antigo `logo-mark` se não for mais usado em outros lugares; manter no footer da landing usando o mesmo `logo-full`.

2. **Tela de login (`src/routes/login.tsx`)**
   - Linha 14: trocar "Bem-vindo de volta" por "Bem vindo".
   - Linha 15: trocar "Entre para continuar sua jornada." por "Entre com seu login".

## Escopo
Apenas troca de asset do logo e dois textos da página de login. Sem mudanças em fluxos ou outras telas.
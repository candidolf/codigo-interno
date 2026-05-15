# Adoção do logo oficial "Código Interno"

Substituir o logo gerado e o nome "PsychGame AI" pelo branding oficial em toda a plataforma.

## Mudanças

1. **Asset do logo**
   - Copiar `user-uploads://Logo_CodigoINterno.png` → `src/assets/logo.png` (sobrescrevendo o atual). Como o logo já tem o texto "CÓDIGO INTERNO" embutido, ele funciona sozinho em tamanhos médios/grandes.
   - Criar também uma variante só do ícone (rosto + círculo, sem o texto) gerada via `imagegen--edit_image` cortando/removendo o texto, salva como `src/assets/logo-mark.png`, para uso em espaços apertados (header, favicon, cantos).

2. **`BrandHeader`**
   - Usar `logo-mark.png` (apenas o ícone, ~36px) + texto "Código Interno" ao lado em fonte display, conforme sugestão do usuário.
   - Em telas largas: ícone + "Código Interno" com gradiente da marca no "Interno".
   - Em telas estreitas: apenas o ícone.

3. **Renomear "PsychGame AI" → "Código Interno"** em todos os textos visíveis:
   - Landing (hero, footer, resumo do checkout "1 Teste Código Interno")
   - Meta tags em `__root.tsx` (title, description, og:title, og:description)
   - Qualquer copy auxiliar que cite o nome anterior

4. **Identidade visual**
   - Manter a paleta atual (azul → roxo → laranja) — já está alinhada com o gradiente do logo oficial.
   - Manter o fundo dark navy, que combina com o fundo escuro do logo.

## Escopo
- Apenas substituição de logo e renomeação de marca. Nenhuma alteração de fluxos, rotas ou componentes funcionais.

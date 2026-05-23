## Diagnóstico

Eu interpretei errado da última vez: mudei só o destino do **logo**. O usuário quer um item de menu **"Início"** visível no header para qualquer role logado, levando à home do role. Hoje só o nav `guest` tem esse item; `master`, `user` e `admin` não têm.

## Mudanças

Em `src/components/brand/BrandHeader.tsx`:

### 1. Item "Início" no nav de cada role logado
Prefixar cada nav com um item "Início" apontando para `homeByRole[role]`:
- `master` → "Início" → `/dashboard` + (Meus testes, Relatórios, Comprar teste)
- `user` → "Início" → `/dashboard` + (Meu teste)
- `admin` → "Início" → `/admin` + (Salas, Usuários, Comissões) — remove "Painel" (era a mesma rota que "Início")

No master, "Início" (/dashboard) e "Meus testes" (/dashboard) apontam para a mesma rota; mantenho ambos por enquanto (semanticamente distintos).

### 2. Logo sempre vai para a landing `/`
Reverter a mudança anterior: o `<Link>` do logo volta a ser `to="/"` para todos os roles. Clicar no logo sempre leva para a landing pública, independente de estar logado.

Assim:
- **Logo** → sempre `/` (landing).
- **"Início" no nav** → home do role (dashboard / admin).

## Arquivo tocado
- `src/components/brand/BrandHeader.tsx` (objeto `navByRole` + reverter `to` do logo; `homeByRole` continua sendo usado só para gerar o item "Início").

Posso seguir?
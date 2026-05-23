## Mudanças

### 1. Logo / "Início" do header leva à home do role
Em `src/components/brand/BrandHeader.tsx`, hoje o `<Link to="/">` do logo manda todo mundo para a landing pública. Para usuário logado deve ir para a home correspondente:
- `master` → `/dashboard`
- `user` → `/dashboard`
- `admin` → `/admin`
- `guest` → `/`

Implementação: calcular `homeByRole[role]` e usar no `to` do logo. Sem novo item no nav.

### 2. Botão "Voltar" na tela de salas
Em `src/routes/teste.$id.salas.tsx`, adicionar acima do título um link padrão:
```
← Voltar
```
Apontando para `/dashboard` (home do master, de onde a jornada do teste começa). Estilo igual ao já usado em `teste.$id.sala.$slug.tsx` (`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground`).

## Arquivos tocados
- `src/components/brand/BrandHeader.tsx`
- `src/routes/teste.$id.salas.tsx`

Posso seguir?
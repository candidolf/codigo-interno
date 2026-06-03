## Objetivo

Substituir, **somente quando o usuário está logado**, o bloco atual "nome + email + botão Sair" por um padrão de mercado: avatar circular com dropdown contendo informações do usuário e ações (Perfil, Sair). Manter o header de visitante (guest) intacto.

## Estado atual

`src/components/brand/BrandHeader.tsx` hoje mostra, à direita:
- Nome + email empilhados (escondido em mobile)
- Botão "Sair" sempre visível

Sem avatar, sem menu, e a navegação fica oculta no mobile (`hidden md:flex`) sem alternativa hambúrguer.

## Mudanças (apenas em `BrandHeader.tsx`)

### 1. Avatar + dropdown do usuário (desktop e mobile)
Usando `@/components/ui/avatar` + `@/components/ui/dropdown-menu` (ambos já existem).

- Trigger: `<Avatar>` circular (40px) com `AvatarFallback` mostrando as iniciais derivadas de `displayName` (ex: "Lucas Lima" → "LL"); cursor pointer; ring sutil no hover.
- Conteúdo do dropdown (alinhado à direita):
  - Cabeçalho não-clicável: nome em negrito + email em `text-muted-foreground` + badge pequeno com o papel ("Master" / "Admin").
  - Separator.
  - Item "Meu perfil" → navega para `/perfil` (rota já existe? confirmar — se não existir, deixar item desabilitado/oculto por ora; o foco do plano é o padrão visual + Sair).
  - Item "Sair" com ícone `LogOut` (lucide-react) e cor destrutiva sutil → chama `signOut()` + `navigate('/login')`.

### 2. Menu mobile (hambúrguer)
Quando `role !== "guest"` e em telas `<md`, mostrar um botão com ícone `Menu` (lucide) que abre um `Sheet` lateral (já disponível) listando os mesmos `items` de navegação por papel. O avatar/dropdown permanece visível ao lado do hambúrguer.

### 3. Guest permanece igual
Visitante continua vendo o CTA "Criar conta". Sem avatar nem dropdown.

## Detalhes visuais

- Iniciais: até 2 letras, maiúsculas, fonte display.
- Fallback do avatar: `bg-gradient-brand text-white` para casar com a identidade.
- Dropdown: largura ~240px, borda glass (`border border-border/60 bg-popover/95 backdrop-blur`), respeita tokens semânticos.
- Sem mexer no logo, sem mexer na navegação inline desktop, sem mexer no header guest.

## Itens em aberto (responder antes de implementar se quiser)

- Existe rota `/perfil`? Se não, devo (a) ocultar o item, (b) criar uma rota stub, ou (c) apontar para outra existente (ex: `/dashboard`)?
- Quer também um item "Configurações" no dropdown agora, ou só "Meu perfil" + "Sair"?

Se preferir, sigo com: **somente "Sair"** no dropdown + cabeçalho com nome/email/papel, e adicionamos "Meu perfil"/"Configurações" depois.

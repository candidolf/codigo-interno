## 1. Cadastro: data de nascimento + validação de maioridade

Em `src/routes/cadastro.tsx`:

- Substituir o campo "Idade" por "Data de nascimento" com máscara `DD/MM/AAAA` (input controlado, só dígitos, insere `/` após posições 2 e 4, `inputMode="numeric"`, maxLength 10).
- Calcular idade real a partir de dia/mês/ano (não só ano).
- Validação ao submeter:
  - Data inválida → mensagem: *"Por favor, informe uma data de nascimento válida."*
  - Menor de 18 → bloqueia cadastro e mostra alerta amigável:
    > "Para criar uma conta, é necessário ter 18 anos ou mais. Peça a um responsável maior de idade para criar a conta — depois ele poderá adicionar você como testando."
  - Válido e ≥18 → segue para `/dashboard`.
- Feedback visual com `Alert` do shadcn (`src/components/ui/alert.tsx`), mantendo estética glass/dark.
- Trocar `<GradientButton asChild><Link>` por `<GradientButton type="submit">` + `useNavigate()` do `@tanstack/react-router`.

### Detalhes técnicos

- `useState` para `birthDate` (string formatada) e `error` (string | null).
- `formatDateInput(value)`, `parseBR(date)` → `Date | null`, `calcAge(date)` comparando ano/mês/dia.
- `onSubmit` no `<form>` com `e.preventDefault()`.

## 2. Trocar "psicológica" por "comportamental" em toda a plataforma

Substituição global do termo, preservando capitalização e acentuação. Ocorrências atuais detectadas:

- `src/routes/index.tsx:23` — "Avaliação psicológica gamificada" → "Avaliação comportamental gamificada"
- `src/routes/index.tsx:94` — "Avaliação psicológica gamificada conduzida por IA…" → "Avaliação comportamental gamificada conduzida por IA…"

Regra geral aplicada a futuras telas/componentes:
- "psicológica" → "comportamental"
- "psicológico" → "comportamental"
- "Psicológica/Psicológico" → "Comportamental" (mantendo a inicial maiúscula)

Após aplicar, rodar nova busca por `psico` em `src/` para garantir que nenhuma ocorrência sobrou.

### Fora de escopo

- Persistência real do cadastro (segue mock).
- Mudanças em outras telas além das listadas.

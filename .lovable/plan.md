# Plano (revisado v4): Mockups das Telas — PsychGame AI

Apenas mockups visuais (sem backend, IA ou pagamento real).

## Identidade visual
- Tema dark, fundo navy `#0a0e27`
- Gradiente da marca: azul `#2563eb` → roxo `#7c3aed` → laranja `#f97316`
- Display bold (Space Grotesk / Sora) + Inter no corpo
- Glassmorphism, bordas com gradiente, logo no header

## Papéis
- **admin** — gerencia salas, temas, faixas etárias, usuários e relatórios.
- **master** — adulto que paga o teste; pode fazê-lo ou presentear.
- **user** — quem realmente faz o teste (qualquer idade).

## Modelo comercial (mockup)
- **R$ 29,90 por teste** — pagamento único.
- Sem créditos / assinatura.
- Cada compra = 1 teste, que pode ser usado pelo master ou enviado a outra pessoa.
- No checkout, **campo opcional "Código do vendedor"** para rastrear comissões.

## Fluxo da Sala (importante)
Ao entrar em uma sala, o usuário responde a uma **sequência de perguntas** apresentadas pela IA (mockadas):

```text
[Sala — tema "Alegria"]
Pergunta 1 de 5
"Você acabou de receber uma surpresa inesperada. Como reage?"
[Resposta A] [Resposta B] [Resposta C] [Outros: campo livre]
                ↓ (escolheu)
Pergunta 2 de 5 ...
                ↓
Pergunta 5 de 5 → Sala concluída → volta ao mapa de salas
```

- Barra de progresso da sala (ex.: 3/5).
- Cada pergunta tem 3-4 respostas ilustradas + opção "Outros" (texto livre).
- Animação suave de transição entre perguntas.
- Banco de perguntas mockado por sala (`src/data/questions.ts`).
- Estado de progresso em memória (sem persistência).

## Telas (rotas TanStack)

### Públicas
1. `/` Landing — hero, 4 pilares, **R$ 29,90 / teste**, CTA login/cadastro.
2. `/login` — login mockup.
3. `/cadastro` — cadastro do master.
4. `/convite/$token` — testando convidado aceita o convite e segue para o teste.

### Master
5. `/dashboard` — boas-vindas, botão "Comprar novo teste — R$ 29,90", lista de testes (Não iniciado / Em andamento / Concluído / Presenteado) com testando vinculado.
6. `/comprar` — checkout mockup: 1 teste R$ 29,90, forma de pagamento (cartão/PIX), **campo "Código do vendedor (opcional)"**, botão "Pagar".
7. `/testes/$id/destinatario` — após pagar: "Fazer eu mesmo" ou "Presentear" (form com nome/idade/e-mail → gera link de convite).
8. `/relatorios` — lista de relatórios.
9. `/relatorio/$id` — Resumo, 4 blocos de emoção, Pontos de atenção, Recomendações, "Baixar PDF" (mock).

### Modo Jogo (testando)
10. `/teste/$id/intro` — apresentação lúdica.
11. `/teste/$id/salas` — mapa de salas elegíveis pela faixa etária + progresso por sala.
12. `/teste/$id/sala/$slug` — **fluxo de perguntas sequenciais** (ver diagrama acima). Paletas:
    - Alegria: amarelo/laranja
    - Medo: roxo/azul gelado
    - Raiva: vermelho vulcânico
    - Descobertas: verde/turquesa
13. `/teste/$id/concluido` — "Relatório sendo gerado".

### Admin
14. `/admin` — dashboard: usuários por role, testes vendidos, em andamento, receita simulada.
15. `/admin/salas` — CRUD de salas: título, tema, paleta, faixa de idade (min–max), status.
16. `/admin/salas/nova` e `/admin/salas/$id` — form: nome, descrição, tema, cor, ícone, faixa etária (slider), **gerenciar perguntas da sala** (lista ordenada com texto + alternativas mockadas).
17. `/admin/usuarios` — lista filtrável por role e vínculos master ↔ user.
18. `/admin/comissoes` — relatório de vendas por **código do vendedor**: vendedor, qtd testes, valor bruto, % comissão (mock), total.

## Componentes
- `BrandHeader`, `RoleSwitcher` (demo), `GradientButton`, `StatCard`, `EmotionBlock`
- `RoomCard` — tema, cor, ícone, faixa etária
- `QuestionFlow` — controla sequência de perguntas dentro da sala
- `QuestionCard` — pergunta + alternativas + "Outros"
- `AnswerButton`, `ProgressBar`, `AgeRangeBadge`, `TestStatusBadge`
- `SellerCodeInput` — input opcional no checkout

## Escopo / não-escopo
- ✅ Apenas frontend com dados mockados
- ✅ Logo em `src/assets/`
- ✅ Navegação real entre rotas e fluxo completo de perguntas em memória
- ❌ Sem backend, auth, pagamento, IA, persistência ou créditos

## Stack
TanStack Start, Tailwind v4, shadcn/ui, lucide-react. Tokens da marca em `src/styles.css`.

## Objetivo

No cadastro/edição de agente de IA, substituir o campo de texto livre "Modelo" por um seletor fechado com os modelos válidos da OpenAI, mostrando uma breve descrição do modelo escolhido.

## Como vai funcionar

- Campo "Modelo" vira um `select` (sem opção de digitar) com:
  - **gpt-4o-mini** — rápido e econômico, ideal para gerar perguntas
  - **gpt-4o** — equilíbrio entre qualidade e custo, bom para análises
  - **gpt-4.1** — maior qualidade de texto e contexto longo
  - **gpt-4.1-mini** — versão leve do 4.1, boa relação custo/benefício
  - **o4-mini** — foco em raciocínio, melhor para relatórios analíticos
- Abaixo do seletor aparece a descrição do modelo selecionado, em texto pequeno e discreto.
- Se um agente já salvo tiver um modelo fora da lista, ele é adicionado temporariamente como opção para não perder o valor existente.
- Cursor em ponteiro no seletor, seguindo o padrão do projeto.

## Detalhes técnicos

- Arquivo alterado: `src/components/brand/AgenteForm.tsx`.
- Constante `MODELS` com `{ value, label, description }` no topo do arquivo, fácil de atualizar.
- Nenhuma mudança de schema ou backend; `form.model` continua guardando o identificador do modelo.

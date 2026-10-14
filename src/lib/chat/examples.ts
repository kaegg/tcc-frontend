/**
 * Exemplos que o assistente entende de fato: valores, datas e categorias que
 * os extratores do backend e as categorias do seed reconhecem. Mudar um
 * exemplo pede conferir que ele ainda funciona na conversa.
 */
export const EXAMPLE_GROUPS = [
  {
    label: "Despesa",
    examples: ["gastei 45 reais no mercado ontem", "gastei 30 no uber hoje"],
  },
  {
    label: "Receita",
    examples: ["recebi 3.000 de salário dia 5", "recebi 500 de freelance hoje"],
  },
  {
    label: "Relatório",
    examples: [
      "quanto gastei este mês?",
      "qual meu saldo do mês passado?",
      "quanto gastei com alimentação em setembro?",
      "resumo de outubro",
    ],
  },
] as const

/** Atalhos da conversa vazia: um de cada tipo de tarefa do estudo. */
export const STARTER_SUGGESTIONS = [
  "Gastei 45 reais no mercado ontem",
  "Recebi 3.000 de salário dia 5",
  "Quanto gastei este mês?",
  "Quanto economizei este mês?",
]

import type { Category, MonthlyPoint, Transaction, User } from "@/lib/types"

/**
 * Dados de demonstração das telas navegáveis.
 *
 * Existem para que os wireframes possam ser avaliados com conteúdo realista
 * antes do backend existir. Serão substituídos pelas consultas à API na
 * integração com o backend.
 */

export const demoUser: User = {
  name: "Kauan Eguchi",
  email: "kauan@exemplo.com",
  initials: "KE",
}

export const categories: Category[] = [
  { id: "alimentacao", name: "Alimentação", type: "despesa" },
  { id: "transporte", name: "Transporte", type: "despesa" },
  { id: "moradia", name: "Moradia", type: "despesa" },
  { id: "saude", name: "Saúde", type: "despesa" },
  { id: "educacao", name: "Educação", type: "despesa" },
  { id: "lazer", name: "Lazer", type: "despesa" },
  { id: "assinaturas", name: "Assinaturas", type: "despesa" },
  { id: "salario", name: "Salário", type: "receita" },
  { id: "freelance", name: "Freelance", type: "receita" },
  { id: "investimentos", name: "Investimentos", type: "receita" },
]

export const transactions: Transaction[] = [
  {
    id: "t01",
    type: "despesa",
    amount: 35,
    date: "2026-08-16",
    description: "Almoço no restaurante do campus",
    categoryId: "alimentacao",
    createdAt: "2026-08-16T12:41:00",
    source: "assistente",
  },
  {
    id: "t02",
    type: "despesa",
    amount: 22.9,
    date: "2026-08-15",
    description: "Assinatura de streaming",
    categoryId: "assinaturas",
    createdAt: "2026-08-15T09:12:00",
    source: "formulario",
  },
  {
    id: "t03",
    type: "receita",
    amount: 1200,
    date: "2026-08-14",
    description: "Projeto freelance - landing page",
    categoryId: "freelance",
    createdAt: "2026-08-14T18:03:00",
    source: "formulario",
  },
  {
    id: "t04",
    type: "despesa",
    amount: 89.4,
    date: "2026-08-13",
    description: "Compras no mercado",
    categoryId: "alimentacao",
    createdAt: "2026-08-13T19:27:00",
    source: "assistente",
  },
  {
    id: "t05",
    type: "despesa",
    amount: 160,
    date: "2026-08-12",
    description: "Recarga do cartão de transporte",
    categoryId: "transporte",
    createdAt: "2026-08-12T08:15:00",
    source: "formulario",
  },
  {
    id: "t06",
    type: "despesa",
    amount: 1450,
    date: "2026-08-10",
    description: "Aluguel",
    categoryId: "moradia",
    createdAt: "2026-08-10T07:02:00",
    source: "formulario",
  },
  {
    id: "t07",
    type: "receita",
    amount: 4200,
    date: "2026-08-05",
    description: "Salário",
    categoryId: "salario",
    createdAt: "2026-08-05T06:30:00",
    source: "formulario",
  },
  {
    id: "t08",
    type: "despesa",
    amount: 74.5,
    date: "2026-08-04",
    description: "Consulta odontológica",
    categoryId: "saude",
    createdAt: "2026-08-04T15:45:00",
    source: "assistente",
  },
  {
    id: "t09",
    type: "despesa",
    amount: 58,
    date: "2026-08-03",
    description: "Cinema com amigos",
    categoryId: "lazer",
    createdAt: "2026-08-03T21:10:00",
    source: "assistente",
  },
  {
    id: "t10",
    type: "despesa",
    amount: 320,
    date: "2026-08-02",
    description: "Mensalidade do curso de inglês",
    categoryId: "educacao",
    createdAt: "2026-08-02T10:00:00",
    source: "formulario",
  },
  {
    id: "t11",
    type: "receita",
    amount: 180,
    date: "2026-08-01",
    description: "Rendimento da reserva de emergência",
    categoryId: "investimentos",
    createdAt: "2026-08-01T09:00:00",
    source: "formulario",
  },
  {
    id: "t12",
    type: "despesa",
    amount: 42.8,
    date: "2026-07-30",
    description: "Aplicativo de transporte",
    categoryId: "transporte",
    createdAt: "2026-07-30T22:34:00",
    source: "assistente",
  },
  {
    id: "t13",
    type: "despesa",
    amount: 118.6,
    date: "2026-07-28",
    description: "Farmácia",
    categoryId: "saude",
    createdAt: "2026-07-28T11:20:00",
    source: "formulario",
  },
  {
    id: "t14",
    type: "receita",
    amount: 4200,
    date: "2026-07-05",
    description: "Salário",
    categoryId: "salario",
    createdAt: "2026-07-05T06:30:00",
    source: "formulario",
  },
  {
    id: "t15",
    type: "despesa",
    amount: 1450,
    date: "2026-07-10",
    description: "Aluguel",
    categoryId: "moradia",
    createdAt: "2026-07-10T07:02:00",
    source: "formulario",
  },
]

/** Série dos últimos seis meses usada nos gráficos de evolução. */
export const monthlySeries: MonthlyPoint[] = [
  { month: "Mar", receitas: 4380, despesas: 3610 },
  { month: "Abr", receitas: 4200, despesas: 3980 },
  { month: "Mai", receitas: 5100, despesas: 3740 },
  { month: "Jun", receitas: 4200, despesas: 4120 },
  { month: "Jul", receitas: 4980, despesas: 3505 },
  { month: "Ago", receitas: 5580, despesas: 2209 },
]

export const commandSuggestions = [
  "Cadastre uma despesa de R$ 50 com mercado ontem",
  "Quanto gastei este mês?",
  "Mostre o resumo deste mês",
  "Quanto economizei este mês?",
]

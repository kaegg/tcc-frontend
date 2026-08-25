/**
 * Contratos do domínio financeiro usados pelo frontend.
 *
 * Estes tipos serão substituídos pelos contratos reais da API na integração
 * com o backend. Por enquanto descrevem o formato que as telas consomem.
 */

export type TransactionType = "receita" | "despesa"

export type Category = {
  id: string
  name: string
  type: TransactionType
}

export type Transaction = {
  id: string
  type: TransactionType
  amount: number
  date: string
  description: string
  categoryId: string
  createdAt: string
  /** Registra se o lançamento veio do formulário ou do assistente — é o dado
   *  que sustenta a comparação entre os dois modos de interação. */
  source: "formulario" | "assistente"
}

export type MonthlyPoint = {
  month: string
  receitas: number
  despesas: number
}

export type CategoryTotal = {
  categoryId: string
  name: string
  total: number
}

export type ChatRole = "user" | "assistant"

/** Proposta estruturada que o assistente extrai de uma mensagem. Nunca é
 *  persistida sem confirmação explícita do usuário. */
export type TransactionProposal = {
  type: TransactionType
  amount: number
  categoryId: string
  date: string
  description: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  /** Presente quando a mensagem do assistente propõe um lançamento. */
  proposal?: TransactionProposal
  proposalStatus?: "pendente" | "confirmada" | "cancelada"
}

export type Conversation = {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}

export type User = {
  name: string
  email: string
  initials: string
}

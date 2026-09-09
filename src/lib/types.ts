/**
 * Contratos do domínio financeiro usados pelo frontend.
 *
 * Os tipos que já vêm da API são reexportados de `@/lib/api/schemas`, onde os
 * schemas Zod são a fonte única e também validam a resposta em tempo de
 * execução. Manter uma cópia aqui criaria dois `Category` que divergem em
 * silêncio.
 *
 * O que sobra descreve o formato que as telas ainda mockadas consomem, e sai
 * daqui conforme cada uma passa a consumir a API.
 */

import type { TransactionType } from "@/lib/api/schemas"

export type { Category, TransactionType } from "@/lib/api/schemas"

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

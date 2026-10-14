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
import type { Proposal, ReplyKind, ReportPeriodRef } from "@/lib/chat/protocol"

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

export type ChatRole = "user" | "assistant"

/**
 * - `substituida`: a conversa mudou os dados, e o cartão novo é o que vale.
 * - `expirada`: o servidor não tem mais o lançamento (15 min parado ou
 *   reinício); nada foi gravado.
 */
export type ProposalStatus =
  "pendente" | "confirmada" | "cancelada" | "substituida" | "expirada"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  /** Presente quando a mensagem do assistente propõe um lançamento. Nunca é
   *  persistida sem confirmação explícita do usuário. */
  proposal?: Proposal
  proposalStatus?: ProposalStatus
  /** O usuário corrigiu os dados no próprio cartão. */
  proposalEdited?: boolean
  /** Período de uma consulta respondida; a resposta leva ao mesmo relatório. */
  report?: ReportPeriodRef
  /** Pergunta, sucesso, erro…: marcado na mensagem (TCC-028). */
  kind?: ReplyKind | null
  /** Resposta cortada por cancelamento ou falha no meio da geração. */
  interrupted?: boolean
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

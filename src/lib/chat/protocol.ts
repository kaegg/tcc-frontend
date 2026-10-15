/**
 * Contrato do gateway do chat. Espelha `src/chat/chat.protocol.ts` do backend.
 */

import type { TransactionType } from "@/lib/api/schemas"

export const ChatEvent = {
  send: "message:send",
  cancel: "reply:cancel",
  chunk: "reply:chunk",
  end: "reply:end",
  error: "reply:error",
  cancelOperation: "operation:cancel",
  confirmOperation: "operation:confirm",
  editOperation: "operation:edit",
} as const

export const MAX_MESSAGE_CHARS = 2000

export type ChatFailure = {
  code: string
  message: string
  /** Mensagens por campo, quando a edição do lançamento é reprovada. */
  fieldErrors?: Record<string, string[]>
}

export type SendMessagePayload = {
  id: string
  conversationId: string
  content: string
}

export type SendMessageAck = { ok: true } | ({ ok: false } & ChatFailure)

export type ReplyChunk = { id: string; text: string }
/**
 * Lançamento completo que aguarda confirmação. O `id` muda a cada alteração:
 * confirmar e editar enviam o que está na tela, e o servidor recusa se os
 * dados já mudaram.
 */
export type Proposal = {
  id: string
  type: TransactionType
  /** Texto decimal com ponto e duas casas, como na API REST. */
  amount: string
  categoryId: string
  categoryName: string
  date: string
  description: string | null
  /** A data não foi dita: o assistente assumiu hoje, como o formulário. */
  dateDefaulted: boolean
}

/** Lançamento sendo preenchido na conversa, depois da resposta. */
export type PendingSummary = {
  missing: string[]
  ready: boolean
  proposal?: Proposal | null
}

/** O que a mensagem fez com o lançamento pendente, quando o encerrou. */
export type OperationOutcome = "registrado" | "cancelado"

/** Período de uma consulta respondida, para abrir o mesmo relatório. */
export type ReportPeriodRef = { from: string; to: string }

/**
 * O que a resposta é para o usuário; a interface marca cada tipo de forma
 * distinta. Espelha `src/chat/replies.ts` do backend.
 */
export type ReplyKind =
  "pergunta" | "confirmacao" | "sucesso" | "erro" | "informacao"

export type ReplyEnd = {
  id: string
  pending?: PendingSummary | null
  outcome?: OperationOutcome | null
  report?: ReportPeriodRef | null
  kind?: ReplyKind | null
  /** A que tarefa medida a resposta pertence (TCC-030). */
  flow?: "registro" | "consulta" | null
}
export type ReplyError = { id: string } & ChatFailure

export type CancelOperationAck =
  { ok: true; reply: string } | ({ ok: false } & ChatFailure)

export type ConfirmOperationAck = CancelOperationAck

export type EditOperationAck =
  { ok: true; pending: PendingSummary } | ({ ok: false } & ChatFailure)

export const CONNECTION_LOST: ChatFailure = {
  code: "desconectado",
  message: "A conexão com o assistente caiu. Tente novamente.",
}

export const NOT_CONNECTED: ChatFailure = {
  code: "desconectado",
  message: "Sem conexão com o assistente no momento.",
}

export const ACK_TIMEOUT: ChatFailure = {
  code: "tempo_esgotado",
  message: "O assistente não confirmou o recebimento. Tente novamente.",
}

export const SESSION_EXPIRED: ChatFailure = {
  code: "sessao_expirada",
  message: "Sua sessão expirou. Entre novamente para continuar.",
}

/** Com `VITE_API_URL` relativa, o socket usa a mesma origem da página. */
export function socketUrl(apiBaseUrl: string): string {
  return /^https?:\/\//i.test(apiBaseUrl)
    ? `${new URL(apiBaseUrl).origin}/chat`
    : "/chat"
}

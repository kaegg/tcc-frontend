/**
 * Contrato do gateway do chat. Espelha `src/chat/chat.protocol.ts` do backend.
 */

export const ChatEvent = {
  send: "message:send",
  cancel: "reply:cancel",
  chunk: "reply:chunk",
  end: "reply:end",
  error: "reply:error",
  cancelOperation: "operation:cancel",
} as const

export const MAX_MESSAGE_CHARS = 2000

export type ChatFailure = { code: string; message: string }

export type SendMessagePayload = {
  id: string
  conversationId: string
  content: string
}

export type SendMessageAck = { ok: true } | ({ ok: false } & ChatFailure)

export type ReplyChunk = { id: string; text: string }
/** Lançamento sendo preenchido na conversa, depois da resposta. */
export type PendingSummary = { missing: string[]; ready: boolean }

export type ReplyEnd = { id: string; pending?: PendingSummary | null }
export type ReplyError = { id: string } & ChatFailure

export type CancelOperationAck =
  { ok: true; reply: string } | ({ ok: false } & ChatFailure)

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

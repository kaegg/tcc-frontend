import {
  BACKEND_UNAVAILABLE_MESSAGE,
  CONTRACT_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  TIMEOUT_MESSAGE,
} from "@/lib/api/messages"

/**
 * Natureza da falha, para a interface decidir o que mostrar e o cache decidir
 * se vale repetir.
 *
 * - `rede`     — o fetch nem completou: servidor fora, DNS, ou bloqueio de CORS.
 * - `tempo`    — o servidor não respondeu dentro do limite.
 * - `http`     — o servidor respondeu com status de erro.
 * - `contrato` — respondeu, mas fora do formato acordado.
 */
export type ApiErrorKind = "rede" | "tempo" | "http" | "contrato"

/**
 * Falha normalizada da API.
 *
 * Os campos são atribuídos no corpo do construtor, e não por parâmetros de
 * propriedade: `erasableSyntaxOnly` está ligado no tsconfig e proíbe essa
 * sintaxe.
 */
export class ApiError extends Error {
  kind: ApiErrorKind
  statusCode?: number
  /** Sempre lista: o ValidationPipe do backend devolve uma mensagem por violação. */
  messages: string[]
  path?: string

  constructor(options: {
    kind: ApiErrorKind
    message: string
    statusCode?: number
    messages?: string[]
    path?: string
    cause?: unknown
  }) {
    super(options.message, { cause: options.cause })
    this.name = "ApiError"
    this.kind = options.kind
    this.statusCode = options.statusCode
    this.messages = options.messages ?? [options.message]
    this.path = options.path
  }

  /** A sessão acabou e o usuário precisa entrar de novo. */
  get isSessionExpired(): boolean {
    return this.statusCode === 401
  }

  /**
   * Falhas de responsabilidade do cliente não melhoram com repetição —
   * repetir um 400 ou um 404 é tráfego jogado fora, e repetir um 401 vira
   * enxurrada de aviso na tela.
   */
  get isRetryable(): boolean {
    if (this.kind === "contrato") return false
    if (this.kind !== "http") return true

    return this.statusCode === undefined || this.statusCode >= 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Frase única para mostrar ao usuário.
 *
 * Erros de validação chegam com uma mensagem por campo; aqui vale a primeira,
 * e a lista completa fica em `messages` para quem quiser exibir todas.
 */
export function describeApiError(error: unknown): string {
  if (!isApiError(error)) return GENERIC_ERROR_MESSAGE

  switch (error.kind) {
    case "rede":
      return BACKEND_UNAVAILABLE_MESSAGE
    case "tempo":
      return TIMEOUT_MESSAGE
    case "contrato":
      return CONTRACT_MESSAGE
    case "http":
      if (error.statusCode === 401) return SESSION_EXPIRED_MESSAGE
      return error.messages[0] ?? GENERIC_ERROR_MESSAGE
  }
}

/** Mensagem padrão por faixa de status, quando o corpo não traz uma. */
export function defaultMessageForStatus(statusCode: number): string {
  if (statusCode === 401) return SESSION_EXPIRED_MESSAGE
  if (statusCode === 403)
    return "Você não tem permissão para realizar esta operação."
  if (statusCode === 404) return "Recurso não encontrado."
  if (statusCode >= 500) return BACKEND_UNAVAILABLE_MESSAGE

  return GENERIC_ERROR_MESSAGE
}

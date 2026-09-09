/**
 * Mensagens de falha de comunicação.
 */

export const BACKEND_UNAVAILABLE_MESSAGE =
  "Não foi possível carregar os dados. Verifique sua conexão e tente novamente."

export const ASSISTANT_UNAVAILABLE_MESSAGE =
  "Não foi possível falar com o assistente. O serviço local pode estar indisponível."

export const SESSION_EXPIRED_MESSAGE =
  "Sua sessão expirou. Entre novamente para continuar."

export const TIMEOUT_MESSAGE =
  "O servidor demorou demais para responder. Tente novamente."

/** Resposta fora do contrato esperado — indica versões incompatíveis. */
export const CONTRACT_MESSAGE =
  "A resposta do servidor não veio no formato esperado. Atualize a página e tente novamente."

export const GENERIC_ERROR_MESSAGE =
  "Não foi possível concluir a operação. Tente novamente em instantes."

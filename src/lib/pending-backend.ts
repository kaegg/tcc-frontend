/**
 * Placeholders enquanto a API REST não existe e o frontend não foi
 * integrado a ela.
 */

export function simulateRequest(delayMs = 900) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

/** Mensagem usada nas telas que demonstram o estado de erro de comunicação. */
export const BACKEND_UNAVAILABLE_MESSAGE =
  "Não foi possível carregar os dados. Verifique sua conexão e tente novamente."

/** Mensagem do estado de erro específico do canal conversacional. */
export const ASSISTANT_UNAVAILABLE_MESSAGE =
  "Não foi possível falar com o assistente. O serviço local pode estar indisponível."

/**
 * Placeholders das telas que ainda não consomem a API.
 */

export function simulateRequest(delayMs = 900) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

/**
 * As mensagens agora moram em `@/lib/api/messages` e são reexportadas aqui.
 */
export {
  ASSISTANT_UNAVAILABLE_MESSAGE,
  BACKEND_UNAVAILABLE_MESSAGE,
} from "@/lib/api/messages"

/**
 * Identificadores das métricas (TCC-030), aleatórios e gerados aqui: o
 * servidor recebe só estes códigos e não tem como ligá-los a uma conta.
 */

/** UUID v4 também fora de contexto seguro, onde `randomUUID` não existe. */
function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function stored(storage: Storage, key: string): string {
  try {
    const current = storage.getItem(key)
    if (current) return current
    const created = randomId()
    storage.setItem(key, created)
    return created
  } catch {
    return randomId()
  }
}

/**
 * Um código por conta neste navegador. A conta entra só na chave local, para
 * participantes que usam o mesmo computador do laboratório não dividirem o
 * código; ela nunca é enviada junto com a métrica.
 */
export function participantCode(accountId: string): string {
  return stored(localStorage, `intellifinance:metricas:${accountId}`)
}

/** Um código por aba: agrupa as tarefas de uma mesma sessão de uso. */
export function sessionCode(): string {
  return stored(sessionStorage, "intellifinance:metricas:sessao")
}

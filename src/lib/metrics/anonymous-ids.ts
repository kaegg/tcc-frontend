/**
 * Identificadores das métricas (TCC-030), aleatórios e gerados aqui: o
 * servidor recebe só estes códigos e não tem como ligá-los a uma conta.
 */

import { randomUuid } from "@/lib/random-id"

function stored(storage: Storage, key: string): string {
  try {
    const current = storage.getItem(key)
    if (current) return current
    const created = randomUuid()
    storage.setItem(key, created)
    return created
  } catch {
    return randomUuid()
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

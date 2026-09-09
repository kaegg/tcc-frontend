import { useSyncExternalStore } from "react"

/**
 * Sinal de sessão expirada.
 */

let expired = false

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  return expired
}

/**
 * Marca a sessão como expirada.
 *
 * Devolve `true` só na primeira chamada de uma sequência. Várias consultas em
 * paralelo recebendo 401 chamariam esta função várias vezes; sem o retorno, o
 * usuário veria um aviso por consulta.
 */
export function markSessionExpired(): boolean {
  if (expired) return false

  expired = true
  emit()
  return true
}

/** Limpa o sinal. Precisa ser chamado ao entrar de novo, senão o usuário
 *  volta para a tela protegida e é mandado direto de volta ao login. */
export function clearSessionExpired(): void {
  if (!expired) return

  expired = false
  emit()
}

export function useSessionExpired(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

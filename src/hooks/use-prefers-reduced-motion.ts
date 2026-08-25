import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

/**
 * Informa se o usuário pediu redução de movimento no sistema.
 *
 * Usado para desligar as animações de entrada dos gráficos apenas para quem
 * configurou essa preferência.
 */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

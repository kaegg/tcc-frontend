import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Acompanha o breakpoint de mobile.
 *
 * A versão gerada pelo CLI do Shadcn/UI usava useEffect + setState, o que
 * dispara uma renderização em cascata logo na montagem. `useSyncExternalStore` é
 * a forma prevista pelo React para ler de uma fonte externa como o matchMedia:
 * o valor já sai correto na primeira renderização e a assinatura é gerenciada
 * pelo próprio React.
 */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

// A aplicação não é renderizada no servidor; o fallback existe apenas para
// manter a assinatura da API satisfeita.
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

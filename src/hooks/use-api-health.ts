import { useQuery } from "@tanstack/react-query"

import { isApiError } from "@/lib/api/errors"
import { fetchHealth } from "@/lib/api/health"
import { queryKeys } from "@/lib/api/query-keys"

/** Intervalo entre tentativas enquanto a API não está saudável. */
const RECHECK_INTERVAL_MS = 30_000

export type ApiStatus = "verificando" | "normal" | "degradado" | "offline"

/**
 * Estado de disponibilidade da API.
 *
 * Faz uma verificação ao montar e só volta a consultar enquanto houver
 * problema: no caminho feliz o custo é zero requisição por minuto. É o inverso
 * de um polling fixo, que gastaria tráfego justamente quando não há nada a
 * observar.
 */
export function useApiHealth() {
  const query = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => fetchHealth(signal),

    retry: false,
    staleTime: 0,
    gcTime: 60_000,

    refetchInterval: (query) =>
      query.state.data?.status === "ok" ? false : RECHECK_INTERVAL_MS,
  })

  return { ...query, status: toApiStatus(query) }
}

function toApiStatus(query: {
  isPending: boolean
  data?: { status: "ok" | "degradado" }
  error: unknown
}): ApiStatus {
  if (query.error) {
    return isApiError(query.error) && query.error.kind === "contrato"
      ? "degradado"
      : "offline"
  }

  if (query.isPending) return "verificando"

  return query.data?.status === "ok" ? "normal" : "degradado"
}

import { useContext } from "react"

import { MetricsContext, type MetricsApi } from "@/lib/metrics/context"

const noop = () => undefined

const OFF: MetricsApi = {
  start: noop,
  isActive: () => false,
  interaction: noop,
  error: noop,
  finish: noop,
}

/** Fora do provedor (telas públicas, testes), mede nada. */
export function useMetrics(): MetricsApi {
  return useContext(MetricsContext) ?? OFF
}

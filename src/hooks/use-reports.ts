import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/api/query-keys"
import {
  fetchMonthlySummary,
  fetchPeriodSummary,
  type ReportPeriod,
} from "@/lib/api/reports"

/** `enabled: false` segura a consulta enquanto o período for inválido. */
export function usePeriodSummary(period: ReportPeriod, enabled = true) {
  return useQuery({
    queryKey: queryKeys.periodSummary(period.from, period.to),
    queryFn: ({ signal }) => fetchPeriodSummary(period, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}

export function useMonthlySummary(month: string) {
  return useQuery({
    queryKey: queryKeys.monthlySummary(month),
    queryFn: ({ signal }) => fetchMonthlySummary(month, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}

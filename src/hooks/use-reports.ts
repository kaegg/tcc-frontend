import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/api/query-keys"
import {
  fetchMonthlySummary,
  fetchReportOverview,
  type ReportPeriod,
} from "@/lib/api/reports"

/** `enabled: false` segura a consulta enquanto o período for inválido. */
export function useReportOverview(period: ReportPeriod, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reportOverview(period.from, period.to),
    queryFn: ({ signal }) => fetchReportOverview(period, signal),
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

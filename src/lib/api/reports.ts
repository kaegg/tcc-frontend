import { apiGet } from "@/lib/api/client"
import {
  monthlySummarySchema,
  periodSummarySchema,
  type MonthlySummary,
  type PeriodSummary,
} from "@/lib/api/schemas"

/** Período com as duas pontas inclusivas, em datas civis `AAAA-MM-DD`. */
export type ReportPeriod = { from: string; to: string }

export function fetchPeriodSummary(
  period: ReportPeriod,
  signal?: AbortSignal,
): Promise<PeriodSummary> {
  return apiGet("/reports/summary", periodSummarySchema, {
    query: { from: period.from, to: period.to },
    signal,
  })
}

/** Mês de referência `AAAA-MM`. */
export function fetchMonthlySummary(
  month: string,
  signal?: AbortSignal,
): Promise<MonthlySummary> {
  return apiGet("/reports/monthly", monthlySummarySchema, {
    query: { month },
    signal,
  })
}

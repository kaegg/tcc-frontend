import { apiGet } from "@/lib/api/client"
import {
  monthlySummarySchema,
  reportOverviewSchema,
  type MonthlySummary,
  type ReportOverview,
} from "@/lib/api/schemas"

/** Período com as duas pontas inclusivas, em datas civis `AAAA-MM-DD`. */
export type ReportPeriod = { from: string; to: string }

/** Totais, distribuição e série mensal do período, numa só resposta. */
export function fetchReportOverview(
  period: ReportPeriod,
  signal?: AbortSignal,
): Promise<ReportOverview> {
  return apiGet("/reports/overview", reportOverviewSchema, {
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

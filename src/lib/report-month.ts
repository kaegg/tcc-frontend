import type { ReportPeriod } from "@/lib/api/reports"

/**
 * Mês de referência `AAAA-MM`. "Mês atual" usa o fuso de quem está usando,
 * pelo mesmo motivo de `todayIso`: em UTC, a noite do último dia já é o mês
 * seguinte.
 */

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/
export const MIN_MONTH = "2000-01"
export const MAX_MONTH = "2100-01"

export const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const

function format(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

export function currentMonth(today: Date = new Date()): string {
  return format(today.getFullYear(), today.getMonth())
}

export function isValidMonth(value: string): boolean {
  return MONTH.test(value) && value >= MIN_MONTH && value <= MAX_MONTH
}

/** Mês da URL; ausente ou inválido vira o mês atual, em vez de erro. */
export function monthFromParams(
  params: URLSearchParams,
  today: Date = new Date(),
): string {
  const month = params.get("month")

  return month && isValidMonth(month) ? month : currentMonth(today)
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(year, monthNumber - 1 + delta, 1)

  return format(date.getFullYear(), date.getMonth())
}

/** "setembro de 2026". */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number)

  return `${MONTH_NAMES[monthNumber - 1]} de ${year}`
}

/** Primeiro e último dia, para levar o mesmo recorte à listagem. */
export function monthPeriod(month: string): ReportPeriod {
  const [year, monthNumber] = month.split("-").map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()

  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

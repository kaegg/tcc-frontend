import type { ReportPeriod } from "@/lib/api/reports"
import { PERIODO_INVERTIDO } from "@/lib/transaction-filters"

/**
 * Períodos do relatório. As datas são montadas no fuso de quem usa, pelas
 * partes, pelo mesmo motivo de `todayIso`: a partir das 21h em Brasília, UTC
 * já é o dia seguinte e "este mês" viraria o próximo no último dia do mês.
 */

export const PRESETS = [
  { value: "este-mes", label: "Este mês" },
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "ultimos-3-meses", label: "Últimos 3 meses" },
  { value: "este-ano", label: "Este ano" },
] as const

export type PresetValue = (typeof PRESETS)[number]["value"]

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/

/** `new Date(ano, mês, dia)` normaliza estouros: dia 0 é o último do mês anterior. */
function civil(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${d}`
}

export function presetPeriod(
  preset: PresetValue,
  today: Date = new Date(),
): ReportPeriod {
  const year = today.getFullYear()
  const month = today.getMonth()

  switch (preset) {
    case "este-mes":
      return { from: civil(year, month, 1), to: civil(year, month + 1, 0) }
    case "mes-anterior":
      return { from: civil(year, month - 1, 1), to: civil(year, month, 0) }
    case "ultimos-3-meses":
      return { from: civil(year, month - 2, 1), to: civil(year, month + 1, 0) }
    case "este-ano":
      return { from: civil(year, 0, 1), to: civil(year, 11, 31) }
  }
}

/** O preset que gera exatamente este período, ou `null` se for personalizado. */
export function matchingPreset(
  period: ReportPeriod,
  today: Date = new Date(),
): PresetValue | null {
  const found = PRESETS.find(({ value }) => {
    const candidate = presetPeriod(value, today)
    return candidate.from === period.from && candidate.to === period.to
  })

  return found?.value ?? null
}

/**
 * Período vindo da URL. Ponta ausente ou fora do formato cai no mês atual,
 * em vez de ir ao servidor e virar tela de erro.
 */
export function periodFromParams(
  params: URLSearchParams,
  today: Date = new Date(),
): ReportPeriod {
  const from = params.get("from")
  const to = params.get("to")

  if (from && to && CIVIL_DATE.test(from) && CIVIL_DATE.test(to)) {
    return { from, to }
  }

  return presetPeriod("este-mes", today)
}

export function reportPeriodError(period: ReportPeriod): string | null {
  return period.from > period.to ? PERIODO_INVERTIDO : null
}

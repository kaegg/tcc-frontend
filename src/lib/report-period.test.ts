import { describe, expect, it } from "vitest"

import {
  matchingPreset,
  periodFromParams,
  presetPeriod,
  reportPeriodError,
} from "@/lib/report-period"

/** Meio-dia local, longe de qualquer virada de dia por fuso. */
const dia = (ano: number, mes: number, d: number) =>
  new Date(ano, mes - 1, d, 12)

describe("presetPeriod", () => {
  const hoje = dia(2026, 9, 25)

  it.each([
    ["este-mes", "2026-09-01", "2026-09-30"],
    ["mes-anterior", "2026-08-01", "2026-08-31"],
    ["ultimos-3-meses", "2026-07-01", "2026-09-30"],
    ["este-ano", "2026-01-01", "2026-12-31"],
  ] as const)("%s", (preset, from, to) => {
    expect(presetPeriod(preset, hoje)).toEqual({ from, to })
  })

  it("mês anterior em janeiro cai em dezembro do ano anterior", () => {
    expect(presetPeriod("mes-anterior", dia(2026, 1, 10))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    })
  })

  it("últimos 3 meses atravessam a virada do ano", () => {
    expect(presetPeriod("ultimos-3-meses", dia(2026, 2, 3))).toEqual({
      from: "2025-12-01",
      to: "2026-02-28",
    })
  })

  it("fevereiro de ano bissexto termina no dia 29", () => {
    expect(presetPeriod("este-mes", dia(2028, 2, 10)).to).toBe("2028-02-29")
  })

  it("usa a data local: 23h do último dia ainda é este mês", () => {
    expect(presetPeriod("este-mes", new Date(2026, 8, 30, 23, 30))).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    })
  })
})

describe("matchingPreset", () => {
  const hoje = dia(2026, 9, 25)

  it("reconhece o período de um preset", () => {
    expect(matchingPreset({ from: "2026-08-01", to: "2026-08-31" }, hoje)).toBe(
      "mes-anterior",
    )
  })

  it("período editado é personalizado", () => {
    expect(
      matchingPreset({ from: "2026-09-05", to: "2026-09-30" }, hoje),
    ).toBeNull()
  })
})

describe("periodFromParams", () => {
  const hoje = dia(2026, 9, 25)
  const mesAtual = { from: "2026-09-01", to: "2026-09-30" }

  it("lê o período da URL", () => {
    expect(
      periodFromParams(
        new URLSearchParams("from=2026-01-01&to=2026-03-31"),
        hoje,
      ),
    ).toEqual({ from: "2026-01-01", to: "2026-03-31" })
  })

  it.each(["", "from=2026-01-01", "from=ontem&to=hoje", "to=2026-01-01"])(
    "sem período válido (%j) usa o mês atual",
    (query) => {
      expect(periodFromParams(new URLSearchParams(query), hoje)).toEqual(
        mesAtual,
      )
    },
  )
})

describe("reportPeriodError", () => {
  it("acusa período invertido e aceita um dia só", () => {
    expect(reportPeriodError({ from: "2026-09-30", to: "2026-09-01" })).toBe(
      "A data final deve ser igual ou posterior à inicial.",
    )
    expect(
      reportPeriodError({ from: "2026-09-10", to: "2026-09-10" }),
    ).toBeNull()
  })
})

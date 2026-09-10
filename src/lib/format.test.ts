import { afterEach, describe, expect, it, vi } from "vitest"

import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatSignedCurrency,
  parseDate,
  todayIso,
} from "@/lib/format"

/** Intl usa espaço não separável entre símbolo e valor. */
const normalize = (value: string) => value.replace(/\u00a0/g, " ")

describe("todayIso", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("usa a data do fuso local, não a de UTC", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-09T02:30:00.000Z"))

    expect(new Date().toISOString().slice(0, 10)).toBe("2026-09-09")
    expect(todayIso()).toBe("2026-09-08")
  })

  it("preenche mês e dia com zero à esquerda", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-05T12:00:00.000Z"))

    expect(todayIso()).toBe("2026-03-05")
  })
})

describe("parseDate", () => {
  it("não desloca o dia ao interpretar data civil", () => {
    expect(parseDate("2026-08-16").getDate()).toBe(16)
    expect(parseDate("2026-01-01").getMonth()).toBe(0)
  })

  it("aceita timestamp completo, usando só a parte da data", () => {
    expect(parseDate("2026-08-16T00:00:00.000Z").getDate()).toBe(16)
  })
})

describe("formatDate", () => {
  it("formata em pt-BR", () => {
    expect(formatDate("2026-08-16")).toBe("16/08/2026")
  })
})

describe("formatCurrency", () => {
  it("formata em real com duas casas", () => {
    expect(normalize(formatCurrency(1234.5))).toBe("R$ 1.234,50")
    expect(normalize(formatCurrency(0))).toBe("R$ 0,00")
  })
})

describe("formatSignedCurrency", () => {
  it("mostra o sinal fora do símbolo em valor negativo", () => {
    expect(normalize(formatSignedCurrency(-80))).toBe("- R$ 80,00")
    expect(normalize(formatSignedCurrency(80))).toBe("R$ 80,00")
  })
})

describe("formatPercent", () => {
  it("usa vírgula decimal", () => {
    expect(formatPercent(12.34)).toBe("12,3%")
  })
})

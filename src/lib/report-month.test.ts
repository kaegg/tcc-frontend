import { describe, expect, it } from "vitest"

import {
  currentMonth,
  formatMonth,
  isValidMonth,
  monthFromParams,
  monthPeriod,
  shiftMonth,
} from "@/lib/report-month"

describe("currentMonth", () => {
  it("usa o fuso local: 23h do último dia ainda é o mês", () => {
    expect(currentMonth(new Date(2026, 8, 30, 23, 30))).toBe("2026-09")
  })
})

describe("isValidMonth e monthFromParams", () => {
  it.each(["2026-09", "2000-01", "2100-01"])("aceita %s", (m) => {
    expect(isValidMonth(m)).toBe(true)
  })

  it.each(["2026-13", "2026-9", "1999-12", "2100-02", "setembro", ""])(
    "recusa %j",
    (m) => {
      expect(isValidMonth(m)).toBe(false)
    },
  )

  it("mês inválido na URL vira o mês atual", () => {
    const hoje = new Date(2026, 8, 25, 12)

    expect(monthFromParams(new URLSearchParams("month=2026-03"), hoje)).toBe(
      "2026-03",
    )
    expect(monthFromParams(new URLSearchParams("month=2026-13"), hoje)).toBe(
      "2026-09",
    )
    expect(monthFromParams(new URLSearchParams(""), hoje)).toBe("2026-09")
  })
})

describe("shiftMonth", () => {
  it.each([
    ["2026-09", -1, "2026-08"],
    ["2026-01", -1, "2025-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-09", 12, "2027-09"],
  ])("%s %+d → %s", (month, delta, esperado) => {
    expect(shiftMonth(month, delta)).toBe(esperado)
  })
})

describe("monthPeriod e formatMonth", () => {
  it.each([
    ["2026-09", "2026-09-01", "2026-09-30"],
    ["2026-02", "2026-02-01", "2026-02-28"],
    ["2028-02", "2028-02-01", "2028-02-29"],
    ["2026-12", "2026-12-01", "2026-12-31"],
  ])("%s vai de %s a %s", (month, from, to) => {
    expect(monthPeriod(month)).toEqual({ from, to })
  })

  it("escreve o mês por extenso", () => {
    expect(formatMonth("2026-03")).toBe("março de 2026")
  })
})

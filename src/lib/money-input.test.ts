import { describe, expect, it } from "vitest"

import {
  apiToCents,
  centsToApi,
  digitsToCents,
  formatCents,
} from "@/lib/money-input"

/** O que o campo mostra depois de digitar `texto`, tecla por tecla. */
function digitar(texto: string): string {
  let campo = ""
  for (const tecla of texto) {
    const cents = digitsToCents(campo + tecla)
    campo = cents === null ? "" : formatCents(cents)
  }
  return campo.replace(/\s/g, " ")
}

describe("campo de valor preenchido pela direita", () => {
  it.each([
    ["2", "0,02"],
    ["25", "0,25"],
    ["250", "2,50"],
    ["2500", "25,00"],
    ["25000", "250,00"],
    ["123456", "1.234,56"],
  ])("digitar %s mostra %s", (texto, esperado) => {
    expect(digitar(texto)).toBe(esperado)
  })

  it("apagar o último dígito desfaz a última tecla", () => {
    // "2,50" sem o último caractere é "2,5": os dígitos 25 → 0,25.
    expect(formatCents(digitsToCents("2,5")!)).toBe("0,25")
  })

  it("campo vazio é 'não informado'", () => {
    expect(digitsToCents("")).toBeNull()
    expect(digitsToCents("R$ ,")).toBeNull()
  })

  it("só zeros é campo vazio, para o Backspace conseguir esvaziar", () => {
    // "0,01" menos o último caractere é "0,0".
    expect(digitsToCents("0,0")).toBeNull()
    expect(digitsToCents("0")).toBeNull()
    expect(digitsToCents("0,05")).toBe(5)
  })

  it("colar um valor formatado aproveita só os dígitos", () => {
    expect(digitsToCents("R$ 1.234,56")).toBe(123456)
  })

  it("não passa do limite de numeric(12,2)", () => {
    expect(digitsToCents("9".repeat(12))).toBe(999_999_999_999)
    expect(digitsToCents("9".repeat(15))).toBe(999_999_999_999)
  })
})

describe("conversão com a API, sem ponto flutuante", () => {
  it.each([
    [1, "0.01"],
    [250, "2.50"],
    [3590, "35.90"],
    [999_999_999_999, "9999999999.99"],
  ])("%i centavos → %s", (cents, api) => {
    expect(centsToApi(cents)).toBe(api)
    expect(apiToCents(api)).toBe(cents)
  })

  it("aceita valor da API com uma casa só", () => {
    expect(apiToCents("35.9")).toBe(3590)
  })
})

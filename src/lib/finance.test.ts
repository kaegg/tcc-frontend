import { describe, expect, it } from "vitest"

import {
  inMonth,
  sortByDateDesc,
  sumTotals,
  totalsByCategory,
} from "@/lib/finance"
import type { Transaction } from "@/lib/types"

function transaction(partial: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    type: "despesa",
    amount: 100,
    date: "2026-08-10",
    description: "Lançamento",
    categoryId: "alimentacao",
    createdAt: "2026-08-10T12:00:00.000Z",
    source: "formulario",
    ...partial,
  }
}

describe("sumTotals", () => {
  it("separa receitas de despesas e calcula o saldo", () => {
    const totals = sumTotals([
      transaction({ type: "receita", amount: 3000 }),
      transaction({ type: "despesa", amount: 800 }),
      transaction({ type: "despesa", amount: 200 }),
    ])

    expect(totals.receitas).toBe(3000)
    expect(totals.despesas).toBe(1000)
    expect(totals.saldo).toBe(2000)
  })

  it("calcula a taxa de economia sobre as receitas", () => {
    const totals = sumTotals([
      transaction({ type: "receita", amount: 1000 }),
      transaction({ type: "despesa", amount: 250 }),
    ])

    expect(totals.taxaEconomia).toBeCloseTo(75)
  })

  it("não divide por zero quando não há receita", () => {
    const totals = sumTotals([transaction({ type: "despesa", amount: 500 })])

    expect(totals.taxaEconomia).toBe(0)
    expect(totals.saldo).toBe(-500)
  })

  it("devolve zeros para lista vazia", () => {
    expect(sumTotals([])).toEqual({
      receitas: 0,
      despesas: 0,
      saldo: 0,
      taxaEconomia: 0,
    })
  })
})

describe("inMonth", () => {
  const items = [
    transaction({ id: "a", date: "2026-08-01" }),
    transaction({ id: "b", date: "2026-08-31" }),
    transaction({ id: "c", date: "2026-09-01" }),
    transaction({ id: "d", date: "2026-07-31" }),
  ]

  it("inclui as bordas do mês e exclui os vizinhos", () => {
    expect(inMonth(items, 2026, 8).map((t) => t.id)).toEqual(["a", "b"])
  })

  it("aceita mês de um dígito", () => {
    expect(inMonth(items, 2026, 9).map((t) => t.id)).toEqual(["c"])
  })
})

describe("sortByDateDesc", () => {
  it("ordena do mais recente para o mais antigo sem mutar a origem", () => {
    const items = [
      transaction({ id: "antigo", date: "2026-07-01" }),
      transaction({ id: "novo", date: "2026-08-20" }),
    ]

    expect(sortByDateDesc(items).map((t) => t.id)).toEqual(["novo", "antigo"])
    expect(items.map((t) => t.id)).toEqual(["antigo", "novo"])
  })
})

describe("totalsByCategory", () => {
  it("agrupa por categoria e ordena do maior para o menor", () => {
    const totals = totalsByCategory(
      [
        transaction({ categoryId: "alimentacao", amount: 100 }),
        transaction({ categoryId: "alimentacao", amount: 50 }),
        transaction({ categoryId: "transporte", amount: 200 }),
      ],
      "despesa",
    )

    expect(totals.map((t) => [t.categoryId, t.total])).toEqual([
      ["transporte", 200],
      ["alimentacao", 150],
    ])
  })

  it("ignora lançamentos do outro tipo", () => {
    const totals = totalsByCategory(
      [
        transaction({ type: "receita", categoryId: "salario", amount: 5000 }),
        transaction({ type: "despesa", categoryId: "alimentacao", amount: 30 }),
      ],
      "despesa",
    )

    expect(totals).toHaveLength(1)
    expect(totals[0].categoryId).toBe("alimentacao")
  })
})

import { categoryName } from "@/lib/demo-data"
import type { CategoryTotal, Transaction, TransactionType } from "@/lib/types"

export type Totals = {
  receitas: number
  despesas: number
  saldo: number
  /** Quanto das receitas sobrou, em porcentagem. */
  taxaEconomia: number
}

export function sumTotals(items: Transaction[]): Totals {
  const receitas = items
    .filter((t) => t.type === "receita")
    .reduce((acc, t) => acc + t.amount, 0)

  const despesas = items
    .filter((t) => t.type === "despesa")
    .reduce((acc, t) => acc + t.amount, 0)

  const saldo = receitas - despesas

  return {
    receitas,
    despesas,
    saldo,
    taxaEconomia: receitas > 0 ? (saldo / receitas) * 100 : 0,
  }
}

/** Agrupa por categoria e ordena do maior para o menor. */
export function totalsByCategory(
  items: Transaction[],
  type: TransactionType
): CategoryTotal[] {
  const totals = new Map<string, number>()

  for (const item of items) {
    if (item.type !== type) continue
    totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount)
  }

  return [...totals.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: categoryName(categoryId),
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

export function inMonth(items: Transaction[], year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`
  return items.filter((t) => t.date.startsWith(prefix))
}

export function sortByDateDesc(items: Transaction[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

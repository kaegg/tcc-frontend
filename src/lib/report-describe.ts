import type { MonthTotals } from "@/lib/api/schemas"
import { formatCurrency } from "@/lib/format"
import { formatMonth } from "@/lib/report-month"

/**
 * Descrição textual dos gráficos (RNF02). O gráfico fica escondido da leitura
 * de tela; quem não o vê recebe este resumo e a tabela detalhada, que traz os
 * mesmos números mês a mês.
 */

const money = (value: string) => formatCurrency(Number(value))

/** O mês de maior valor; empate fica com o primeiro, na ordem da série. */
function peak(months: MonthTotals[], pick: (m: MonthTotals) => string) {
  return months.reduce((best, m) =>
    Number(pick(m)) > Number(pick(best)) ? m : best,
  )
}

function monthsLabel(count: number) {
  return count === 1 ? "1 mês" : `${count} meses`
}

export function describeFlow(
  months: MonthTotals[],
  totals: { income: string; expense: string },
): string {
  if (months.every((m) => m.transactionCount === 0)) {
    return "Nenhum lançamento no período."
  }

  const parts = [
    `Em ${monthsLabel(months.length)}, receitas somam ${money(totals.income)} e despesas ${money(totals.expense)}.`,
  ]

  if (months.length > 1) {
    const topIncome = peak(months, (m) => m.income)
    const topExpense = peak(months, (m) => m.expense)
    if (Number(topIncome.income) > 0) {
      parts.push(
        `Maior receita em ${formatMonth(topIncome.month)} (${money(topIncome.income)}).`,
      )
    }
    if (Number(topExpense.expense) > 0) {
      parts.push(
        `Maior despesa em ${formatMonth(topExpense.month)} (${money(topExpense.expense)}).`,
      )
    }
  }

  return parts.join(" ")
}

export function describeBalance(months: MonthTotals[]): string {
  if (months.every((m) => m.transactionCount === 0)) {
    return "Nenhum lançamento no período."
  }

  if (months.length === 1) {
    return `Saldo de ${money(months[0].balance)} em ${formatMonth(months[0].month)}.`
  }

  const positive = months.filter((m) => Number(m.balance) > 0).length
  const best = peak(months, (m) => m.balance)
  const worst = months.reduce((low, m) =>
    Number(m.balance) < Number(low.balance) ? m : low,
  )

  return (
    `Saldo positivo em ${positive} de ${monthsLabel(months.length)}. ` +
    `Melhor mês: ${formatMonth(best.month)} (${money(best.balance)}). ` +
    `Pior mês: ${formatMonth(worst.month)} (${money(worst.balance)}).`
  )
}

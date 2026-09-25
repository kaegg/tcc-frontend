import type { TransactionType } from "@/lib/api/schemas"
import type { TransactionFilters } from "@/lib/api/transactions"

/**
 * Chaves de cache do TanStack Query.
 */
export const queryKeys = {
  health: ["health"] as const,
  me: ["me"] as const,
  /** Prefixo comum: invalidar `transactionsAll` atualiza lista e detalhe. */
  transactionsAll: ["transactions"] as const,
  transactions: (page: number, filters: TransactionFilters = {}) =>
    ["transactions", "list", { page, ...filters }] as const,
  transaction: (id: string) => ["transactions", "detail", id] as const,
  /** Prefixo dos relatórios; toda escrita em lançamento o invalida. */
  reportsAll: ["reports"] as const,
  periodSummary: (from: string, to: string) =>
    ["reports", "summary", { from, to }] as const,
  monthlySummary: (month: string) => ["reports", "monthly", { month }] as const,
  categories: (type?: TransactionType) =>
    type ? (["categories", { type }] as const) : (["categories"] as const),
}

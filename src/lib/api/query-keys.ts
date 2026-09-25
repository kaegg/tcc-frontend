import type { TransactionType } from "@/lib/api/schemas"

/**
 * Chaves de cache do TanStack Query.
 */
export const queryKeys = {
  health: ["health"] as const,
  me: ["me"] as const,
  /** Prefixo comum: invalidar `transactionsAll` atualiza lista e detalhe. */
  transactionsAll: ["transactions"] as const,
  transactions: (page: number) => ["transactions", "list", { page }] as const,
  transaction: (id: string) => ["transactions", "detail", id] as const,
  categories: (type?: TransactionType) =>
    type ? (["categories", { type }] as const) : (["categories"] as const),
}

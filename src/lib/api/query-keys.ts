import type { TransactionType } from "@/lib/api/schemas"

/**
 * Chaves de cache do TanStack Query.
 */
export const queryKeys = {
  health: ["health"] as const,
  categories: (type?: TransactionType) =>
    type ? (["categories", { type }] as const) : (["categories"] as const),
}

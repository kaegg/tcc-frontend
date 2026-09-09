import { useQuery } from "@tanstack/react-query"

import { fetchCategories } from "@/lib/api/categories"
import { queryKeys } from "@/lib/api/query-keys"
import type { TransactionType } from "@/lib/api/schemas"

/**
 * Categorias ativas do sistema, vindas da API.
 */
export function useCategories(type?: TransactionType) {
  return useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: ({ signal }) => fetchCategories(type, signal),
  })
}

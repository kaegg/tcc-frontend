import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/api/query-keys"

/**
 * Criar, editar ou excluir lançamento muda a lista e os totais. Invalidar só a
 * lista deixaria o relatório em cache mostrando o valor de antes.
 */
export function invalidateFinancialData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactionsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reportsAll }),
  ])
}

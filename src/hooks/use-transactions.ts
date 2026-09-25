import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/api/query-keys"
import { fetchTransaction, fetchTransactions } from "@/lib/api/transactions"

/**
 * Lançamentos do usuário, uma página por vez.
 */
export function useTransactions(page: number) {
  return useQuery({
    queryKey: queryKeys.transactions(page),
    queryFn: ({ signal }) => fetchTransactions(page, signal),
    placeholderData: keepPreviousData,
    // Dado financeiro do usuário muda por ação dele: sempre confere ao abrir.
    staleTime: 0,
  })
}

/** Detalhe lido do servidor ao abrir, para mostrar o que está persistido. */
export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ""),
    queryFn: ({ signal }) => fetchTransaction(id as string, signal),
    enabled: id !== null,
    staleTime: 0,
  })
}

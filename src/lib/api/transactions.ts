import { apiGet, apiPost } from "@/lib/api/client"
import {
  transactionListSchema,
  transactionSchema,
  type TransactionList,
  type ApiTransaction,
  type TransactionType,
} from "@/lib/api/schemas"

export type CreateTransactionInput = {
  type: TransactionType
  /** Texto decimal com ponto e duas casas; ver `amountToApi`. */
  amount: string
  categoryId: string
  /** Data civil `AAAA-MM-DD`. */
  date: string
  description: string
}

/**
 * Valor do campo numérico como o contrato pede: texto com duas casas.
 * O backend recusa número JSON, que perderia precisão.
 */
export function amountToApi(value: number): string {
  return value.toFixed(2)
}

export function createTransaction(
  input: CreateTransactionInput,
  signal?: AbortSignal,
): Promise<ApiTransaction> {
  return apiPost("/transactions", input, transactionSchema, { signal })
}

export const TRANSACTIONS_PAGE_SIZE = 20

export function fetchTransactions(
  page: number,
  signal?: AbortSignal,
): Promise<TransactionList> {
  return apiGet("/transactions", transactionListSchema, {
    query: { page, pageSize: TRANSACTIONS_PAGE_SIZE },
    signal,
  })
}

/** O id é opaco: vai na URL codificado, nunca interpretado. */
export function fetchTransaction(
  id: string,
  signal?: AbortSignal,
): Promise<ApiTransaction> {
  return apiGet(`/transactions/${encodeURIComponent(id)}`, transactionSchema, {
    signal,
  })
}

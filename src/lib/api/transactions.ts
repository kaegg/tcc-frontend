import { apiPost } from "@/lib/api/client"
import {
  transactionSchema,
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

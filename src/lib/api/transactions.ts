import { z } from "zod"

import { apiGet, apiPost, apiRequest } from "@/lib/api/client"
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

/**
 * Envia o formulário inteiro, e não só o que mudou: o backend aceita corpo
 * parcial (o chatbot altera um campo por vez), mas assim a regra de categoria
 * compatível é conferida sobre exatamente o que o usuário vê na tela.
 */
export function updateTransaction(
  id: string,
  input: CreateTransactionInput,
  signal?: AbortSignal,
): Promise<ApiTransaction> {
  return apiRequest(`/transactions/${encodeURIComponent(id)}`, {
    schema: transactionSchema,
    method: "PATCH",
    body: input,
    signal,
  })
}

/** Exclusão lógica no servidor; responde 204. Só chamar depois da confirmação. */
export function deleteTransaction(
  id: string,
  signal?: AbortSignal,
): Promise<null> {
  return apiRequest(`/transactions/${encodeURIComponent(id)}`, {
    schema: z.null(),
    method: "DELETE",
    signal,
  })
}

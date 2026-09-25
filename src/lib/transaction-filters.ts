import type { TransactionFilters } from "@/lib/api/transactions"

/**
 * Filtros da listagem guardados na URL: sobrevivem a recarregar a página e
 * ao voltar do detalhe ou da edição.
 *
 * A URL é entrada do usuário. Valor fora do formato é descartado aqui, e não
 * enviado: um link editado à mão viraria 400 e a tela de erro no lugar da
 * lista. O backend valida de novo de qualquer forma.
 */

export const MAX_SEARCH_LENGTH = 100
export const PERIODO_INVERTIDO =
  "A data final deve ser igual ou posterior à inicial."

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FILTER_KEYS = ["from", "to", "type", "categoryId", "search"] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

export function filtersFromParams(params: URLSearchParams): TransactionFilters {
  const filters: TransactionFilters = {}

  const from = params.get("from")
  if (from && CIVIL_DATE.test(from)) filters.from = from

  const to = params.get("to")
  if (to && CIVIL_DATE.test(to)) filters.to = to

  const type = params.get("type")
  if (type === "receita" || type === "despesa") filters.type = type

  const categoryId = params.get("categoryId")
  if (categoryId && UUID.test(categoryId)) filters.categoryId = categoryId

  const search = params.get("search")?.trim().slice(0, MAX_SEARCH_LENGTH)
  if (search) filters.search = search

  return filters
}

export function pageFromParams(params: URLSearchParams): number {
  const page = Number(params.get("page"))

  return Number.isInteger(page) && page >= 1 ? page : 1
}

export function hasFilters(filters: TransactionFilters): boolean {
  return Object.keys(filters).length > 0
}

export function periodError(filters: TransactionFilters): string | null {
  const { from, to } = filters

  return from && to && from > to ? PERIODO_INVERTIDO : null
}

/**
 * Troca filtros e volta à primeira página: a página atual de um resultado não
 * corresponde à mesma página do resultado filtrado. Valor vazio remove.
 */
export function withFilters(
  params: URLSearchParams,
  patch: Partial<Record<FilterKey, string | undefined>>,
): URLSearchParams {
  const next = new URLSearchParams(params)

  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  next.delete("page")

  return next
}

export function withoutFilters(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)

  for (const key of FILTER_KEYS) next.delete(key)
  next.delete("page")

  return next
}

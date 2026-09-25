import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { invalidateFinancialData } from "@/lib/api/invalidate"
import { queryKeys } from "@/lib/api/query-keys"

describe("invalidateFinancialData", () => {
  it("marca lista, detalhe e relatórios como desatualizados, e mais nada", async () => {
    const client = new QueryClient()
    const lista = queryKeys.transactions(1)
    const detalhe = queryKeys.transaction("abc")
    const relatorio = queryKeys.periodSummary("2026-09-01", "2026-09-30")
    const categorias = queryKeys.categories()

    for (const key of [lista, detalhe, relatorio, categorias]) {
      client.setQueryData(key, {})
    }

    await invalidateFinancialData(client)

    const invalidada = (key: readonly unknown[]) =>
      client.getQueryState(key)?.isInvalidated

    expect(invalidada(lista)).toBe(true)
    expect(invalidada(detalhe)).toBe(true)
    expect(invalidada(relatorio)).toBe(true)
    expect(invalidada(categorias)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import {
  filtersFromParams,
  hasFilters,
  pageFromParams,
  periodError,
  withFilters,
  withoutFilters,
} from "@/lib/transaction-filters"

const CATEGORIA = "0199a1b2-c3d4-7000-8000-00000000c001"

const params = (query: string) => new URLSearchParams(query)

describe("filtersFromParams", () => {
  it("lê todos os filtros válidos", () => {
    expect(
      filtersFromParams(
        params(
          `from=2026-09-01&to=2026-09-30&type=despesa&categoryId=${CATEGORIA}&search=mercado`,
        ),
      ),
    ).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      type: "despesa",
      categoryId: CATEGORIA,
      search: "mercado",
    })
  })

  it("descarta valores fora do formato, em vez de enviá-los", () => {
    expect(
      filtersFromParams(
        params(
          "from=01/09/2026&to=amanha&type=transferencia&categoryId=1' OR '1'='1&search=",
        ),
      ),
    ).toEqual({})
  })

  it("apara e limita a busca", () => {
    expect(filtersFromParams(params("search=%20%20uber%20%20")).search).toBe(
      "uber",
    )
    expect(
      filtersFromParams(params(`search=${"x".repeat(150)}`)).search,
    ).toHaveLength(100)
  })

  it("ignora parâmetros que não são filtros", () => {
    expect(
      filtersFromParams(params("userId=outro&page=3&pageSize=100")),
    ).toEqual({})
  })
})

describe("pageFromParams", () => {
  it.each([
    ["", 1],
    ["page=3", 3],
    ["page=0", 1],
    ["page=-2", 1],
    ["page=1.5", 1],
    ["page=abc", 1],
  ])("%j → %i", (query, esperado) => {
    expect(pageFromParams(params(query))).toBe(esperado)
  })
})

describe("periodError", () => {
  it("acusa o período invertido", () => {
    expect(periodError({ from: "2026-09-30", to: "2026-09-01" })).toBe(
      "A data final deve ser igual ou posterior à inicial.",
    )
  })

  it.each([
    [{ from: "2026-09-01", to: "2026-09-01" }],
    [{ from: "2026-09-01" }],
    [{ to: "2026-09-01" }],
    [{}],
  ])("aceita %j", (filtros) => {
    expect(periodError(filtros)).toBeNull()
  })
})

describe("withFilters e withoutFilters", () => {
  it("troca o filtro e volta à primeira página", () => {
    const next = withFilters(params("page=4&type=receita"), {
      type: "despesa",
    })

    expect(next.get("type")).toBe("despesa")
    expect(next.has("page")).toBe(false)
  })

  it("valor vazio remove o filtro", () => {
    const next = withFilters(params("type=receita&search=x"), {
      type: undefined,
      search: "",
    })

    expect(next.toString()).toBe("")
  })

  it("limpar remove todos os filtros e a página, e mais nada", () => {
    const next = withoutFilters(
      params("from=2026-09-01&type=receita&search=x&page=2&outro=1"),
    )

    expect(next.toString()).toBe("outro=1")
    expect(hasFilters(filtersFromParams(next))).toBe(false)
  })
})

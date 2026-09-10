import { describe, expect, it } from "vitest"

import {
  apiErrorBodySchema,
  categoryListSchema,
  categorySchema,
  healthSchema,
} from "@/lib/api/schemas"

const categoria = {
  id: "0199a1b2-c3d4-7000-8000-000000000001",
  name: "Alimentação",
  type: "despesa",
}

describe("categorySchema", () => {
  it("aceita uma categoria do contrato", () => {
    expect(categorySchema.parse(categoria)).toEqual(categoria)
  })

  it("recusa tipo fora do domínio", () => {
    expect(
      categorySchema.safeParse({ ...categoria, type: "xpto" }).success,
    ).toBe(false)
  })

  it("recusa campo obrigatório ausente", () => {
    expect(categorySchema.safeParse({ id: "1", name: "Só nome" }).success).toBe(
      false,
    )
  })

  it("aceita qualquer formato de identificador", () => {
    // O id é opaco de propósito: foi o acoplamento ao formato (slug) que
    // divergiu do banco na TCC-006.
    expect(
      categorySchema.safeParse({ ...categoria, id: "alimentacao" }).success,
    ).toBe(true)
  })
})

describe("categoryListSchema", () => {
  it("exige o envelope data", () => {
    expect(categoryListSchema.safeParse([categoria]).success).toBe(false)
    expect(categoryListSchema.parse({ data: [categoria] }).data).toHaveLength(1)
  })

  it("aceita coleção vazia", () => {
    expect(categoryListSchema.parse({ data: [] }).data).toEqual([])
  })

  it("descarta campo novo em vez de falhar", () => {
    // Compatibilidade para frente: campo acrescentado no backend não pode
    // derrubar o frontend antes de um release coordenado.
    const parsed = categoryListSchema.parse({
      data: [{ ...categoria, isActive: true }],
      meta: { total: 1 },
    })

    expect(parsed.data[0]).toEqual(categoria)
  })
})

describe("apiErrorBodySchema", () => {
  const base = {
    statusCode: 400,
    error: "Bad Request",
    path: "/api/categories",
    timestamp: "2026-09-02T21:57:03.482Z",
  }

  it("aceita message como string", () => {
    expect(
      apiErrorBodySchema.parse({ ...base, message: "Falhou" }).message,
    ).toBe("Falhou")
  })

  it("aceita message como lista, que é o que o ValidationPipe devolve", () => {
    const parsed = apiErrorBodySchema.parse({
      ...base,
      message: [
        "type deve ser receita ou despesa.",
        "property tipo should not exist",
      ],
    })

    expect(parsed.message).toHaveLength(2)
  })

  it("recusa corpo que não é do contrato de erro", () => {
    expect(
      apiErrorBodySchema.safeParse({ erro: "qualquer coisa" }).success,
    ).toBe(false)
  })
})

describe("healthSchema", () => {
  it("aceita a resposta saudável", () => {
    const parsed = healthSchema.parse({
      status: "ok",
      timestamp: "2026-09-02T21:57:03.482Z",
      uptimeSeconds: 15,
      dependencies: { database: { status: "ok", latencyMs: 3 } },
    })

    expect(parsed.dependencies.database.latencyMs).toBe(3)
  })

  it("aceita a resposta degradada, que vem sem latência", () => {
    const parsed = healthSchema.parse({
      status: "degradado",
      timestamp: "2026-09-02T21:57:03.482Z",
      uptimeSeconds: 8,
      dependencies: { database: { status: "indisponivel" } },
    })

    expect(parsed.status).toBe("degradado")
    expect(parsed.dependencies.database.latencyMs).toBeUndefined()
  })
})

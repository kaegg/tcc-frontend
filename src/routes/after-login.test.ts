import { describe, expect, it } from "vitest"

import { afterLoginPath } from "@/routes/after-login"

const de = (pathname: unknown, search?: unknown) => ({
  from: { pathname, search },
})

describe("afterLoginPath", () => {
  it("sem rota guardada vai ao dashboard", () => {
    expect(afterLoginPath(null)).toBe("/dashboard")
    expect(afterLoginPath(undefined)).toBe("/dashboard")
    expect(afterLoginPath({})).toBe("/dashboard")
  })

  it("volta à rota privada que o usuário tentou abrir, com a consulta", () => {
    expect(
      afterLoginPath(de("/relatorios", "?from=2026-09-01&to=2026-09-30")),
    ).toBe("/relatorios?from=2026-09-01&to=2026-09-30")
    expect(afterLoginPath(de("/lancamentos"))).toBe("/lancamentos")
  })

  it.each([
    ["//site-malicioso.com", "endereço de outro domínio"],
    ["/\\site-malicioso.com", "barra invertida que o navegador trata como //"],
    ["https://site-malicioso.com", "URL absoluta"],
    ["javascript:alert(1)", "esquema javascript"],
    ["relatorios", "caminho relativo"],
    [42, "valor que não é texto"],
  ])("recusa %j (%s)", (pathname: unknown, motivo: string) => {
    expect(afterLoginPath(de(pathname)), motivo).toBe("/dashboard")
  })

  it.each(["/login", "/cadastro"])(
    "recusa a rota pública %s, que faria o redirecionamento voltar a si",
    (pathname) => {
      expect(afterLoginPath(de(pathname))).toBe("/dashboard")
    },
  )

  it("ignora consulta que não é texto", () => {
    expect(afterLoginPath(de("/relatorios", { x: 1 }))).toBe("/relatorios")
  })
})

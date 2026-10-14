import { describe, expect, it } from "vitest"

import { socketUrl } from "@/lib/chat/protocol"

describe("socketUrl", () => {
  it("usa a origem da API absoluta, sem o prefixo /api", () => {
    expect(socketUrl("http://localhost:3000/api")).toBe(
      "http://localhost:3000/chat",
    )
  })

  it("usa a mesma origem da página quando a API é relativa", () => {
    expect(socketUrl("/api")).toBe("/chat")
  })
})

import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { TermsPage } from "@/pages/terms-page"

describe("TermsPage", () => {
  it("explica a coleta anônima: o que entra, o que nunca entra e por quê", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", { name: "Termos de Uso" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        name: "4. Coleta anônima de dados de uso para a pesquisa",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/O que nunca é registrado/)).toBeInTheDocument()
    expect(
      screen.getByText(/não muda em nada a sua experiência/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /não são enviadas a empresas de inteligência artificial/,
      ),
    ).toBeInTheDocument()
  })
})

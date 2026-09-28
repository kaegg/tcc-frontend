import { describe, expect, it } from "vitest"

import { describeBalance, describeFlow } from "@/lib/report-describe"

const mes = (
  month: string,
  income: string,
  expense: string,
  balance: string,
  transactionCount = 1,
) => ({
  month,
  from: `${month}-01`,
  to: `${month}-28`,
  income,
  expense,
  balance,
  transactionCount,
})

const semNbsp = (texto: string) => texto.replace(/\u00a0/g, " ")

describe("describeFlow", () => {
  it("resume totais e os meses de pico", () => {
    expect(
      semNbsp(
        describeFlow(
          [
            mes("2026-07", "100.00", "300.00", "-200.00"),
            mes("2026-08", "900.00", "50.00", "850.00"),
          ],
          { income: "1000.00", expense: "350.00" },
        ),
      ),
    ).toBe(
      "Em 2 meses, receitas somam R$ 1.000,00 e despesas R$ 350,00. " +
        "Maior receita em agosto de 2026 (R$ 900,00). " +
        "Maior despesa em julho de 2026 (R$ 300,00).",
    )
  })

  it("não inventa pico de despesa quando não houve despesa", () => {
    expect(
      semNbsp(
        describeFlow(
          [
            mes("2026-07", "100.00", "0.00", "100.00"),
            mes("2026-08", "50.00", "0.00", "50.00"),
          ],
          { income: "150.00", expense: "0.00" },
        ),
      ),
    ).not.toContain("Maior despesa")
  })

  it("período vazio", () => {
    expect(
      describeFlow([mes("2026-07", "0.00", "0.00", "0.00", 0)], {
        income: "0.00",
        expense: "0.00",
      }),
    ).toBe("Nenhum lançamento no período.")
  })
})

describe("describeBalance", () => {
  it("um mês só diz o saldo dele", () => {
    expect(
      semNbsp(describeBalance([mes("2026-09", "10.00", "15.00", "-5.00")])),
    ).toBe("Saldo de -R$ 5,00 em setembro de 2026.")
  })
})

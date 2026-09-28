import { useState } from "react"

import { CategoryBreakdown } from "@/components/app/category-breakdown"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReportOverview } from "@/lib/api/schemas"
import { formatCurrency, formatDate } from "@/lib/format"
import { formatMonth, monthPeriod } from "@/lib/report-month"
import { cn } from "@/lib/utils"

const money = (value: string) => formatCurrency(Number(value))

/** Saldo com cor pelo sinal; o sinal também vem escrito, não só na cor. */
function Balance({ value }: { value: string }) {
  const n = Number(value)

  return (
    <span className={cn(n > 0 && "text-success", n < 0 && "text-destructive")}>
      {money(value)}
    </span>
  )
}

/**
 * A tabela é a versão textual dos dois gráficos: os mesmos meses e valores, e
 * a linha de total é o total dos cartões — tudo da mesma resposta.
 */
export function MonthlyTable({ data }: { data: ReportOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento mensal</CardTitle>
        <CardDescription>
          Os mesmos dados dos gráficos, em formato de tabela
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">
              Receitas, despesas, saldo e quantidade de lançamentos por mês, de{" "}
              {formatDate(data.from)} a {formatDate(data.to)}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="pl-6">
                  Mês
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Receitas
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Despesas
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Saldo
                </TableHead>
                <TableHead scope="col" className="pr-6 text-right">
                  Lançamentos
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.months.map((m) => {
                const whole = monthPeriod(m.month)
                const partial = m.from !== whole.from || m.to !== whole.to

                return (
                  <TableRow key={m.month}>
                    <TableCell className="pl-6">
                      <span className="inline-block first-letter:uppercase">
                        {formatMonth(m.month)}
                      </span>
                      {partial ? (
                        <span className="block text-xs text-muted-foreground">
                          de {formatDate(m.from)} a {formatDate(m.to)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="financial-value text-right">
                      {money(m.income)}
                    </TableCell>
                    <TableCell className="financial-value text-right">
                      {money(m.expense)}
                    </TableCell>
                    <TableCell className="financial-value text-right">
                      <Balance value={m.balance} />
                    </TableCell>
                    <TableCell className="financial-value pr-6 text-right">
                      {m.transactionCount}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableHead scope="row" className="pl-6">
                  Total
                </TableHead>
                <TableCell className="financial-value text-right">
                  {money(data.income)}
                </TableCell>
                <TableCell className="financial-value text-right">
                  {money(data.expense)}
                </TableCell>
                <TableCell className="financial-value text-right">
                  <Balance value={data.balance} />
                </TableCell>
                <TableCell className="financial-value pr-6 text-right">
                  {data.transactionCount}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/** Um só matiz e o valor escrito ao lado de cada barra (padrão do protótipo). */
export function CategoryDistribution({ data }: { data: ReportOverview }) {
  const [type, setType] = useState<"despesa" | "receita">("despesa")
  const items =
    type === "despesa" ? data.expenseByCategory : data.incomeByCategory
  const total = type === "despesa" ? data.expense : data.income

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por categoria</CardTitle>
        <CardDescription>
          {type === "despesa" ? "Despesas" : "Receitas"} do período · total de{" "}
          {money(total)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={type}
          onValueChange={(value) =>
            setType(value === "receita" ? "receita" : "despesa")
          }
        >
          <TabsList aria-label="Tipo da distribuição">
            <TabsTrigger value="despesa">Despesas</TabsTrigger>
            <TabsTrigger value="receita">Receitas</TabsTrigger>
          </TabsList>
        </Tabs>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {type === "despesa"
              ? "Nenhuma despesa no período."
              : "Nenhuma receita no período."}
          </p>
        ) : (
          <CategoryBreakdown items={items} />
        )}
      </CardContent>
    </Card>
  )
}

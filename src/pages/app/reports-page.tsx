import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  CircleAlert,
  Download,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { CategoryBreakdown } from "@/components/app/category-breakdown"
import { PageHeader } from "@/components/app/page-header"
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { monthlySeries, transactions } from "@/lib/demo-data"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from "@/lib/format"
import { sumTotals, totalsByCategory } from "@/lib/finance"
import {
  BACKEND_UNAVAILABLE_MESSAGE,
  simulateRequest,
} from "@/lib/pending-backend"

const flowConfig = {
  receitas: { label: "Receitas", color: "var(--chart-1)" },
  despesas: { label: "Despesas", color: "var(--chart-2)" },
} satisfies ChartConfig

const balanceConfig = {
  saldo: { label: "Saldo", color: "var(--chart-1)" },
} satisfies ChartConfig

const totals = sumTotals(transactions)
const expensesByCategory = totalsByCategory(transactions, "despesa")
const balanceSeries = monthlySeries.map((point) => ({
  month: point.month,
  saldo: point.receitas - point.despesas,
}))

type ViewState = "pronto" | "carregando" | "erro"

export function ReportsPage() {
  const [period, setPeriod] = useState("6m")
  const [state, setState] = useState<ViewState>("pronto")
  const animate = !usePrefersReducedMotion()

  async function reload(nextPeriod: string | null) {
    if (!nextPeriod) return
    setPeriod(nextPeriod)
    setState("carregando")
    await simulateRequest(700)
    setState("pronto")
  }

  async function retry() {
    setState("carregando")
    await simulateRequest(700)
    setState("pronto")
  }

  async function exportReport() {
    await simulateRequest(500)
    toast.success("Relatório exportado", {
      description: "A exportação real será implementada com o backend.",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Consolidação das receitas, despesas e saldo do período."
        actions={
          <Button variant="outline" className="h-9" onClick={exportReport}>
            <Download />
            Exportar
          </Button>
        }
      />

      {/* Um único controle de período acima de tudo que ele afeta: todos os
          gráficos e a tabela respondem ao mesmo recorte. */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="periodo" className="text-sm text-muted-foreground">
          Período
        </label>
        <Select value={period} onValueChange={reload}>
          <SelectTrigger id="periodo" className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          className="h-9"
          onClick={() => setState("erro")}
        >
          Simular falha
        </Button>
      </div>

      {state === "erro" ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Falha ao carregar o relatório</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{BACKEND_UNAVAILABLE_MESSAGE}</p>
            <Button variant="outline" className="h-8" onClick={retry}>
              <RefreshCw />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <section
            aria-label="Indicadores do período"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {state === "carregando" ? (
              Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Receitas totais"
                  value={formatCurrency(totals.receitas)}
                  icon={TrendingUp}
                />
                <StatCard
                  label="Despesas totais"
                  value={formatCurrency(totals.despesas)}
                  icon={TrendingDown}
                />
                <StatCard
                  label="Saldo"
                  value={formatCurrency(totals.saldo)}
                  tone={totals.saldo >= 0 ? "positive" : "negative"}
                  icon={Wallet}
                />
                <StatCard
                  label="Economia"
                  value={formatPercent(totals.taxaEconomia)}
                  icon={PiggyBank}
                />
              </>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receitas x Despesas</CardTitle>
                <CardDescription>Comparação mês a mês</CardDescription>
              </CardHeader>
              <CardContent>
                {state === "carregando" ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ChartContainer
                    config={flowConfig}
                    className="aspect-auto h-64 w-full"
                  >
                    <BarChart
                      data={monthlySeries}
                      margin={{ left: 4, right: 12, top: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickMargin={6}
                        tickFormatter={(v: number) => formatCurrencyCompact(v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatCurrency(Number(v))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {/* barSize fino e raio nas pontas de dado; o espaçamento
                          entre as barras deixa o fundo aparecer no lugar de uma
                          borda desenhada. */}
                      <Bar
                        dataKey="receitas"
                        fill="var(--color-receitas)"
                        radius={[4, 4, 0, 0]}
                        barSize={14}
                        isAnimationActive={animate}
                      />
                      <Bar
                        dataKey="despesas"
                        fill="var(--color-despesas)"
                        radius={[4, 4, 0, 0]}
                        barSize={14}
                        isAnimationActive={animate}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução do saldo</CardTitle>
                <CardDescription>
                  Quanto sobrou em cada mês do período
                </CardDescription>
              </CardHeader>
              <CardContent>
                {state === "carregando" ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ChartContainer
                    config={balanceConfig}
                    className="aspect-auto h-64 w-full"
                  >
                    <LineChart
                      data={balanceSeries}
                      margin={{ left: 4, right: 12, top: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickMargin={6}
                        tickFormatter={(v: number) => formatCurrencyCompact(v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatCurrency(Number(v))}
                          />
                        }
                      />
                      <Line
                        dataKey="saldo"
                        type="monotone"
                        stroke="var(--color-saldo)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={animate}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Distribuição por categoria</CardTitle>
                <CardDescription>Despesas do período</CardDescription>
              </CardHeader>
              <CardContent>
                {state === "carregando" ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <CategoryBreakdown items={expensesByCategory} />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Detalhamento mensal</CardTitle>
                <CardDescription>
                  Os mesmos dados dos gráficos, em formato de tabela
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Mês</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="pr-6 text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySeries.map((point) => {
                      const saldo = point.receitas - point.despesas
                      return (
                        <TableRow key={point.month}>
                          <TableCell className="pl-6">{point.month}</TableCell>
                          <TableCell className="financial-value text-right">
                            {formatCurrency(point.receitas)}
                          </TableCell>
                          <TableCell className="financial-value text-right">
                            {formatCurrency(point.despesas)}
                          </TableCell>
                          <TableCell className="financial-value pr-6 text-right">
                            {formatCurrency(saldo)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

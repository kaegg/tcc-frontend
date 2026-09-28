import { Link, useSearchParams } from "react-router-dom"
import {
  CircleAlert,
  List,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card"
import {
  BalanceChart,
  IncomeExpenseChart,
} from "@/components/reports/report-charts"
import {
  CategoryDistribution,
  MonthlyTable,
} from "@/components/reports/report-details"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useReportOverview } from "@/hooks/use-reports"
import { describeApiError } from "@/lib/api/errors"
import type { ReportPeriod } from "@/lib/api/reports"
import type { ReportOverview } from "@/lib/api/schemas"
import { formatCurrency, formatDate } from "@/lib/format"
import {
  matchingPreset,
  periodFromParams,
  presetPeriod,
  PRESETS,
  reportPeriodError,
  type PresetValue,
} from "@/lib/report-period"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

const MIN_DATE = "2000-01-01"
const MAX_DATE = "2100-01-01"
const CUSTOM = "personalizado"

const PERIOD_ITEMS = [...PRESETS, { value: CUSTOM, label: "Personalizado" }]

/**
 * Formatação, não aritmética: os totais chegam prontos do backend em texto
 * decimal e só viram `number` para exibir.
 */
const money = (amount: string) => formatCurrency(Number(amount))

export function ReportsPage() {
  const [params, setParams] = useSearchParams()

  // O período vive na URL, como os filtros da listagem: sobrevive a recarregar
  // e o link "Ver lançamentos do período" leva o mesmo recorte.
  const period = periodFromParams(params)
  const invalidPeriod = reportPeriodError(period)
  const preset = matchingPreset(period)

  // Uma consulta alimenta cartões, gráficos e tabela: trocar o período muda
  // todos juntos, e nenhum deles pode mostrar um recorte diferente.
  const query = useReportOverview(period, invalidPeriod === null)

  function changePeriod(next: ReportPeriod) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        copy.set("from", next.from)
        copy.set("to", next.to)
        return copy
      },
      { replace: true },
    )
  }

  function choosePreset(value: string | null) {
    const found = PRESETS.find((item) => item.value === value)
    if (found) changePeriod(presetPeriod(found.value as PresetValue))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Receitas, despesas e saldo do período escolhido."
      />

      <Card>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="relatorio-periodo">Período</FieldLabel>
              <Select
                value={preset ?? CUSTOM}
                onValueChange={choosePreset}
                items={PERIOD_ITEMS}
              >
                <SelectTrigger id="relatorio-periodo" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_ITEMS.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      // Personalizado é o estado de quem edita as datas, não
                      // uma escolha que produza um período.
                      disabled={item.value === CUSTOM}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="relatorio-de">De</FieldLabel>
              <Input
                id="relatorio-de"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                className="h-9"
                value={period.from}
                onChange={(event) =>
                  event.target.value &&
                  changePeriod({ ...period, from: event.target.value })
                }
              />
            </Field>

            <Field data-invalid={Boolean(invalidPeriod)}>
              <FieldLabel htmlFor="relatorio-ate">Até</FieldLabel>
              <Input
                id="relatorio-ate"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                className="h-9"
                value={period.to}
                aria-invalid={Boolean(invalidPeriod)}
                aria-describedby={
                  invalidPeriod ? "relatorio-periodo-erro" : undefined
                }
                onChange={(event) =>
                  event.target.value &&
                  changePeriod({ ...period, to: event.target.value })
                }
              />
              <FieldError
                id="relatorio-periodo-erro"
                errors={invalidPeriod ? [{ message: invalidPeriod }] : []}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {invalidPeriod && !query.data ? null : query.isPending ? (
        <section
          aria-label="Carregando relatório do período"
          aria-busy="true"
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </section>
      ) : query.isError && !query.data ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Não foi possível carregar o relatório</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{describeApiError(query.error)}</p>
            <Button
              variant="outline"
              className="h-8"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw />
              {query.isFetching ? "Carregando..." : "Tentar novamente"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : query.data ? (
        <Overview
          data={query.data}
          updating={query.isFetching && query.isPlaceholderData}
        />
      ) : null}
    </div>
  )
}

function Overview({
  data,
  updating,
}: {
  data: ReportOverview
  updating: boolean
}) {
  const balance = Number(data.balance)
  const periodQuery = new URLSearchParams({ from: data.from, to: data.to })

  return (
    <section
      aria-labelledby="relatorio-titulo"
      aria-busy={updating}
      // Enquanto o novo período carrega, o anterior fica visível e esmaecido,
      // para não parecer que os números já são do período escolhido.
      className={cn("space-y-4 transition-opacity", updating && "opacity-60")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="relatorio-titulo" className="text-base font-medium">
          De {formatDate(data.from)} a {formatDate(data.to)}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {data.transactionCount === 1
              ? "1 lançamento"
              : `${data.transactionCount} lançamentos`}
          </span>
        </h2>
        <Link
          to={`${paths.app.transactions}?${periodQuery.toString()}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-8")}
        >
          <List />
          Ver lançamentos do período
        </Link>
      </div>

      <div
        role="group"
        aria-label="Indicadores do período"
        aria-live="polite"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Receitas totais"
          value={money(data.income)}
          icon={TrendingUp}
        />
        <StatCard
          label="Despesas totais"
          value={money(data.expense)}
          icon={TrendingDown}
        />
        <StatCard
          label="Saldo"
          value={money(data.balance)}
          tone={balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral"}
          icon={Wallet}
        />
        <StatCard
          label="Economia"
          value={
            data.savingsRate === null
              ? "Sem receitas"
              : `${data.savingsRate.replace(".", ",")}%`
          }
          icon={PiggyBank}
        />
      </div>

      {data.transactionCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento neste período.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <IncomeExpenseChart
          months={data.months}
          totals={{ income: data.income, expense: data.expense }}
        />
        <BalanceChart months={data.months} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CategoryDistribution data={data} />
        </div>
        <div className="lg:col-span-3">
          <MonthlyTable data={data} />
        </div>
      </div>
    </section>
  )
}

import { Link, useSearchParams } from "react-router-dom"
import {
  CircleAlert,
  List,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePeriodSummary } from "@/hooks/use-reports"
import { describeApiError } from "@/lib/api/errors"
import type { ReportPeriod } from "@/lib/api/reports"
import type { PeriodSummary } from "@/lib/api/schemas"
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

  const query = usePeriodSummary(period, invalidPeriod === null)

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
          aria-label="Carregando totais do período"
          aria-busy="true"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
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
        <Summary data={query.data} />
      ) : null}
    </div>
  )
}

function Summary({ data }: { data: PeriodSummary }) {
  const balance = Number(data.balance)
  const periodQuery = new URLSearchParams({ from: data.from, to: data.to })

  return (
    <section aria-labelledby="totais-titulo" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="totais-titulo" className="text-base font-medium">
          De {formatDate(data.from)} a {formatDate(data.to)}
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
        aria-live="polite"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Receitas"
          value={money(data.income)}
          icon={TrendingUp}
        />
        <StatCard
          label="Despesas"
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
          label="Lançamentos"
          value={String(data.transactionCount)}
          icon={ReceiptText}
        />
      </div>

      {data.transactionCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento neste período.
        </p>
      ) : null}
    </section>
  )
}

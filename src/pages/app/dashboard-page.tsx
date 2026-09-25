import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowRight,
  CircleAlert,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { CategoryBreakdown } from "@/components/app/category-breakdown"
import { MonthPicker } from "@/components/app/month-picker"
import { PageHeader } from "@/components/app/page-header"
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card"
import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMonthlySummary } from "@/hooks/use-reports"
import { useTransactions } from "@/hooks/use-transactions"
import { describeApiError } from "@/lib/api/errors"
import type { CategoryTotal, MonthlySummary } from "@/lib/api/schemas"
import { formatCurrency, formatDate } from "@/lib/format"
import { formatMonth, monthFromParams, monthPeriod } from "@/lib/report-month"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

const LATEST_COUNT = 6

/** Formatação, não aritmética: os valores chegam prontos do backend. */
const money = (amount: string) => formatCurrency(Number(amount))

export function DashboardPage() {
  const [params, setParams] = useSearchParams()

  // Mês na URL, como os filtros da listagem e o período dos relatórios.
  const month = monthFromParams(params)
  const period = monthPeriod(month)
  const monthName = formatMonth(month)

  const summary = useMonthlySummary(month)
  // Mesmo recorte do resumo: as movimentações mostradas são as que ele somou.
  const latest = useTransactions(1, period)

  function changeMonth(next: string) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        copy.set("month", next)
        return copy
      },
      { replace: true },
    )
  }

  const monthQuery = new URLSearchParams(period).toString()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Sua situação financeira de ${monthName}.`}
        actions={
          <>
            <Link
              to={paths.app.assistant}
              className={cn(buttonVariants({ variant: "outline" }), "h-9")}
            >
              <Sparkles />
              Assistente
            </Link>
            <Link
              to={paths.app.newTransaction}
              className={cn(buttonVariants(), "h-9")}
            >
              <Plus />
              Novo lançamento
            </Link>
          </>
        }
      />

      <MonthPicker value={month} onChange={changeMonth} />

      {summary.isPending ? (
        <section
          aria-label="Carregando resumo do mês"
          aria-busy="true"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </section>
      ) : summary.isError && !summary.data ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Não foi possível carregar o resumo do mês</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{describeApiError(summary.error)}</p>
            <Button
              variant="outline"
              className="h-8"
              onClick={() => void summary.refetch()}
              disabled={summary.isFetching}
            >
              <RefreshCw />
              {summary.isFetching ? "Carregando..." : "Tentar novamente"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <MonthOverview data={summary.data} />
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Últimas movimentações</CardTitle>
            <CardDescription>
              Os lançamentos mais recentes de {monthName}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {latest.isPending ? (
              <div
                role="status"
                aria-label="Carregando movimentações"
                className="space-y-3 px-6"
              >
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : latest.isError && !latest.data ? (
              <p className="px-6 text-sm text-muted-foreground">
                {describeApiError(latest.error)}
              </p>
            ) : latest.data.data.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">
                Nenhum lançamento em {monthName}.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="pr-6 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latest.data.data.slice(0, LATEST_COUNT).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6">
                        <span className="block max-w-56 truncate">
                          {item.description}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.categoryName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TransactionTypeBadge type={item.type} />
                      </TableCell>
                      <TableCell className="financial-value text-muted-foreground">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "financial-value pr-6 text-right",
                          item.type === "receita"
                            ? "text-success"
                            : "text-foreground",
                        )}
                      >
                        {item.type === "receita" ? "+" : "−"}{" "}
                        {money(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-3 px-6">
              <Link
                to={`${paths.app.transactions}?${monthQuery}`}
                className={cn(buttonVariants({ variant: "ghost" }), "h-9")}
              >
                Ver todos os lançamentos do mês
                <ArrowRight />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="ring-ai/25 h-fit lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-ai-accent flex items-center gap-2">
              <Sparkles className="size-4" />
              Assistente IA
            </CardTitle>
            <CardDescription>
              Registre um lançamento escrevendo em linguagem natural, sem abrir
              formulário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-lg rounded-bl-sm bg-muted/60 px-3 py-2 text-sm">
              “Gastei R$ 35 com almoço hoje”
            </p>
            <p className="text-xs text-muted-foreground">
              O assistente interpreta a frase e mostra uma proposta de
              lançamento. Nada é salvo antes da sua confirmação.
            </p>
            <Link
              to={paths.app.assistant}
              className={cn(buttonVariants(), "h-9 w-full")}
            >
              Abrir assistente
              <ArrowRight />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MonthOverview({ data }: { data: MonthlySummary }) {
  const balance = Number(data.balance)

  return (
    <>
      <section
        aria-label="Indicadores do mês"
        aria-live="polite"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Saldo do mês"
          value={money(data.balance)}
          tone={balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral"}
          icon={Wallet}
        />
        <StatCard
          label="Receitas do mês"
          value={money(data.income)}
          icon={TrendingUp}
        />
        <StatCard
          label="Despesas do mês"
          value={money(data.expense)}
          icon={TrendingDown}
        />
        <StatCard
          label="Lançamentos"
          value={String(data.transactionCount)}
          icon={ReceiptText}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Distribution
          title="Despesas por categoria"
          total={data.expense}
          items={data.expenseByCategory}
          empty="Nenhuma despesa neste mês."
        />
        <Distribution
          title="Receitas por categoria"
          total={data.income}
          items={data.incomeByCategory}
          empty="Nenhuma receita neste mês."
        />
      </div>
    </>
  )
}

function Distribution({
  title,
  total,
  items,
  empty,
}: {
  title: string
  total: string
  items: CategoryTotal[]
  empty: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Total de {money(total)}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <CategoryBreakdown items={items} />
        )}
      </CardContent>
    </Card>
  )
}

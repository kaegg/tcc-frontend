import { Link } from "react-router-dom"
import {
  ArrowRight,
  PiggyBank,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { CategoryBreakdown } from "@/components/app/category-breakdown"
import { MonthlyFlowChart } from "@/components/app/monthly-flow-chart"
import { PageHeader } from "@/components/app/page-header"
import { StatCard } from "@/components/app/stat-card"
import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
import { buttonVariants } from "@/components/ui/button"
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { categoryName, monthlySeries, transactions } from "@/lib/demo-data"
import { formatCurrency, formatDate, formatPercent } from "@/lib/format"
import {
  inMonth,
  sortByDateDesc,
  sumTotals,
  totalsByCategory,
} from "@/lib/finance"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

const currentMonth = inMonth(transactions, 2026, 8)
const totals = sumTotals(currentMonth)
const previous = monthlySeries.at(-2)
const expensesByCategory = totalsByCategory(currentMonth, "despesa").slice(0, 5)
const latest = sortByDateDesc(transactions).slice(0, 6)

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sua situação financeira de agosto de 2026."
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

      <section
        aria-label="Indicadores do mês"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Saldo atual"
          value={formatCurrency(totals.saldo)}
          tone={totals.saldo >= 0 ? "positive" : "negative"}
          icon={Wallet}
          delta={{
            value: "Receitas menos despesas do mês",
            direction: totals.saldo >= 0 ? "up" : "down",
          }}
        />
        <StatCard
          label="Receitas do mês"
          value={formatCurrency(totals.receitas)}
          icon={TrendingUp}
          delta={{
            value: `Mês anterior: ${formatCurrency(previous?.receitas ?? 0)}`,
            direction: "up",
          }}
        />
        <StatCard
          label="Despesas do mês"
          value={formatCurrency(totals.despesas)}
          icon={TrendingDown}
          delta={{
            value: `Mês anterior: ${formatCurrency(previous?.despesas ?? 0)}`,
            direction: "down",
          }}
        />
        <StatCard
          label="Economia do mês"
          value={formatPercent(totals.taxaEconomia)}
          icon={PiggyBank}
          delta={{
            value: `${formatCurrency(totals.saldo)} guardados`,
            direction: "up",
          }}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas e despesas</CardTitle>
            <CardDescription>Últimos seis meses</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyFlowChart data={monthlySeries} />
          </CardContent>
        </Card>

        <Card className="ring-ai/25">
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

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
            <CardDescription>Agosto de 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown items={expensesByCategory} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Últimas movimentações</CardTitle>
            <CardDescription>Os seis lançamentos mais recentes</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
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
                {latest.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6">
                      <span className="block max-w-56 truncate">
                        {item.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {categoryName(item.categoryId)}
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
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <Link
          to={paths.app.transactions}
          className={cn(buttonVariants({ variant: "ghost" }), "h-9")}
        >
          Ver todos os lançamentos
          <ArrowRight />
        </Link>
      </div>
    </div>
  )
}

import { useId } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

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
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { MonthTotals } from "@/lib/api/schemas"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"
import { describeBalance, describeFlow } from "@/lib/report-describe"
import { formatMonthShort } from "@/lib/report-month"

/** A cor segue a entidade: receitas no slot 1 e despesas no 2, sempre. */
const flowConfig = {
  receitas: { label: "Receitas", color: "var(--chart-1)" },
  despesas: { label: "Despesas", color: "var(--chart-2)" },
} satisfies ChartConfig

/** Saldo é outra medida: slot próprio, e gráfico próprio (um eixo só). */
const balanceConfig = {
  saldo: { label: "Saldo", color: "var(--chart-5)" },
} satisfies ChartConfig

/**
 * Os valores chegam como texto decimal e só viram `number` aqui, para
 * desenhar: é posição de barra, não aritmética.
 */
function toPoints(months: MonthTotals[]) {
  return months.map((m) => ({
    month: formatMonthShort(m.month),
    receitas: Number(m.income),
    despesas: Number(m.expense),
    saldo: Number(m.balance),
  }))
}

const axisProps = {
  tickLine: false,
  axisLine: false,
} as const

/**
 * Cartão de gráfico com descrição textual. O SVG fica fora da árvore de
 * acessibilidade e sem foco (`accessibilityLayer` desligado): um elemento
 * focável dentro de `aria-hidden` seria alcançável pelo teclado e mudo para o
 * leitor de tela. A descrição e a tabela detalhada carregam os números.
 */
function ChartCard({
  title,
  subtitle,
  description,
  children,
}: {
  title: string
  subtitle: string
  description: string
  children: React.ReactNode
}) {
  const descriptionId = useId()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <figure aria-label={title} aria-describedby={descriptionId}>
          <div aria-hidden="true">{children}</div>
          <figcaption
            id={descriptionId}
            className="mt-3 text-sm text-muted-foreground"
          >
            {description}
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  )
}

export function IncomeExpenseChart({
  months,
  totals,
}: {
  months: MonthTotals[]
  totals: { income: string; expense: string }
}) {
  const animate = !usePrefersReducedMotion()

  return (
    <ChartCard
      title="Receitas x Despesas"
      subtitle="Comparação mês a mês"
      description={describeFlow(months, totals)}
    >
      <ChartContainer config={flowConfig} className="aspect-auto h-64 w-full">
        <BarChart
          data={toPoints(months)}
          margin={{ left: 4, right: 12, top: 8 }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" {...axisProps} tickMargin={10} />
          <YAxis
            {...axisProps}
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
          <Bar
            dataKey="receitas"
            fill="var(--color-receitas)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={animate}
          />
          <Bar
            dataKey="despesas"
            fill="var(--color-despesas)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={animate}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

export function BalanceChart({ months }: { months: MonthTotals[] }) {
  const animate = !usePrefersReducedMotion()

  return (
    <ChartCard
      title="Evolução do saldo"
      subtitle="Quanto sobrou em cada mês do período"
      description={describeBalance(months)}
    >
      <ChartContainer
        config={balanceConfig}
        className="aspect-auto h-64 w-full"
      >
        <LineChart
          data={toPoints(months)}
          margin={{ left: 4, right: 12, top: 8 }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" {...axisProps} tickMargin={10} />
          <YAxis
            {...axisProps}
            width={70}
            tickMargin={6}
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
          />
          {/* Linha do zero: separa mês com sobra de mês no vermelho. */}
          <ReferenceLine y={0} stroke="var(--border)" />
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
            dot={months.length === 1}
            activeDot={{ r: 4 }}
            isAnimationActive={animate}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"
import type { MonthlyPoint } from "@/lib/types"

/**
 * Evolução de receitas e despesas ao longo dos meses.
 */
const chartConfig = {
  receitas: { label: "Receitas", color: "var(--chart-1)" },
  despesas: { label: "Despesas", color: "var(--chart-2)" },
} satisfies ChartConfig

export function MonthlyFlowChart({ data }: { data: MonthlyPoint[] }) {
  const animate = !usePrefersReducedMotion()

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
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
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="receitas"
          type="monotone"
          stroke="var(--color-receitas)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={animate}
        />
        <Line
          dataKey="despesas"
          type="monotone"
          stroke="var(--color-despesas)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={animate}
        />
      </LineChart>
    </ChartContainer>
  )
}

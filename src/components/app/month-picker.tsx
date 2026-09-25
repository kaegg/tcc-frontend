import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  currentMonth,
  formatMonth,
  isValidMonth,
  MAX_MONTH,
  MIN_MONTH,
  MONTH_NAMES,
  shiftMonth,
} from "@/lib/report-month"

const MONTH_ITEMS = MONTH_NAMES.map((name, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: name.charAt(0).toUpperCase() + name.slice(1),
}))

/** Anos próximos ao atual; o ano escolhido entra mesmo se estiver fora da faixa. */
function yearItems(selectedYear: number) {
  const now = new Date().getFullYear()
  const years = new Set<number>([selectedYear])
  for (let year = now - 5; year <= now + 1; year++) years.add(year)

  return [...years]
    .filter((year) => year >= 2000 && year <= 2100)
    .sort((a, b) => b - a)
    .map((year) => ({ value: String(year), label: String(year) }))
}

/**
 * Setas para o mês vizinho mais seleção direta de mês e ano. Não usa
 * `<input type="month">`: o Firefox o exibe como campo de texto livre.
 */
export function MonthPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (month: string) => void
}) {
  const [year, month] = value.split("-")
  const years = yearItems(Number(year))
  const today = currentMonth()

  function go(next: string) {
    if (isValidMonth(next)) onChange(next)
  }

  return (
    <div
      role="group"
      aria-label="Mês de referência"
      className="flex flex-wrap items-center gap-2"
    >
      <Button
        variant="outline"
        size="icon-sm"
        className="size-9"
        aria-label={`Mês anterior (${formatMonth(shiftMonth(value, -1))})`}
        disabled={value <= MIN_MONTH}
        onClick={() => go(shiftMonth(value, -1))}
      >
        <ChevronLeft />
      </Button>

      <Select
        value={month}
        onValueChange={(next) => next && go(`${year}-${next}`)}
        items={MONTH_ITEMS}
      >
        <SelectTrigger aria-label="Mês" className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={year}
        onValueChange={(next) => next && go(`${next}-${month}`)}
        items={years}
      >
        <SelectTrigger aria-label="Ano" className="h-9 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon-sm"
        className="size-9"
        aria-label={`Próximo mês (${formatMonth(shiftMonth(value, 1))})`}
        disabled={value >= MAX_MONTH}
        onClick={() => go(shiftMonth(value, 1))}
      >
        <ChevronRight />
      </Button>

      {value !== today ? (
        <Button variant="ghost" className="h-9" onClick={() => onChange(today)}>
          Mês atual
        </Button>
      ) : null}
    </div>
  )
}

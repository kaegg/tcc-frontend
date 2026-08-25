import { formatCurrency } from "@/lib/format"
import type { CategoryTotal } from "@/lib/types"

/**
 * Distribuição de um valor entre categorias.
 */
export function CategoryBreakdown({ items }: { items: CategoryTotal[] }) {
  const max = Math.max(...items.map((item) => item.total), 0)

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.categoryId} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{item.name}</span>
            <span className="financial-value text-muted-foreground">
              {formatCurrency(item.total)}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-chart-1"
              style={{ width: `${max > 0 ? (item.total / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

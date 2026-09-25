import type { CategoryTotal } from "@/lib/api/schemas"
import { formatCurrency } from "@/lib/format"

const percent = (share: string) => `${share.replace(".", ",")}%`

/**
 * Distribuição de um tipo entre categorias, como veio do backend: total,
 * percentual e quantidade já calculados lá, para o chatbot dizer os mesmos
 * números. A barra é só visual; o texto ao lado carrega a informação.
 */
export function CategoryBreakdown({ items }: { items: CategoryTotal[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.categoryId} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>
              {item.categoryName}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {item.transactionCount === 1
                  ? "1 lançamento"
                  : `${item.transactionCount} lançamentos`}
              </span>
            </span>
            <span className="financial-value text-right">
              {formatCurrency(Number(item.total))}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {percent(item.share)}
              </span>
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-chart-1"
              style={{ width: `${Math.min(Number(item.share), 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

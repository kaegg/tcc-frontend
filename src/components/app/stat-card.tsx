import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Cartão de indicador financeiro: rótulo, valor e variação em relação ao período anterior.
 */
export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  icon: Icon,
}: {
  label: string
  value: string
  delta?: { value: string; direction: "up" | "down" }
  tone?: "neutral" | "positive" | "negative"
  icon?: React.ComponentType<{ className?: string }>
}) {
  const DeltaIcon = delta?.direction === "up" ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {Icon && <Icon className="size-4" />}
          {label}
        </div>

        <p
          className={cn(
            "financial-figure text-2xl font-semibold",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>

        {delta && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DeltaIcon className="size-3.5" aria-hidden="true" />
            {delta.value}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

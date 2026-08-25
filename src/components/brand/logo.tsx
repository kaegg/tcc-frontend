import { ChartNoAxesCombined } from "lucide-react"

import { cn } from "@/lib/utils"

export function LogoMark({ className, ...props }: React.ComponentProps<typeof ChartNoAxesCombined>) {
  return <ChartNoAxesCombined className={cn("size-5", className)} {...props} />
}

export function Logo({
  className,
  showWordmark = true,
  ...props
}: React.ComponentProps<"div"> & { showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} {...props}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <LogoMark />
      </span>
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          IntelliFinance
        </span>
      )}
    </div>
  )
}

import { Link } from "react-router-dom"

import { Logo } from "@/components/brand/logo"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
      </div>
      <Link
        to={paths.public.login}
        className={cn(buttonVariants({ variant: "outline" }), "h-10")}
      >
        Voltar para o início
      </Link>
    </main>
  )
}

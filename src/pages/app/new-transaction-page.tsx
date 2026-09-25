import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { queryKeys } from "@/lib/api/query-keys"
import { createTransaction } from "@/lib/api/transactions"
import { todayIso } from "@/lib/format"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

export function NewTransactionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Calculado no render, e não na carga do módulo: numa sessão aberta durante
  // a virada do dia, a data padrão ficaria presa no dia anterior. E vem do
  // fuso local, não de UTC, senão à noite o formulário abre com a data de
  // amanhã já preenchida.
  const today = useMemo(() => todayIso(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo lançamento"
        description="Registre uma receita ou despesa pelo formulário."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle>Dados do lançamento</CardTitle>
            <CardDescription>Todos os campos são obrigatórios.</CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionForm
              defaultValues={{
                type: "despesa",
                categoryId: "",
                date: today,
                description: "",
              }}
              save={createTransaction}
              onSaved={async (criado) => {
                // A lista precisa refletir o lançamento novo ao chegar em /lancamentos.
                await queryClient.invalidateQueries({
                  queryKey: queryKeys.transactionsAll,
                })
                toast.success("Lançamento salvo", {
                  description: criado.description,
                })
                navigate(paths.app.transactions)
              }}
              submitLabel="Salvar"
              errorTitle="Não foi possível salvar o lançamento"
            />
          </CardContent>
        </Card>

        <Card className="ring-ai/25 h-fit">
          <CardHeader>
            <CardTitle className="text-ai-accent flex items-center gap-2">
              <Sparkles className="size-4" />A mesma tarefa por conversa
            </CardTitle>
            <CardDescription>
              Este é o formulário convencional. A mesma receita ou despesa pode
              ser registrada escrevendo uma frase para o assistente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-lg rounded-bl-sm bg-muted/60 px-3 py-2 text-sm">
              “Gastei R$ 35 com almoço hoje”
            </p>
            <Link
              to={paths.app.assistant}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-9 w-full",
              )}
            >
              Abrir assistente
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

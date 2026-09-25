import { Link, useNavigate, useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { CircleAlert, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTransaction } from "@/hooks/use-transactions"
import { describeApiError, isApiError } from "@/lib/api/errors"
import { queryKeys } from "@/lib/api/query-keys"
import type { ApiTransaction } from "@/lib/api/schemas"
import { updateTransaction } from "@/lib/api/transactions"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

export function EditTransactionPage() {
  const { id = "" } = useParams()
  const query = useTransaction(id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar lançamento"
        description="Corrija os dados de uma receita ou despesa registrada."
      />

      <Card className="max-w-2xl [--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardTitle>Dados do lançamento</CardTitle>
          <CardDescription>Todos os campos são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isPending ? (
            <div
              role="status"
              aria-busy="true"
              aria-label="Carregando lançamento"
              className="space-y-4"
            >
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : query.isError ? (
            <LoadError
              error={query.error}
              retrying={query.isFetching}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <EditForm key={query.data.id} item={query.data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EditForm({ item }: { item: ApiTransaction }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <TransactionForm
      defaultValues={{
        type: item.type,
        amount: Number(item.amount),
        categoryId: item.categoryId,
        date: item.date,
        description: item.description,
      }}
      save={(input) => updateTransaction(item.id, input)}
      onSaved={async (salvo) => {
        // Lista, detalhe e (quando existirem) relatórios leem do mesmo prefixo.
        await queryClient.invalidateQueries({
          queryKey: queryKeys.transactionsAll,
        })
        toast.success("Lançamento atualizado", {
          description: salvo.description,
        })
        navigate(paths.app.transactions)
      }}
      submitLabel="Salvar alterações"
      errorTitle="Não foi possível salvar as alterações"
    />
  )
}

function LoadError({
  error,
  retrying,
  onRetry,
}: {
  error: unknown
  retrying: boolean
  onRetry: () => void
}) {
  // 404 não melhora com nova tentativa: o lançamento não existe, foi excluído
  // ou não é deste usuário, e o backend não distingue os três.
  const notFound = isApiError(error) && error.statusCode === 404

  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Não foi possível abrir o lançamento</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{describeApiError(error)}</p>
        <div className="flex flex-wrap gap-2">
          {notFound ? null : (
            <Button
              variant="outline"
              className="h-8"
              onClick={onRetry}
              disabled={retrying}
            >
              <RefreshCw />
              Tentar novamente
            </Button>
          )}
          <Link
            to={paths.app.transactions}
            className={cn(buttonVariants({ variant: "outline" }), "h-8")}
          >
            Voltar aos lançamentos
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  )
}

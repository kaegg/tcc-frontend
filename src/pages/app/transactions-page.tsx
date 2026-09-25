import { useCallback, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  SearchX,
  Sparkles,
  Trash2,
} from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog"
import { TransactionFiltersBar } from "@/components/transactions/transaction-filters-bar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTransaction, useTransactions } from "@/hooks/use-transactions"
import { describeApiError } from "@/lib/api/errors"
import type { ApiTransaction } from "@/lib/api/schemas"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import {
  filtersFromParams,
  hasFilters,
  pageFromParams,
  periodError,
  withFilters,
  withoutFilters,
  type FilterKey,
} from "@/lib/transaction-filters"
import { cn } from "@/lib/utils"
import { editTransactionPath, paths } from "@/routes/paths"

/**
 * O valor chega como texto decimal e só vira `number` aqui, na exibição:
 * é formatação, não aritmética, e o limite do banco (dez dígitos inteiros)
 * cabe com folga na precisão do `number`.
 */
const money = (amount: string) => formatCurrency(Number(amount))

const SKELETON_ROWS = 5

export function TransactionsPage() {
  const [params, setParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ApiTransaction | null>(null)

  // Página e filtros vivem na URL. `replace` evita que cada tecla da busca
  // vire uma entrada no histórico do navegador.
  const page = pageFromParams(params)
  const filters = filtersFromParams(params)
  const filtered = hasFilters(filters)
  const invalidPeriod = periodError(filters)

  const setPage = (update: number | ((current: number) => number)) => {
    const next = typeof update === "function" ? update(page) : update
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        if (next > 1) copy.set("page", String(next))
        else copy.delete("page")
        return copy
      },
      { replace: true },
    )
  }

  const changeFilters = useCallback(
    (patch: Partial<Record<FilterKey, string | undefined>>) =>
      setParams((current) => withFilters(current, patch), { replace: true }),
    [setParams],
  )

  const clearFilters = () =>
    setParams((current) => withoutFilters(current), { replace: true })

  // Período invertido não vai ao servidor; a lista anterior fica na tela.
  const query = useTransactions(page, filters, invalidPeriod === null)
  const meta = query.data?.meta
  const items = query.data?.data ?? []

  // Só a primeira carga mostra esqueleto; a troca de página mantém a atual.
  const loading = query.isPending
  const failed = query.isError && !query.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançamentos"
        description="Todas as suas receitas e despesas registradas."
        actions={
          <Link
            to={paths.app.newTransaction}
            className={cn(buttonVariants(), "h-9")}
          >
            <Plus />
            Novo lançamento
          </Link>
        }
      />

      <Card>
        <CardContent className="px-6">
          <TransactionFiltersBar
            filters={filters}
            periodError={invalidPeriod}
            onChange={changeFilters}
            onClear={clearFilters}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          {filtered && meta && !loading && !failed ? (
            <p
              aria-live="polite"
              className="mb-2 px-6 text-sm text-muted-foreground"
            >
              {meta.total === 1
                ? "1 lançamento encontrado"
                : `${meta.total} lançamentos encontrados`}
            </p>
          ) : null}

          {invalidPeriod && !query.data ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle>Ajuste o período</EmptyTitle>
                <EmptyDescription>{invalidPeriod}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : loading ? (
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Carregando lançamentos"
              className="space-y-3 px-6 py-2"
            >
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : failed ? (
            <div className="px-6">
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>
                  Não foi possível carregar os lançamentos
                </AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{describeApiError(query.error)}</p>
                  <Button
                    variant="outline"
                    className="h-8"
                    onClick={() => void query.refetch()}
                    disabled={query.isFetching}
                  >
                    <RefreshCw />
                    {query.isFetching ? "Carregando..." : "Tentar novamente"}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : items.length === 0 && page === 1 && filtered ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>Nenhum lançamento encontrado</EmptyTitle>
                <EmptyDescription>
                  Nenhum lançamento corresponde aos filtros escolhidos.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              </EmptyContent>
            </Empty>
          ) : items.length === 0 && page === 1 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>Nenhum lançamento ainda</EmptyTitle>
                <EmptyDescription>
                  Registre sua primeira receita ou despesa pelo formulário ou
                  pelo assistente.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link
                  to={paths.app.newTransaction}
                  className={cn(buttonVariants(), "h-9")}
                >
                  <Plus />
                  Novo lançamento
                </Link>
              </EmptyContent>
            </Empty>
          ) : items.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle>Esta página não tem lançamentos</EmptyTitle>
                <EmptyDescription>
                  Os lançamentos podem ter mudado desde a última consulta.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => setPage(1)}
                >
                  Voltar à primeira página
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6">
                      <span className="block max-w-64 truncate">
                        {item.description}
                      </span>
                      {item.source === "assistente" && (
                        <span className="text-ai-accent mt-0.5 inline-flex items-center gap-1 text-xs">
                          <Sparkles className="size-3" aria-hidden="true" />
                          Registrado pelo assistente
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={item.type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.categoryName}
                    </TableCell>
                    <TableCell className="financial-value text-muted-foreground">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "financial-value text-right",
                        item.type === "receita" && "text-success",
                      )}
                    >
                      {item.type === "receita" ? "+" : "−"} {money(item.amount)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Visualizar ${item.description}`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <Eye />
                        </Button>
                        <Link
                          to={editTransactionPath(item.id)}
                          aria-label={`Editar ${item.description}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          })}
                        >
                          <Pencil />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Excluir ${item.description}`}
                          onClick={() => setToDelete(item)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {meta && meta.totalPages > 1 ? (
            <nav
              aria-label="Paginação dos lançamentos"
              className="mt-4 flex items-center justify-between gap-3 px-6"
            >
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Página {meta.page} de {meta.totalPages} · {meta.total}{" "}
                lançamentos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1 || query.isFetching}
                >
                  <ChevronLeft />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= meta.totalPages || query.isFetching}
                >
                  Próxima
                  <ChevronRight />
                </Button>
              </div>
            </nav>
          ) : null}
        </CardContent>
      </Card>

      <TransactionDetails id={selectedId} onClose={() => setSelectedId(null)} />

      <DeleteTransactionDialog
        item={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={() => {
          // Excluir o único item da última página a deixaria vazia.
          if (items.length === 1 && page > 1) setPage((current) => current - 1)
        }}
      />
    </div>
  )
}

function TransactionDetails({
  id,
  onClose,
}: {
  id: string | null
  onClose: () => void
}) {
  const query = useTransaction(id)

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do lançamento</DialogTitle>
          <DialogDescription>
            Dados completos do registro selecionado.
          </DialogDescription>
        </DialogHeader>

        {query.isPending ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Carregando detalhes"
            className="space-y-3"
          >
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Não foi possível abrir o lançamento</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{describeApiError(query.error)}</p>
              <Button
                variant="outline"
                className="h-8"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <DetailFields item={query.data} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailFields({ item }: { item: ApiTransaction }) {
  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <Detail label="Tipo">
        <TransactionTypeBadge type={item.type} />
      </Detail>
      <Detail label="Valor">
        <span className="financial-value">{money(item.amount)}</span>
      </Detail>
      <Detail label="Categoria">{item.categoryName}</Detail>
      <Detail label="Data">
        <span className="financial-value">{formatDate(item.date)}</span>
      </Detail>
      <Detail label="Descrição" full>
        {item.description}
      </Detail>
      <Detail label="Registrado em">
        <span className="financial-value">
          {formatDateTime(item.createdAt)}
        </span>
      </Detail>
      <Detail label="Atualizado em">
        <span className="financial-value">
          {formatDateTime(item.updatedAt)}
        </span>
      </Detail>
      <Detail label="Origem">
        <Badge variant="outline">
          {item.source === "assistente" ? "Assistente IA" : "Formulário"}
        </Badge>
      </Detail>
    </dl>
  )
}

function Detail({
  label,
  children,
  full = false,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

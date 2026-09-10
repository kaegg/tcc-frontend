import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Eye,
  Inbox,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { categories, categoryName, transactions } from "@/lib/demo-data"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { sortByDateDesc } from "@/lib/finance"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/types"
import { paths } from "@/routes/paths"

const ALL = "todos"

export function TransactionsPage() {
  const [search, setSearch] = useState("")
  const [type, setType] = useState(ALL)
  const [category, setCategory] = useState(ALL)
  const [period, setPeriod] = useState(ALL)
  const [details, setDetails] = useState<Transaction | null>(null)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return sortByDateDesc(transactions).filter((item) => {
      if (type !== ALL && item.type !== type) return false
      if (category !== ALL && item.categoryId !== category) return false
      if (period !== ALL && !item.date.startsWith(period)) return false
      if (term && !item.description.toLowerCase().includes(term)) return false
      return true
    })
  }, [search, type, category, period])

  const hasFilters =
    search !== "" || type !== ALL || category !== ALL || period !== ALL

  function clearFilters() {
    setSearch("")
    setType(ALL)
    setCategory(ALL)
    setPeriod(ALL)
  }

  function confirmDelete() {
    const target = toDelete
    setToDelete(null)
    if (!target) return
    toast.success("Lançamento excluído", {
      description: `"${target.description}" foi removido. A exclusão real será feita pelo backend.`,
    })
  }

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
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar na descrição"
                aria-label="Buscar lançamentos pela descrição"
                className="h-9 pl-8"
              />
            </div>

            <Select value={type} onValueChange={(v) => setType(v ?? ALL)}>
              <SelectTrigger className="h-9" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? ALL)}
            >
              <SelectTrigger className="h-9" aria-label="Filtrar por categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={(v) => setPeriod(v ?? ALL)}>
              <SelectTrigger className="h-9" aria-label="Filtrar por período">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todo o período</SelectItem>
                <SelectItem value="2026-08">Agosto de 2026</SelectItem>
                <SelectItem value="2026-07">Julho de 2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <div className="mt-3 flex items-center gap-3">
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {filtered.length}{" "}
                {filtered.length === 1
                  ? "lançamento encontrado"
                  : "lançamentos encontrados"}
              </p>
              <Button variant="ghost" className="h-8" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>Nenhum lançamento encontrado</EmptyTitle>
                <EmptyDescription>
                  Ajuste os filtros ou registre um novo lançamento pelo
                  formulário ou pelo assistente.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                  <Link
                    to={paths.app.newTransaction}
                    className={cn(buttonVariants(), "h-9")}
                  >
                    <Plus />
                    Novo lançamento
                  </Link>
                </div>
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
                {filtered.map((item) => (
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
                      {categoryName(item.categoryId)}
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
                      {item.type === "receita" ? "+" : "−"}{" "}
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Visualizar ${item.description}`}
                          onClick={() => setDetails(item)}
                        >
                          <Eye />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${item.description}`}
                          render={<Link to={paths.app.newTransaction} />}
                          nativeButton={false}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
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
        </CardContent>
      </Card>

      <Dialog
        open={details !== null}
        onOpenChange={(open) => !open && setDetails(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do lançamento</DialogTitle>
            <DialogDescription>
              Dados completos do registro selecionado.
            </DialogDescription>
          </DialogHeader>

          {details && (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Tipo">
                <TransactionTypeBadge type={details.type} />
              </Detail>
              <Detail label="Valor">
                <span className="financial-value">
                  {formatCurrency(details.amount)}
                </span>
              </Detail>
              <Detail label="Categoria">
                {categoryName(details.categoryId)}
              </Detail>
              <Detail label="Data">
                <span className="financial-value">
                  {formatDate(details.date)}
                </span>
              </Detail>
              <Detail label="Descrição" full>
                {details.description}
              </Detail>
              <Detail label="Registrado em">
                <span className="financial-value">
                  {formatDateTime(details.createdAt)}
                </span>
              </Detail>
              <Detail label="Origem">
                <Badge variant="outline">
                  {details.source === "assistente"
                    ? "Assistente IA"
                    : "Formulário"}
                </Badge>
              </Detail>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  “{toDelete.description}”, no valor de{" "}
                  {formatCurrency(toDelete.amount)}, deixará de aparecer nas
                  listagens e nos relatórios. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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

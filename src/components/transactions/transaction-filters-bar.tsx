import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/hooks/use-categories"
import type { TransactionFilters } from "@/lib/api/transactions"
import {
  hasFilters,
  MAX_SEARCH_LENGTH,
  type FilterKey,
} from "@/lib/transaction-filters"

/** Tempo sem digitar antes de a busca ir ao servidor. */
const SEARCH_DEBOUNCE_MS = 300

const MIN_DATE = "2000-01-01"
const MAX_DATE = "2100-01-01"

const ALL = "todos"

const TYPE_ITEMS = [
  { value: ALL, label: "Todos os tipos" },
  { value: "despesa", label: "Despesas" },
  { value: "receita", label: "Receitas" },
]

type Patch = Partial<Record<FilterKey, string | undefined>>

export function TransactionFiltersBar({
  filters,
  periodError,
  onChange,
  onClear,
}: {
  filters: TransactionFilters
  periodError: string | null
  onChange: (patch: Patch) => void
  onClear: () => void
}) {
  const { data: categories } = useCategories()
  const categoryItems = useMemo(
    () => [
      { value: ALL, label: "Todas as categorias" },
      ...(categories ?? [])
        .filter((item) => !filters.type || item.type === filters.type)
        .map((item) => ({ value: item.id, label: item.name })),
    ],
    [categories, filters.type],
  )

  function changeType(value: string | null) {
    const type = value === "receita" || value === "despesa" ? value : undefined
    const category = categories?.find((item) => item.id === filters.categoryId)

    onChange({
      type,
      // Categoria do outro tipo não teria resultado nenhum: sai junto.
      ...(type && category && category.type !== type
        ? { categoryId: undefined }
        : {}),
    })
  }

  return (
    <div role="search" aria-label="Filtros dos lançamentos">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <SearchField
          applied={filters.search ?? ""}
          onApply={(search) => onChange({ search })}
        />

        <Field className="lg:col-span-1">
          <FieldLabel htmlFor="filtro-tipo">Tipo</FieldLabel>
          <Select
            value={filters.type ?? ALL}
            onValueChange={changeType}
            items={TYPE_ITEMS}
          >
            <SelectTrigger id="filtro-tipo" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="lg:col-span-1">
          <FieldLabel htmlFor="filtro-categoria">Categoria</FieldLabel>
          <Select
            value={
              categoryItems.some((item) => item.value === filters.categoryId)
                ? filters.categoryId
                : ALL
            }
            onValueChange={(value) =>
              onChange({
                categoryId: value && value !== ALL ? value : undefined,
              })
            }
            items={categoryItems}
          >
            <SelectTrigger id="filtro-categoria" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="filtro-de">De</FieldLabel>
          <Input
            id="filtro-de"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            className="h-9"
            value={filters.from ?? ""}
            onChange={(event) => onChange({ from: event.target.value })}
          />
        </Field>

        <Field data-invalid={Boolean(periodError)}>
          <FieldLabel htmlFor="filtro-ate">Até</FieldLabel>
          <Input
            id="filtro-ate"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            className="h-9"
            value={filters.to ?? ""}
            aria-invalid={Boolean(periodError)}
            aria-describedby={periodError ? "filtro-periodo-erro" : undefined}
            onChange={(event) => onChange({ to: event.target.value })}
          />
          <FieldError
            id="filtro-periodo-erro"
            errors={periodError ? [{ message: periodError }] : []}
          />
        </Field>
      </div>

      {hasFilters(filters) ? (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" className="h-8" onClick={onClear}>
            <X />
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function SearchField({
  applied,
  onApply,
}: {
  applied: string
  onApply: (search: string) => void
}) {
  const [text, setText] = useState(applied)
  const sent = useRef(applied)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // A URL muda numa renderização posterior ao envio. Só o valor que não saiu
  // daqui (limpar filtros, link aberto) reescreve o campo; comparar com o
  // texto digitado apagaria o que o usuário escreveu nesse intervalo.
  useEffect(() => {
    if (applied === sent.current) return
    clearTimeout(timer.current)
    sent.current = applied
    setText(applied)
  }, [applied])

  useEffect(() => () => clearTimeout(timer.current), [])

  function change(value: string) {
    setText(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const search = value.trim()
      if (search === sent.current) return
      sent.current = search
      onApply(search)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <Field className="sm:col-span-2">
      <FieldLabel htmlFor="filtro-busca">Descrição</FieldLabel>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="filtro-busca"
          type="search"
          placeholder="Buscar na descrição"
          maxLength={MAX_SEARCH_LENGTH}
          className="h-9 pl-8"
          value={text}
          onChange={(event) => change(event.target.value)}
        />
      </div>
    </Field>
  )
}

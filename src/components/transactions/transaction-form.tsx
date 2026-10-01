import { useEffect, useMemo, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CircleAlert, Loader2, RefreshCw } from "lucide-react"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useCategories } from "@/hooks/use-categories"
import { describeApiError, fieldErrorsOf } from "@/lib/api/errors"
import type { ApiTransaction, Category } from "@/lib/api/schemas"
import type { CreateTransactionInput } from "@/lib/api/transactions"
import {
  centsToApi,
  digitsToCents,
  formatCents,
  MAX_CENTS,
} from "@/lib/money-input"

/** Mesma faixa do CHECK `transactions_date_in_range` do banco. */
const MIN_DATE = "2000-01-01"
const MAX_DATE = "2100-01-01"

/**
 * valor positivo, data válida, tipo e categoria obrigatórios e categoria
 * compatível com o tipo do lançamento. A descrição é opcional (o critério da
 * TCC-012 não a exige), mas, quando preenchida, segue as regras do backend.
 *
 * É uma fábrica, e não um schema no escopo do módulo, porque a última regra
 * depende da lista de categorias — que agora chega da API. Um schema montado
 * na carga do módulo capturaria uma lista vazia e reprovaria toda categoria
 * escolhida.
 *
 * A regra continua no cliente mesmo com o banco garantindo o mesmo por chave
 * estrangeira composta: as duas interfaces do estudo precisam validar igual,
 * senão a comparação entre elas não se sustenta. Cadastro e edição usam este
 * mesmo schema (TCC-014).
 */
function createTransactionSchema(categories: Category[]) {
  return z
    .object({
      type: z.enum(["receita", "despesa"]),
      // Entra `null` com o campo vazio e sai sempre um número validado.
      amountCents: z
        .number({ error: "Informe o valor." })
        .nullable()
        .transform((value, ctx) => {
          if (value === null) {
            ctx.addIssue({ code: "custom", message: "Informe o valor." })
            return z.NEVER
          }
          return value
        })
        .pipe(
          z
            .number()
            .int()
            .positive("O valor deve ser maior que zero.")
            .max(MAX_CENTS, "O valor deve ser no máximo 9.999.999.999,99."),
        ),
      categoryId: z.string().min(1, "Selecione uma categoria."),
      date: z
        .string()
        .min(1, "Informe a data.")
        .refine(
          (value) => value >= MIN_DATE && value <= MAX_DATE,
          "Informe uma data válida.",
        ),
      description: z
        .string()
        .trim()
        .max(140, "A descrição deve ter no máximo 140 caracteres.")
        .refine(
          (value) => value === "" || value.length >= 3,
          "Descreva o lançamento com pelo menos 3 caracteres.",
        ),
    })
    .refine(
      (data) =>
        categories.find((c) => c.id === data.categoryId)?.type === data.type,
      {
        message: "A categoria precisa ser compatível com o tipo do lançamento.",
        path: ["categoryId"],
      },
    )
}

type TransactionSchema = ReturnType<typeof createTransactionSchema>

/** O que o formulário guarda enquanto é preenchido. */
type TransactionFormInput = z.input<TransactionSchema>

/** O que sai validado e vai para a API. */
export type TransactionFormValues = z.output<TransactionSchema>

type Campo = keyof TransactionFormValues

/** Campo da API → campo do formulário, que guarda o valor em centavos. */
const CAMPO_DA_API: Record<string, Campo> = {
  type: "type",
  amount: "amountCents",
  categoryId: "categoryId",
  date: "date",
  description: "description",
}

const ehCampo = (campo: string) => campo in CAMPO_DA_API

type TransactionFormProps = {
  defaultValues: Omit<TransactionFormInput, "amountCents"> & {
    amountCents?: number | null
  }
  save: (input: CreateTransactionInput) => Promise<ApiTransaction>
  onSaved: (saved: ApiTransaction) => void | Promise<void>
  onCancel: () => void
  /** Avisado quando o formulário passa a ter (ou deixa de ter) alterações. */
  onDirtyChange?: (dirty: boolean) => void
  submitLabel: string
  errorTitle: string
}

export function TransactionForm({
  defaultValues,
  save,
  onSaved,
  onCancel,
  onDirtyChange,
  submitLabel,
  errorTitle,
}: TransactionFormProps) {
  const [type, setType] = useState(defaultValues.type)

  const {
    data: categories,
    isPending: loadingCategories,
    isError: categoriesFailed,
    error: categoriesError,
    refetch: reloadCategories,
    isFetching: refetchingCategories,
  } = useCategories()

  // O RHF relê `_options` a cada render, então trocar o resolver quando as
  // categorias chegam funciona sem recriar o formulário.
  const schema = useMemo(
    () => createTransactionSchema(categories ?? []),
    [categories],
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<TransactionFormInput, unknown, TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const available = useMemo(
    () => (categories ?? []).filter((item) => item.type === type),
    [categories, type],
  )

  function changeType(next: string) {
    const value = next === "receita" ? "receita" : "despesa"
    setType(value)
    setValue("type", value, { shouldDirty: true })
    // A categoria escolhida pode não existir no outro tipo, então é limpa.
    setValue("categoryId", "", { shouldDirty: true })
  }

  const salvar = useMutation({
    mutationFn: (values: TransactionFormValues) =>
      save({
        type: values.type,
        amount: centsToApi(values.amountCents),
        categoryId: values.categoryId,
        date: values.date,
        description: values.description === "" ? null : values.description,
      }),
    onSuccess: onSaved,
    onError: (erro) => {
      // O backend devolve a falha por campo; ela é marcada no campo que a causou.
      for (const [campo, mensagens] of Object.entries(fieldErrorsOf(erro))) {
        if (ehCampo(campo) && mensagens[0]) {
          setError(CAMPO_DA_API[campo], { message: mensagens[0] })
        }
      }
    },
  })

  const camposDaFalha = Object.keys(fieldErrorsOf(salvar.error))
  const falhaGeral =
    salvar.isError &&
    (camposDaFalha.length === 0 || !camposDaFalha.every(ehCampo))

  return (
    <form onSubmit={handleSubmit((values) => salvar.mutate(values))} noValidate>
      {/* Falha de comunicação vale para o formulário inteiro e vai num Alert
          no topo, nunca num FieldError: não é erro do campo que o usuário
          preencheu. */}
      {categoriesFailed ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertTitle>Não foi possível carregar as categorias</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{describeApiError(categoriesError)}</p>
            <Button
              type="button"
              variant="outline"
              className="h-8"
              onClick={() => void reloadCategories()}
              disabled={refetchingCategories}
            >
              <RefreshCw />
              {refetchingCategories ? "Carregando..." : "Tentar novamente"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {falhaGeral ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{describeApiError(salvar.error)}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
          <Tabs value={type} onValueChange={changeType}>
            <TabsList id="tipo">
              <TabsTrigger value="despesa">Despesa</TabsTrigger>
              <TabsTrigger value="receita">Receita</TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.amountCents)}>
            <FieldLabel htmlFor="valor">Valor</FieldLabel>
            <Controller
              control={control}
              name="amountCents"
              render={({ field }) => (
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                  >
                    R$
                  </span>
                  <Input
                    id="valor"
                    ref={field.ref}
                    name={field.name}
                    // Texto, e não number: o campo mostra "2,50", que um
                    // input numérico recusaria por causa da vírgula.
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0,00"
                    className="financial-value h-10 pl-9"
                    value={
                      field.value === null || field.value === undefined
                        ? ""
                        : formatCents(field.value)
                    }
                    onChange={(event) =>
                      field.onChange(digitsToCents(event.target.value))
                    }
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errors.amountCents)}
                    aria-describedby={
                      errors.amountCents ? "valor-error" : undefined
                    }
                  />
                </div>
              )}
            />
            <FieldError id="valor-error" errors={[errors.amountCents]} />
          </Field>

          <Field data-invalid={Boolean(errors.date)}>
            <FieldLabel htmlFor="data">Data</FieldLabel>
            <Input
              id="data"
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              className="h-10"
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "data-error" : undefined}
              {...register("date")}
            />
            <FieldError id="data-error" errors={[errors.date]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.categoryId)}>
          <FieldLabel htmlFor="categoria">Categoria</FieldLabel>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                // Categoria que saiu de circulação não está na lista: o campo
                // fica vazio e o usuário escolhe outra, em vez de ver o id.
                value={
                  available.some((item) => item.id === field.value)
                    ? field.value
                    : null
                }
                onValueChange={(value) => field.onChange(value ?? "")}
                // Sem `items`, o valor já preenchido na edição aparece como o
                // UUID cru: os itens só montam quando o popup abre.
                items={available.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              >
                <SelectTrigger
                  id="categoria"
                  className="h-10"
                  // Sem a lista não há escolha válida a oferecer: deixar o
                  // campo aberto convidaria o usuário a preencher o
                  // formulário para ser barrado no fim.
                  disabled={loadingCategories || categoriesFailed}
                  aria-busy={loadingCategories}
                  aria-invalid={Boolean(errors.categoryId)}
                  aria-describedby={
                    errors.categoryId ? "categoria-error" : undefined
                  }
                >
                  <SelectValue
                    placeholder={
                      loadingCategories
                        ? "Carregando categorias..."
                        : categoriesFailed
                          ? "Categorias indisponíveis"
                          : "Selecione uma categoria"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {available.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="categoria-error" errors={[errors.categoryId]} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="descricao">
            Descrição{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </FieldLabel>
          <Textarea
            id="descricao"
            rows={3}
            placeholder="Ex.: Almoço no restaurante do campus"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "descricao-error" : "descricao-hint"
            }
            {...register("description")}
          />
          {errors.description ? (
            <FieldError id="descricao-error" errors={[errors.description]} />
          ) : (
            <FieldDescription id="descricao-hint">
              Ajuda a identificar o lançamento nas listagens.
            </FieldDescription>
          )}
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="h-10 sm:min-w-32"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="h-10 sm:min-w-32"
            disabled={salvar.isPending || loadingCategories || categoriesFailed}
          >
            {salvar.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Salvando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

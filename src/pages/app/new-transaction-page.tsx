import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CircleAlert, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "@/components/app/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { amountToApi, createTransaction } from "@/lib/api/transactions"
import { todayIso } from "@/lib/format"
import type { Category } from "@/lib/api/schemas"
import { cn } from "@/lib/utils"
import { paths } from "@/routes/paths"

/**
 * valor positivo, data válida, tipo e categoria obrigatórios e categoria
 * compatível com o tipo do lançamento.
 *
 * É uma fábrica, e não um schema no escopo do módulo, porque a última regra
 * depende da lista de categorias — que agora chega da API. Um schema montado
 * na carga do módulo capturaria uma lista vazia e reprovaria toda categoria
 * escolhida.
 *
 * A regra continua no cliente mesmo com o banco garantindo o mesmo por chave
 * estrangeira composta: as duas interfaces do estudo precisam validar igual,
 * senão a comparação entre elas não se sustenta.
 */
function createTransactionSchema(categories: Category[]) {
  return z
    .object({
      type: z.enum(["receita", "despesa"]),
      amount: z
        .number({ error: "Informe o valor." })
        .positive("O valor deve ser maior que zero.")
        .max(9_999_999_999.99, "O valor deve ser no máximo 9.999.999.999,99.")
        .refine(
          (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
          "Use no máximo duas casas decimais.",
        ),
      categoryId: z.string().min(1, "Selecione uma categoria."),
      date: z.string().min(1, "Informe a data."),
      description: z
        .string()
        .trim()
        .min(3, "Descreva o lançamento com pelo menos 3 caracteres.")
        .max(140, "A descrição deve ter no máximo 140 caracteres."),
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

type Values = z.infer<ReturnType<typeof createTransactionSchema>>

const CAMPOS = ["type", "amount", "categoryId", "date", "description"] as const

const ehCampo = (campo: string): campo is (typeof CAMPOS)[number] =>
  (CAMPOS as readonly string[]).includes(campo)

export function NewTransactionPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<"receita" | "despesa">("despesa")

  const {
    data: categories,
    isPending: loadingCategories,
    isError: categoriesFailed,
    error: categoriesError,
    refetch: reloadCategories,
    isFetching: refetchingCategories,
  } = useCategories()

  // Calculado no render, e não na carga do módulo: numa sessão aberta durante
  // a virada do dia, a data padrão ficaria presa no dia anterior. E vem do
  // fuso local, não de UTC, senão à noite o formulário abre com a data de
  // amanhã já preenchida.
  const today = useMemo(() => todayIso(), [])

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
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "despesa",
      categoryId: "",
      date: today,
      description: "",
    },
  })

  const available = useMemo(
    () => (categories ?? []).filter((item) => item.type === type),
    [categories, type],
  )

  function changeType(next: string) {
    const value = next === "receita" ? "receita" : "despesa"
    setType(value)
    setValue("type", value)
    // A categoria escolhida pode não existir no outro tipo, então é limpa.
    setValue("categoryId", "")
  }

  const salvar = useMutation({
    mutationFn: (values: Values) =>
      createTransaction({
        type: values.type,
        amount: amountToApi(values.amount),
        categoryId: values.categoryId,
        date: values.date,
        description: values.description,
      }),
    onSuccess: (criado) => {
      toast.success("Lançamento salvo", { description: criado.description })
      navigate(paths.app.transactions)
    },
    onError: (erro) => {
      // O backend devolve a falha por campo; ela é marcada no campo que a causou.
      for (const [campo, mensagens] of Object.entries(fieldErrorsOf(erro))) {
        if (ehCampo(campo) && mensagens[0]) {
          setError(campo, { message: mensagens[0] })
        }
      }
    },
  })

  const camposDaFalha = Object.keys(fieldErrorsOf(salvar.error))
  const falhaGeral =
    salvar.isError &&
    (camposDaFalha.length === 0 || !camposDaFalha.every(ehCampo))

  function onSubmit(values: Values) {
    salvar.mutate(values)
  }

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
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Falha de comunicação vale para o formulário inteiro e vai
                  num Alert no topo, nunca num FieldError: não é erro do campo
                  que o usuário preencheu. */}
              {categoriesFailed ? (
                <Alert variant="destructive" className="mb-6">
                  <CircleAlert />
                  <AlertTitle>
                    Não foi possível carregar as categorias
                  </AlertTitle>
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
                      {refetchingCategories
                        ? "Carregando..."
                        : "Tentar novamente"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {falhaGeral ? (
                <Alert variant="destructive" className="mb-6">
                  <CircleAlert />
                  <AlertTitle>Não foi possível salvar o lançamento</AlertTitle>
                  <AlertDescription>
                    {describeApiError(salvar.error)}
                  </AlertDescription>
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
                  <Field data-invalid={Boolean(errors.amount)}>
                    <FieldLabel htmlFor="valor">Valor</FieldLabel>
                    <Input
                      id="valor"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      className="h-10"
                      aria-invalid={Boolean(errors.amount)}
                      aria-describedby={
                        errors.amount ? "valor-error" : undefined
                      }
                      {...register("amount", { valueAsNumber: true })}
                    />
                    <FieldError id="valor-error" errors={[errors.amount]} />
                  </Field>

                  <Field data-invalid={Boolean(errors.date)}>
                    <FieldLabel htmlFor="data">Data</FieldLabel>
                    <Input
                      id="data"
                      type="date"
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
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? "")}
                      >
                        <SelectTrigger
                          id="categoria"
                          className="h-10"
                          // Sem a lista não há escolha válida a oferecer:
                          // deixar o campo aberto convidaria o usuário a
                          // preencher o formulário para ser barrado no fim.
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
                  <FieldError
                    id="categoria-error"
                    errors={[errors.categoryId]}
                  />
                </Field>

                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
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
                    <FieldError
                      id="descricao-error"
                      errors={[errors.description]}
                    />
                  ) : (
                    <FieldDescription id="descricao-hint">
                      Ajuda a identificar o lançamento nas listagens.
                    </FieldDescription>
                  )}
                </Field>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Link
                    to={paths.app.transactions}
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-10 sm:w-32",
                    )}
                  >
                    Cancelar
                  </Link>
                  <Button
                    type="submit"
                    className="h-10 sm:w-32"
                    disabled={
                      salvar.isPending || loadingCategories || categoriesFailed
                    }
                  >
                    {salvar.isPending ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </FieldGroup>
            </form>
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

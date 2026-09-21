import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, CircleAlert, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth/auth-card"
import { PasswordInput } from "@/components/auth/password-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { describeApiError, fieldErrorsOf } from "@/lib/api/errors"
import { createUser, type CreateUserInput } from "@/lib/api/users"
import { cn } from "@/lib/utils"
import { registerSchema, type RegisterValues } from "@/pages/auth/auth-schemas"
import { paths } from "@/routes/paths"

/** Campos do formulário que o backend também conhece pelo nome. */
const CAMPOS_DO_FORMULARIO = ["name", "email", "password"] as const

type CampoDoFormulario = (typeof CAMPOS_DO_FORMULARIO)[number]

function ehCampoDoFormulario(campo: string): campo is CampoDoFormulario {
  return (CAMPOS_DO_FORMULARIO as readonly string[]).includes(campo)
}

export function RegisterPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  })

  const criarConta = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      toast.success("Conta criada", {
        description: "Entre com seu e-mail e senha para continuar.",
      })
      navigate(paths.public.login, { replace: true })
    },
    onError: (erro) => {
      // O backend devolve a falha por campo, inclusive o e-mail já cadastrado,
      // então ela é marcada no campo que a causou em vez de num aviso solto.
      for (const [campo, mensagens] of Object.entries(fieldErrorsOf(erro))) {
        if (ehCampoDoFormulario(campo) && mensagens[0]) {
          setError(campo, { message: mensagens[0] })
        }
      }
    },
  })

  function onSubmit(values: RegisterValues) {
    // A confirmação de senha não vai no corpo: ela existe só para comparar os
    // dois campos aqui, e o backend recusa qualquer campo fora do contrato.
    criarConta.mutate({
      name: values.name,
      email: values.email,
      password: values.password,
    })
  }

  const camposDaFalha = Object.keys(fieldErrorsOf(criarConta.error))

  // Só o que não coube em nenhum campo vira aviso no topo: falha de rede, de
  // contrato, ou um campo que este formulário não conhece.
  const falhaGeral =
    criarConta.isError &&
    (camposDaFalha.length === 0 || !camposDaFalha.every(ehCampoDoFormulario))

  return (
    <AuthCard
      title="Criar sua conta"
      description="Leva menos de um minuto. Depois você escolhe como registrar seus lançamentos."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {falhaGeral ? (
          <Alert variant="destructive" className="mb-6">
            <CircleAlert />
            <AlertTitle>Não foi possível criar a conta</AlertTitle>
            <AlertDescription>
              {describeApiError(criarConta.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Como você quer ser chamado"
              className="h-10"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="name-error" errors={[errors.name]} />
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              className="h-10"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            <FieldError id="email-error" errors={[errors.email]} />
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "password-error" : "password-hint"
              }
              {...register("password")}
            />
            {errors.password ? (
              <FieldError id="password-error" errors={[errors.password]} />
            ) : (
              <FieldDescription id="password-hint">
                Pelo menos 8 caracteres, com letras e números.
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.passwordConfirmation)}>
            <FieldLabel htmlFor="passwordConfirmation">
              Confirmar senha
            </FieldLabel>
            <PasswordInput
              id="passwordConfirmation"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.passwordConfirmation)}
              aria-describedby={
                errors.passwordConfirmation
                  ? "passwordConfirmation-error"
                  : undefined
              }
              {...register("passwordConfirmation")}
            />
            <FieldError
              id="passwordConfirmation-error"
              errors={[errors.passwordConfirmation]}
            />
          </Field>

          <Button
            type="submit"
            className="h-10 w-full"
            disabled={criarConta.isPending}
          >
            {criarConta.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Criando conta...
              </>
            ) : (
              "Criar conta"
            )}
          </Button>

          <Link
            to={paths.public.login}
            className={cn(buttonVariants({ variant: "ghost" }), "h-10 w-full")}
          >
            <ArrowLeft />
            Voltar para o login
          </Link>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

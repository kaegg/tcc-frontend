import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2 } from "lucide-react"

import { AuthCard } from "@/components/auth/auth-card"
import { PasswordInput } from "@/components/auth/password-input"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { simulateRequest } from "@/lib/pending-backend"
import { registerSchema, type RegisterValues } from "@/pages/auth/auth-schemas"
import { paths } from "@/routes/paths"

export function RegisterPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  })

  // Sem backend, o envio apenas simula a latência e segue para a área privada.
  async function onSubmit() {
    await simulateRequest()
    navigate(paths.app.dashboard, { replace: true })
  }

  return (
    <AuthCard
      title="Criar sua conta"
      description="Leva menos de um minuto. Depois você escolhe como registrar seus lançamentos."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
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

          <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
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

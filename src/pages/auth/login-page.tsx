import { Link, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CircleAlert, Loader2 } from "lucide-react"

import { AuthCard } from "@/components/auth/auth-card"
import { PasswordInput } from "@/components/auth/password-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { signIn } from "@/lib/api/auth-session"
import { describeApiError, isApiError } from "@/lib/api/errors"
import { loginSchema, type LoginValues } from "@/pages/auth/auth-schemas"
import { paths } from "@/routes/paths"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  // A rota que o usuário tentou abrir antes de cair no login, guardada pelo
  // ProtectedRoute. Sem ela, o destino padrão é o dashboard.
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? paths.app.dashboard

  const entrar = useMutation({
    mutationFn: signIn,
    onSuccess: () => navigate(from, { replace: true }),
  })

  // O 401 do login é "credencial errada", e a mensagem do servidor já é a
  // certa; o texto genérico de 401 do restante da API fala em sessão expirada.
  const mensagemDeFalha =
    isApiError(entrar.error) && entrar.error.statusCode === 401
      ? entrar.error.message
      : describeApiError(entrar.error)

  return (
    <AuthCard
      title="Entrar na sua conta"
      description="Acesse para registrar receitas e despesas por formulário ou conversando com o assistente."
    >
      <form
        onSubmit={handleSubmit((values) => entrar.mutate(values))}
        noValidate
      >
        {entrar.isError ? (
          <Alert variant="destructive" className="mb-6">
            <CircleAlert />
            <AlertTitle>Não foi possível entrar</AlertTitle>
            <AlertDescription>{mensagemDeFalha}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
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
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Link
                to={paths.public.forgotPassword}
                className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <FieldError id="password-error" errors={[errors.password]} />
          </Field>

          <Button
            type="submit"
            className="h-10 w-full"
            disabled={entrar.isPending}
          >
            {entrar.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>

          <Link
            to={paths.public.register}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 w-full",
            )}
          >
            Criar conta
          </Link>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

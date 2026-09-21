import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CircleAlert, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PasswordInput } from "@/components/auth/password-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { describeApiError, fieldErrorsOf } from "@/lib/api/errors"
import { changePassword } from "@/lib/api/users"
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/pages/app/profile-schemas"

const CAMPOS = ["currentPassword", "newPassword"] as const

type Campo = (typeof CAMPOS)[number]

const ehCampo = (campo: string): campo is Campo =>
  (CAMPOS as readonly string[]).includes(campo)

const VAZIO: ChangePasswordValues = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirmation: "",
}

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: VAZIO,
  })

  const alterar = useMutation({
    // A confirmação existe só para comparar os dois campos aqui.
    mutationFn: (values: ChangePasswordValues) =>
      changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      reset(VAZIO)
      toast.success("Senha alterada", {
        description: "Suas outras sessões foram encerradas.",
      })
    },
    onError: (erro) => {
      // Senha recusada não deve continuar na tela.
      reset(VAZIO)

      for (const [campo, mensagens] of Object.entries(fieldErrorsOf(erro))) {
        if (ehCampo(campo) && mensagens[0]) {
          setError(campo, { message: mensagens[0] })
        }
      }
    },
  })

  const camposDaFalha = Object.keys(fieldErrorsOf(alterar.error))
  const falhaGeral =
    alterar.isError &&
    (camposDaFalha.length === 0 || !camposDaFalha.every(ehCampo))

  return (
    <form
      onSubmit={handleSubmit((values) => alterar.mutate(values))}
      noValidate
    >
      {falhaGeral ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertTitle>Não foi possível alterar a senha</AlertTitle>
          <AlertDescription>{describeApiError(alterar.error)}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={Boolean(errors.currentPassword)}>
          <FieldLabel htmlFor="senha-atual">Senha atual</FieldLabel>
          <PasswordInput
            id="senha-atual"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={
              errors.currentPassword ? "senha-atual-error" : undefined
            }
            {...register("currentPassword")}
          />
          <FieldError
            id="senha-atual-error"
            errors={[errors.currentPassword]}
          />
        </Field>

        <Field data-invalid={Boolean(errors.newPassword)}>
          <FieldLabel htmlFor="senha-nova">Nova senha</FieldLabel>
          <PasswordInput
            id="senha-nova"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={
              errors.newPassword ? "senha-nova-error" : "senha-nova-hint"
            }
            {...register("newPassword")}
          />
          <FieldDescription id="senha-nova-hint">
            Pelo menos 8 caracteres, com letras e números.
          </FieldDescription>
          <FieldError id="senha-nova-error" errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={Boolean(errors.newPasswordConfirmation)}>
          <FieldLabel htmlFor="senha-nova-confirmacao">
            Confirmar nova senha
          </FieldLabel>
          <PasswordInput
            id="senha-nova-confirmacao"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPasswordConfirmation)}
            aria-describedby={
              errors.newPasswordConfirmation
                ? "senha-nova-confirmacao-error"
                : undefined
            }
            {...register("newPasswordConfirmation")}
          />
          <FieldError
            id="senha-nova-confirmacao-error"
            errors={[errors.newPasswordConfirmation]}
          />
        </Field>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-10 sm:w-40"
            disabled={alterar.isPending}
          >
            {alterar.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Alterando...
              </>
            ) : (
              "Alterar senha"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

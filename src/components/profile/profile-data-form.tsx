import { useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
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
import { Input } from "@/components/ui/input"
import { useAuthenticatedUser } from "@/hooks/use-session"
import { updateSessionUser } from "@/lib/api/auth-session"
import { describeApiError, fieldErrorsOf } from "@/lib/api/errors"
import { queryKeys } from "@/lib/api/query-keys"
import { getMe, updateProfile } from "@/lib/api/users"
import { profileSchema, type ProfileValues } from "@/pages/app/profile-schemas"

const CAMPOS = ["name", "email", "currentPassword"] as const

type Campo = (typeof CAMPOS)[number]

const ehCampo = (campo: string): campo is Campo =>
  (CAMPOS as readonly string[]).includes(campo)

export function ProfileDataForm() {
  const user = useAuthenticatedUser()

  // Os dados vêm do servidor a cada visita, não só da memória da sessão: o
  // perfil precisa mostrar o que está persistido.
  const perfil = useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 0,
  })

  useEffect(() => {
    if (perfil.data) updateSessionUser(perfil.data)
  }, [perfil.data])

  const atual = perfil.data ?? { name: user.name, email: user.email }
  const resolver = useMemo(
    () => zodResolver(profileSchema(atual.email)),
    [atual.email],
  )

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver,
    values: { name: atual.name, email: atual.email, currentPassword: "" },
  })

  const emailDigitado = useWatch({ control, name: "email" })
  const trocaEmail =
    emailDigitado.trim().toLowerCase() !== atual.email.toLowerCase()

  const salvar = useMutation({
    mutationFn: (values: ProfileValues) =>
      updateProfile({
        name: values.name,
        email: values.email,
        // Só viaja quando o e-mail muda: senha sem necessidade não deve circular.
        ...(trocaEmail ? { currentPassword: values.currentPassword } : {}),
      }),
    onSuccess: (salvo) => {
      updateSessionUser(salvo)
      reset({ name: salvo.name, email: salvo.email, currentPassword: "" })
      toast.success("Perfil atualizado")
    },
    onError: (erro) => {
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

  return (
    <form onSubmit={handleSubmit((values) => salvar.mutate(values))} noValidate>
      {falhaGeral ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertTitle>Não foi possível salvar</AlertTitle>
          <AlertDescription>{describeApiError(salvar.error)}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="nome">Nome</FieldLabel>
            <Input
              id="nome"
              autoComplete="name"
              className="h-10"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "nome-error" : undefined}
              {...register("name")}
            />
            <FieldError id="nome-error" errors={[errors.name]} />
          </Field>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-10"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            <FieldError id="email-error" errors={[errors.email]} />
          </Field>
        </div>

        {trocaEmail ? (
          <Field data-invalid={Boolean(errors.currentPassword)}>
            <FieldLabel htmlFor="senha-para-email">Senha atual</FieldLabel>
            <PasswordInput
              id="senha-para-email"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.currentPassword)}
              aria-describedby={
                errors.currentPassword
                  ? "senha-para-email-error"
                  : "senha-para-email-hint"
              }
              {...register("currentPassword")}
            />
            <FieldDescription id="senha-para-email-hint">
              Confirme sua senha para alterar o e-mail de acesso.
            </FieldDescription>
            <FieldError
              id="senha-para-email-error"
              errors={[errors.currentPassword]}
            />
          </Field>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-10 sm:w-40"
            disabled={salvar.isPending || !isDirty}
          >
            {salvar.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

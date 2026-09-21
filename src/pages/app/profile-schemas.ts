import { z } from "zod"

/**
 * Regras do perfil. As mensagens repetem as do backend, pelo mesmo motivo do
 * cadastro: as duas pontas precisam reprovar a mesma entrada com o mesmo texto.
 */
const name = z
  .string()
  .trim()
  .min(3, "O nome deve ter pelo menos 3 caracteres.")
  .max(120, "O nome deve ter no máximo 120 caracteres.")

const email = z.email({
  error: (issue) =>
    issue.input === "" ? "Informe seu e-mail." : "Informe um e-mail válido.",
})

const newPassword = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra.")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número.")

/**
 * A senha atual só é exigida quando o e-mail muda; por isso o schema depende
 * do e-mail vigente.
 */
export function profileSchema(currentEmail: string) {
  return z
    .object({
      name,
      email,
      currentPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      const changesEmail =
        data.email.trim().toLowerCase() !== currentEmail.toLowerCase()

      if (changesEmail && data.currentPassword === "") {
        ctx.addIssue({
          code: "custom",
          path: ["currentPassword"],
          message: "Informe sua senha atual para alterar o e-mail.",
        })
      }
    })
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword,
    newPasswordConfirmation: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["newPasswordConfirmation"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"],
  })

export type ProfileValues = z.infer<ReturnType<typeof profileSchema>>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

import { z } from "zod"

/**
 * Regras de validação das telas de autenticação.
 */
const email = z.email({
  error: (issue) =>
    issue.input === "" ? "Informe seu e-mail." : "Informe um e-mail válido.",
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "O nome deve ter pelo menos 3 caracteres.")
      .max(120, "O nome deve ter no máximo 120 caracteres."),
    email,
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
    passwordConfirmation: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

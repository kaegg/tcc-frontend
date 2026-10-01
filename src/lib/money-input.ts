/**
 * Campo de valor que se preenche pela direita, como em caixa eletrônico:
 * digitar 2, 5 e 0 mostra 0,02 → 0,25 → 2,50, e mais um 0 vira 25,00.
 *
 * O formulário guarda o valor em centavos inteiros, e não em reais com
 * vírgula: soma e conversão ficam exatas, sem ponto flutuante (ADR 0002,
 * decisão 7), e a regra de "no máximo duas casas" deixa de poder ser violada.
 */

/** numeric(12,2): dez dígitos inteiros e duas casas, 12 dígitos no total. */
export const MAX_CENTS = 999_999_999_999
const MAX_DIGITS = 12

const brl = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Centavos a partir do que está no campo. Só os dígitos contam, então colar
 * "1.234,56" também funciona. Dígitos além do limite são ignorados, em vez de
 * empurrar os primeiros para fora. Campo vazio é `null`: "não informado".
 * Não `undefined`: com ele, o Controller do React Hook Form volta ao valor
 * padrão, e na edição o valor apagado reapareceria.
 *
 * Zeros à esquerda não contam, e só zeros é campo vazio. Sem isso, apagar
 * "0,01" deixaria "0,00" para sempre: o Backspace tira um dígito e a máscara
 * repõe o zero, e o campo nunca voltaria a ficar vazio.
 */
export function digitsToCents(text: string): number | null {
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS)

  return digits === "" ? null : Number(digits)
}

/** 250 → "2,50"; 123456 → "1.234,56". */
export function formatCents(cents: number): string {
  return brl.format(cents / 100)
}

/** Centavos → texto decimal da API ("35.90"), por inteiros, sem arredondamento. */
export function centsToApi(cents: number): string {
  const reais = Math.trunc(cents / 100)
  const resto = String(cents % 100).padStart(2, "0")

  return `${reais}.${resto}`
}

/** Texto decimal da API ("35.9" ou "35.90") → centavos, sem passar por float. */
export function apiToCents(amount: string): number {
  const [reais, centavos = ""] = amount.split(".")

  return Number(reais) * 100 + Number(centavos.padEnd(2, "0").slice(0, 2))
}

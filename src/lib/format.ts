const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const currencyCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })

const dateLongFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
})

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

export function formatCurrency(value: number) {
  return currency.format(value)
}

/** Versão abreviada (R$ 4,2 mil) para marcações de eixo, onde o espaço é curto. */
export function formatCurrencyCompact(value: number) {
  return currencyCompact.format(value)
}

export function formatSignedCurrency(value: number) {
  const formatted = currency.format(Math.abs(value))
  return value < 0 ? `- ${formatted}` : formatted
}

/** Datas chegam como "AAAA-MM-DD". Interpretar com `new Date(iso)` puxaria o
 *  valor para UTC e poderia exibir o dia anterior, então a data é montada a
 *  partir das partes. */
export function parseDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(iso: string) {
  return dateFormat.format(parseDate(iso))
}

export function formatDateLong(iso: string) {
  return dateLongFormat.format(parseDate(iso))
}

export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso))
}

export function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`
}

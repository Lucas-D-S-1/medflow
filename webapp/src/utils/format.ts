const periodFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})
const integerFormatter = new Intl.NumberFormat('pt-BR')
const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

export function formatPeriod(period: string) {
  return periodFormatter.format(new Date(`${period}-01T00:00:00Z`))
}

export function formatDatabaseTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return 'horário indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(parsed)
}

export const formatInteger = (value: number) => integerFormatter.format(value)
export const formatDecimal = (value: number) => decimalFormatter.format(value)
export const formatPercent = (value: number) => `${percentFormatter.format(value)}%`
export const formatCurrency = (value: number) => currencyFormatter.format(value)

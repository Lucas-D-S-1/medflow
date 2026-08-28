import type { RegionalSummaryItem, RegionalSummaryResponse } from '../../lib/api/regioes'

/**
 * O índice de priorização é um **placar de sinais acesos**, não uma nota.
 *
 * A diferença não é semântica. IPH, TMH, CMI e permanência são documentados
 * neste próprio produto como não sendo medidas de qualidade: TMH é mortalidade
 * observada sem ajuste de risco, IPH é pressão estimada sobre capacidade
 * declarada, IPR não é nota de desempenho. Combiná-los numa nota de 0 a 100
 * produziria exatamente a afirmação que cada um deles nega, com pesos que
 * ninguém consegue justificar.
 *
 * O que se pode dizer com honestidade é mais simples e igualmente útil para
 * triagem: *em quantos indicadores esta região está entre as mais altas do
 * estado nesta competência*. Cada sinal é verificável sozinho, o total é a
 * contagem deles, e a ordem serve para decidir onde olhar primeiro — não para
 * concluir que uma região é pior que outra.
 */

export type SignalId = 'iph' | 'tmh' | 'stay' | 'cmi' | 'evasion' | 'icsap'

export const SIGNALS: { id: SignalId; label: string; value: (item: RegionalSummaryItem) => number }[] = [
  { id: 'iph', label: 'pressão sobre leitos', value: (item) => item.iph_percent },
  { id: 'tmh', label: 'mortalidade observada', value: (item) => item.tmh_percent },
  { id: 'stay', label: 'permanência média', value: (item) => item.average_stay_days },
  { id: 'cmi', label: 'custo médio', value: (item) => item.cmi_nominal },
  { id: 'evasion', label: 'atendidos fora da região', value: (item) => item.observed_evasion_percent },
  {
    id: 'icsap',
    label: 'ICSAP',
    value: (item) => item.icsap_share_of_observed_resident_admissions_percent,
  },
]

/** O corte é o quintil mais alto: 20% das regiões acendem cada sinal. */
const QUINTILE = 0.8

function threshold(values: number[]) {
  if (values.length === 0) return Number.POSITIVE_INFINITY
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * QUINTILE
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export type RegionSignals = {
  lit: SignalId[]
  count: number
  total: number
}

/**
 * Calcula, para cada região do recorte, quais sinais estão no quintil mais
 * alto. Os cortes saem do próprio recorte visível: comparar uma rede regional
 * com os limiares do estado inteiro mudaria o significado do índice.
 */
export function computeSignals(items: RegionalSummaryItem[]): Map<string, RegionSignals> {
  const thresholds = new Map<SignalId, number>(
    SIGNALS.map((signal) => [signal.id, threshold(items.map(signal.value))]),
  )

  return new Map(
    items.map((item) => {
      const lit = SIGNALS.filter(
        (signal) => signal.value(item) >= (thresholds.get(signal.id) as number),
      ).map((signal) => signal.id)
      return [item.region_code, { lit, count: lit.length, total: SIGNALS.length }]
    }),
  )
}

export function signalLabel(id: SignalId) {
  return SIGNALS.find((signal) => signal.id === id)?.label ?? id
}

/**
 * Variação de internações novas contra outra competência. Devolve nulo quando
 * a competência não existe no recorte ou quando a região não aparece nela: uma
 * comparação ausente não é uma variação de zero.
 */
export function variation(
  item: RegionalSummaryItem,
  reference: RegionalSummaryResponse | null,
): number | null {
  if (!reference) return null
  const before = reference.items.find((candidate) => candidate.region_code === item.region_code)
  if (!before || before.new_admissions <= 0) return null
  return item.new_admissions / before.new_admissions - 1
}

/** A mesma variação para o recorte inteiro, somando antes de dividir. */
export function aggregateVariation(
  items: RegionalSummaryItem[],
  reference: RegionalSummaryResponse | null,
): number | null {
  if (!reference) return null
  const codes = new Set(items.map((item) => item.region_code))
  const before = reference.items
    .filter((item) => codes.has(item.region_code))
    .reduce((total, item) => total + item.new_admissions, 0)
  if (before <= 0) return null
  const now = items.reduce((total, item) => total + item.new_admissions, 0)
  return now / before - 1
}

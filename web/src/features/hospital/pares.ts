import { apiUrl } from '../../lib/api/base'
import type { HospitalItem } from './hospitais'

/**
 * Grupos de pares e a faixa em que eles se distribuem.
 *
 * O produto sempre disse "IPH 67,2%" e nunca disse o que é típico. Sem a
 * distribuição, o número não responde a pergunta que o gestor tem — se ele está
 * fora da curva ou se aquilo é o normal do tipo dele.
 *
 * A faixa não classifica: mostra dispersão observada entre semelhantes. Não há
 * ajuste de risco aqui, e TMH continua sendo mortalidade observada.
 */

export type PeerMode = 'regiao' | 'tipo-porte'

/** O IPR já usa três como piso de comparação; a extensão herda o mesmo corte. */
export const MIN_PEERS = 3

export type MetricId = 'iph' | 'tmh' | 'stay' | 'cmi'

export const METRICS: Record<MetricId, (item: HospitalItem) => number | null> = {
  iph: (item) => item.iph_percent,
  tmh: (item) => item.tmh_percent,
  stay: (item) => item.average_stay_days,
  cmi: (item) => item.cmi_real,
}

/**
 * Faixas de porte por leitos SUS. Comparar um hospital de 12 leitos com um de
 * 400 é o mesmo erro de comparar tipos diferentes, só menos visível.
 */
function sizeBand(beds: number) {
  if (beds <= 0) return 'sem leito declarado'
  if (beds < 25) return 'até 24 leitos'
  if (beds < 60) return '25 a 59 leitos'
  if (beds < 150) return '60 a 149 leitos'
  if (beds < 300) return '150 a 299 leitos'
  return '300 leitos ou mais'
}

export function peerGroupOf(item: HospitalItem, mode: PeerMode, regionName: string) {
  return mode === 'regiao'
    ? { key: item.region_code, label: `hospitais de ${regionName}` }
    : {
        key: `${item.unit_type_name}|${sizeBand(item.sus_beds)}`,
        label: `${item.unit_type_name}, ${sizeBand(item.sus_beds)}`,
      }
}

export type Distribution = {
  count: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
  min: number
  max: number
}

function quantile(sorted: number[], percentile: number) {
  const position = (sorted.length - 1) * percentile
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export function distributionOf(values: (number | null)[]): Distribution | null {
  // Valor ausente não entra na distribuição: ele não é zero nem mediana, é
  // ausência de observação, e incluí-lo deslocaria a faixa inteira.
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b)
  if (sorted.length < MIN_PEERS) return null
  return {
    count: sorted.length,
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

/** Posição percentual do valor dentro do grupo, de 0 a 100. */
export function percentileOf(values: (number | null)[], value: number) {
  const observed = values.filter((candidate): candidate is number => candidate !== null)
  if (observed.length === 0) return null
  const below = observed.filter((candidate) => candidate < value).length
  const equal = observed.filter((candidate) => candidate === value).length
  return ((below + equal / 2) / observed.length) * 100
}

/**
 * O IPH divide pacientes-dia por leitos-dia declarados. Quando a permanência
 * média é menor que um dia, a reconstrução atribui ao menos um dia por
 * internação e o resultado deixa de medir ocupação: passa a medir giro sobre
 * capacidade. O HOSPITAL DIA BUTANTA aparece com 396,7% tendo usado 20 dos 60
 * leitos-dia disponíveis.
 *
 * A comparação entre pares corrige a comparabilidade — todos os hospitais-dia
 * sofrem o mesmo artefato. Não corrige o significado, e por isso o número
 * precisa vir com a ressalva.
 */
export function iphMeasuresRotation(item: HospitalItem) {
  return item.average_stay_days !== null && item.average_stay_days < 1
}

/* ------------------------------------------------------------------ */

/**
 * A lista estadual, usada só para montar grupos de pares por tipo e porte.
 *
 * Vale um cliente próprio em vez de afrouxar `fetchHospitals`: consultado sem
 * `regiao`, o contrato devolve `region_code` nulo em `filters` e em `region`, e
 * o validador da lista principal recusa isso com razão — ali um recorte sem
 * território seria erro. Aqui é o objetivo, e o que precisa ser garantido é
 * menos: os campos que definem o par e as métricas comparadas.
 */
export type PeerHospital = Pick<
  HospitalItem,
  | 'cnes'
  | 'hospital_name'
  | 'unit_type_name'
  | 'sus_beds'
  | 'region_code'
  | 'new_admissions'
  | 'iph_percent'
  | 'tmh_percent'
  | 'average_stay_days'
  | 'cmi_real'
>

export class PeerContractError extends Error {
  constructor() {
    super('A lista estadual de hospitais veio fora do contrato.')
    this.name = 'PeerContractError'
  }
}

function isPeer(value: unknown): value is PeerHospital {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  const optionalNumber = (key: string) =>
    item[key] === null || (typeof item[key] === 'number' && Number.isFinite(item[key]))
  return (
    typeof item.cnes === 'string' &&
    typeof item.hospital_name === 'string' &&
    typeof item.unit_type_name === 'string' &&
    typeof item.sus_beds === 'number' &&
    typeof item.region_code === 'string' &&
    typeof item.new_admissions === 'number' &&
    optionalNumber('iph_percent') &&
    optionalNumber('tmh_percent') &&
    optionalNumber('average_stay_days') &&
    optionalNumber('cmi_real')
  )
}

export async function fetchStatewideHospitals(
  year: number,
  month: number,
  options: { signal?: AbortSignal } = {},
): Promise<PeerHospital[]> {
  const params = new URLSearchParams({
    ano: String(year),
    mes: String(month),
    limit: '2000',
    offset: '0',
  })
  const response = await fetch(`${apiUrl('/hospitais')}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: options.signal,
  })
  if (!response.ok) throw new PeerContractError()

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') throw new PeerContractError()
  const items = (payload as Record<string, unknown>).items
  if (!Array.isArray(items) || !items.every(isPeer)) throw new PeerContractError()
  return items
}

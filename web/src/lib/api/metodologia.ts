import methodologySnapshot from '../../mocks/metodologia.json'
import { apiUrl } from './base'

export const METHODOLOGY_CONTRACT_VERSION = '0.3.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type MethodologyCoverage = {
  regions: number
  competencies: number
  new_admissions: number
  estimated_patient_days: number
  stay_days: number
  hospitals: number
  region_month_rows: number
  hospital_month_rows: number
  specialty_month_rows: number
  hospital_cid_rows: number
  region_period_rows: number
  flow_rows: number
  icsap_rows: number
  eligible_ipr_pairs: number
  hospital_months_above_declared_capacity: number
  hospital_months_without_declared_sus_bed: number
  benchmark_zero_rows: number
  ipr_insufficient_sample_rows: number
}

export type MethodologyFormula = {
  id: string
  label: string
  expression: string
  interpretation: string
  reference_competence?: string
}

export type MethodologyCut = {
  id: string
  label: string
  minimum_new_admissions?: number
  minimum_hospital_cid_cases?: number
  minimum_benchmark_cases?: number
  minimum_benchmark_hospitals?: number
  minimum_hospital_month_rows?: number
  minimum_hospital_cid_pairs?: number
  description: string
}

export type MethodologySource = {
  id: string
  label: string
  scope: string
}

export type MethodologyReconciliation = {
  id: string
  label: string
  left_label: string
  left_value: number
  right_label: string
  right_value: number
  difference: number
  status: 'ok' | 'divergente'
  note: string
}

export type MethodologyDefinition = {
  id: string
  label: string
  definition: string
  gold_field: string
  published_value?: number
  value_status: 'published' | 'not_published'
  value_note: string
}

export type MethodologyState = {
  id: 'benchmark_zero' | 'iph_denominator_zero' | 'amostra_insuficiente'
  label: string
  description: string
  count: number
  count_label: string
}

export type MethodologyResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof METHODOLOGY_CONTRACT_VERSION
  data_through: string
  gold_updated_at: string
  cmi_reference_competence: string
  coverage: MethodologyCoverage
  formulas: MethodologyFormula[]
  cuts: MethodologyCut[]
  sources: MethodologySource[]
  reconciliations: MethodologyReconciliation[]
  definitions: MethodologyDefinition[]
  states: MethodologyState[]
  limitations: string[]
}

const METHODOLOGY_PATH = apiUrl('/metodologia')
const DATA_THROUGH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const FORMULA_IDS = [
  'tmh',
  'ipr',
  'is',
  'cmi',
  'iph',
  'resident_rate',
  'observed_evasion',
  'attraction',
  'icsap',
  'length_of_stay',
] as const
const CUT_IDS = ['tmh_cmi', 'ipr', 'specialty', 'cid', 'seasonality'] as const
const SOURCE_IDS = [
  'sih_rd',
  'cnes_lt',
  'ibge_censo_2022',
  'ibge_ipca',
  'portaria_221_2008',
] as const
const RECONCILIATION_IDS = [
  'new_admissions_cross_mart',
  'patient_days_cross_mart',
  'stay_days_cross_mart',
] as const
const DEFINITION_IDS = [
  'aih',
  'new_admission',
  'billed_daily',
  'length_of_stay',
  'patient_day',
] as const
const STATE_IDS = ['benchmark_zero', 'iph_denominator_zero', 'amostra_insuficiente'] as const

export class MethodologyContractError extends Error {
  constructor() {
    super('contrato de metodologia inválido')
    this.name = 'MethodologyContractError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isValidDatabaseTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    DATABASE_TIME_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isValidCoverage(value: unknown): value is MethodologyCoverage {
  if (!isRecord(value)) return false

  return [
    'regions',
    'competencies',
    'new_admissions',
    'estimated_patient_days',
    'stay_days',
    'hospitals',
    'region_month_rows',
    'hospital_month_rows',
    'specialty_month_rows',
    'hospital_cid_rows',
    'region_period_rows',
    'flow_rows',
    'icsap_rows',
    'eligible_ipr_pairs',
    'hospital_months_above_declared_capacity',
    'hospital_months_without_declared_sus_bed',
    'benchmark_zero_rows',
    'ipr_insufficient_sample_rows',
  ].every((key) => isNonNegativeInteger(value[key]))
}

function isValidFormula(value: unknown): value is MethodologyFormula {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    (FORMULA_IDS as readonly string[]).includes(value.id) &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    typeof value.expression === 'string' &&
    value.expression.length > 0 &&
    typeof value.interpretation === 'string' &&
    value.interpretation.length > 0 &&
    (value.reference_competence === undefined ||
      (typeof value.reference_competence === 'string' &&
        DATA_THROUGH_PATTERN.test(value.reference_competence)))
  )
}

function isValidCut(value: unknown): value is MethodologyCut {
  if (!isRecord(value)) return false

  const optionalNumbers = [
    'minimum_new_admissions',
    'minimum_hospital_cid_cases',
    'minimum_benchmark_cases',
    'minimum_benchmark_hospitals',
    'minimum_hospital_month_rows',
    'minimum_hospital_cid_pairs',
  ]

  return (
    typeof value.id === 'string' &&
    (CUT_IDS as readonly string[]).includes(value.id) &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    typeof value.description === 'string' &&
    value.description.length > 0 &&
    optionalNumbers.every(
      (key) => value[key] === undefined || isNonNegativeInteger(value[key]),
    )
  )
}

function isValidSource(value: unknown): value is MethodologySource {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    (SOURCE_IDS as readonly string[]).includes(value.id) &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    typeof value.scope === 'string' &&
    value.scope.length > 0
  )
}

function isValidReconciliation(value: unknown): value is MethodologyReconciliation {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    (RECONCILIATION_IDS as readonly string[]).includes(value.id) &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    typeof value.left_label === 'string' &&
    value.left_label.length > 0 &&
    isNonNegativeInteger(value.left_value) &&
    typeof value.right_label === 'string' &&
    value.right_label.length > 0 &&
    isNonNegativeInteger(value.right_value) &&
    typeof value.difference === 'number' &&
    Number.isInteger(value.difference) &&
    value.status === 'ok' &&
    typeof value.note === 'string' &&
    value.note.length > 0
  )
}

function isValidDefinition(value: unknown): value is MethodologyDefinition {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    (DEFINITION_IDS as readonly string[]).includes(value.id) &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    typeof value.definition === 'string' &&
    value.definition.length > 0 &&
    typeof value.gold_field === 'string' &&
    value.gold_field.length > 0 &&
    (value.published_value === undefined || isNonNegativeInteger(value.published_value)) &&
    (value.value_status === 'published' || value.value_status === 'not_published') &&
    typeof value.value_note === 'string' &&
    value.value_note.length > 0
  )
}

function isValidState(value: unknown): value is MethodologyState {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    (STATE_IDS as readonly string[]).includes(value.id) &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    typeof value.description === 'string' &&
    value.description.length > 0 &&
    isNonNegativeInteger(value.count) &&
    typeof value.count_label === 'string' &&
    value.count_label.length > 0
  )
}

function isMethodologyResponse(
  value: unknown,
  expectedSource: PublishedSource,
): value is MethodologyResponse {
  if (!isRecord(value)) return false

  const candidate = value as Record<string, unknown>
  const formulas = candidate.formulas
  const cuts = candidate.cuts
  const sources = candidate.sources
  const limitations = candidate.limitations

  return (
    candidate.status === 'ok' &&
    candidate.source === expectedSource &&
    isValidDatabaseTime(candidate.database_time) &&
    isValidDatabaseTime(candidate.gold_updated_at) &&
    typeof candidate.data_through === 'string' &&
    DATA_THROUGH_PATTERN.test(candidate.data_through) &&
    typeof candidate.cmi_reference_competence === 'string' &&
    DATA_THROUGH_PATTERN.test(candidate.cmi_reference_competence) &&
    candidate.contract_version === METHODOLOGY_CONTRACT_VERSION &&
    isValidCoverage(candidate.coverage) &&
    Array.isArray(formulas) &&
    formulas.length === FORMULA_IDS.length &&
    formulas.every(isValidFormula) &&
    new Set(formulas.map((item) => item.id)).size === FORMULA_IDS.length &&
    Array.isArray(cuts) &&
    cuts.length === CUT_IDS.length &&
    cuts.every(isValidCut) &&
    new Set(cuts.map((item) => item.id)).size === CUT_IDS.length &&
    Array.isArray(sources) &&
    sources.length === SOURCE_IDS.length &&
    sources.every(isValidSource) &&
    new Set(sources.map((item) => item.id)).size === SOURCE_IDS.length &&
    Array.isArray(candidate.reconciliations) &&
    candidate.reconciliations.length === RECONCILIATION_IDS.length &&
    candidate.reconciliations.every(isValidReconciliation) &&
    new Set(candidate.reconciliations.map((item) => item.id)).size === RECONCILIATION_IDS.length &&
    Array.isArray(candidate.definitions) &&
    candidate.definitions.length === DEFINITION_IDS.length &&
    candidate.definitions.every(isValidDefinition) &&
    new Set(candidate.definitions.map((item) => item.id)).size === DEFINITION_IDS.length &&
    Array.isArray(candidate.states) &&
    candidate.states.length === STATE_IDS.length &&
    candidate.states.every(isValidState) &&
    new Set(candidate.states.map((item) => item.id)).size === STATE_IDS.length &&
    Array.isArray(limitations) &&
    limitations.length > 0 &&
    limitations.every((item) => typeof item === 'string' && item.length > 0)
  )
}

export async function fetchMethodology(
  timeoutMs = 3_000,
): Promise<MethodologyResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(METHODOLOGY_PATH, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`metodologia HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new MethodologyContractError()
    }

    if (!isMethodologyResponse(payload, 'oracle-live')) {
      throw new MethodologyContractError()
    }
    return payload
  } finally {
    window.clearTimeout(timeout)
  }
}

export function getMethodologySnapshot(): MethodologyResponse {
  if (!isMethodologyResponse(methodologySnapshot, 'snapshot')) {
    throw new Error('fixture de metodologia inválida')
  }
  return methodologySnapshot
}

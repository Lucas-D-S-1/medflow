import { useEffect, useRef, useState } from 'react'
import { useSource } from '../../shared/SourceContext'
import { formatDecimal, formatInteger, formatPercent, formatPeriod } from '../../shared/format'
import {
  fetchAllSpecialtyDiagnoses,
  getSpecialtyDiagnosesSnapshot,
  SpecialtyDiagnosisAbsentError,
  type SpecialtyDiagnosisItem,
  type SpecialtyDiagnosisOrder,
  type SpecialtyDiagnosisResponse,
} from './hospitalDiagnosticosEspecialidade'

type LoadState =
  | { kind: 'idle' | 'loading' | 'absent' | 'snapshot-unavailable' | 'error' }
  | { kind: 'ready'; key: string; data: SpecialtyDiagnosisResponse }

const PREVIEW_SIZE = 10
const ORDER_LABELS: Record<SpecialtyDiagnosisOrder, string> = {
  dias: 'total de dias',
  internacoes: 'volume de internações',
  media: 'média de permanência',
}

function comparison(item: SpecialtyDiagnosisItem) {
  const raw = `${formatInteger(item.benchmark_admissions)} internações, ${formatInteger(item.benchmark_stay_days_total)} dias e ${formatInteger(item.benchmark_hospitals)} outros hospitais`
  if (item.sample_status !== 'suficiente') {
    const reason = item.specialty_code === '--' || item.cid_code === '--'
      ? 'Identificador desconhecido; não comparável'
      : item.benchmark_hospitals === 0 || item.benchmark_admissions === 0
        ? 'Sem outros hospitais neste recorte'
        : item.sample_status === 'benchmark_zero' || item.benchmark_stay_days_total === 0
          ? 'Pares sem dias de permanência registrados'
          : 'Amostra insuficiente para comparar'
    return (
      <>
        <strong>{reason}</strong>
        <small>
          {raw}
          {item.average_stay_benchmark === null
            ? ''
            : ` · média dos pares ${formatDecimal(item.average_stay_benchmark)} dias`}
        </small>
      </>
    )
  }
  return (
    <>
      <strong>IPR {formatDecimal(item.ipr!)}</strong>
      <small>
        referência {formatDecimal(item.average_stay_benchmark!)} dias · {raw}
      </small>
    </>
  )
}

export default function SpecialtyDiagnoses({
  cnes,
  competence,
  specialtyCode,
  specialtyName,
}: {
  cnes: string
  competence: string
  specialtyCode: string
  specialtyName: string
}) {
  const { sourceState } = useSource()
  const [orderBy, setOrderBy] = useState<SpecialtyDiagnosisOrder>('dias')
  const [visible, setVisible] = useState(PREVIEW_SIZE)
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const request = useRef<{ id: number; controller: AbortController } | null>(null)
  const [year, month] = competence.split('-').map(Number)
  const key = `${cnes}:${competence}:${specialtyCode}:${orderBy}`
  const data = state.kind === 'ready' && state.key === key ? state.data : null

  useEffect(() => {
    request.current?.controller.abort()
    setVisible(PREVIEW_SIZE)
    const id = (request.current?.id ?? 0) + 1
    const controller = new AbortController()
    request.current = { id, controller }

    if (!cnes || !specialtyCode || !Number.isInteger(year) || !Number.isInteger(month)) {
      setState({ kind: 'idle' })
      return () => controller.abort()
    }

    if (sourceState.kind === 'fallback') {
      try {
        const snapshot = getSpecialtyDiagnosesSnapshot(orderBy)
        const matches =
          snapshot.filters.cnes === cnes &&
          snapshot.filters.specialty_code === specialtyCode &&
          snapshot.data_through === competence
        setState(
          matches
            ? { kind: 'ready', key, data: snapshot }
            : { kind: 'snapshot-unavailable' },
        )
      } catch {
        setState({ kind: 'error' })
      }
      return () => controller.abort()
    }

    if (sourceState.kind !== 'live') {
      setState({ kind: 'idle' })
      return () => controller.abort()
    }

    setState({ kind: 'loading' })
    void fetchAllSpecialtyDiagnoses(
      { cnes, year, month, specialtyCode, orderBy },
      { signal: controller.signal },
    )
      .then((response) => {
        if (!controller.signal.aborted && request.current?.id === id) {
          setState({ kind: 'ready', key, data: response })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || request.current?.id !== id) return
        setState({
          kind: error instanceof SpecialtyDiagnosisAbsentError ? 'absent' : 'error',
        })
      })

    return () => controller.abort()
  }, [cnes, competence, key, month, orderBy, sourceState.kind, specialtyCode, year])

  return (
    <section className="specialty-diagnoses" aria-labelledby="specialty-diagnoses-title">
      <div className="specialty-diagnoses-heading">
        <div>
          <p className="section-kicker">DIAGNÓSTICOS NA ESPECIALIDADE</p>
          <h3 id="specialty-diagnoses-title">Principais diagnósticos · {specialtyName}</h3>
          <p>
            Competência de processamento {formatPeriod(competence)} · SIH/SUS · CID
            principal. Referência regional: mesmo mês, especialidade e CID; hospital
            excluído; comparação sem ajuste de risco.
          </p>
        </div>
        <label>
          Ordenar por
          <select
            value={orderBy}
            data-testid="specialty-diagnosis-order"
            onChange={(event) => setOrderBy(event.target.value as SpecialtyDiagnosisOrder)}
          >
            <option value="dias">Total de dias</option>
            <option value="internacoes">Internações</option>
            <option value="media">Média de permanência</option>
          </select>
        </label>
      </div>

      {state.kind === 'loading' && (
        <p className="diagnosis-state" data-testid="specialty-diagnosis-loading">
          Carregando diagnósticos de {specialtyName}.
        </p>
      )}
      {state.kind === 'absent' && (
        <p className="diagnosis-state" data-testid="specialty-diagnosis-absent">
          Não há diagnóstico publicado.
        </p>
      )}
      {state.kind === 'snapshot-unavailable' && (
        <p className="diagnosis-state" data-testid="specialty-diagnosis-snapshot-unavailable">
          Este recorte não está disponível no snapshot de contingência.
        </p>
      )}
      {state.kind === 'error' && (
        <p className="diagnosis-state" data-testid="specialty-diagnosis-error">
          Não foi possível carregar os diagnósticos desta especialidade agora.
        </p>
      )}

      {data && (
        <>
          <div className="specialty-diagnoses-meta" data-testid="specialty-diagnosis-meta">
            <span>
              {formatInteger(data.pagination.count)} diagnósticos · ordenados por{' '}
              {ORDER_LABELS[orderBy]}
            </span>
            <span>
              Fonte: {data.source === 'oracle-live' ? 'Oracle / Gold MedFlow' : 'snapshot local'}
            </span>
          </div>
          <div className="hospital-table-wrap">
            <table className="hospital-table specialty-diagnosis-table">
              <thead>
                <tr>
                  <th>Diagnóstico principal</th>
                  <th>Internações</th>
                  <th>Dias</th>
                  <th>Média</th>
                  <th>Referência regional</th>
                </tr>
              </thead>
              <tbody>
                {data.items.slice(0, visible).map((item) => (
                  <tr
                    key={item.cid_code}
                    data-testid={`specialty-diagnosis-row-${item.cid_code}`}
                  >
                    <td data-label="Diagnóstico principal">
                      <strong>{item.cid_description}</strong>
                      <small>
                        CID {item.cid_code} · {item.chapter_description}
                      </small>
                    </td>
                    <td data-label="Internações">
                      <strong>{formatInteger(item.new_admissions)}</strong>
                      <small>{formatPercent(item.admission_share_percent)} do volume</small>
                    </td>
                    <td data-label="Dias">
                      <strong>{formatInteger(item.stay_days_total)}</strong>
                      <small>
                        {item.stay_day_share_percent === null
                          ? 'Sem dias registrados para calcular participação'
                          : `${formatPercent(item.stay_day_share_percent)} dos dias`}
                      </small>
                    </td>
                    <td data-label="Média">
                      <strong>{formatDecimal(item.average_stay_days)} dias</strong>
                      <small>soma de dias ÷ internações</small>
                    </td>
                    <td data-label="Referência regional">{comparison(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible < data.items.length && (
            <button
              type="button"
              className="secondary-action"
              data-testid="specialty-diagnosis-more"
              onClick={() => setVisible((current) => Math.min(current + PREVIEW_SIZE, data.items.length))}
            >
              Mostrar mais diagnósticos ({formatInteger(data.items.length - visible)} restantes)
            </button>
          )}
        </>
      )}
    </section>
  )
}

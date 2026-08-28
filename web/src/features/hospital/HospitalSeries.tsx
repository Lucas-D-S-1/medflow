import { useEffect, useState } from 'react'
import type { HospitalSeriesPoint, HospitalSeriesResponse } from './hospitalSerie'
import {
  SortableHeader,
  useSortableRows,
  type SortableColumn,
} from '../../shared/useSortableRows'
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../../shared/format'

const PREVIEW_SIZE = 6

function motivo(ponto: HospitalSeriesPoint, campo: 'iph' | 'derivado') {
  if (campo === 'iph' && ponto.capacity_status === 'sem_leito_sus_declarado') {
    return 'sem leito SUS declarado'
  }
  if (campo === 'derivado' && ponto.new_admissions === 0) {
    return 'sem internação nova'
  }
  return 'não calculado'
}

function Valor({
  valor,
  formatar,
  ausencia,
}: {
  valor: number | null
  formatar: (n: number) => string
  ausencia: string
}) {
  if (valor === null) return <em className="valor-ausente">{ausencia}</em>
  return <strong>{formatar(valor)}</strong>
}

const COLUMNS: SortableColumn<HospitalSeriesPoint>[] = [
  {
    id: 'competencia',
    label: 'Competência',
    // Numérica de propósito: `AAAAMM` ordena cronologicamente como número, e é
    // o que faz a tabela abrir na competência mais recente.
    numeric: true,
    value: (ponto) => Number(ponto.competence.replace('-', '')),
  },
  { id: 'internacoes', label: 'Internações', numeric: true, value: (ponto) => ponto.new_admissions },
  {
    id: 'iph',
    label: 'IPH estimado',
    hint: 'não é ocupação medida',
    numeric: true,
    value: (ponto) => ponto.iph_percent,
  },
  {
    id: 'tmh',
    label: 'TMH',
    hint: 'sem ajuste de risco',
    numeric: true,
    value: (ponto) => ponto.tmh_percent,
  },
  {
    id: 'permanencia',
    label: 'Permanência média',
    numeric: true,
    value: (ponto) => ponto.average_stay_days,
  },
  { id: 'cmi', label: 'CMI real', numeric: true, value: (ponto) => ponto.cmi_real },
]

export default function HospitalSeries({ data }: { data: HospitalSeriesResponse }) {
  const [showAll, setShowAll] = useState(false)
  const { sorted, sortBy, descending, toggleSort } = useSortableRows(
    data.items,
    COLUMNS,
    'competencia',
    (ponto) => ponto.competence,
  )
  // A lista cresce dentro da própria tabela, que rola. Antes as competências
  // além das seis primeiras iam para um segundo painel abaixo: a série ficava
  // partida em dois lugares, e ordenar uma metade não dizia nada sobre a outra.
  const visiveis = showAll ? sorted : sorted.slice(0, PREVIEW_SIZE)

  useEffect(() => setShowAll(false), [data.filters.cnes])

  return (
    <section className="hospital-panel" aria-labelledby="hospital-series-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">SÉRIE MENSAL DO HOSPITAL</p>
          <h2 id="hospital-series-title">{data.hospital.hospital_name}</h2>
          <p>
            CNES {data.hospital.cnes} · {data.hospital.unit_type_name} ·{' '}
            {data.hospital.region_name}. Ordene por qualquer indicador; abre na
            competência mais recente, e o CMI real está a preços de{' '}
            {formatPeriod(data.data_through)}.
          </p>
        </div>
        <strong data-testid="serie-count">
          {formatInteger(visiveis.length)} de {formatInteger(data.pagination.count)} competências
        </strong>
      </div>

      <div className="hospital-table-wrap" id="hospital-series-rows">
        <table
          className="hospital-table hospital-series-table"
          aria-label="Série mensal do hospital"
        >
          <thead>
            <SortableHeader
              columns={COLUMNS}
              sortBy={sortBy}
              descending={descending}
              onToggle={toggleSort}
              testIdPrefix="serie-sort"
            />
          </thead>
          <tbody>
            {visiveis.map((ponto) => (
              <tr key={ponto.competence} data-testid={`serie-row-${ponto.competence}`}>
                <td data-label="Competência">
                  <strong>{formatPeriod(ponto.competence)}</strong>
                  {ponto.sample_status === 'amostra_insuficiente' && (
                    <small>amostra insuficiente</small>
                  )}
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(ponto.new_admissions)}</strong>
                  <small>{formatInteger(ponto.deaths)} óbitos</small>
                </td>
                <td data-label="IPH estimado">
                  <Valor
                    valor={ponto.iph_percent}
                    formatar={formatPercent}
                    ausencia={motivo(ponto, 'iph')}
                  />
                  <small>
                    {formatInteger(ponto.patient_days_estimated)} /{' '}
                    {formatInteger(ponto.declared_bed_days)} leito-dia
                  </small>
                </td>
                <td data-label="TMH">
                  <Valor
                    valor={ponto.tmh_percent}
                    formatar={formatPercent}
                    ausencia={motivo(ponto, 'derivado')}
                  />
                </td>
                <td data-label="Permanência média">
                  <Valor
                    valor={ponto.average_stay_days}
                    formatar={formatDecimal}
                    ausencia={motivo(ponto, 'derivado')}
                  />
                </td>
                <td data-label="CMI real">
                  <Valor
                    valor={ponto.cmi_real}
                    formatar={formatCurrency}
                    ausencia={motivo(ponto, 'derivado')}
                  />
                  {ponto.cmi_nominal !== null && ponto.cmi_real !== null && (
                    <small>nominal {formatCurrency(ponto.cmi_nominal)}</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.items.length > PREVIEW_SIZE && (
        <button
          type="button"
          className="secondary-action"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          aria-controls="hospital-series-rows"
        >
          {showAll
            ? `Mostrar só as ${formatInteger(PREVIEW_SIZE)} primeiras`
            : `Ver todas as ${formatInteger(data.items.length)} competências`}
        </button>
      )}
    </section>
  )
}

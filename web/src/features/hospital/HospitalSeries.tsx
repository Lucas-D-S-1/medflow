import { useEffect, useState } from 'react'
import type { HospitalSeriesPoint, HospitalSeriesResponse } from './hospitalSerie'
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

export default function HospitalSeries({ data }: { data: HospitalSeriesResponse }) {
  const [showAll, setShowAll] = useState(false)
  const primaryItems = data.items.slice(0, PREVIEW_SIZE)
  const additionalItems = data.items.slice(PREVIEW_SIZE)

  useEffect(() => setShowAll(false), [data.filters.cnes])

  function renderTable(items: HospitalSeriesPoint[], label: string) {
    return (
      <div className="hospital-table-wrap">
        <table className="hospital-table hospital-series-table" aria-label={label}>
          <thead>
            <tr>
              <th scope="col">Competência</th>
              <th scope="col">Internações</th>
              <th scope="col">IPH estimado</th>
              <th scope="col">TMH</th>
              <th scope="col">Permanência média</th>
              <th scope="col">CMI real</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ponto) => (
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
    )
  }

  return (
    <>
      <section className="hospital-panel" aria-labelledby="hospital-series-title">
        <div className="block-heading">
          <div>
            <p className="section-kicker">SÉRIE MENSAL DO HOSPITAL</p>
            <h2 id="hospital-series-title">{data.hospital.hospital_name}</h2>
            <p>
              CNES {data.hospital.cnes} · {data.hospital.unit_type_name} ·{' '}
              {data.hospital.region_name}. Da competência mais recente para a mais
              antiga; o CMI real está a preços de{' '}
              {formatPeriod(data.data_through)}.
            </p>
          </div>
          <strong data-testid="serie-count">
            {formatInteger(showAll ? data.items.length : primaryItems.length)} de{' '}
            {formatInteger(data.pagination.count)} competências
          </strong>
        </div>

        {renderTable(primaryItems, 'Série mensal do hospital, competências recentes')}

        {data.items.length > PREVIEW_SIZE && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            aria-controls="hospital-series-additional"
          >
            {showAll
              ? 'Ocultar competências anteriores'
              : `Ver todas as ${formatInteger(data.items.length)} competências`}
          </button>
        )}
      </section>

      {showAll && additionalItems.length > 0 && (
        <section
          className="hospital-panel hospital-panel-detail"
          id="hospital-series-additional"
          aria-labelledby="hospital-series-additional-title"
        >
          <div className="block-heading">
            <div>
              <p className="section-kicker">COMPETÊNCIAS ANTERIORES</p>
              <h2 id="hospital-series-additional-title">Histórico completo</h2>
            </div>
            <strong>{formatInteger(additionalItems.length)} competências adicionais</strong>
          </div>
          {renderTable(additionalItems, 'Série mensal do hospital, competências anteriores')}
        </section>
      )}
    </>
  )
}

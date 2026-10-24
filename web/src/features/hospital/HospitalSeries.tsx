import { useReadingState } from '../../shared/useReadingState'
import { useMemo } from 'react'
import MonthlyChart from '../../shared/MonthlyChart'
import type { HospitalSeriesPoint, HospitalSeriesResponse } from './hospitalSerie'
import { SortableHeader, useSortableRows, type SortableColumn } from '../../shared/useSortableRows'
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
  {
    id: 'internacoes',
    label: 'Internações',
    numeric: true,
    value: (ponto) => ponto.new_admissions,
  },
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
  {
    id: 'cmi',
    label: 'Valor médio aprovado pelo SUS (CMI real)',
    numeric: true,
    value: (ponto) => ponto.cmi_real,
  },
  {
    id: 'ipe',
    label: 'Ante os pares (IPE)',
    hint: 'não é nota de qualidade',
    numeric: true,
    value: (ponto) => ponto.ipe_median,
  },
]

export default function HospitalSeries({
  data,
  selectedCompetence,
}: {
  data: HospitalSeriesResponse
  selectedCompetence: string
}) {
  const [indicator, setIndicator] = useReadingState<'iph' | 'admissions'>(
    `series:${data.filters.cnes}:${selectedCompetence}:metric`,
    'iph',
  )
  const [allHistory, setAllHistory] = useReadingState(
    `series:${data.filters.cnes}:${selectedCompetence}:all`,
    false,
  )
  const available = useMemo(
    () => data.items.filter((point) => point.competence <= selectedCompetence),
    [data.items, selectedCompetence],
  )
  const slots = useMemo(() => {
    const earliest = available.map((p) => p.competence).sort()[0] ?? selectedCompetence
    const end = new Date(`${selectedCompetence}-01T00:00:00Z`)
    const start = new Date(allHistory ? `${earliest}-01T00:00:00Z` : end)
    if (!allHistory) start.setUTCMonth(start.getUTCMonth() - 11)
    const result: { competence: string; item: HospitalSeriesPoint | null }[] = []
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    ) {
      const competence = cursor.toISOString().slice(0, 7)
      result.push({ competence, item: available.find((p) => p.competence === competence) ?? null })
    }
    return result
  }, [available, selectedCompetence, allHistory])
  const valueOf = (point: HospitalSeriesPoint) =>
    indicator === 'iph' ? point.iph_percent : point.new_admissions
  const format = indicator === 'iph' ? formatPercent : formatInteger
  const latest = available.find((point) => point.competence === selectedCompetence)
  const previousCompetence = slots.at(-2)?.competence
  const previous = available.find((point) => point.competence === previousCompetence)

  const [showAll, setShowAll] = useReadingState(
    `series:${data.filters.cnes}:${selectedCompetence}:table-all`,
    false,
  )
  const [valuesOpen, setValuesOpen] = useReadingState(
    `series:${data.filters.cnes}:${selectedCompetence}:values`,
    false,
  )
  const { sorted, sortBy, descending, toggleSort } = useSortableRows(
    available,
    COLUMNS,
    'competencia',
    (ponto) => ponto.competence,
    `series-sort:${data.filters.cnes}:${selectedCompetence}`,
  )
  // Sort the entire validated series before choosing the audit-table preview.
  const visiveis = showAll ? sorted : sorted.slice(0, PREVIEW_SIZE)

  return (
    <section
      className="hospital-panel hospital-series-panel"
      aria-labelledby="hospital-series-title"
    >
      <div className="block-heading">
        <div>
          <p className="section-kicker">SÉRIE MENSAL DO HOSPITAL</p>
          <h3 id="hospital-series-title">{data.hospital.hospital_name}</h3>
          <p>
            {formatPeriod(slots[0]?.competence ?? selectedCompetence)} a{' '}
            {formatPeriod(selectedCompetence)}
          </p>
        </div>
      </div>
      <div
        className="series-indicator-selector"
        role="radiogroup"
        aria-label="Indicador da evolução hospitalar"
      >
        <button
          type="button"
          role="radio"
          aria-checked={indicator === 'iph'}
          onClick={() => setIndicator('iph')}
        >
          IPH estimado
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={indicator === 'admissions'}
          onClick={() => setIndicator('admissions')}
        >
          Internações novas
        </button>
      </div>
      <div className="hospital-series-highlights">
        {[latest, previous].map((point, index) => (
          <div key={index}>
            <span>
              {index === 0
                ? formatPeriod(selectedCompetence)
                : previousCompetence
                  ? formatPeriod(previousCompetence)
                  : 'Mês anterior'}
            </span>
            <strong>
              {point && valueOf(point) !== null ? format(valueOf(point)!) : 'não publicado'}
            </strong>
          </div>
        ))}
      </div>
      <MonthlyChart
        points={slots.map(({ competence, item }) => ({
          competence,
          value: item ? valueOf(item) : null,
          detail: item
            ? `${formatInteger(item.new_admissions)} internações · ${formatInteger(item.patient_days_estimated)} pacientes-dia estimados / ${formatInteger(item.declared_bed_days)} leitos-dia`
            : 'Competência não publicada',
        }))}
        label={indicator === 'iph' ? 'IPH estimado' : 'Internações novas'}
        format={format}
      />
      <p className="series-method-note">
        {indicator === 'iph'
          ? 'Estimativa de pressão sobre capacidade declarada; não é ocupação medida.'
          : 'Volume mensal publicado; variações não indicam melhora ou piora por si sós.'}
      </p>
      <button
        className="series-history-control"
        type="button"
        aria-pressed={allHistory}
        onClick={() => setAllHistory((current) => !current)}
      >
        {allHistory
          ? 'Ver os últimos 12 meses'
          : `Todo o histórico: ${formatPeriod(available.map((p) => p.competence).sort()[0] ?? selectedCompetence)} a ${formatPeriod(selectedCompetence)}, ${formatInteger(available.length)} meses`}
      </button>
      <details
        className="series-values-details"
        open={valuesOpen}
        onToggle={(event) => setValuesOpen(event.currentTarget.open)}
      >
        <summary>Valores, amostras e denominadores</summary>
        <p data-testid="serie-count">
          {formatInteger(visiveis.length)} de {formatInteger(available.length)} competências · CMI
          real a preços de {formatPeriod(data.data_through)}
        </p>

        <div
          // O teto de altura vale só na lista expandida: com as seis primeiras a
          // tabela cabe inteira, e limitar ali prendia a rolagem da página.
          className={`hospital-table-wrap${showAll ? ' rolagem-interna' : ''}`}
          id="hospital-series-rows"
        >
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
                  <td data-label="Valor médio aprovado pelo SUS (CMI real)">
                    <Valor
                      valor={ponto.cmi_real}
                      formatar={formatCurrency}
                      ausencia={motivo(ponto, 'derivado')}
                    />
                    {ponto.cmi_nominal !== null && ponto.cmi_real !== null && (
                      <small>nominal {formatCurrency(ponto.cmi_nominal)}</small>
                    )}
                  </td>
                  <td data-label="IPE">
                    {ponto.ipe_median === null ? (
                      <em className="valor-ausente">sem especialidade comparável</em>
                    ) : (
                      <>
                        <strong data-testid={`serie-ipe-${ponto.competence}`}>
                          {formatDecimal(ponto.ipe_median)}
                        </strong>
                        <small>
                          {formatInteger(ponto.ipe_above_reference)} de{' '}
                          {formatInteger(ponto.ipe_eligible_specialties)} acima dos pares
                        </small>
                      </>
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
      </details>
    </section>
  )
}

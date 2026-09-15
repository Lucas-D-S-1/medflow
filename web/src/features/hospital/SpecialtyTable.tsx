import { useEffect, useMemo, useState } from 'react'
import { useSource } from '../../shared/SourceContext'
import { formatDecimal, formatInteger, formatPercent, formatPeriod } from '../../shared/format'
import {
  SortableHeader,
  useSortableRows,
  type SortableColumn,
} from '../../shared/useSortableRows'
import type { SpecialtyItem, SpecialtyResponse } from './hospitalEspecialidades'
import {
  SUMMARY_QUESTIONS,
  comparisonAbsence,
  hospitalShare,
  regionalShare,
  selectInitialSpecialty,
  toHospitalSpecialtySummary,
} from './specialtySummary'

function columns(
  publishedSpecialtyAdmissions: number,
  participationLabel: string,
): SortableColumn<SpecialtyItem>[] {
  return [
    {
      id: 'especialidade',
      label: 'Especialidade',
      numeric: false,
      value: (item) => item.specialty_name,
    },
    {
      id: 'internacoes',
      label: 'Internações',
      numeric: true,
      value: (item) => item.new_admissions,
    },
    {
      id: 'participacao',
      label: participationLabel,
      numeric: true,
      value: (item) => hospitalShare(item, publishedSpecialtyAdmissions),
    },
    {
      id: 'permanencia',
      label: 'Permanência local / referência',
      hint: 'mesma especialidade e mês',
      numeric: true,
      value: (item) => item.average_stay_days,
    },
  ]
}

function StayComparison({ item }: { item: SpecialtyItem }) {
  const absence = comparisonAbsence(item)
  if (absence) {
    return <em className="valor-ausente">{absence}</em>
  }

  return (
    <>
      <strong>{formatDecimal(item.average_stay_days!)} dias</strong>
      <small>
        referência {formatDecimal(item.average_stay_benchmark!)} dias ·{' '}
        {formatInteger(item.benchmark_hospitals)} outros hospitais
      </small>
    </>
  )
}

export default function SpecialtyTable({
  data,
  hospitalName,
}: {
  data: SpecialtyResponse
  hospitalName: string
}) {
  const {
    reportHospitalSummary,
    requestAssistantQuestion,
    clearAssistantQuestion,
  } = useSource()
  const publishedSpecialtyAdmissions = useMemo(
    () => data.items.reduce((total, item) => total + item.new_admissions, 0),
    [data.items],
  )
  const initial = useMemo(() => selectInitialSpecialty(data.items), [data.items])
  const [selectedCode, setSelectedCode] = useState(initial?.specialty_code ?? '')
  const selected =
    data.items.find((item) => item.specialty_code === selectedCode) ?? initial
  const completeCoverage = publishedSpecialtyAdmissions === data.hospital.new_admissions_total
  const participationLabel = completeCoverage
    ? 'Participação no hospital'
    : 'Participação nas especialidades disponíveis'
  const tableColumns = useMemo(
    () => columns(publishedSpecialtyAdmissions, participationLabel),
    [participationLabel, publishedSpecialtyAdmissions],
  )
  const { sorted, sortBy, descending, toggleSort } = useSortableRows(
    data.items,
    tableColumns,
    'internacoes',
    (item) => item.specialty_code,
  )

  useEffect(() => {
    setSelectedCode(initial?.specialty_code ?? '')
    clearAssistantQuestion()
  }, [clearAssistantQuestion, data.data_through, data.filters.cnes, initial])

  useEffect(() => {
    if (!selected) {
      reportHospitalSummary(null)
      return
    }
    reportHospitalSummary(
      toHospitalSpecialtySummary(
        selected,
        hospitalName,
        data.data_through,
        publishedSpecialtyAdmissions,
        data.hospital.new_admissions_total,
      ),
    )
    return () => reportHospitalSummary(null)
  }, [
    data.data_through,
    data.hospital.new_admissions_total,
    hospitalName,
    publishedSpecialtyAdmissions,
    reportHospitalSummary,
    selected,
  ])

  if (!selected) return null

  const summary = toHospitalSpecialtySummary(
    selected,
    hospitalName,
    data.data_through,
    publishedSpecialtyAdmissions,
    data.hospital.new_admissions_total,
  )
  const selectedHospitalShare = hospitalShare(selected, publishedSpecialtyAdmissions)
  const selectedRegionalShare = regionalShare(selected)
  const absence = comparisonAbsence(selected)

  function chooseSpecialty(code: string) {
    if (code === selectedCode) return
    clearAssistantQuestion()
    reportHospitalSummary(null)
    setSelectedCode(code)
  }

  return (
    <section className="hospital-panel specialty-panel" aria-labelledby="hospital-specialty-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">ESPECIALIDADES</p>
          <h2 id="hospital-specialty-title">Internações por especialidade</h2>
          <p>
            Volume, participação e permanência observados em {formatPeriod(data.data_through)}.
            Selecione uma linha para aprofundar a leitura, sem inferir causa ou qualidade.
          </p>
        </div>
        <strong data-testid="especialidade-count">
          {formatInteger(data.items.length)} de {formatInteger(data.pagination.count)} especialidades
        </strong>
      </div>

      <div className="hospital-table-wrap">
        <table
          className="hospital-table hospital-specialty-table"
          aria-label="Especialidades do hospital por internações novas"
        >
          <thead>
            <SortableHeader
              columns={tableColumns}
              sortBy={sortBy}
              descending={descending}
              onToggle={toggleSort}
              testIdPrefix="especialidade-sort"
            />
          </thead>
          <tbody>
            {sorted.map((item) => {
              const share = hospitalShare(item, publishedSpecialtyAdmissions)
              const isSelected = item.specialty_code === selected.specialty_code
              return (
                <tr
                  key={item.specialty_code}
                  className={isSelected ? 'specialty-selected' : undefined}
                  data-testid={`especialidade-row-${item.specialty_code}`}
                  onClick={() => chooseSpecialty(item.specialty_code)}
                >
                  <td data-label="Especialidade">
                    <button
                      type="button"
                      className="specialty-select"
                      aria-pressed={isSelected}
                      onClick={() => chooseSpecialty(item.specialty_code)}
                    >
                      <strong>{item.specialty_name}</strong>
                      <small>Código {item.specialty_code}</small>
                    </button>
                  </td>
                  <td data-label="Internações">
                    <strong>{formatInteger(item.new_admissions)}</strong>
                  </td>
                  <td
                    data-label={participationLabel}
                    data-testid={`especialidade-participacao-${item.specialty_code}`}
                  >
                    {share === null ? (
                      <em className="valor-ausente">sem denominador</em>
                    ) : (
                      <>
                        <strong>{formatPercent(share)}</strong>
                        <span className="specialty-share-track" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                        </span>
                      </>
                    )}
                  </td>
                  <td data-label="Permanência local / referência">
                    <StayComparison item={item} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <article className="specialty-summary" data-testid="specialty-summary" aria-live="polite">
        <div className="specialty-summary-heading">
          <div>
            <p className="section-kicker">{selected.specialty_name.toUpperCase()}</p>
            <h3>
              {formatInteger(selected.new_admissions)} internações em{' '}
              {formatPeriod(data.data_through)}
            </h3>
          </div>
          <small>{hospitalName}</small>
        </div>

        <dl className="specialty-summary-grid">
          <div>
            <dt>{participationLabel}</dt>
            <dd data-testid="specialty-summary-hospital-share">
              {selectedHospitalShare === null ? 'sem denominador' : formatPercent(selectedHospitalShare)}
            </dd>
            <small>
              {completeCoverage
                ? `de ${formatInteger(publishedSpecialtyAdmissions)} internações do hospital`
                : `de ${formatInteger(publishedSpecialtyAdmissions)} internações nas especialidades disponíveis; o total hospitalar publicado é ${formatInteger(data.hospital.new_admissions_total)}`}
            </small>
          </div>
          <div>
            <dt>Participação regional</dt>
            <dd data-testid="specialty-summary-share">
              {selectedRegionalShare === null ? 'sem comparação' : formatPercent(selectedRegionalShare)}
            </dd>
            <small>
              {selectedRegionalShare === null
                ? 'sem internações no denominador regional publicado'
                : `${formatInteger(selected.new_admissions)} de ${formatInteger(selected.new_admissions + selected.benchmark_admissions)} internações na especialidade`}
            </small>
          </div>
          <div>
            <dt>Permanência no hospital</dt>
            <dd data-testid="specialty-summary-local-stay">
              {selected.average_stay_days === null
                ? 'não calculada'
                : `${formatDecimal(selected.average_stay_days)} dias`}
            </dd>
            <small>observada, sem ajuste de risco</small>
          </div>
          <div>
            <dt>Demais hospitais</dt>
            <dd data-testid="specialty-summary-reference">
              {absence || selected.average_stay_benchmark === null
                ? 'sem comparação'
                : `${formatDecimal(selected.average_stay_benchmark)} dias`}
            </dd>
            <small>
              {absence ??
                `${formatInteger(selected.benchmark_hospitals)} outros hospitais, mesma especialidade e mês`}
            </small>
          </div>
        </dl>

        <p className="specialty-summary-caveat" data-testid="specialty-summary-sample">
          Comparação descritiva, sem ajuste de risco. Diferenças de permanência não demonstram
          causa, qualidade, falta de profissionais nem efeito de uma intervenção.
        </p>

        <div className="specialty-summary-actions" aria-label="Explicações locais da FlowIA">
          {SUMMARY_QUESTIONS.map((question) => (
            <button
              type="button"
              key={question}
              onClick={() => requestAssistantQuestion(question, summary)}
            >
              {question}
            </button>
          ))}
        </div>
      </article>
    </section>
  )
}

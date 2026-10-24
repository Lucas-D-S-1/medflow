import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useSource } from '../../shared/SourceContext'
import { formatDecimal, formatInteger, formatPercent, formatPeriod } from '../../shared/format'
import { useSortableRows, type SortableColumn } from '../../shared/useSortableRows'
import type { SpecialtyItem, SpecialtyResponse } from './hospitalEspecialidades'
import SpecialtyDiagnoses from './SpecialtyDiagnoses'
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

export default function SpecialtyTable({
  data,
  hospitalName,
}: {
  data: SpecialtyResponse
  hospitalName: string
}) {
  const {
    reportHospitalSummary,
    reportHospitalSpecialties,
    requestAssistantQuestion,
    clearAssistantQuestion,
  } = useSource()
  const publishedSpecialtyAdmissions = useMemo(
    () => data.items.reduce((total, item) => total + item.new_admissions, 0),
    [data.items],
  )
  const initial = useMemo(() => selectInitialSpecialty(data.items), [data.items])
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const selected =
    data.items.find((item) => item.specialty_code === searchParams.get('especialidade')) ?? initial
  const selectedCode = selected?.specialty_code ?? ''
  const completeCoverage = publishedSpecialtyAdmissions === data.hospital.new_admissions_total
  const participationLabel = completeCoverage
    ? 'Participação no hospital'
    : 'Participação nas especialidades disponíveis'
  const tableColumns = useMemo(
    () => columns(publishedSpecialtyAdmissions, participationLabel),
    [participationLabel, publishedSpecialtyAdmissions],
  )
  const { sorted } = useSortableRows(
    data.items,
    tableColumns,
    'internacoes',
    (item) => item.specialty_code,
  )

  useEffect(() => {
    clearAssistantQuestion()
  }, [clearAssistantQuestion, data.data_through, data.filters.cnes, selectedCode])

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

  useEffect(() => {
    reportHospitalSpecialties({
      cnes: data.filters.cnes,
      competence: data.data_through,
      items: data.items.map((item) => ({
        code: item.specialty_code,
        name: item.specialty_name,
        newAdmissions: item.new_admissions,
        stayDaysTotal: item.stay_days_total,
        averageStayDays: item.average_stay_days,
        benchmarkAdmissions: item.benchmark_admissions,
        benchmarkStayDaysTotal: item.benchmark_stay_days_total,
        benchmarkHospitals: item.benchmark_hospitals,
        averageStayBenchmark: item.average_stay_benchmark,
        sampleStatus: item.sample_status,
        comparisonStatus: item.ipe_sample_status,
        ipe: item.ipe,
      })),
    })
    return () => reportHospitalSpecialties(null)
  }, [data.data_through, data.filters.cnes, data.items, reportHospitalSpecialties])

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
    if (code === selectedCode && searchParams.get('especialidade') === code) return
    if (code !== selectedCode) {
      clearAssistantQuestion()
      reportHospitalSummary(null)
    }
    const next = new URLSearchParams(searchParams)
    next.set('especialidade', code)
    navigate({ search: `?${next}`, hash })
  }

  return (
    <>
      <section
        id="hospital-specialties"
        tabIndex={-1}
        className="hospital-panel specialty-panel"
        aria-labelledby="hospital-specialty-title"
      >
        <div className="block-heading">
          <div>
            <p className="section-kicker">ESPECIALIDADES</p>
            <h2 id="hospital-specialty-title">
              Especialidades · {formatPeriod(data.data_through)}
            </h2>
            <p>
              Volume, participação e permanência observados em {formatPeriod(data.data_through)}.
              Selecione uma linha para aprofundar a leitura, sem inferir causa ou qualidade.
            </p>
          </div>
          <strong data-testid="especialidade-count">
            {formatInteger(data.items.length)} de {formatInteger(data.pagination.count)}{' '}
            especialidades
          </strong>
        </div>

        <div className="specialty-workspace">
          <div className="specialty-choices" aria-label="Especialidades do hospital">
            {sorted.map((item) => {
              const share = hospitalShare(item, publishedSpecialtyAdmissions)
              return (
                <div
                  key={item.specialty_code}
                  data-testid={`especialidade-row-${item.specialty_code}`}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) chooseSpecialty(item.specialty_code)
                  }}
                >
                  <button
                    type="button"
                    className="specialty-choice specialty-select"
                    aria-pressed={item.specialty_code === selectedCode}
                    onClick={() => chooseSpecialty(item.specialty_code)}
                  >
                    <strong>
                      {item.specialty_name} <small>{item.specialty_code}</small>
                    </strong>
                    <b>{formatInteger(item.new_admissions)}</b>
                    <span
                      data-label={participationLabel}
                      data-testid={`especialidade-participacao-${item.specialty_code}`}
                    >
                      {share === null
                        ? 'sem denominador'
                        : `${formatPercent(share)} ${completeCoverage ? 'do hospital' : 'das especialidades disponíveis'}`}
                    </span>
                    <span>
                      {item.average_stay_days === null
                        ? 'não calculado'
                        : `${formatDecimal(item.average_stay_days)} dias`}
                    </span>
                  </button>
                </div>
              )
            })}
            <p>Seleção inicial por maior volume, não por indicação clínica.</p>
          </div>

          <article className="specialty-summary" data-testid="specialty-summary" aria-live="polite">
            <div className="specialty-summary-heading">
              <div>
                <p className="section-kicker">{selected.specialty_name.toUpperCase()}</p>
                <p className="specialty-summary-period">{formatPeriod(data.data_through)}</p>
                <h3>
                  {formatInteger(selected.new_admissions)} internações em {selected.specialty_name}
                </h3>
              </div>
              <small>{hospitalName}</small>
            </div>

            <dl className="specialty-summary-grid">
              <div>
                <dt>{participationLabel}</dt>
                <dd data-testid="specialty-summary-hospital-share">
                  {selectedHospitalShare === null
                    ? 'sem denominador'
                    : formatPercent(selectedHospitalShare)}
                </dd>
                <small>
                  {completeCoverage
                    ? `${formatInteger(selected.new_admissions)} de ${formatInteger(publishedSpecialtyAdmissions)} internações do hospital`
                    : `de ${formatInteger(publishedSpecialtyAdmissions)} internações nas especialidades disponíveis; o total hospitalar publicado é ${formatInteger(data.hospital.new_admissions_total)}`}
                </small>
              </div>
              <div>
                <dt>Participação regional</dt>
                <dd data-testid="specialty-summary-share">
                  {selectedRegionalShare === null
                    ? 'sem comparação'
                    : formatPercent(selectedRegionalShare)}
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
                <small>
                  {formatInteger(selected.stay_days_total)} dias ÷{' '}
                  {formatInteger(selected.new_admissions)} internações
                </small>
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
                    `${formatInteger(selected.benchmark_admissions)} internações em ${formatInteger(selected.benchmark_hospitals)} outros hospitais · ${formatInteger(selected.benchmark_stay_days_total)} dias no total`}
                </small>
              </div>
            </dl>

            {selectedRegionalShare === 100 && (
              <p>
                100% descreve a participação no volume regional observado; não indica qualidade ou
                desempenho.
              </p>
            )}
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
        </div>
      </section>
      <SpecialtyDiagnoses
        cnes={data.filters.cnes}
        competence={data.data_through}
        specialtyCode={selected.specialty_code}
        specialtyName={selected.specialty_name}
      />
    </>
  )
}

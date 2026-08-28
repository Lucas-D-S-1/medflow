import type { SpecialtyItem, SpecialtyResponse } from './hospitalEspecialidades'
import {
  SortableHeader,
  useSortableRows,
  type SortableColumn,
} from '../../shared/useSortableRows'
import { formatCurrency, formatDecimal, formatInteger, formatPercent, formatPeriod } from '../../shared/format'

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

function ausencia(item: SpecialtyItem) {
  return item.new_admissions === 0 ? 'sem internação nova' : 'não calculado'
}

const COLUMNS: SortableColumn<SpecialtyItem>[] = [
  { id: 'especialidade', label: 'Especialidade', numeric: false, value: (item) => item.specialty_name },
  { id: 'internacoes', label: 'Internações', numeric: true, value: (item) => item.new_admissions },
  {
    id: 'tmh',
    label: 'Mortalidade observada (TMH)',
    hint: 'sem ajuste de risco',
    numeric: true,
    value: (item) => item.tmh_percent,
  },
  { id: 'permanencia', label: 'Permanência média', numeric: true, value: (item) => item.average_stay_days },
  {
    id: 'cmi',
    label: 'Custo médio por internação (CMI real)',
    numeric: true,
    value: (item) => item.cmi_real,
  },
]

export default function SpecialtyTable({ data }: { data: SpecialtyResponse }) {
  const { sorted, sortBy, descending, toggleSort } = useSortableRows(
    data.items,
    COLUMNS,
    'internacoes',
    (item) => item.specialty_name,
  )

  return (
    <section className="hospital-panel" aria-labelledby="hospital-specialty-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">PERFIL POR ESPECIALIDADE</p>
          <h2 id="hospital-specialty-title">
            Especialidades em {formatPeriod(data.data_through)}
          </h2>
          <p>
            Ordene por qualquer indicador. As especialidades somam as{' '}
            {formatInteger(data.hospital.new_admissions_total)} internações do hospital na
            competência; especialidade com amostra insuficiente não é comparável.
          </p>
        </div>
        <strong data-testid="especialidade-count">
          {formatInteger(data.items.length)} de {formatInteger(data.pagination.count)}{' '}
          especialidades
        </strong>
      </div>

      <div className="hospital-table-wrap">
        <table
          className="hospital-table hospital-specialty-table"
          aria-label="Especialidades do hospital por internações novas"
        >
          <thead>
            <SortableHeader
              columns={COLUMNS}
              sortBy={sortBy}
              descending={descending}
              onToggle={toggleSort}
              testIdPrefix="especialidade-sort"
            />
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.specialty_code} data-testid={`especialidade-row-${item.specialty_code}`}>
                <td data-label="Especialidade">
                  <strong>{item.specialty_name}</strong>
                  <small>código {item.specialty_code}</small>
                  {item.sample_status === 'amostra_insuficiente' && (
                    <small
                      className="marca-amostra"
                      data-testid={`especialidade-sample-${item.specialty_code}`}
                    >
                      amostra insuficiente para comparação
                    </small>
                  )}
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.new_admissions)}</strong>
                  <small>
                    {formatInteger(item.deaths)} óbitos ·{' '}
                    {formatInteger(item.stay_days_total)} dias
                  </small>
                </td>
                <td data-label="TMH">
                  <Valor valor={item.tmh_percent} formatar={formatPercent} ausencia={ausencia(item)} />
                </td>
                <td data-label="Permanência média">
                  <Valor
                    valor={item.average_stay_days}
                    formatar={formatDecimal}
                    ausencia={ausencia(item)}
                  />
                </td>
                <td data-label="CMI real">
                  <Valor valor={item.cmi_real} formatar={formatCurrency} ausencia={ausencia(item)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

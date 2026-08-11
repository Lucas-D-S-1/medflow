import type { SpecialtyItem, SpecialtyResponse } from './hospitalEspecialidades'
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

export default function SpecialtyTable({ data }: { data: SpecialtyResponse }) {
  return (
    <section className="hospital-panel" aria-labelledby="hospital-specialty-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">PERFIL POR ESPECIALIDADE</p>
          <h2 id="hospital-specialty-title">
            Especialidades em {formatPeriod(data.data_through)}
          </h2>
          <p>
            Em ordem decrescente de internações novas. As especialidades somam as{' '}
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
            <tr>
              <th scope="col">Especialidade</th>
              <th scope="col">Internações</th>
              <th scope="col">TMH</th>
              <th scope="col">Permanência média</th>
              <th scope="col">CMI real</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
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

import type { CidItem, CidResponse } from '../api/hospitalCids'
import { formatDecimal, formatInteger, formatPercent } from '../utils/format'

const PREVIEW_SIZE = 10

/** Por que a comparação não é elegível, com o motivo do contrato. */
const MOTIVO_INELEGIVEL: Record<Exclude<CidItem['sample_status'], 'suficiente'>, string> = {
  amostra_insuficiente: 'amostra insuficiente para comparar',
  // Há hospital par; o que falta é permanência registrada neles.
  benchmark_zero: 'pares sem permanência registrada',
}

export default function CidTable({
  data,
  eligibleOnly,
}: {
  data: CidResponse
  eligibleOnly: boolean
}) {
  const visibleItems = data.items.slice(0, PREVIEW_SIZE)

  return (
    <section className="hospital-panel" aria-labelledby="hospital-cid-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">DIAGNÓSTICOS E PARES</p>
          <h2 id="hospital-cid-title">Índice de permanência relativa por diagnóstico</h2>
          <p>
            IPR compara a permanência média do hospital com a dos demais hospitais da
            região no mesmo diagnóstico, no período agregado. Acima de 1 significa
            permanência maior que a dos pares; não é medida de qualidade nem de desfecho.
          </p>
        </div>
        <strong data-testid="cid-count">
          {formatInteger(visibleItems.length)} de {formatInteger(data.pagination.count)}{' '}
          diagnósticos
        </strong>
      </div>

      <div className="cid-reference" data-testid="cid-reference">
        <span>
          <strong>{formatInteger(data.hospital.hospital_eligible_combinations)}</strong>{' '}
          diagnósticos elegíveis neste hospital
        </span>
        <span>
          mediana de IPR em {data.hospital.region_name}:{' '}
          <strong>{formatDecimal(data.hospital.region_ipr_median)}</strong>
        </span>
        <span>
          <strong>{formatPercent(data.hospital.region_percent_above_reference)}</strong> das{' '}
          {formatInteger(data.hospital.region_eligible_combinations)} combinações elegíveis da
          região estão acima da referência
        </span>
      </div>

      <div className="hospital-table-wrap">
        <table
          className="hospital-table hospital-cid-table"
          aria-label="Diagnósticos do hospital por internações novas"
        >
          <thead>
            <tr>
              <th scope="col">Diagnóstico</th>
              <th scope="col">Internações</th>
              <th scope="col">Permanência do hospital</th>
              <th scope="col">Benchmark regional</th>
              <th scope="col">IPR</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.cid_code} data-testid={`cid-row-${item.cid_code}`}>
                <td data-label="Diagnóstico">
                  <strong>{item.cid_description}</strong>
                  <small>
                    {item.cid_code} · capítulo {item.chapter_code} ·{' '}
                    {item.chapter_description}
                  </small>
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.new_admissions)}</strong>
                  <small>{formatInteger(item.stay_days_total)} dias</small>
                </td>
                <td data-label="Permanência do hospital">
                  <strong>{formatDecimal(item.average_stay_hospital)}</strong>
                </td>
                <td data-label="Benchmark regional">
                  {item.average_stay_benchmark === null ? (
                    <em className="valor-ausente">sem hospital par</em>
                  ) : (
                    <>
                      <strong>{formatDecimal(item.average_stay_benchmark)}</strong>
                      <small>
                        {formatInteger(item.benchmark_admissions)} internações em{' '}
                        {formatInteger(item.benchmark_hospitals)} hospitais
                      </small>
                    </>
                  )}
                </td>
                <td data-label="IPR">
                  {item.ipr === null ? (
                    <em className="valor-ausente" data-testid={`cid-inelegivel-${item.cid_code}`}>
                      {MOTIVO_INELEGIVEL[item.sample_status as keyof typeof MOTIVO_INELEGIVEL]}
                    </em>
                  ) : (
                    <strong data-testid={`cid-ipr-${item.cid_code}`}>
                      {formatDecimal(item.ipr)}
                    </strong>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.pagination.count > PREVIEW_SIZE && (
        <p className="cid-truncado" data-testid="cid-truncado">
          Mostrando os {formatInteger(visibleItems.length)} diagnósticos de maior volume de{' '}
          {formatInteger(data.pagination.count)}
          {eligibleOnly ? ' elegíveis' : ''}. Os demais não são exibidos nesta tela.
        </p>
      )}
    </section>
  )
}

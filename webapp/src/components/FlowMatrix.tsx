import { useEffect, useState } from 'react'
import type { FlowResponse, FlowType } from '../api/fluxos'
import { formatInteger, formatPercent } from '../utils/format'

const PREVIEW_SIZE = 8

const FLOW_LABELS: Record<FlowType, string> = {
  intrarregional: 'No próprio território',
  interregional_sp: 'Outra região de SP',
  entrada_outro_estado: 'Entrada de outra UF',
}

export default function FlowMatrix({ data }: { data: FlowResponse }) {
  const [showAll, setShowAll] = useState(false)
  const primaryItems = data.items.slice(0, PREVIEW_SIZE)
  const additionalItems = data.items.slice(PREVIEW_SIZE)

  useEffect(() => setShowAll(false), [
    data.data_through,
    data.filters.origin_region_code,
    data.filters.destination_region_code,
  ])

  function renderTable(items: FlowResponse['items'], label: string) {
    return (
      <div className="flow-table-wrap">
        <table className="flow-table" aria-label={label}>
          <thead>
            <tr>
              <th scope="col">Origem</th>
              <th scope="col">Destino do atendimento</th>
              <th scope="col">Tipo de fluxo</th>
              <th scope="col">Internações</th>
              <th scope="col">Participação na origem observada</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={`${item.origin_region_code}-${item.destination_region_code}`}
                className={item.flow_type === 'intrarregional' ? 'own-territory' : undefined}
                data-testid={`flow-row-${item.destination_region_code}`}
              >
                <td data-label="Origem">{item.origin_region_name}</td>
                <td data-label="Destino">
                  <strong>{item.destination_region_name}</strong>
                  <small>{item.destination_macroregion_name}</small>
                </td>
                <td data-label="Tipo">{FLOW_LABELS[item.flow_type]}</td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.new_admissions)}</strong>
                </td>
                <td data-label="Participação">
                  <div className="flow-share">
                    <span
                      aria-hidden="true"
                      style={{ width: `${item.destination_share_of_observed_origin_percent}%` }}
                    />
                  </div>
                  <strong>{formatPercent(item.destination_share_of_observed_origin_percent)}</strong>
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
      <section className="flow-matrix-panel" aria-labelledby="flow-matrix-title">
        <div className="block-heading">
          <div>
            <p className="section-kicker">MATRIZ ORIGEM–DESTINO</p>
            <h2 id="flow-matrix-title">{data.territory.region_name} como origem</h2>
            <p>
              Destinos em ordem decrescente de internações novas; a barra usa a
              participação persistida de cada destino no total observado da origem.
            </p>
          </div>
          <strong data-testid="flow-count">
            {formatInteger(showAll ? data.items.length : primaryItems.length)} de{' '}
            {formatInteger(data.pagination.count)} destinos
          </strong>
        </div>

        {renderTable(primaryItems, 'Destinos principais por internações novas')}

        {data.items.length > PREVIEW_SIZE && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            aria-controls="flow-additional-destinations"
          >
            {showAll
              ? 'Ocultar destinos adicionais'
              : `Ver todos os ${formatInteger(data.items.length)} destinos`}
          </button>
        )}
      </section>

      {showAll && additionalItems.length > 0 && (
        <section
          className="flow-matrix-panel flow-matrix-detail"
          id="flow-additional-destinations"
          aria-labelledby="flow-additional-title"
        >
          <div className="block-heading">
            <div>
              <p className="section-kicker">DEMAIS DESTINOS</p>
              <h2 id="flow-additional-title">Fluxos de menor volume observado</h2>
            </div>
            <strong>{formatInteger(additionalItems.length)} destinos adicionais</strong>
          </div>
          {renderTable(additionalItems, 'Destinos adicionais por internações novas')}
        </section>
      )}
    </>
  )
}

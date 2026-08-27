import { useEffect, useState } from 'react'
import type { IcsapResponse } from './icsap'
import { formatDecimal, formatInteger, formatPercent } from '../../shared/format'

const PREVIEW_SIZE = 8

export default function IcsapPanel({ data }: { data: IcsapResponse }) {
  const [showAll, setShowAll] = useState(false)
  const visibleItems = showAll ? data.items : data.items.slice(0, PREVIEW_SIZE)

  useEffect(() => setShowAll(false), [
    data.data_through,
    data.filters.region_code,
  ])

  return (
    <section className="flow-matrix-panel icsap-panel" aria-labelledby="icsap-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">CONDIÇÕES SENSÍVEIS À ATENÇÃO PRIMÁRIA</p>
          <h2 id="icsap-title">{data.region.region_name} — composição das ICSAP</h2>
          <p>
            Grupos da Portaria 221/2008 em ordem decrescente de internações; a
            participação e a taxa por 10 mil habitantes acompanham cada grupo.
          </p>
        </div>
        <strong data-testid="icsap-count">
          {formatInteger(visibleItems.length)} de{' '}
          {formatInteger(data.pagination.count)} grupos
        </strong>
      </div>

      <div className="flow-table-wrap">
        <table className="flow-table icsap-table" aria-label="Grupos ICSAP por internações">
          <thead>
            <tr>
              <th scope="col">Grupo</th>
              <th scope="col">Internações</th>
              <th scope="col">Participação nas ICSAP</th>
              <th scope="col">Taxa por 10 mil</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.group_code} data-testid={`icsap-row-${item.group_code}`}>
                <td data-label="Grupo">
                  <strong>{item.group_name}</strong>
                  <small>grupo {item.group_code}</small>
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.icsap_admissions)}</strong>
                </td>
                <td data-label="Participação">
                  <div className="flow-share">
                    <span
                      aria-hidden="true"
                      style={{ width: `${item.group_share_of_icsap_percent}%` }}
                    />
                  </div>
                  <strong>{formatPercent(item.group_share_of_icsap_percent)}</strong>
                </td>
                <td data-label="Taxa por 10 mil">
                  <strong>{formatDecimal(item.group_rate_per_10k)}</strong>
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
        >
          {showAll
            ? 'Ocultar grupos de menor volume'
            : `Ver todos os ${formatInteger(data.items.length)} grupos`}
        </button>
      )}
    </section>
  )
}

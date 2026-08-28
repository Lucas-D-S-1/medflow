import { useEffect, useState } from 'react'
import type { HospitalItem, HospitalListResponse } from './hospitais'
import { formatCurrency, formatDecimal, formatInteger, formatPercent } from '../../shared/format'

const PREVIEW_SIZE = 8

/**
 * Motivo pelo qual um indicador não pôde ser calculado, dito com as palavras do
 * contrato. Nunca inventar um número no lugar.
 */
function motivoAusencia(item: HospitalItem, campo: 'iph' | 'derivado') {
  if (campo === 'iph' && item.capacity_status === 'sem_leito_sus_declarado') {
    return 'sem leito SUS declarado'
  }
  if (campo === 'derivado' && item.new_admissions === 0) {
    return 'sem internação nova na competência'
  }
  return 'não calculado'
}

function Valor({
  valor,
  formatar,
  motivo,
}: {
  valor: number | null
  formatar: (n: number) => string
  motivo: string
}) {
  if (valor === null) return <em className="valor-ausente">{motivo}</em>
  return <strong>{formatar(valor)}</strong>
}

export default function HospitalTable({
  data,
  selectedCnes,
  onSelect,
}: {
  data: HospitalListResponse
  selectedCnes: string
  onSelect: (cnes: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const primaryItems = data.items.slice(0, PREVIEW_SIZE)
  const additionalItems = data.items.slice(PREVIEW_SIZE)

  useEffect(() => setShowAll(false), [data.data_through, data.filters.region_code])

  // A lista completa vira dois blocos em vez de uma tabela só. Uma seção única
  // com todos os hospitais passa de metade da altura da página em telas
  // estreitas, que é o limite que esta interface se impôs.
  function renderTable(items: HospitalItem[], label: string) {
    return (
      <div className="hospital-table-wrap">
        <table className="hospital-table" aria-label={label}>
          <thead>
            <tr>
              <th scope="col">Hospital</th>
              <th scope="col">Internações</th>
              <th scope="col">Pressão sobre leitos (IPH)</th>
              <th scope="col">Mortalidade observada (TMH)</th>
              <th scope="col">Permanência média</th>
              <th scope="col">Custo médio por internação (CMI real)</th>
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.cnes}
                className={item.cnes === selectedCnes ? 'hospital-selected' : undefined}
                data-testid={`hospital-row-${item.cnes}`}
              >
                <td data-label="Hospital">
                  <strong>{item.hospital_name}</strong>
                  <small>
                    CNES {item.cnes} · {item.unit_type_name} ·{' '}
                    {formatInteger(item.sus_beds)} leitos SUS
                  </small>
                  {item.district_code && (
                    <small>
                      Distrito {item.district_code} · CRS {item.health_coordinator_code ?? '—'} · STS{' '}
                      {item.health_technical_supervision_code ?? '—'}
                    </small>
                  )}
                  {item.sample_status === 'amostra_insuficiente' && (
                    <small className="marca-amostra" data-testid={`hospital-sample-${item.cnes}`}>
                      amostra insuficiente para comparação
                    </small>
                  )}
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.new_admissions)}</strong>
                  <small>{formatInteger(item.deaths)} óbitos</small>
                </td>
                <td data-label="IPH estimado">
                  <Valor
                    valor={item.iph_percent}
                    formatar={formatPercent}
                    motivo={motivoAusencia(item, 'iph')}
                  />
                  {item.above_declared_capacity === 1 && (
                    <small
                      className="marca-capacidade"
                      data-testid={`hospital-capacity-${item.cnes}`}
                    >
                      acima da capacidade declarada
                    </small>
                  )}
                </td>
                <td data-label="TMH">
                  <Valor
                    valor={item.tmh_percent}
                    formatar={formatPercent}
                    motivo={motivoAusencia(item, 'derivado')}
                  />
                </td>
                <td data-label="Permanência média">
                  <Valor
                    valor={item.average_stay_days}
                    formatar={formatDecimal}
                    motivo={motivoAusencia(item, 'derivado')}
                  />
                </td>
                <td data-label="CMI real">
                  <Valor
                    valor={item.cmi_real}
                    formatar={formatCurrency}
                    motivo={motivoAusencia(item, 'derivado')}
                  />
                </td>
                <td data-label="Ação">
                  <button
                    type="button"
                    className="secondary-action compacta"
                    aria-pressed={item.cnes === selectedCnes}
                    data-testid={`hospital-select-${item.cnes}`}
                    onClick={() => onSelect(item.cnes)}
                  >
                    {item.cnes === selectedCnes ? 'Selecionado' : 'Abrir'}
                  </button>
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
      <section className="hospital-panel" aria-labelledby="hospital-list-title">
        <div className="block-heading">
          <div>
            <p className="section-kicker">HOSPITAIS DA REGIÃO</p>
            <h2 id="hospital-list-title">{data.region.region_name}</h2>
            <p>
              Em ordem decrescente de internações novas. Selecione um hospital para
              abrir a série, o perfil por especialidade e a comparação por diagnóstico.
            </p>
          </div>
          <strong data-testid="hospital-count">
            {formatInteger(showAll ? data.items.length : primaryItems.length)} de{' '}
            {formatInteger(data.pagination.count)} hospitais
          </strong>
        </div>

        {renderTable(primaryItems, 'Hospitais da região por internações novas')}

        {data.items.length > PREVIEW_SIZE && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            aria-controls="hospital-additional"
          >
            {showAll
              ? 'Ocultar hospitais de menor volume'
              : `Ver todos os ${formatInteger(data.items.length)} hospitais`}
          </button>
        )}
      </section>

      {showAll && additionalItems.length > 0 && (
        <section
          className="hospital-panel hospital-panel-detail"
          id="hospital-additional"
          aria-labelledby="hospital-additional-title"
        >
          <div className="block-heading">
            <div>
              <p className="section-kicker">DEMAIS HOSPITAIS</p>
              <h2 id="hospital-additional-title">Menor volume observado na competência</h2>
            </div>
            <strong>{formatInteger(additionalItems.length)} hospitais adicionais</strong>
          </div>
          {renderTable(additionalItems, 'Hospitais adicionais por internações novas')}
        </section>
      )}
    </>
  )
}

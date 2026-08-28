import { useMemo, useState } from 'react'
import type { HospitalItem } from './hospitais'
import {
  distributionOf,
  iphMeasuresRotation,
  METRICS,
  MIN_PEERS,
  peerGroupOf,
  percentileOf,
  type MetricId,
  type PeerHospital,
  type PeerMode,
} from './pares'
import PositionBar from '../../shared/PositionBar'
import StatePanel from '../../shared/StatePanel'
import { formatCurrency, formatDecimal, formatInteger, formatPercent } from '../../shared/format'
import './HospitalPeers.css'

const LABELS: Record<MetricId, { label: string; format: (value: number) => string }> = {
  iph: { label: 'Pressão sobre leitos (IPH)', format: formatPercent },
  tmh: { label: 'Mortalidade observada (TMH)', format: formatPercent },
  stay: { label: 'Permanência média', format: (value) => `${formatDecimal(value)} dias` },
  cmi: { label: 'Custo médio por internação (CMI real)', format: formatCurrency },
  ipe: {
    label: 'Permanência ante os pares (IPE)',
    format: (value) => formatDecimal(value),
  },
}

type HospitalPeersProps = {
  hospital: HospitalItem
  regionName: string
  regionHospitals: HospitalItem[]
  statewide: PeerHospital[] | null
  statewideFailed: boolean
}

/**
 * Onde este hospital cai entre os semelhantes, indicador a indicador.
 *
 * O produto sabia dizer o número e nunca soube dizer se ele era normal. Sem
 * grupo de pares, "IPH 396,7%" acusa o hospital-dia de ser o mais pressionado
 * do estado, quando ele nem opera com internação de um dia.
 */
export default function HospitalPeers({
  hospital,
  regionName,
  regionHospitals,
  statewide,
  statewideFailed,
}: HospitalPeersProps) {
  const [mode, setMode] = useState<PeerMode>('tipo-porte')
  const group = peerGroupOf(hospital, mode, regionName)

  const peers = useMemo(() => {
    if (mode === 'regiao') return regionHospitals
    if (!statewide) return []
    return statewide.filter(
      (item) => peerGroupOf(item as HospitalItem, mode, regionName).key === group.key,
    )
  }, [group.key, mode, regionHospitals, regionName, statewide])

  const rotation = iphMeasuresRotation(hospital)
  const waiting = mode === 'tipo-porte' && !statewide && !statewideFailed

  return (
    <section className="hospital-peers" aria-labelledby="hospital-peers-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">COMPARAÇÃO COM PARES</p>
          <h3 id="hospital-peers-title">{hospital.hospital_name}</h3>
          <p>
            {hospital.unit_type_name} · {formatInteger(hospital.sus_beds)} leitos SUS ·{' '}
            {formatInteger(hospital.new_admissions)} internações
          </p>
        </div>
        <div className="peer-mode" role="radiogroup" aria-label="Grupo de comparação">
          {(['tipo-porte', 'regiao'] as PeerMode[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="radio"
              aria-checked={mode === candidate}
              onClick={() => setMode(candidate)}
              data-testid={`peer-mode-${candidate}`}
            >
              {candidate === 'tipo-porte' ? 'Mesmo tipo e porte' : 'Mesma região'}
            </button>
          ))}
        </div>
      </div>

      {rotation && (
        <p className="peer-caveat" data-testid="peer-iph-caveat">
          Este estabelecimento tem permanência média abaixo de um dia. O IPH divide
          pacientes-dia por leitos-dia declarados, e a reconstrução atribui ao menos um
          dia por internação — aqui ele mede <strong>giro sobre capacidade</strong>, não
          ocupação. Comparar com unidades do mesmo tipo mantém a comparação justa; não
          transforma o número em taxa de ocupação.
        </p>
      )}

      {waiting && (
        <StatePanel kind="loading" title="Montando o grupo de pares" testId="peer-loading">
          Buscando os hospitais do estado para comparar por tipo e porte.
        </StatePanel>
      )}

      {statewideFailed && mode === 'tipo-porte' && (
        <StatePanel kind="error" title="Grupo de pares indisponível" testId="peer-error">
          Não foi possível carregar a lista estadual agora. A comparação por região
          continua disponível.
        </StatePanel>
      )}

      {!waiting && !(statewideFailed && mode === 'tipo-porte') && (
        <div className="peer-metrics">
          {(Object.keys(LABELS) as MetricId[]).map((metric) => {
            const value = METRICS[metric](hospital)
            // O próprio hospital sai do grupo: comparar alguém consigo mesmo
            // puxa a mediana na direção dele. É a mesma regra que o IPR já
            // aplica ao excluir o hospital do benchmark regional.
            const values = peers
              .filter((item) => item.cnes !== hospital.cnes)
              .map((item) => METRICS[metric](item as HospitalItem))
            const distribution = distributionOf(values)
            const percentile = value === null ? null : percentileOf(values, value)

            return (
              <article key={metric} className="peer-metric">
                <div className="peer-metric-head">
                  <h4>{LABELS[metric].label}</h4>
                  <strong data-testid={`peer-value-${metric}`}>
                    {value === null ? 'não calculado' : LABELS[metric].format(value)}
                  </strong>
                </div>
                {value !== null && distribution && percentile !== null ? (
                  <PositionBar
                    value={value}
                    distribution={distribution}
                    percentile={percentile}
                    format={LABELS[metric].format}
                    peerLabel={group.label}
                    testId={`peer-bar-${metric}`}
                  />
                ) : (
                  <p className="peer-insufficient" data-testid={`peer-insufficient-${metric}`}>
                    {value === null
                      ? 'Sem valor publicado para comparar.'
                      : `Menos de ${MIN_PEERS} pares com valor calculado em ${group.label}.`}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

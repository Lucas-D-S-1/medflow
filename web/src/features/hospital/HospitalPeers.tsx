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
import { formatCurrency, formatDecimal, formatInteger, formatPercent, formatPeriod } from '../../shared/format'
import './HospitalPeers.css'

const LABELS: Record<MetricId, { label: string; format: (value: number) => string }> = {
  iph: { label: 'Pressão sobre leitos (IPH)', format: formatPercent },
  stay: { label: 'Permanência média', format: (value) => `${formatDecimal(value)} dias` },
  admissions: { label: 'Internações novas', format: formatInteger },
  tmh: { label: 'Mortalidade observada (TMH)', format: formatPercent },
  cmi: { label: 'Valor médio aprovado pelo SUS (CMI real)', format: formatCurrency },
  ipe: {
    label: 'Permanência ante os pares (IPE)',
    format: (value) => formatDecimal(value),
  },
}

const PRIMARY_METRICS: MetricId[] = ['iph', 'stay', 'admissions']
const SECONDARY_METRICS: MetricId[] = ['tmh', 'cmi', 'ipe']

type HospitalPeersProps = {
  hospital: HospitalItem
  competence: string
  regionName: string
  regionHospitals: HospitalItem[]
  statewide: PeerHospital[] | null
  statewideFailed: boolean
  snapshotLimited: boolean
  onChangeHospital: () => void
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
  competence,
  regionName,
  regionHospitals,
  statewide,
  statewideFailed,
  snapshotLimited,
  onChangeHospital,
}: HospitalPeersProps) {
  const [modoPedido, setModoPedido] = useState<PeerMode>('regiao-porte')

  const grupoDe = (candidato: PeerMode) => peerGroupOf(hospital, candidato, regionName)
  // Na região e no mesmo porte pode não haver com quem comparar: a régua sobe
  // para o estado, ainda no mesmo porte, e a tela diz que subiu. Cair calado
  // num grupo diferente do anunciado é pior do que não comparar.
  const { mode, peers } = useMemo(() => {
    const paresDe = (candidato: PeerMode) => {
      if (!statewide) return []
      const chave = peerGroupOf(hospital, candidato, regionName).key
      return statewide.filter(
        (item) =>
          peerGroupOf(item as HospitalItem, candidato, regionName).key === chave &&
          item.cnes !== hospital.cnes,
      )
    }
    const regionais = paresDe('regiao-porte')
    const escolhido: PeerMode =
      modoPedido === 'regiao-porte' && regionais.length < MIN_PEERS ? 'porte' : modoPedido
    return {
      mode: escolhido,
      peers: escolhido === 'regiao-porte' ? regionais : paresDe(escolhido),
    }
  }, [hospital, modoPedido, regionName, statewide])

  const rebaixado = mode !== modoPedido
  const group = grupoDe(mode)

  // Quanto da região passa por este hospital. A participação descreve volume
  // observado; não define papel assistencial, gravidade ou complexidade.
  const internacoesDaRegiao = regionHospitals.reduce(
    (total, item) => total + item.new_admissions,
    0,
  )
  const participacao =
    internacoesDaRegiao > 0 ? (hospital.new_admissions / internacoesDaRegiao) * 100 : null

  const rotation = iphMeasuresRotation(hospital)
  const waiting = !statewide && !statewideFailed && !snapshotLimited

  function metricRow(metric: MetricId) {
    const value = METRICS[metric](hospital)
    const values = peers.map((item) => METRICS[metric](item as HospitalItem))
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
          <div className="peer-metric-comparison">
            <PositionBar
              value={value}
              distribution={distribution}
              percentile={percentile}
              format={LABELS[metric].format}
              peerLabel={group.label}
              testId={`peer-bar-${metric}`}
              showLegend={false}
            />
            <span>
              Mediana dos pares <strong>{LABELS[metric].format(distribution.median)}</strong>
            </span>
          </div>
        ) : (
          <p className="peer-insufficient" data-testid={`peer-insufficient-${metric}`}>
            {value === null
              ? 'Sem valor publicado para comparar.'
              : `Menos de ${MIN_PEERS} pares com valor calculado em ${group.label}.`}
          </p>
        )}
      </article>
    )
  }

  return (
    <section className="hospital-peers" aria-labelledby="hospital-peers-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">COMPARAÇÃO COM PARES</p>
          <h3 id="hospital-peers-title">{hospital.hospital_name}</h3>
          <p>
            {hospital.unit_type_name} · {formatInteger(hospital.sus_beds)} leitos SUS ·{' '}
            {formatInteger(hospital.new_admissions)} internações · {formatPeriod(competence)}
            {participacao !== null && (
              <>
                {' · '}
                <strong data-testid="peer-participacao">
                  {formatPercent(participacao)} das internações da região
                </strong>
              </>
            )}
          </p>
        </div>
        <div className="peer-actions">
          <button type="button" className="peer-change" onClick={onChangeHospital}>
            Trocar hospital
          </button>
          <div className="peer-mode" role="radiogroup" aria-label="Alcance da comparação">
            {(['regiao-porte', 'porte'] as PeerMode[]).map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="radio"
                aria-checked={modoPedido === candidate}
                disabled={snapshotLimited}
                onClick={() => setModoPedido(candidate)}
                data-testid={`peer-mode-${candidate}`}
              >
                {candidate === 'regiao-porte' ? 'Na região' : 'No estado'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* O porte é a régua, e ela fica escrita: sem saber com quem o número
          está sendo comparado, a posição na faixa não quer dizer nada. */}
      {!waiting && !statewideFailed && !snapshotLimited && (
        <p className="peer-criterio" data-testid="peer-criterio">
          <strong>{formatInteger(peers.length)}</strong>{' '}
          {peers.length === 1 ? 'hospital' : 'hospitais'} de <strong>{group.porte}</strong>
          {mode === 'regiao-porte' ? `, em ${regionName}` : ', no estado'}; unidade selecionada excluída.
        </p>
      )}

      {rebaixado && !snapshotLimited && (
        <p className="peer-caveat" data-testid="peer-rebaixado">
          Em {regionName} não há {MIN_PEERS} hospitais na faixa de {group.porte} para
          comparar, então a régua subiu para o estado, no mesmo porte.
        </p>
      )}

      {rotation && (
        <p className="peer-caveat" data-testid="peer-iph-caveat">
          Este estabelecimento tem permanência média abaixo de um dia. O IPH divide
          pacientes-dia por leitos-dia declarados, e a reconstrução atribui ao menos um
          dia por internação — aqui ele mede <strong>giro sobre capacidade</strong>, não
          ocupação. O mesmo porte melhora a comparabilidade, mas não transforma o
          número em taxa de ocupação.
        </p>
      )}

      {waiting && (
        <StatePanel kind="loading" title="Montando o grupo de pares" testId="peer-loading">
          Buscando os hospitais do mesmo porte para comparar.
        </StatePanel>
      )}

      {statewideFailed && (
        <StatePanel kind="error" title="Grupo de pares indisponível" testId="peer-error">
          Não foi possível carregar a lista de hospitais agora, então não há com quem
          comparar. Os indicadores do hospital continuam disponíveis.
        </StatePanel>
      )}

      {snapshotLimited && (
        <StatePanel kind="empty" title="Pares estaduais fora do snapshot" testId="peer-snapshot-limited">
          A contingência contém os hospitais de Jundiaí, mas não a lista estadual
          completa exigida por este grupo de porte. Por isso a comparação com pares
          não é declarada neste preview.
        </StatePanel>
      )}

      {!waiting && !statewideFailed && !snapshotLimited && (
        <>
          <p className="peer-legend">
            <span><i className="peer-marker" aria-hidden="true" /> este hospital</span>
            <span><i className="peer-range" aria-hidden="true" /> metade central dos pares (P25–P75)</span>
            <span>traço: mediana · comparação descritiva, sem ajuste de risco</span>
          </p>
          <div className="peer-metrics">
            {PRIMARY_METRICS.map(metricRow)}
          </div>
          <details className="peer-more" data-testid="peer-more">
            <summary>Mais indicadores</summary>
            <div className="peer-metrics secondary">
              {SECONDARY_METRICS.map(metricRow)}
            </div>
          </details>
        </>
      )}

      {!waiting && !statewideFailed && !snapshotLimited && peers.length > 0 && (
        <details className="peer-lista" data-testid="peer-lista">
          <summary>Quem são os {formatInteger(peers.length)} pares</summary>
          {/* Sem os nomes, a faixa é um número sobre um grupo invisível. Com
              eles, dá para conferir se o grupo faz sentido — foi assim que se
              descobriu que o benchmark de um hospital de 876 leitos incluía um
              hospital com uma internação no mês. */}
          <ul>
            {[...peers]
              .sort((esquerda, direita) => direita.new_admissions - esquerda.new_admissions)
              .map((par) => (
                <li key={par.cnes}>
                  <strong>{par.hospital_name}</strong>
                  <span>
                    {formatInteger(par.sus_beds)} leitos ·{' '}
                    {formatInteger(par.new_admissions)} internações
                    {par.average_stay_days !== null &&
                      ` · ${formatDecimal(par.average_stay_days)} dias de permanência`}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  )
}

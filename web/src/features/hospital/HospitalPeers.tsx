import { useReadingState } from '../../shared/useReadingState'
import { useMemo } from 'react'
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
import SourceBadge from '../../shared/SourceBadge'
import { useSource } from '../../shared/SourceContext'
import { requestAnalysisAnchor } from '../../shared/analysisNavigation'
import PositionBar from '../../shared/PositionBar'
import StatePanel from '../../shared/StatePanel'
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../../shared/format'
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
  const { sourceState } = useSource()
  const [modoPedido, setModoPedido] = useReadingState<PeerMode>(
    `peers:${hospital.cnes}:${competence}`,
    'regiao-porte',
  )

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
  const regionalPeers =
    statewide?.filter(
      (item) =>
        item.cnes !== hospital.cnes &&
        peerGroupOf(item as HospitalItem, 'regiao-porte', regionName).key ===
          grupoDe('regiao-porte').key,
    ).length ?? 0
  const [moreOpen, setMoreOpen] = useReadingState(
    `peers-more:${hospital.cnes}:${competence}`,
    false,
  )
  const group = grupoDe(mode)

  // Quanto da região passa por este hospital. A participação descreve volume
  // observado; não define papel assistencial, gravidade ou complexidade.
  const internacoesDaRegiao = regionHospitals.reduce(
    (total, item) => total + item.new_admissions,
    0,
  )
  const participacao =
    internacoesDaRegiao > 0 ? (hospital.new_admissions / internacoesDaRegiao) * 100 : null

  const displayName =
    hospital.hospital_name === 'HCSVP HOSPITAL SAO VICENTE'
      ? 'Hospital São Vicente'
      : hospital.hospital_name === 'HU HOSPITAL UNIVERSITARIO'
        ? 'HU Hospital Universitário'
        : hospital.hospital_name
  const rotation = iphMeasuresRotation(hospital)
  const waiting = !statewide && !statewideFailed && !snapshotLimited

  function metricRow(metric: MetricId) {
    const value = METRICS[metric](hospital)
    const values = peers.map((item) => METRICS[metric](item as HospitalItem))
    const distribution = distributionOf(values)
    const percentile = value === null ? null : percentileOf(values, value)

    return (
      <article key={metric} className="peer-metric">
        <div className="peer-metric-label">
          <h4>{LABELS[metric].label}</h4>
          {metric === 'iph' && (
            <p>
              {formatInteger(hospital.patient_days_estimated)} pacientes-dia estimados ÷{' '}
              {formatInteger(hospital.declared_bed_days)} leitos-dia SUS declarados × 100.
              Estimativa mensal; não é ocupação medida.
            </p>
          )}
          {metric === 'stay' && <p>Dias de permanência por internação no mês.</p>}
          {metric === 'admissions' && <p>Volume mensal publicado.</p>}
          {metric === 'cmi' && (
            <p>A preços de {formatPeriod(competence)}; não é custo contábil completo.</p>
          )}
          {metric === 'ipe' && (
            <p>
              Mediana de {formatInteger(hospital.ipe_eligible_specialties)} especialidades
              elegíveis. Não é permanência em dias.
            </p>
          )}
        </div>
        <div className="peer-metric-head">
          <div className="peer-current">
            <span>Este hospital</span>
            <strong data-testid={`peer-value-${metric}`}>
              {value === null ? 'não calculado' : LABELS[metric].format(value)}
            </strong>
          </div>
          {distribution && (
            <div className="peer-median">
              <span>Mediana dos pares</span> <b>{LABELS[metric].format(distribution.median)}</b>
            </div>
          )}
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
              Metade central dos pares: {LABELS[metric].format(distribution.p25)} a{' '}
              {LABELS[metric].format(distribution.p75)} · {formatInteger(distribution.count)} com
              valor
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
    <>
      <header className="hospital-identity">
        <button type="button" className="hospital-back" onClick={onChangeHospital}>
          ← Hospitais de {regionName}
        </button>
        <p className="hospital-breadcrumb">
          {regionName} / {hospital.hospital_name}
        </p>
        <div className="hospital-identity-heading">
          <div>
            <h2>{displayName}</h2>
            <p>
              {hospital.hospital_name} · CNES {hospital.cnes}
            </p>
            <p>
              {hospital.unit_type_name} · {formatInteger(hospital.sus_beds)} leitos SUS ·{' '}
              {formatPeriod(competence)}
            </p>
          </div>
          <div className="peer-actions">
            {(sourceState.kind === 'live' || sourceState.kind === 'fallback') && (
              <SourceBadge
                kind={sourceState.kind}
                dataThrough={sourceState.data.status.data_through}
              />
            )}
            <button type="button" className="peer-change" onClick={onChangeHospital}>
              Trocar hospital
            </button>
          </div>
        </div>
        <p>
          <strong>
            {formatInteger(hospital.new_admissions)} de {formatInteger(internacoesDaRegiao)}{' '}
            internações da região
          </strong>
          {participacao !== null && (
            <>
              {' '}
              ·{' '}
              <span data-testid="peer-participacao">
                {formatPercent(participacao)} das internações da região
              </span>
            </>
          )}
        </p>
        <nav className="hospital-jumps" aria-label="Neste hospital">
          {[
            ['hospital-comparison', 'Comparação'],
            ['hospital-evolution', 'Evolução'],
            ['hospital-specialties', 'Especialidades'],
            ['specialty-diagnoses', 'Diagnósticos'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault()
                requestAnalysisAnchor(id)
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      <section
        id="hospital-comparison"
        className="hospital-peers"
        aria-labelledby="hospital-peers-title"
        tabIndex={-1}
      >
        <div className="block-heading">
          <div>
            <h3 id="hospital-peers-title">Comparação com hospitais do mesmo porte</h3>
            {!waiting && !statewideFailed && !snapshotLimited && (
              <p className="peer-applied">
                Referência aplicada:{' '}
                <strong>{mode === 'porte' ? 'Estado de São Paulo' : regionName}</strong>
              </p>
            )}
          </div>
          <div className="peer-actions">
            <div className="peer-mode" role="radiogroup" aria-label="Alcance da comparação">
              {(['regiao-porte', 'porte'] as PeerMode[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  role="radio"
                  aria-checked={mode === candidate}
                  disabled={
                    snapshotLimited ||
                    waiting ||
                    statewideFailed ||
                    (candidate === 'regiao-porte' && regionalPeers < MIN_PEERS)
                  }
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
            {mode === 'regiao-porte' ? `, em ${regionName}` : ', no estado'}; unidade selecionada
            excluída.
          </p>
        )}

        {rebaixado && !waiting && !statewideFailed && !snapshotLimited && (
          <p className="peer-caveat" data-testid="peer-rebaixado">
            <span className="peer-fallback-short">
              {regionName} não tem {MIN_PEERS} outros hospitais desse porte. A comparação usa o
              estado.
            </span>
            <span className="peer-fallback-detail">
              Não há pelo menos {MIN_PEERS} outros hospitais desse porte em {regionName}. A
              comparação usa o estado. O tipo “{hospital.unit_type_name}” identifica o
              estabelecimento, mas não é critério do grupo.
            </span>
          </p>
        )}

        {rotation && (
          <p className="peer-caveat" data-testid="peer-iph-caveat">
            Este estabelecimento tem permanência média abaixo de um dia. O IPH divide pacientes-dia
            por leitos-dia declarados, e a reconstrução atribui ao menos um dia por internação —
            aqui ele mede <strong>giro sobre capacidade</strong>, não ocupação. O mesmo porte
            melhora a comparabilidade, mas não transforma o número em taxa de ocupação.
          </p>
        )}

        {waiting && (
          <StatePanel kind="loading" title="Montando o grupo de pares" testId="peer-loading">
            Buscando os hospitais do mesmo porte para comparar.
          </StatePanel>
        )}

        {statewideFailed && (
          <StatePanel kind="error" title="Grupo de pares indisponível" testId="peer-error">
            Não foi possível carregar a lista necessária para comparar os hospitais agora. A
            comparação está indisponível.
          </StatePanel>
        )}

        {snapshotLimited && (
          <StatePanel
            kind="empty"
            title="Comparação estadual não incluída na cópia local"
            testId="peer-snapshot-limited"
          >
            A cópia local parcial contém os hospitais de Jundiaí, mas não a lista estadual completa
            exigida por este grupo de porte. Por isso a comparação com pares está indisponível nesta
            cópia.
          </StatePanel>
        )}

        {!waiting && !statewideFailed && !snapshotLimited && (
          <>
            <div className="peer-metrics">{PRIMARY_METRICS.map(metricRow)}</div>
            <p className="peer-legend">
              <span>
                <i className="peer-marker" aria-hidden="true" /> este hospital
              </span>
              <span>
                <i className="peer-range" aria-hidden="true" /> metade central dos pares (P25–P75)
              </span>
              <span>traço: mediana</span>
            </p>
            <p className="peer-limit">
              Comparação descritiva, sem ajuste de risco. Não mede qualidade do cuidado.
            </p>
            <details
              className="peer-more"
              data-testid="peer-more"
              open={moreOpen}
              onToggle={(event) => setMoreOpen(event.currentTarget.open)}
            >
              <summary>Mais indicadores</summary>
              <div className="peer-metrics secondary">{SECONDARY_METRICS.map(metricRow)}</div>
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
                      {formatInteger(par.sus_beds)} leitos · {formatInteger(par.new_admissions)}{' '}
                      internações
                      {par.average_stay_days !== null &&
                        ` · ${formatDecimal(par.average_stay_days)} dias de permanência`}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </section>
    </>
  )
}

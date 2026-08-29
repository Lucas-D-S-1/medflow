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

  // Quanto da região passa por este hospital. Um hospital que concentra a maior
  // parte das internações não é um par entre iguais: ele é a referência, e
  // recebe o que os outros não resolvem.
  const internacoesDaRegiao = regionHospitals.reduce(
    (total, item) => total + item.new_admissions,
    0,
  )
  const participacao =
    internacoesDaRegiao > 0 ? (hospital.new_admissions / internacoesDaRegiao) * 100 : null

  const rotation = iphMeasuresRotation(hospital)
  const waiting = !statewide && !statewideFailed

  return (
    <section className="hospital-peers" aria-labelledby="hospital-peers-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">COMPARAÇÃO COM PARES</p>
          <h3 id="hospital-peers-title">{hospital.hospital_name}</h3>
          <p>
            {hospital.unit_type_name} · {formatInteger(hospital.sus_beds)} leitos SUS ·{' '}
            {formatInteger(hospital.new_admissions)} internações
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
        <div className="peer-mode" role="radiogroup" aria-label="Alcance da comparação">
          {(['regiao-porte', 'porte'] as PeerMode[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="radio"
              aria-checked={modoPedido === candidate}
              onClick={() => setModoPedido(candidate)}
              data-testid={`peer-mode-${candidate}`}
            >
              {candidate === 'regiao-porte' ? 'Na região' : 'No estado'}
            </button>
          ))}
        </div>
      </div>

      {/* O porte é a régua, e ela fica escrita: sem saber com quem o número
          está sendo comparado, a posição na faixa não quer dizer nada. */}
      <p className="peer-criterio" data-testid="peer-criterio">
        Comparando com <strong>{formatInteger(peers.length)}</strong>{' '}
        {peers.length === 1 ? 'hospital' : 'hospitais'} na faixa de{' '}
        <strong>{group.porte}</strong>
        {mode === 'regiao-porte' ? `, em ${regionName}` : ', no estado'}. O porte entra
        no critério porque é ele que torna os números comparáveis; o próprio
        hospital fica de fora do grupo.
      </p>

      {rebaixado && (
        <p className="peer-caveat" data-testid="peer-rebaixado">
          Em {regionName} não há {MIN_PEERS} hospitais na faixa de {group.porte} para
          comparar, então a régua subiu para o estado, no mesmo porte.
        </p>
      )}

      {participacao !== null && participacao >= 40 && (
        <p className="peer-caveat" data-testid="peer-referencia">
          Este hospital concentra {formatPercent(participacao)} das internações da
          região. Concentração assim costuma vir com o papel de referência, que
          recebe o caso que os demais não resolvem — e permanência maior é o
          esperado nesse papel, não um desvio dele.
        </p>
      )}

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
          Buscando os hospitais do mesmo porte para comparar.
        </StatePanel>
      )}

      {statewideFailed && (
        <StatePanel kind="error" title="Grupo de pares indisponível" testId="peer-error">
          Não foi possível carregar a lista de hospitais agora, então não há com quem
          comparar. Os indicadores do hospital continuam nas seções acima.
        </StatePanel>
      )}

      {!waiting && !statewideFailed && (
        <div className="peer-metrics">
          {(Object.keys(LABELS) as MetricId[]).map((metric) => {
            const value = METRICS[metric](hospital)
            // O próprio hospital sai do grupo: comparar alguém consigo mesmo
            // puxa a mediana na direção dele. É a mesma regra que o IPR já
            // aplica ao excluir o hospital do benchmark regional.
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

      {!waiting && !statewideFailed && peers.length > 0 && (
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

import { Link, useLocation } from 'react-router-dom'
import type { RegionalSummaryItem } from '../../lib/api/regioes'
import MetricCard from '../../shared/MetricCard'
import { formatCurrency, formatDecimal, formatInteger, formatPercent, formatPeriodLong } from '../../shared/format'
import { useSource } from '../../shared/SourceContext'
import { aggregateRegions, type RegionalAggregate } from './agregado'
import { SIGNALS, signalLabel, type RegionSignals } from './sinais'
import StateTotals from './StateTotals'

const percent = (value: number | null) => value === null ? 'sem base' : formatPercent(value)
const days = (value: number | null) => value === null ? 'sem base' : `${formatDecimal(value)} dias`
const monthLabel = (competence: string) => formatPeriodLong(competence).replace('/', ' de ')
const change = (value: number | null) => value === null
  ? 'sem comparação disponível'
  : `${value < 0 ? '−' : value > 0 ? '+' : ''}${formatPercent(Math.abs(value) * 100)}`

type Props = {
  items: RegionalSummaryItem[]
  stateItems: RegionalSummaryItem[]
  selected: RegionalSummaryItem | null
  aggregate: RegionalAggregate
  competence: string
  scopeLabel: string
  mom: number | null
  yoy: number | null
  signals: Map<string, RegionSignals>
  onViewHospitals: () => void
}

export function RegionalOverview({ items, stateItems, selected, aggregate, competence, scopeLabel, mom, signals, onViewHospitals }: Props) {
  const { setSharedRegion, sourceState } = useSource()
  const hasStateComparison = sourceState.kind === 'live'
  const stateDetail = (value: string) => hasStateComparison ? `estado: ${value}` : 'estado indisponível na contingência'
  const state = aggregateRegions(stateItems)
  const ranking = [...stateItems].sort((a, b) => b.iph_percent - a.iph_percent || a.region_code.localeCompare(b.region_code))
  const rank = selected ? ranking.findIndex((item) => item.region_code === selected.region_code) + 1 : 0
  const alerts = items.filter((item) => (signals.get(item.region_code)?.count ?? 0) >= Math.ceil(SIGNALS.length / 2)).length
  return <aside className="regional-overview" aria-labelledby="regional-overview-title" data-testid="regional-overview">
    <div className="overview-heading">
      <div>
        <p className="section-kicker">{selected ? 'REGIÃO DE SAÚDE' : scopeLabel === 'São Paulo' ? 'TOTAL DO ESTADO' : 'TOTAL DA REDE'}</p>
        <h2 id="regional-overview-title" data-testid={selected ? 'regional-selected-name' : undefined}>
          {selected ? selected.region_name : `${scopeLabel} em ${monthLabel(competence)}`}
        </h2>
        <p data-testid="regional-overview-scope">
          {selected ? <>{formatInteger(selected.municipality_count)} municípios · {formatInteger(selected.population)} habitantes · {formatInteger(selected.hospitals_with_admissions)} hospitais com produção</>
            : <>{formatInteger(aggregate.regions)} regiões · {formatInteger(aggregate.municipalities)} municípios · {formatInteger(aggregate.hospitalsWithAdmissions)} hospitais com produção</>}
        </p>
      </div>
      {selected && <button className="overview-back" type="button" disabled={sourceState.kind === 'fallback'} onClick={() => setSharedRegion('')}>✕ Voltar ao estado</button>}
    </div>
    {selected && hasStateComparison && <p className={`regional-rank${rank === 1 ? ' highest' : ''}`} data-testid="regional-rank">
      <strong>{rank === 1 ? 'Maior pressão estimada do estado' : 'Pressão estimada no estado'}</strong> em {monthLabel(competence)}: {rank}ª de {ranking.length} regiões.
    </p>}
    <div className="overview-metrics">
      {selected ? <>
        <MetricCard label="Pressão estimada (IPH)" value={formatPercent(selected.iph_percent)} detail={stateDetail(percent(state.iphPercent))} testId="overview-iph" />
        <MetricCard label="Internações novas" value={formatInteger(selected.new_admissions)} detail={stateDetail(formatInteger(state.newAdmissions))} testId="overview-admissions" />
        <MetricCard label="Permanência média" value={days(selected.average_stay_days)} detail={stateDetail(days(state.averageStayDays))} testId="overview-stay" />
        <MetricCard label="Saíram para outra região" value={formatPercent(selected.observed_evasion_percent)} detail={stateDetail(percent(state.evasionPercent))} testId="overview-evasion" />
      </> : <>
        <MetricCard label="Internações novas" value={formatInteger(aggregate.newAdmissions)} detail={`${change(mom)} ante o mês anterior`} testId="overview-admissions" />
        <MetricCard label="Pressão estimada (IPH)" value={percent(aggregate.iphPercent)} detail="pacientes-dia ÷ leitos-dia declarados" testId="overview-iph" />
        <MetricCard label="Permanência média" value={days(aggregate.averageStayDays)} detail="dias por internação" testId="overview-stay" />
        <MetricCard label="Regiões em alerta" value={`${alerts} de ${items.length}`} detail={`${Math.ceil(SIGNALS.length / 2)} ou mais sinais · triagem comparativa`} testId="overview-alerts" />
      </>}
    </div>
    {selected ? <div className="overview-next">
      <button className="overview-hospitals" type="button" onClick={onViewHospitals}>Ver os {formatInteger(selected.hospitals_with_admissions)} hospitais da região ↓</button>
      <small>Depois: hospital → especialidade → comparação com pares</small>
    </div> : <section className="pressure-ranking" aria-labelledby="pressure-ranking-title">
      <h3 id="pressure-ranking-title">Onde a pressão é maior</h3>
      <p>IPH estimado por região · clique para abrir</p>
      <ol>{items.slice(0, 5).map((item, index) => <li key={item.region_code}>
        <button type="button" onClick={() => setSharedRegion(item.region_code)} disabled={sourceState.kind === 'fallback'} data-testid={`pressure-region-${item.region_code}`}>
          <span className="pressure-position">{index + 1}</span>
          <span className="pressure-region"><span>{item.region_name}</span><span className="pressure-track" aria-hidden="true"><span style={{ width: `${items[0].iph_percent > 0 ? Math.max(0, item.iph_percent / items[0].iph_percent * 100) : 0}%` }} /></span></span>
          <strong>{formatPercent(item.iph_percent)}</strong><span aria-hidden="true">›</span>
        </button>
      </li>)}</ol>
    </section>}
  </aside>
}

export function MoreRegionalIndicators({ items, selected, aggregate, competence, scopeLabel, mom, yoy, signals }: Props) {
  const { requestAssistantQuestion } = useSource()
  const current = selected ? aggregateRegions([selected]) : aggregate
  const chips = [
    ['Valor médio SUS', current.cmiNominal === null ? 'sem base' : formatCurrency(current.cmiNominal)],
    ['No próprio território', percent(current.ownRegionPercent)],
    [selected ? 'Leitos SUS declarados' : 'Fora da região', selected ? formatInteger(selected.declared_sus_beds) : percent(current.evasionPercent)],
    ['Acima dos pares (IPE)', percent(current.ipeAbovePercent)],
    ['Mortalidade (TMH)', percent(current.tmhPercent)],
    ['ICSAP', percent(current.icsapSharePercent)],
  ]
  const selectedSignals = selected ? signals.get(selected.region_code) : null
  return <section className="more-indicators" aria-label="Mais indicadores" key={`${competence}-${scopeLabel}-${selected?.region_code ?? 'state'}`}>
    <div className="more-indicators-preview"><h3>Mais indicadores ({chips.length})</h3>
      <ul>{chips.map(([label, value]) => <li key={label}>{label} <strong>{value}</strong></li>)}</ul>
    </div>
    <details data-testid="more-indicators">
      <summary><span className="show-all">Mostrar todos ▾</span><span className="show-less">Recolher indicadores ▴</span></summary>
      {selected && <section className="regional-signal-details">
        <p className="section-kicker">SINAIS DE ATENÇÃO</p>
        <strong data-testid="regional-map-signals">{selectedSignals?.count ?? 0} de {SIGNALS.length} sinais acesos</strong>
        <p>Competência {formatPeriodLong(competence)}. Os sinais são triagem comparativa, não nota de qualidade.</p>
        <ul>{SIGNALS.map((signal) => <li key={signal.id} data-signal={signal.id}>{signalLabel(signal.id)}{selectedSignals?.lit.includes(signal.id) ? ' · sinal aceso' : ' · sem sinal aceso'}</li>)}</ul>
      </section>}
      <StateTotals aggregate={current} competence={competence} scopeLabel={selected?.region_name ?? scopeLabel} mom={mom} yoy={yoy} signals={new Map(items.filter((item) => !selected || item.region_code === selected.region_code).map((item) => [item.region_code, signals.get(item.region_code)!]))} />
    </details>
    {selected && <div className="regional-help">
      <button type="button" onClick={() => requestAssistantQuestion('O que são os sinais?')}>O que são os sinais?</button>
      <button type="button" onClick={() => requestAssistantQuestion('O que é IPH?')}>O que é IPH?</button>
    </div>}
  </section>
}

export function RegionalLimitNote() {
  const { search } = useLocation()
  return <p className="regional-limit-note">IPH é estimativa mensal sobre a capacidade declarada; não é ocupação em tempo real. <Link to={{ pathname: '/metodologia', search }}>Consultar fontes e indicadores</Link></p>
}

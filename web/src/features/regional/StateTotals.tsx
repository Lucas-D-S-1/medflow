import MetricCard from '../../shared/MetricCard'
import type { RegionalAggregate } from './agregado'
import type { RegionSignals } from './sinais'
import { SIGNALS } from './sinais'
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../../shared/format'
import './StateTotals.css'

type StateTotalsProps = {
  aggregate: RegionalAggregate
  competence: string
  /** Rótulo do recorte: o estado inteiro, ou a rede regional filtrada. */
  scopeLabel: string
  mom: number | null
  yoy: number | null
  signals: Map<string, RegionSignals>
}

function percent(value: number | null) {
  return value === null ? 'sem base' : formatPercent(value)
}

/** Ausência de comparação não é variação de zero, e o texto diz isso. */
function variationText(value: number | null) {
  if (value === null) return 'sem comparação'
  if (Math.abs(value) < 0.0005) return '0,0%'
  return `${value > 0 ? '+' : '−'}${formatPercent(Math.abs(value) * 100)}`
}

/**
 * O que o recorte inteiro está mostrando antes de escolher um território.
 * Sem isto, o panorama pedia que o gestor lesse 62 regiões para saber a ordem
 * de grandeza do próprio estado.
 */
export default function StateTotals({
  aggregate,
  competence,
  scopeLabel,
  mom,
  yoy,
  signals,
}: StateTotalsProps) {
  const deviation = aggregate.seasonalDeviation
  // Quantas regiões acumulam metade ou mais dos sinais: é a leitura de
  // quantos territórios pedem atenção, sem ordenar ninguém como "pior".
  const litThreshold = Math.ceil(SIGNALS.length / 2)
  const manySignals = [...signals.values()].filter((item) => item.count >= litThreshold).length

  return (
    <section className="state-totals" aria-labelledby="state-totals-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">TOTAL DO RECORTE</p>
          <h3 id="state-totals-title">
            {scopeLabel} em {formatPeriod(competence)}
          </h3>
          <p className="state-totals-scope" data-testid="state-totals-scope">
            {formatInteger(aggregate.regions)} regiões ·{' '}
            {formatInteger(aggregate.municipalities)} municípios ·{' '}
            {formatInteger(aggregate.population)} habitantes
          </p>
        </div>
        {deviation !== null && (
          <strong
            className={deviation > 0 ? 'up' : deviation < 0 ? 'down' : undefined}
            data-testid="state-totals-seasonal"
          >
            {`${deviation >= 0 ? '+' : '−'}${formatPercent(Math.abs(deviation) * 100)}`} ante a
            média histórica do mês
            <small>
              {formatInteger(aggregate.seasonalRegionsCompared)} regiões com histórico comparável
            </small>
          </strong>
        )}
      </div>

      <div className="state-totals-grid">
        <MetricCard
          label="Internações novas"
          value={formatInteger(aggregate.newAdmissions)}
          detail={`${formatInteger(aggregate.hospitalsWithAdmissions)} hospitais com produção`}
          testId="state-total-admissions"
        />
        <MetricCard
          label="MoM"
          value={variationText(mom)}
          detail="internações contra a competência anterior"
          testId="state-total-mom"
        />
        <MetricCard
          label="YoY"
          value={variationText(yoy)}
          detail="internações contra o mesmo mês do ano anterior"
          testId="state-total-yoy"
        />
        <MetricCard
          label="Regiões com metade dos sinais"
          value={`${formatInteger(manySignals)} de ${formatInteger(aggregate.regions)}`}
          detail={`${litThreshold} ou mais dos ${SIGNALS.length} indicadores no quintil mais alto`}
          testId="state-total-signals"
        />
        <MetricCard
          label="IPH estimado"
          value={percent(aggregate.iphPercent)}
          detail="pacientes-dia sobre leitos-dia declarados, somados"
          testId="state-total-iph"
        />
        <MetricCard
          label="TMH observado"
          value={percent(aggregate.tmhPercent)}
          detail="óbitos sobre internações, somados"
          testId="state-total-tmh"
        />
        <MetricCard
          label="Permanência média"
          value={
            aggregate.averageStayDays === null
              ? 'sem base'
              : `${formatDecimal(aggregate.averageStayDays)} dias`
          }
          detail="dias de permanência sobre internações"
          testId="state-total-stay"
        />
        <MetricCard
          label="CMI nominal"
          value={aggregate.cmiNominal === null ? 'sem base' : formatCurrency(aggregate.cmiNominal)}
          detail="valor aprovado sobre internações"
          testId="state-total-cmi"
        />
        <MetricCard
          label="Atendimento no próprio território"
          value={percent(aggregate.ownRegionPercent)}
          detail={`${formatInteger(aggregate.residentAdmissions)} internações de residentes`}
          testId="state-total-own-region"
        />
        <MetricCard
          label="Atendidos fora da própria região"
          value={percent(aggregate.evasionPercent)}
          detail="deslocamento entre regiões de São Paulo"
          testId="state-total-evasion"
        />
        <MetricCard
          label="Permanência acima dos pares (IPE)"
          value={percent(aggregate.ipeAbovePercent)}
          detail={
            aggregate.ipeEligiblePairs === 0
              ? 'nenhuma comparação elegível no recorte'
              : `${formatInteger(aggregate.ipeAboveReference)} de ${formatInteger(aggregate.ipeEligiblePairs)} comparações hospital-especialidade`
          }
          testId="state-total-ipe"
        />
        <MetricCard
          label="ICSAP"
          value={percent(aggregate.icsapSharePercent)}
          detail={
            aggregate.icsapRatePer10k === null
              ? `${formatInteger(aggregate.icsapAdmissions)} internações sensíveis`
              : `${formatDecimal(aggregate.icsapRatePer10k)} por 10 mil habitantes`
          }
          testId="state-total-icsap"
        />
      </div>

      <p className="state-totals-note">
        Cada razão acima é o total sobre o total das {formatInteger(aggregate.regions)} regiões
        publicadas, não a média dos percentuais de cada uma.
      </p>
    </section>
  )
}

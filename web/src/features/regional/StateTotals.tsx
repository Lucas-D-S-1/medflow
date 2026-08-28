import MetricCard from '../../shared/MetricCard'
import type { RegionalAggregate } from './agregado'
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
}

function percent(value: number | null) {
  return value === null ? 'sem base' : formatPercent(value)
}

/**
 * O que o recorte inteiro está mostrando antes de escolher um território.
 * Sem isto, o panorama pedia que o gestor lesse 62 regiões para saber a ordem
 * de grandeza do próprio estado.
 */
export default function StateTotals({ aggregate, competence, scopeLabel }: StateTotalsProps) {
  const deviation = aggregate.seasonalDeviation

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
            {`${deviation >= 0 ? '+' : '−'}${formatPercent(Math.abs(deviation) * 100)}`} ante o
            próprio mês
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

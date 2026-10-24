import { useSource } from './SourceContext'
import { formatDatabaseTime, formatPeriod } from './format'
import MetricCard from './MetricCard'
import SourceBadge from './SourceBadge'
import StatePanel from './StatePanel'

export default function SourcePanel() {
  const { sourceState, reload } = useSource()

  if (sourceState.kind === 'loading') {
    return (
      <section className="source-panel" aria-busy="true">
        <StatePanel kind="loading" title="Consultando a fonte" testId="loading-state">
          Validando a fonte e a competência publicada.
        </StatePanel>
      </section>
    )
  }

  if (sourceState.kind === 'empty') {
    return (
      <section className="source-panel">
        <StatePanel kind="empty" title="Nenhuma competência publicada" testId="empty-state">
          A fonte respondeu normalmente, mas ainda não possui dados disponíveis.
        </StatePanel>
      </section>
    )
  }

  if (sourceState.kind === 'error') {
    return (
      <section className="source-panel">
        <StatePanel
          kind="error"
          title="Dados e cópia local indisponíveis"
          testId="error-state"
          action={<button type="button" onClick={() => void reload()}>Tentar novamente</button>}
        >
          Não foi possível carregar os dados nem a cópia local.
        </StatePanel>
      </section>
    )
  }

  const { status, methodology } = sourceState.data
  return (
    <section className="source-panel" aria-label="Estado da fonte">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">ESTADO DA FONTE</p>
          <h2>Estado dos dados</h2>
        </div>
        <SourceBadge kind={sourceState.kind} dataThrough={status.data_through} />
      </div>
      <div className="metric-grid">
        <MetricCard
          label="Dados disponíveis até"
          value={formatPeriod(status.data_through)}
          detail="competência de processamento"
          testId="data-through"
        />
        <MetricCard
          label="Versão dos dados"
          value={`v${status.contract_version}`}
          detail="caminho versionado /v1"
          testId="contract-version"
        />
        <MetricCard
          label="Base publicada em"
          value={formatDatabaseTime(methodology.gold_updated_at)}
          detail="manifesto da publicação · horário de Brasília"
          testId="gold-updated-at"
        />
        <MetricCard
          label="Última verificação"
          value={formatDatabaseTime(status.database_time)}
          detail={sourceState.kind === 'live' ? 'relógio do banco' : 'geração da cópia local'}
          testId="last-checked-at"
        />
      </div>
      {sourceState.kind === 'fallback' && (
        <div className="fallback-note" data-testid="fallback-note">
          <span aria-hidden="true">i</span>
          <p>
            {sourceState.reason === 'invalid-contract'
              ? 'A fonte respondeu, mas o conteúdo veio em um formato inesperado. '
              : 'A consulta aos dados está indisponível. '}
            Esta sessão usa somente uma cópia local parcial, com período e cobertura fixos. Alguns hospitais e detalhes não estão incluídos. Você pode{' '}
            <button type="button" onClick={() => void reload()}>tentar novamente</button>.
          </p>
        </div>
      )}
    </section>
  )
}

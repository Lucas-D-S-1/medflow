import { useSource } from '../source/SourceContext'
import { formatDatabaseTime, formatPeriod } from '../utils/format'
import MetricCard from './MetricCard'
import SourceBadge from './SourceBadge'
import StatePanel from './StatePanel'

export default function SourcePanel() {
  const { sourceState, reload } = useSource()

  if (sourceState.kind === 'loading') {
    return (
      <section className="source-panel" aria-busy="true">
        <StatePanel kind="loading" title="Consultando a fonte" testId="loading-state">
          Validando o contrato e a competência publicada.
        </StatePanel>
      </section>
    )
  }

  if (sourceState.kind === 'empty') {
    return (
      <section className="source-panel">
        <StatePanel kind="empty" title="Nenhuma competência publicada" testId="empty-state">
          A fonte respondeu normalmente, mas ainda não possui dados Gold disponíveis.
        </StatePanel>
      </section>
    )
  }

  if (sourceState.kind === 'error') {
    return (
      <section className="source-panel">
        <StatePanel
          kind="error"
          title="Fonte e contingência indisponíveis"
          testId="error-state"
          action={<button type="button" onClick={() => void reload()}>Tentar novamente</button>}
        >
          Não foi possível carregar o Oracle nem o snapshot local.
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
          <h2>Contrato operacional</h2>
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
          label="Contrato da API"
          value={`v${status.contract_version}`}
          detail="caminho versionado /v1"
          testId="contract-version"
        />
        <MetricCard
          label="Gold atualizada em"
          value={formatDatabaseTime(methodology.gold_updated_at)}
          detail="manifesto da Gold publicada"
          testId="gold-updated-at"
        />
        <MetricCard
          label="Última verificação"
          value={formatDatabaseTime(status.database_time)}
          detail={sourceState.kind === 'live' ? 'relógio do banco' : 'geração do snapshot'}
          testId="last-checked-at"
        />
      </div>
      {sourceState.kind === 'fallback' && (
        <div className="fallback-note" data-testid="fallback-note">
          <span aria-hidden="true">i</span>
          <p>
            {sourceState.reason === 'invalid-contract'
              ? 'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API. '
              : 'A consulta ao Oracle falhou ou excedeu o tempo limite. '}
            Esta sessão usa somente o snapshot local; nenhuma fonte foi misturada. Você pode{' '}
            <button type="button" onClick={() => void reload()}>tentar novamente</button>.
          </p>
        </div>
      )}
    </section>
  )
}

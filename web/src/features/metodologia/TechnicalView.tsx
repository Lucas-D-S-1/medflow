import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { technicalOrigin } from './technicalNavigation'
import { resumableAnalysis } from '../../shared/analysisReturn'
import SourcePanel from '../../shared/SourcePanel'
import { useSource } from '../../shared/SourceContext'
import { formatInteger, formatPeriod } from '../../shared/format'
import './MetodologiaView.css'
import './TechnicalView.css'

const databaseDecision = [
  {
    option: 'Oracle Autonomous Database 26ai',
    status: 'Escolha do MVP',
    gold: 5,
    serving: 5,
    language: 5,
    operation: 5,
    cost: 5,
    rationale: 'Gold, views, ORDS e Select AI no mesmo plano de dados.',
  },
  {
    option: 'PostgreSQL gerenciado + API própria',
    status: 'Alternativa avaliada',
    gold: 4,
    serving: 3,
    language: 2,
    operation: 3,
    cost: 4,
    rationale: 'Bom encaixe relacional, mas acrescentaria backend e integração de IA.',
  },
  {
    option: 'Warehouse analítico + aplicação separada',
    status: 'Alternativa avaliada',
    gold: 4,
    serving: 2,
    language: 3,
    operation: 3,
    cost: 3,
    rationale: 'Forte para análise, com mais componentes para servir o produto.',
  },
]

function scoreTotal(option: (typeof databaseDecision)[number]) {
  return option.gold + option.serving + option.language + option.operation + option.cost
}

export default function TechnicalView() {
  const { sourceState } = useSource()
  const location = useLocation()
  const navigate = useNavigate()
  const analysisOrigin = resumableAnalysis(location.search)
  const heading = useRef<HTMLHeadingElement>(null)
  const origin = technicalOrigin(location.state, location.search)

  useLayoutEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null
    if (target) {
      target.setAttribute('tabindex', '-1')
      target.scrollIntoView({ behavior: 'instant', block: 'start' })
      target.focus({ preventScroll: true })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
      heading.current?.focus({ preventScroll: true })
      const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      return () => cancelAnimationFrame(frame)
    }
  }, [location.key, location.hash, sourceState.kind])
  const data =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data.methodology
      : null

  const back = () => {
    if (origin) navigate(-1)
    else navigate({ pathname: '/metodologia', search: location.search }, { replace: true })
  }
  const sections = [
    ['publication', 'Publicação e cobertura'],
    ['reconciliation-title', 'Conferência de totais'],
    ['formulas', 'Fórmulas e cortes'],
    ['limits-title', 'Limites de interpretação'],
    ['architecture', 'Arquitetura'],
  ]

  return (
    <main className="page-main methodology-page technical-page">
      <button className="technical-back" type="button" onClick={back}>
        ← Voltar a Fontes e indicadores
      </button>
      <header className="view-header">
        <p className="section-kicker">Fontes e indicadores / Detalhes técnicos</p>
        <h1 ref={heading} tabIndex={-1}>
          Detalhes técnicos
        </h1>
        <p>Confira a publicação, os cálculos e os limites dos indicadores.</p>
      </header>
      <div className="technical-layout">
        <nav className="technical-index" aria-label="Índice dos detalhes técnicos">
          <strong>Nesta página</strong>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="technical-document">
          <section
            id="publication"
            className="technical-section"
            aria-labelledby="publication-title"
          >
            <h2 id="publication-title">Publicação e cobertura</h2>
            <SourcePanel />
            {data && (
              <>
                <p data-testid="methodology-data-through">
                  Base publicada até {formatPeriod(data.data_through)} · contrato v
                  {data.contract_version}
                </p>
                <p className="technical-coverage">
                  <strong data-testid="coverage-competencies">
                    {formatInteger(data.coverage.competencies)}
                  </strong>{' '}
                  competências ·{' '}
                  <strong data-testid="coverage-regions">
                    {formatInteger(data.coverage.regions)}
                  </strong>{' '}
                  regiões ·{' '}
                  <strong data-testid="coverage-hospitals">
                    {formatInteger(data.coverage.hospitals)}
                  </strong>{' '}
                  hospitais
                </p>
                <p>
                  Totais acumulados do conjunto publicado. Não são totais da competência
                  selecionada.
                </p>
                <dl className="technical-totals">
                  <div>
                    <dt>Internações novas</dt>
                    <dd data-testid="coverage-admissions">
                      {formatInteger(data.coverage.new_admissions)}
                    </dd>
                  </div>
                  <div>
                    <dt>Pacientes-dia estimados</dt>
                    <dd data-testid="coverage-patient-days">
                      {formatInteger(data.coverage.estimated_patient_days)}
                    </dd>
                  </div>
                  <div>
                    <dt>Dias de permanência</dt>
                    <dd data-testid="coverage-stay-days">
                      {formatInteger(data.coverage.stay_days)}
                    </dd>
                  </div>
                  <div>
                    <dt>Linhas hospital/especialidade com IPE elegível</dt>
                    <dd data-testid="coverage-eligible-ipe">
                      {formatInteger(data.coverage.eligible_ipe_rows)} de{' '}
                      {formatInteger(data.coverage.specialty_month_rows)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </section>
          {data && (
            <>
              <section className="technical-section" aria-labelledby="reconciliation-title">
                <h2 id="reconciliation-title">Conferência de totais</h2>
                <p>
                  {data.reconciliations.every((item) => item.difference === 0)
                    ? 'Os totais coincidem entre as visões regional e hospitalar.'
                    : 'Há diferenças entre as visões publicadas. Confira os valores antes de interpretar os totais.'}
                </p>
                <div className="technical-table-scroll">
                  <table className="technical-table">
                    <thead>
                      <tr>
                        <th scope="col">Verificação</th>
                        <th scope="col">Total regional</th>
                        <th scope="col">Total hospitalar</th>
                        <th scope="col">Diferença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reconciliations.map((item) => (
                        <tr key={item.id} data-testid={`reconciliation-${item.id}`}>
                          <th scope="row">{item.label}</th>
                          <td>{formatInteger(item.left_value)}</td>
                          <td>{formatInteger(item.right_value)}</td>
                          <td
                            className={
                              item.difference === 0 ? 'technical-match' : 'technical-divergence'
                            }
                          >
                            diferença: {formatInteger(item.difference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p
                  className={
                    data.reconciliations.every((item) => item.difference === 0)
                      ? 'technical-match'
                      : 'technical-divergence'
                  }
                >
                  {data.reconciliations.every((item) => item.difference === 0)
                    ? `As ${data.reconciliations.length} verificações publicadas não apresentam diferença.`
                    : 'A publicação apresenta divergência nos totais.'}{' '}
                  Isso não certifica qualidade clínica ou ausência de todos os erros.
                </p>
                <details>
                  <summary>Ver campos de origem</summary>
                  {data.reconciliations.map((item) => (
                    <p key={item.id}>
                      {item.left_label} / {item.right_label} · {item.note}
                    </p>
                  ))}
                </details>
              </section>
              <section id="formulas" className="technical-section" aria-labelledby="formulas-title">
                <h2 id="formulas-title">Fórmulas e cortes</h2>
                <p>{data.formulas.length} fórmulas publicadas. Ausência não é zero.</p>
                <div className="technical-formulas">
                  {data.formulas.map((formula) => (
                    <details
                      key={formula.id}
                      open={formula.id.toLowerCase() === 'iph'}
                      data-testid={`formula-${formula.id}`}
                    >
                      <summary>{formula.label}</summary>
                      {formula.id.toLowerCase() === 'iph' && (
                        <p className="technical-expression">
                          IPH (%) = pacientes-dia estimados ÷ leitos-dia SUS declarados × 100
                        </p>
                      )}
                      <p>
                        <strong>Expressão publicada:</strong> {formula.expression}
                      </p>
                      <p>{formula.interpretation}</p>
                    </details>
                  ))}
                </div>
                <div className="technical-cut-note">
                  TMH/CMI: classificação a partir de 30 internações. IPR/IPE: pelo menos 20 casos
                  locais, 50 casos na referência e 3 outros hospitais. Referência de permanência
                  igual a zero mantém o índice ausente. Sem leitos declarados, IPH ausente.
                </div>
                <details>
                  <summary>
                    Cortes de amostra e ausências · {data.cuts.length + data.states.length}
                  </summary>
                  {data.cuts.map((cut) => (
                    <article key={cut.id} data-testid={`cut-${cut.id}`}>
                      <h3>{cut.label}</h3>
                      <p>{cut.description}</p>
                    </article>
                  ))}
                  {data.states.map((state) => (
                    <article key={state.id} data-testid={`state-${state.id}`}>
                      <h3>
                        {state.label} · {formatInteger(state.count)} {state.count_label}
                      </h3>
                      <p>{state.description}</p>
                    </article>
                  ))}
                </details>
                <details>
                  <summary>Definições administrativas · {data.definitions.length}</summary>
                  {data.definitions.map((definition) => (
                    <article key={definition.id} data-testid={`definition-${definition.id}`}>
                      <h3>{definition.label}</h3>
                      <p>{definition.definition}</p>
                      <p>Campo Gold: {definition.gold_field}</p>
                      <p>{definition.value_note}</p>
                    </article>
                  ))}
                </details>
                <details data-testid="territorial-hierarchy">
                  <summary>Territórios e redes assistenciais · 3 conceitos</summary>
                  <h3>Município</h3>
                  <p>
                    Unidade administrativa usada para localizar residência, população e
                    estabelecimentos. Distritos e coordenadorias municipais não são sinônimos de
                    RRAS.
                  </p>
                  <h3>Região de Saúde</h3>
                  <p>
                    Agrupamento oficial de municípios vizinhos usado nas análises regionais, nos
                    fluxos e nos benchmarks do MedFlow.
                  </p>
                  <h3>Rede Regional de Atenção à Saúde (RRAS)</h3>
                  <p>
                    Reúne Regiões de Saúde para articular serviços de diferentes complexidades. RRAS
                    é o identificador oficial da rede regional.
                  </p>
                </details>
              </section>
              <section className="technical-section" aria-labelledby="limits-title">
                <h2 id="limits-title">Limites de interpretação</h2>
                <p>
                  Dados administrativos agregados. Comparações sem ajuste de risco. Não demonstram
                  causa, qualidade do cuidado ou disponibilidade atual de leitos.
                </p>
                <p className="technical-cut-note">
                  Pacientes-dia, dias de permanência e diárias faturadas são grandezas diferentes.
                  IPR/IPE dependem de elegibilidade. Taxas territoriais observam residentes
                  atendidos em São Paulo.
                </p>
                <details>
                  <summary>Ver os {data.limitations.length} limites publicados</summary>
                  <ul className="limits-list" data-testid="methodology-limits">
                    {data.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Fontes oficiais · {data.sources.length}</summary>
                  {data.sources.map((source) => (
                    <article key={source.id}>
                      <h3>{source.label}</h3>
                      <p>{source.scope}</p>
                    </article>
                  ))}
                </details>
              </section>
              <section
                id="architecture"
                className="technical-section"
                aria-labelledby="architecture-title"
              >
                <h2 id="architecture-title">Como os dados chegam ao MedFlow</h2>
                <ol className="technical-pipeline" aria-label="Fluxo conceitual dos dados">
                  {[
                    'Bases públicas',
                    'Tratamento e agregação',
                    'Oracle / camada Gold',
                    'API ORDS',
                    'MedFlow',
                  ].map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>
                  FlowIA consulta e explica o contexto disponível. Não é fonte primária de dados. O
                  fluxo descreve a arquitetura; não monitora a operação.
                </p>
                <details className="decision-details">
                  <summary>Por que Oracle neste MVP?</summary>
                  <p>
                    Gold, views, ORDS e Select AI no mesmo plano de dados. Menos componentes,
                    governança junto ao dado e ambiente provisionado.
                  </p>
                  <p>
                    Avaliação interna para o cenário do MVP; não é benchmark independente. Pontuação
                    de 1 a 5 por critério.
                  </p>
                  <div className="technical-table-scroll">
                    <table className="technical-table">
                      <thead>
                        <tr>
                          <th>Tecnologia</th>
                          <th>Gold</th>
                          <th>Serving</th>
                          <th>Linguagem natural</th>
                          <th>Operação</th>
                          <th>Custo</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {databaseDecision.map((option) => (
                          <tr key={option.option}>
                            <th scope="row">
                              {option.option}
                              <small>{option.rationale}</small>
                            </th>
                            <td>{option.gold}</td>
                            <td>{option.serving}</td>
                            <td>{option.language}</td>
                            <td>{option.operation}</td>
                            <td>{option.cost}</td>
                            <td>{scoreTotal(option)} / 25</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            </>
          )}
          <button className="technical-back" type="button" onClick={back}>
            ← Voltar a Fontes e indicadores
          </button>
          {analysisOrigin && (
            <Link
              className="technical-resume"
              to={{
                pathname: '/',
                search: analysisOrigin.search,
                hash: analysisOrigin.hash || '#hospital-detail',
              }}
              state={{ analysisReturnKey: analysisOrigin.key }}
            >
              Retomar análise
              {analysisOrigin.hospitalLabel ? ` de ${analysisOrigin.hospitalLabel}` : ''}
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

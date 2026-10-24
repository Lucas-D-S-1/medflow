import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MetricCard from '../../shared/MetricCard'
import StatePanel from '../../shared/StatePanel'
import SourceBadge from '../../shared/SourceBadge'
import { useSource } from '../../shared/SourceContext'
import { formatPeriod } from '../../shared/format'
import { sourceSections } from '../../shared/publicNavigation'
import { indicators, periods, sources } from './content'
import { rememberTechnicalOrigin, sourcesReturnPosition } from './technicalNavigation'
import './FontesView.css'

function LinkedText({ text }: { text: string }) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    return link ? <a key={index} href={link[2]}>{link[1]}</a> : part
  })
}

function ContentTable({ headers, rows, label }: { headers: string[]; rows: string[][]; label: string }) {
  return <div className="sources-table-wrap" role="region" aria-label={label} tabIndex={0}>
    <table>
      <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0
        ? <th key={index} scope="row"><LinkedText text={cell} /></th>
        : <td key={index}><LinkedText text={cell} /></td>)}</tr>)}</tbody>
    </table>
  </div>
}

export default function MetodologiaView() {
  const { sourceState, reload } = useSource()
  const location = useLocation()
  const data = sourceState.kind === 'live' || sourceState.kind === 'fallback' ? sourceState.data.methodology : null

  useEffect(() => {
    const returnY = sourcesReturnPosition(location.key)
    if (returnY !== undefined) {
      const frame = requestAnimationFrame(() => {
        window.scrollTo({ top: returnY, behavior: 'instant' })
        document.getElementById('technical-link')?.focus({ preventScroll: true })
      })
      return () => cancelAnimationFrame(frame)
    }
    const target = document.getElementById(location.hash.slice(1))
    if (!target) { window.scrollTo(0, 0); return }
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'instant', block: 'start' })
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.hash, location.key, sourceState.kind])

  return <div className="page-main sources-layout">
    <nav className="sources-index" aria-label="Nesta página">
      <p>Nesta página</p>
      {sourceSections.map((section) => <Link key={section.id} to={{ pathname: '/metodologia', search: location.search, hash: `#${section.id}` }}>{section.question}</Link>)}
    </nav>
    <main className="sources-main">
      <header><h1>Fontes e indicadores</h1><p className="sources-lead">Veja de onde vêm os dados, quais meses estão disponíveis e o que os indicadores ajudam a entender.</p></header>
      {sourceState.kind === 'loading' && <StatePanel kind="loading" title="Consultando a fonte" testId="loading-state">Carregando o período e a cobertura publicados.</StatePanel>}
      {sourceState.kind === 'empty' && <StatePanel kind="empty" title="Nenhuma competência publicada" testId="empty-state">A fonte respondeu normalmente, mas ainda não possui dados disponíveis.</StatePanel>}
      {sourceState.kind === 'error' && <StatePanel kind="error" title="Dados e cópia local indisponíveis" testId="error-state" action={<button type="button" onClick={() => void reload()}>Tentar novamente</button>}>Não foi possível carregar os dados nem a cópia local.</StatePanel>}
      {sourceState.kind === 'fallback' && <aside className="sources-warning" data-testid="fallback-note" role="status">
        <SourceBadge kind="fallback" dataThrough={sourceState.data.status.data_through} />
        <p>{sourceState.reason === 'invalid-contract' ? 'A fonte respondeu, mas o conteúdo veio em um formato inesperado. ' : 'A consulta à fonte está indisponível. '}Esta sessão usa uma cópia local parcial, com período e cobertura fixos. Alguns hospitais e detalhes não estão incluídos. <button type="button" onClick={() => void reload()}>Tentar novamente</button>.</p>
      </aside>}
      <section id="fontes" tabIndex={-1}>
        <h2>De onde vêm os dados?</h2>
        <p>O MedFlow reúne dados públicos sobre internações do SUS e leitos declarados em São Paulo. As informações de população ajudam a comparar regiões de tamanhos diferentes. São registros administrativos agregados: eles não permitem avaliar o caso de um paciente.</p>
        <ContentTable label="Bases e fontes oficiais; deslize para ver todas as colunas" headers={['Base', 'Quem publica', 'O que usamos', 'Fonte oficial']} rows={sources} />
      </section>
      <section id="atualizacao" tabIndex={-1}>
        <h2>Quais períodos estão disponíveis?</h2>
        {data && <div className="sources-metrics">
          <MetricCard label="Período consultável" value={`jan/2024 a ${formatPeriod(data.data_through)}`} detail={`${data.coverage.competencies} meses`} testId="sources-period" />
          <MetricCard label="Atualização" value="Mensal" detail={`Base atualizada em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(data.gold_updated_at))}`} testId="sources-update" />
          <MetricCard label="Cobertura" value={`${data.coverage.regions} regiões · ${data.coverage.hospitals} hospitais`} detail="Regiões de Saúde de São Paulo" testId="sources-coverage" />
        </div>}
        <p>A data de atualização da base é diferente do mês a que os dados se referem. Os nomes e algumas informações dos estabelecimentos vêm do cadastro atual do CNES. Eles não representam necessariamente o cadastro de cada mês do histórico.</p>
        <ContentTable label="Períodos e referências" headers={['Informação', 'Período ou referência']} rows={periods} />
      </section>
      <section id="leitura" tabIndex={-1}>
        <h2>Como ler os indicadores?</h2>
        <p>Use os indicadores para identificar diferenças e escolher o que investigar. Eles descrevem o atendimento registrado; não explicam, sozinhos, suas causas nem a qualidade do cuidado. Compare sempre o mesmo período e considere o perfil dos pacientes.</p>
        <ContentTable label="Indicadores e limites; deslize para ver todas as colunas" headers={['Indicador', 'O que mede e como é calculado', 'O que não significa']} rows={indicators} />
        <p><strong>E quando um indicador não aparece?</strong> Pode faltar informação ou não haver casos suficientes para uma comparação. Um valor ausente não deve ser lido como zero.</p>
        <details><summary>Quais comparações têm informação suficiente?</summary><ul>
          <li>Mortalidade e valor aprovado por internação: a classificação exige pelo menos 30 internações novas.</li>
          <li>Permanência por diagnóstico ou especialidade: pelo menos 20 casos no hospital e uma referência regional, sem esse hospital, com pelo menos 50 casos e 3 hospitais. Quando a permanência média da referência é zero, a comparação não é exibida.</li>
          <li>Sem leitos SUS declarados no mês, o IPH fica sem valor. Isso não significa ocupação zero.</li>
        </ul></details>
        <p><strong>Como entender os territórios?</strong> O município localiza residência e atendimento. A Região de Saúde reúne municípios vizinhos e é a referência das análises regionais. A Rede Regional de Atenção à Saúde (RRAS) reúne uma ou mais Regiões de Saúde.</p>
        <p><strong>Como ler a média acumulada do IPH no gráfico?</strong> Ela é a média dos valores mensais válidos desde o início da série disponível até o mês escolhido. Meses sem informação não entram como zero.</p>
      </section>
      <section id="iph" tabIndex={-1}>
        <h2>O que é a pressão estimada?</h2>
        <p>O IPH ajuda a observar a relação entre o atendimento estimado e a capacidade dos leitos SUS declarados no CNES. Para isso, o MedFlow usa as datas de entrada e saída das internações e os leitos informados em cada mês.</p>
        <p className="sources-warning"><strong>É uma estimativa de pressão sobre a capacidade declarada, não a ocupação física medida dentro do hospital.</strong> Acima de 100%, os dias de atendimento estimados superam a capacidade declarada usada no cálculo. Isso não prova, sozinho, superlotação. Sem leitos SUS declarados no mês, o indicador fica sem valor.</p>
        <p>Em unidades com permanência média abaixo de um dia, como hospitais-dia, o IPH deve ser lido como <strong>giro sobre a capacidade declarada</strong>. Cada internação conta ao menos um dia, mesmo quando a entrada e a saída acontecem no mesmo dia. Os registros não informam horários para medir a ocupação ao longo do dia.</p>
        <details><summary>Como o IPH é calculado?</summary><div className="sources-formula">
          <h3>IPH (%) = pacientes-dia estimados ÷ leitos-dia SUS declarados × 100</h3>
          <p><strong>Pacientes-dia estimados:</strong> dias reconstruídos a partir das datas de entrada e saída, distribuídos entre os meses atravessados pela internação. Quando a internação começa e termina no mesmo dia, conta ao menos um dia.</p>
          <p><strong>Leitos-dia SUS declarados:</strong> número de leitos SUS informado no CNES multiplicado pelos dias do mês. No recorte regional, são somadas as capacidades dos hospitais.</p>
          <p>Pacientes-dia, dias de permanência e diárias faturadas são medidas diferentes. Não devem ser trocadas entre si.</p>
        </div></details>
      </section>
      <footer className="sources-footer"><Link id="technical-link" to={{ pathname: '/metodologia/tecnico', search: location.search }} state={{ technicalOriginKey: location.key }} onClick={(event) => {
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) rememberTechnicalOrigin(location)
      }}>Detalhes técnicos ›</Link><span>Ômega Urban Tech · Challenge Oracle · FIAP 2026</span></footer>
    </main>
  </div>
}

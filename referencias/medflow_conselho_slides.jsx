import { useState } from "react";

const P = {
  navy: "#0D1B2A", navyMid: "#162032", blue: "#1A5276",
  med: "#2E86C1", light: "#85C1E9", coral: "#E8604C",
  white: "#F5F7FA", muted: "#8FA3B1", gold: "#D4AC0D",
  green: "#1ABC9C", purple: "#7D3C98", orange: "#E67E22",
  red: "#C0392B",
};

const Tag = ({ children, color = P.med, small }) => (
  <span style={{
    background: color + "22", color, fontSize: small ? 9 : 10,
    padding: small ? "1px 6px" : "2px 9px", borderRadius: 4, fontWeight: 600,
    letterSpacing: ".04em", display: "inline-block", whiteSpace: "nowrap",
  }}>{children}</span>
);

const professors = [
  {
    id: "vitao",
    name: "Vitão",
    role: "Professor FIAP — O Pragmático",
    color: P.coral,
    emoji: "🎯",
    traits: [
      "Vestir os pés do cliente — sempre pergunta quem se beneficia",
      "Detesta solução maravilhosa que não resolve nada",
      "Usa analogias do mundo real (WhatsApp, Steve Jobs, Napoleon)",
      "Exige que você conheça cada detalhe do que está fazendo",
      "Quer ver resultado tangível, não complexidade",
    ],
    redFlags: [
      "Usar IA pra fazer tudo mas não saber explicar",
      "Não saber o que significa o nome da sua empresa",
      "Protótipo sem imagem — 'isso não é protótipo'",
      "Persona vaga ou ambígua",
    ],
    questions: [
      "Para quem exatamente serve isso? Secretário ou gestor de hospital são coisas diferentes.",
      "Me explica o que é o IPH em 30 segundos sem usar termo técnico.",
      "Por que um gestor de hospital pagaria por isso?",
      "O que ele faz diferente depois de ver o painel?",
    ],
  },
  {
    id: "alex",
    name: "Alex",
    role: "Mentor Oracle — O Arquiteto",
    color: P.med,
    emoji: "🏗️",
    traits: [
      "Foco em arquitetura e múltiplos formatos de dado",
      "Database convergente é a filosofia central",
      "Escopo primeiro — só depois a construção",
      "Qualidade > volume de dados",
      "Valoriza uso correto de dados estruturados + JSON + CSV",
    ],
    redFlags: [
      "Arquitetura sem mostrar o fluxo do JSON",
      "Scikit-learn no slide sem explicar pra quê",
      "Não ter definido escopo antes de construir",
      "Confundir ciclo de atualização do dado com ciclo de acesso",
    ],
    questions: [
      "Como o JSON do CNES entra no banco? O fluxo está claro?",
      "O que você vai usar o scikit-learn pra fazer exatamente?",
      "O que está dentro do escopo da Sprint 1 que já funciona?",
      "Como você garante qualidade dos dados do SIH antes de calcular os índices?",
    ],
  },
  {
    id: "prof",
    name: "Professora",
    role: "Tutora FIAP — A Viabilizadora",
    color: P.green,
    emoji: "📐",
    traits: [
      "Foco em entregabilidade — o que é viável pra primeiro ano",
      "Valoriza escopo bem declarado (Sprint 1 vs Sprint 2)",
      "Aceita dados sintéticos para complementar lacunas",
      "Nutre a ideia mas exige praticidade",
      "Pergunta: 'O que vai na entrega e o que fica pra depois?'",
    ],
    redFlags: [
      "Sprint 1 com itens complexos como clusterização sem código",
      "Slide de protótipo com só texto",
      "Roadmap vago sem datas e responsáveis claros",
      "Proposta sem declarar o que NÃO vai ser entregue",
    ],
    questions: [
      "O que no Kanban está realmente concluído vs planejado?",
      "A clusterização está no Sprint 1 — vocês vão conseguir entregar?",
      "O slide de protótipo precisa de imagem. Onde está?",
      "Qual é o critério de sucesso da Sprint 2?",
    ],
  },
];

const evaluations = {
  v0: [
    {
      prof: "vitao",
      verdict: "Atenção",
      color: P.gold,
      items: [
        { ok: false, text: "Persona vaga: 'Secretária de Saúde' vs 'Gestor de Hospital' são personas completamente diferentes. Qual é a real?" },
        { ok: false, text: "Slide 11 (protótipo) tem só texto. Não é protótipo. Onde está a imagem?" },
        { ok: false, text: "Select AI não aparece em nenhum slide. Vocês sabem o que é? Sabem explicar?" },
        { ok: true,  text: "A persona tem dor real e bem articulada. Boa." },
        { ok: true,  text: "Storytelling da contextualização com dado de 1,41M está forte." },
      ],
    },
    {
      prof: "alex",
      verdict: "Atenção",
      color: P.gold,
      items: [
        { ok: false, text: "Arquitetura correta nas 3 fontes, mas o fluxo do JSON do CNES não está explicitado. Como ele entra?" },
        { ok: false, text: "Scikit-learn aparece em tecnologias. Pra quê exatamente? Clusterização de quê?" },
        { ok: false, text: "Select AI ausente da arquitetura. Se é o diferencial, precisa aparecer." },
        { ok: true,  text: "As 3 fontes batem com o que a Oracle pediu: relacional + JSON + CSV External Table." },
        { ok: true,  text: "Oracle Autonomous DB convergente está correto na arquitetura." },
      ],
    },
    {
      prof: "prof",
      verdict: "Crítico",
      color: P.red,
      items: [
        { ok: false, text: "Protótipo sem visual é o maior problema desta versão. Não é opcional." },
        { ok: false, text: "Kanban tem 'Clusterização de regiões' no A FAZER. É viável pra Sprint 2? Tem complexidade alta." },
        { ok: false, text: "Roadmap sem critério de sucesso da Sprint 2. O que é 'MVP entregue'?" },
        { ok: true,  text: "Divisão de papéis na equipe está clara. Carol, Leandro, Lucas, Pedro — bem definido." },
        { ok: true,  text: "Sprint 1 vs Sprint 2 existe no roadmap. Precisa só detalhar o que cada sprint entrega." },
      ],
    },
  ],
  new: [
    {
      prof: "vitao",
      verdict: "Forte",
      color: P.green,
      items: [
        { ok: true,  text: "Persona clara: Gestor de Hospital. Dor específica: não tem contexto histórico, não sabe como está vs pares." },
        { ok: true,  text: "Storytelling sem ML é inteligente. 'No passado quando estava assim, aconteceu Y' — o gestor entende." },
        { ok: true,  text: "Benchmark externo via DATASUS é valor único que ERP não oferece. Argumento defensável." },
        { ok: false, text: "Ainda precisa protótipo visual. Mesmo que Figma baixo fidelidade." },
        { ok: false, text: "Precisa saber responder: 'por que hospital e não secretaria?' pra qualquer banca." },
      ],
    },
    {
      prof: "alex",
      verdict: "Forte",
      color: P.green,
      items: [
        { ok: true,  text: "5 índices com fórmulas definidas. IPH, IPR, IS, TMH, CMI — consistentes com os dados do SIH/CNES." },
        { ok: true,  text: "Ciclo mensal honesto e alinhado ao DATASUS. Boa decisão declarar isso explicitamente." },
        { ok: true,  text: "Tirar ML do escopo e usar storytelling histórico é decisão de arquitetura sólida." },
        { ok: false, text: "Select AI precisa aparecer na arquitetura com papel claro — mesmo que seja 'Sprint 2'." },
        { ok: false, text: "O fluxo JSON do CNES → banco convergente precisa estar explícito no diagrama." },
      ],
    },
    {
      prof: "prof",
      verdict: "Bom",
      color: P.gold,
      items: [
        { ok: true,  text: "Sem ML no Sprint 2 é decisão sábia para primeiro ano. Escopo viável." },
        { ok: true,  text: "Latência mensal declarada e justificada. 'Decisões estratégicas não mudam semana a semana.'" },
        { ok: false, text: "Protótipo AINDA precisa de visual. Telas do aplicativo mesmo que mockup Figma." },
        { ok: false, text: "Kanban precisa remover clusterização ou mover pra Sprint 3 se não for entregar." },
        { ok: false, text: "Sprint 2 precisa de critério de sucesso: 'o que significa MVP entregue pra vocês?'" },
      ],
    },
  ],
};

const slides = [
  {
    num: 1, title: "Capa — Mapa da Missão",
    status: "ok", statusLabel: "MANTÉM",
    changes: "Sem alteração. Nomes em ordem alfabética, RMs, turma 1TSCOA.",
    content: null,
  },
  {
    num: 2, title: "Nome do Projeto",
    status: "ok", statusLabel: "MANTÉM",
    changes: "MedFlow | Painel Inteligente de Acesso Hospitalar — DATASUS. Mantém.",
    content: null,
  },
  {
    num: 3, title: "Contextualização do Problema",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Adicionar lacuna do mercado atual (SISREG) e evidência de sazonalidade. Fortalecer o 'porquê agora'.",
    content: {
      mantém: ["1,41M internações em SP (dado real SIH/SUS)", "Fragmentação dos sistemas (Fiocruz 2022)", "100% dados públicos e abertos"],
      adiciona: [
        "SISREG existe desde 2002 mas é operacional — não entrega inteligência analítica",
        "Dashboards estaduais são ilhas isoladas: sem visão comparativa entre hospitais",
        "Sazonalidade documentada: internações respiratórias sobem 2.8x em julho vs janeiro (SP)",
        "2025 foi atípico: duas ondas de influenza A — sistema de saúde foi pego de surpresa",
      ],
      remove: [],
    },
  },
  {
    num: 4, title: "Problema a Ser Resolvido",
    status: "update", statusLabel: "ATUALIZA PERSONA",
    changes: "Pivotar persona de 'Secretária de Saúde' para 'Gestor de Hospital'. Dores específicas do contexto hospitalar.",
    content: {
      mantém: ["Dependência técnica de analistas SQL", "Dados fragmentados (SIH + CNES + POP separados)"],
      adiciona: [
        "Nova persona: Gestor(a) de Hospital (diretor, superintendente)",
        "Nova frase: 'Meu hospital ficou cheio em julho — mas não sei se julho sempre é assim ou se algo mudou. E não sei como estou comparado a hospitais parecidos.'",
        "Nova dor: ausência de benchmark externo (o ERP mostra os próprios dados, não o contexto regional)",
        "Nova dor: sazonalidade invisível — o gestor reage ao pico, não antecipa com histórico",
      ],
      remove: ["Frase atual sobre Secretária de Saúde como persona principal"],
    },
  },
  {
    num: 5, title: "Público-Alvo",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Reorganizar hierarquia de personas. Hospital manager como primário, secretaria como secundário.",
    content: {
      mantém: ["Equipes de planejamento e vigilância", "População do SUS como beneficiário final"],
      adiciona: [
        "Primário: Gestor(a) de Hospital — quer entender o próprio hospital no contexto regional",
        "Secundário: Gestor de Secretaria de Saúde — quer visão da rede, não de um hospital",
        "Diferença clara: hospital manager quer benchmark; secretaria quer mapa de pressão regional",
      ],
      remove: ["Gestor de Secretaria como persona primária"],
    },
  },
  {
    num: 6, title: "Proposta de Solução",
    status: "update", statusLabel: "REFRAME",
    changes: "Reposicionar: de 'painel de dados' para 'inteligência histórica + benchmarking externo'. Nomear os 5 índices.",
    content: {
      mantém: ["Recorte São Paulo", "Sem SQL para o usuário final", "Dados oficiais do SUS"],
      adiciona: [
        "Reframe: 'O MedFlow entrega o que nenhum ERP hospitalar tem: o contexto externo. Você vê seu hospital dentro da realidade do sistema de saúde.'",
        "5 índices nomeados: IPH, IPR, IS, TMH, CMI",
        "Abordagem: storytelling com dados históricos — sem ML, sem previsão",
        "Ciclo: mensal, alinhado ao DATASUS — adequado para decisões estratégicas",
      ],
      remove: ["Menção a clusterização como feature do produto"],
    },
  },
  {
    num: 7, title: "Como o MedFlow Resolve",
    status: "update", statusLabel: "ATUALIZA JORNADA",
    changes: "Mostrar a jornada do storytelling em 4 camadas, não só 4 passos genéricos.",
    content: {
      mantém: ["Estrutura de 4 passos"],
      adiciona: [
        "Passo 1: Gestor abre o painel com pergunta real — 'Por que meu IPH subiu em julho?'",
        "Passo 2: Número atual (IPH 0.91) + contexto (↑ vs mesmo mês ano passado)",
        "Passo 3: Padrão histórico — 'Nos últimos 3 julhos, seu IPH foi 0.87, 0.89, 0.91'",
        "Passo 4: Significado sem previsão — 'Julho é seu mês crítico. Este foi o mais alto registrado.'",
      ],
      remove: ["Jornada genérica atual sem o formato storytelling"],
    },
  },
  {
    num: "8 (novo)", title: "Os 5 Índices do MedFlow",
    status: "new", statusLabel: "SLIDE NOVO",
    changes: "Apresentar os 5 indicadores com fórmula e interpretação simples. Visual de tabela ou cards.",
    content: {
      mantém: [],
      adiciona: [
        "IPH — Índice de Pressão Hospitalar: internações ÷ (leitos_SUS × dias). Verde/Amarelo/Vermelho.",
        "IPR — Índice de Permanência Relativa: perm_média_hospital ÷ perm_média_regional (mesmo CID).",
        "IS — Índice de Sazonalidade: internações_atual ÷ média_histórica_mesmo_período (3 anos).",
        "TMH — Taxa de Mortalidade Hospitalar: óbitos ÷ internações × 100, por grupo CID.",
        "CMI — Custo Médio por Internação: soma(VAL_TOT) ÷ total_internações, por especialidade.",
        "Cada índice: número + contexto + histórico + o que significa. Sem previsão.",
      ],
      remove: [],
    },
  },
  {
    num: "9 (novo)", title: "Latência e Ciclo de Dados",
    status: "new", statusLabel: "SLIDE NOVO",
    changes: "Abordar honestamente o ciclo de atualização. Transformar limitação em decisão de design.",
    content: {
      mantém: [],
      adiciona: [
        "DATASUS publica SIH/CNES mensalmente com 2–3 meses de defasagem",
        "Pipeline MedFlow: atualização automática a cada nova publicação",
        "Janela analítica: 24 meses de histórico sempre disponíveis",
        "Por que mensal é suficiente: decisões de capacidade, benchmark e sazonalidade são estratégicas — não mudam semana a semana",
        "Roadmap: fase 2 conecta com sistemas hospitalares diretos para granularidade diária",
      ],
      remove: [],
    },
  },
  {
    num: 10, title: "Benefícios Esperados",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Ajustar métricas para o contexto do gestor de hospital, não de secretaria.",
    content: {
      mantém: ["Agilidade na decisão", "Autonomia da gestão", "Transparência e reuso de dados públicos"],
      adiciona: [
        "Contexto histórico: 'Pela primeira vez o gestor sabe se o que está acontecendo é normal para a época'",
        "Benchmark externo: 'Visão de como o hospital se compara a pares — algo que nenhum ERP entrega'",
        "Sazonalidade visível: 'Padrões que se repetem ficam evidentes sem precisar de analista'",
      ],
      remove: ["'Regiões críticas identificadas/mês' — mais adequado para secretaria, não hospital"],
    },
  },
  {
    num: 11, title: "Arquitetura da Solução",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Adicionar Select AI como componente planejado (Sprint 2). Deixar fluxo JSON explícito.",
    content: {
      mantém: ["4 camadas: Fontes → ETL → Oracle → Consumo", "As 3 fontes do challenge", "Oracle Autonomous DB convergente"],
      adiciona: [
        "Select AI (Sprint 2): camada de linguagem natural entre o Oracle DB e o gestor",
        "Fluxo JSON explícito: CNES API → ingestão nativa no Oracle (sem transformação para relacional)",
        "Ciclo automático: pipeline Python roda mensalmente ao detectar nova publicação no DATASUS FTP",
      ],
      remove: ["Referência vaga a 'modelos analíticos em Python' sem especificar o que são"],
    },
  },
  {
    num: 12, title: "Tecnologias Utilizadas",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Adicionar Oracle Select AI. Clarificar uso do scikit-learn (ou remover se não for usar).",
    content: {
      mantém: ["Oracle Autonomous DB", "SQL / Database Actions", "Python (pandas)", "DATASUS / CNES", "Power BI", "GitHub"],
      adiciona: [
        "Oracle Select AI: camada NLP que permite perguntas em português gerando SQL automaticamente (Sprint 2)",
        "pysus 2.x: biblioteca Python para download automático do DATASUS (SIH + CNES)",
      ],
      remove: ["scikit-learn — remover ou esclarecer que é só para calcular estatísticas descritivas, não ML"],
    },
  },
  {
    num: 13, title: "Protótipos da Solução",
    status: "critical", statusLabel: "BLOCKER",
    changes: "CRÍTICO: slide precisa de imagem real. Mesmo mockup Figma ou Power BI draft. Texto sozinho não serve.",
    content: {
      mantém: ["Descrição das telas (pode ser legenda abaixo das imagens)"],
      adiciona: [
        "Tela 1 — Visão Geral: 4 KPI cards no topo (IPH, IS, IPR, TMH) + status do período",
        "Tela 2 — Sazonalidade: gráfico de barras 3 anos, pico julho destacado, leitura histórica",
        "Tela 3 — Benchmark: barras comparativas permanência média (seu hospital vs regional) por CID",
        "Tela 4 — Pressão Regional: grid de hospitais da região com cores IPH (verde/amarelo/vermelho)",
        "Cada tela com legenda curta explicando o que o gestor vê e decide",
      ],
      remove: ["Texto descrevendo o que o protótipo mostraria — substituir por imagem"],
    },
  },
  {
    num: 14, title: "Gerenciamento do Projeto",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Remover clusterização do A FAZER (fora do escopo declarado). Atualizar com itens do novo cenário.",
    content: {
      mantém: ["Estrutura Scrum/Kanban", "Divisão de papéis da equipe", "Itens concluídos"],
      adiciona: [
        "A FAZER: cálculo dos 5 índices no Oracle, storytelling layer no Power BI, slide de latência",
        "EM ANDAMENTO: ETL SIH/CNES, pipeline mensal automático, telas de benchmark",
      ],
      remove: ["Clusterização de regiões (fora do escopo declarado no novo cenário)"],
    },
  },
  {
    num: 15, title: "Roadmap Sprint 1 → Sprint 2",
    status: "update", statusLabel: "ATUALIZA",
    changes: "Adicionar critério de sucesso da Sprint 2. Detalhar o que 'MVP funcionando' significa.",
    content: {
      mantém: ["Datas corretas: Sprint 1 = 16/06 | Sprint 2 = 01/09", "Estrutura das duas sprints"],
      adiciona: [
        "Sprint 2 critério de sucesso: 'Dashboard com os 5 índices calculados e navegáveis, com histórico 2022–2024, para pelo menos 10 hospitais de SP'",
        "Sprint 2 itens: pipeline mensal automático, telas de benchmark e sazonalidade, Select AI com 3 perguntas demo",
        "GitHub obrigatório na Sprint 2 (vale 20% da nota)",
      ],
      remove: ["Roadmap vago sem critério de entrega"],
    },
  },
  {
    num: 16, title: "Obrigado",
    status: "ok", statusLabel: "MANTÉM",
    changes: "Mantém. Slogan 'Saúde que flui. Tecnologia que transforma.' está bom.",
    content: null,
  },
];

const statusColors = {
  ok: P.green, update: P.med, new: P.purple,
  critical: P.red, warn: P.gold,
};
const statusLabels = {
  ok: "✓ Mantém", update: "↺ Atualiza", new: "+ Novo",
  critical: "⚠ Blocker", warn: "! Atenção",
};

const gaps = [
  {
    gap: "Protótipo visual ausente",
    prof: "vitao+prof",
    severity: "Blocker",
    current: "Slide 13 tem só texto descrevendo o que o protótipo mostraria.",
    fix: "Criar 4 telas no Figma, Canva ou Power BI modo design. Não precisa funcionar. Precisa ser imagem.",
    who: "Lucas Lima (Visualização/BI)",
    effort: "2–3h",
  },
  {
    gap: "Select AI ausente da arquitetura e tecnologias",
    prof: "alex+vitao",
    severity: "Alto",
    current: "Não aparece em nenhum slide. A Oracle avalia isso explicitamente.",
    fix: "Adicionar como componente na camada de consumo da arquitetura com nota '(Sprint 2)'. Incluir em tecnologias com papel claro.",
    who: "Leandro Lopes (Arquitetura/OCI)",
    effort: "30min",
  },
  {
    gap: "Persona ambígua (Secretária vs Hospital)",
    prof: "vitao",
    severity: "Alto",
    current: "Slide 4 e 5 falam em Secretária de Saúde. A solução agora é para gestores de hospital.",
    fix: "Atualizar slides 4 e 5 com a nova persona e a nova frase-gatilho do gestor de hospital.",
    who: "Leandro Scutari (Análise) + Lucas",
    effort: "1h",
  },
  {
    gap: "Latência dos dados não declarada",
    prof: "alex+prof",
    severity: "Médio",
    current: "A defasagem de 2–3 meses do DATASUS não é mencionada em nenhum slide.",
    fix: "Criar slide de Latência e Ciclo de Dados (slide 9 novo) transformando limitação em decisão de design.",
    who: "Lucas Lima",
    effort: "1h",
  },
  {
    gap: "Índices sem nomes e fórmulas",
    prof: "alex",
    severity: "Médio",
    current: "A solução fala em 'indicadores de capacidade' mas não nomeia nenhum índice.",
    fix: "Criar slide dos 5 índices (slide 8 novo) com IPH, IPR, IS, TMH, CMI — fórmula + interpretação visual.",
    who: "Lucas Lima + Pedro Padovan",
    effort: "1–2h",
  },
  {
    gap: "Clusterização no Kanban",
    prof: "prof",
    severity: "Médio",
    current: "'Clusterização de regiões' está no A FAZER mas foi retirada do escopo da solução.",
    fix: "Remover do Kanban ou mover para 'backlog futuro'. Substituir por itens do novo escopo.",
    who: "Leandro Scutari",
    effort: "15min",
  },
  {
    gap: "Gap de mercado não explícito (SISREG)",
    prof: "vitao",
    severity: "Baixo",
    current: "Contextualização menciona fragmentação mas não nomeia o SISREG como solução existente insuficiente.",
    fix: "Adicionar 1 linha no slide 3: 'O SISREG existe desde 2002 para regulação operacional de leitos — mas não entrega inteligência analítica histórica.'",
    who: "Carol Oliveira (ETL/Dados)",
    effort: "15min",
  },
  {
    gap: "Sprint 2 sem critério de sucesso",
    prof: "prof",
    severity: "Baixo",
    current: "Roadmap lista itens mas não define o que significa 'MVP entregue'.",
    fix: "Adicionar no slide de roadmap: 'MVP = 5 índices calculados + 24 meses histórico + benchmark para 10 hospitais SP + link público funcionando'.",
    who: "Leandro Scutari (Representante)",
    effort: "20min",
  },
];

export default function App() {
  const [tab, setTab] = useState("conselho");
  const [activeProf, setActiveProf] = useState("vitao");
  const [evalView, setEvalView] = useState("new");
  const [expandedSlide, setExpandedSlide] = useState(null);

  const currentEvals = evaluations[evalView];

  return (
    <div style={{ fontFamily: "Georgia, serif", background: P.navy, minHeight: "100vh", color: P.white }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${P.navyMid} 0%, ${P.blue} 100%)`,
        borderBottom: `3px solid ${P.coral}`, padding: "20px 26px 16px",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: P.coral, fontFamily: "monospace", marginBottom: 4 }}>
          MEDFLOW · PLANO DE APRESENTAÇÃO COMPLETO
        </div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>Conselho dos 3 · Slides Atualizados · Gap Analysis</div>
        <div style={{ fontSize: 12, color: P.muted, marginTop: 3 }}>Ômega Urban Tech · Sprint 1 · 16/06/2026</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: P.navyMid, borderBottom: `1px solid ${P.blue}33`, padding: "0 26px" }}>
        {[
          { id: "conselho", label: "🎓 Conselho dos 3" },
          { id: "slides", label: "📊 Slides Atualizados" },
          { id: "gaps", label: "🔧 Gaps & Como Preencher" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none",
            borderBottom: tab === t.id ? `3px solid ${P.coral}` : "3px solid transparent",
            color: tab === t.id ? P.white : P.muted,
            padding: "11px 16px", cursor: "pointer", fontSize: 12,
            fontWeight: tab === t.id ? 700 : 400, fontFamily: "Georgia, serif",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "22px 26px", maxWidth: 1000 }}>

        {/* ── CONSELHO ── */}
        {tab === "conselho" && (
          <div>
            {/* Professor cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
              {professors.map(p => (
                <div key={p.id} onClick={() => setActiveProf(p.id)} style={{
                  background: activeProf === p.id ? `${p.color}18` : P.navyMid,
                  border: `1px solid ${activeProf === p.id ? p.color : P.blue + "44"}`,
                  borderTop: `3px solid ${p.color}`,
                  borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: p.color }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: P.muted, marginBottom: 10 }}>{p.role}</div>
                  {activeProf === p.id && (
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 2, color: p.color, marginBottom: 6 }}>TRAÇOS</div>
                      {p.traits.map((t, i) => (
                        <div key={i} style={{ fontSize: 11, color: P.muted, marginBottom: 3, display: "flex", gap: 6 }}>
                          <span style={{ color: p.color, flexShrink: 0 }}>▸</span>{t}
                        </div>
                      ))}
                      <div style={{ fontSize: 10, letterSpacing: 2, color: P.red, marginTop: 10, marginBottom: 6 }}>RED FLAGS</div>
                      {p.redFlags.map((t, i) => (
                        <div key={i} style={{ fontSize: 11, color: P.muted, marginBottom: 3, display: "flex", gap: 6 }}>
                          <span style={{ color: P.red, flexShrink: 0 }}>✗</span>{t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Questions the active prof would ask */}
            {(() => {
              const p = professors.find(x => x.id === activeProf);
              return (
                <div style={{
                  background: `${p.color}10`, border: `1px solid ${p.color}33`,
                  borderRadius: 10, padding: "16px 18px", marginBottom: 22,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: p.color, marginBottom: 10 }}>
                    PERGUNTAS QUE {p.name.toUpperCase()} VAI FAZER NA BANCA
                  </div>
                  {p.questions.map((q, i) => (
                    <div key={i} style={{
                      background: P.navyMid, borderRadius: 8, padding: "10px 14px",
                      marginBottom: 8, fontSize: 13, color: P.white,
                      borderLeft: `3px solid ${p.color}`,
                    }}>
                      "{q}"
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Evaluation toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: P.muted }}>Avaliando:</span>
              {[
                { id: "v0", label: "Versão atual (v0)" },
                { id: "new", label: "Novo cenário" },
              ].map(v => (
                <button key={v.id} onClick={() => setEvalView(v.id)} style={{
                  background: evalView === v.id ? P.coral : "none",
                  border: `1px solid ${evalView === v.id ? P.coral : P.blue + "44"}`,
                  color: evalView === v.id ? P.white : P.muted,
                  padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "Georgia",
                }}>{v.label}</button>
              ))}
            </div>

            {/* Evaluations */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {currentEvals.map(ev => {
                const p = professors.find(x => x.id === ev.prof);
                return (
                  <div key={ev.prof} style={{
                    background: P.navyMid, border: `1px solid ${p.color}33`,
                    borderLeft: `4px solid ${p.color}`, borderRadius: 10, padding: "14px 18px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 18 }}>{p.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: p.color }}>{p.name}</span>
                      </div>
                      <Tag color={ev.color}>{ev.verdict.toUpperCase()}</Tag>
                    </div>
                    {ev.items.map((item, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 10, padding: "6px 0",
                        borderBottom: i < ev.items.length - 1 ? `1px solid ${P.navy}` : "none",
                        alignItems: "flex-start",
                      }}>
                        <span style={{ color: item.ok ? P.green : P.red, flexShrink: 0, fontSize: 13, marginTop: 1 }}>
                          {item.ok ? "✓" : "✗"}
                        </span>
                        <span style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SLIDES ── */}
        {tab === "slides" && (
          <div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {Object.entries(statusLabels).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: statusColors[k] }} />
                  <span style={{ fontSize: 11, color: P.muted }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {slides.map((s) => (
                <div key={s.num} style={{
                  background: expandedSlide === s.num ? `${statusColors[s.status]}10` : P.navyMid,
                  border: `1px solid ${statusColors[s.status]}${expandedSlide === s.num ? "66" : "33"}`,
                  borderLeft: `4px solid ${statusColors[s.status]}`,
                  borderRadius: 10, overflow: "hidden",
                }}>
                  <div
                    onClick={() => setExpandedSlide(expandedSlide === s.num ? null : s.num)}
                    style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: P.muted, width: 26 }}>#{s.num}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.white }}>{s.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Tag color={statusColors[s.status]} small>{statusLabels[s.status]}</Tag>
                      <span style={{ color: P.muted, fontSize: 14 }}>{expandedSlide === s.num ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {expandedSlide === s.num && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 12, color: P.muted, marginBottom: 14, lineHeight: 1.6, fontStyle: "italic" }}>
                        {s.changes}
                      </div>
                      {s.content && (
                        <div style={{ display: "grid", gridTemplateColumns: s.content.remove?.length ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
                          {s.content.mantém?.length > 0 && (
                            <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 8 }}>MANTÉM</div>
                              {s.content.mantém.map((t, i) => (
                                <div key={i} style={{ fontSize: 11, color: P.muted, marginBottom: 4, display: "flex", gap: 6 }}>
                                  <span style={{ color: P.green, flexShrink: 0 }}>→</span>{t}
                                </div>
                              ))}
                            </div>
                          )}
                          {s.content.adiciona?.length > 0 && (
                            <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, letterSpacing: 2, color: P.med, marginBottom: 8 }}>ADICIONA</div>
                              {s.content.adiciona.map((t, i) => (
                                <div key={i} style={{ fontSize: 11, color: P.muted, marginBottom: 4, display: "flex", gap: 6 }}>
                                  <span style={{ color: P.med, flexShrink: 0 }}>+</span>{t}
                                </div>
                              ))}
                            </div>
                          )}
                          {s.content.remove?.length > 0 && (
                            <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, letterSpacing: 2, color: P.red, marginBottom: 8 }}>REMOVE</div>
                              {s.content.remove.map((t, i) => (
                                <div key={i} style={{ fontSize: 11, color: P.muted, marginBottom: 4, display: "flex", gap: 6 }}>
                                  <span style={{ color: P.red, flexShrink: 0 }}>✗</span>{t}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!s.content && (
                        <div style={{ fontSize: 12, color: P.green, fontStyle: "italic" }}>Nenhuma alteração necessária.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GAPS ── */}
        {tab === "gaps" && (
          <div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {[["Blocker", P.red], ["Alto", P.coral], ["Médio", P.gold], ["Baixo", P.muted]].map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 11, color: P.muted }}>{l}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {gaps.map((g, i) => {
                const sevColor = g.severity === "Blocker" ? P.red : g.severity === "Alto" ? P.coral : g.severity === "Médio" ? P.gold : P.muted;
                return (
                  <div key={i} style={{
                    background: P.navyMid, border: `1px solid ${sevColor}33`,
                    borderLeft: `4px solid ${sevColor}`, borderRadius: 10, padding: "14px 18px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: P.white }}>{g.gap}</div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                        <Tag color={sevColor} small>{g.severity}</Tag>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.red, marginBottom: 6 }}>SITUAÇÃO ATUAL</div>
                        <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{g.current}</div>
                      </div>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 6 }}>COMO PREENCHER</div>
                        <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{g.fix}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: P.muted }}>
                      <span>👤 <span style={{ color: P.light }}>{g.who}</span></span>
                      <span>⏱ <span style={{ color: P.light }}>{g.effort}</span></span>
                      <span>👁 <span style={{ color: P.light }}>
                        {g.prof.split("+").map(pid => professors.find(p => p.id === pid)?.name).filter(Boolean).join(" + ")} vai cobrar
                      </span></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Effort summary */}
            <div style={{ marginTop: 20, background: `${P.green}10`, border: `1px solid ${P.green}33`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 10 }}>ESFORÇO TOTAL ESTIMADO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ background: P.navyMid, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: P.red, marginBottom: 4 }}>Blockers (hoje)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.white }}>2–3h</div>
                  <div style={{ fontSize: 11, color: P.muted }}>Protótipo visual</div>
                </div>
                <div style={{ background: P.navyMid, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: P.coral, marginBottom: 4 }}>Prioridade alta</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.white }}>2–3h</div>
                  <div style={{ fontSize: 11, color: P.muted }}>Select AI + Persona</div>
                </div>
                <div style={{ background: P.navyMid, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: P.gold, marginBottom: 4 }}>Médio/Baixo</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.white }}>~2h</div>
                  <div style={{ fontSize: 11, color: P.muted }}>Slides novos + Kanban</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: P.muted, fontStyle: "italic" }}>
                Total: ~7h de trabalho distribuído entre os 5 membros. Factível antes da entrega de 16/06.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

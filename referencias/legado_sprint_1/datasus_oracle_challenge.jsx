import { useState } from "react";

const palette = {
  navy: "#0D1B2A",
  navyMid: "#162032",
  blue: "#1A5276",
  medBlue: "#2E86C1",
  lightBlue: "#85C1E9",
  coral: "#E8604C",
  coralLight: "#F1948A",
  white: "#F5F7FA",
  muted: "#8FA3B1",
  gold: "#D4AC0D",
  green: "#1ABC9C",
  purple: "#7D3C98",
};

const databases = [
  {
    id: "SIH",
    name: "SIH/SUS",
    full: "Sistema de Informações Hospitalares",
    priority: "PRIMÁRIO",
    priorityColor: palette.coral,
    relevance: 5,
    description: "Principal base do challenge. Registra toda AIH (Autorização de Internação Hospitalar) paga pelo SUS.",
    coverage: "1992 – atual (atualização mensal)",
    format: ".dbc → CSV",
    access: "FTP DATASUS / pysus / microdatasus",
    url: "datasus.saude.gov.br → Transferência → SIHSUS",
    subsystems: [
      { code: "RD", desc: "AIH Reduzida — principal arquivo analítico" },
      { code: "RJ", desc: "AIH Rejeitada" },
      { code: "SP", desc: "Serviços Profissionais" },
      { code: "ER", desc: "AIH Rejeitada com Erro" },
    ],
    keyFields: [
      "N_AIH — número da autorização",
      "CNES — código do hospital",
      "MUNIC_RES / MUNIC_MOV — município residência / atendimento",
      "DIAG_PRINC — diagnóstico CID-10",
      "PROC_REA — procedimento realizado",
      "QT_DIARIAS — permanência (dias)",
      "VAL_TOT — valor pago pelo SUS",
      "VAL_UTI — valor UTI",
      "MORTE — indicador óbito (0/1)",
      "SEXO, NASC — perfil demográfico",
      "ANO_CMPT / MES_CMPT — competência",
    ],
    color: palette.coral,
    icon: "🏥",
  },
  {
    id: "CNES",
    name: "CNES",
    full: "Cadastro Nacional de Estabelecimentos de Saúde",
    priority: "PRIMÁRIO",
    priorityColor: palette.coral,
    relevance: 5,
    description: "Cadastro de hospitais, leitos, equipamentos e profissionais. Fornecido via API JSON no challenge.",
    coverage: "2005 – atual (atualização mensal)",
    format: "JSON via API / .dbc",
    access: "cnes.datasus.gov.br / pysus / FTP",
    url: "cnes.datasus.gov.br",
    subsystems: [
      { code: "ST", desc: "Estabelecimentos — tipo, endereço, gestão" },
      { code: "LT", desc: "Leitos — quantitativo SUS e não-SUS por especialidade" },
      { code: "EQ", desc: "Equipamentos — tipo e quantidade" },
      { code: "PF", desc: "Profissionais — CBO, vínculo SUS" },
      { code: "SR", desc: "Serviços especializados" },
      { code: "HB", desc: "Habilitações (SADT, Oncologia etc.)" },
    ],
    keyFields: [
      "CNES — código único do estabelecimento",
      "CODUFMUN — município",
      "REGSAUDE — região de saúde",
      "NATUREZA — pública/privada/filantrópica",
      "GESTAO — municipal/estadual/dupla",
      "LEIT_SUS — leitos disponíveis SUS",
      "LEIT_NSUS — leitos não-SUS",
      "TURNO — horário funcionamento",
      "NIVEL_DEP — nível de dependência",
    ],
    color: palette.medBlue,
    icon: "🏗️",
  },
  {
    id: "SIM",
    name: "SIM",
    full: "Sistema de Informações sobre Mortalidade",
    priority: "ENRIQUECEDOR",
    priorityColor: palette.gold,
    relevance: 4,
    description: "Registra todos os óbitos. Cruzado com SIH permite calcular mortalidade hospitalar por diagnóstico e região.",
    coverage: "1979 – atual",
    format: ".dbc → CSV",
    access: "FTP DATASUS / pysus",
    url: "datasus.saude.gov.br → Transferência → SIM",
    subsystems: [
      { code: "DO", desc: "Declaração de Óbito — arquivo principal" },
      { code: "DOext", desc: "Óbitos por causas externas" },
    ],
    keyFields: [
      "CAUSABAS — causa básica do óbito (CID-10)",
      "DTOBITO — data do óbito",
      "LOCOCOR — local (hospital, domicílio, via pública)",
      "IDADE — codificado (anos, meses, dias)",
      "SEXO, RACACOR — perfil demográfico",
      "CODMUNRES — município de residência",
      "CIRURGIA — se houve procedimento cirúrgico",
      "NECROPSIA — se foi realizada necropsia",
    ],
    color: palette.gold,
    icon: "📋",
  },
  {
    id: "SIA",
    name: "SIA/SUS",
    full: "Sistema de Informações Ambulatoriais",
    priority: "ENRIQUECEDOR",
    priorityColor: palette.gold,
    relevance: 3,
    description: "Registra consultas e procedimentos ambulatoriais. Útil para entender a proporção hospitalar vs. ambulatorial por região.",
    coverage: "1994 – atual",
    format: ".dbc → CSV",
    access: "FTP DATASUS / pysus",
    url: "datasus.saude.gov.br → Transferência → SIASUS",
    subsystems: [
      { code: "PA", desc: "Produção Ambulatorial — principal" },
      { code: "BI", desc: "Boletim Individualizado" },
      { code: "AB", desc: "Atenção Básica" },
    ],
    keyFields: [
      "PA_CODUNI — código CNES do estabelecimento",
      "PA_PROC_ID — código do procedimento SIGTAP",
      "PA_QTDAPR — quantidade aprovada",
      "PA_VALAPR — valor aprovado",
      "PA_UFMUN — município",
      "PA_CID_ASSOC — CID associado",
      "PA_TPUPS — tipo de unidade",
    ],
    color: palette.green,
    icon: "🩺",
  },
  {
    id: "SINASC",
    name: "SINASC",
    full: "Sistema de Informações sobre Nascidos Vivos",
    priority: "COMPLEMENTAR",
    priorityColor: palette.lightBlue,
    relevance: 2,
    description: "Dados de nascimentos. Útil para análise de saúde materno-infantil e projeção de demanda hospitalar.",
    coverage: "1994 – atual",
    format: ".dbc → CSV",
    access: "FTP DATASUS / pysus",
    url: "datasus.saude.gov.br → Transferência → SINASC",
    subsystems: [{ code: "DN", desc: "Declaração de Nascido Vivo" }],
    keyFields: [
      "DTNASC — data de nascimento",
      "LOCNASC — local (hospital, domicílio)",
      "IDADEMAE — idade da mãe",
      "ESTCIVMAE — estado civil",
      "ESCMAE — escolaridade",
      "GESTACAO — duração da gestação",
      "PARTO — tipo (normal/cesáreo)",
      "CODMUNRES — município de residência",
    ],
    color: palette.lightBlue,
    icon: "👶",
  },
  {
    id: "SINAN",
    name: "SINAN",
    full: "Sistema de Informação de Agravos de Notificação",
    priority: "COMPLEMENTAR",
    priorityColor: palette.lightBlue,
    relevance: 2,
    description: "Doenças de notificação compulsória. Pode ser usado para correlacionar surtos com pressão hospitalar.",
    coverage: "1998 – atual (por doença)",
    format: ".dbc → CSV",
    access: "FTP DATASUS / pysus",
    url: "datasus.saude.gov.br → Transferência → SINAN",
    subsystems: [
      { code: "DNGV", desc: "Dengue" },
      { code: "CHIK", desc: "Chikungunya" },
      { code: "TUBE", desc: "Tuberculose" },
      { code: "HIVM", desc: "HIV/Aids" },
      { code: "SIFG", desc: "Sífilis" },
      { code: "LEPT", desc: "Leptospirose" },
    ],
    keyFields: [
      "DT_NOTIF — data de notificação",
      "ID_MUNICIP — município de notificação",
      "ID_MN_RESI — município de residência",
      "CLASSI_FIN — classificação final",
      "CRITERIO — critério diagnóstico",
      "EVOLUCAO — evolução do caso (cura/óbito)",
    ],
    color: palette.purple,
    icon: "🦠",
  },
  {
    id: "POP",
    name: "Base Populacional",
    full: "Estimativas Populacionais IBGE/TCU",
    priority: "OBRIGATÓRIO (Fonte 3)",
    priorityColor: palette.coral,
    relevance: 5,
    description: "Denominador para todos os indicadores per capita. Fornecido como CSV External Table no challenge.",
    coverage: "2000 – atual (estimativas anuais)",
    format: "CSV",
    access: "DATASUS → Transferência → Base Populacional / IBGE Sidra",
    url: "ibge.gov.br/sidra + datasus.saude.gov.br",
    subsystems: [{ code: "POP", desc: "Estimativas por município, sexo e faixa etária" }],
    keyFields: [
      "CODMUNICIPIO — código IBGE do município",
      "NOMMUNICIPIO — nome do município",
      "UF — estado",
      "REGSAUDE — região de saúde",
      "POPULACAO — estimativa por ano",
      "FAIXA_ETARIA — 0-4, 5-9, ..., 80+",
      "SEXO — M/F",
    ],
    color: palette.coral,
    icon: "👥",
  },
];

const solutions = [
  {
    topic: "Pressão e Capacidade Hospitalar",
    icon: "📊",
    color: palette.coral,
    dados: ["SIH/SUS (RD)", "CNES (LT)", "Base Populacional"],
    ideas: [
      {
        name: "Índice de Pressão Hospitalar (IPH)",
        desc: "Razão entre internações realizadas e leitos SUS disponíveis, por região de saúde e período. Identifica regiões com saturação estrutural.",
        formula: "IPH = (Internações/mês) / (Leitos SUS × 30)",
        selectAI: '"Quais regiões de saúde têm mais internações por leito disponível?"',
        impact: "Alto",
      },
      {
        name: "Mapa de Regiões Críticas",
        desc: "Dashboard com semáforo (verde/amarelo/vermelho) por região baseado em ocupação estimada. Visão imediata para gestores.",
        formula: "Ocupação > 85% = vermelho | 70–85% = amarelo | <70% = verde",
        selectAI: '"Liste os 10 municípios com maior taxa de ocupação hospitalar em 2023"',
        impact: "Alto",
      },
      {
        name: "Permanência Média vs. Benchmark Nacional",
        desc: "Compara a permanência média de cada hospital/região com a média nacional por CID-10. Desvios indicam ineficiência ou complexidade.",
        formula: "Δ Permanência = média_local − média_nacional (por CID)",
        selectAI: '"Quais hospitais têm permanência média acima da estadual para internações cardíacas?"',
        impact: "Alto",
      },
    ],
  },
  {
    topic: "Volume e Perfil de Internações",
    icon: "📈",
    color: palette.medBlue,
    dados: ["SIH/SUS (RD)", "Base Populacional"],
    ideas: [
      {
        name: "Ranking de Procedimentos e Diagnósticos",
        desc: "Top 10 CID-10 e procedimentos por município, UF e período. Responde diretamente: 'quais perfis pressionam mais o sistema?'",
        formula: "Rank por frequência + valor total pago",
        selectAI: '"Quais são os 5 diagnósticos com maior número de internações no Brasil em 2023?"',
        impact: "Alto",
      },
      {
        name: "Taxa de Internação per Capita",
        desc: "Normaliza o volume por 1.000 habitantes, permitindo comparação justa entre municípios grandes e pequenos.",
        formula: "Taxa = (Internações / Populacao) × 1000",
        selectAI: '"Quais municípios têm maior taxa de internação por habitante?"',
        impact: "Médio",
      },
      {
        name: "Funil de Valor (VAL_TOT por faixa etária × CID)",
        desc: "Identifica quais grupos etários e diagnósticos consomem mais recursos financeiros do SUS. Útil para priorização orçamentária.",
        formula: "Σ VAL_TOT agrupado por DIAG_PRINC × faixa etária",
        selectAI: '"Qual faixa etária gera maior custo de internação por cardiovascular?"',
        impact: "Alto",
      },
    ],
  },
  {
    topic: "Sazonalidade e Tendências Temporais",
    icon: "📅",
    color: palette.gold,
    dados: ["SIH/SUS multianual", "SINAN (opcional)"],
    ideas: [
      {
        name: "Série Histórica de Internações (2015–2024)",
        desc: "Linha do tempo mensal de internações por região. Revela sazonalidade (ex: pico de gripe em julho) e tendências de crescimento.",
        formula: "Decomposição STL: tendência + sazonalidade + resíduo",
        selectAI: '"Compare o volume de internações respiratórias de julho nos últimos 5 anos"',
        impact: "Alto",
      },
      {
        name: "Detecção de Anomalias (picos atípicos)",
        desc: "Identifica meses com volume acima de 2σ da média histórica. Útil para mapear impactos de epidemias, eventos climáticos etc.",
        formula: "Anomalia se: internações_mês > média + 2×desvio_padrão",
        selectAI: '"Em quais meses as internações por dengue superaram o dobro da média histórica?"',
        impact: "Médio",
      },
    ],
  },
  {
    topic: "Clustering e Segmentação",
    icon: "🔵",
    color: palette.green,
    dados: ["SIH/SUS", "CNES", "Base Populacional"],
    ideas: [
      {
        name: "Clusterização de Hospitais por Perfil",
        desc: "K-means sobre: permanência média, taxa de UTI, volume de internações, taxa de mortalidade, especialidade predominante. Separa hospitais críticos dos estáveis.",
        formula: "K-means (k=4): baixo / médio / alto volume / especializado",
        selectAI: '"Agrupe hospitais com perfil similar de atendimento cirúrgico"',
        impact: "Alto",
      },
      {
        name: "Segmentação de Regiões por Pressão Assistencial",
        desc: "Classifica regiões de saúde em quadrantes: alta demanda × alta capacidade, alta demanda × baixa capacidade (crítico), etc.",
        formula: "Quadrante: eixo X = leitos/1000 hab | eixo Y = internações/1000 hab",
        selectAI: '"Quais regiões têm alta demanda de internação e baixa oferta de leitos?"',
        impact: "Alto",
      },
      {
        name: "Perfil de Pacientes Readmitidos",
        desc: "Identifica padrão de reinternação (mesma AIH × CID dentro de 30 dias). Sugere ineficiência de tratamento ou alta precoce.",
        formula: "Readmissão: nova AIH mesmo paciente, mesmo CID, ≤30 dias",
        selectAI: '"Quais diagnósticos têm maior taxa de readmissão em 30 dias?"',
        impact: "Médio",
      },
    ],
  },
  {
    topic: "Select AI — Perguntas em Linguagem Natural",
    icon: "🤖",
    color: palette.purple,
    dados: ["Todos os schemas modelados no Oracle"],
    ideas: [
      {
        name: "Perguntas operacionais de rotina",
        desc: "Perguntas que gestores fazem diariamente mas dependem de analista SQL. Select AI resolve em segundos.",
        formula: "",
        selectAI: '"Quantas internações foram realizadas em SP em março de 2024?" | "Qual hospital teve maior permanência média este mês?" | "Compare leitos SUS disponíveis vs. utilizados por estado"',
        impact: "Alto",
      },
      {
        name: "Perguntas de investigação epidemiológica",
        desc: "Perguntas analíticas mais complexas que combinam múltiplas fontes.",
        formula: "",
        selectAI: '"Quais municípios tiveram crescimento acima de 20% em internações cardiológicas entre 2022 e 2024?" | "Em quais hospitais a mortalidade por AVC supera a média estadual?"',
        impact: "Alto",
      },
      {
        name: "Alertas proativos em linguagem natural",
        desc: "Configurar triggers que disparam perguntas automáticas ao Select AI quando thresholds são atingidos.",
        formula: "Threshold → SELECT AI → resposta em PT → alerta para gestor",
        selectAI: '"Houve aumento atípico de internações por causas respiratórias nesta semana?"',
        impact: "Alto",
      },
    ],
  },
  {
    topic: "Cruzamentos Enriquecedores",
    icon: "🔗",
    color: palette.lightBlue,
    dados: ["SIH × SIM", "SIH × SIA", "SIH × CNES × POP"],
    ideas: [
      {
        name: "Mortalidade Hospitalar Ajustada (SIH × SIM)",
        desc: "Cruza óbitos hospitalares do SIH (campo MORTE=1) com o SIM para calcular taxa de mortalidade ajustada por diagnóstico e hospital.",
        formula: "Taxa mort. = (óbitos SIH / internações) × 100",
        selectAI: '"Quais hospitais têm maior mortalidade em cirurgias cardíacas?"',
        impact: "Alto",
      },
      {
        name: "Razão Ambulatorial/Hospitalar por CID (SIA × SIH)",
        desc: "Identifica doenças onde o sistema deveria resolver no ambulatório mas está internando. Aponta onde a atenção básica falha.",
        formula: "Razão = procedimentos_SIA / internações_SIH (mesmo CID)",
        selectAI: '"Quais diagnósticos têm alta taxa de internação em regiões com muitos ambulatórios?"',
        impact: "Alto",
      },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dados");
  const [selectedDB, setSelectedDB] = useState(null);
  const [expandedSolution, setExpandedSolution] = useState(null);

  const priorityOrder = { "PRIMÁRIO": 0, "OBRIGATÓRIO (Fonte 3)": 0, "ENRIQUECEDOR": 1, "COMPLEMENTAR": 2 };

  return (
    <div style={{
      fontFamily: "'Georgia', serif",
      background: palette.navy,
      minHeight: "100vh",
      color: palette.white,
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${palette.navyMid} 0%, ${palette.blue} 100%)`,
        borderBottom: `3px solid ${palette.coral}`,
        padding: "28px 32px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>🏥</span>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: palette.coral, fontFamily: "monospace", marginBottom: 2 }}>
              ORACLE ENTERPRISE CHALLENGE · SPRINT 1
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: palette.white }}>
              Mapeamento DATASUS & Soluções Analíticas
            </h1>
          </div>
        </div>
        <p style={{ margin: 0, color: palette.muted, fontSize: 13, fontStyle: "italic" }}>
          Painel Inteligente de Acesso Hospitalar · Dados SUS · Oracle Select AI
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        background: palette.navyMid,
        borderBottom: `1px solid ${palette.blue}33`,
        padding: "0 32px",
      }}>
        {[
          { id: "dados", label: "📂 Bases DATASUS" },
          { id: "solucoes", label: "💡 Sugestões de Solução" },
          { id: "acesso", label: "🛠️ Como Acessar (Python)" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? `3px solid ${palette.coral}` : "3px solid transparent",
              color: activeTab === tab.id ? palette.white : palette.muted,
              padding: "14px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
              transition: "all 0.2s",
              fontFamily: "Georgia, serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100 }}>

        {/* TAB: BASES DATASUS */}
        {activeTab === "dados" && (
          <div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              {[
                { label: "PRIMÁRIO / OBRIGATÓRIO", color: palette.coral },
                { label: "ENRIQUECEDOR", color: palette.gold },
                { label: "COMPLEMENTAR", color: palette.lightBlue },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 11, color: palette.muted, letterSpacing: 1 }}>{l.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
              {databases.map(db => (
                <div
                  key={db.id}
                  onClick={() => setSelectedDB(selectedDB?.id === db.id ? null : db)}
                  style={{
                    background: selectedDB?.id === db.id ? `${db.color}15` : palette.navyMid,
                    border: `1px solid ${selectedDB?.id === db.id ? db.color : palette.blue + "44"}`,
                    borderLeft: `4px solid ${db.color}`,
                    borderRadius: 10,
                    padding: "16px 18px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{db.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: db.color }}>{db.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>{db.full}</div>
                    </div>
                    <span style={{
                      background: `${db.priorityColor}22`,
                      color: db.priorityColor,
                      fontSize: 9,
                      letterSpacing: 1,
                      padding: "3px 7px",
                      borderRadius: 3,
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}>
                      {db.priority}
                    </span>
                  </div>

                  <p style={{ margin: "0 0 10px", fontSize: 12, color: palette.muted, lineHeight: 1.5 }}>
                    {db.description}
                  </p>

                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: palette.muted }}>
                    <span>🗂️ {db.format}</span>
                    <span>📅 {db.coverage.split("(")[0].trim()}</span>
                  </div>

                  {selectedDB?.id === db.id && (
                    <div style={{ marginTop: 16, borderTop: `1px solid ${db.color}33`, paddingTop: 14 }}>
                      {db.subsystems.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, color: db.color, marginBottom: 6 }}>SUBSISTEMAS</div>
                          {db.subsystems.map(s => (
                            <div key={s.code} style={{ fontSize: 11, color: palette.muted, marginBottom: 4 }}>
                              <span style={{ color: palette.white, fontFamily: "monospace" }}>{s.code}</span> → {s.desc}
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: db.color, marginBottom: 6 }}>CAMPOS-CHAVE</div>
                        {db.keyFields.map(f => (
                          <div key={f} style={{ fontSize: 11, color: palette.muted, marginBottom: 3, display: "flex", gap: 6 }}>
                            <span style={{ color: palette.coral, fontSize: 9, marginTop: 2 }}>▸</span>
                            <span style={{ fontFamily: "monospace", color: palette.white, fontSize: 10 }}>{f.split("—")[0].trim()}</span>
                            {f.includes("—") && <span style={{ color: palette.muted }}>— {f.split("—")[1].trim()}</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, padding: "8px 10px", background: `${db.color}11`, borderRadius: 6, fontSize: 11, color: palette.muted }}>
                        <span style={{ color: palette.white }}>Acesso: </span>{db.access}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SOLUÇÕES */}
        {activeTab === "solucoes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {solutions.map((sol, si) => (
              <div key={si} style={{
                background: palette.navyMid,
                border: `1px solid ${sol.color}33`,
                borderLeft: `4px solid ${sol.color}`,
                borderRadius: 10,
                overflow: "hidden",
              }}>
                {/* Topic header */}
                <div
                  onClick={() => setExpandedSolution(expandedSolution === si ? null : si)}
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: expandedSolution === si ? `${sol.color}10` : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{sol.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: sol.color, fontSize: 15 }}>{sol.topic}</div>
                      <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
                        Dados: {sol.dados.join(" · ")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      background: `${sol.color}22`, color: sol.color,
                      fontSize: 10, padding: "3px 8px", borderRadius: 3, letterSpacing: 1
                    }}>
                      {sol.ideas.length} ideia{sol.ideas.length > 1 ? "s" : ""}
                    </span>
                    <span style={{ color: palette.muted, fontSize: 16 }}>
                      {expandedSolution === si ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {expandedSolution === si && (
                  <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {sol.ideas.map((idea, ii) => (
                      <div key={ii} style={{
                        background: `${sol.color}08`,
                        border: `1px solid ${sol.color}22`,
                        borderRadius: 8,
                        padding: "14px 16px",
                      }}>
                        <div style={{ fontWeight: 700, color: palette.white, fontSize: 13, marginBottom: 6 }}>
                          {idea.name}
                          <span style={{
                            marginLeft: 8,
                            background: idea.impact === "Alto" ? `${palette.coral}22` : `${palette.gold}22`,
                            color: idea.impact === "Alto" ? palette.coral : palette.gold,
                            fontSize: 9, padding: "2px 6px", borderRadius: 3, letterSpacing: 1
                          }}>
                            IMPACTO {idea.impact.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: 12, color: palette.muted, lineHeight: 1.6 }}>
                          {idea.desc}
                        </p>
                        {idea.formula && (
                          <div style={{
                            background: palette.navy,
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: palette.lightBlue,
                            marginBottom: 8,
                          }}>
                            📐 {idea.formula}
                          </div>
                        )}
                        <div style={{
                          background: `${palette.purple}15`,
                          border: `1px solid ${palette.purple}33`,
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          color: palette.lightBlue,
                        }}>
                          <span style={{ color: palette.purple, fontWeight: 700 }}>🤖 Select AI: </span>
                          <span style={{ fontStyle: "italic", color: palette.muted }}>{idea.selectAI}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB: ACESSO PYTHON */}
        {activeTab === "acesso" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: palette.navyMid,
              border: `1px solid ${palette.coral}44`,
              borderRadius: 10,
              padding: 20,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: palette.coral, marginBottom: 12 }}>
                INSTALAÇÃO
              </div>
              <pre style={{
                background: palette.navy,
                padding: 14,
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 12,
                color: palette.lightBlue,
                margin: 0,
                overflowX: "auto",
              }}>{`pip install pysus pandas pyarrow`}</pre>
            </div>

            {[
              {
                title: "SIH/SUS — Internações hospitalares",
                color: palette.coral,
                code: `from pysus.online_data import SIH

# Baixar AIH Reduzida - São Paulo - 2023 (todos os meses)
df = SIH.fetch("RD", "SP", 2023)

# Campos principais para o challenge
cols = [
    'CNES',        # código do hospital
    'MUNIC_MOV',   # município de atendimento
    'DIAG_PRINC',  # CID-10 principal
    'QT_DIARIAS',  # permanência (dias)
    'VAL_TOT',     # valor pago
    'MORTE',       # óbito (0/1)
    'ANO_CMPT',    # ano
    'MES_CMPT',    # mês
    'SEXO',        # 1=masc, 3=fem
]
df_clean = df[cols].copy()
print(df_clean.head())`,
              },
              {
                title: "CNES — Leitos e estabelecimentos",
                color: palette.medBlue,
                code: `from pysus.online_data import CNES

# Estabelecimentos (ST) - Brasil - mês atual
df_hosp = CNES.fetch("ST", "SP", 2024, 1)

# Leitos (LT) - importante para o IPH
df_leitos = CNES.fetch("LT", "SP", 2024, 1)

# Campos chave dos leitos
cols_lt = [
    'CNES',       # código
    'CODUFMUN',   # município
    'REGSAUDE',   # região de saúde
    'LEIT_SUS',   # leitos SUS
    'LEIT_NSUS',  # leitos não-SUS
    'NATUREZA',   # tipo de gestão
]
df_lt = df_leitos[cols_lt]`,
              },
              {
                title: "SIM — Mortalidade hospitalar",
                color: palette.gold,
                code: `from pysus.online_data import SIM

# Óbitos - São Paulo - 2023
df_sim = SIM.fetch("DO", "SP", 2023)

# Campos para cruzamento com SIH
cols_sim = [
    'DTOBITO',    # data do óbito
    'CAUSABAS',   # CID-10 causa básica
    'LOCOCOR',    # local: 1=hospital
    'CODMUNRES',  # município residência
    'IDADE',      # codificado
    'SEXO',
]
df_obitos = df_sim[df_sim['LOCOCOR'] == '1']  # só hospitalares`,
              },
              {
                title: "Montando o Índice de Pressão Hospitalar",
                color: palette.green,
                code: `import pandas as pd

# Após carregar SIH e CNES leitos:

# 1. Internações por mês × município
internacoes = df_sih.groupby(['MES_CMPT', 'MUNIC_MOV']).agg(
    n_internacoes=('N_AIH', 'count'),
    perm_media=('QT_DIARIAS', 'mean'),
    val_total=('VAL_TOT', 'sum'),
    tx_mortalidade=('MORTE', 'mean'),
).reset_index()

# 2. Leitos disponíveis por município
leitos = df_leitos.groupby('CODUFMUN').agg(
    total_leitos_sus=('LEIT_SUS', 'sum')
).reset_index()

# 3. Merge e cálculo do IPH
df_iph = internacoes.merge(
    leitos,
    left_on='MUNIC_MOV',
    right_on='CODUFMUN',
    how='left'
)
df_iph['IPH'] = df_iph['n_internacoes'] / (df_iph['total_leitos_sus'] * 30)
df_iph['criticidade'] = pd.cut(
    df_iph['IPH'],
    bins=[0, 0.70, 0.85, float('inf')],
    labels=['Normal', 'Atenção', 'Crítico']
)`,
              },
            ].map((block, i) => (
              <div key={i} style={{
                background: palette.navyMid,
                border: `1px solid ${block.color}44`,
                borderLeft: `4px solid ${block.color}`,
                borderRadius: 10,
                overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${block.color}22` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: block.color }}>{block.title}</span>
                </div>
                <pre style={{
                  background: palette.navy,
                  padding: 16,
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#ABD8F5",
                  margin: 0,
                  overflowX: "auto",
                  lineHeight: 1.7,
                }}>
                  {block.code}
                </pre>
              </div>
            ))}

            <div style={{
              background: `${palette.gold}15`,
              border: `1px solid ${palette.gold}44`,
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: palette.gold, marginBottom: 8 }}>⚠️ ATENÇÃO</div>
              <p style={{ margin: 0, fontSize: 12, color: palette.muted, lineHeight: 1.6 }}>
                Os arquivos DATASUS estão em formato <strong style={{ color: palette.white }}>.dbc</strong> (compressão proprietária).
                O pysus cuida da conversão automaticamente. Caso precise baixar manualmente via FTP,
                use o <strong style={{ color: palette.white }}>TabWin</strong> ou o pacote R <strong style={{ color: palette.white }}>microdatasus</strong> para converter para CSV antes de importar no Oracle.
                Para a External Table do Oracle, o arquivo CSV precisa estar no diretório configurado pelo DBA.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

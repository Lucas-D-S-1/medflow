import { useState } from "react";

const P = {
  navy: "#0D1B2A", navyMid: "#162032", blue: "#1A5276",
  med: "#2E86C1", light: "#85C1E9", coral: "#E8604C",
  white: "#F5F7FA", muted: "#8FA3B1", gold: "#D4AC0D",
  green: "#1ABC9C", purple: "#7D3C98", orange: "#E67E22",
  red: "#C0392B",
};

const Check = ({ ok, warn }) => (
  <span style={{
    fontSize: 13, fontWeight: 700,
    color: ok ? P.green : warn ? P.gold : P.red,
  }}>
    {ok ? "✅" : warn ? "⚠️" : "❌"}
  </span>
);

const Tag = ({ children, color = P.med }) => (
  <span style={{
    background: color + "22", color, fontSize: 10,
    padding: "2px 8px", borderRadius: 4, fontWeight: 600,
    letterSpacing: ".05em", display: "inline-block",
  }}>{children}</span>
);

const Section = ({ title, children, accent = P.coral }) => (
  <div style={{
    background: P.navyMid, border: `1px solid ${accent}33`,
    borderLeft: `4px solid ${accent}`, borderRadius: 10,
    padding: "18px 20px", marginBottom: 14,
  }}>
    <div style={{ fontSize: 10, letterSpacing: 3, color: accent, marginBottom: 10, fontFamily: "monospace" }}>
      {title}
    </div>
    {children}
  </div>
);

const Row = ({ label, value, status, note, accent }) => (
  <div style={{
    display: "flex", gap: 10, alignItems: "flex-start",
    padding: "8px 0", borderBottom: `1px solid ${P.navy}`,
  }}>
    {status !== undefined && (
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Check ok={status === "ok"} warn={status === "warn"} />
      </div>
    )}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: P.white }}>{label}</div>
      {value && <div style={{ fontSize: 12, color: P.muted, marginTop: 2, lineHeight: 1.5 }}>{value}</div>}
      {note && (
        <div style={{ fontSize: 11, color: accent || P.gold, marginTop: 3, fontStyle: "italic" }}>
          {note}
        </div>
      )}
    </div>
  </div>
);

export default function App() {
  const [tab, setTab] = useState("criterios");

  const tabs = [
    { id: "criterios", label: "📋 Critérios" },
    { id: "alinhado", label: "✅ Alinhado" },
    { id: "entregavel", label: "📦 Entregável" },
    { id: "mentoria", label: "🎙️ Mentoria" },
  ];

  return (
    <div style={{ fontFamily: "Georgia, serif", background: P.navy, minHeight: "100vh", color: P.white }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${P.navyMid} 0%, ${P.blue} 100%)`,
        borderBottom: `3px solid ${P.coral}`, padding: "22px 28px 18px",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: P.coral, fontFamily: "monospace", marginBottom: 4 }}>
          ORACLE ENTERPRISE CHALLENGE · DOCUMENTO MESTRE
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>MedFlow — Painel Inteligente de Acesso Hospitalar</div>
        <div style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>
          Ômega Urban Tech · 1TSCOA · Sprint 1 — 16/06/2026
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: P.navyMid, borderBottom: `1px solid ${P.blue}33`, padding: "0 28px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none",
            borderBottom: tab === t.id ? `3px solid ${P.coral}` : "3px solid transparent",
            color: tab === t.id ? P.white : P.muted,
            padding: "12px 18px", cursor: "pointer", fontSize: 12,
            fontWeight: tab === t.id ? 700 : 400, fontFamily: "Georgia, serif",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 960 }}>

        {/* ── CRITÉRIOS ── */}
        {tab === "criterios" && (
          <div>
            <Section title="CRITÉRIOS DA ORACLE — AVALIAÇÃO DO PITCH (Sprint 2)" accent={P.coral}>
              <div style={{ fontSize: 12, color: P.muted, marginBottom: 14, lineHeight: 1.6 }}>
                A Oracle avalia <strong style={{ color: P.white }}>independentemente</strong> da FIAP.
                Podem acontecer notas diferentes. A banca Oracle elege os Top 3 por critério próprio.
              </div>
              {[
                {
                  label: "Alinhamento com o objetivo",
                  value: "A proposta está adequada ao desafio? Resolve o problema de internações, pressão regional e capacidade? Está direcionada ao público técnico e de negócio correto?",
                  peso: "Alta",
                },
                {
                  label: "Inovação",
                  value: "Comparado ao que a Oracle tem hoje, houve melhoria? Quão criativa e disruptiva é a solução? O grupo foi além do esperado considerando que são estudantes?",
                  peso: "Alta",
                },
                {
                  label: "Usabilidade",
                  value: "Interface intuitiva? Fácil de usar sem conhecimento técnico? O projeto é claro para o usuário final?",
                  peso: "Média",
                },
                {
                  label: "MVP em funcionamento",
                  value: "A solução foi apresentada com as funcionalidades esperadas funcionando de verdade? Entregou o que prometeu?",
                  peso: "Alta",
                },
                {
                  label: "Condução da apresentação",
                  value: "Slides bem elaborados, capacidade de síntese, oratória clara, sabe responder perguntas da banca sobre cada decisão tomada.",
                  peso: "Alta",
                },
              ].map((c, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${P.navy}`, display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: P.white, marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{c.value}</div>
                  </div>
                  <Tag color={c.peso === "Alta" ? P.coral : P.gold}>PESO {c.peso.toUpperCase()}</Tag>
                </div>
              ))}
            </Section>

            <Section title="PESOS DA AVALIAÇÃO TÉCNICA (Sprint 2)" accent={P.med}>
              {[
                { item: "Apresentação PPT / Canvas / PDF com tópicos do pitch", peso: "10%" },
                { item: "Entrega do vídeo pitch com link no YouTube", peso: "10%" },
                { item: "Link da aplicação funcionando (Power BI, dashboard ou similar)", peso: "10%" },
                { item: "GitHub / código-fonte do projeto", peso: "20%" },
                { item: "Avaliação técnica do vídeo pitch + apresentação ao vivo (Top 6)", peso: "50%", destaque: true },
              ].map((p, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0", borderBottom: `1px solid ${P.navy}`,
                }}>
                  <div style={{ fontSize: 12, color: p.destaque ? P.white : P.muted, fontWeight: p.destaque ? 600 : 400 }}>
                    {p.item}
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: p.destaque ? P.coral : P.muted, flexShrink: 0, marginLeft: 16,
                  }}>{p.peso}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 12, color: P.muted, fontStyle: "italic", lineHeight: 1.6 }}>
                O pitch técnico vale metade da nota. A apresentação ao vivo para a banca Oracle (apenas Top 6) também conta aqui.
                Após a Sprint 2, os 6 melhores grupos da série apresentam via Microsoft Teams na semana de 14–18/09/2026.
              </div>
            </Section>

            <Section title="SELECT AI — STATUS DENTRO DOS CRITÉRIOS" accent={P.purple}>
              <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.7 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: P.white, fontWeight: 600 }}>O que o mentor disse na mentoria:</span>{" "}
                  "É a cereja do bolo. Se você tiver o conhecimento ou quiser explorar, pode trazer. Mas não é algo que vai dizer
                  se está melhor ou não [na nota]. Foca no bolo mesmo, deixa a cereja pra depois."
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: P.white, fontWeight: 600 }}>O que o PDF diz:</span>{" "}
                  É um critério de avaliação explícito da Oracle: "As perguntas em linguagem natural são úteis e conectadas ao
                  problema de negócio?" — aparece na tabela de critérios.
                </div>
                <div style={{ padding: "10px 14px", background: `${P.purple}15`, border: `1px solid ${P.purple}33`, borderRadius: 8 }}>
                  <strong style={{ color: P.purple }}>Conclusão prática:</strong> Mencionar na arquitetura e no slide de
                  tecnologias como diferencial planejado para Sprint 2. Não precisa estar funcionando na Sprint 1.
                  Na Sprint 2, se der tempo, implementar — é o elemento que mais diferencia na banca Oracle.
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ── ALINHADO ── */}
        {tab === "alinhado" && (
          <div>
            <Section title="SOLUÇÃO E ESCOPO" accent={P.coral}>
              {[
                { label: "Nome da solução", value: "MedFlow — Painel Inteligente de Acesso Hospitalar e Perfil de Atendimento" },
                { label: "Recorte geográfico", value: "Estado de São Paulo (profundidade > volume)", note: "Decisão deliberada — SP tem maior massa de dados e é defensável na banca" },
                { label: "Recorte temporal", value: "2022–2023 para case inicial; expansão até 2024 na Sprint 2" },
                { label: "KPI central", value: "IPH (Índice de Pressão Hospitalar) = internações/mês ÷ (leitos_SUS × dias_do_mês)", note: "Calculado em 3 granularidades: hospital → município → região de saúde" },
                { label: "Tempestividade real", value: "Mensal — alinhado ao ciclo de publicação do DATASUS (defasagem 2–3 meses)", note: "Não prometer real-time. Resposta correta pra banca: 'ciclo mensal com janela histórica de 12 meses'" },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>

            <Section title="PROBLEMA E PÚBLICO-ALVO" accent={P.med}>
              {[
                { label: "Problema central", value: "Gestores de saúde dependem de analistas SQL para responder qualquer pergunta crítica. A resposta chega tarde — decisões são tomadas sem dados ou com dados defasados manuais." },
                { label: "Gap de mercado validado", value: "SISREG (2002): operacional, regulação de leitos em tempo real, sem inteligência analítica. Dashboards estaduais: ilhas isoladas por estado, sem visão nacional, sem NL. DATASUS: dados ricos mas inacessíveis sem SQL." },
                { label: "Persona primária", value: "Secretário(a) de Saúde Municipal/Estadual — não técnico, precisa de semáforo, não tabela." },
                { label: "Persona secundária", value: "Gestor de regulação (SAMU), Diretor Hospitalar, Analista de saúde pública." },
                { label: "Beneficiário final", value: "População do SUS — ganha com melhor alocação de recursos e redução de gargalos." },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>

            <Section title="FONTES DE DADOS (as 3 do challenge)" accent={P.gold}>
              {[
                {
                  label: "Fonte 1 — SIH/SUS RD (relacional)",
                  value: "AIH Reduzida: internações, CID-10, permanência (QT_DIARIAS), valor (VAL_TOT), mortalidade (MORTE), CNES do hospital, município de atendimento (MUNIC_MOV).",
                  note: "Campos-chave para IPH: CNES, MUNIC_MOV, QT_DIARIAS, VAL_TOT, MORTE, ESPEC, CAR_INT, ANO_CMPT, MES_CMPT",
                },
                {
                  label: "Fonte 2 — CNES LT (JSON via API)",
                  value: "Leitos por estabelecimento: QT_SUS (leitos SUS disponíveis), TP_LEITO (tipo), REGSAUDE (região de saúde), NATUREZA (gestão).",
                  note: "Denominador do IPH. Requer desnormalização: agrupar por CNES + COMPETEN, somando QT_SUS.",
                },
                {
                  label: "Fonte 3 — Base Populacional IBGE (CSV External Table)",
                  value: "Estimativas anuais por município, sexo e faixa etária. Denominador para métricas per capita.",
                  note: "Join: MUNIC_MOV (6 dígitos SIH) → CO_MUNICIPIO_IBGE → CO_REGIAO_SAUDE",
                },
              ].map((r, i) => <Row key={i} {...r} accent={P.gold} />)}
            </Section>

            <Section title="ARQUITETURA (4 CAMADAS)" accent={P.green}>
              {[
                { label: "1 · Fontes", value: "SIH/SUS FTP (.dbc) + CNES API JSON + CSV IBGE" },
                { label: "2 · Ingestão / ETL", value: "Python (pysus 2.x) no Google Colab → download mês a mês → parquet → Oracle Autonomous DB. JSON do CNES entra no formato nativo (banco convergente)." },
                { label: "3 · Armazenamento & Análise", value: "Oracle Autonomous DB (OCI): relacional + JSON + External Table no mesmo repositório. Database Actions (SQL) para EDA. Python (pandas, scikit-learn) para IPH, rankings e clusterização." },
                { label: "4 · Consumo", value: "Power BI ou Oracle Analytics: mapas, rankings, indicadores de capacidade. Select AI (Sprint 2): perguntas em português → SQL automático." },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>

            <Section title="SOLUÇÕES ANALÍTICAS PRIORIZADAS" accent={P.purple}>
              <div style={{ marginBottom: 8 }}>
                <Tag color={P.green}>MVP CORE</Tag>
              </div>
              {[
                { label: "IPH por região / município / hospital", value: "Core do produto. Mapa semáforo + ranking + série histórica mensal. Alimentado por SIH + CNES + POP." },
                { label: "Quadrante demanda × capacidade", value: "Eixo X = leitos/1000 hab | Eixo Y = internações/1000 hab. Visual de impacto imediato para a banca." },
                { label: "Ranking CID-10 e permanência média vs. benchmark", value: "Responde diretamente: 'quais perfis pressionam mais o sistema?' e 'como este hospital se compara?'" },
              ].map((r, i) => <Row key={i} {...r} />)}
              <div style={{ marginTop: 12, marginBottom: 8 }}>
                <Tag color={P.purple}>DIFERENCIAL (Sprint 2 se der tempo)</Tag>
              </div>
              {[
                { label: "Oracle Select AI", value: "Perguntas em português → SQL gerado automaticamente. Cereja do bolo. Não obrigatório para nota mas diferencia na banca." },
              ].map((r, i) => <Row key={i} {...r} />)}
              <div style={{ marginTop: 12, marginBottom: 8 }}>
                <Tag color={P.red}>DEIXAR FORA POR ORA</Tag>
              </div>
              {[
                { label: "K-means clustering de hospitais", value: "Alta dificuldade, baixo storytelling pra banca não-técnica. Mencionar como roadmap futuro." },
                { label: "Razão ambulatorial/hospitalar (SIA × SIH)", value: "Cruzamento complexo, risco alto pra Sprint 2." },
                { label: "Alertas proativos automáticos", value: "Infra de triggers no Oracle é complexa. Roadmap fase 3." },
              ].map((r, i) => <Row key={i} {...r} accent={P.red} />)}
            </Section>

            <Section title="STACK TÉCNICO VALIDADO" accent={P.orange}>
              {[
                { label: "Ambiente Python", value: "Google Colab — resolve o problema do libffi no Windows. pysus 2.2+ com API simplificada: from pysus import sih, cnes" },
                { label: "Banco de dados", value: "Oracle Autonomous DB (OCI) — banco convergente. Relacional + JSON + External Table." },
                { label: "Análise", value: "Python (pandas, numpy, scikit-learn), SQL no Database Actions do Autonomous" },
                { label: "Visualização", value: "Power BI (permitido pela Oracle) ou Oracle Analytics" },
                { label: "Versionamento", value: "GitHub — obrigatório para Sprint 2 (20% do peso)" },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>
          </div>
        )}

        {/* ── ENTREGÁVEL ── */}
        {tab === "entregavel" && (
          <div>
            <Section title="SPRINT 1 — ARQUIVO OBRIGATÓRIO" accent={P.coral}>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: P.light, background: P.navy, padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>
                EC_Sprint_1_1TSCO_ideacao_arquitetura_projeto_MedFlow_OmegaUrbanTech.pptx
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>
                Entrega via portal FIAP ON. Não aceita links. Arquivos devem funcionar no Windows.
                RMs e nomes <strong style={{ color: P.white }}>obrigatoriamente em ordem alfabética</strong>.
              </div>
            </Section>

            <Section title="STATUS DOS SLIDES — V0 ANALISADA" accent={P.med}>
              {[
                { label: "Slide 1 — Capa / Mapa da Missão", value: "RMs, nomes em ordem alfabética, grupo Ômega Urban Tech, turma 1TSCOA", status: "ok" },
                { label: "Slide 2 — Nome do projeto", value: "MedFlow | Painel Inteligente de Acesso Hospitalar — DATASUS", status: "ok" },
                { label: "Slide 3 — Contextualização", value: "1,41M internações em SP, dados Fiocruz sobre fragmentação, fontes citadas. Sólido.", status: "ok", note: "Upgrade: adicionar menção ao SISREG como solução existente e por que é insuficiente" },
                { label: "Slide 4 — Problema a ser resolvido", value: "4 dores + persona citada. Bem estruturado.", status: "ok" },
                { label: "Slide 5 — Público-alvo", value: "Persona primária + 3 stakeholders secundários + beneficiário final.", status: "ok" },
                { label: "Slide 6 — Proposta de solução", value: "4 pilares analíticos alinhados ao challenge. Diferencial do recorte SP mencionado.", status: "ok" },
                { label: "Slide 7 — Como o MedFlow resolve", value: "Jornada em 4 passos: pergunta → dados → painel → insight.", status: "ok" },
                { label: "Slide 8 — Benefícios esperados", value: "4 benefícios com métricas de sucesso.", status: "ok" },
                { label: "Slide 9 — Arquitetura", value: "4 camadas corretas. Fontes, ETL, Oracle, Painel.", status: "warn", note: "Falta: Select AI como elemento visual na arquitetura (mesmo que Sprint 2)" },
                { label: "Slide 10 — Tecnologias", value: "Stack completo com papel de cada ferramenta.", status: "warn", note: "Falta: Oracle Select AI na lista de tecnologias (como horizonte Sprint 2)" },
                { label: "Slide 11 — Protótipos", value: "Tem descrição textual do que o protótipo mostraria, mas sem imagem/wireframe.", status: "no", note: "CRÍTICO: Sem visual, este é o slide mais fraco. Precisa de mockup real, mesmo que Figma ou Power BI draft." },
                { label: "Slide 12 — Gerenciamento (Scrum/Kanban)", value: "Board A FAZER / EM ANDAMENTO / CONCLUÍDO + papéis da equipe.", status: "ok" },
                { label: "Slide 13 — Roadmap Sprint 1 → Sprint 2", value: "Macro de entregas com datas corretas.", status: "ok" },
                { label: "Slide 14 — Agradecimentos", value: "Oracle, FIAP, tutor e Scrum Master.", status: "ok" },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>

            <Section title="O QUE DEVE IR NO SLIDE DE PROTÓTIPO (11)" accent={P.orange}>
              <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.7, marginBottom: 12 }}>
                O protótipo não precisa ser funcional na Sprint 1 — pode ser mockup Figma, Power BI em modo design, ou até print de wireframe com anotações. O que a Oracle quer ver:
              </div>
              {[
                { label: "Tela 1 — Mapa de pressão por região de saúde", value: "Semáforo verde/amarelo/vermelho por região de SP. KPIs no topo: total internações, IPH médio, regiões críticas." },
                { label: "Tela 2 — Drill-down de hospital", value: "Ao clicar numa região: lista de hospitais com IPH individual, permanência média vs. benchmark, % urgências vs. eletivos." },
                { label: "Tela 3 — Série histórica", value: "Linha do tempo mensal do IPH por região selecionada. Sazonalidade visível." },
                { label: "Tela 4 — Select AI (visual da interface)", value: "Campo de texto 'Faça sua pergunta em português' + exemplo de pergunta + exemplo de resposta. Não precisa funcionar — é a visão de futuro." },
              ].map((r, i) => <Row key={i} {...r} accent={P.orange} />)}
            </Section>

            <Section title="CHECKLIST FINAL ANTES DE ENTREGAR" accent={P.green}>
              {[
                { label: "RMs e nomes em ordem alfabética na capa", status: "ok" },
                { label: "Nome do arquivo correto (com nome do projeto e do grupo)", status: "ok" },
                { label: "Contextualização com dados reais e fontes citadas", status: "ok" },
                { label: "Problema com persona e as 4 dores", status: "ok" },
                { label: "Público-alvo com stakeholders secundários", status: "ok" },
                { label: "Proposta de solução clara e concisa", status: "ok" },
                { label: "Arquitetura visual com as 3 fontes do challenge", status: "ok", note: "Adicionar Select AI como componente previsto" },
                { label: "Tecnologias com papel de cada uma", status: "ok", note: "Adicionar Select AI como diferencial Sprint 2" },
                { label: "Protótipo visual (imagem real, não só texto)", status: "no", note: "BLOCKER — precisa criar antes de entregar" },
                { label: "Roadmap Sprint 1 → Sprint 2 com datas", status: "ok" },
                { label: "Gestão ágil (Scrum/Kanban + papéis da equipe)", status: "ok" },
                { label: "Arquivo .pptx abre corretamente no Windows", status: "warn", note: "Verificar antes de submeter" },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>
          </div>
        )}

        {/* ── MENTORIA ── */}
        {tab === "mentoria" && (
          <div>
            <div style={{ fontSize: 12, color: P.muted, marginBottom: 16, fontStyle: "italic" }}>
              Transcrição da sessão de mentoria Oracle/FIAP em 07/06/2026 — filtrada e interpretada.
              Trechos com erros de transcrição foram descartados; só o que faz sentido no contexto foi mantido.
            </div>

            <Section title="O QUE OS MENTORES ENFATIZARAM (sinal forte)" accent={P.coral}>
              {[
                {
                  label: "\"Não é dashboard com monte de insights\"",
                  value: "Às vezes vale ter 1 ou 2 dados que são importantíssimos para o direcionamento. Menos é mais. Clareza > completude.",
                },
                {
                  label: "\"Conheça o que está fazendo\"",
                  value: "Anedota direta: um grupo usou IA pra fazer tudo maravilhoso, mas ninguém sabia o que significava o nome da empresa. A banca vai perguntar cada decisão. Você precisa saber responder.",
                },
                {
                  label: "\"Pense na solução, não no produto\"",
                  value: "Não comece pelo front-end. Comece pela pergunta de negócio que você quer responder. Você pode mostrar isso em uma consulta SQL — não precisa ser uma aplicação bonita.",
                },
                {
                  label: "\"Escopo claro é o primeiro passo\"",
                  value: "Declare o que vai entregar e o que não vai. Focar em São Paulo é válido — você perde amplitude mas ganha profundidade, e isso é defensável.",
                },
                {
                  label: "\"Previsibilidade é a palavra-chave\"",
                  value: "O challenge quer soluções que dêem previsibilidade a partir dos dados. Não é só mostrar o que aconteceu — é ajudar o gestor a antecipar o que vai acontecer.",
                },
                {
                  label: "\"Use o console do Oracle Autonomous para EDA\"",
                  value: "O Database Actions do Autonomous tem análise exploratória automatizada. Não precisa criar aplicação para Sprint 1 — pode explorar e mostrar direto no console.",
                },
                {
                  label: "\"Qualidade dos dados > volume\"",
                  value: "Podem trabalhar com poucas linhas. Não estão buscando performance. Estão buscando uso correto dos dados e leitura inteligente deles.",
                },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>

            <Section title="PERMISSÕES EXPLÍCITAS (o que os mentores liberaram)" accent={P.green}>
              {[
                { label: "Dados sintéticos são permitidos", value: "Para dados complementares (não para a fonte principal). Ex: se faltar dado de população para algum município, pode simular com dados reais de referência." },
                { label: "Outras fontes além do DATASUS são permitidas", value: "\"Não está fixado no DATASUS.\" Pode usar gov.br, APIs públicas, IBGE, etc. Desde que explique claramente o que usou e por quê." },
                { label: "Power BI é permitido", value: "\"Não tem problema nenhum.\" A Oracle tem ferramentas concorrentes, mas usem o que vocês dominam. Mais ferramentas = mais demonstração de capacidade." },
                { label: "Explorar apenas parte dos dados é permitido e recomendado", value: "\"Pode pegar só a região Leste de SP.\" Escopo menor com profundidade é melhor que escopo grande superficial." },
              ].map((r, i) => <Row key={i} {...r} />)}
            </Section>

            <Section title="SELECT AI — O QUE A MENTORIA REALMENTE DISSE" accent={P.purple}>
              <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.7 }}>
                <p style={{ marginTop: 0 }}>
                  O mentor disse explicitamente: <em style={{ color: P.light }}>"Não é algo que vai dizer se está melhor ou não [na nota].
                  Se vocês ao decorrer do semestre tiverem conhecimento com Oracle que traga essa funcionalidade, podem adicionar.
                  Esquece essa parte, foca no bolo mesmo — isso é a cereja."</em>
                </p>
                <p>
                  Porém o PDF da Oracle coloca Select AI como critério de avaliação explícito na tabela de notas.
                </p>
                <div style={{
                  padding: "12px 14px", background: `${P.purple}15`,
                  border: `1px solid ${P.purple}33`, borderRadius: 8, marginTop: 8,
                }}>
                  <strong style={{ color: P.purple }}>Interpretação correta:</strong> O mentor estava falando com
                  alunos que ainda não tinham nem acessado o Autonomous. Pra esses, faz sentido dizer "foca no básico primeiro."
                  Para vocês, que já têm a arquitetura montada e os dados em exploração, incluir Select AI na Sprint 2 é
                  viável e é o elemento que mais diferencia na banca Oracle. Mencionem na Sprint 1 como diferencial planejado.
                </div>
              </div>
            </Section>

            <Section title="ALERTAS DA MENTORIA (o que evitar)" accent={P.red}>
              {[
                { label: "Não prometer o que não vai entregar", value: "Declare escopo claro. O que é Sprint 1, o que é Sprint 2, o que é fase futura. Banca vai cobrar." },
                { label: "Não depender 100% de disponibilidade do DATASUS", value: "DATASUS tem instabilidade. Estratégia de cache local (parquet) + ciclo mensal é a resposta correta." },
                { label: "Não construir sem entender a persona", value: "\"Se você abre muito a boca, fecha a saída.\" Escopo muito amplo = entrega superficial. Escolha uma persona e siga." },
                { label: "Não usar IA para gerar tudo sem entender", value: "A banca vai perguntar detalhes. Você precisa saber explicar cada número, cada decisão de arquitetura, cada campo usado." },
              ].map((r, i) => <Row key={i} {...r} accent={P.red} />)}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

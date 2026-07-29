import { useState } from "react";

const P = {
  navy: "#0D1B2A", navyMid: "#162032", blue: "#1A5276",
  medBlue: "#2E86C1", lightBlue: "#85C1E9", coral: "#E8604C",
  white: "#F5F7FA", muted: "#8FA3B1", gold: "#D4AC0D",
  green: "#1ABC9C", purple: "#7D3C98", orange: "#E67E22",
};

/* ── CRITÉRIOS ──────────────────────────────────────────── */
const CRITERIOS = [
  {
    id: "alinhamento",
    label: "Alinhamento",
    icon: "🎯",
    peso: "Alta",
    desc: "Responde diretamente ao desafio Oracle: internações, pressão regional, capacidade?",
  },
  {
    id: "inovacao",
    label: "Inovação",
    icon: "💡",
    peso: "Alta",
    desc: "Vai além do óbvio? Diferencia do que a Oracle já tem hoje?",
  },
  {
    id: "usabilidade",
    label: "Usabilidade",
    icon: "🖥️",
    peso: "Média",
    desc: "Gestor não-técnico consegue usar sem ajuda de analista SQL?",
  },
  {
    id: "mvp",
    label: "MVP Viável",
    icon: "⚙️",
    peso: "Alta",
    desc: "Consegue entregar funcionando até 01/09 com os recursos do grupo?",
  },
  {
    id: "storytelling",
    label: "Storytelling",
    icon: "📣",
    peso: "Alta",
    desc: "Conta uma história clara e impactante na apresentação de 5 min?",
  },
  {
    id: "selectai",
    label: "Select AI Fit",
    icon: "🤖",
    peso: "Alta",
    desc: "Integra naturalmente com perguntas em linguagem natural Oracle Select AI?",
  },
];

/* ── SOLUÇÕES ───────────────────────────────────────────── */
const SOLUCOES = [
  // --- Capacidade
  {
    id: "iph",
    nome: "Índice de Pressão Hospitalar (IPH)",
    topico: "Capacidade",
    topicoColor: P.coral,
    fontes: ["SIH", "CNES", "POP"],
    sprint: "S1+S2",
    dificuldade: "Baixa",
    desc: "Razão internações/leitos SUS por região, semáforo visual verde/amarelo/vermelho.",
    scores: { alinhamento: 5, inovacao: 4, usabilidade: 5, mvp: 5, storytelling: 5, selectai: 5 },
  },
  {
    id: "mapa_critico",
    nome: "Mapa de Regiões Críticas",
    topico: "Capacidade",
    topicoColor: P.coral,
    fontes: ["SIH", "CNES", "POP"],
    sprint: "S2",
    dificuldade: "Baixa",
    desc: "Dashboard geográfico com semáforo de ocupação por região de saúde.",
    scores: { alinhamento: 5, inovacao: 3, usabilidade: 5, mvp: 5, storytelling: 5, selectai: 4 },
  },
  {
    id: "permanencia",
    nome: "Permanência Média vs. Benchmark",
    topico: "Capacidade",
    topicoColor: P.coral,
    fontes: ["SIH"],
    sprint: "S2",
    dificuldade: "Baixa",
    desc: "Compara permanência local com média nacional por CID-10. Identifica ineficiências.",
    scores: { alinhamento: 4, inovacao: 3, usabilidade: 4, mvp: 5, storytelling: 4, selectai: 4 },
  },
  // --- Perfil
  {
    id: "ranking_cid",
    nome: "Ranking CID-10 e Procedimentos",
    topico: "Perfil",
    topicoColor: P.medBlue,
    fontes: ["SIH"],
    sprint: "S2",
    dificuldade: "Baixa",
    desc: "Top 10 diagnósticos/procedimentos por município e período. Responde: 'o que pressiona mais?'",
    scores: { alinhamento: 5, inovacao: 2, usabilidade: 5, mvp: 5, storytelling: 4, selectai: 5 },
  },
  {
    id: "percapita",
    nome: "Taxa de Internação per Capita",
    topico: "Perfil",
    topicoColor: P.medBlue,
    fontes: ["SIH", "POP"],
    sprint: "S2",
    dificuldade: "Baixa",
    desc: "Normaliza volume por 1.000 hab — comparação justa entre municípios grandes e pequenos.",
    scores: { alinhamento: 4, inovacao: 2, usabilidade: 4, mvp: 5, storytelling: 3, selectai: 4 },
  },
  {
    id: "funil_valor",
    nome: "Funil de Valor (custo por CID × faixa etária)",
    topico: "Perfil",
    topicoColor: P.medBlue,
    fontes: ["SIH"],
    sprint: "S2",
    dificuldade: "Média",
    desc: "Identifica quais grupos etários e diagnósticos consomem mais recursos do SUS.",
    scores: { alinhamento: 4, inovacao: 4, usabilidade: 4, mvp: 4, storytelling: 5, selectai: 5 },
  },
  // --- Sazonalidade
  {
    id: "serie_historica",
    nome: "Série Histórica de Internações",
    topico: "Sazonalidade",
    topicoColor: P.gold,
    fontes: ["SIH multianual"],
    sprint: "S2",
    dificuldade: "Média",
    desc: "Linha do tempo mensal 2015–2024 por região. Revela picos sazonais (gripe, dengue) e tendências.",
    scores: { alinhamento: 5, inovacao: 3, usabilidade: 4, mvp: 4, storytelling: 5, selectai: 4 },
  },
  {
    id: "anomalias",
    nome: "Detecção de Anomalias (picos atípicos)",
    topico: "Sazonalidade",
    topicoColor: P.gold,
    fontes: ["SIH multianual"],
    sprint: "S2",
    dificuldade: "Alta",
    desc: "Meses com volume > média + 2σ. Detecta impactos de epidemias e eventos climáticos.",
    scores: { alinhamento: 5, inovacao: 5, usabilidade: 3, mvp: 3, storytelling: 4, selectai: 3 },
  },
  // --- Clustering
  {
    id: "cluster_hosp",
    nome: "Clusterização de Hospitais (K-means)",
    topico: "Clustering",
    topicoColor: P.green,
    fontes: ["SIH", "CNES"],
    sprint: "S2",
    dificuldade: "Alta",
    desc: "Agrupa hospitais por perfil: baixo/médio/alto volume, especializado. Separa críticos dos estáveis.",
    scores: { alinhamento: 4, inovacao: 5, usabilidade: 3, mvp: 3, storytelling: 4, selectai: 3 },
  },
  {
    id: "quadrante",
    nome: "Quadrante Demanda × Capacidade",
    topico: "Clustering",
    topicoColor: P.green,
    fontes: ["SIH", "CNES", "POP"],
    sprint: "S2",
    dificuldade: "Média",
    desc: "Regiões plotadas em eixo leitos/1000 hab × internações/1000 hab. Visual de impacto imediato.",
    scores: { alinhamento: 5, inovacao: 4, usabilidade: 5, mvp: 4, storytelling: 5, selectai: 4 },
  },
  {
    id: "readmissao",
    nome: "Perfil de Pacientes Readmitidos",
    topico: "Clustering",
    topicoColor: P.green,
    fontes: ["SIH"],
    sprint: "S2",
    dificuldade: "Alta",
    desc: "Nova AIH mesmo paciente + CID em ≤30 dias. Aponta ineficiência de tratamento ou alta precoce.",
    scores: { alinhamento: 3, inovacao: 4, usabilidade: 4, mvp: 3, storytelling: 4, selectai: 3 },
  },
  // --- Select AI
  {
    id: "selectai_op",
    nome: "Select AI — Perguntas Operacionais",
    topico: "Select AI",
    topicoColor: P.purple,
    fontes: ["Oracle DB (todos schemas)"],
    sprint: "S1+S2",
    dificuldade: "Média",
    desc: "Gestor digita pergunta em PT. Select AI gera e executa SQL. Sem depender de analista.",
    scores: { alinhamento: 5, inovacao: 5, usabilidade: 5, mvp: 4, storytelling: 5, selectai: 5 },
  },
  {
    id: "selectai_epi",
    nome: "Select AI — Investigação Epidemiológica",
    topico: "Select AI",
    topicoColor: P.purple,
    fontes: ["Oracle DB (todos schemas)"],
    sprint: "S2",
    dificuldade: "Média",
    desc: "Perguntas complexas combinando múltiplas fontes em linguagem natural.",
    scores: { alinhamento: 5, inovacao: 5, usabilidade: 5, mvp: 3, storytelling: 5, selectai: 5 },
  },
  {
    id: "selectai_alert",
    nome: "Select AI — Alertas Proativos",
    topico: "Select AI",
    topicoColor: P.purple,
    fontes: ["Oracle DB"],
    sprint: "S2",
    dificuldade: "Alta",
    desc: "Trigger dispara pergunta automática ao Select AI quando threshold de ocupação é atingido.",
    scores: { alinhamento: 4, inovacao: 5, usabilidade: 5, mvp: 2, storytelling: 4, selectai: 5 },
  },
  // --- Cruzamentos
  {
    id: "mortalidade",
    nome: "Mortalidade Hospitalar Ajustada (SIH × SIM)",
    topico: "Cruzamentos",
    topicoColor: P.lightBlue,
    fontes: ["SIH", "SIM"],
    sprint: "S2",
    dificuldade: "Média",
    desc: "Taxa de mortalidade por hospital × diagnóstico, ajustada por complexidade do caso.",
    scores: { alinhamento: 4, inovacao: 4, usabilidade: 4, mvp: 3, storytelling: 5, selectai: 4 },
  },
  {
    id: "razao_amb",
    nome: "Razão Ambulatorial/Hospitalar (SIA × SIH)",
    topico: "Cruzamentos",
    topicoColor: P.lightBlue,
    fontes: ["SIH", "SIA"],
    sprint: "S2",
    dificuldade: "Alta",
    desc: "Identifica doenças que deveriam ser resolvidas no ambulatório mas estão internando.",
    scores: { alinhamento: 3, inovacao: 4, usabilidade: 3, mvp: 2, storytelling: 4, selectai: 3 },
  },
];

const PESO_CRITERIO = { alinhamento: 2, inovacao: 2, usabilidade: 1, mvp: 2, storytelling: 2, selectai: 2 };
const MAX_SCORE = Object.values(PESO_CRITERIO).reduce((a, b) => a + b, 0) * 5;

function calcTotal(scores) {
  return Object.entries(scores).reduce((sum, [k, v]) => sum + v * (PESO_CRITERIO[k] || 1), 0);
}

function ScoreDot({ value, max = 5 }) {
  const pct = value / max;
  const color = pct >= 0.8 ? P.green : pct >= 0.6 ? P.gold : pct >= 0.4 ? P.orange : P.coral;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: `${color}22`, border: `2px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color,
      }}>
        {value}
      </div>
    </div>
  );
}

function BarScore({ total, max }) {
  const pct = total / max;
  const color = pct >= 0.80 ? P.green : pct >= 0.65 ? P.gold : pct >= 0.50 ? P.orange : P.coral;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: `${P.white}15`, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, width: 28, textAlign: "right" }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

const DIFIC_COLOR = { Baixa: P.green, Média: P.gold, Alta: P.coral };

export default function App() {
  const [tab, setTab] = useState("matriz");
  const [topicFilter, setTopicFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState("score");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedSol, setSelectedSol] = useState(null);

  const topicos = ["Todos", ...new Set(SOLUCOES.map(s => s.topico))];

  const filtered = SOLUCOES
    .filter(s => topicFilter === "Todos" || s.topico === topicFilter)
    .map(s => ({ ...s, total: calcTotal(s.scores) }))
    .sort((a, b) => sortBy === "score" ? b.total - a.total : a.nome.localeCompare(b.nome));

  const ranked = [...SOLUCOES]
    .map(s => ({ ...s, total: calcTotal(s.scores) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: P.navy, minHeight: "100vh", color: P.white }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${P.navyMid} 0%, ${P.blue} 100%)`,
        borderBottom: `3px solid ${P.coral}`,
        padding: "24px 28px 20px",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: P.coral, fontFamily: "monospace", marginBottom: 4 }}>
          ORACLE ENTERPRISE CHALLENGE · ARQUIVO MESTRE
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Critérios × Soluções — Matriz de Decisão
        </h1>
        <p style={{ margin: "4px 0 0", color: P.muted, fontSize: 12 }}>
          {SOLUCOES.length} soluções avaliadas contra {CRITERIOS.length} critérios Oracle
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: P.navyMid, borderBottom: `1px solid ${P.blue}33`, padding: "0 28px" }}>
        {[
          { id: "matriz", label: "📊 Matriz Completa" },
          { id: "ranking", label: "🏆 Ranking" },
          { id: "criterios", label: "📋 Critérios Detalhados" },
          { id: "mvp", label: "🚀 Sugestão de MVP" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none",
            borderBottom: tab === t.id ? `3px solid ${P.coral}` : "3px solid transparent",
            color: tab === t.id ? P.white : P.muted,
            padding: "13px 18px", cursor: "pointer", fontSize: 12,
            fontWeight: tab === t.id ? 700 : 400, fontFamily: "Georgia, serif",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1200 }}>

        {/* ── MATRIZ ── */}
        {tab === "matriz" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {topicos.map(t => (
                  <button key={t} onClick={() => setTopicFilter(t)} style={{
                    background: topicFilter === t ? P.coral : `${P.white}10`,
                    border: `1px solid ${topicFilter === t ? P.coral : P.blue + "44"}`,
                    color: topicFilter === t ? P.white : P.muted,
                    padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                    fontSize: 11, fontFamily: "Georgia, serif",
                  }}>{t}</button>
                ))}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: P.muted }}>Ordenar:</span>
                {["score", "nome"].map(s => (
                  <button key={s} onClick={() => setSortBy(s)} style={{
                    background: sortBy === s ? `${P.medBlue}33` : "none",
                    border: `1px solid ${sortBy === s ? P.medBlue : P.blue + "33"}`,
                    color: sortBy === s ? P.lightBlue : P.muted,
                    padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "Georgia, serif",
                  }}>{s === "score" ? "Pontuação" : "Nome"}</button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              {[[P.green, "≥80% — Forte"], [P.gold, "65–79% — Bom"], [P.orange, "50–64% — Médio"], [P.coral, "<50% — Fraco"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 10, color: P.muted }}>{l}</span>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: P.navyMid }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: P.muted, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${P.blue}33`, minWidth: 200 }}>
                      SOLUÇÃO
                    </th>
                    {CRITERIOS.map(c => (
                      <th key={c.id} style={{ padding: "10px 10px", textAlign: "center", color: P.muted, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${P.blue}33`, minWidth: 90 }}>
                        {c.icon} {c.label.toUpperCase()}
                        <div style={{ fontSize: 8, color: `${P.muted}88`, marginTop: 2 }}>peso ×{PESO_CRITERIO[c.id]}</div>
                      </th>
                    ))}
                    <th style={{ padding: "10px 14px", textAlign: "center", color: P.coral, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${P.blue}33`, minWidth: 120 }}>
                      SCORE TOTAL
                    </th>
                    <th style={{ padding: "10px 10px", textAlign: "center", color: P.muted, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${P.blue}33`, minWidth: 70 }}>
                      DIFIC.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sol, i) => (
                    <tr
                      key={sol.id}
                      onClick={() => setSelectedSol(selectedSol?.id === sol.id ? null : sol)}
                      onMouseEnter={() => setHoveredRow(sol.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        background: selectedSol?.id === sol.id
                          ? `${sol.topicoColor}18`
                          : hoveredRow === sol.id ? `${P.white}05` : i % 2 === 0 ? P.navyMid : "transparent",
                        cursor: "pointer",
                        borderBottom: `1px solid ${P.blue}22`,
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ width: 3, height: 36, background: sol.topicoColor, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: P.white, fontSize: 12, lineHeight: 1.3 }}>{sol.nome}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                              <span style={{ background: `${sol.topicoColor}22`, color: sol.topicoColor, fontSize: 9, padding: "1px 6px", borderRadius: 3, letterSpacing: 1 }}>
                                {sol.topico.toUpperCase()}
                              </span>
                              <span style={{ background: `${P.white}10`, color: P.muted, fontSize: 9, padding: "1px 6px", borderRadius: 3 }}>
                                {sol.sprint}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedSol?.id === sol.id && (
                          <div style={{ marginTop: 8, padding: "8px 10px", background: `${P.navy}`, borderRadius: 6, fontSize: 11, color: P.muted, lineHeight: 1.5 }}>
                            {sol.desc}
                            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {sol.fontes.map(f => (
                                <span key={f} style={{ background: `${P.medBlue}22`, color: P.lightBlue, fontSize: 9, padding: "2px 7px", borderRadius: 3 }}>
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      {CRITERIOS.map(c => (
                        <td key={c.id} style={{ padding: "10px", textAlign: "center" }}>
                          <ScoreDot value={sol.scores[c.id]} />
                        </td>
                      ))}
                      <td style={{ padding: "10px 14px" }}>
                        <BarScore total={sol.total} max={MAX_SCORE} />
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <span style={{
                          background: `${DIFIC_COLOR[sol.dificuldade]}22`,
                          color: DIFIC_COLOR[sol.dificuldade],
                          fontSize: 9, padding: "3px 8px", borderRadius: 3, letterSpacing: 1,
                        }}>
                          {sol.dificuldade.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: P.muted, fontSize: 11, marginTop: 12, fontStyle: "italic" }}>
              💡 Clique em qualquer linha para ver a descrição e fontes de dados.
            </p>
          </div>
        )}

        {/* ── RANKING ── */}
        {tab === "ranking" && (
          <div>
            <p style={{ color: P.muted, fontSize: 12, marginBottom: 20 }}>
              Pontuação ponderada: Alinhamento ×2 · Inovação ×2 · Usabilidade ×1 · MVP ×2 · Storytelling ×2 · Select AI ×2 — máximo {MAX_SCORE} pts
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ranked.map((sol, i) => {
                const pct = sol.total / MAX_SCORE;
                const color = pct >= 0.80 ? P.green : pct >= 0.65 ? P.gold : pct >= 0.50 ? P.orange : P.coral;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
                return (
                  <div key={sol.id} style={{
                    background: i < 3 ? `${color}10` : P.navyMid,
                    border: `1px solid ${i < 3 ? color + "44" : P.blue + "33"}`,
                    borderLeft: `4px solid ${color}`,
                    borderRadius: 10, padding: "14px 18px",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <span style={{ fontSize: i < 3 ? 22 : 14, color: P.muted, width: 36, textAlign: "center", flexShrink: 0 }}>{medal}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: P.white }}>{sol.nome}</span>
                          <span style={{
                            marginLeft: 8, background: `${sol.topicoColor}22`, color: sol.topicoColor,
                            fontSize: 9, padding: "2px 7px", borderRadius: 3, letterSpacing: 1
                          }}>{sol.topico}</span>
                          <span style={{
                            marginLeft: 6, background: `${DIFIC_COLOR[sol.dificuldade]}22`,
                            color: DIFIC_COLOR[sol.dificuldade], fontSize: 9, padding: "2px 7px", borderRadius: 3,
                          }}>{sol.dificuldade}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>
                          {sol.total}/{MAX_SCORE} pts ({Math.round(pct * 100)}%)
                        </span>
                      </div>
                      <div style={{ height: 8, background: `${P.white}10`, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                        {CRITERIOS.map(c => (
                          <div key={c.id} style={{ fontSize: 10, color: P.muted }}>
                            {c.icon} <span style={{ color: sol.scores[c.id] >= 4 ? P.green : sol.scores[c.id] <= 2 ? P.coral : P.gold }}>
                              {sol.scores[c.id]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CRITÉRIOS ── */}
        {tab === "criterios" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {CRITERIOS.map(c => {
              const best = [...SOLUCOES].sort((a, b) => b.scores[c.id] - a.scores[c.id]).slice(0, 3);
              const worst = [...SOLUCOES].sort((a, b) => a.scores[c.id] - b.scores[c.id]).slice(0, 2);
              return (
                <div key={c.id} style={{
                  background: P.navyMid, border: `1px solid ${P.blue}33`,
                  borderRadius: 10, padding: 18,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 20 }}>{c.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, marginLeft: 8, color: P.white }}>{c.label}</span>
                    </div>
                    <span style={{
                      background: c.peso === "Alta" ? `${P.coral}22` : `${P.gold}22`,
                      color: c.peso === "Alta" ? P.coral : P.gold,
                      fontSize: 9, padding: "3px 8px", borderRadius: 3, letterSpacing: 1,
                    }}>PESO {c.peso.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: P.muted, marginBottom: 14, lineHeight: 1.5 }}>{c.desc}</p>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 6 }}>✅ MAIS FORTES</div>
                    {best.map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: P.muted }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>{s.nome}</span>
                        <span style={{ color: P.green, fontWeight: 700, flexShrink: 0 }}>★ {s.scores[c.id]}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: P.coral, marginBottom: 6 }}>⚠️ PONTOS FRACOS</div>
                    {worst.map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: P.muted }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>{s.nome}</span>
                        <span style={{ color: P.coral, fontWeight: 700, flexShrink: 0 }}>★ {s.scores[c.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MVP ── */}
        {tab === "mvp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Recomendação */}
            <div style={{ background: `${P.green}12`, border: `1px solid ${P.green}44`, borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 10 }}>🏆 CORE MVP RECOMENDADO</div>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: P.muted, lineHeight: 1.7 }}>
                Com base na pontuação ponderada, as três soluções que maximizam <strong style={{ color: P.white }}>impacto, viabilidade e fit Oracle</strong> são:
              </p>
              {[
                { rank: 1, id: "iph", cor: P.green, motivo: "Score máximo. Resolve diretamente o problema central (capacidade × demanda), é visual, construível com SIH+CNES, e o IPH como métrica própria impressiona a banca." },
                { rank: 2, id: "selectai_op", cor: P.gold, motivo: "É a 'cereja do bolo' do challenge. A Oracle quer ver isso funcionando. Perguntas em português gerando SQL é o diferencial técnico que nenhum grupo pode ignorar." },
                { rank: 3, id: "quadrante", cor: P.orange, motivo: "Quadrante demanda × capacidade é visualmente poderoso e fácil de explicar para banca não-técnica. Storytelling natural: 'veja onde está o perigo'." },
              ].map(r => {
                const s = SOLUCOES.find(x => x.id === r.id);
                return (
                  <div key={r.id} style={{
                    background: P.navyMid, border: `1px solid ${r.cor}44`,
                    borderLeft: `4px solid ${r.cor}`, borderRadius: 8,
                    padding: "14px 16px", marginBottom: 12,
                    display: "flex", gap: 14, alignItems: "flex-start"
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: r.cor, fontSize: 14, marginBottom: 4 }}>{s.nome}</div>
                      <p style={{ margin: 0, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>{r.motivo}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sprints */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                {
                  sprint: "Sprint 1 — até 16/06", color: P.medBlue,
                  label: "IDEAÇÃO + PROTÓTIPO (não precisa rodar)",
                  items: [
                    { nome: "Arquitetura com as 3 fontes DATASUS", obs: "SIH → Oracle Relacional | CNES → JSON API | CSV → External Table" },
                    { nome: "Protótipo do dashboard IPH", obs: "Wireframe com semáforo por região de saúde" },
                    { nome: "Protótipo do quadrante demanda × capacidade", obs: "Mockup do gráfico de dispersão" },
                    { nome: "Exemplos de perguntas Select AI", obs: "Mínimo 5 perguntas em português com SQL esperado" },
                    { nome: "Roadmap Sprint 2", obs: "O que vai ser implementado e quem faz o quê" },
                  ]
                },
                {
                  sprint: "Sprint 2 — até 01/09", color: P.coral,
                  label: "MVP FUNCIONANDO",
                  items: [
                    { nome: "Pipeline pysus → Oracle DB", obs: "Ingestão SIH + CNES + CSV Population" },
                    { nome: "IPH calculado e armazenado no Oracle", obs: "View ou tabela materializada por região × mês" },
                    { nome: "Dashboard Power BI ou APEX publicado", obs: "Link funcionando para a banca avaliar" },
                    { nome: "Select AI configurado com metadados", obs: "Mínimo 3 perguntas demonstradas ao vivo" },
                    { nome: "Quadrante demanda × capacidade", obs: "Interativo, com filtros por UF e período" },
                    { nome: "Vídeo pitch 5 min no YouTube", obs: "Demo hands on do sistema funcionando" },
                  ]
                }
              ].map(sp => (
                <div key={sp.sprint} style={{
                  background: P.navyMid, border: `1px solid ${sp.color}44`,
                  borderTop: `3px solid ${sp.color}`, borderRadius: 10, padding: 18,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: sp.color, marginBottom: 4 }}>{sp.sprint.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: P.muted, marginBottom: 14 }}>{sp.label}</div>
                  {sp.items.map((item, i) => (
                    <div key={i} style={{ marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${sp.color}33` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.white }}>{item.nome}</div>
                      <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{item.obs}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Notas finais */}
            <div style={{ background: `${P.gold}12`, border: `1px solid ${P.gold}33`, borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: P.gold, marginBottom: 10 }}>💬 O QUE DEIXAR DE FORA (por ora)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { item: "Clusterização K-means", motivo: "Alta dificuldade, baixo storytelling pra banca não-técnica. Fica como melhoria futura." },
                  { item: "Detecção de anomalias (2σ)", motivo: "Interessante mas MVP pesado. Pode virar feature extra se sobrar tempo." },
                  { item: "Razão ambulatorial/hospitalar", motivo: "Requer SIA + SIH com cruzamento complexo. Risco alto para Sprint 2." },
                  { item: "Alertas proativos Select AI", motivo: "Boa ideia mas a infra de triggers no Oracle é complexa. Menciona no roadmap como próxima fase." },
                ].map((d, i) => (
                  <div key={i} style={{ background: P.navy, padding: "10px 12px", borderRadius: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: P.white, marginBottom: 3 }}>✗ {d.item}</div>
                    <div style={{ fontSize: 11, color: P.muted }}>{d.motivo}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

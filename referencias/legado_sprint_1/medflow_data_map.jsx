import { useState } from "react";

const P = {
  navy: "#0D1B2A", navyMid: "#162032", blue: "#1A5276",
  med: "#2E86C1", light: "#85C1E9", coral: "#E8604C",
  white: "#F5F7FA", muted: "#8FA3B1", gold: "#D4AC0D",
  green: "#1ABC9C", purple: "#7D3C98", orange: "#E67E22",
  red: "#C0392B",
};

const Tag = ({ children, color = P.med }) => (
  <span style={{
    background: color + "22", color, fontSize: 10,
    padding: "2px 8px", borderRadius: 4, fontWeight: 600,
    letterSpacing: ".04em", display: "inline-block",
  }}>{children}</span>
);

const Code = ({ children }) => (
  <code style={{ fontFamily: "monospace", fontSize: 11, color: P.light, background: P.navy, padding: "1px 5px", borderRadius: 3 }}>
    {children}
  </code>
);

// ── SIH fields ──────────────────────────────────────────────────
const sihFields = [
  { name: "CNES",      type: "str(7)",  role: "join",    desc: "Código CNES do hospital — chave principal do join com CNES/LT", alert: null },
  { name: "MUNIC_MOV", type: "str(6)",  role: "geo",     desc: "Município onde o hospital está. 6 dígitos no SIH; IBGE usa 7 (prefixo 35 para SP)", alert: "6 vs 7 dígitos — cuidado no join com tabelas IBGE" },
  { name: "MUNIC_RES", type: "str(6)",  role: "geo",     desc: "Município de residência do paciente. Difere de MUNIC_MOV em casos de referenciamento", alert: null },
  { name: "ANO_CMPT",  type: "int",     role: "tempo",   desc: "Ano da competência (2022, 2023…). Série temporal.", alert: null },
  { name: "MES_CMPT",  type: "int",     role: "tempo",   desc: "Mês da competência (1–12). Usado para sazonalidade.", alert: null },
  { name: "DT_INTER",  type: "str",     role: "tempo",   desc: "Data de internação (AAAAMMDD). Pode diferir da competência em até 3 meses.", alert: "Converter com pd.to_datetime" },
  { name: "DT_SAIDA",  type: "str",     role: "tempo",   desc: "Data de alta. Use junto com DT_INTER para validar QT_DIARIAS.", alert: "Converter com pd.to_datetime" },
  { name: "QT_DIARIAS",type: "int",     role: "metrica", desc: "Permanência em dias. Core do IPR (benchmark de permanência).", alert: "Zeros existem — verificar na EDA" },
  { name: "DIAG_PRINC",type: "str(4)",  role: "clinico", desc: "CID-10 do diagnóstico principal. Agrupe por capítulo para análise macro.", alert: null },
  { name: "ESPEC",     type: "str(2)",  role: "join",    desc: "Especialidade do leito (01=cirúrgica, 02=obstétrica, 03=clínica, 05=psiquiatria, 07=pediatria). Join com TP_LEITO do CNES.", alert: null },
  { name: "CAR_INT",   type: "str(1)",  role: "clinico", desc: "Caráter: 1=eletivo, 2=urgência, 3=acidente. Separa planejado vs. emergencial.", alert: null },
  { name: "COMPLEX",   type: "str(2)",  role: "clinico", desc: "01=atenção básica, 02=média complexidade, 03=alta complexidade.", alert: null },
  { name: "VAL_TOT",   type: "float",   role: "metrica", desc: "Valor total pago pelo SUS. Core do CMI (custo médio por internação).", alert: "Zeros + VAL_TOT=0 com MORTE=1 = problema de qualidade" },
  { name: "MORTE",     type: "int(0/1)","role": "metrica", desc: "1 = óbito durante internação. Core da TMH.", alert: null },
  { name: "VAL_UTI",   type: "float",   role: "metrica", desc: "Valor de UTI. Proxy de intensidade assistencial.", alert: null },
];

const cnesFields = [
  { name: "CNES",      type: "str(7)",  role: "join",    desc: "Código do estabelecimento — chave do join com SIH.CNES", alert: null },
  { name: "CODUFMUN",  type: "str(6)",  role: "geo",     desc: "Município do hospital — equivale ao MUNIC_MOV do SIH (6 dígitos)", alert: null },
  { name: "REGSAUDE",  type: "str",     role: "geo",     desc: "Região de saúde — granularidade acima do município. Não existe no SIH; vem via CNES.", alert: "Join obrigatório para análise por região" },
  { name: "COMPETEN",  type: "str(6)",  role: "tempo",   desc: "Competência no formato AAAAMM. Precisa alinhar com ANO_CMPT+MES_CMPT do SIH.", alert: "Formato diferente do SIH — converter antes do join" },
  { name: "TP_LEITO",  type: "str(2)",  role: "join",    desc: "01=cirúrgico, 02=obstétrico, 03=clínico, 04=complementar (UTI), 05=reab, 06=psiquiatria", alert: "Desnormalizar: somar QT_SUS por CNES+COMPETEN antes do join" },
  { name: "QT_SUS",    type: "int",     role: "metrica", desc: "Leitos disponíveis para o SUS. Denominador do IPH.", alert: "% de registros com QT_SUS=0 — hospitais sem leitos SUS" },
  { name: "QT_EXIST",  type: "int",     role: "metrica", desc: "Total de leitos existentes (SUS + não-SUS). Contexto de capacidade total.", alert: null },
  { name: "NATUREZA",  type: "str(2)",  role: "classi",  desc: "01=federal, 02=estadual, 03=municipal, 04=filantrópica, 05=privada", alert: null },
  { name: "TPGESTAO",  type: "str",     role: "classi",  desc: "M=municipal, E=estadual, D=dupla, S=sem gestão SUS", alert: null },
  { name: "TP_UNID",   type: "str",     role: "classi",  desc: "05=hospital geral, 15=hospital especializado, 36=hospital dia", alert: null },
];

const joins = [
  {
    title: "Join principal: internações × leitos",
    left: "SIH.CNES",
    right: "CNES_LT.CNES",
    extra: "+ _ano + _mes (via COMPETEN normalizado)",
    type: "LEFT JOIN",
    purpose: "Calcula denominador do IPH: leitos_SUS por hospital × competência",
    alert: "Hospitais no SIH sem match no CNES = IPH fica NaN",
    color: P.coral,
  },
  {
    title: "Join geo: hospital → região de saúde",
    left: "CNES_LT.CNES + _ano + _mes",
    right: "CNES_LT.REGSAUDE",
    extra: "via mode() por hospital (mais frequente no período)",
    type: "GROUP BY",
    purpose: "Obtém REGSAUDE para cada hospital — não existe no SIH",
    alert: "REGSAUDE varia raramente, mas validar se algum hospital muda",
    color: P.green,
  },
  {
    title: "Join geo: hospital → município",
    left: "SIH.CNES + _ano + _mes",
    right: "SIH.MUNIC_MOV",
    extra: "via mode() do MUNIC_MOV mais frequente por CNES × competência",
    type: "GROUP BY",
    purpose: "Linka hospital a município para IPH por município",
    alert: "MUNIC_MOV no SIH tem 6 dígitos; IBGE usa 7 (ajustar em joins externos)",
    color: P.med,
  },
  {
    title: "Join de especialidade: SIH × CNES",
    left: "SIH.ESPEC",
    right: "CNES_LT.TP_LEITO",
    extra: "mapeamento manual: ESPEC 01→TP 01, 02→02, 03→03...",
    type: "LOOKUP",
    purpose: "Permite filtrar leitos pelo tipo correspondente à especialidade da internação",
    alert: "Mapeamento não é 1:1 perfeito — use para análise exploratória, não para cálculo do IPH geral",
    color: P.purple,
  },
];

const metrics = [
  {
    name: "IPH", full: "Índice de Pressão Hospitalar",
    formula: "internações_mês ÷ (QT_SUS × dias_do_mês)",
    fields: ["CNES (join)", "QT_SUS (CNES)", "_ano + _mes"],
    granularidade: "Hospital → Município → Região",
    output: "iph_por_hospital_mensal.parquet",
    alert: null,
  },
  {
    name: "IPR", full: "Índice de Permanência Relativa",
    formula: "média(QT_DIARIAS)_hospital ÷ média(QT_DIARIAS)_regional (mesmo DIAG_PRINC)",
    fields: ["QT_DIARIAS (SIH)", "DIAG_PRINC (SIH)", "MUNIC_MOV → REGSAUDE"],
    granularidade: "Hospital × CID-10",
    output: "iph_por_hospital_mensal.parquet (calcular separado)",
    alert: "QT_DIARIAS=0 distorce a média — filtrar antes",
  },
  {
    name: "IS", full: "Índice de Sazonalidade",
    formula: "internações_período_atual ÷ média_histórica_mesmo_período_3anos",
    fields: ["COUNT(AIH) por _mes (SIH)", "histórico 2022–2023 como baseline"],
    granularidade: "Hospital ou Município × Mês",
    output: "calcular sobre sih_sp_2022_2023_raw.parquet",
    alert: "2022–2023 é o baseline — IS do futuro usa 2022–2024 como referência",
  },
  {
    name: "TMH", full: "Taxa de Mortalidade Hospitalar",
    formula: "SUM(MORTE=1) ÷ COUNT(AIH) × 100  — por DIAG_PRINC",
    fields: ["MORTE (SIH)", "DIAG_PRINC (SIH)", "CNES"],
    granularidade: "Hospital × CID ou Hospital × ESPEC",
    output: "calcular sobre sih_sp_2022_2023_raw.parquet",
    alert: null,
  },
  {
    name: "CMI", full: "Custo Médio por Internação",
    formula: "SUM(VAL_TOT) ÷ COUNT(AIH)  — por ESPEC",
    fields: ["VAL_TOT (SIH)", "ESPEC (SIH)", "CNES"],
    granularidade: "Hospital × Especialidade × Mês",
    output: "calcular sobre sih_sp_2022_2023_raw.parquet",
    alert: "VAL_TOT=0 com MORTE=1 = dado de qualidade ruim, filtrar antes da média",
  },
];

const qualityChecks = [
  {
    id: "6a", desc: "MUNIC_MOV inválido",
    check: "munic_vals[~str.match(r'^\\d{6}$')]",
    expected: "< 1% dos registros",
    impact: "Join com tabelas IBGE (população) quebra sem padronização",
    fix: "Filtrar ou preencher com '000000'. Adicionar prefixo '0' ou '35' para join com IBGE 7 dígitos.",
    severity: "Médio",
  },
  {
    id: "6b", desc: "Hospitais SIH sem match no CNES LT",
    check: "set(SIH.CNES) - set(CNES_LT.CNES)",
    expected: "5–15% dos CNES únicos",
    impact: "IPH fica NaN para esses hospitais — excluídos da análise",
    fix: "Verificar com CNES ST (estabelecimentos) se é hospital real. Hospitais sem leitos SUS declarados ficam fora do IPH.",
    severity: "Alto",
  },
  {
    id: "6c", desc: "Meses com volume < 50% da média",
    check: "vol_mes[vol_mes < media_vol * 0.5]",
    expected: "0 meses (dado completo) ou meses recentes ainda em publicação",
    impact: "Distorce série histórica e o IS",
    fix: "Marcar período como 'publicação incompleta'. Excluir de cálculos de sazonalidade.",
    severity: "Alto",
  },
  {
    id: "6d", desc: "QT_DIARIAS = 0",
    check: "(pd.to_numeric(QT_DIARIAS) == 0).sum()",
    expected: "< 5% — cirurgias ambulatoriais podem ter 0 dias legítimos",
    impact: "Distorce IPR (permanência média). Média fica subestimada.",
    fix: "Filtrar QT_DIARIAS > 0 antes de calcular IPR. Registros com QT_DIARIAS=0 são internações-dia.",
    severity: "Médio",
  },
  {
    id: "6e", desc: "VAL_TOT = 0 com MORTE = 1",
    check: "(VAL_TOT==0) & (MORTE=='1')",
    expected: "< 2%",
    impact: "Distorce CMI (custo médio). Óbito não registrado financeiramente.",
    fix: "Excluir da média de CMI. Manter para cálculo de TMH (mortalidade não depende do valor).",
    severity: "Baixo",
  },
];

const roleColors = { join: P.coral, geo: P.green, tempo: P.gold, metrica: P.med, clinico: P.purple, classi: P.muted };

export default function App() {
  const [tab, setTab] = useState("schema");
  const [expandedJoin, setExpandedJoin] = useState(null);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [expandedQA, setExpandedQA] = useState(null);

  return (
    <div style={{ fontFamily: "Georgia, serif", background: P.navy, minHeight: "100vh", color: P.white }}>
      <div style={{
        background: `linear-gradient(135deg, ${P.navyMid} 0%, ${P.blue} 100%)`,
        borderBottom: `3px solid ${P.coral}`, padding: "20px 26px 16px",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: P.coral, fontFamily: "monospace", marginBottom: 3 }}>
          MEDFLOW · MAPA DE DADOS — DATASUS SP 2022–2023
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>SIH/RD × CNES/LT — Campos, Joins e Métricas</div>
        <div style={{ fontSize: 12, color: P.muted, marginTop: 3 }}>Derivado do notebook inspecao_datasus.ipynb</div>
      </div>

      <div style={{ display: "flex", background: P.navyMid, borderBottom: `1px solid ${P.blue}33`, padding: "0 26px" }}>
        {[
          { id: "schema", label: "📋 Schemas" },
          { id: "joins",  label: "🔗 Joins" },
          { id: "metrics", label: "📊 Métricas" },
          { id: "quality", label: "⚠️ Qualidade" },
          { id: "issues",  label: "🔧 Problemas do Notebook" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none",
            borderBottom: tab === t.id ? `3px solid ${P.coral}` : "3px solid transparent",
            color: tab === t.id ? P.white : P.muted,
            padding: "11px 14px", cursor: "pointer", fontSize: 12,
            fontWeight: tab === t.id ? 700 : 400, fontFamily: "Georgia, serif",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "20px 26px", maxWidth: 1000 }}>

        {/* ── SCHEMAS ── */}
        {tab === "schema" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: "SIH/RD — AIH Reduzida", subtitle: "24 arquivos: RDSP2201.dbc → RDSP2312.dbc", color: P.coral, fields: sihFields },
              { title: "CNES/LT — Leitos", subtitle: "24 arquivos: LTSP2201.dbc → LTSP2312.dbc", color: P.med, fields: cnesFields },
            ].map(db => (
              <div key={db.title} style={{
                background: P.navyMid, border: `1px solid ${db.color}33`,
                borderTop: `3px solid ${db.color}`, borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${db.color}22` }}>
                  <div style={{ fontWeight: 700, color: db.color, fontSize: 13 }}>{db.title}</div>
                  <div style={{ fontSize: 11, color: P.muted, fontFamily: "monospace" }}>{db.subtitle}</div>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {db.fields.map(f => (
                    <div key={f.name} style={{
                      padding: "7px 16px", borderBottom: `1px solid ${P.navy}`,
                      display: "flex", gap: 8, alignItems: "flex-start",
                    }}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12, color: P.white, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 9, color: P.muted, fontFamily: "monospace" }}>{f.type}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Tag color={roleColors[f.role]}>{f.role.toUpperCase()}</Tag>
                        <div style={{ fontSize: 11, color: P.muted, marginTop: 3, lineHeight: 1.4 }}>{f.desc}</div>
                        {f.alert && (
                          <div style={{ fontSize: 10, color: P.gold, marginTop: 3 }}>⚠ {f.alert}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Role legend */}
            <div style={{
              gridColumn: "1/-1", background: P.navyMid,
              border: `1px solid ${P.blue}33`, borderRadius: 8,
              padding: "10px 16px", display: "flex", gap: 12, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 11, color: P.muted, marginRight: 4 }}>Legenda:</span>
              {Object.entries(roleColors).map(([r, c]) => (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 11, color: P.muted }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── JOINS ── */}
        {tab === "joins" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
              O REGSAUDE não existe no SIH — precisa sempre vir via CNES. O MUNIC_MOV do SIH usa 6 dígitos enquanto o IBGE usa 7.
              Ambos são problemas que o notebook já trata.
            </div>
            {joins.map((j, i) => (
              <div key={i} onClick={() => setExpandedJoin(expandedJoin === i ? null : i)} style={{
                background: P.navyMid, border: `1px solid ${j.color}33`,
                borderLeft: `4px solid ${j.color}`, borderRadius: 10,
                padding: "14px 18px", marginBottom: 10, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: j.color, marginBottom: 6 }}>{j.title}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <code style={{ fontFamily: "monospace", fontSize: 11, color: P.light }}>{j.left}</code>
                      <span style={{ color: P.muted, fontSize: 12 }}>→</span>
                      <code style={{ fontFamily: "monospace", fontSize: 11, color: P.light }}>{j.right}</code>
                      <Tag color={j.color}>{j.type}</Tag>
                    </div>
                  </div>
                  <span style={{ color: P.muted }}>{expandedJoin === i ? "▲" : "▼"}</span>
                </div>
                {expandedJoin === i && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${j.color}22` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 6 }}>PROPÓSITO</div>
                        <div style={{ fontSize: 12, color: P.muted }}>{j.purpose}</div>
                        <div style={{ fontSize: 11, color: P.muted, marginTop: 6, fontFamily: "monospace", color: P.light }}>{j.extra}</div>
                      </div>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.gold, marginBottom: 6 }}>ATENÇÃO</div>
                        <div style={{ fontSize: 12, color: P.muted }}>{j.alert}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Visual flow */}
            <div style={{ background: P.navyMid, border: `1px solid ${P.blue}33`, borderRadius: 10, padding: 16, marginTop: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: P.med, marginBottom: 12 }}>FLUXO COMPLETO DE DADOS</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {[
                  { label: "SIH/RD", sub: "internações", color: P.coral },
                  { label: "→ JOIN CNES" },
                  { label: "CNES/LT", sub: "leitos + REGSAUDE", color: P.med },
                  { label: "→ AGG" },
                  { label: "IPH_HOSP", sub: "por hospital × mês", color: P.green },
                  { label: "→ AGG" },
                  { label: "IPH_MUN", sub: "por município", color: P.green },
                  { label: "→ AGG" },
                  { label: "IPH_REG", sub: "por região", color: P.green },
                ].map((n, i) => n.color ? (
                  <div key={i} style={{
                    background: `${n.color}22`, border: `1px solid ${n.color}44`,
                    borderRadius: 8, padding: "8px 12px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: n.color }}>{n.label}</div>
                    {n.sub && <div style={{ fontSize: 10, color: P.muted }}>{n.sub}</div>}
                  </div>
                ) : (
                  <span key={i} style={{ color: P.muted, fontSize: 14 }}>{n.label}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── METRICS ── */}
        {tab === "metrics" && (
          <div>
            {metrics.map((m, i) => (
              <div key={i} onClick={() => setExpandedMetric(expandedMetric === i ? null : i)} style={{
                background: P.navyMid, border: `1px solid ${P.med}33`,
                borderLeft: `4px solid ${P.med}`, borderRadius: 10,
                padding: "14px 18px", marginBottom: 10, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: P.med }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: P.muted }}>{m.full}</span>
                    </div>
                    <code style={{ fontSize: 11, color: P.light, fontFamily: "monospace" }}>{m.formula}</code>
                  </div>
                  <span style={{ color: P.muted }}>{expandedMetric === i ? "▲" : "▼"}</span>
                </div>
                {expandedMetric === i && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${P.med}22` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.coral, marginBottom: 6 }}>CAMPOS NECESSÁRIOS</div>
                        {m.fields.map((f, fi) => (
                          <div key={fi} style={{ fontSize: 11, color: P.muted, marginBottom: 3, fontFamily: "monospace" }}>→ {f}</div>
                        ))}
                      </div>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 6 }}>GRANULARIDADE</div>
                        <div style={{ fontSize: 12, color: P.muted }}>{m.granularidade}</div>
                        <div style={{ fontSize: 11, color: P.muted, marginTop: 8, fontFamily: "monospace" }}>{m.output}</div>
                      </div>
                      <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: P.gold, marginBottom: 6 }}>ATENÇÃO</div>
                        <div style={{ fontSize: 12, color: P.muted }}>{m.alert || "—"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── QUALITY ── */}
        {tab === "quality" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
              5 checks de qualidade implementados no notebook (seção 6). Clique em cada um para ver a correção recomendada.
            </div>
            {qualityChecks.map((q, i) => {
              const sevColor = q.severity === "Alto" ? P.coral : q.severity === "Médio" ? P.gold : P.muted;
              return (
                <div key={i} onClick={() => setExpandedQA(expandedQA === i ? null : i)} style={{
                  background: P.navyMid, border: `1px solid ${sevColor}33`,
                  borderLeft: `4px solid ${sevColor}`, borderRadius: 10,
                  padding: "12px 18px", marginBottom: 10, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <code style={{ fontFamily: "monospace", fontSize: 11, color: sevColor }}>{q.id}</code>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.white }}>{q.desc}</span>
                      <Tag color={sevColor}>{q.severity}</Tag>
                    </div>
                    <span style={{ color: P.muted }}>{expandedQA === i ? "▲" : "▼"}</span>
                  </div>
                  {expandedQA === i && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${sevColor}22` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, color: P.med, marginBottom: 6 }}>CHECK</div>
                          <code style={{ fontSize: 10, color: P.light, fontFamily: "monospace", lineHeight: 1.5, display: "block" }}>{q.check}</code>
                          <div style={{ fontSize: 11, color: P.muted, marginTop: 6 }}>Esperado: {q.expected}</div>
                        </div>
                        <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, color: P.red, marginBottom: 6 }}>IMPACTO</div>
                          <div style={{ fontSize: 12, color: P.muted }}>{q.impact}</div>
                        </div>
                        <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 6 }}>CORREÇÃO</div>
                          <div style={{ fontSize: 12, color: P.muted }}>{q.fix}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ISSUES ── */}
        {tab === "issues" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
              O notebook foi gerado a partir do prompt de inspeção. Esses são os problemas potenciais para executar no Colab.
            </div>
            {[
              {
                title: "pyreaddbc não está no pip padrão",
                severity: "Alto",
                desc: "O notebook usa pyreaddbc (dbc2dbf + dbfread) que requer compilação C. Pode falhar no Colab se não tiver build tools.",
                fix: "Substituir por: pip install pysus que na v2.x já resolve DBC internamente. OU usar blast-dbf que é pure Python.",
                code: "# Alternativa mais segura no Colab:\nfrom pysus import sih\ndf = sih(state='SP', year=2022, month=1)",
              },
              {
                title: "FTP do DATASUS é instável",
                severity: "Alto",
                desc: "O download via urllib.request direto para FTP pode falhar por timeout ou bloqueio do Colab. O notebook tem fallback mas depende de sequência.",
                fix: "Usar pysus 2.x como primeira opção (usa FTP mas com retry interno). Adicionar time.sleep(1) entre downloads. Baixar em lotes pequenos.",
                code: "# pysus 2.x — mais robusto:\nfrom pysus import sih, cnes\ndf_sih = sih(state='SP', year=2022, month=1)\ndf_cnes = cnes(state='SP', year=2022, month=1)",
              },
              {
                title: "iph_hosp in dir() é frágil",
                severity: "Médio",
                desc: "O notebook usa 'iph_hosp' in dir() para checar se a variável foi criada. Se uma célula acima falhar silenciosamente, as células seguintes pulam sem avisar.",
                fix: "Substituir por verificação explícita de len(sih_frames) > 0 antes de cada bloco. Usar try/except com mensagem clara.",
                code: "# Verificação mais robusta:\nif sih_full is not None and not sih_full.empty:\n    # calcula iph_hosp\n    ...\nelse:\n    print('[ERRO] sih_full vazio — verificar download')",
              },
              {
                title: "include_groups deprecated no pandas >= 2.2",
                severity: "Médio",
                desc: "apply(lambda g: ..., include_groups=False) foi depreciado. No Colab com pandas 2.2+ vai gerar FutureWarning ou erro.",
                fix: "Antes do apply, fazer .drop(columns=groupby_keys) ou usar named aggregation.",
                code: "# Fix pandas >= 2.2:\niph_reg = (iph_hosp\n    .merge(reg_map, on=['CNES','_ano','_mes'], how='left')\n    .dropna(subset=[col_reg_cnes, 'leitos_sus'])\n    .groupby([col_reg_cnes, '_ano', '_mes'])\n    .apply(lambda g: np.average(\n        g['iph'].fillna(0),\n        weights=g['leitos_sus'].clip(lower=1)\n    ), include_groups=False)\n    .reset_index(name='iph_medio'))",
              },
              {
                title: "Memória ao consolidar 2 anos",
                severity: "Baixo",
                desc: "SIH SP 2022+2023 = ~3–4M linhas × ~50 colunas. No Colab Free (12GB RAM) é ok mas no limite. CNES LT é menor (~50k linhas/mês).",
                fix: "Manter apenas colunas necessárias no sih_full. Fazer sih.loc[:, cols_necessarias] antes de append.",
                code: "# Reduzir footprint:\ncols_sih = ['CNES','MUNIC_MOV','ANO_CMPT','MES_CMPT',\n            'QT_DIARIAS','DIAG_PRINC','ESPEC','CAR_INT',\n            'VAL_TOT','MORTE','_ano','_mes']\nsih_frames.append(df_s[cols_sih])",
              },
            ].map((issue, i) => {
              const sevColor = issue.severity === "Alto" ? P.coral : issue.severity === "Médio" ? P.gold : P.muted;
              return (
                <div key={i} style={{
                  background: P.navyMid, border: `1px solid ${sevColor}33`,
                  borderLeft: `4px solid ${sevColor}`, borderRadius: 10,
                  padding: "14px 18px", marginBottom: 12,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: P.white }}>{issue.title}</span>
                    <Tag color={sevColor}>{issue.severity}</Tag>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, letterSpacing: 2, color: P.red, marginBottom: 6 }}>PROBLEMA</div>
                      <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{issue.desc}</div>
                    </div>
                    <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, letterSpacing: 2, color: P.green, marginBottom: 6 }}>FIX</div>
                      <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{issue.fix}</div>
                    </div>
                  </div>
                  <div style={{ background: P.navy, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: P.med, marginBottom: 6 }}>CÓDIGO</div>
                    <pre style={{ fontFamily: "monospace", fontSize: 11, color: P.light, margin: 0, lineHeight: 1.6, overflowX: "auto" }}>
                      {issue.code}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"""Revalida o Select AI contra o produto final e grava a evidência datada.

Para cada uma das cinco perguntas da demonstração, executa o SQL de referência
validado, pede ao Select AI o SQL gerado (`showsql`) e a resposta narrada
(`narrate`), e grava tudo num documento datado.

Usa DBMS_CLOUD_AI.GENERATE em vez do atalho `select ai`, que depende do
translation profile do cliente. O resultado é o mesmo e roda por qualquer
driver.

    make oracle-ping && .venv/bin/python -m dotenv -f .env run -- \
        .venv/bin/python scripts/revalidar_select_ai.py
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "src" / "medflow" / "oracle"))

from carregar_gold import conectar  # noqa: E402

PERFIL = "MEDFLOW_GENAI"
SAIDA = RAIZ / "docs" / "qualidade" / "REVALIDACAO_SELECT_AI.md"

PERGUNTAS = [
    (
        "Onde a rede está sob mais pressão em 2026?",
        "quais as cinco regioes de saude com maior indice de pressao "
        "hospitalar medio em 2026",
        """select nm_regiao_saude,
       round(avg(pc_iph_estimado), 1) as pc_iph_medio_2026,
       sum(qt_internacao_nova)        as qt_internacao_nova
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_iph_medio_2026 desc
fetch  first 5 rows only""",
    ),
    (
        "Onde a mortalidade se concentra, com amostra confiável?",
        "quais sao as dez especialidades com maior taxa de mortalidade "
        "hospitalar media? Primeiro filtre st_amostra igual a suficiente, "
        "depois agrupe por especialidade e mantenha somente grupos com pelo "
        "menos 100 linhas hospital-mes",
        """select nm_especialidade,
       round(avg(pc_tmh), 2) as pc_tmh_medio,
       count(*)              as qt_hospital_mes
from   mart_indicador_hospital_especialidade_mensal
where  st_amostra = 'suficiente'
group  by nm_especialidade
having count(*) >= 100
order  by pc_tmh_medio desc
fetch  first 10 rows only""",
    ),
    (
        "Quais diagnósticos internam mais tempo que os pares?",
        "quais sao os dez diagnosticos com maior IPR medio, considerando "
        "somente combinacoes hospital-CID com amostra suficiente e pelo menos "
        "10 combinacoes por diagnostico",
        """select ds_cid,
       count(*)              as qt_hospital,
       round(avg(nr_ipr), 2) as nr_ipr_medio
from   mart_indicador_hospital_cid_periodo
where  st_amostra = 'suficiente'
group  by ds_cid
having count(*) >= 10
order  by nr_ipr_medio desc
fetch  first 10 rows only""",
    ),
    (
        "Quais regiões mais dependem de atendimento fora do território?",
        "quais regioes tiveram maior percentual medio de evasao intrastadual "
        "observada em 2026? Nao interprete como evasao para fora de Sao Paulo",
        """select nm_regiao_saude,
       round(avg(pc_evasao_intrastadual_observada), 2) as pc_evasao_observada,
       sum(qt_evasao_intrastadual_observada)           as qt_evasao_observada
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_evasao_observada desc
fetch  first 10 rows only""",
    ),
    (
        "Quais grupos ICSAP mais pressionam internações de residentes?",
        "quais foram os dez grupos ICSAP com mais internacoes de residentes "
        "em 2026",
        """select nm_grupo_icsap,
       sum(qt_internacao_icsap) as qt_internacao_icsap
from   mart_icsap_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_grupo_icsap
order  by qt_internacao_icsap desc
fetch  first 10 rows only""",
    ),
]

# Termos que a banca vai cobrar: o IPH é pressão estimada sobre capacidade
# declarada, nunca ocupação real de leito.
TERMOS_PROIBIDOS = (
    "ocupação real",
    "ocupacao real",
    "taxa de ocupação",
    "taxa de ocupacao",
    "leitos ocupados",
    "tempo real",
)


def tabela(cursor, sql: str) -> str:
    cursor.execute(sql)
    colunas = [d[0].lower() for d in cursor.description]
    linhas = cursor.fetchall()
    largura = [
        max(len(c), *(len(str(linha[i])) for linha in linhas)) if linhas else len(c)
        for i, c in enumerate(colunas)
    ]
    formatar = lambda vals: "| " + " | ".join(  # noqa: E731
        str(v).ljust(largura[i]) for i, v in enumerate(vals)
    ) + " |"
    separador = "|" + "|".join("-" * (w + 2) for w in largura) + "|"
    return "\n".join([formatar(colunas), separador, *(formatar(linha) for linha in linhas)])


def gerar(cursor, prompt: str, acao: str) -> str:
    saida = cursor.var(str)
    cursor.execute(
        """
        begin
          :saida := dbms_cloud_ai.generate(
              prompt       => :prompt,
              profile_name => :perfil,
              action       => :acao);
        end;
        """,
        saida=saida,
        prompt=prompt,
        perfil=PERFIL,
        acao=acao,
    )
    return (saida.getvalue() or "").strip()


def main() -> int:
    agora = datetime.now(UTC).astimezone()
    partes: list[str] = []
    alertas: list[str] = []

    with conectar() as conexao, conexao.cursor() as cursor:
        cursor.execute("select sys_context('userenv', 'db_name') from dual")
        banco = cursor.fetchone()[0]
        cursor.callproc("dbms_cloud_ai.set_profile", [PERFIL])
        cursor.execute("select dbms_cloud_ai.get_profile() from dual")
        perfil_ativo = cursor.fetchone()[0]

        partes.append(
            f"# Revalidação do Select AI contra o produto final\n\n"
            f"Executada em **{agora:%d/%m/%Y às %H:%M}** no banco `{banco}`, "
            f"perfil `{perfil_ativo}`.\n\n"
            "Cada pergunta traz primeiro o SQL de referência já validado e seu "
            "resultado no banco, depois o SQL que o Select AI gerou e a resposta "
            "narrada. A ordem é essa de propósito: nenhuma pergunta vai ao "
            "modelo antes de a resposta estar validada em SQL convencional.\n"
        )

        for i, (titulo, prompt, sql) in enumerate(PERGUNTAS, start=1):
            print(f"[{i}/{len(PERGUNTAS)}] {titulo}", flush=True)
            resultado = tabela(cursor, sql)
            gerado = gerar(cursor, prompt, "showsql")
            narrado = gerar(cursor, prompt, "narrate")

            encontrados = [t for t in TERMOS_PROIBIDOS if t in narrado.lower()]
            if encontrados:
                alertas.append(f"pergunta {i}: {', '.join(encontrados)}")

            partes.append(
                f"\n## {i}. {titulo}\n\n"
                f"**Pergunta ao Select AI**\n\n> {prompt}\n\n"
                f"**SQL de referência**\n\n```sql\n{sql}\n```\n\n"
                f"**Resultado no banco**\n\n```\n{resultado}\n```\n\n"
                f"**SQL gerado pelo Select AI (`showsql`)**\n\n"
                f"```sql\n{gerado}\n```\n\n"
                f"**Resposta narrada (`narrate`)**\n\n{narrado}\n"
            )

    partes.append(
        "\n## Verificação de terminologia\n\n"
        "As respostas narradas foram varridas atrás dos termos que a banca "
        "cobra: o IPH é pressão estimada sobre capacidade SUS declarada, nunca "
        "ocupação real de leito, e o dado é mensal, nunca tempo real.\n\n"
    )
    if alertas:
        partes.append(
            "**Termos proibidos encontrados** — corrigir o `COMMENT ON` da "
            "coluna correspondente e reexecutar:\n\n"
            + "\n".join(f"- {a}" for a in alertas)
            + "\n"
        )
    else:
        partes.append("Nenhum termo proibido encontrado nas cinco respostas.\n")

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text("".join(partes), encoding="utf-8")
    print(f"\nEvidência gravada em {SAIDA.relative_to(RAIZ)}")
    if alertas:
        print("ATENÇÃO: termos proibidos nas respostas narradas.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

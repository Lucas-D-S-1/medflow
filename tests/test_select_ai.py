"""O guarda de leitura e a varredura de terminologia do roteiro de Select AI.

Estes dois controles são o que separa a evidência de uma captura de tela: o
primeiro decide se o SQL do modelo pode tocar o banco, o segundo decide se a
narrativa passou. Ambos rodam sem Oracle.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

from medflow.select_ai.executar import (
    SqlRecusado,
    conferir_lideres_narrados,
    guardar,
    varrer_termos,
)

RAIZ = Path(__file__).resolve().parent.parent


def test_prompt_governado_documenta_o_glossario_das_visoes():
    pacote = (RAIZ / "db" / "apex" / "02_pacote_select_ai.sql").read_text(
        encoding="utf-8"
    )

    for conceito in (
        "Glossario territorial",
        "RRAS significa Rede Regional de Atencao a Saude",
        "Glossario analitico",
        "IPH e pressao estimada",
        "TMH e mortalidade hospitalar observada",
        "IPR compara",
        "CMI e valor medio aprovado",
        "TMH = obitos / internacoes novas x 100",
        "IS = internacoes novas de 2026 / media do mesmo mes em 2024 e 2025",
        "perguntas definicionais",
        "evasao e deslocamento",
        "intrastadual observado",
        "ICSAP e sinal territorial",
    ):
        assert conceito in pacote


def test_ranking_governado_limita_resultado_e_trata_falha_da_narrativa():
    pacote = (RAIZ / "db" / "apex" / "02_pacote_select_ai.sql").read_text(
        encoding="utf-8"
    )

    for garantia in (
        "function eh_ranking_analitico",
        "function ranking_tem_ordem_e_limite",
        "function eh_comparacao_mensal",
        "function comparacao_mensal_segura",
        "function eh_comparacao_iph_governada",
        "function sql_comparacao_iph_governada",
        "function narrativa_comparacao_iph_governada",
        "l_ranking := eh_ranking_analitico(l_pergunta)",
        "l_comparacao_mensal := eh_comparacao_mensal(l_pergunta)",
        "l_comparacao_iph_governada := eh_comparacao_iph_governada",
        "l_ranking and not ranking_tem_ordem_e_limite(l_sql)",
        "l_comparacao_mensal and not comparacao_mensal_segura(l_sql)",
        "FETCH FIRST 5 ROWS ONLY",
        "externo entre 1 e 5 linhas",
        "Consulta auditada:",
        "Narrativa indisponivel",
        "temporariamente indisponivel",
    ):
        assert garantia in pacote


def test_comparacao_mensal_nao_faz_aritmetica_direta_em_aaaamm():
    pacote = (RAIZ / "db" / "apex" / "02_pacote_select_ai.sql").read_text(
        encoding="utf-8"
    )

    assert "TO_CHAR(ADD_MONTHS(TO_DATE(competencia_atual" in pacote
    assert "Nunca subtraia N diretamente" in pacote
    assert "adote tres competencias antes" in pacote
    assert "nao use LAG" in pacote


def test_comparacao_iph_governada_deriva_datas_e_limita_sem_consumir_ia():
    pacote = (RAIZ / "db" / "apex" / "02_pacote_select_ai.sql").read_text(
        encoding="utf-8"
    )

    atalho = pacote.index("if l_comparacao_iph_governada then")
    consumo = pacote.index("consumir_cota;", atalho)
    alternativa = pacote.index("else", atalho)

    assert atalho < alternativa < consumo
    assert "max(cd_competencia)" in pacote
    assert "a.pc_iph_estimado - b.pc_iph_estimado" in pacote
    assert "order by variacao desc nulls last, regiao" in pacote
    assert "fetch first 5 rows only" in pacote


class TestGuardaDeLeitura:
    @pytest.mark.parametrize(
        "sql",
        [
            "select 1 from dual",
            "  SELECT nm_regiao_saude FROM mart_indicador_regiao_mensal  ",
            "with t as (select 1 x from dual) select x from t",
            "select 1 from dual;",
            "```sql\nselect 1 from dual\n```",
        ],
    )
    def test_aceita_consulta_de_leitura(self, sql):
        assert guardar(sql).lower().startswith(("select", "with"))

    @pytest.mark.parametrize(
        "sql",
        [
            "delete from mart_indicador_regiao_mensal",
            "update mart_indicador_regiao_mensal set pc_tmh = 0",
            "insert into dim_geografia_regiao values (1)",
            "drop table mart_icsap_regiao_mensal",
            "truncate table mart_indicador_hospital_mensal",
            "grant select on mart_indicador_regiao_mensal to public",
            "begin null; end;",
            "select 1 from dual; delete from dim_geografia_regiao",
            "",
            "   ",
        ],
    )
    def test_recusa_o_que_nao_e_leitura(self, sql):
        with pytest.raises(SqlRecusado):
            guardar(sql)

    def test_recusa_dml_escondida_depois_de_um_with(self):
        sql = "with t as (select 1 x from dual) select x from t; drop table t"
        with pytest.raises(SqlRecusado):
            guardar(sql)


class TestVarreduraDeTerminologia:
    def test_negar_o_termo_e_a_resposta_certa(self):
        # Uma boa recusa precisa nomear o que recusa. Se isto reprovar, o
        # roteiro passa a punir exatamente a resposta que se quer ouvir.
        narrado = (
            "Não há informações disponíveis. As bases não fornecem dados em "
            "tempo real sobre a ocupação de leitos."
        )
        assert varrer_termos(narrado) == ()

    def test_afirmar_o_termo_reprova(self):
        narrado = "A taxa de ocupação de leitos da região em 2026 foi de 78,46%."
        assert "taxa de ocupação" in varrer_termos(narrado)

    def test_ressalva_no_texto_absolve_a_mencao(self):
        narrado = (
            "O que se costuma chamar de taxa de ocupação aqui é o IPH: "
            "pressão estimada sobre capacidade declarada."
        )
        assert varrer_termos(narrado) == ()

    def test_tempo_real_afirmado_reprova(self):
        assert varrer_termos("Os dados são atualizados em tempo real.")

    def test_texto_vazio_nao_reprova(self):
        assert varrer_termos("", None) == ()


class TestOrdemDaNarrativa:
    ESPERADOS = [
        "JOSE BONIFACIO",
        "PONTAL DO PARANAPANEMA",
        "ALTA PAULISTA",
        "HORIZONTE VERDE",
        "VALE DAS CACHOEIRAS",
    ]

    def test_aprova_lideres_no_inicio_e_na_ordem(self):
        narrativa = (
            "José Bonifácio lidera, seguido por Pontal do Paranapanema e "
            "Alta Paulista. Depois aparece Horizonte Verde."
        )
        ok, detalhe = conferir_lideres_narrados(narrativa, self.ESPERADOS)

        assert ok
        assert "ordem correta" in detalhe

    def test_reprova_lideres_escondidos_em_lista_fora_de_ordem(self):
        narrativa = (
            "Horizonte Verde aparece primeiro. Depois: José Bonifácio, "
            "Pontal do Paranapanema e Alta Paulista."
        )
        ok, detalhe = conferir_lideres_narrados(narrativa, self.ESPERADOS)

        assert not ok
        assert "HORIZONTE VERDE" in detalhe

    def test_reprova_intruso_do_sql_gerado_antes_dos_lideres(self):
        narrativa = (
            "Mananciais lidera. Depois vêm José Bonifácio, Pontal do "
            "Paranapanema e Alta Paulista."
        )
        ok, detalhe = conferir_lideres_narrados(
            narrativa,
            self.ESPERADOS,
            candidatos=["MANANCIAIS"],
        )

        assert not ok
        assert "MANANCIAIS" in detalhe

    def test_reprova_quando_falta_um_lider(self):
        narrativa = "José Bonifácio lidera, seguido por Pontal do Paranapanema."
        ok, detalhe = conferir_lideres_narrados(narrativa, self.ESPERADOS)

        assert not ok
        assert "ALTA PAULISTA" in detalhe


class TestParidadeComOPlSql:
    """As duas implementações da mesma regra têm de concordar.

    O guarda de leitura e a varredura de terminologia existem duas vezes: em
    Python, para o roteiro de `make select-ai-revalidar`, e em PL/SQL, para a
    página APEX que chama `medflow_select_ai`. Regra duplicada é regra que
    diverge em silêncio, e a divergência aqui apareceria como o APEX aceitando
    o que o roteiro recusa, ou o contrário.

    Precisa de Oracle: pula, não falha, quando `.env` não está carregado.
    """

    CASOS_GUARDA = [
        ("select 1 from dual", True),
        ("with t as (select 1 x from dual) select x from t", True),
        ("  SELECT nm_regiao_saude FROM mart_indicador_regiao_mensal  ", True),
        ("select 1 from dual;", True),
        ("```sql\nselect 1 from dual\n```", True),
        ("delete from dim_geografia_regiao", False),
        ("update mart_indicador_regiao_mensal set pc_tmh = 0", False),
        ("insert into dim_geografia_regiao values (1)", False),
        ("drop table mart_icsap_regiao_mensal", False),
        ("truncate table mart_indicador_hospital_mensal", False),
        ("grant select on mart_indicador_regiao_mensal to public", False),
        ("begin null; end;", False),
        ("select 1 from dual; delete from dim_geografia_regiao", False),
    ]

    CASOS_VARREDURA = [
        ("Nao ha dados. As bases nao fornecem dado em tempo real.", False),
        ("A taxa de ocupacao da regiao em 2026 foi de 78,46%.", True),
        ("O que chamam de taxa de ocupacao aqui e o IPH, pressao estimada.", False),
        ("Os dados sao atualizados em tempo real.", True),
    ]

    @staticmethod
    @pytest.fixture(scope="class")
    def cursor():
        if not os.getenv("ORACLE_DSN", "").strip():
            pytest.skip("ORACLE_DSN ausente; rode via `dotenv -f .env run --`")

        # O módulo de conexão mora ao lado dos scripts Oracle, fora do pacote.
        sys.path.insert(0, str(RAIZ / "src" / "medflow" / "oracle"))
        try:
            from carregar_gold import conectar
        except ImportError as erro:
            pytest.skip(f"pacote Oracle indisponível: {erro}")

        try:
            conexao = conectar()
        except Exception as erro:  # noqa: BLE001
            pytest.skip(f"Oracle inalcançável: {erro}")

        with conexao, conexao.cursor() as cur:
            cur.execute(
                "select count(*) from user_objects "
                "where object_name = 'MEDFLOW_SELECT_AI'"
            )
            if not cur.fetchone()[0]:
                pytest.skip("pacote medflow_select_ai não instalado")
            yield cur

    @pytest.mark.parametrize("sql,aceita", CASOS_GUARDA)
    def test_guarda_concorda(self, cursor, sql, aceita):
        try:
            cursor.execute("select medflow_select_ai.guardar(:s) from dual", s=sql)
            cursor.fetchone()
            plsql_aceitou = True
        except Exception:  # noqa: BLE001 — a recusa é o resultado
            plsql_aceitou = False

        try:
            guardar(sql)
            python_aceitou = True
        except SqlRecusado:
            python_aceitou = False

        assert python_aceitou == aceita
        assert plsql_aceitou == aceita, (
            f"PL/SQL e Python divergiram em {sql!r}: "
            f"python={python_aceitou}, plsql={plsql_aceitou}"
        )

    @pytest.mark.parametrize("texto,reprova", CASOS_VARREDURA)
    def test_varredura_concorda(self, cursor, texto, reprova):
        cursor.execute(
            "select medflow_select_ai.termos_afirmados(to_clob(:t)) from dual", t=texto
        )
        plsql_reprovou = bool(cursor.fetchone()[0])
        python_reprovou = bool(varrer_termos(texto))

        assert python_reprovou == reprova
        assert plsql_reprovou == reprova, (
            f"PL/SQL e Python divergiram em {texto!r}: "
            f"python={python_reprovou}, plsql={plsql_reprovou}"
        )

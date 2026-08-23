"""O guarda de leitura e a varredura de terminologia do roteiro de Select AI.

Estes dois controles são o que separa a evidência de uma captura de tela: o
primeiro decide se o SQL do modelo pode tocar o banco, o segundo decide se a
narrativa passou. Ambos rodam sem Oracle.
"""

from __future__ import annotations

import pytest

from medflow.select_ai.executar import SqlRecusado, guardar, varrer_termos


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

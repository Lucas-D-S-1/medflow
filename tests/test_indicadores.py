"""Os indicadores nas bordas, onde eles quebram.

Nenhum destes testes toca em parquet. Cada um constrói o mínimo de dado que
exercita uma regra e afirma o resultado exato — é o nível que roda em
milissegundos na CI e diz *qual* fórmula quebrou, coisa que a reconciliação
contra a Gold não diz.

A borda que importa em quase todo indicador do MedFlow é o denominador: uma
região sem população, um hospital sem leito SUS declarado, um CID com um caso
só. Divisão por zero em Python devolve `inf` ou levanta; nas duas hipóteses o
número sai errado no produto. Por isso `_dividir` é o funil por onde passam
IPH, IPR, IS, TMH, CMI e permanência média, e por isso ele é o teste mais
detalhado do arquivo.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

from medflow.gold import (
    _aplicar_ipca,
    _calcular_paciente_dia,
    _dividir,
    _hospital_cid_periodo,
    _hospital_especialidade_mensal,
    _hospital_mensal,
)
from medflow.ipca import carregar_ipca
from medflow.silver.dominios import classificar_cid, normaliza_codigo


class TestDividir:
    """O funil de todos os indicadores."""

    def test_divide_normalmente(self):
        obtido = _dividir(pd.Series([10.0, 9.0]), pd.Series([4.0, 3.0]))
        assert obtido.tolist() == [2.5, 3.0]

    def test_denominador_zero_vira_nulo_e_nao_infinito(self):
        # `inf` num indicador é pior que nulo: propaga por média e soma sem
        # avisar, e o webapp o renderiza como se fosse medição.
        obtido = _dividir(pd.Series([7.0]), pd.Series([0.0]))
        assert obtido.isna().all()
        assert not np.isinf(obtido.to_numpy()).any()

    def test_zero_sobre_zero_tambem_e_nulo(self):
        assert _dividir(pd.Series([0.0]), pd.Series([0.0])).isna().all()

    def test_denominador_nulo_propaga_nulo(self):
        assert _dividir(pd.Series([7.0]), pd.Series([np.nan])).isna().all()

    def test_numerador_nulo_propaga_nulo(self):
        assert _dividir(pd.Series([np.nan]), pd.Series([2.0])).isna().all()

    def test_series_inteira_nao_faz_divisao_inteira(self):
        # qt_obito / qt_internacao_nova são int64; 1/8 tem de dar 0.125.
        obtido = _dividir(pd.Series([1], dtype="int64"), pd.Series([8], dtype="int64"))
        assert obtido.tolist() == [0.125]

    def test_preserva_o_indice_de_entrada(self):
        # `_hospital_mensal` chama isto em recortes com `.loc`; um índice
        # reiniciado alinharia o resultado na linha errada.
        indice = [10, 20, 30]
        obtido = _dividir(
            pd.Series([1.0, 2.0, 3.0], index=indice),
            pd.Series([2.0, 0.0, 4.0], index=indice),
        )
        assert obtido.index.tolist() == indice
        assert obtido.loc[10] == 0.5
        assert pd.isna(obtido.loc[20])

    def test_mistura_de_validos_e_zeros_na_mesma_serie(self):
        obtido = _dividir(
            pd.Series([10.0, 5.0, 8.0, 3.0]),
            pd.Series([2.0, 0.0, 4.0, 0.0]),
        )
        assert obtido.tolist()[0] == 5.0
        assert obtido.tolist()[2] == 2.0
        assert obtido.isna().tolist() == [False, True, False, True]

    def test_serie_vazia_nao_quebra(self):
        obtido = _dividir(pd.Series([], dtype="float64"), pd.Series([], dtype="float64"))
        assert len(obtido) == 0


class TestAplicarIPCA:
    """Valor real preserva o nominal auditável ao lado."""

    @staticmethod
    def _ipca(fatores: dict[str, float]) -> pd.DataFrame:
        return pd.DataFrame(
            {
                "cd_competencia": list(fatores),
                "nr_fator_correcao_ipca": list(fatores.values()),
            }
        )

    def test_real_e_nominal_vezes_fator_e_o_nominal_sobrevive(self):
        mart = pd.DataFrame(
            {
                "cd_competencia": ["202401", "202406"],
                "vl_aprovado_internacao_nova_soma": [1000.0, 2000.0],
                "qt_internacao_nova": [10, 20],
            }
        )
        obtido = _aplicar_ipca(mart, self._ipca({"202401": 1.10, "202406": 1.00}))
        assert obtido.vl_aprovado_internacao_nova_real_soma.tolist() == [1100.0, 2000.0]
        assert obtido.vl_aprovado_internacao_nova_soma.tolist() == [1000.0, 2000.0]
        assert obtido.vl_cmi_real.tolist() == [110.0, 100.0]

    def test_cmi_real_e_nulo_quando_o_hospital_nao_internou(self):
        # Existe: hospital-mês sem internação nova entra no mart com zeros.
        mart = pd.DataFrame(
            {
                "cd_competencia": ["202401"],
                "vl_aprovado_internacao_nova_soma": [0.0],
                "qt_internacao_nova": [0],
            }
        )
        obtido = _aplicar_ipca(mart, self._ipca({"202401": 1.10}))
        assert obtido.vl_cmi_real.isna().all()

    def test_competencia_sem_fator_falha_alto(self):
        # Silêncio aqui viraria valor real nulo espalhado pelo mart. A
        # asserção existe para que o pipeline pare, não para que ele estime.
        mart = pd.DataFrame(
            {
                "cd_competencia": ["202401", "202607"],
                "vl_aprovado_internacao_nova_soma": [1000.0, 1000.0],
                "qt_internacao_nova": [10, 10],
            }
        )
        with pytest.raises(AssertionError):
            _aplicar_ipca(mart, self._ipca({"202401": 1.10}))


class TestPacienteDia:
    """Pacientes-dia é a base do IPH; repartir mês a mês é a parte sutil."""

    @staticmethod
    def _internacoes(linhas: list[tuple[str, str, str]]) -> pd.DataFrame:
        return pd.DataFrame(
            {
                "cd_cnes": [linha[0] for linha in linhas],
                "dt_internacao": pd.to_datetime([linha[1] for linha in linhas]),
                "dt_saida": pd.to_datetime([linha[2] for linha in linhas]),
            }
        )

    def test_internacao_dentro_do_mes(self):
        obtido = _calcular_paciente_dia(
            self._internacoes([("111", "2024-03-05", "2024-03-12")])
        )
        assert obtido.qt_paciente_dia_estimado.tolist() == [7]
        assert obtido.cd_competencia.tolist() == ["202403"]

    def test_entrada_e_saida_no_mesmo_dia_conta_um(self):
        # Alta no mesmo dia é internação real e ocupa leito. Zero pacientes-dia
        # deflacionaria o IPH do hospital que mais gira leito.
        obtido = _calcular_paciente_dia(
            self._internacoes([("111", "2024-03-05", "2024-03-05")])
        )
        assert obtido.qt_paciente_dia_estimado.tolist() == [1]

    def test_internacao_que_cruza_o_mes_se_reparte(self):
        # 28/03 a 04/04 são 7 dias de permanência: 4 caem em março (28 a 31)
        # e 3 em abril. O dia da virada pertence a um mês só — contá-lo dos
        # dois lados inflaria o IPH de todo hospital com giro alto.
        obtido = _calcular_paciente_dia(
            self._internacoes([("111", "2024-03-28", "2024-04-04")])
        ).sort_values("cd_competencia")
        assert obtido.cd_competencia.tolist() == ["202403", "202404"]
        assert obtido.qt_paciente_dia_estimado.tolist() == [4, 3]

    def test_internacao_longa_atravessa_meses_intermediarios(self):
        # 2024 é bissexto: fevereiro entra inteiro, com 29.
        obtido = _calcular_paciente_dia(
            self._internacoes([("111", "2024-01-30", "2024-04-02")])
        ).sort_values("cd_competencia")
        assert obtido.cd_competencia.tolist() == ["202401", "202402", "202403", "202404"]
        assert obtido.qt_paciente_dia_estimado.tolist() == [2, 29, 31, 1]

    @pytest.mark.parametrize(
        ("entrada", "saida"),
        [
            ("2024-03-05", "2024-03-12"),
            ("2024-03-28", "2024-04-04"),
            ("2024-01-30", "2024-04-02"),
            ("2024-02-28", "2024-03-01"),
            ("2025-12-20", "2026-01-15"),
        ],
    )
    def test_a_reparticao_conserva_a_permanencia_total(self, entrada, saida):
        """A invariante da função: repartir não pode criar nem sumir com dia.

        É o que garante que a soma de pacientes-dia da Gold continue igual à
        permanência observada na Silver, em qualquer recorte.
        """
        obtido = _calcular_paciente_dia(self._internacoes([("111", entrada, saida)]))
        esperado = (pd.Timestamp(saida) - pd.Timestamp(entrada)).days
        assert obtido.qt_paciente_dia_estimado.sum() == esperado

    def test_soma_por_hospital_e_competencia(self):
        obtido = _calcular_paciente_dia(
            self._internacoes(
                [
                    ("111", "2024-03-01", "2024-03-04"),
                    ("111", "2024-03-10", "2024-03-13"),
                    ("222", "2024-03-01", "2024-03-02"),
                ]
            )
        ).sort_values("cd_cnes")
        assert obtido.cd_cnes.tolist() == ["111", "222"]
        assert obtido.qt_paciente_dia_estimado.tolist() == [6, 1]

    def test_saida_antes_da_entrada_falha_alto(self):
        with pytest.raises(AssertionError):
            _calcular_paciente_dia(
                self._internacoes([("111", "2024-03-10", "2024-03-01")])
            )


class TestCarregarIPCA:
    """A referência de preço é externa; falhar cedo vale mais que estimar."""

    @staticmethod
    def _escrever(tmp_path, observacoes: list[dict[str, str]]):
        caminho = tmp_path / "ipca.json"
        caminho.write_text(
            json.dumps([{"D3C": "Mês", "V": "Valor"}, *observacoes]), encoding="utf-8"
        )
        return caminho

    def test_calcula_fatores_contra_a_ultima_competencia(self, tmp_path):
        """A referência é a última competência do recorte: ela não se corrige."""
        caminho = self._escrever(
            tmp_path,
            [
                {"D3C": "202401", "V": "100,0"},
                {"D3C": "202402", "V": "110,0"},
            ],
        )
        obtido = carregar_ipca(caminho, pd.Series(["202401", "202402"]))
        assert obtido.cd_competencia_preco_referencia.unique().tolist() == ["202402"]
        assert obtido.nr_fator_correcao_ipca.tolist() == [1.10, 1.0]

    def test_aceita_virgula_decimal_do_sidra(self, tmp_path):
        caminho = self._escrever(tmp_path, [{"D3C": "202401", "V": "7014,25"}])
        obtido = carregar_ipca(caminho, pd.Series(["202401"]))
        assert obtido.nr_indice_ipca.tolist() == [7014.25]

    def test_competencia_ausente_falha_dizendo_qual(self, tmp_path):
        caminho = self._escrever(tmp_path, [{"D3C": "202401", "V": "100,0"}])
        with pytest.raises(RuntimeError, match="202402"):
            carregar_ipca(caminho, pd.Series(["202401", "202402"]))

    def test_arquivo_ausente_explica_o_que_rodar(self, tmp_path):
        with pytest.raises(RuntimeError, match="00_extracao_dados"):
            carregar_ipca(tmp_path / "nao_existe.json", pd.Series(["202401"]))

    def test_resposta_sem_observacao_falha(self, tmp_path):
        caminho = tmp_path / "ipca.json"
        caminho.write_text(json.dumps([{"D3C": "Mês", "V": "Valor"}]), encoding="utf-8")
        with pytest.raises(RuntimeError, match="não contém observações"):
            carregar_ipca(caminho, pd.Series(["202401"]))

    def test_esquema_inesperado_falha(self, tmp_path):
        caminho = tmp_path / "ipca.json"
        caminho.write_text(
            json.dumps([{"a": "b"}, {"outro": "campo"}]), encoding="utf-8"
        )
        with pytest.raises(RuntimeError, match="Esquema inesperado"):
            carregar_ipca(caminho, pd.Series(["202401"]))

    def test_competencia_repetida_fica_com_a_ultima(self, tmp_path):
        # O SIDRA republica revisões; a última publicada é a válida.
        caminho = self._escrever(
            tmp_path,
            [
                {"D3C": "202401", "V": "100,0"},
                {"D3C": "202401", "V": "101,0"},
            ],
        )
        obtido = carregar_ipca(caminho, pd.Series(["202401"]))
        assert obtido.nr_indice_ipca.tolist() == [101.0]

    def test_ignora_competencias_fora_do_recorte(self, tmp_path):
        caminho = self._escrever(
            tmp_path,
            [
                {"D3C": "202312", "V": "90,0"},
                {"D3C": "202401", "V": "100,0"},
            ],
        )
        obtido = carregar_ipca(caminho, pd.Series(["202401"]))
        assert obtido.cd_competencia.tolist() == ["202401"]


def _internacoes_cid(
    linhas: list[tuple[str, str, int, float]],
) -> pd.DataFrame:
    """Uma linha por internação, com hospital, CID, quantidade e permanência."""
    registros = []
    for cnes, cid, quantidade, permanencia in linhas:
        registros.extend(
            [
                {
                    "cd_cnes": cnes,
                    "cd_regiao_saude": "35073",
                    "nm_regiao_saude": "JUNDIAI",
                    "cd_macrorregiao_saude": "3527",
                    "nm_macrorregiao_saude": "MACRO",
                    "cd_cid_principal": cid,
                    "ds_cid": "descrição",
                    "cd_capitulo_cid": "IX",
                    "ds_capitulo_cid": "Aparelho circulatório",
                    "fl_internacao_nova": 1,
                    "qt_dia_permanencia": permanencia,
                }
            ]
            * quantidade
        )
    return pd.DataFrame(registros)


class TestElegibilidadeIPR:
    """O IPR compara um hospital com os vizinhos; sem vizinhos, não compara.

    Os três cortes — 20 internações no hospital, 50 no benchmark, 4 hospitais
    na região — são o que impede o índice de ser uma razão entre dois ruídos.
    Quando não passam, o número tem de ser nulo e o motivo tem de ficar
    escrito em `st_amostra`, não sumir.
    """

    @staticmethod
    def _ipr_de(mart: pd.DataFrame, cnes: str) -> pd.Series:
        return mart.loc[mart.cd_cnes.eq(cnes)].iloc[0]

    def test_amostra_suficiente_calcula_o_indice(self):
        # A internou 20 vezes com 10 dias; os 4 vizinhos, 60 vezes com 5.
        mart = _hospital_cid_periodo(
            _internacoes_cid(
                [
                    ("A", "I50", 20, 10.0),
                    ("B", "I50", 15, 5.0),
                    ("C", "I50", 15, 5.0),
                    ("D", "I50", 15, 5.0),
                    ("E", "I50", 15, 5.0),
                ]
            )
        )
        linha = self._ipr_de(mart, "A")
        assert linha.st_amostra == "suficiente"
        assert linha.nr_permanencia_media_hospital == 10.0
        assert linha.nr_permanencia_media_benchmark == 5.0
        assert linha.nr_ipr == 2.0

    def test_hospital_com_menos_de_vinte_internacoes_nao_tem_ipr(self):
        mart = _hospital_cid_periodo(
            _internacoes_cid(
                [
                    ("A", "I50", 19, 10.0),
                    ("B", "I50", 20, 5.0),
                    ("C", "I50", 20, 5.0),
                    ("D", "I50", 20, 5.0),
                    ("E", "I50", 20, 5.0),
                ]
            )
        )
        linha = self._ipr_de(mart, "A")
        assert linha.st_amostra == "amostra_insuficiente"
        assert pd.isna(linha.nr_ipr)

    def test_benchmark_com_menos_de_cinquenta_internacoes_nao_tem_ipr(self):
        mart = _hospital_cid_periodo(
            _internacoes_cid(
                [
                    ("A", "I50", 30, 10.0),
                    ("B", "I50", 12, 5.0),
                    ("C", "I50", 12, 5.0),
                    ("D", "I50", 12, 5.0),
                    ("E", "I50", 12, 5.0),
                ]
            )
        )
        assert self._ipr_de(mart, "A").st_amostra == "amostra_insuficiente"

    def test_regiao_com_poucos_hospitais_nao_tem_ipr(self):
        # Três hospitais no CID: o benchmark de A teria só dois, e comparar
        # um hospital com dois vizinhos não é referência regional.
        mart = _hospital_cid_periodo(
            _internacoes_cid(
                [
                    ("A", "I50", 30, 10.0),
                    ("B", "I50", 40, 5.0),
                    ("C", "I50", 40, 5.0),
                ]
            )
        )
        assert self._ipr_de(mart, "A").st_amostra == "amostra_insuficiente"

    def test_benchmark_com_permanencia_zero_e_declarado_a_parte(self):
        # Existe no dado real: internação de mesmo dia registrada com zero
        # dia de permanência. Dividir por isso daria infinito — o estado
        # `benchmark_zero` é o que separa "não dá para calcular" de
        # "não tem amostra".
        mart = _hospital_cid_periodo(
            _internacoes_cid(
                [
                    ("A", "I50", 30, 10.0),
                    ("B", "I50", 20, 0.0),
                    ("C", "I50", 20, 0.0),
                    ("D", "I50", 20, 0.0),
                    ("E", "I50", 20, 0.0),
                ]
            )
        )
        linha = self._ipr_de(mart, "A")
        assert linha.nr_permanencia_media_benchmark == 0.0
        assert linha.st_amostra == "benchmark_zero"
        assert pd.isna(linha.nr_ipr)

    def test_hospital_sozinho_no_cid_nao_vira_referencia_de_si_mesmo(self):
        mart = _hospital_cid_periodo(_internacoes_cid([("A", "I50", 100, 10.0)]))
        linha = self._ipr_de(mart, "A")
        assert linha.qt_internacao_benchmark == 0
        # Benchmark vazio dá média nula, não zero: são coisas diferentes.
        assert pd.isna(linha.nr_permanencia_media_benchmark)
        assert linha.st_amostra == "amostra_insuficiente"
        assert pd.isna(linha.nr_ipr)


class TestIPHSemLeitoDeclarado:
    """Hospital sem leito SUS no CNES não tem IPH — e isso não é zero."""

    @staticmethod
    def _mart(capacidade: float, paciente_dia_de: str = "2024-03-01"):
        novas = pd.DataFrame(
            {
                "cd_cnes": ["111"],
                "dt_internacao": pd.to_datetime([paciente_dia_de]),
                "dt_saida": pd.to_datetime(["2024-03-11"]),
                "nr_ano_competencia": [2024],
                "nr_mes_competencia": [3],
                "cd_competencia": ["202403"],
                "fl_internacao_nova": [1],
                "fl_obito_internacao_nova": [0],
                "qt_dia_permanencia": [10],
                "vl_total_aprovado_sus": [1000.0],
            }
        )
        leitos = pd.DataFrame(
            {
                "cd_cnes": ["111"],
                "nr_ano_competencia": [2024],
                "nr_mes_competencia": [3],
                "cd_competencia": ["202403"],
                "qt_capacidade_teorica_leito_dia": [capacidade],
            }
        )
        hospitais = pd.DataFrame(
            {
                "cd_cnes": ["111"],
                "nm_hospital_atual": ["HOSPITAL TESTE"],
                "cd_municipio_ibge_6": ["350000"],
                "cd_regiao_saude": ["35073"],
                "nm_regiao_saude": ["JUNDIAI"],
                "cd_macrorregiao_saude": ["3527"],
                "nm_macrorregiao_saude": ["MACRO"],
                "cd_tipo_unidade": ["05"],
                "nm_tipo_unidade": ["HOSPITAL GERAL"],
            }
        )
        ipca = pd.DataFrame(
            {"cd_competencia": ["202403"], "nr_fator_correcao_ipca": [1.0]}
        )
        return _hospital_mensal(novas, leitos, hospitais, ipca).iloc[0]

    def test_capacidade_declarada_produz_iph(self):
        linha = self._mart(capacidade=100.0)
        assert linha.qt_paciente_dia_estimado == 10
        assert linha.nr_iph_estimado == 0.10
        assert linha.pc_iph_estimado == 10.0
        assert linha.st_capacidade == "disponivel"
        assert linha.fl_acima_capacidade_declarada == 0

    def test_sem_leito_declarado_o_iph_e_nulo_e_o_motivo_fica_escrito(self):
        # Zero leito com paciente internado é falha de cadastro no CNES, não
        # ocupação zero. Publicar 0% ali afirmaria o contrário do observado.
        linha = self._mart(capacidade=0.0)
        assert pd.isna(linha.nr_iph_estimado)
        assert pd.isna(linha.pc_iph_estimado)
        assert linha.st_capacidade == "sem_leito_sus_declarado"
        assert linha.fl_acima_capacidade_declarada == 0

    def test_ocupacao_acima_da_capacidade_e_sinalizada(self):
        linha = self._mart(capacidade=5.0)
        assert linha.nr_iph_estimado == 2.0
        assert linha.fl_acima_capacidade_declarada == 1

    def test_amostra_insuficiente_abaixo_de_trinta_internacoes(self):
        assert self._mart(capacidade=100.0).st_amostra == "amostra_insuficiente"


class TestNormalizaCodigo:
    def test_preenche_a_largura_declarada(self):
        assert normaliza_codigo("35", largura=6) == "000035"

    def test_sem_largura_devolve_o_digito_limpo(self):
        assert normaliza_codigo("  350000  ") == "350000"

    def test_ja_no_tamanho_nao_muda(self):
        assert normaliza_codigo("350000", largura=6) == "350000"

    @pytest.mark.parametrize("ruim", ["", "   ", "nan", "NaN", "None", "35A", "3.5", None])
    def test_nao_numerico_vira_nulo(self, ruim):
        assert normaliza_codigo(ruim, largura=6) is pd.NA

    def test_float_do_pandas_nao_vira_codigo_com_ponto(self):
        # Ler DBF sem dtype devolve 350000.0; zfill sobre isso produziria
        # "350000.0" e o de/para não casaria com nada.
        assert normaliza_codigo(350000.0, largura=6) is pd.NA


class TestClassificarCID:
    def test_classifica_pelos_tres_primeiros_caracteres(self):
        assert classificar_cid("I50.9")[0] == "IX"
        assert classificar_cid("A009")[0] == "I"

    def test_ignora_caixa(self):
        assert classificar_cid("i509") == classificar_cid("I509")

    def test_limites_do_capitulo_sao_inclusivos(self):
        assert classificar_cid("A00")[0] == "I"
        assert classificar_cid("B99")[0] == "I"
        assert classificar_cid("C00")[0] == "II"
        assert classificar_cid("D48")[0] == "II"
        assert classificar_cid("D50")[0] == "III"

    def test_codigo_fora_de_qualquer_capitulo_e_declarado(self):
        capitulo, descricao = classificar_cid("ZZZ")
        assert capitulo == "--"
        assert descricao == "Não classificado"

    def test_vazio_nao_quebra(self):
        assert classificar_cid("")[0] == "--"


def _internacoes_especialidade(
    linhas: list[tuple[str, str, int, float]],
) -> pd.DataFrame:
    """Uma linha por internação, com hospital, especialidade, quantidade e permanência."""
    registros = []
    for cnes, especialidade, quantidade, permanencia in linhas:
        registros.extend(
            [
                {
                    "cd_cnes": cnes,
                    "cd_especialidade_sih": especialidade,
                    "nm_especialidade": f"Especialidade {especialidade}",
                    "cd_regiao_saude": "35073",
                    "nm_regiao_saude": "JUNDIAI",
                    "cd_macrorregiao_saude": "3527",
                    "nm_macrorregiao_saude": "MACRO",
                    "nr_ano_competencia": 2026,
                    "nr_mes_competencia": 6,
                    "cd_competencia": "202606",
                    "fl_internacao_nova": 1,
                    "fl_obito_internacao_nova": 0,
                    "qt_dia_permanencia": permanencia,
                    "vl_total_aprovado_sus": 100.0,
                    "vl_aprovado_continuacao": 0.0,
                }
            ]
            * quantidade
        )
    return pd.DataFrame(registros)


def _mart_especialidade(novas: pd.DataFrame) -> pd.DataFrame:
    ipca = pd.DataFrame(
        [{"cd_competencia": "202606", "nr_fator_correcao_ipca": 1.0}]
    )
    return _hospital_especialidade_mensal(novas, novas, ipca)


class TestIndicePermanenciaEspecialidade:
    """O IPE é o IPR um degrau acima no grão, e herda a mesma disciplina.

    O IPR compara por CID e fica calculável em 6,9% dos pares hospital/CID.
    Por especialidade, com os mesmos cortes, a cobertura vai a 63,9%: o ganho
    veio do grão, não de afrouxar a exigência. Por isso os cortes 20/50/3
    continuam valendo, e o teste existe para que continuem.
    """

    @staticmethod
    def _linha(mart: pd.DataFrame, cnes: str) -> pd.Series:
        return mart.loc[mart.cd_cnes.eq(cnes)].iloc[0]

    def test_amostra_suficiente_calcula_o_indice(self):
        # A internou 20 vezes com 10 dias; os quatro vizinhos, 60 com 5.
        mart = _mart_especialidade(
            _internacoes_especialidade(
                [
                    ("A", "01", 20, 10.0),
                    ("B", "01", 15, 5.0),
                    ("C", "01", 15, 5.0),
                    ("D", "01", 15, 5.0),
                    ("E", "01", 15, 5.0),
                ]
            )
        )
        linha = self._linha(mart, "A")
        assert linha.st_amostra_ipe == "suficiente"
        assert linha.nr_permanencia_media == 10.0
        assert linha.nr_permanencia_media_benchmark_especialidade == 5.0
        assert linha.nr_ipe == 2.0

    def test_hospital_sai_do_proprio_benchmark(self):
        # Se A entrasse no próprio benchmark, a referência subiria e o índice
        # cairia: comparar alguém consigo mesmo puxa a régua na direção dele.
        mart = _mart_especialidade(
            _internacoes_especialidade(
                [
                    ("A", "01", 100, 10.0),
                    ("B", "01", 20, 2.0),
                    ("C", "01", 20, 2.0),
                    ("D", "01", 20, 2.0),
                ]
            )
        )
        linha = self._linha(mart, "A")
        assert linha.qt_internacao_benchmark_especialidade == 60
        assert linha.nr_permanencia_media_benchmark_especialidade == 2.0
        assert linha.nr_ipe == 5.0

    def test_hospital_com_menos_de_vinte_internacoes_nao_tem_indice(self):
        mart = _mart_especialidade(
            _internacoes_especialidade(
                [
                    ("A", "01", 19, 10.0),
                    ("B", "01", 20, 5.0),
                    ("C", "01", 20, 5.0),
                    ("D", "01", 20, 5.0),
                    ("E", "01", 20, 5.0),
                ]
            )
        )
        linha = self._linha(mart, "A")
        assert linha.st_amostra_ipe == "amostra_insuficiente"
        assert pd.isna(linha.nr_ipe)

    def test_benchmark_com_menos_de_cinquenta_internacoes_nao_tem_indice(self):
        mart = _mart_especialidade(
            _internacoes_especialidade(
                [
                    ("A", "01", 30, 10.0),
                    ("B", "01", 12, 5.0),
                    ("C", "01", 12, 5.0),
                    ("D", "01", 12, 5.0),
                    ("E", "01", 12, 5.0),
                ]
            )
        )
        assert self._linha(mart, "A").st_amostra_ipe == "amostra_insuficiente"

    def test_poucos_hospitais_na_especialidade_nao_tem_indice(self):
        mart = _mart_especialidade(
            _internacoes_especialidade(
                [
                    ("A", "01", 30, 10.0),
                    ("B", "01", 40, 5.0),
                    ("C", "01", 40, 5.0),
                ]
            )
        )
        assert self._linha(mart, "A").st_amostra_ipe == "amostra_insuficiente"

    def test_benchmark_zerado_e_nomeado_em_vez_de_virar_divisao_por_zero(self):
        mart = _mart_especialidade(
            _internacoes_especialidade(
                [
                    ("A", "01", 30, 10.0),
                    ("B", "01", 20, 0.0),
                    ("C", "01", 20, 0.0),
                    ("D", "01", 20, 0.0),
                ]
            )
        )
        linha = self._linha(mart, "A")
        assert linha.st_amostra_ipe == "benchmark_zero"
        assert pd.isna(linha.nr_ipe)

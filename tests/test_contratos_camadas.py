"""Cada camada obedece ao seu contrato — e o validador percebe quando não.

Três coisas diferentes são verificadas aqui, e vale distinguir:

1. **Os contratos versionados estão sadios.** Roda em qualquer clone, sem
   `data/`: os três JSON existem, toda coluna tem descrição, Silver e Gold
   estão em `snake_case`. É o que a CI executa.
2. **O validador reprova o que deve reprovar.** Monta uma base sintética
   minúscula e quebra uma regra de cada vez. Um validador que só é exercitado
   no caminho feliz não prova nada — ele poderia estar retornando sem olhar.
3. **A base real passa.** Chama `validar()` sobre o repositório de verdade;
   pula quando `data/` não está materializada, porque são 11 GB e `data/` é
   gitignored.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from medflow.config import Config
from medflow.validar import _validar_contrato, validar

CAMADAS = ("bronze", "silver", "gold")


def _contrato(camada: str) -> dict:
    caminho = Config().base / "contracts" / "dados" / f"{camada}.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


def _tem_dados() -> bool:
    """Os parquets estão no disco desta máquina?

    O guard checava o `METADADOS.json`, que é o vizinho **versionado** dos
    parquets **gitignored**. Num runner limpo ele existe, o guard deixava
    passar, e a `TestBaseReal` quebrava no primeiro parquet ausente — a CI
    ficou vermelha assim, e vermelho permanente é o mesmo que não ter CI.
    Mesmo defeito que o `reancorar_fixtures.py` já tinha tido: um portão que
    nunca fecha não é portão.

    Quem decide é o dado que os testes leem, não um arquivo ao lado dele.
    """
    base = Config().base
    return all(
        (base / tabela["caminho"]).exists()
        for camada in CAMADAS
        for tabela in _contrato(camada)["tabelas"]
    )


precisa_de_dados = pytest.mark.skipif(
    not _tem_dados(), reason="camadas não materializadas nesta máquina (data/ é gitignored)"
)


class TestContratosVersionados:
    """Sem tocar em parquet: o que está no Git tem de estar coerente."""

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_contrato_existe_e_declara_a_propria_camada(self, camada):
        contrato = _contrato(camada)
        assert contrato["camada"] == camada
        assert contrato["tabelas"], f"{camada}: contrato sem tabela"

    def test_as_tres_camadas_estao_na_mesma_versao(self):
        # Contratos em versões diferentes significam que uma camada foi
        # republicada sozinha — exatamente o estado em que os números param
        # de fechar entre elas.
        versoes = {camada: _contrato(camada)["versao_contrato"] for camada in CAMADAS}
        assert len(set(versoes.values())) == 1, versoes

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_toda_coluna_tem_descricao(self, camada):
        sem_descricao = [
            f"{tabela['nome']}.{coluna['nome']}"
            for tabela in _contrato(camada)["tabelas"]
            for coluna in tabela["colunas"]
            if not coluna["descricao"].strip()
        ]
        assert not sem_descricao

    @pytest.mark.parametrize("camada", ("silver", "gold"))
    def test_silver_e_gold_em_snake_case(self, camada):
        fora_do_padrao = [
            f"{tabela['nome']}.{coluna['nome']}"
            for tabela in _contrato(camada)["tabelas"]
            for coluna in tabela["colunas"]
            if not coluna["nome"].islower() or " " in coluna["nome"]
        ]
        assert not fora_do_padrao

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_nenhuma_tabela_repete_nome_de_coluna(self, camada):
        for tabela in _contrato(camada)["tabelas"]:
            nomes = [coluna["nome"] for coluna in tabela["colunas"]]
            assert len(nomes) == len(set(nomes)), tabela["nome"]

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_nenhuma_tabela_repete_nome_ou_caminho(self, camada):
        tabelas = _contrato(camada)["tabelas"]
        nomes = [tabela["nome"] for tabela in tabelas]
        caminhos = [tabela["caminho"] for tabela in tabelas]
        assert len(nomes) == len(set(nomes))
        assert len(caminhos) == len(set(caminhos))

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_caminhos_ficam_dentro_de_data(self, camada):
        for tabela in _contrato(camada)["tabelas"]:
            caminho = tabela["caminho"]
            assert caminho.startswith("data/"), caminho
            assert ".." not in caminho, caminho

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_toda_tabela_declara_linhas_positivas(self, camada):
        for tabela in _contrato(camada)["tabelas"]:
            assert tabela["linhas"] > 0, tabela["nome"]

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_coluna_que_nao_aceita_nulo_declara_zero_nulo(self, camada):
        incoerentes = [
            f"{tabela['nome']}.{coluna['nome']}"
            for tabela in _contrato(camada)["tabelas"]
            for coluna in tabela["colunas"]
            if not coluna["aceita_nulo"] and coluna["nulos"] != 0
        ]
        assert not incoerentes


class TestValidadorDeContrato:
    """O validador reprovando cada violação, uma de cada vez."""

    @staticmethod
    def _montar(
        tmp_path: Path,
        camada: str = "gold",
        colunas: tuple[str, ...] = ("cd_cnes", "qt_internacao_nova"),
        colunas_no_contrato: tuple[str, ...] | None = None,
        linhas_declaradas: int | None = None,
        descricao: str = "Uma descrição honesta.",
    ) -> Path:
        """Escreve um parquet de duas linhas e o contrato que o descreve."""
        declaradas = colunas_no_contrato if colunas_no_contrato is not None else colunas
        destino = tmp_path / "data" / camada
        destino.mkdir(parents=True)
        tabela = pa.table({nome: ["a", "b"] for nome in colunas})
        pq.write_table(tabela, destino / "tabela.parquet")

        contratos = tmp_path / "contracts" / "dados"
        contratos.mkdir(parents=True)
        (contratos / f"{camada}.json").write_text(
            json.dumps(
                {
                    "camada": camada,
                    "versao_contrato": "0.5.0",
                    "tabelas": [
                        {
                            "nome": "tabela",
                            "caminho": f"data/{camada}/tabela.parquet",
                            "linhas": 2 if linhas_declaradas is None else linhas_declaradas,
                            "colunas": [
                                {"nome": nome, "descricao": descricao}
                                for nome in declaradas
                            ],
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        return tmp_path

    def test_contrato_coerente_passa_e_conta(self, tmp_path):
        base = self._montar(tmp_path)
        assert _validar_contrato(base, "gold") == (1, 2)

    def test_coluna_a_mais_no_parquet_reprova(self, tmp_path):
        base = self._montar(
            tmp_path,
            colunas=("cd_cnes", "qt_internacao_nova", "coluna_nao_documentada"),
            colunas_no_contrato=("cd_cnes", "qt_internacao_nova"),
        )
        with pytest.raises(AssertionError, match="esquema diverge"):
            _validar_contrato(base, "gold")

    def test_ordem_das_colunas_faz_parte_do_contrato(self, tmp_path):
        # A carga do Oracle e os clientes do webapp leem por posição em alguns
        # pontos; trocar a ordem é mudança de contrato, não cosmética.
        base = self._montar(
            tmp_path,
            colunas=("cd_cnes", "qt_internacao_nova"),
            colunas_no_contrato=("qt_internacao_nova", "cd_cnes"),
        )
        with pytest.raises(AssertionError, match="esquema diverge"):
            _validar_contrato(base, "gold")

    def test_contagem_de_linhas_divergente_reprova(self, tmp_path):
        base = self._montar(tmp_path, linhas_declaradas=99)
        with pytest.raises(AssertionError, match="linhas divergentes"):
            _validar_contrato(base, "gold")

    def test_descricao_vazia_reprova(self, tmp_path):
        base = self._montar(tmp_path, descricao="   ")
        with pytest.raises(AssertionError):
            _validar_contrato(base, "gold")

    def test_nome_fora_do_snake_case_reprova_na_gold(self, tmp_path):
        base = self._montar(tmp_path, colunas=("cd_cnes", "QT_Internacao"))
        with pytest.raises(AssertionError):
            _validar_contrato(base, "gold")

    def test_bronze_aceita_o_nome_da_fonte(self, tmp_path):
        # Bronze é ingestão fiel: `N_AIH` e `MUNIC_RES` são os nomes do
        # DATASUS e têm de sobreviver intactos até a Silver renomear.
        base = self._montar(tmp_path, camada="bronze", colunas=("N_AIH", "MUNIC_RES"))
        assert _validar_contrato(base, "bronze") == (1, 2)

    def test_arquivo_declarado_e_ausente_reprova(self, tmp_path):
        base = self._montar(tmp_path)
        (base / "data" / "gold" / "tabela.parquet").unlink()
        with pytest.raises(AssertionError):
            _validar_contrato(base, "gold")


@pytest.fixture(scope="module")
def resultado_da_validacao() -> dict[str, int | str]:
    """A validação integrada percorre 11 GB; roda uma vez por módulo.

    `publicar=False` de propósito: o teste mede, mas não reescreve o
    `VALIDACAO_TECNICA.md`. Publicar é papel do `make validar`, e um `pytest`
    que suja a árvore em toda execução ensina a ignorar o `git status`.
    """
    return validar(Config().base, publicar=False)


@precisa_de_dados
class TestBaseReal:
    """A validação integrada sobre as camadas materializadas."""

    def test_validar_passa_e_devolve_as_medidas_do_recorte(self, resultado_da_validacao):
        resultado = resultado_da_validacao
        assert resultado["competencias"] > 0
        assert resultado["internacoes_novas_reconciliadas"] > 0
        assert resultado["municipios"] == 645
        assert resultado["regioes_saude"] == 62
        assert resultado["macrorregioes_saude"] == 19

    def test_o_relatorio_publicado_reflete_o_que_foi_medido(self, resultado_da_validacao):
        """O defeito que isto existe para pegar: relatório com número fixo.

        Até a fatia 6 o `VALIDACAO_TECNICA.md` trazia os totais cravados como
        literal, e continuou afirmando 29 competências depois que a 5b avançou
        o recorte para 30. Um relatório desatualizado é pior que uma asserção
        quebrada: a asserção avisa, o relatório convence.
        """
        resultado = resultado_da_validacao
        relatorio = (Config().base / "VALIDACAO_TECNICA.md").read_text(encoding="utf-8")
        for chave in (
            "internacoes_novas_reconciliadas",
            "aih_reconciliadas",
            "icsap_reconciliadas",
            "evasao_intrastadual",
        ):
            esperado = f"{resultado[chave]:,}".replace(",", ".")
            assert esperado in relatorio, f"{chave}={esperado} não aparece no relatório"
        assert f"e {resultado['competencias']} competências" in relatorio

    @pytest.mark.parametrize("camada", CAMADAS)
    def test_o_contrato_descreve_o_parquet_que_esta_no_disco(self, camada):
        tabelas, colunas = _validar_contrato(Config().base, camada)
        assert tabelas > 0
        assert colunas > 0

    def test_nenhum_arquivo_parcial_residual(self):
        # `.parcial` é o nome que o pipeline dá ao arquivo em escrita. Um
        # sobrevivente significa execução interrompida no meio.
        assert not list((Config().base / "data").rglob("*.parcial"))

    def test_os_metadados_da_gold_fecham_com_o_manifesto_da_bronze(self):
        base = Config().base
        manifesto = json.loads(
            (base / "data" / "bronze" / "MANIFESTO.json").read_text(encoding="utf-8")
        )
        gold = json.loads(
            (base / "data" / "gold" / "qualidade" / "METADADOS.json").read_text(
                encoding="utf-8"
            )
        )
        assert gold["metricas"]["competencias"] == len(manifesto["recorte"]["competencias"])

    def test_a_serie_de_competencias_nao_tem_buraco(self):
        """Um mês faltando no meio distorce toda média mensal em silêncio."""
        base = Config().base
        manifesto = json.loads(
            (base / "data" / "bronze" / "MANIFESTO.json").read_text(encoding="utf-8")
        )
        competencias = sorted(manifesto["recorte"]["competencias"])
        periodos = pd.PeriodIndex(
            [f"{item[:4]}-{item[4:]}" for item in competencias], freq="M"
        )
        esperado = pd.period_range(periodos.min(), periodos.max(), freq="M")
        assert list(periodos) == list(esperado)

"""A reconciliação como teste, nos dois modos.

Parte deste arquivo não toca a rede: o que é extraído do SQL versionado pode e
deve ser verificado sempre, porque um erro ali invalidaria silenciosamente a
reconciliação inteira — um mapa de campos vazio compara zero campos e passa.
"""

from __future__ import annotations

import os

import pytest

from medflow.config import Config

from .cliente import ClienteORDS
from .fontes import arredondar_como_oracle, contratos_dos_handlers, escalas_da_gold
from .plano import ENDPOINTS, carregar_com_dimensoes, reconciliar_endpoint

MODO = os.getenv("MEDFLOW_RECONCILIACAO", "amostra").strip().lower()
RECORTES_NA_AMOSTRA = 2

BASE = Config().base


def _tem_gold() -> bool:
    return (BASE / "data" / "gold" / "marts").is_dir()


def _tem_ords() -> bool:
    return bool(os.getenv("ORDS_BASE_URL", "").strip())


precisa_da_gold = pytest.mark.skipif(
    not _tem_gold(), reason="Gold não materializada (data/ é gitignored)"
)
precisa_do_oracle = pytest.mark.skipif(
    not (_tem_gold() and _tem_ords()),
    reason="ORDS_BASE_URL ausente; rode via `dotenv -f .env run --`",
)


class TestExtracaoDoSQL:
    """Sem rede: o que sustenta a reconciliação foi lido corretamente."""

    def test_todo_endpoint_do_plano_existe_no_modulo_ords(self):
        contratos = contratos_dos_handlers(BASE)
        ausentes = [e.padrao for e in ENDPOINTS if e.padrao not in contratos]
        assert not ausentes, f"endpoints no plano que o módulo ORDS não define: {ausentes}"

    @pytest.mark.parametrize("endpoint", ENDPOINTS, ids=lambda e: e.padrao)
    def test_o_mapa_de_campos_nao_esta_vazio(self, endpoint):
        # Um regex que deixou de casar devolveria mapa vazio, e um mapa vazio
        # faz a reconciliação comparar nada e declarar sucesso.
        campos = contratos_dos_handlers(BASE)[endpoint.padrao].campos
        assert len(campos) >= 5, f"{endpoint.padrao}: só {len(campos)} campos extraídos"

    @pytest.mark.parametrize("endpoint", ENDPOINTS, ids=lambda e: e.padrao)
    def test_a_ordenacao_foi_extraida(self, endpoint):
        ordem = contratos_dos_handlers(BASE)[endpoint.padrao].ordem
        assert ordem, f"{endpoint.padrao}: nenhuma chave de ordenação"
        assert all(chave.coluna for chave in ordem)

    def test_a_regra_de_nulos_segue_o_padrao_do_oracle(self):
        # `pc_iph_estimado desc nulls last` é explícito no handler de regiões;
        # `cd_regiao_saude` é ascendente e, no Oracle, nulo vai por último.
        ordem = contratos_dos_handlers(BASE)["regioes/resumo"].ordem
        primeira, segunda = ordem[0], ordem[1]
        assert primeira.coluna == "pc_iph_estimado"
        assert primeira.descendente and primeira.nulos_no_fim
        assert not segunda.descendente and segunda.nulos_no_fim

    def test_o_teto_de_paginacao_de_cada_handler_foi_lido(self):
        # Pedir acima do teto devolve 404, não 400: sem este número a
        # varredura confundiria "pedi demais" com "endpoint não existe".
        contratos = contratos_dos_handlers(BASE)
        assert contratos["regioes/:id/serie"].limite_maximo == 120
        assert contratos["regioes/resumo"].limite_maximo == 200
        assert contratos["hospitais/:cnes/cids"].limite_maximo == 2000

    def test_as_escalas_saem_da_ddl(self):
        escalas = escalas_da_gold(BASE)
        cids = escalas["mart_indicador_hospital_cid_periodo"]
        assert cids["nr_ipr"] == 6
        assert cids["qt_internacao_nova"] == 0

    @pytest.mark.parametrize(
        ("valor", "casas", "esperado"),
        [
            (2.5, 0, 3.0),
            (1.1614755, 6, 1.161476),
            (0.0000005, 6, 0.000001),
            (None, 6, None),
        ],
    )
    def test_arredonda_meio_para_cima_como_o_oracle(self, valor, casas, esperado):
        assert arredondar_como_oracle(valor, casas) == esperado

    @precisa_da_gold
    @pytest.mark.parametrize("endpoint", ENDPOINTS, ids=lambda e: e.padrao)
    def test_todo_campo_do_handler_existe_no_mart(self, endpoint):
        """Se um handler devolve coluna que a Gold não tem, a view inventou."""
        contrato = contratos_dos_handlers(BASE)[endpoint.padrao]
        colunas = set(carregar_com_dimensoes(BASE, endpoint).columns)
        faltando = sorted(set(contrato.campos.values()) - colunas)
        assert not faltando, f"{endpoint.padrao}: {faltando}"


@pytest.fixture(scope="session")
def cliente() -> ClienteORDS:
    """Um cliente para a sessão inteira, para o freio ser aprendido uma vez.

    Um cliente por endpoint reiniciaria o espaçamento a cada teste e voltaria
    a apanhar do mesmo 429 oito vezes seguidas. O ritmo é do servidor, não do
    endpoint.
    """
    return ClienteORDS()


@precisa_do_oracle
class TestCoberturaDoMapa:
    """O mapa extraído tem de cobrir tudo que a API realmente devolve."""

    @pytest.mark.parametrize("endpoint", ENDPOINTS, ids=lambda e: e.padrao)
    def test_o_mapa_cobre_tudo_que_a_api_devolve(self, endpoint, cliente):
        """Um campo fora do mapa é um campo não reconciliado que parece estar.

        O extrator casa `'nome' value alias.coluna`. Handler que monta o valor
        — concatenação, `case`, `to_char` — escapa. Aconteceu com o
        `competence` das duas séries: a primeira varredura completa declarou
        8,3 milhões de comparações e nenhuma delas era esse campo. Este teste
        pergunta à própria API quais chaves ela devolve e exige que o mapa,
        somado aos derivados declarados, dê conta de todas.
        """
        contrato = contratos_dos_handlers(BASE)[endpoint.padrao]
        mart = carregar_com_dimensoes(BASE, endpoint)
        recorte = next(iter(endpoint.enumerar(mart)))
        pagina = cliente.pagina(recorte.caminho, recorte.parametros, 0, 1)
        if not pagina.itens:
            pytest.skip(f"{endpoint.padrao}: o primeiro recorte veio vazio")
        cobertos = set(contrato.campos) | set(endpoint.derivados)
        faltando = sorted(set(pagina.itens[0]) - cobertos)
        assert not faltando, (
            f"{endpoint.padrao} devolve campos que ninguém reconcilia: {faltando}"
        )


@precisa_do_oracle
class TestReconciliacao:
    """Contra o Oracle no ar."""

    @pytest.mark.parametrize("endpoint", ENDPOINTS, ids=lambda e: e.padrao)
    def test_a_api_devolve_a_gold(self, endpoint, cliente):
        limite = None if MODO == "completo" else RECORTES_NA_AMOSTRA
        antes = cliente.requisicoes, cliente.recuos
        recortes, comparacoes, divergencias = reconciliar_endpoint(
            endpoint, BASE, cliente, limite_de_recortes=limite
        )
        print(
            f"\n  {endpoint.padrao}: {recortes} recorte(s), "
            f"{comparacoes:,} comparações, "
            f"{cliente.requisicoes - antes[0]} requisições, "
            f"{cliente.recuos - antes[1]} recuo(s), "
            f"freio {cliente.freio_maximo * 1000:.0f}ms".replace(",", ".")
        )
        assert comparacoes > 0, f"{endpoint.padrao}: nada foi comparado"
        assert not divergencias, "\n".join(str(d) for d in divergencias[:20])

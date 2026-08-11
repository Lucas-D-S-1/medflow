"""O contrato de configuração do pipeline.

O que estes testes protegem é a promessa da fatia 5: trocar o recorte é
configuração, não edição de código. O padrão, porém, não é livre — ele tem de
ser o recorte que foi de fato entregue, senão um clone limpo regenera números
diferentes dos publicados. É o que `test_padrao_reproduz_o_recorte_entregue`
verifica contra o manifesto real da Bronze.
"""

from __future__ import annotations

import dataclasses
import json
import logging
from pathlib import Path

import pytest

from medflow.config import (
    PERIODO_FINAL_PADRAO,
    PERIODO_INICIAL_PADRAO,
    Config,
    _competencia,
    configurar_logging,
    obter_logger,
)


class TestCompetencia:
    def test_aceita_o_formato_documentado(self):
        assert _competencia("2026-06", "x") == (2026, 6)
        assert _competencia("  2024-01  ", "x") == (2024, 1)

    @pytest.mark.parametrize("ruim", ["202606", "2026/06", "junho", "26-06", ""])
    def test_rejeita_formato_invalido(self, ruim):
        with pytest.raises(ValueError, match="AAAA-MM"):
            _competencia(ruim, "x")

    @pytest.mark.parametrize("mes", ["00", "13", "99"])
    def test_rejeita_mes_fora_do_intervalo(self, mes):
        with pytest.raises(ValueError, match="mês fora"):
            _competencia(f"2026-{mes}", "x")


class TestConfig:
    def test_padroes_da_classe_saem_das_constantes(self):
        # Um fato, uma fonte. Antes da fatia 6 o recorte estava escrito em
        # quatro lugares e três deles ficaram para trás quando a 5b avançou
        # para junho.
        assert Config().periodo_final == _competencia(PERIODO_FINAL_PADRAO, "x")
        assert Config().periodo_inicial == _competencia(PERIODO_INICIAL_PADRAO, "x")
        assert Config().uf == "SP"

    def test_padrao_reproduz_o_recorte_entregue(self):
        """O padrão do código tem de bater com o manifesto que gerou a Gold.

        Divergir aqui significa que `make bronze silver gold` num clone limpo
        produz um recorte diferente do que está no Oracle e na apresentação —
        o defeito que esta asserção existe para tornar barulhento.
        """
        manifesto = Config().base / "data" / "bronze" / "MANIFESTO.json"
        if not manifesto.is_file():
            pytest.skip("Bronze não materializada nesta máquina (data/ é gitignored)")
        recorte = json.loads(manifesto.read_text(encoding="utf-8"))["recorte"]
        ultima = recorte["ultima_competencia_comum"]
        assert PERIODO_FINAL_PADRAO == f"{ultima[:4]}-{ultima[4:]}"
        primeira = recorte["competencias"][0]
        assert PERIODO_INICIAL_PADRAO == f"{primeira[:4]}-{primeira[4:]}"

    def test_ambiente_muda_o_recorte_sem_tocar_no_codigo(self, monkeypatch):
        monkeypatch.setenv("MEDFLOW_PERIODO_FINAL", "2026-07")
        monkeypatch.setenv("MEDFLOW_PERIODO_INICIAL", "2025-03")
        monkeypatch.setenv("MEDFLOW_UF", "RJ")
        config = Config.do_ambiente()
        assert config.periodo_inicial == (2025, 3)
        assert config.periodo_final == (2026, 7)
        assert config.uf == "RJ"

    def test_argumento_vence_a_variavel_de_ambiente(self, monkeypatch):
        monkeypatch.setenv("MEDFLOW_PERIODO_FINAL", "2026-06")
        assert Config.do_ambiente(periodo_final=(2025, 12)).periodo_final == (2025, 12)

    def test_recorte_invertido_falha_na_construcao(self):
        with pytest.raises(ValueError, match="recorte invertido"):
            Config(periodo_inicial=(2026, 5), periodo_final=(2024, 1))

    def test_base_do_ambiente_e_resolvida(self, monkeypatch, tmp_path):
        monkeypatch.setenv("MEDFLOW_BASE", str(tmp_path))
        config = Config.do_ambiente()
        assert config.base == tmp_path.resolve()
        assert config.dir_dados == tmp_path.resolve() / "data"
        assert config.dir_contratos == tmp_path.resolve() / "contracts" / "dados"

    def test_descricao_do_recorte_e_legivel(self):
        config = Config(periodo_inicial=(2024, 1), periodo_final=(2026, 5))
        assert config.descricao_recorte == "SP 2024-01 a 2026-05"

    def test_config_e_imutavel(self):
        with pytest.raises(dataclasses.FrozenInstanceError):
            Config().uf = "RJ"  # type: ignore[misc]


class TestLogging:
    def test_formato_texto_traz_etapa_e_competencia(self, capsys):
        configurar_logging("INFO", "texto")
        obter_logger("bronze.conversao").info(
            "convertido %s", "RDSP2405.dbf", extra={"competencia": "2024-05"}
        )
        erro = capsys.readouterr().err
        assert "bronze.conversao" in erro
        assert "2024-05" in erro
        assert "RDSP2405.dbf" in erro

    def test_formato_json_emite_uma_linha_por_evento(self, capsys):
        import json

        configurar_logging("INFO", "json")
        obter_logger("silver.fatos").warning("algo estranho")
        linha = capsys.readouterr().err.strip()
        evento = json.loads(linha)
        assert evento["nivel"] == "WARNING"
        assert evento["etapa"] == "silver.fatos"
        assert evento["mensagem"] == "algo estranho"

    def test_configurar_e_idempotente(self):
        for _ in range(3):
            configurar_logging("INFO", "texto")
        assert len(logging.getLogger("medflow").handlers) == 1

    def test_nivel_respeitado(self, capsys):
        configurar_logging("WARNING", "texto")
        logger = obter_logger("teste")
        logger.info("não deve aparecer")
        logger.warning("deve aparecer")
        erro = capsys.readouterr().err
        assert "não deve aparecer" not in erro
        assert "deve aparecer" in erro


def test_raiz_padrao_aponta_para_o_repositorio():
    from medflow.config import raiz_padrao

    raiz = raiz_padrao()
    assert (raiz / "pyproject.toml").is_file()
    assert (raiz / "src" / "medflow").is_dir()
    assert isinstance(raiz, Path)

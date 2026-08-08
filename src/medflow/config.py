"""Configuração do pipeline: recorte, caminhos e logging.

Tudo que antes estava fixo em célula de notebook ou constante de módulo passa
por aqui e aceita variável de ambiente. O objetivo é concreto: rodar outra
competência sem editar uma linha de código.

    MEDFLOW_PERIODO_FINAL=2026-06 medflow bronze

Variáveis reconhecidas, todas opcionais:

| Variável | Padrão | O que controla |
|---|---|---|
| `MEDFLOW_BASE` | raiz do repositório | onde ficam `data/` e `contracts/` |
| `MEDFLOW_UF` | `SP` | a unidade da Federação do recorte |
| `MEDFLOW_PERIODO_INICIAL` | `2024-01` | primeira competência |
| `MEDFLOW_PERIODO_FINAL` | `2026-05` | última competência aceita |
| `MEDFLOW_LOG_NIVEL` | `INFO` | verbosidade |
| `MEDFLOW_LOG_FORMATO` | `texto` | `texto` ou `json` |
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

PADRAO_COMPETENCIA = re.compile(r"^(\d{4})-(\d{2})$")

# Última competência do recorte validado. O SIH/RD e o CNES/LT já publicaram
# 2026-06, mas avançar o recorte não é mudança de código: invalida as
# reconciliações publicadas, a carga do Oracle, as fixtures do webapp e os
# números da apresentação. O padrão fica congelado até essa decisão ser
# tomada; ver PENDENCIAS.md, item 7b. Para incluir junho, basta
# MEDFLOW_PERIODO_FINAL=2026-06 — sem tocar no código.
PERIODO_FINAL_PADRAO = "2026-05"


def _competencia(texto: str, variavel: str) -> tuple[int, int]:
    encontrado = PADRAO_COMPETENCIA.match(texto.strip())
    if not encontrado:
        raise ValueError(
            f"{variavel} deve estar no formato AAAA-MM (recebido: {texto!r})"
        )
    ano, mes = int(encontrado.group(1)), int(encontrado.group(2))
    if not 1 <= mes <= 12:
        raise ValueError(f"{variavel}: mês fora de 1..12 (recebido: {texto!r})")
    return ano, mes


def raiz_padrao() -> Path:
    """A raiz do repositório, dois níveis acima de `src/medflow`."""
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Config:
    """Recorte e caminhos de uma execução."""

    base: Path = field(default_factory=raiz_padrao)
    uf: str = "SP"
    periodo_inicial: tuple[int, int] = (2024, 1)
    periodo_final: tuple[int, int] = (2026, 5)

    @classmethod
    def do_ambiente(cls, **sobreposicoes) -> Config:
        """Lê o ambiente; os argumentos nomeados vencem as variáveis."""
        base = sobreposicoes.pop("base", None) or Path(
            os.getenv("MEDFLOW_BASE", "") or raiz_padrao()
        )
        return cls(
            base=Path(base).expanduser().resolve(),
            uf=sobreposicoes.pop("uf", None) or os.getenv("MEDFLOW_UF", "SP"),
            periodo_inicial=sobreposicoes.pop("periodo_inicial", None)
            or _competencia(
                os.getenv("MEDFLOW_PERIODO_INICIAL", "2024-01"),
                "MEDFLOW_PERIODO_INICIAL",
            ),
            periodo_final=sobreposicoes.pop("periodo_final", None)
            or _competencia(
                os.getenv("MEDFLOW_PERIODO_FINAL", PERIODO_FINAL_PADRAO),
                "MEDFLOW_PERIODO_FINAL",
            ),
            **sobreposicoes,
        )

    def __post_init__(self) -> None:
        if self.periodo_inicial > self.periodo_final:
            raise ValueError(
                f"recorte invertido: {self.periodo_inicial} > {self.periodo_final}"
            )

    # ---------------------------------------------------------------- caminhos

    @property
    def dir_dados(self) -> Path:
        return self.base / "data"

    @property
    def dir_contratos(self) -> Path:
        return self.base / "contracts" / "dados"

    @property
    def descricao_recorte(self) -> str:
        (ai, mi), (af, mf) = self.periodo_inicial, self.periodo_final
        return f"{self.uf} {ai}-{mi:02d} a {af}-{mf:02d}"


# ----------------------------------------------------------------- logging


class _FormatadorJson(logging.Formatter):
    """Uma linha JSON por evento, para quando a saída vai para um coletor."""

    def format(self, registro: logging.LogRecord) -> str:
        evento = {
            "hora": datetime.fromtimestamp(registro.created, UTC).isoformat(),
            "nivel": registro.levelname,
            "etapa": getattr(registro, "etapa", registro.name.removeprefix("medflow.")),
            "mensagem": registro.getMessage(),
        }
        if competencia := getattr(registro, "competencia", None):
            evento["competencia"] = competencia
        if registro.exc_info:
            evento["excecao"] = self.formatException(registro.exc_info)
        return json.dumps(evento, ensure_ascii=False)


class _FormatadorTexto(logging.Formatter):
    """Legível por humano, com etapa e competência quando existirem."""

    def format(self, registro: logging.LogRecord) -> str:
        etapa = getattr(registro, "etapa", registro.name.removeprefix("medflow."))
        competencia = getattr(registro, "competencia", None)
        prefixo = f"{etapa}" + (f" {competencia}" if competencia else "")
        hora = datetime.fromtimestamp(registro.created).strftime("%H:%M:%S")
        return f"{hora} {registro.levelname:<7} {prefixo:<22} {registro.getMessage()}"


def configurar_logging(nivel: str | None = None, formato: str | None = None) -> None:
    """Configura o logger raiz do pacote. Idempotente."""
    nivel = (nivel or os.getenv("MEDFLOW_LOG_NIVEL", "INFO")).upper()
    formato = (formato or os.getenv("MEDFLOW_LOG_FORMATO", "texto")).lower()

    logger = logging.getLogger("medflow")
    logger.setLevel(nivel)
    logger.propagate = False
    for antigo in list(logger.handlers):
        logger.removeHandler(antigo)

    saida = logging.StreamHandler()
    saida.setFormatter(_FormatadorJson() if formato == "json" else _FormatadorTexto())
    logger.addHandler(saida)


class _AdaptadorEtapa(logging.LoggerAdapter):
    """LoggerAdapter que soma o `extra` da chamada em vez de descartá-lo.

    O padrão da biblioteca substitui `kwargs["extra"]` pelo `extra` do
    adaptador, o que faria a competência passada em cada chamada sumir — e é
    exatamente ela que precisa aparecer em cada linha.
    """

    def process(self, msg, kwargs):
        kwargs["extra"] = {**(self.extra or {}), **(kwargs.get("extra") or {})}
        return msg, kwargs


def obter_logger(etapa: str) -> logging.LoggerAdapter:
    """Logger de uma etapa do pipeline, por exemplo `bronze.conversao`."""
    return _AdaptadorEtapa(logging.getLogger(f"medflow.{etapa}"), {"etapa": etapa})

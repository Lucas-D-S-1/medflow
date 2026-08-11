"""O que a API promete, lido do SQL versionado em vez de recopiado aqui.

Três fatos moram no `db/` e são necessários para reconciliar: o mapa entre o
nome JSON de cada campo e a coluna da Gold, a ordenação que cada handler
declara, e a escala decimal com que o Oracle guarda cada número.

Nenhum dos três é redigitado neste pacote. São 150 campos; uma cópia em Python
divergiria do banco na primeira alteração de handler, e a reconciliação
passaria a comparar a API com uma expectativa velha — que é exatamente o
defeito que ela existe para achar.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

MODULO_ORDS = Path("db/ords/03_modulo_medflow_dev.sql")
DDL_GOLD = Path("db/schema/02_criar_tabelas_gold.sql")

_HANDLER = re.compile(r"p_pattern\s*=>\s*'([^']+)'", re.IGNORECASE)
_ORDEM = re.compile(
    r"row_number\(\)\s*over\s*\(\s*order by (.*?)\)\s*as nr_linha", re.S | re.IGNORECASE
)
_ITENS = re.compile(
    r"json_arrayagg\(\s*json_object\((.*?)null on null returning json", re.S | re.IGNORECASE
)
_CAMPO = re.compile(r"'(\w+)'\s+value\s+\w+\.(\w+)")
_LIMITE_MAXIMO = re.compile(r"limite_solicitado between \d+ and (\d+)", re.IGNORECASE)
_TABELA = re.compile(r"create table (\w+)\s*\((.*?)\n\);", re.S | re.IGNORECASE)
_COLUNA_NUMERICA = re.compile(
    r"^\s*(\w+)\s+number\s*\(\s*\d+\s*(?:,\s*(\d+)\s*)?\)", re.IGNORECASE
)


@dataclass(frozen=True)
class ChaveDeOrdem:
    coluna: str
    descendente: bool
    nulos_no_fim: bool


@dataclass(frozen=True)
class ContratoDoHandler:
    """O que um handler ORDS promete devolver, extraído do próprio handler."""

    padrao: str
    campos: dict[str, str]
    """nome JSON -> coluna da Gold."""
    ordem: tuple[ChaveDeOrdem, ...]
    limite_maximo: int
    """Teto do `limit` que o handler aceita; acima dele ele devolve 404.

    Cada handler tem o seu — 120 na série regional, 2000 nos grandes. Pedir
    mais não dá erro de validação: o `where p.parametros_validos = 1` não
    devolve linha e o ORDS responde 404, que a varredura leria como endpoint
    inexistente se o teto não estivesse aqui.
    """


def _chave_de_ordem(fragmento: str) -> ChaveDeOrdem:
    partes = fragmento.split()
    coluna = partes[0].split(".")[-1]
    resto = " ".join(partes[1:]).lower()
    descendente = "desc" in resto
    if "nulls last" in resto:
        nulos_no_fim = True
    elif "nulls first" in resto:
        nulos_no_fim = False
    else:
        # Padrão do Oracle: ASC põe nulo por último, DESC põe primeiro.
        nulos_no_fim = not descendente
    return ChaveDeOrdem(coluna=coluna, descendente=descendente, nulos_no_fim=nulos_no_fim)


@lru_cache(maxsize=8)
def contratos_dos_handlers(base: Path) -> dict[str, ContratoDoHandler]:
    """Lê o módulo ORDS e devolve o contrato de cada handler de coleção."""
    sql = (base / MODULO_ORDS).read_text(encoding="utf-8")
    contratos: dict[str, ContratoDoHandler] = {}
    for bloco in sql.split("ords.define_handler(")[1:]:
        padrao = _HANDLER.search(bloco)
        itens = _ITENS.search(bloco)
        ordem = _ORDEM.search(bloco)
        if not (padrao and itens and ordem):
            # `status` e `metodologia` devolvem um objeto só, não coleção
            # paginada: não há o que reconciliar posicionalmente.
            continue
        campos = dict(
            (nome, coluna) for nome, coluna in _CAMPO.findall(itens.group(1))
        )
        chaves = tuple(
            _chave_de_ordem(fragmento) for fragmento in ordem.group(1).split(",")
        )
        teto = _LIMITE_MAXIMO.search(bloco)
        contratos[padrao.group(1)] = ContratoDoHandler(
            padrao=padrao.group(1),
            campos=campos,
            ordem=chaves,
            limite_maximo=int(teto.group(1)) if teto else 100,
        )
    return contratos


@lru_cache(maxsize=8)
def escalas_da_gold(base: Path) -> dict[str, dict[str, int]]:
    """Casas decimais declaradas na DDL, por tabela e coluna.

    `number(12,6)` guarda seis casas: a API devolve o valor já arredondado
    pelo banco, e é contra esse valor que a Gold tem de ser comparada. Sem
    isto, toda linha divergiria no sétimo dígito e a reconciliação viraria
    ruído.
    """
    sql = (base / DDL_GOLD).read_text(encoding="utf-8")
    escalas: dict[str, dict[str, int]] = {}
    for tabela, corpo in _TABELA.findall(sql):
        colunas: dict[str, int] = {}
        for linha in corpo.splitlines():
            achado = _COLUNA_NUMERICA.match(linha)
            if achado:
                colunas[achado.group(1)] = int(achado.group(2) or 0)
        escalas[tabela.lower()] = colunas
    return escalas


def arredondar_como_oracle(valor, casas: int):
    """Arredonda meio-para-cima, como o Oracle, não meio-para-par como o IEEE.

    `round()` do Python usa banker's rounding: `round(2.5)` é 2. O Oracle
    devolve 3. Em seis casas decimais a diferença aparece raramente, mas
    aparece — e uma divergência dessas custa horas de investigação se o
    comparador estiver arredondando pela regra errada.
    """
    if valor is None:
        return None
    quantum = Decimal(1).scaleb(-casas)
    return float(Decimal(repr(float(valor))).quantize(quantum, rounding="ROUND_HALF_UP"))

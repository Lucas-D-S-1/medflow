"""Carrega a camada Gold do MedFlow no Autonomous AI Lakehouse.

Executa em ordem de dependência: dimensões de geografia primeiro, marts
depois. A carga é idempotente — cada tabela é esvaziada antes de receber os
dados, em ordem inversa das chaves estrangeiras.

Uso, a partir de `sprint_2_em_andamento/`:

    set -a; source oracle/.env; set +a
    ../../.venv/bin/python oracle/carregar_gold.py

Opções:
    --somente TABELA   carrega apenas uma tabela (repetível)
    --lote N           tamanho do lote de insert (padrão 10000)
    --conferir         não carrega; só compara contagens do banco com os Parquets
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import oracledb
import pandas as pd

# src/medflow/oracle/carregar_gold.py -> a raiz do repositório é três níveis acima
RAIZ = Path(__file__).resolve().parents[3]
GOLD = RAIZ / "data" / "gold"

VARIAVEIS_OBRIGATORIAS = (
    "ORACLE_USER",
    "ORACLE_PASSWORD",
    "ORACLE_DSN",
    "ORACLE_WALLET_DIR",
    "ORACLE_WALLET_PASSWORD",
)

# Ordem de insert. O esvaziamento usa a ordem inversa, para respeitar as FKs.
TABELAS: tuple[tuple[str, Path], ...] = (
    ("dim_geografia_regiao", GOLD / "geografia" / "dim_geografia_regiao.csv"),
    ("dim_geografia_municipio", GOLD / "geografia" / "dim_geografia_municipio.csv"),
    ("mart_indicador_hospital_mensal", GOLD / "marts" / "mart_indicador_hospital_mensal.parquet"),
    ("mart_indicador_hospital_especialidade_mensal", GOLD / "marts" / "mart_indicador_hospital_especialidade_mensal.parquet"),
    ("mart_indicador_hospital_cid_periodo", GOLD / "marts" / "mart_indicador_hospital_cid_periodo.parquet"),
    ("mart_indicador_regiao_mensal", GOLD / "marts" / "mart_indicador_regiao_mensal.parquet"),
    ("mart_indicador_regiao_periodo", GOLD / "marts" / "mart_indicador_regiao_periodo.parquet"),
    ("mart_fluxo_assistencial_regiao_mensal", GOLD / "marts" / "mart_fluxo_assistencial_regiao_mensal.parquet"),
    ("mart_icsap_regiao_mensal", GOLD / "marts" / "mart_icsap_regiao_mensal.parquet"),
)

# Colunas numéricas das dimensões, que vêm de CSV e chegam como texto.
NUMERICAS_CSV = {
    "qt_municipio",
    "qt_populacao_ibge_2022",
}


def variavel(nome: str) -> str:
    valor = os.getenv(nome, "").strip()
    if not valor:
        raise RuntimeError(f"Variável obrigatória ausente: {nome}")
    return valor


def conectar() -> oracledb.Connection:
    configuracao = {nome: variavel(nome) for nome in VARIAVEIS_OBRIGATORIAS}
    # A carga em lote se beneficia de paralelismo; o alias _medium existe no
    # workload Lakehouse. Se ORACLE_DSN_CARGA não estiver definido, usa o
    # mesmo alias do teste de conexão.
    dsn = os.getenv("ORACLE_DSN_CARGA", "").strip() or configuracao["ORACLE_DSN"]
    wallet_dir = Path(configuracao["ORACLE_WALLET_DIR"]).expanduser().resolve()

    if not (wallet_dir / "tnsnames.ora").is_file():
        raise RuntimeError(f"tnsnames.ora não encontrado em {wallet_dir}")

    return oracledb.connect(
        user=configuracao["ORACLE_USER"],
        password=configuracao["ORACLE_PASSWORD"],
        dsn=dsn,
        config_dir=str(wallet_dir),
        wallet_location=str(wallet_dir),
        wallet_password=configuracao["ORACLE_WALLET_PASSWORD"],
    )


def ler(caminho: Path) -> pd.DataFrame:
    if not caminho.is_file():
        raise RuntimeError(
            f"Arquivo da Gold não encontrado: {caminho}\n"
            "Gere a Gold rodando notebooks/02_analise_dados.ipynb antes da carga."
        )
    if caminho.suffix == ".csv":
        quadro = pd.read_csv(caminho, dtype=str, keep_default_na=False)
        for coluna in quadro.columns:
            if coluna in NUMERICAS_CSV:
                quadro[coluna] = pd.to_numeric(quadro[coluna])
        return quadro
    return pd.read_parquet(caminho)


def para_linhas(quadro: pd.DataFrame) -> list[tuple]:
    """Converte o DataFrame em tuplas, trocando NaN/NaT por None."""
    limpo = quadro.astype(object).where(pd.notna(quadro), None)
    return list(limpo.itertuples(index=False, name=None))


def contar(conexao: oracledb.Connection, tabela: str) -> int:
    with conexao.cursor() as cursor:
        cursor.execute(f"select count(*) from {tabela}")
        return int(cursor.fetchone()[0])


def esvaziar(conexao: oracledb.Connection) -> None:
    """Apaga o conteúdo na ordem inversa das dependências."""
    for tabela, _ in reversed(TABELAS):
        with conexao.cursor() as cursor:
            cursor.execute(f"delete from {tabela}")
    conexao.commit()


def carregar(conexao: oracledb.Connection, tabela: str, quadro: pd.DataFrame, lote: int) -> int:
    colunas = list(quadro.columns)
    marcadores = ", ".join(f":{indice}" for indice in range(1, len(colunas) + 1))
    comando = f"insert into {tabela} ({', '.join(colunas)}) values ({marcadores})"
    linhas = para_linhas(quadro)

    with conexao.cursor() as cursor:
        for inicio in range(0, len(linhas), lote):
            cursor.executemany(comando, linhas[inicio : inicio + lote])
    conexao.commit()
    return len(linhas)


def main() -> int:
    analisador = argparse.ArgumentParser(description=__doc__)
    analisador.add_argument("--somente", action="append", default=[], metavar="TABELA")
    analisador.add_argument("--lote", type=int, default=10_000)
    analisador.add_argument("--conferir", action="store_true")
    argumentos = analisador.parse_args()

    selecionadas = [
        (tabela, caminho)
        for tabela, caminho in TABELAS
        if not argumentos.somente or tabela in argumentos.somente
    ]
    if argumentos.somente and len(selecionadas) != len(argumentos.somente):
        conhecidas = ", ".join(tabela for tabela, _ in TABELAS)
        raise RuntimeError(f"Tabela desconhecida em --somente. Disponíveis: {conhecidas}")

    esperado = json.loads((GOLD / "qualidade" / "METADADOS.json").read_text(encoding="utf-8"))

    with conectar() as conexao:
        if argumentos.conferir:
            print(f"{'tabela':<48} {'banco':>9} {'arquivo':>9}  estado")
            divergencias = 0
            for tabela, caminho in selecionadas:
                no_banco = contar(conexao, tabela)
                no_arquivo = len(ler(caminho))
                estado = "ok" if no_banco == no_arquivo else "DIVERGENTE"
                divergencias += estado == "DIVERGENTE"
                print(f"{tabela:<48} {no_banco:>9} {no_arquivo:>9}  {estado}")
            return 1 if divergencias else 0

        if not argumentos.somente:
            print("Esvaziando as tabelas na ordem inversa das dependências...")
            esvaziar(conexao)

        total = 0
        for tabela, caminho in selecionadas:
            quadro = ler(caminho)
            if argumentos.somente:
                with conexao.cursor() as cursor:
                    cursor.execute(f"delete from {tabela}")
                conexao.commit()
            carregadas = carregar(conexao, tabela, quadro, argumentos.lote)
            contrato = esperado["tabelas"].get(tabela, {}).get("linhas")
            marca = ""
            if contrato is not None and contrato != carregadas:
                marca = f"  ATENCAO: contrato esperava {contrato}"
            print(f"{tabela:<48} {carregadas:>9} linhas{marca}")
            total += carregadas

        print(f"\nCarga concluída: {total} linhas em {len(selecionadas)} tabelas.")
        print("Rode sql/03_validar_carga.sql para a reconciliação dos indicadores.")

    return 0


if __name__ == "__main__":
    sys.exit(main())

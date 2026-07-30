"""Valida a conexão mTLS com o Autonomous AI Database do MedFlow."""

from __future__ import annotations

import os
from pathlib import Path

import oracledb


VARIAVEIS_OBRIGATORIAS = (
    "ORACLE_USER",
    "ORACLE_PASSWORD",
    "ORACLE_DSN",
    "ORACLE_WALLET_DIR",
    "ORACLE_WALLET_PASSWORD",
)


def variavel(nome: str) -> str:
    valor = os.getenv(nome, "").strip()
    if not valor:
        raise RuntimeError(f"Variável obrigatória ausente: {nome}")
    return valor


def main() -> None:
    configuracao = {nome: variavel(nome) for nome in VARIAVEIS_OBRIGATORIAS}
    wallet_dir = Path(configuracao["ORACLE_WALLET_DIR"]).expanduser().resolve()

    if not (wallet_dir / "tnsnames.ora").is_file():
        raise RuntimeError(f"tnsnames.ora não encontrado em {wallet_dir}")
    if not (wallet_dir / "ewallet.pem").is_file():
        raise RuntimeError(f"ewallet.pem não encontrado em {wallet_dir}")

    with oracledb.connect(
        user=configuracao["ORACLE_USER"],
        password=configuracao["ORACLE_PASSWORD"],
        dsn=configuracao["ORACLE_DSN"],
        config_dir=str(wallet_dir),
        wallet_location=str(wallet_dir),
        wallet_password=configuracao["ORACLE_WALLET_PASSWORD"],
    ) as conexao:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                select
                    sys_context('USERENV', 'DB_NAME') as banco,
                    sys_context('USERENV', 'CURRENT_SCHEMA') as esquema,
                    systimestamp as horario_banco
                from dual
                """
            )
            banco, esquema, horario_banco = cursor.fetchone()

    print(f"Conexão validada: banco={banco}, esquema={esquema}")
    print(f"Horário informado pelo banco: {horario_banco}")


if __name__ == "__main__":
    main()

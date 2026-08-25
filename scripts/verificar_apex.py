"""Confere, sem escrever, o que já está pronto para a demonstração APEX.

Usa a mesma conexão mTLS do restante do projeto e nunca imprime credenciais.
O workspace exige ADMIN para ser criado; quando o schema MEDFLOW não puder
consultar o catálogo do APEX, o diagnóstico diz isso sem tratar como falha.
"""

from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "src" / "medflow" / "oracle"))

from carregar_gold import conectar  # noqa: E402


def escalar(cursor, sql: str):
    cursor.execute(sql)
    return cursor.fetchone()[0]


def main() -> int:
    with conectar() as conexao, conexao.cursor() as cursor:
        cursor.execute(
            """
            select sys_context('userenv', 'current_schema'), systimestamp
            from dual
            """
        )
        esquema, horario = cursor.fetchone()

        versao_apex = escalar(cursor, "select version_no from apex_release")
        pacote = escalar(
            cursor,
            """
            select count(*)
            from user_objects
            where object_name = 'MEDFLOW_SELECT_AI'
              and object_type in ('PACKAGE', 'PACKAGE BODY')
              and status = 'VALID'
            """,
        )
        tabela = escalar(
            cursor,
            """
            select count(*)
            from user_tables
            where table_name = 'SELECT_AI_RESPOSTA'
            """,
        )
        respostas = escalar(cursor, "select count(*) from select_ai_resposta") if tabela else 0

        try:
            workspace = escalar(
                cursor,
                """
                select count(*)
                from apex_workspaces
                where workspace = 'MEDFLOW_DEMO'
                """,
            )
            workspace_texto = "criado" if workspace else "ainda não criado"
        except Exception:  # O catálogo pode ser visível apenas ao ADMIN.
            workspace_texto = "não verificável como MEDFLOW; conferir como ADMIN"

    print(f"Oracle: conectado como {esquema} em {horario}")
    print(f"APEX: versão {versao_apex}")
    print(f"Backend Select AI: {pacote}/2 objetos válidos")
    print(f"Rastro de respostas: tabela {'pronta' if tabela else 'ausente'} · {respostas} linhas")
    print(f"Workspace MEDFLOW_DEMO: {workspace_texto}")

    if pacote != 2 or not tabela:
        print("Diagnóstico: reinstale db/apex/02_pacote_select_ai.sql como MEDFLOW.")
        return 1
    print("Diagnóstico: backend pronto; o restante da montagem acontece no App Builder.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

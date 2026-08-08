"""Download incremental dos arquivos DBC no FTP do DATASUS.

O download é idempotente: só busca o que falta no cache local. A gravação
passa por um arquivo `.parcial` que só é promovido ao nome final quando a
transferência termina, para que uma queda de rede não deixe DBC truncado
passando por válido.
"""

from __future__ import annotations

from ftplib import FTP

from medflow.bronze.contexto import FTP_DIRS, FTP_HOST, GRUPOS, ContextoBronze


def baixar_grupo(contexto: ContextoBronze, grupo: str) -> int:
    """Baixa os DBC ausentes do grupo. Devolve quantos foram transferidos."""
    alvos = [contexto.nome(grupo, ano, mes) for ano, mes in contexto.competencias]
    faltantes = [nome for nome in alvos if not (contexto.dir_dbc / nome).exists()]
    if not faltantes:
        print(f"[{grupo}] {len(alvos)} arquivos no cache")
        return 0

    ftp = FTP(FTP_HOST, timeout=120)
    try:
        ftp.login()
        ftp.cwd(FTP_DIRS[grupo])
        remotos = contexto.listagens_remotas[grupo]
        for nome in faltantes:
            real = remotos.get(nome.upper())
            assert real, f"arquivo ausente no FTP: {nome}"
            destino = contexto.dir_dbc / nome
            parcial = destino.with_suffix(".dbc.parcial")
            with parcial.open("wb") as arquivo:
                ftp.retrbinary(f"RETR {real}", arquivo.write)
            parcial.rename(destino)
            print("baixado:", nome)
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()
    return len(faltantes)


def baixar(contexto: ContextoBronze) -> dict[str, int]:
    return {grupo: baixar_grupo(contexto, grupo) for grupo in GRUPOS}

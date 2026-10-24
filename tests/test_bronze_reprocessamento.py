"""Republicações não podem conservar o DBF anterior nem baixar referências."""
from pathlib import Path

import pytest

from medflow.bronze.contexto import ContextoBronze
from medflow.bronze.conversao import descomprimir
from medflow.bronze.referencias import carregar_cache


@pytest.mark.parametrize('sobrescrever, esperado', [(False, b'antigo'), (True, b'novo')])
def test_dbf_acompanha_republicacao(tmp_path, monkeypatch, sobrescrever, esperado):
    contexto = ContextoBronze(base=tmp_path, sobrescrever=sobrescrever)
    contexto.competencias = [(2026, 8)]
    contexto.criar_diretorios()
    for grupo in ('RD', 'LT'):
        contexto.caminho_dbc(grupo, 2026, 8).write_bytes(b'novo')
        contexto.caminho_dbf(grupo, 2026, 8).write_bytes(b'antigo')

    def converter(origem, destino):
        Path(destino).write_bytes(Path(origem).read_bytes())

    monkeypatch.setattr('medflow.bronze.conversao.datasus_dbc.decompress', converter)
    descomprimir(contexto)
    assert contexto.caminho_dbf('RD', 2026, 8).read_bytes() == esperado
    assert contexto.caminho_dbf('LT', 2026, 8).read_bytes() == esperado


def test_referencia_cache_incompleta_falha_sem_rede(tmp_path, monkeypatch):
    def proibido(*args, **kwargs):
        pytest.fail('Modo cache tentou HTTP')

    monkeypatch.setattr('urllib.request.urlopen', proibido)
    monkeypatch.setattr('subprocess.run', proibido)
    with pytest.raises(FileNotFoundError, match='Referência ausente no cache'):
        carregar_cache(ContextoBronze(base=tmp_path, sobrescrever=True))

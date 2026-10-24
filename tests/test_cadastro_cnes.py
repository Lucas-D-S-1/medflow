"""Não confundir gestão SUS com esfera ao usar ficha oficial alternativa."""
import pandas as pd
import pytest

from medflow.silver.dimensoes import validar_esfera_cadastro


def registro():
    return {
        'codigo_cnes': 8161402,
        'descricao_esfera_administrativa': None,
        'descricao_natureza_juridica_estabelecimento': '3999',
        'data_atualizacao': '2026-10-20',
        '_fonte_url': 'https://cnes2.datasus.gov.br/Mod_Conjunto.asp?VCo_Unidade=3509508161402',
        '_fonte_natureza_url': 'https://cnes2.datasus.gov.br/Mod_Bas_Caracterizacao.asp?VCo_Unidade=3509508161402',
    }


def test_ficha_oficial_preserva_esfera_ausente():
    quadro = pd.DataFrame([registro()])
    validar_esfera_cadastro(quadro)
    assert quadro.descricao_esfera_administrativa.isna().all()


@pytest.mark.parametrize('campo,valor', [
    ('_fonte_url', None),
    ('_fonte_url', 'https://exemplo.com/'),
    ('_fonte_natureza_url', 'https://cnes2.datasus.gov.br/Mod_Bas_Caracterizacao.asp?VCo_Unidade=3509508397430'),
    ('descricao_natureza_juridica_estabelecimento', '9999'),
    ('data_atualizacao', None),
])
def test_ausencia_sem_evidencia_completa_falha(campo, valor):
    item = registro()
    item[campo] = valor
    with pytest.raises(AssertionError):
        validar_esfera_cadastro(pd.DataFrame([item]))


def test_api_com_esfera_preserva_comportamento():
    validar_esfera_cadastro(pd.DataFrame([{'descricao_esfera_administrativa': 'MUNICIPAL'}]))

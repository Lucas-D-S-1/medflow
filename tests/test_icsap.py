"""Testes de regressão da lista oficial de ICSAP."""

import unittest

import pandas as pd

from pipeline.icsap import GRUPOS_ICSAP, classificar_icsap, dimensao_grupo_icsap


class TesteICSAP(unittest.TestCase):
    def test_lista_tem_dezenove_grupos_unicos(self) -> None:
        dimensao = dimensao_grupo_icsap()
        self.assertEqual(len(GRUPOS_ICSAP), 19)
        self.assertEqual(dimensao.cd_grupo_icsap.nunique(), 19)

    def test_classifica_codigos_com_e_sem_ponto(self) -> None:
        codigos = pd.Series(["I50.9", "J153", "N39.0", "P350", "A90", "S060"])
        obtido = classificar_icsap(codigos).tolist()
        self.assertEqual(obtido[:4], ["11", "06", "15", "19"])
        self.assertTrue(pd.isna(obtido[4]))
        self.assertTrue(pd.isna(obtido[5]))

    def test_limites_de_intervalos_nao_vazam(self) -> None:
        codigos = pd.Series(["A009", "A099", "A109", "E149", "E159", "I629", "I639", "I679", "I689"])
        obtido = classificar_icsap(codigos).tolist()
        self.assertEqual(obtido[0:2], ["02", "02"])
        self.assertTrue(pd.isna(obtido[2]))
        self.assertEqual(obtido[3], "13")
        self.assertTrue(pd.isna(obtido[4]))
        self.assertTrue(pd.isna(obtido[5]))
        self.assertEqual(obtido[6:8], ["12", "12"])
        self.assertTrue(pd.isna(obtido[8]))


if __name__ == "__main__":
    unittest.main()

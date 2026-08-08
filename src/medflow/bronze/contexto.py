"""Recorte, caminhos e descoberta remota da camada Bronze.

Concentra o que antes eram variáveis soltas na primeira célula de
`notebooks/00_extracao_dados.ipynb`. O comportamento é o mesmo: o recorte
solicitado é 2024-01 a 2026-12, e o recorte efetivo é a interseção entre as
competências publicadas no SIH/RD e no CNES/LT, que precisa ser contígua.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from ftplib import FTP
from pathlib import Path

from medflow.config import Config, obter_logger

logger = obter_logger("bronze.contexto")

UF = "SP"
PERIODO_INICIAL = (2024, 1)
# O padrão vem de config.PERIODO_FINAL_PADRAO, para existir num lugar só.
PERIODO_FINAL = Config().periodo_final
FTP_HOST = "ftp.datasus.gov.br"
FTP_DIRS = {
    "RD": "/dissemin/publicos/SIHSUS/200801_/Dados",
    "LT": "/dissemin/publicos/CNES/200508_/Dados/LT",
}
GRUPOS = ("RD", "LT")


def nome_arquivo(grupo: str, ano: int, mes: int, uf: str = UF) -> str:
    return f"{grupo}{uf}{str(ano)[2:]}{mes:02d}.dbc"


def listar_remotos(grupo: str) -> dict[str, str]:
    """Lista o diretório do grupo no FTP do DATASUS, indexado em maiúsculas."""
    ftp = FTP(FTP_HOST, timeout=120)
    try:
        ftp.login()
        ftp.cwd(FTP_DIRS[grupo])
        return {Path(nome).name.upper(): Path(nome).name for nome in ftp.nlst()}
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


def extrair_competencias(
    grupo: str,
    remotos: dict[str, str],
    *,
    uf: str = UF,
    periodo_inicial: tuple[int, int] = PERIODO_INICIAL,
    periodo_final: tuple[int, int] = PERIODO_FINAL,
) -> set[tuple[int, int]]:
    prefixo = f"{grupo}{uf}"
    competencias = set()
    for nome in remotos:
        if nome.startswith(prefixo) and nome.endswith(".DBC") and len(nome) == 12:
            ano, mes = 2000 + int(nome[4:6]), int(nome[6:8])
            if 1 <= mes <= 12 and periodo_inicial <= (ano, mes) <= periodo_final:
                competencias.add((ano, mes))
    return competencias


@dataclass
class ContextoBronze:
    """Caminhos e recorte de uma execução da Bronze.

    Prefira `ContextoBronze.do_config()`, que respeita as variáveis de
    ambiente. O construtor direto continua servindo para testes e para fixar
    um recorte específico em código.
    """

    base: Path
    uf: str = UF
    periodo_inicial: tuple[int, int] = PERIODO_INICIAL
    periodo_final: tuple[int, int] = PERIODO_FINAL
    sobrescrever: bool = False

    listagens_remotas: dict[str, dict[str, str]] = field(default_factory=dict)
    disponiveis: dict[str, set[tuple[int, int]]] = field(default_factory=dict)
    competencias: list[tuple[int, int]] = field(default_factory=list)

    @classmethod
    def do_config(cls, config: Config, *, sobrescrever: bool = False) -> ContextoBronze:
        return cls(
            base=config.base,
            uf=config.uf,
            periodo_inicial=config.periodo_inicial,
            periodo_final=config.periodo_final,
            sobrescrever=sobrescrever,
        )

    # -------------------------------------------------------------- caminhos

    @property
    def dir_raiz(self) -> Path:
        return self.base / "data" / "bronze"

    @property
    def dir_dbc(self) -> Path:
        return self.dir_raiz / "origem" / "datasus"

    @property
    def dir_dbf(self) -> Path:
        return self.dir_raiz / "intermediario" / "dbf"

    @property
    def dir_parquet(self) -> Path:
        return self.dir_raiz / "parquet"

    @property
    def dir_referencias(self) -> Path:
        return self.dir_raiz / "origem" / "referencias"

    @property
    def dir_geografia(self) -> Path:
        return self.dir_referencias / "geografia"

    @property
    def arquivo_manifesto(self) -> Path:
        return self.dir_raiz / "MANIFESTO.json"

    @property
    def arquivo_sih(self) -> Path:
        return self.dir_parquet / "sih_rd_sp_2024_2026.parquet"

    @property
    def arquivo_cnes(self) -> Path:
        return self.dir_parquet / "cnes_lt_sp_2024_2026.parquet"

    # --------------------------------------------------------------- recorte

    @property
    def competencias_atuais(self) -> list[str]:
        return [f"{ano}{mes:02d}" for ano, mes in self.competencias]

    def nome(self, grupo: str, ano: int, mes: int) -> str:
        return nome_arquivo(grupo, ano, mes, self.uf)

    def caminho_dbc(self, grupo: str, ano: int, mes: int) -> Path:
        return self.dir_dbc / self.nome(grupo, ano, mes)

    def caminho_dbf(self, grupo: str, ano: int, mes: int) -> Path:
        return self.dir_dbf / self.nome(grupo, ano, mes).replace(".dbc", ".dbf")

    def criar_diretorios(self) -> None:
        for pasta in (
            self.dir_dbc,
            self.dir_dbf,
            self.dir_parquet,
            self.dir_referencias,
            self.dir_geografia,
        ):
            pasta.mkdir(parents=True, exist_ok=True)

    def descobrir(self) -> None:
        """Descobre no FTP o recorte comum aos dois grupos e valida a contiguidade."""
        self.listagens_remotas = {grupo: listar_remotos(grupo) for grupo in GRUPOS}
        self.disponiveis = {
            grupo: extrair_competencias(
                grupo,
                remotos,
                uf=self.uf,
                periodo_inicial=self.periodo_inicial,
                periodo_final=self.periodo_final,
            )
            for grupo, remotos in self.listagens_remotas.items()
        }
        self.competencias = sorted(self.disponiveis["RD"] & self.disponiveis["LT"])

        assert self.competencias and self.competencias[0] == self.periodo_inicial, (
            f"recorte não começa em {self.periodo_inicial}: {self.competencias[:3]}"
        )
        esperadas = []
        ano, mes = self.periodo_inicial
        while (ano, mes) <= self.competencias[-1]:
            esperadas.append((ano, mes))
            ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
        assert self.competencias == esperadas, (
            "há lacuna no intervalo comum entre SIH/RD e CNES/LT"
        )

    def recorte_mudou(self) -> bool:
        anteriores: list[str] = []
        if self.arquivo_manifesto.exists():
            manifesto = json.loads(self.arquivo_manifesto.read_text(encoding="utf-8"))
            anteriores = manifesto.get("recorte", {}).get("competencias", [])
        return anteriores != self.competencias_atuais

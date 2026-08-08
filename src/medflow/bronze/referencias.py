"""Referências cadastrais e terminológicas oficiais.

Cada fonte é baixada uma vez e preservada crua em
`data/bronze/origem/referencias/`. Nada é tratado aqui — os de/para são
responsabilidade da Silver.

Fontes, todas oficiais:

- IBGE, municípios de SP e malha municipal 2024;
- Ministério da Saúde / DEMAS, macrorregião e região de saúde, por API e CSV;
- DATASUS, CID-10 2008;
- IBGE / CONCLA, natureza jurídica 2021;
- IBGE / SIDRA, IPCA número-índice, tabela 1737 variável 2266;
- Ministério da Saúde / DEMAS, cadastro atual dos estabelecimentos CNES.
"""

from __future__ import annotations

import gzip
import json
import subprocess
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from zipfile import ZipFile

import pandas as pd

from medflow.bronze.contexto import ContextoBronze

URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios"
URL_REGIOES = (
    "https://apidadosabertos.saude.gov.br/"
    "macrorregiao-e-regiao-de-saude/municipio?sigla_uf=SP&limit=860&offset=0"
)
URL_REGIOES_CSV = (
    "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/"
    "dbgeral/macroregiao_de_saude_csv.zip"
)
URL_MALHA_IBGE = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/"
    "malhas_territoriais/malhas_municipais/municipio_2024/UFs/SP/"
    "SP_Municipios_2024.zip"
)
URL_CID10 = "http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip"
URL_CONCLA = (
    "https://concla.ibge.gov.br/documentacao/3051-concla/estrutura/"
    "natureza-juridica-2021.html"
)
URL_IPCA_MODELO = (
    "https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/{periodo}?formato=json"
)
URL_CNES_MODELO = "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/{cnes}"


@dataclass
class ReferenciasBronze:
    """Artefatos crus e os números que o manifesto reconcilia."""

    arquivos: dict[str, Path] = field(default_factory=dict)
    url_ipca: str = ""
    municipios_ibge: int = 0
    regioes: list[dict[str, Any]] = field(default_factory=list)
    municipios_regiao_csv: int = 0
    arquivos_cid: list[str] = field(default_factory=list)
    arquivos_malha: list[str] = field(default_factory=list)
    codigos_cnes: list[str] = field(default_factory=list)
    cnes_atual_payload: dict[str, Any] = field(default_factory=dict)


def baixar_referencia(
    url: str,
    destino: Path,
    *,
    sobrescrever: bool = False,
    timeout: int = 180,
    forcar: bool = False,
) -> bytes:
    if destino.exists() and not sobrescrever and not forcar:
        return destino.read_bytes()
    requisicao = urllib.request.Request(
        url, headers={"User-Agent": "MedFlow-FIAP/1.0", "Accept-Encoding": "identity"}
    )
    with urllib.request.urlopen(requisicao, timeout=timeout) as resposta:
        conteudo = resposta.read()
    if conteudo.startswith(b"\x1f\x8b"):
        conteudo = gzip.decompress(conteudo)
    destino.write_bytes(conteudo)
    return conteudo


def _consultar_cnes(codigo: str) -> tuple[str, dict[str, Any]]:
    ultimo_erro = None
    for _ in range(3):
        try:
            requisicao = urllib.request.Request(
                URL_CNES_MODELO.format(cnes=codigo),
                headers={"User-Agent": "MedFlow-FIAP/1.0"},
            )
            with urllib.request.urlopen(requisicao, timeout=30) as resposta:
                return codigo, json.loads(resposta.read())
        except Exception as erro:
            ultimo_erro = erro
    return codigo, {"_erro": str(ultimo_erro)}


def _baixar_ibge(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    destino = contexto.dir_referencias / "ibge_municipios_sp_raw.json"
    if not destino.exists() or contexto.sobrescrever:
        with urllib.request.urlopen(URL_IBGE, timeout=60) as resposta:
            conteudo = resposta.read()
        destino.write_bytes(conteudo)
    else:
        conteudo = destino.read_bytes()
    if conteudo.startswith(b"\x1f\x8b"):
        conteudo = gzip.decompress(conteudo)
        destino.write_bytes(conteudo)
    ref.arquivos["ibge"] = destino
    ref.municipios_ibge = len(json.loads(conteudo))
    print("IBGE:", ref.municipios_ibge, "registros")


def _baixar_regioes(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    destino = contexto.dir_referencias / "ms_regioes_saude_sp_raw.json"
    conteudo = baixar_referencia(URL_REGIOES, destino, sobrescrever=contexto.sobrescrever)
    ref.arquivos["regioes_saude_ms"] = destino
    ref.regioes = json.loads(conteudo)["macrorregiao_regiao_saude_municipios"]

    destino_csv = contexto.dir_referencias / "macrorregiao_de_saude_csv.zip"
    baixar_referencia(URL_REGIOES_CSV, destino_csv, sobrescrever=contexto.sobrescrever)
    ref.arquivos["regioes_saude_ms_csv"] = destino_csv
    with ZipFile(destino_csv) as pacote, pacote.open("macroregiao_de_saude.csv") as arquivo:
        regioes_csv = pd.read_csv(arquivo, sep=";", dtype="string")
    ref.municipios_regiao_csv = regioes_csv[regioes_csv.sg_uf.eq("SP")].cod_municipio.nunique()


def _baixar_malha(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    destino = contexto.dir_geografia / "SP_Municipios_2024.zip"
    baixar_referencia(
        URL_MALHA_IBGE, destino, sobrescrever=contexto.sobrescrever, timeout=300
    )
    ref.arquivos["malha_municipal_ibge_2024"] = destino
    with ZipFile(destino) as pacote:
        ref.arquivos_malha = pacote.namelist()


def _baixar_cid10(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    destino = contexto.dir_referencias / "datasus_cid10_2008.zip"
    # O servidor legado da CID-10 expira via urllib, mas responde via curl.
    if not destino.exists() or contexto.sobrescrever:
        subprocess.run(
            ["curl", "-L", "--max-time", "120", "-sS", URL_CID10, "-o", str(destino)],
            check=True,
        )
    ref.arquivos["cid10_datasus"] = destino
    with ZipFile(destino) as pacote:
        ref.arquivos_cid = pacote.namelist()


def _baixar_concla(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    destino = contexto.dir_referencias / "ibge_concla_natureza_juridica_2021.html"
    baixar_referencia(URL_CONCLA, destino, sobrescrever=contexto.sobrescrever)
    ref.arquivos["natureza_juridica_concla"] = destino
    print("CONCLA natureza jurídica:", destino.stat().st_size, "bytes")


def _baixar_ipca(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    competencias = contexto.competencias_atuais
    periodo = f"{competencias[0]}-{competencias[-1]}"
    ref.url_ipca = URL_IPCA_MODELO.format(periodo=periodo)
    destino = contexto.dir_referencias / "ibge_ipca_numero_indice_raw.json"

    cache = json.loads(destino.read_bytes()) if destino.exists() else []
    periodos_em_cache = {item.get("D3C") for item in cache[1:]}
    conteudo = baixar_referencia(
        ref.url_ipca,
        destino,
        sobrescrever=contexto.sobrescrever,
        forcar=not set(competencias).issubset(periodos_em_cache),
    )
    payload = json.loads(conteudo)
    assert len(payload) - 1 == len(competencias)
    ref.arquivos["ipca_ibge"] = destino


def _baixar_cnes_atual(contexto: ContextoBronze, ref: ReferenciasBronze) -> None:
    destino = contexto.dir_referencias / "ms_cnes_estabelecimentos_atuais_raw.json"
    ref.codigos_cnes = sorted(
        pd.read_parquet(contexto.arquivo_sih, columns=["CNES"])
        .CNES.astype("string")
        .str.strip()
        .str.zfill(7)
        .unique()
    )

    registros_cache: dict[str, Any] = {}
    if destino.exists():
        payload_cache = json.loads(destino.read_bytes())
        registros_cache = {
            str(item["codigo_cnes"]).replace(".0", "").zfill(7): item
            for item in payload_cache.get("registros", [])
        }

    if contexto.sobrescrever:
        faltantes = ref.codigos_cnes
        respostas: dict[str, Any] = {}
    else:
        faltantes = sorted(set(ref.codigos_cnes) - set(registros_cache))
        respostas = dict(registros_cache)

    if faltantes:
        print("estabelecimentos CNES a consultar:", len(faltantes))
        with ThreadPoolExecutor(max_workers=12) as executor:
            futuros = [executor.submit(_consultar_cnes, codigo) for codigo in faltantes]
            for futuro in as_completed(futuros):
                codigo, resposta = futuro.result()
                respostas[codigo] = resposta

    falhas = {codigo: item for codigo, item in respostas.items() if "_erro" in item}
    assert not falhas, f"falhas na API CNES: {list(falhas.items())[:10]}"

    ref.cnes_atual_payload = {
        "fonte": URL_CNES_MODELO,
        "extraido_em_utc": datetime.now(UTC).isoformat(),
        "observacao": "cadastro atual; usar somente como enriquecimento não histórico",
        "registros": [respostas[codigo] for codigo in ref.codigos_cnes],
    }
    if faltantes or contexto.sobrescrever or not destino.exists():
        destino.write_text(
            json.dumps(ref.cnes_atual_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    ref.arquivos["cnes_estabelecimentos_atuais"] = destino


def baixar_todas(contexto: ContextoBronze) -> ReferenciasBronze:
    """Baixa e preserva todas as referências oficiais.

    Depende do Parquet do SIH já existir: os códigos CNES a consultar saem dele.
    """
    ref = ReferenciasBronze()
    _baixar_ibge(contexto, ref)
    _baixar_regioes(contexto, ref)
    _baixar_malha(contexto, ref)
    _baixar_cid10(contexto, ref)
    _baixar_concla(contexto, ref)
    _baixar_ipca(contexto, ref)
    _baixar_cnes_atual(contexto, ref)

    print("regiões/municípios MS:", len(ref.regioes))
    print("arquivos no pacote CID-10:", len(ref.arquivos_cid))
    print("estabelecimentos CNES atuais:", len(ref.cnes_atual_payload["registros"]))
    return ref

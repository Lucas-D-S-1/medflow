"""A conferência de 10 minutos antes de apresentar.

A `ARQUITETURA.md` traz o preflight como lista em prosa. Lista em prosa, lida
às pressas por alguém nervoso quinze minutos antes de falar, é lista que pula
item. Isto é a parte que a máquina consegue checar, num comando, com saída que
cabe na tela.

O que a máquina **não** checa fica impresso no fim, porque continua sendo
necessário: abrir em janela anônima, testar em outra rede, ensaiar a fala.

    make preflight

Não precisa de `.env`, wallet nem Gold local: fala com o produto publicado pelo
mesmo caminho que o avaliador vai usar.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field

BASE_PADRAO = (
    "https://gf68e03b2a30d55-medflow.adb.sa-saopaulo-1.oraclecloudapps.com"
    "/ords/medflow/api/v1"
)
SITE_PADRAO = "https://lucas-d-s-1.github.io/medflow/"

CONTRATO_ESPERADO = "0.3.0"
COMPETENCIA_ESPERADA = "2026-06"
REGIOES_ESPERADAS = 62

TEMPO_LIMITE = 30


@dataclass
class Resultado:
    nome: str
    ok: bool
    detalhe: str
    dica: str = ""


@dataclass
class Preflight:
    base: str
    site: str
    resultados: list[Resultado] = field(default_factory=list)

    def buscar(self, caminho: str) -> tuple[int, dict | None]:
        url = caminho if caminho.startswith("http") else f"{self.base}{caminho}"
        try:
            with urllib.request.urlopen(url, timeout=TEMPO_LIMITE) as r:
                corpo = r.read()
                try:
                    return r.status, json.loads(corpo)
                except json.JSONDecodeError:
                    return r.status, None
        except urllib.error.HTTPError as e:
            return e.code, None
        except Exception:
            return 0, None

    def registrar(self, nome, ok, detalhe, dica="") -> None:
        self.resultados.append(Resultado(nome, ok, detalhe, dica))
        marca = "  ok  " if ok else " FALHA"
        print(f"[{marca}] {nome}: {detalhe}", flush=True)
        if not ok and dica:
            print(f"          -> {dica}", flush=True)

    # ---------------------------------------------------------------- checks

    def oracle_no_ar(self) -> dict | None:
        codigo, corpo = self.buscar("/status")
        if codigo != 200 or not corpo:
            self.registrar(
                "Oracle respondendo",
                False,
                f"/status devolveu HTTP {codigo or 'sem resposta'}",
                "Console OCI -> Autonomous Database -> MEDFLOW -> Start. "
                "O ORDS leva ~5 min para subir depois do banco.",
            )
            return None

        origem = corpo.get("source")
        self.registrar(
            "Oracle respondendo",
            origem == "oracle-live",
            f"status={corpo.get('status')} origem={origem} "
            f"hora do banco={corpo.get('database_time')}",
            "A origem não é `oracle-live`: o produto está servindo outra coisa.",
        )
        return corpo

    def contrato_e_recorte(self, status: dict) -> None:
        contrato = status.get("contract_version")
        self.registrar(
            "Versão do contrato",
            contrato == CONTRATO_ESPERADO,
            f"{contrato} (esperado {CONTRATO_ESPERADO})",
            "Alguém publicou outro contrato. Confira antes de apresentar.",
        )
        ate = status.get("data_through")
        self.registrar(
            "Competência mais recente",
            ate == COMPETENCIA_ESPERADA,
            f"{ate} (esperado {COMPETENCIA_ESPERADA})",
            "O recorte mudou. Os números da apresentação não vão bater.",
        )

    def endpoints(self) -> None:
        # Um por visão, mais os que a demonstração costuma abrir.
        casos = [
            ("Visão regional", "/regioes/resumo?ano=2026&mes=6&limit=1"),
            ("Série regional", "/regioes/35163/serie?limit=1"),
            ("Fluxos", "/fluxos?ano=2026&mes=6&origem=35163&limit=1"),
            ("ICSAP", "/icsap?ano=2026&mes=6&regiao=35163&limit=1"),
            ("Hospitais", "/hospitais?ano=2026&mes=6&regiao=35163&limit=1"),
            ("Metodologia", "/metodologia"),
        ]
        for nome, caminho in casos:
            codigo, corpo = self.buscar(caminho)
            ok = codigo == 200 and corpo is not None
            self.registrar(
                nome,
                ok,
                "responde" if ok else f"HTTP {codigo or 'sem resposta'}",
                "Este endpoint alimenta uma tela. Sem ele a visão fica vazia.",
            )

    def volumetria(self) -> None:
        codigo, corpo = self.buscar("/regioes/resumo?ano=2026&mes=6&limit=1")
        if codigo != 200 or not corpo:
            return
        total = corpo.get("pagination", {}).get("count")
        self.registrar(
            "As 62 regiões estão lá",
            total == REGIOES_ESPERADAS,
            f"{total} região(ões) em 2026-06",
            "A carga não está completa.",
        )

    def parametro_invalido(self) -> None:
        # O 404 aqui é deliberado e documentado no openapi. Se virar 500, o
        # comportamento mudou e a banca pode topar com isso.
        codigo, _ = self.buscar("/regioes/resumo?ano=1900&mes=13&limit=1")
        self.registrar(
            "Parâmetro inválido devolve 404",
            codigo == 404,
            f"HTTP {codigo or 'sem resposta'} (esperado 404)",
            "O contrato documenta 404 para parâmetro fora do domínio.",
        )

    def link_publico(self) -> None:
        codigo, _ = self.buscar(self.site)
        self.registrar(
            "Link público abre",
            codigo == 200,
            f"HTTP {codigo or 'sem resposta'} em {self.site}",
            "O site do GitHub Pages não está servindo.",
        )

    # ----------------------------------------------------------------- saída

    def rodar(self) -> int:
        print(f"Preflight — {self.base}\n")
        status = self.oracle_no_ar()
        if status:
            self.contrato_e_recorte(status)
            self.endpoints()
            self.volumetria()
            self.parametro_invalido()
        self.link_publico()

        falhas = [r for r in self.resultados if not r.ok]
        print()
        if falhas:
            print(f"{len(falhas)} de {len(self.resultados)} verificações falharam.")
            print("Resolva antes de apresentar:\n")
            for r in falhas:
                print(f"  - {r.nome}: {r.detalhe}")
                if r.dica:
                    print(f"    {r.dica}")
        else:
            print(f"As {len(self.resultados)} verificações automáticas passaram.")

        print(
            "\nO que a máquina não checa, e continua sendo necessário:\n"
            "  - abrir as quatro visões em janela anônima, sem cache nem login;\n"
            "  - testar um filtro regional e um par hospital/CID elegível;\n"
            "  - simular a contingência e conferir o selo de origem na tela;\n"
            "  - abrir o link em outra rede ou no celular, fora do wi-fi da sala;\n"
            "  - rodar o roteiro do Select AI uma vez, sem plateia;\n"
            "  - guardar screenshots ou um vídeo curto como última contingência."
        )
        return 1 if falhas else 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default=BASE_PADRAO, help="URL do módulo público")
    p.add_argument("--site", default=SITE_PADRAO, help="URL do site publicado")
    a = p.parse_args()
    return Preflight(base=a.base.rstrip("/"), site=a.site).rodar()


if __name__ == "__main__":
    sys.exit(main())

"""Cliente ORDS para varredura, com o freio que o ORDS exige.

O plano da fatia 6 registra o cuidado: **o ORDS devolve 429 em varredura**. A
conta Always Free não tem folga para paralelismo alegre, e um teste que derruba
o próprio ambiente de entrega não é teste, é incidente. Daí três limites:

- no máximo três requisições simultâneas, sempre;
- recuo exponencial com jitter em 429 e em 5xx, respeitando `Retry-After`
  quando o servidor manda um;
- uma sessão HTTP reaproveitada por thread, para não pagar handshake TLS por
  página.
"""

from __future__ import annotations

import os
import random
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass

import requests

CONEXOES_MAXIMAS = 3
TENTATIVAS_MAXIMAS = 8
ESPERA_INICIAL_S = 1.0
ESPERA_MAXIMA_S = 60.0

INTERVALO_INICIAL_S = 0.0
"""Espaçamento mínimo entre requisições. Começa em zero e sobe se doer."""
INTERVALO_MAXIMO_S = 1.5
PASSO_DE_FREIO_S = 0.05
"""Quanto o espaçamento sobe a cada 429."""
ALIVIO_POR_SUCESSO = 0.995
"""Decaimento lento do freio quando o servidor volta a aceitar o ritmo."""
LIMITE_POR_PAGINA = 2000
"""O `p_items_per_page` máximo que os handlers aceitam."""


class ErroDeVarredura(RuntimeError):
    pass


@dataclass
class Pagina:
    itens: list[dict]
    total: int
    tem_mais: bool


def base_ords() -> str:
    """A raiz do módulo ORDS, do ambiente. Sem ela não há o que reconciliar."""
    bruta = os.getenv("ORDS_BASE_URL", "").strip().rstrip("/")
    if not bruta:
        raise ErroDeVarredura(
            "ORDS_BASE_URL não definida. Rode via `dotenv -f .env run --`."
        )
    # Por padrão varre o módulo de desenvolvimento, que é onde se trabalha.
    # `ORDS_API_PATH=api/v1` aponta a mesma varredura para o módulo público:
    # ele é clone do outro, mas quem serve o link da entrega é ele, e o que
    # não foi medido lá não está provado lá.
    caminho = os.getenv("ORDS_API_PATH", "api/dev/v1").strip().strip("/")
    return f"{bruta}/{caminho}"


class ClienteORDS:
    """Sessões por thread e um semáforo global de três permissões."""

    def __init__(self, base: str | None = None, tempo_limite: float = 120.0) -> None:
        self.base = base or base_ords()
        self.tempo_limite = tempo_limite
        self._local = threading.local()
        self._vagas = threading.BoundedSemaphore(CONEXOES_MAXIMAS)
        self.requisicoes = 0
        self.recuos = 0
        self._contagem = threading.Lock()
        # O limite do ORDS é global, não por conexão. Recuar só a requisição
        # que tomou 429 deixa as outras duas threads batendo no mesmo teto no
        # mesmo instante — foi assim que a primeira varredura completa morreu,
        # com três endpoints esgotando as tentativas. O freio abaixo é do
        # cliente inteiro: um 429 em qualquer thread segura todas.
        self._ritmo = threading.Lock()
        self._intervalo = INTERVALO_INICIAL_S
        self._proxima_liberada = 0.0
        self.freio_maximo = 0.0

    @property
    def _sessao(self) -> requests.Session:
        sessao = getattr(self._local, "sessao", None)
        if sessao is None:
            sessao = requests.Session()
            self._local.sessao = sessao
        return sessao

    def _aguardar_a_vez(self) -> None:
        """Respeita o espaçamento global antes de cada requisição."""
        while True:
            with self._ritmo:
                agora = time.monotonic()
                if agora >= self._proxima_liberada:
                    self._proxima_liberada = agora + self._intervalo
                    return
                falta = self._proxima_liberada - agora
            time.sleep(falta)

    def _frear(self, tentativa: int, resposta: requests.Response | None) -> None:
        """Segura o cliente inteiro, não só a requisição que tomou 429."""
        cabecalho = resposta.headers.get("Retry-After") if resposta is not None else None
        if cabecalho and cabecalho.isdigit():
            espera = float(cabecalho)
        else:
            espera = min(ESPERA_INICIAL_S * 2**tentativa, ESPERA_MAXIMA_S)
        # Jitter: três threads que recuam em uníssono voltam em uníssono e
        # tomam 429 de novo, no mesmo instante.
        espera *= 0.5 + random.random() / 2
        with self._ritmo:
            self._intervalo = min(self._intervalo + PASSO_DE_FREIO_S, INTERVALO_MAXIMO_S)
            self.freio_maximo = max(self.freio_maximo, self._intervalo)
            self._proxima_liberada = max(
                self._proxima_liberada, time.monotonic() + espera
            )
        time.sleep(espera)

    def _aliviar(self) -> None:
        with self._ritmo:
            self._intervalo *= ALIVIO_POR_SUCESSO

    def obter(self, caminho: str, parametros: dict) -> dict:
        ultima: Exception | None = None
        for tentativa in range(TENTATIVAS_MAXIMAS):
            self._aguardar_a_vez()
            with self._vagas:
                try:
                    resposta = self._sessao.get(
                        f"{self.base}/{caminho.lstrip('/')}",
                        params=parametros,
                        timeout=self.tempo_limite,
                    )
                except requests.RequestException as erro:
                    ultima = erro
                    resposta = None
                else:
                    with self._contagem:
                        self.requisicoes += 1
                    if resposta.status_code == 200:
                        self._aliviar()
                        return resposta.json()
                    if resposta.status_code not in (429, 500, 502, 503, 504):
                        raise ErroDeVarredura(
                            f"{caminho} devolveu {resposta.status_code}: "
                            f"{resposta.text[:200]}"
                        )
                    ultima = ErroDeVarredura(
                        f"{caminho} devolveu {resposta.status_code}"
                    )
            with self._contagem:
                self.recuos += 1
            self._frear(tentativa, resposta)
        raise ErroDeVarredura(f"{caminho} falhou após {TENTATIVAS_MAXIMAS} tentativas: {ultima}")

    def pagina(self, caminho: str, parametros: dict, deslocamento: int, limite: int) -> Pagina:
        corpo = self.obter(
            caminho, {**parametros, "limit": limite, "offset": deslocamento}
        )
        paginacao = corpo.get("pagination") or {}
        return Pagina(
            itens=corpo.get("items") or [],
            total=int(paginacao.get("count") or 0),
            tem_mais=bool(paginacao.get("has_more")),
        )

    def varrer(
        self, caminho: str, parametros: dict, limite: int = LIMITE_POR_PAGINA
    ) -> Iterator[dict]:
        """Percorre a coleção inteira, página a página, em ordem."""
        deslocamento = 0
        vistos = 0
        while True:
            pagina = self.pagina(caminho, parametros, deslocamento, limite)
            yield from pagina.itens
            vistos += len(pagina.itens)
            if not pagina.tem_mais or not pagina.itens:
                if pagina.total and vistos != pagina.total:
                    raise ErroDeVarredura(
                        f"{caminho}: a varredura leu {vistos} itens, mas a API "
                        f"declarou {pagina.total}"
                    )
                return
            deslocamento += len(pagina.itens)

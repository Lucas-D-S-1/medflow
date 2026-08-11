"""Reconciliação campo a campo entre a API ORDS e a Gold.

Dois modos, com o mesmo código:

- **amostra** (padrão): alguns recortes por endpoint, o suficiente para provar
  que o caminho inteiro — handler, view, tabela Oracle, carga, parquet — ainda
  fecha. Roda em cerca de um minuto e é o que entra em `make test`.
- **completo** (`MEDFLOW_RECONCILIACAO=completo`): todos os recortes de todos
  os endpoints, as milhões de comparações. Roda sob demanda, antes de uma
  entrega ou depois de avançar o recorte.

Os dois exigem o Oracle no ar e `ORDS_BASE_URL` no ambiente. Sem isso os testes
são pulados, não falhados: a CI não tem wallet e não deve ter.
"""

from .cliente import ClienteORDS, ErroDeVarredura
from .plano import ENDPOINTS, Divergencia, reconciliar_endpoint

__all__ = [
    "ENDPOINTS",
    "ClienteORDS",
    "Divergencia",
    "ErroDeVarredura",
    "reconciliar_endpoint",
]

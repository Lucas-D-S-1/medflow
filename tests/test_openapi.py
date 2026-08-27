"""O contrato OpenAPI não pode ser uma terceira versão da verdade.

Antes deste arquivo, o contrato dos endpoints existia duas vezes e de forma
implícita: no SQL de cada handler e nos tipos TypeScript de `web/src/api/`.
Quando os dois divergiam, ninguém era avisado — descobria-se na tela.

Escrever um `openapi.yaml` sem testá-lo criaria uma terceira cópia e pioraria o
problema, porque um contrato escrito parece autoridade. Então ele é conferido
contra as duas fontes que já existem:

- **contra o SQL** (`db/ords/03_modulo_medflow_dev.sql`), sem rede: mesmos
  endpoints, mesmos campos de item, mesmos tetos de paginação, mesma ordenação;
- **contra a API viva**, quando o Oracle está no ar: a resposta real satisfaz o
  schema declarado.
"""

from __future__ import annotations

import os
import re

import pytest
import yaml

from medflow.config import Config
from reconciliacao.cliente import ClienteORDS, ErroDeVarredura
from reconciliacao.fontes import contratos_dos_handlers
from reconciliacao.plano import ENDPOINTS

BASE = Config().base
CAMINHO_OPENAPI = BASE / "contracts" / "openapi.yaml"

# `regioes/:id/serie` no ORDS é `/regioes/{id}/serie` no OpenAPI.
_BIND = re.compile(r":(\w+)")


def _para_openapi(padrao: str) -> str:
    return "/" + _BIND.sub(r"{\1}", padrao)


@pytest.fixture(scope="module")
def spec() -> dict:
    return yaml.safe_load(CAMINHO_OPENAPI.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def handlers() -> dict:
    return contratos_dos_handlers(BASE)


def _resolver(spec: dict, no):
    """Segue `$ref` e achata `allOf`, o suficiente para comparar campos."""
    if isinstance(no, dict) and "$ref" in no:
        alvo = spec
        for parte in no["$ref"].lstrip("#/").split("/"):
            alvo = alvo[parte]
        return _resolver(spec, alvo)
    if isinstance(no, dict) and "allOf" in no:
        juntas: dict = {"type": "object", "properties": {}, "required": []}
        for parte in no["allOf"]:
            resolvida = _resolver(spec, parte)
            juntas["properties"].update(resolvida.get("properties", {}))
            juntas["required"].extend(resolvida.get("required", []))
        for chave, valor in no.items():
            if chave != "allOf":
                juntas[chave] = valor
        return juntas
    return no


def _schema_da_resposta(spec: dict, caminho: str) -> dict:
    operacao = spec["paths"][caminho]["get"]
    bruto = operacao["responses"]["200"]["content"]["application/json"]["schema"]
    return _resolver(spec, bruto)


def _campos_dos_itens(spec: dict, caminho: str) -> set[str]:
    schema = _schema_da_resposta(spec, caminho)
    itens = _resolver(spec, schema["properties"]["items"])
    return set(_resolver(spec, itens["items"]).get("properties", {}))


class TestEspecificacao:
    """O arquivo é um OpenAPI válido e coerente consigo mesmo."""

    def test_a_especificacao_e_valida(self, spec):
        from openapi_spec_validator import validate

        validate(spec)

    def test_declara_a_versao_do_contrato_de_dados(self, spec):
        assert spec["info"]["version"] == "0.3.0"

    def test_todo_ref_aponta_para_algo_que_existe(self, spec):
        def visitar(no, trilha="#"):
            if isinstance(no, dict):
                if "$ref" in no:
                    alvo = spec
                    for parte in no["$ref"].lstrip("#/").split("/"):
                        assert parte in alvo, f"{trilha}: {no['$ref']} não existe"
                        alvo = alvo[parte]
                for chave, valor in no.items():
                    visitar(valor, f"{trilha}/{chave}")
            elif isinstance(no, list):
                for i, item in enumerate(no):
                    visitar(item, f"{trilha}[{i}]")

        visitar(spec)

    def test_todo_schema_declarado_e_usado(self, spec):
        """Schema órfão é resto de edição, e vira documentação que mente."""
        texto = CAMINHO_OPENAPI.read_text(encoding="utf-8")
        orfaos = [
            nome
            for nome in spec["components"]["schemas"]
            if texto.count(f"#/components/schemas/{nome}") == 0
        ]
        assert not orfaos, f"schemas declarados e nunca referenciados: {orfaos}"


class TestContraOSQL:
    """Sem rede: o contrato bate com os handlers versionados."""

    def test_os_caminhos_cobrem_todos_os_handlers(self, spec, handlers):
        declarados = set(spec["paths"])
        # `status`, `metodologia` e o POST do assistente não são coleções e não entram em
        # `contratos_dos_handlers`; entram aqui à mão porque existem na API.
        esperados = {_para_openapi(p) for p in handlers} | {
            "/status",
            "/metodologia",
            "/assistente/perguntar",
        }
        assert declarados == esperados, (
            f"só no OpenAPI: {sorted(declarados - esperados)}; "
            f"só no ORDS: {sorted(esperados - declarados)}"
        )

    def test_os_campos_de_item_batem_com_o_json_object_do_handler(self, spec, handlers):
        # Os campos derivados são declarados no plano de reconciliação, que
        # sabe quais o extrator não enxerga.
        derivados = {e.padrao: set(e.derivados) for e in ENDPOINTS}
        divergencias = []
        for padrao, contrato in handlers.items():
            no_spec = _campos_dos_itens(spec, _para_openapi(padrao))
            no_sql = set(contrato.campos) | derivados.get(padrao, set())
            if no_spec != no_sql:
                divergencias.append(
                    f"{padrao}: só no OpenAPI {sorted(no_spec - no_sql)}; "
                    f"só no SQL {sorted(no_sql - no_spec)}"
                )
        assert not divergencias, "\n".join(divergencias)

    def test_os_tetos_de_paginacao_batem(self, spec, handlers):
        """O projeto já perdeu tempo com paginação declarada em dois lugares."""
        divergencias = []
        for padrao, contrato in handlers.items():
            parametros = spec["paths"][_para_openapi(padrao)]["get"]["parameters"]
            limites = [
                _resolver(spec, p)
                for p in parametros
                if _resolver(spec, p)["name"] == "limit"
            ]
            assert len(limites) == 1, f"{padrao}: {len(limites)} parâmetros `limit`"
            declarado = limites[0]["schema"]["maximum"]
            if declarado != contrato.limite_maximo:
                divergencias.append(
                    f"{padrao}: OpenAPI diz {declarado}, o handler aceita "
                    f"{contrato.limite_maximo}"
                )
        assert not divergencias, "\n".join(divergencias)

    def test_o_limite_padrao_declarado_e_o_do_modulo(self, spec, handlers):
        for padrao in handlers:
            parametros = spec["paths"][_para_openapi(padrao)]["get"]["parameters"]
            limite = next(
                _resolver(spec, p)
                for p in parametros
                if _resolver(spec, p)["name"] == "limit"
            )
            assert limite["schema"]["default"] == 100, padrao

    def test_a_ordenacao_declarada_aparece_na_descricao(self, spec, handlers):
        """Ordem é contrato: quem lê o arquivo precisa saber qual é."""
        faltando = []
        for padrao, contrato in handlers.items():
            resposta = spec["paths"][_para_openapi(padrao)]["get"]["responses"]["200"]
            descricao = resposta.get("description", "")
            primeira = contrato.ordem[0].coluna
            # A descrição usa o nome JSON, não o da coluna.
            nome_json = next(
                (j for j, c in contrato.campos.items() if c == primeira), primeira
            )
            if nome_json not in descricao and "competência" not in descricao:
                faltando.append(f"{padrao}: esperava citar `{nome_json}`")
        assert not faltando, "\n".join(faltando)

    def test_o_assistente_e_post_governado_no_sql_e_no_contrato(self, spec):
        operacao = spec["paths"]["/assistente/perguntar"]
        assert set(operacao) == {"post"}
        sql = (BASE / "db" / "ords" / "03_modulo_medflow_dev.sql").read_text(
            encoding="utf-8"
        )
        assert "p_pattern     => 'assistente/perguntar'" in sql
        assert "p_method      => 'POST'" in sql
        assert "medflow_select_ai.responder" in sql


@pytest.fixture(scope="module")
def cliente() -> ClienteORDS:
    """Um cliente por módulo, para o freio do 429 valer entre os testes."""
    return ClienteORDS()


@pytest.mark.skipif(
    not os.getenv("ORDS_BASE_URL", "").strip(),
    reason="ORDS_BASE_URL ausente; rode via `dotenv -f .env run --`",
)
class TestContraAAPIViva:
    """O contrato descreve o que a API realmente devolve."""

    CHAMADAS = {
        "/status": ("status", {}),
        "/metodologia": ("metodologia", {}),
        "/regioes/resumo": ("regioes/resumo", {"limit": 1}),
        "/regioes/{id}/serie": ("regioes/35073/serie", {"limit": 1}),
        "/fluxos": ("fluxos", {"origem": "35073", "limit": 1}),
        "/icsap": ("icsap", {"regiao": "35073", "limit": 1}),
        "/hospitais": ("hospitais", {"regiao": "35073", "limit": 1}),
        "/hospitais/{cnes}/serie": ("hospitais/3012212/serie", {"limit": 1}),
        "/hospitais/{cnes}/especialidades": (
            "hospitais/3012212/especialidades",
            {"limit": 1},
        ),
        "/hospitais/{cnes}/cids": ("hospitais/3012212/cids", {"limit": 1}),
    }

    def test_toda_rota_declarada_tem_uma_chamada_de_prova(self, spec):
        assert set(spec["paths"]) == set(self.CHAMADAS) | {"/assistente/perguntar"}

    def test_assistente_recusa_pergunta_vazia_sem_consumir_select_ai(self, cliente):
        resposta = cliente._sessao.post(
            f"{cliente.base}/assistente/perguntar",
            json={"question": ""},
            timeout=cliente.tempo_limite,
        )
        assert resposta.status_code == 400
        assert resposta.headers["Content-Type"].startswith("application/json")
        assert resposta.json() == {"status": "error", "message": "Escreva uma pergunta."}

    @pytest.mark.parametrize("rota", sorted(CHAMADAS), ids=lambda r: r)
    def test_a_resposta_traz_as_chaves_obrigatorias(self, spec, cliente, rota):
        caminho, parametros = self.CHAMADAS[rota]
        corpo = cliente.obter(caminho, parametros)
        schema = _schema_da_resposta(spec, rota)
        faltando = sorted(set(schema.get("required", [])) - set(corpo))
        assert not faltando, f"{rota}: a resposta não trouxe {faltando}"

    @pytest.mark.parametrize("rota", sorted(CHAMADAS), ids=lambda r: r)
    def test_a_resposta_nao_traz_chave_fora_do_contrato(self, spec, cliente, rota):
        """O inverso importa tanto quanto: campo novo não documentado."""
        caminho, parametros = self.CHAMADAS[rota]
        corpo = cliente.obter(caminho, parametros)
        schema = _schema_da_resposta(spec, rota)
        extras = sorted(set(corpo) - set(schema.get("properties", {})))
        assert not extras, f"{rota}: a API devolve {extras}, que o contrato não descreve"

    @pytest.mark.parametrize(
        "rota",
        [r for r in sorted(CHAMADAS) if r not in ("/status", "/metodologia")],
        ids=lambda r: r,
    )
    def test_os_itens_trazem_exatamente_os_campos_declarados(self, spec, cliente, rota):
        caminho, parametros = self.CHAMADAS[rota]
        corpo = cliente.obter(caminho, parametros)
        if not corpo.get("items"):
            pytest.skip(f"{rota}: a chamada de prova veio sem itens")
        declarados = _campos_dos_itens(spec, rota)
        observados = set(corpo["items"][0])
        assert observados == declarados, (
            f"{rota}: só na API {sorted(observados - declarados)}; "
            f"só no contrato {sorted(declarados - observados)}"
        )

    @pytest.mark.parametrize(
        ("caminho", "obrigatorio", "completos"),
        [
            ("fluxos", "origem", {"ano": 2026, "mes": 6, "origem": "35073"}),
            ("icsap", "regiao", {"ano": 2026, "mes": 6, "regiao": "35073"}),
        ],
    )
    def test_parametro_obrigatorio_recusa_em_vez_de_misturar(
        self, cliente, caminho, obrigatorio, completos
    ):
        """Ausência de filtro não é filtro vazio.

        Antes da fatia 7, omitir `origem` em `/fluxos` devolvia 200 com os
        fluxos de todas as origens somados numa página e o contexto inteiro
        nulo — 1.015 linhas de regiões diferentes que uma tela desatenta
        renderizaria como se fossem de uma só. Recusar é a resposta correta.
        """
        sem = {k: v for k, v in completos.items() if k != obrigatorio}
        with pytest.raises(ErroDeVarredura, match="404"):
            cliente.obter(caminho, sem)
        assert cliente.obter(caminho, completos)["pagination"]["count"] > 0

    def test_recorte_legitimamente_vazio_continua_sendo_200(self, cliente):
        """Região sem ICSAP na competência não é erro de parâmetro.

        A distinção importa para o webapp: ele trata ausência legítima como
        estado próprio, com o contexto ecoado e zero itens, e nunca a exibe
        como falha do endpoint.
        """
        corpo = cliente.obter("icsap", {"ano": 2026, "mes": 6, "regiao": "99999"})
        assert corpo["pagination"]["count"] == 0
        assert corpo["region"]["region_code"] == "99999"
        assert corpo["region"]["region_name"] is None

    def test_busca_hospital_resolve_alias_popular(self, cliente):
        corpo = cliente.obter(
            "hospitais",
            {"busca": "Ermelino Matarazzo", "limit": 10},
        )
        assert corpo["pagination"]["count"] == 1
        assert corpo["items"][0]["cnes"] == "2082829"
        assert corpo["items"][0]["district_code"] == "28"

    def test_busca_hospital_com_menos_de_dois_caracteres_e_recusada(self, cliente):
        with pytest.raises(ErroDeVarredura, match="404"):
            cliente.obter("hospitais", {"busca": "x", "limit": 10})

    def test_o_teto_de_paginacao_declarado_e_o_que_o_banco_aceita(self, spec, cliente):
        """Pedir o teto tem de funcionar; pedir acima dele, não.

        O comportamento acima do teto é 404, não 400 — está registrado em
        `components.responses.ParametroInvalido`, com o motivo estrutural.
        Este teste fixa o observável para que uma mudança futura apareça aqui
        em vez de na tela.
        """
        caminho, _ = self.CHAMADAS["/regioes/{id}/serie"]
        teto = 120
        assert cliente.obter(caminho, {"limit": teto})["pagination"]["limit"] == teto
        with pytest.raises(ErroDeVarredura, match="404"):
            cliente.obter(caminho, {"limit": teto + 1})

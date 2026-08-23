.DEFAULT_GOAL := help
SHELL := /bin/bash

VENV    := .venv
PY      := $(VENV)/bin/python
UV      := $(shell command -v uv 2>/dev/null)
DOTENV  := $(PY) -m dotenv -f .env run --
# os alvos de frontend rodam dentro de web/, então o .env fica um nível acima
DOTENV_WEB := ../$(PY) -m dotenv -f ../.env run --

.PHONY: fixtures fixtures-conferir fixtures-carimbo help setup setup-py pipeline bronze silver gold geografia validar inventario test test-completo test-py test-web test-web-ci test-web-live lint contrato contrato-publico reconciliar reconciliar-completo reconciliar-publico web-install web-browser web-build web-e2e oracle-ping preflight select-ai-revalidar oracle-carregar ords-publicar limpar

help:  ## lista os alvos disponíveis
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- ambiente

setup: setup-py web-browser  ## prepara Python, frontend e Chromium para um clone novo

setup-py: $(PY)  ## instala ou atualiza o pacote Python e todos os extras
ifeq ($(UV),)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -e '.[geografia,notebooks,dev]'
else
	uv pip install --python $(PY) -e '.[geografia,notebooks,dev]'
endif

$(PY):
ifeq ($(UV),)
	python3 -m venv $(VENV)
else
	uv venv $(VENV)
endif

# ------------------------------------------------------------ pipeline

bronze:  ## ingestão fiel das fontes oficiais
	$(PY) -m medflow.cli bronze

silver:  ## dimensões, fatos e de/paras
	$(PY) -m medflow.cli silver

gold:  ## marts e indicadores
	$(PY) -m medflow.cli gold

pipeline: bronze silver gold  ## materializa Bronze, Silver, Gold e geografia

geografia:  ## regiões, população e malhas
	$(PY) -m medflow.cli geografia

validar:  ## validação integrada das três camadas contra os contratos
	$(PY) -m medflow.cli validar

inventario:  ## inventário SHA-256 dos artefatos de dados
	$(PY) -m medflow.cli inventario

fixtures:  ## regrava os 10 snapshots do webapp a partir da API ao vivo
	cd web && $(DOTENV_WEB) node scripts/gerar-mocks.ts

fixtures-conferir:  ## não escreve; falha se algum snapshot estiver desatualizado
	cd web && $(DOTENV_WEB) node scripts/gerar-mocks.ts --conferir

fixtures-carimbo:  ## offline: só reancora o carimbo da Gold nos snapshots
	$(PY) scripts/reancorar_fixtures.py

# --------------------------------------------------------------- testes

test: test-py test-web-ci  ## suíte hermética: não exige dados locais, .env ou Oracle

test-completo: test test-web-live contrato reconciliar  ## acrescenta integrações ao vivo

test-py:  ## pytest
	$(PY) -m pytest -q

lint:  ## ruff
	$(PY) -m ruff check src tests

# A reconciliação precisa do Oracle no ar; sem ORDS_BASE_URL os testes se
# pulam sozinhos, e é por isso que ela não entra em `make test`.
contrato:  ## confere o openapi.yaml contra o SQL dos handlers e a API viva
	$(DOTENV) $(PY) -m pytest tests/test_openapi.py -q

reconciliar:  ## amostra: prova que API, view, banco e Gold ainda fecham
	$(DOTENV) $(PY) -m pytest tests/reconciliacao -q -s -k TestReconciliacao

reconciliar-completo:  ## varredura inteira, campo a campo — minutos, sob demanda
	MEDFLOW_RECONCILIACAO=completo \
	  $(DOTENV) $(PY) -m pytest tests/reconciliacao -q -s -k TestReconciliacao

# -------------------------------------------------------------- frontend

web-install:  ## instala as dependências do frontend
	cd web && npm ci

web-browser: web-install  ## instala o Chromium usado pelos testes Playwright
	cd web && npx playwright install chromium

web-build:  ## typecheck e build de produção
	cd web && npm run build

test-web: web-build  ## build mais a suíte Playwright completa, herméticos e ao vivo
	cd web && $(DOTENV_WEB) npx playwright test

test-web-ci: web-build  ## somente testes herméticos, sem tocar no Oracle
	cd web && ORDS_BASE_URL=http://127.0.0.1:9 npx playwright test --grep-invert @live

test-web-live:  ## só os 2 testes de integração ao vivo contra o Oracle
	cd web && $(DOTENV_WEB) npx playwright test --grep @live

# ---------------------------------------------------------------- oracle

oracle-ping:  ## confirma a conexão mTLS e mantém o Always Free acordado
	$(DOTENV) $(PY) src/medflow/oracle/testar_conexao.py

preflight:  ## conferência de 10 minutos antes de apresentar; não precisa de .env
	$(PY) scripts/preflight.py

select-ai-revalidar:  ## roda o roteiro de Select AI e regrava a evidência datada
	$(DOTENV) $(PY) scripts/revalidar_select_ai.py

oracle-carregar:  ## carga idempotente da Gold no Autonomous Database
	$(DOTENV) $(PY) src/medflow/oracle/carregar_gold.py

# Sempre depois do 03: o módulo público é clone do de desenvolvimento, e o
# roteiro recusa publicar se os dois divergirem.
ords-publicar:  ## clona o módulo validado em api/v1, que serve o link público
	$(DOTENV) $(PY) src/medflow/oracle/executar_sql.py db/ords/04_modulo_medflow_prod.sql

# Mesma varredura dos alvos acima, apontada ao módulo que serve o site. O que
# não foi medido em api/v1 não está provado em api/v1.
reconciliar-publico:  ## amostra contra o módulo público, não o de trabalho
	ORDS_API_PATH=api/v1 \
	  $(DOTENV) $(PY) -m pytest tests/reconciliacao -q -s -k TestReconciliacao

contrato-publico:  ## confere o openapi.yaml contra a API que o site consome
	ORDS_API_PATH=api/v1 $(DOTENV) $(PY) -m pytest tests/test_openapi.py -q

# ---------------------------------------------------------------- limpeza

limpar:  ## remove caches de build e de teste
	rm -rf .pytest_cache .ruff_cache web/dist web/test-results
	find . -name __pycache__ -type d -prune -exec rm -rf {} +

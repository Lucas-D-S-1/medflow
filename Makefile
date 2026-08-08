.DEFAULT_GOAL := help
SHELL := /bin/bash

VENV    := .venv
PY      := $(VENV)/bin/python
UV      := $(shell command -v uv 2>/dev/null)
DOTENV  := $(PY) -m dotenv -f .env run --
# os alvos de frontend rodam dentro de web/, então o .env fica um nível acima
DOTENV_WEB := ../$(PY) -m dotenv -f ../.env run --

.PHONY: help setup bronze silver gold geografia validar inventario test test-py test-web lint web-install web-build web-e2e oracle-ping oracle-carregar limpar

help:  ## lista os alvos disponíveis
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- ambiente

setup: $(VENV)  ## cria o venv e instala o pacote em modo editável, com extras
$(VENV):
ifeq ($(UV),)
	python3 -m venv $(VENV)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -e '.[geografia,notebooks,dev]'
else
	uv venv $(VENV)
	uv pip install --python $(PY) -e '.[geografia,notebooks,dev]'
endif

# ------------------------------------------------------------ pipeline

bronze:  ## ingestão fiel das fontes oficiais
	$(PY) -m medflow.cli bronze

silver:  ## dimensões, fatos e de/paras
	$(PY) -m medflow.cli silver

gold:  ## marts e indicadores
	$(PY) -m medflow.cli gold

geografia:  ## regiões, população e malhas
	$(PY) -m medflow.cli geografia

validar:  ## validação integrada das três camadas contra os contratos
	$(PY) -m medflow.cli validar

inventario:  ## inventário SHA-256 dos artefatos de dados
	$(PY) -m medflow.cli inventario

fixtures:  ## reancora o carimbo da Gold nos snapshots do webapp
	$(PY) scripts/reancorar_fixtures.py

# --------------------------------------------------------------- testes

test: test-py test-web  ## suíte completa: Python e frontend

test-py:  ## pytest
	$(PY) -m pytest -q

lint:  ## ruff
	$(PY) -m ruff check src tests

# -------------------------------------------------------------- frontend

web-install:  ## instala as dependências do frontend
	cd web && npm ci

web-build:  ## typecheck e build de produção
	cd web && npm run build

test-web: web-build  ## build mais a suíte Playwright completa, 31 testes
	cd web && $(DOTENV_WEB) npx playwright test

test-web-ci: web-build  ## só os 29 testes herméticos, sem tocar no Oracle
	cd web && ORDS_BASE_URL=http://127.0.0.1:9 npx playwright test --grep-invert @live

test-web-live:  ## só os 2 testes de integração ao vivo contra o Oracle
	cd web && $(DOTENV_WEB) npx playwright test --grep @live

# ---------------------------------------------------------------- oracle

oracle-ping:  ## confirma a conexão mTLS e mantém o Always Free acordado
	$(DOTENV) $(PY) src/medflow/oracle/testar_conexao.py

oracle-carregar:  ## carga idempotente da Gold no Autonomous Database
	$(DOTENV) $(PY) src/medflow/oracle/carregar_gold.py

# ---------------------------------------------------------------- limpeza

limpar:  ## remove caches de build e de teste
	rm -rf .pytest_cache .ruff_cache web/dist web/test-results
	find . -name __pycache__ -type d -prune -exec rm -rf {} +

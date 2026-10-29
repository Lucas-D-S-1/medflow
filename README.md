# MedFlow: onde investigar primeiro

MVP de análise de dados públicos agregados sobre internações e capacidade
hospitalar declarada em São Paulo. O MedFlow organiza fontes diferentes em
indicadores mensais e permite explorar sinais regionais e hospitalares, com
fonte, amostra e limites metodológicos visíveis.

**Projeto de equipe na FIAP.** Em 24 de outubro de 2026, conquistou o **2º lugar
entre os três finalistas do Enterprise Challenge proposto pela Oracle,
FIAP NEXT 2026**.

[Acesse o site oficial](https://lucas-d-s-1.github.io/medflow/).
O vídeo de apresentação na página inicial inclui cena gerada com IA.
[Assista ao vídeo do próprio site](https://lucas-d-s-1.github.io/medflow/video/medflow.mp4?v=v11.1).

## O problema e a proposta

Gestores e analistas regionais de saúde precisam cruzar bases criadas para
finalidades diferentes antes de decidir onde investigar. O MedFlow oferece
uma jornada de triagem: região → hospital → especialidade ou diagnóstico →
hipótese de investigação. Os indicadores ajudam a formular perguntas e
comparar recortes; a decisão e a ação continuam com as equipes responsáveis.

O recorte registrado na versão do NEXT é o estado de São Paulo, de **janeiro
de 2024 a agosto de 2026**, com **32 competências mensais**. Agosto de 2026 é
a competência mais recente desse recorte, sem promessa de atualização contínua.

## Quatro famílias de fontes públicas

As famílias abaixo agrupam os insumos por função. O número quatro não é uma
contagem de arquivos ou de bases individuais.

| Família | O que fornece |
|---|---|
| Registros públicos de internações | Internações, óbitos, diagnósticos, permanência, valores aprovados e município de residência |
| Cadastro público de estabelecimentos de saúde | Leitos declarados por hospital e mês, além de informações cadastrais dos hospitais |
| Referências do Ministério da Saúde | Regiões de saúde, classificações de diagnósticos, especialidades e condições sensíveis à atenção primária |
| Referências do Instituto Brasileiro de Geografia e Estatística | População de 2022, geografia, natureza jurídica e índice de preços para corrigir valores monetários |

Os nomes técnicos, contratos e referências de origem estão em
[data/README.md](data/README.md),
[contracts/NOMENCLATURA.md](contracts/NOMENCLATURA.md) e
[docs/pesquisa/pesquisa.md](docs/pesquisa/pesquisa.md).

## Arquitetura medalhão

O pipeline usa Python, pandas e PyArrow. Cada camada tem uma responsabilidade:

| Camada | Responsabilidade | Por que separar |
|---|---|---|
| Bronze | Preserva dados e metadados de origem, linhagem e manifesto | Permitir auditoria e reconstrução |
| Prata (Silver) | Padroniza tipos, campos, chaves e domínios; organiza dimensões e fatos; verifica qualidade | Harmonizar fontes antes dos cálculos |
| Ouro (Gold) | Calcula e materializa indicadores e tabelas analíticas | Centralizar fórmulas e evitar resultados divergentes entre consumidores |

```text
Fontes públicas
  → Bronze: origem e linhagem
  → Prata: conformação e qualidade
  → Ouro: indicadores e tabelas analíticas
  → Oracle Autonomous AI Database 26ai Lakehouse
  → Views e API ORDS
  → Interface React, TypeScript e Vite no GitHub Pages
```

A interface apresenta os indicadores persistidos na Ouro. A API de leitura
expõe os recortes analíticos sem transferir o cálculo das métricas ao frontend.
O produto inclui pressão hospitalar estimada, mortalidade, permanência, custo
médio, comparações sazonais, fluxos entre regiões e internações por condições
sensíveis à atenção primária.

Detalhes em [ARQUITETURA.md](ARQUITETURA.md),
[src/medflow/README.md](src/medflow/README.md), [db/README.md](db/README.md)
e [web/README.md](web/README.md).

## FlowIA: perguntas em linguagem natural

Na versão do NEXT, a FlowIA usa Haiku para gerar SQL diretamente para o Oracle
ADB. Um guarda valida o SQL antes da execução. Uma segunda chamada ao modelo
redige a resposta em português a partir do resultado. O contexto da interface
ajuda a interpretar referências como “daqui” e o período selecionado.

O Select AI da Oracle fez parte das etapas anteriores. Seus roteiros e
avaliações permanecem no repositório como histórico técnico. A configuração
do serviço no NEXT evoluiu em relação a esses documentos e aos scripts de
instalação anteriores.

O guarda reduz o alcance da execução, mas não garante que a interpretação ou
a resposta de toda pergunta livre esteja correta. A FlowIA deve respeitar os
limites dos indicadores e do recorte disponível.

## Avaliação e alcance da evidência

A [bateria documentada de 20 perguntas coloquiais e contextuais](docs/flowia/AVALIACAO_20_PERGUNTAS.md)
foi consolidada em 29/08/2026, após correções, a partir de **quatro rodadas e
uma regressão final dos 11 casos já aprovados**. Todos os 20 casos foram
aprovados nesse processo. O resultado não representa uma execução única com
20 acertos, nem uma nova validação completa do caminho Haiku adotado no NEXT.

Quando havia resposta objetiva, o SQL gerado era comparado com uma consulta
convencional de referência sobre a mesma Ouro, conferindo também os rótulos
essenciais da resposta. Nos outros casos, avaliava-se a recusa de afirmações
indevidas ou a explicação correta do limite do dado.

Por exemplo, para “qual hospital tá mais cheio hoje?”, o comportamento aprovado
era explicar a ausência de ocupação em tempo real e oferecer o índice mensal
de pressão hospitalar com sua ressalva. Esta descrição é uma paráfrase do
critério de avaliação.

Há também uma [avaliação histórica de 13 casos técnicos do Select AI](docs/flowia/REVALIDACAO_SELECT_AI.md)
e [testes de reconciliação entre API e Ouro](tests/reconciliacao/README.md).
Essas evidências têm datas e escopos próprios. Elas não demonstram acurácia
universal da assistente nem impacto operacional medido em hospitais.

## Limites para interpretar os resultados

- Os dados são administrativos, públicos e agregados. Um registro de internação não equivale necessariamente a uma pessoa única, e há limitações de cobertura e registro.
- As competências recentes podem ser reapresentadas e reprocessadas. Leitos declarados por mês não representam disponibilidade operacional ao vivo.
- O Índice de Pressão Hospitalar (IPH) usa pacientes-dia e leitos-dia declarados para estimar pressão. Ele não mede ocupação real.
- Os registros cobrem atendimentos realizados em São Paulo. Não mostram residentes paulistas atendidos em outros estados.
- Os indicadores apoiam triagem e investigação. Não provam causalidade, qualidade, ineficiência ou impacto de gestão. O MVP não faz previsão, decisão automática, regulação ou prescrição.
- O site depende da API Oracle. Quando ela está indisponível, snapshots identificados como contingência preservam algumas visões, com o recorte limitado ao snapshot.

## Explorar e executar

| Pasta | Conteúdo |
|---|---|
| [src/medflow/](src/medflow/README.md) | Pipeline e carga no Oracle |
| [db/](db/README.md) | Schema, views e módulos ORDS |
| [web/](web/README.md) | Interface pública |
| [contracts/](contracts/README.md) | Contratos dos dados e da API |
| [tests/](tests/README.md) | Testes de fórmulas, contratos e integrações |
| [docs/](docs/README.md) | Pesquisa, decisões, avaliações e entregas datadas |
| [notebooks/](notebooks/README.md) | Leitura narrada do pipeline |

Pré-requisitos: Git, Make, Python 3.12+ e Node.js 24. `uv` é recomendado.
Para preparar o ambiente e executar a suíte local sem credenciais:

```bash
git clone https://github.com/Lucas-D-S-1/medflow.git
cd medflow
make setup
make test
```

Os testes que dependem de dados materializados podem ser pulados num clone
limpo. Integrações ao vivo e reconciliações têm alvos próprios, descritos em
[tests/README.md](tests/README.md). A execução do pipeline, suas fontes e o
armazenamento necessário estão em [data/README.md](data/README.md).

## English overview

MedFlow is a FIAP team project for exploring aggregated public data on hospital
admissions and declared hospital capacity in São Paulo, Brazil. It placed
second among the three finalists in the Oracle-proposed Enterprise Challenge
at FIAP NEXT 2026. The NEXT data scope spans January 2024 through August 2026.

A Python medallion pipeline feeds Oracle 26ai and an ORDS API, consumed by a
React interface. FlowIA uses Haiku to generate SQL, validates it before
execution, and writes a Portuguese answer from the results. The documented
20-question evaluation predates this NEXT integration and combines multiple
rounds. Monthly indicators support investigation and do not measure real-time
occupancy or establish clinical quality or causality.

[Visit the official site](https://lucas-d-s-1.github.io/medflow/).

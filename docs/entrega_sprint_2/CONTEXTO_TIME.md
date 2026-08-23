# Dossiê de contexto — Challenge Oracle / MedFlow — Sprint 2

## 1. Natureza e escopo do dossiê

Este documento consolida o contexto oficial, de negócio, analítico e técnico do MedFlow para a Sprint 2 do Challenge Oracle. Sua função é registrar o que precisa permanecer coerente entre os entregáveis e oferecer uma visão completa do estado da solução.

O dossiê não define formato, narrativa ou execução de vídeo, slides, apresentação ou demonstrações. Não contém roteiro, cronograma de fala, sequência de slides, ordem de cliques, respostas prontas, checklist operacional, divisão adicional de trabalho nem recomendações criativas. Essas decisões pertencem às pessoas responsáveis por cada entregável.

As regras da FIAP são apresentadas como requisitos oficiais. As demais afirmações descrevem o produto, suas evidências, suas limitações e o estado factual registrado nas fontes internas. Em caso de divergência histórica de números, o recorte vigente é **2024-01 a 2026-06, com 30 competências**, conforme `README.md` e `VALIDACAO_TECNICA.md`.

## 2. Regras e critérios FIAP

### Prazo, arquivos e forma de entrega

- Prazo: **01/09/2026 às 23h59**.
- Planilha final: `Informacoes_Finais_Projeto_Integrantes_v1.xlsx`.
- PPT fonte: `EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.pptx`.
- Entrega no portal **FIAP ON**: **um único arquivo ZIP**.
- Vídeo hands-on: publicação no **YouTube**, duração de **até 5 minutos** e link incluído no PPT.

### Conteúdos obrigatórios

O material oficial da Sprint 2 exige:

- planejamento da Sprint 1 atualizado;
- MVP funcional e delimitação de escopo;
- arquitetura final com distinção entre o que está implementado e o que está planejado;
- modelos analíticos e técnicas empregadas;
- evidências visuais;
- repositório técnico e código-fonte;
- aplicação ou relatório com link navegável;
- resultados, conclusão e próximos passos;
- PPT final, vídeo hands-on e planilha final de integrantes.

Esses requisitos determinam **o que** os entregáveis precisam conter ou demonstrar. O material oficial não determina como a equipe deve montar, filmar, ordenar, dividir cenas ou slides, nem conduzir a apresentação.

### Pesos

| Item avaliado | Peso | Objeto da avaliação |
|---|---:|---|
| **PPT** | **10%** | registro final do problema, persona, proposta, arquitetura, evidências, resultados, limites e conclusão |
| **Vídeo** | **10%** | evidência hands-on de uma solução funcional, dentro do limite de duração e com relação compreensível entre problema, produto e dados |
| **Link público** | **10%** | produto ou relatório acessível e funcionando |
| **GitHub** | **20%** | repositório técnico completo, código-fonte, organização, documentação e evidências |
| **Avaliação técnica / apresentação** | **50%** | domínio coletivo do problema, da solução, das técnicas, dos dados, da arquitetura, dos resultados e das limitações |

### Critérios de avaliação registrados nas fontes oficiais

- clareza do problema e aderência à persona;
- uso intencional de dado relacional, JSON e CSV/External Table;
- valor para priorizar ações, regiões ou investimentos;
- storytelling simples;
- perguntas úteis em linguagem natural;
- produto e link funcionando;
- repositório técnico completo;
- domínio coletivo da solução na apresentação.

No MedFlow, os três formatos de dados têm papéis distintos e intencionais:

| Formato | Fonte ou representação | Papel no projeto |
|---|---|---|
| **Relacional** | SIH/RD, dimensões, fatos e tabelas Gold | modelagem, indicadores, consultas, carga no schema `MEDFLOW` e publicação por views |
| **JSON** | APIs oficiais, especialmente o cadastro atual do CNES | preservação de respostas semiestruturadas e enriquecimento de atributos variáveis dos estabelecimentos |
| **CSV / External Table** | regiões de saúde e população IBGE 2022, em referência oficial do Ministério da Saúde | geografia, taxas populacionais, reconciliação de referências e integração compatível com Oracle |

As técnicas implementadas abrangem análise exploratória, modelagem dimensional, séries mensais, comparação sazonal, benchmarking, matriz origem–destino, indicadores hospitalares e territoriais, contratos de dados e reconciliação campo a campo. Machine learning, clustering preditivo e previsão não fazem parte do MVP.

## 3. Estado atual e links

### Links

- Repositório: https://github.com/Lucas-D-S-1/medflow
- WebApp: https://lucas-d-s-1.github.io/medflow/regional?regiao=35163
- Raiz pública do WebApp: https://lucas-d-s-1.github.io/medflow/
- Instalação: https://github.com/Lucas-D-S-1/medflow/blob/main/HOW_TO_INSTALL.md

### Estado factual registrado

| Componente ou entregável | Estado documentado |
|---|---|
| Pipeline Bronze/Silver | reproduzível e validado para 2024-01 a 2026-06 |
| Indicadores e Gold | implementados, contratados e validados |
| Oracle Autonomous AI Database | provisionado, carregado e reconciliado |
| WebApp | quatro visões concluídas e revisadas; produto publicado |
| Link público | concluído em 16/08/2026 e servido pelo módulo ORDS `api/v1` |
| Validação do produto | 8.403.103 comparações campo a campo, sem divergências |
| Select AI | roteiro de 13 perguntas revalidado em 23/08/2026; oito têm SQL de referência executado, seis coincidiram exatamente e os limites restantes estão documentados |
| GitHub | versão pública `v0.3.0` registrada; hardening posterior em `v0.3.1 — em andamento` |
| Disponibilidade | heartbeat diário ativo; `make preflight` confere o produto publicado antes da banca |
| PPT, vídeo, planilha e ZIP | continuam pendentes; os arquivos finais ainda não estão neste workspace |

O recorte avançou de 29 para 30 competências em 09/08/2026. Os números vigentes já refletem junho de 2026; referências antigas a 2026-05, 585.296 linhas Oracle, 653 hospitais ou 8.257.139 comparações descrevem estados históricos, não o produto atual.

## 4. Síntese da solução

O MedFlow integra dados administrativos públicos do SIH/SUS, CNES, Ministério da Saúde/DATASUS e IBGE para apoiar gestores e analistas regionais de saúde de São Paulo. O produto transforma fontes com finalidades e temporalidades diferentes em uma leitura mensal, rastreável e comparável da demanda dos residentes, da produção dos hospitais, dos fluxos assistenciais, das condições sensíveis à atenção primária e de sinais hospitalares.

Um pipeline reproduzível preserva as fontes na Bronze, conforma conceitos na Silver e calcula indicadores na Gold. A Gold validada é carregada no Oracle Autonomous AI Database 26ai Lakehouse, projetada por views e publicada por dez endpoints ORDS somente leitura. Quatro visões React/Vite apresentam os valores persistidos sem recalcular métricas. O Select AI acrescenta linguagem natural de maneira controlada e subordinada ao SQL de referência.

O resultado é um MVP tecnicamente validado para triagem e formulação de hipóteses de investigação. Não é um sistema em tempo real, mecanismo de previsão, medida de ocupação real, prontuário, ferramenta de regulação, prova de causalidade ou substituto do contexto local. A utilidade, a adoção e o impacto ainda não foram medidos com usuários reais.

## 5. Problema, evidências e público

### Problema estrutural

Gestores e analistas regionais precisam combinar bases e conceitos distintos para separar:

- **demanda dos residentes:** internações de pessoas que moram no território e foram atendidas em hospitais de São Paulo;
- **produção hospitalar:** internações realizadas pelos hospitais do território;
- **fluxos assistenciais:** origem de residência e destino do atendimento;
- **ICSAP:** sinal populacional indireto relacionado à atenção primária;
- **sinais hospitalares:** pressão estimada, mortalidade observada, permanência, valor aprovado e comparação com benchmark.

Sem uma leitura integrada, cresce o esforço necessário para localizar regiões e hospitais que merecem investigação e para distinguir oferta, demanda, deslocamento, capacidade declarada e resultado administrativo.

### Evidência de que o problema existe

O problema estrutural é sustentado por fontes externas e por evidência técnica do próprio projeto:

- políticas nacionais de informação e saúde digital tratam integração, interoperabilidade, governança, análise e disseminação de dados como necessidades públicas;
- a RNDS formaliza a integração e a interoperabilidade entre estabelecimentos e entes do sistema;
- SIH, CNES, população e outras informações permanecem distribuídos em domínios e sistemas com finalidades próprias;
- regionalização, oferta, demanda, capacidade instalada e deslocamentos são elementos reconhecidos no planejamento do SUS;
- a lista brasileira de ICSAP constitui referência oficial para análise territorial da atenção primária e do uso hospitalar;
- literatura e soluções comparáveis reconhecem painéis, benchmarking e salas de situação como categorias úteis para transformar dados em informação de gestão;
- o pipeline confirmou que as fontes podem ser integradas em um recorte real, com contratos e reconciliações reproduzíveis.

Essa evidência sustenta a existência da fragmentação e a coerência técnica entre problema e solução. Ela não prova que o MedFlow seja a única ou a melhor solução, nem que a jornada proposta corresponda exatamente ao trabalho cotidiano de toda pessoa da persona.

### Limite da validação primária

O projeto não realizou entrevistas, observação de campo, teste de usabilidade ou piloto antes/depois com usuários reais. Portanto, permanecem não comprovados:

- a frequência e a forma exatas com que a persona executa hoje essa análise;
- a superioridade da combinação de indicadores diante das ferramentas já usadas;
- a compreensão autônoma de TMH, IPR e IPH;
- redução de tempo, erro, retrabalho ou esforço;
- mudança de decisão, adoção recorrente ou impacto assistencial.

O que está comprovado é a viabilidade e a consistência técnica do MVP no recorte validado. Utilidade e impacto são uma fronteira de evidência futura, não um resultado já obtido.

### Persona e público-alvo

O público principal é o **gestor ou analista regional de saúde de São Paulo** que precisa priorizar investigações territoriais e hospitalares a partir de dados administrativos públicos. Equipes hospitalares e técnicas também podem usar o aprofundamento como apoio. O produto não substitui prontuário, regulação, censo de leitos, auditoria clínica ou conhecimento local.

### Job to be done

> Quando recebo uma nova competência dos dados públicos hospitalares, quero localizar rapidamente regiões e hospitais com sinais fora do seu histórico ou dos seus pares, entender o recorte que concentra o sinal e levar uma hipótese documentada para investigação com a equipe local.

### Decisão apoiada

O MedFlow apoia a decisão sobre **onde investigar primeiro, qual recorte aprofundar e quais dados levar para a conversa local**. A decisão final e a definição de ações permanecem com as equipes responsáveis.

### Jornada analítica do produto

1. **Região:** localização de um sinal agregado, de sua tendência, amostra e recorte temporal.
2. **Hospital:** identificação de onde o sinal regional se concentra.
3. **Especialidade ou CID:** decomposição do sinal e comparação com amostra ou benchmark elegível.
4. **Hipótese:** formulação de uma pergunta verificável para investigação com contexto local.

Essa é uma estrutura conceitual do produto, não uma ordem obrigatória de apresentação ou demonstração.

## 6. Nome, proposta de valor e limites do MVP

### Nome MedFlow

**MedFlow não é uma sigla e não possui expansão letra por letra.** É um nome de marca composto por duas ideias:

- **Med** remete à saúde e ao contexto médico-hospitalar;
- **Flow** remete tanto ao fluxo do dado pelas camadas quanto ao fluxo assistencial entre territórios.

### Proposta de valor

O MedFlow transforma bases públicas administrativas em uma jornada auditável de triagem — **região → hospital → especialidade/diagnóstico → hipótese de investigação** — preservando fonte, amostra, benchmark e limitações.

### Diferenciais defensáveis

- integração reproduzível de SIH/RD, CNES/LT, referências do MS/DATASUS e IBGE;
- separação explícita entre residência, produção e deslocamento;
- continuidade analítica entre sinal regional, hospital, especialidade e CID;
- benchmark hospital/CID regional que exclui o próprio hospital;
- fórmulas, denominadores, amostras, estados nulos e limitações próximos ao dado;
- Oracle como armazenamento e serving, com ORDS e Select AI no mesmo ambiente governado;
- link público sem licença de BI e contingência identificada;
- reconciliação entre camadas, Oracle, API e conteúdo exibido;
- código, contratos e trilha de dados auditáveis.

### Escopo funcional do MVP

- triagem mensal territorial e hospitalar;
- quatro visões navegáveis;
- indicadores calculados e persistidos na Gold;
- API pública somente leitura;
- rastreabilidade até fontes, contratos e fórmulas;
- roteiro controlado de 13 perguntas de linguagem natural no ambiente Oracle,
  com cinco blocos de dificuldade e oito referências executáveis.

### Limites do MVP

O MVP não inclui:

- tempo real, previsão, machine learning, decisão ou prescrição automática;
- ocupação real ou disponibilidade operacional de leitos;
- custo contábil completo;
- ajuste de risco clínico ou inferência causal;
- prontuário, regulação ou análise individual;
- observação de residentes paulistas internados fora do estado;
- prova de impacto, adoção ou ganho de produtividade;
- Power BI.

## 7. Escopo, fontes e limitações administrativas

| Item | Recorte vigente |
|---|---|
| Território | Estado de São Paulo |
| Período | 2024-01 a 2026-06 |
| Periodicidade | 30 competências mensais; 2026 é parcial até junho |
| Hospitalizações | SIH/SUS, arquivos RD-SP |
| Capacidade declarada | CNES/LT |
| Referências | Ministério da Saúde/DATASUS e IBGE |
| Geografia | 645 municípios, 62 regiões de saúde e 19 macrorregiões |
| Natureza do dado | dados administrativos públicos, agregados no produto |

### Fontes e papéis

| Fonte | Conteúdo utilizado | Papel analítico |
|---|---|---|
| **SIH/SUS — RD-SP** | AIHs, internações novas, óbitos, diagnósticos, permanência, valores e residência | produção hospitalar, demanda residente, indicadores hospitalares e fluxos observados em São Paulo |
| **CNES/LT** | leitos SUS declarados por estabelecimento e competência | denominador de capacidade declarada do IPH e caracterização hospitalar |
| **MS/DATASUS** | regiões de saúde, CID-10, especialidades e lista normativa de ICSAP | conformação de domínios, territorialidade e classificação |
| **IBGE** | população 2022, geografia, natureza jurídica e IPCA | taxas populacionais, mapa, domínio cadastral e correção monetária |

### Limitações administrativas e temporais

- AIH é unidade administrativa e não equivale necessariamente a uma pessoa única.
- O SIH foi criado para processamento e pagamento; variáveis clínicas podem apresentar sub-registro ou limitações.
- Competências recentes podem sofrer apresentação retroativa, reapresentação e reprocessamento.
- CNES/LT representa capacidade declarada mensal, não disponibilidade operacional em tempo real.
- Nome e esfera enriquecidos são atributos cadastrais atuais, não fotografias históricas de cada competência.
- O RD-SP observa atendimentos realizados em São Paulo, mas não saídas de residentes para hospitais de outras UFs.
- Diagnósticos administrativos não substituem informação clínica individual.
- Comparações orientam triagem e exigem amostra, benchmark e contexto local.

## 8. Arquitetura end-to-end

~~~mermaid
flowchart LR
    F["SIH/RD + CNES/LT<br/>MS/DATASUS + IBGE"] --> B["Bronze<br/>preservação e rastreabilidade"]
    B --> S["Silver<br/>tipagem e conformação"]
    S --> G["Gold<br/>indicadores e marts"]
    G --> O["Oracle 26ai Lakehouse<br/>schema MEDFLOW"]
    O --> A["views + ORDS<br/>api/v1 GET"]
    A --> W["WebApp React/Vite<br/>GitHub Pages"]
    O --> Q["Select AI<br/>linguagem natural controlada"]
    A -. indisponibilidade .-> C["Snapshot local<br/>contingência rotulada"]
    C --> W
~~~

O princípio arquitetural é a responsabilidade única por etapa: Bronze preserva, Silver harmoniza, Gold calcula, Oracle armazena, views projetam, ORDS expõe e o WebApp apresenta. Notebooks registram exploração e análise, enquanto o pacote Python é o motor oficial do pipeline.

### Implementado versus planejado ou futuro

| Estado | Elementos |
|---|---|
| **Implementado no MVP** | fontes → Bronze → Silver → Gold; dimensões e marts; carga no Oracle 26ai Lakehouse; schema `MEDFLOW`; views; ORDS `api/v1`; WebApp público; snapshots de contingência; Select AI com profile e roteiro revalidável de 13 perguntas; contratos e reconciliações |
| **Demonstração opcional** | backend PL/SQL e runbook da página APEX; o workspace e a página visual ainda precisam ser montados com acesso `ADMIN` |
| **Evidência futura, fora da arquitetura implementada** | validação primária com usuários para medir compreensão, utilidade, adoção, tempo, erro e impacto |
| **Fora do MVP, sem implementação alegada** | tempo real, previsão, machine learning, clustering, decisão automática, prontuário, regulação, censo operacional de leitos e custo contábil completo |

Nenhum componente do fluxo principal do diagrama é apresentado como meramente planejado. Os itens futuros dizem respeito à ampliação de evidência ou a capacidades fora do escopo atual.

## 9. Bronze, Silver e Gold

| Camada | Entradas | Transformações ou responsabilidades | Saídas vigentes | Importância |
|---|---|---|---|---|
| **Bronze** | arquivos SIH/RD, CNES/LT e referências oficiais em formatos originais ou respostas preservadas | descoberta das competências, download e cache incremental, conversão fiel para Parquet, linhagem técnica, manifesto e SHA-256; sem regra de negócio | 7.284.476 linhas SIH/RD, 251.457 linhas CNES/LT e referências oficiais preservadas | mantém proveniência, permite auditoria e torna o processo reconstruível |
| **Silver** | somente dados preservados e validados na Bronze | tipagem, nomes canônicos, de/paras, chaves, dimensões, fatos, geografia e qualidade; separação de AIH aprovada, internação nova e continuação | 6 dimensões e 2 fatos; fato de internação com 7.284.476 linhas, fato mensal de leitos com 19.341 linhas e dimensão municipal com 645 municípios | cria linguagem comum, resolve domínios e evita limpeza ou joins divergentes por indicador |
| **Gold** | somente estruturas contratadas da Silver | fórmulas, denominadores, amostras, benchmarks, fluxos, ICSAP, IPCA e agregações geográficas | 2 dimensões geográficas e 7 marts; 597.725 linhas carregadas no Oracle | constitui a fonte semântica única dos valores consumidos pelo banco, pela API e pelas telas |

### Bronze

A Bronze preserva DBC, usa DBF como cache intermediário, serializa o conteúdo em Parquet sem filtro, imputação ou de/para e acrescenta apenas atributos técnicos de arquivo e competência. Também preserva as respostas e os arquivos oficiais usados para município, região, CID-10, IPCA, natureza jurídica, cadastro atual dos estabelecimentos, população e malha geográfica.

### Silver

A Silver tipa os campos analíticos, documenta e aplica os de/paras, preserva `N_AIH`, `IDENT` e `COD_IDADE`, distingue `QT_DIARIAS` de `DIAS_PERM`, associa município a região e macrorregião oficiais e mantém explícita a natureza atual dos atributos cadastrais de hospital. Agregações usam ausência como categoria quando aplicável e os totais são reconciliados.

Suas saídas centrais são seis dimensões — tempo, hospital, município, especialidade, CID e domínios — e dois fatos: internação e leito mensal.

### Gold

A Gold materializa sete marts:

| Mart | Grão ou conteúdo | Indicadores e usos |
|---|---|---|
| `mart_indicador_hospital_mensal` | hospital × competência | IPH, TMH, CMI nominal/real, permanência e amostra |
| `mart_indicador_hospital_especialidade_mensal` | hospital × especialidade × competência | TMH, CMI, permanência e amostra por especialidade |
| `mart_indicador_hospital_cid_periodo` | hospital × CID × período | IPR, permanência hospitalar, benchmark regional e elegibilidade |
| `mart_indicador_regiao_mensal` | região × competência | demanda, produção, pressão, sazonalidade, fluxos, ICSAP, mortalidade, valor e permanência |
| `mart_indicador_regiao_periodo` | região × período | distribuição das combinações e do IPR elegível |
| `mart_fluxo_assistencial_regiao_mensal` | origem de residência × destino × competência | volume e participação dos fluxos intrarregionais, inter-regionais e de outras UFs |
| `mart_icsap_regiao_mensal` | região de residência × grupo ICSAP × competência | volume, composição e taxa dos 19 grupos oficiais |

As dimensões geográficas e os ativos GeoJSON/TopoJSON sustentam a leitura municipal e regional. Indicadores não são recalculados depois da Gold.

## 10. Oracle 26ai Lakehouse, ORDS e API

### Banco e modelo

- Oracle Autonomous AI Database **26ai**, workload **Lakehouse**, na região de São Paulo;
- banco `MEDFLOW` com conexão mTLS obrigatória;
- schema de aplicação **`MEDFLOW`**, separado do usuário `ADMIN`;
- **9 tabelas:** 2 dimensões e 7 marts;
- 175 colunas comentadas e 10 índices secundários no modelo registrado;
- **597.725 linhas** carregadas no recorte vigente;
- 36 de 36 métricas do gate Oracle com estado `ok` e seis gates de integridade vazios;
- views de projeção pura, sem recálculo de indicadores.

### ORDS e módulos

O ORDS publica **10 endpoints**, todos `GET`. O módulo de desenvolvimento é `api/dev/v1`; o módulo público é `api/v1`, consumido pelo GitHub Pages. A produção foi criada a partir dos metadados do módulo de desenvolvimento e possui verificações de contrato. Nenhuma tabela Gold é publicada diretamente por AutoREST.

| Grupo | Endpoints | Conteúdo |
|---|---|---|
| Saúde e método | `GET /status`; `GET /metodologia` | disponibilidade, recorte, fórmulas, cobertura, cortes e limitações |
| Regional | `GET /regioes/resumo`; `GET /regioes/{id}/serie` | resumo das 62 regiões e série mensal |
| Fluxos e APS | `GET /fluxos`; `GET /icsap` | origem–destino e grupos ICSAP por residência |
| Hospital | `GET /hospitais`; `GET /hospitais/{cnes}/serie`; `GET /hospitais/{cnes}/especialidades`; `GET /hospitais/{cnes}/cids` | lista, série, especialidades e IPR por diagnóstico |

### Segurança

- o módulo público é somente leitura;
- o CORS de produção aceita a origem do GitHub Pages e rejeita origens não autorizadas;
- a conexão administrativa usa mTLS;
- wallet, senhas e arquivos `.env` permanecem fora do Git;
- o Select AI usa OCI Resource Principal, sem chave externa no código;
- contratos e testes verificam OpenAPI, SQL dos handlers e respostas da API;
- ausência legítima, parâmetro inválido, erro e indisponibilidade permanecem estados distintos.

O Autonomous Always Free pode hibernar por inatividade. O workflow `.github/workflows/heartbeat.yml` consulta diariamente o `/status`, uma linha real dos marts e o GitHub Pages; a chamada ao ORDS executa SQL e mantém a instância ativa. Ele não acorda um banco já parado. Antes da banca, `make preflight` executa doze verificações pelo mesmo caminho público usado pelo avaliador.

### Contingência

Cada área funcional dispõe de snapshot local compatível. Quando o Oracle está indisponível, a interface identifica a origem como **“Snapshot de contingência”**, conserva o recorte do snapshot e não mistura dados locais com dados ao vivo. Quando a API responde, a origem é identificada como **“Oracle ao vivo”**.

O snapshot preserva acesso às visões, mas não equivale a API ao vivo, segundo ambiente operacional ou recorte alternativo.

## 11. Select AI

### Papel no projeto

Select AI é a capacidade do Oracle de converter uma pergunta em linguagem natural em SQL e, opcionalmente, narrar o resultado. No MedFlow, funciona como uma camada controlada de acesso ao modelo Gold e como recurso de explicabilidade. Não é chat público, não alimenta o WebApp e não substitui Gold, contratos ou SQL validado.

O profile `MEDFLOW_GENAI` usa OCI Generative AI por Resource Principal e foi ampliado para nove objetos do schema de aplicação.

### Processo técnico de validação

O processo registrado para cada pergunta é:

1. execução e preservação do **SQL convencional de referência**;
2. execução em modo **`showsql`** para inspeção do SQL gerado;
3. comparação de filtros, agregações, recortes, ordenação e limite com a referência;
4. execução em modo **`narrate`** somente após a coerência do SQL;
5. rejeição do resultado quando o SQL diverge ou a narrativa ultrapassa a metodologia.

O encadeamento técnico é **SQL de referência → `showsql` → comparação → `narrate`**. A resposta narrativa não é a fonte da verdade.

### Roteiro registrado

O roteiro atual tem **13 perguntas em cinco blocos**: leitura direta, junções
entre marts, armadilhas de vocabulário/recorte/tempo real, conversação e a
comparação entre `chat` e `narrate`. Oito perguntas têm SQL de referência e são
comparadas por execução, usando a sequência ordenada dos rótulos de negócio.
As cinco perguntas originais continuam no bloco A; o roteiro ampliado está em
`src/medflow/select_ai/perguntas.py`.

### Estado de validação

Na execução de 23/08/2026, **seis das oito perguntas com referência coincidiram
exatamente**. As duas divergências repetem uma limitação do modelo: ele ordena
linhas mensais antes de agregar por território ou hospital. Também foram
medidos dois limites narrativos: aceitar “ocupação” quando a pergunta usa o
termo incorreto e perder o contexto no turno seguinte. As recusas de tempo real
e de um estado fora do recorte funcionaram. Esses resultados sustentam o uso
do Select AI como demonstração controlada, não como chat público.

## 12. WebApp

O WebApp usa React 19, TypeScript e Vite e está publicado no GitHub Pages. As quatro visões consomem valores prontos da API; o frontend aplica formatação com `Intl`, sem fórmulas analíticas, faixas ou cortes próprios.

| Visão | Pergunta respondida | Conteúdo disponível | Significado para o usuário |
|---|---|---|---|
| **Regional** | Onde existe um sinal que merece investigação? | competência, macrorregião, região, mapa de IPH por percentis, métricas, série e ranking com amostra | permite localizar variação territorial e temporal sem converter sinal em conclusão de desempenho |
| **Fluxos** | A população é atendida no próprio território e para onde se desloca? | região de residência e destino, atendimento próprio, evasão intrastadual observada, atração, taxa residente, matriz origem–destino e ICSAP | separa demanda residente de produção e contextualiza dependência, referência e oferta regional |
| **Hospital** | Em quais hospitais, especialidades ou diagnósticos o sinal se concentra? | hospitais da região, série mensal, especialidades e CIDs elegíveis para IPR | aprofunda volume, tendência, mortalidade, valor e permanência com recorte e amostra |
| **Metodologia** | Qual é a origem do número e quais são seus limites? | cobertura, competência mais recente, fórmulas, cortes, flags, estados nulos, reconciliações, fontes e limitações | torna rastreáveis a definição, a elegibilidade e a interpretação dos indicadores |

As visões preservam filtros relevantes por URL e distinguem ausência legítima, falha de endpoint e contingência. O link profundo no GitHub Pages abre a aplicação, embora o servidor estático possa responder HTTP 404 antes de entregar o `index.html`, comportamento documentado de SPA nessa hospedagem.

## 13. Catálogo de indicadores e medidas

| Indicador ou medida | Fórmula ou resumo | Uso analítico | Limites |
|---|---|---|---|
| **Internações novas / produção** | contagem de registros `IDENT=1` realizados por hospital ou região de atendimento | dimensiona volume produzido e serve de denominador para indicadores hospitalares | não equivale a pessoas únicas; não representa demanda dos residentes do território |
| **Demanda residente observada** | internações de residentes da região atendidos em hospitais de SP | separa necessidade territorial observada de produção hospitalar | não inclui residentes atendidos fora de SP |
| **Taxa de internação residente** | demanda residente observada ÷ população IBGE 2022 × 100 mil | compara regiões com populações diferentes | população é referência censitária; não mede utilização total fora do recorte RD-SP |
| **Atendimento na própria região** | residentes atendidos na região de residência ÷ residentes da região atendidos em SP × 100 | descreve a parcela intrarregional observada | referência regional pode ser esperada; percentual não constitui meta de autonomia |
| **Evasão intrastadual observada** | residentes atendidos em outra região paulista ÷ residentes da região atendidos em SP × 100 | identifica dependência e deslocamento dentro do estado | não inclui saídas para outras UFs e não prova falha de oferta ou qualidade |
| **Atração assistencial** | atendimentos de residentes de fora da região ÷ internações realizadas na região × 100 | caracteriza o papel de referência de uma região | inclui origens externas ao território; não mede qualidade nem adequação do encaminhamento |
| **Fluxo assistencial** | matriz região de residência × região de atendimento, com volumes e participações por origem e destino | mostra caminhos intrarregionais, inter-regionais e entradas de outras UFs | registra atendimento realizado em SP; deslocamento exige contexto de especialidade e oferta |
| **ICSAP** | CIDs classificados pela Portaria 221/2008; contagem, participação nas internações residentes, taxa por 10 mil e composição em 19 grupos | oferece sinal populacional indireto para planejamento da atenção primária | não prova evitabilidade individual, falha da APS ou causalidade |
| **TMH — Taxa de Mortalidade Hospitalar** | óbitos em internações novas ÷ internações novas × 100 | compara série, especialidade e pares quando há amostra suficiente | não possui ajuste de risco; não prova causalidade ou qualidade assistencial |
| **Permanência média** | soma dos dias de permanência ÷ internações novas | descreve uso administrativo de recursos e sustenta o IPR | sofre influência de perfil de casos e não é desfecho de qualidade isolado |
| **IPR — Índice de Permanência Relativa** | permanência média do hospital/CID ÷ permanência média regional do mesmo CID, excluído o próprio hospital | aprofunda diagnóstico contra benchmark elegível | exige ao menos 20 internações no hospital/CID e benchmark de 50 internações em pelo menos 3 hospitais; case mix pode diferir |
| **CMI nominal — valor médio aprovado** | soma do valor aprovado das internações novas ÷ internações novas | contextualiza valor administrativo por hospital, especialidade, região e período | não é custo contábil, custo completo ou margem hospitalar; continuações ficam separadas |
| **CMI real** | valor aprovado nominal corrigido pelo fator IPCA ÷ internações novas, com competência de preço registrada | permite comparação temporal em reais constantes dentro do contrato | continua sendo valor aprovado, não custo; depende da referência de IPCA adotada |
| **IS — Índice de Sazonalidade** | internações novas de um mês de 2026 ÷ média do mesmo mês em 2024 e 2025 | compara o mês atual com dois anos-base equivalentes | é comparação sazonal curta, não previsão nem modelo sazonal definitivo; 2026 é parcial |
| **IPH — Índice de Pressão Hospitalar** | pacientes-dia reconstruídos ÷ leitos-dia SUS declarados; também expresso em percentual | localiza incompatibilidade ou pressão estimada em hospital e região | não é ocupação real; leitos são capacidade declarada mensal; valores acima de 100% são mantidos como sinal de incompatibilidade |
| **Distribuição regional do IPR** | contagem e participação das combinações hospital/CID elegíveis por posição relativa ao benchmark | resume a presença regional de permanências relativas acima, próximas ou abaixo da referência | depende dos cortes de elegibilidade e não permite julgamento causal da região |

Regras semânticas transversais já incorporadas ao produto incluem denominador nulo em vez de divisão por zero, preservação de ausência distinta de zero, classificação separada para amostra insuficiente e identificação de 2026 como período parcial até junho.

## 14. Evidências e números

### Volumetria e cobertura

| Evidência | Valor vigente | Significado |
|---|---:|---|
| Competências | **30** | meses de 2024-01 a 2026-06 |
| AIHs aprovadas | **7.284.476** | linhas SIH/RD preservadas e conformadas |
| AIHs distintas | **7.155.059** | identificadores administrativos distintos `N_AIH` |
| Internações novas | **7.150.693** | registros `IDENT=1` usados nas métricas principais |
| Continuações de longa permanência | **133.783** | registros `IDENT=5`, tratados separadamente |
| Linhas CNES/LT | **251.457** | registros de capacidade declarada preservados na Bronze |
| Hospitais | **655** | estabelecimentos observados no recorte |
| Municípios | **645** | cobertura municipal integral de São Paulo |
| Regiões de saúde | **62** | unidade territorial principal |
| Macrorregiões | **19** | agrupamento territorial |
| CIDs observados | **9.513** | códigos presentes no recorte vigente |
| Residentes de SP observados | **7.089.959** | internações de residentes paulistas atendidos em SP |
| Internações ICSAP | **988.453** | internações residentes classificadas nos 19 grupos oficiais |
| Deslocamentos inter-regionais | **939.143** | saídas e entradas entre regiões paulistas, reconciliadas |
| Linhas Oracle | **597.725** | 2 dimensões e 7 marts carregados |

### Evidências de validação

| Evidência | Resultado | Alcance da evidência |
|---|---:|---|
| Contratos Bronze, Silver e Gold | aderentes | schemas, colunas, fórmulas e invariantes das camadas |
| Reconciliação Oracle | **36/36 `ok`** | carga e métricas do banco contra o contrato vigente; seis gates de integridade vazios |
| Reconciliação completa produto × Gold | **8.403.103 comparações; 0 divergências** | conteúdo servido comparado campo a campo e posicionalmente com os marts |
| Contrato público `api/v1` | **42 verificações aprovadas** | correspondência do OpenAPI com o módulo público |
| Reconciliação pública | **31.792 comparações** | amostra do conteúdo publicado contra a Gold |
| Testes do frontend | DOM conferido com Playwright | valores renderizados confrontados com dados Gold e estados de erro/ausência/contingência |
| Select AI | **13 perguntas; 8 com referência; 6 coincidências exatas** | comparação por execução e limites de ranking, narrativa e conversação documentados em 23/08/2026 |

Zero divergência comprova consistência técnica no recorte, nos campos e no método testados. Não comprova completude clínica, impacto, causalidade, adoção ou utilidade para usuários.

### Evidências de funcionalidade

| Evidência | Estado | O que existe no MVP |
|---|---|---|
| Endpoints ORDS | **10 `GET`** | API somente leitura para saúde, metodologia, regiões, fluxos, ICSAP e hospitais |
| Visões WebApp | **4** | Regional, Fluxos, Hospital e Metodologia |
| Perguntas Select AI | **13** | cinco blocos; oito referências executáveis e limites conhecidos registrados |
| Origem publicada | `api/v1` | GitHub Pages consumindo diretamente o ORDS público |
| Contingência | 10 snapshots funcionais | fallback por endpoint sem mistura silenciosa de fonte ou recorte |
| Link público | publicado e testado | aplicação navegável no GitHub Pages |

## 15. Consistência obrigatória entre entregáveis

Esta seção registra invariantes factuais, não um processo de revisão.

| Invariante | Valor ou interpretação única |
|---|---|
| Período | 2024-01 a 2026-06; 30 competências; 2026 parcial até junho |
| Volumetria principal | 7.284.476 AIHs; 7.150.693 internações novas; 655 hospitais; 645 municípios; 62 regiões; 19 macrorregiões |
| Oracle | 597.725 linhas; schema `MEDFLOW`; 2 dimensões; 7 marts; views sem recálculo |
| Validação completa | 8.403.103 comparações; zero divergências |
| Produto | 10 endpoints `GET`; 4 visões; roteiro de 13 perguntas Select AI |
| Origem pública | módulo ORDS `api/v1`; contingência identificada separadamente |
| Nome | MedFlow é marca, não sigla |
| Cálculo | indicadores calculados na Gold; frontend apenas apresenta e formata |
| IPH | pressão estimada sobre capacidade SUS declarada, não ocupação real |
| CMI | valor médio aprovado, nominal ou corrigido por IPCA, não custo contábil |
| TMH e IPR | sinais administrativos para triagem, sem causalidade ou julgamento isolado de qualidade |
| Evasão | intrastadual observada nos atendimentos realizados em São Paulo |
| ICSAP | sinal populacional indireto, não evitabilidade individual |
| Validação | consistência técnica comprovada; impacto e adoção com usuários ainda não medidos |
| Escopo negativo | sem ML, previsão, tempo real, ocupação real, custo contábil ou Power BI |

## 16. Divisão atual — lista literal

- Lapidar arquitetura — Lucas / Scutari
- UI do WebApp — OK
- Select AI — Lucas / Scutari
- Dar uma revisada no entregável — Lucas
- Vídeo — Carol / Pedro / Leandro
- Repositório GitHub — OK
- Apresentação — Carol / Pedro / Leandro

Neste arquivo, `Leandro` nessa dupla com Pedro significa Leandro Lopes; Scutari é Leandro Scutari.

## 17. Após a entrega — lista literal

- Vídeo — Carol
- Slides de contextualização do problema, incluindo a explicação do nome — Lucas
- GitHub (Bronze, Silver e Gold) — Scutari
- App técnico — Pedro / Leandro
- App do usuário — Pedro / Leandro

## 18. Entendimento da solução — lista literal

- Bronze — Carol
- Silver + Select AI — Lucas
- Gold — Scutari
- Backend — Pedro / Leandro
- Frontend — Pedro / Leandro

## 19. Limites de alegação e terminologia correta

| Fato documentado | Interpretação correta | Alegação não sustentada |
|---|---|---|
| dados publicados por competência | leitura mensal das competências disponíveis | monitoramento em tempo real |
| IPH usa pacientes-dia reconstruídos e leitos-dia SUS declarados | pressão estimada sobre capacidade declarada | taxa de ocupação real |
| CMI usa valores aprovados pelo SUS | valor médio aprovado por internação, nominal ou corrigido por IPCA | custo da internação, custo completo ou margem |
| TMH é óbitos observados sobre internações novas | mortalidade administrativa observada, sem ajuste de risco | prova de qualidade ruim ou causalidade |
| IPR compara permanência hospital/CID com benchmark regional elegível | sinal de permanência relativa que requer amostra e contexto clínico | prova de ineficiência ou qualidade |
| fluxo é observado nos atendimentos realizados em SP | evasão intrastadual observada e atração assistencial | evasão total ou fluxo completo para outras UFs |
| ICSAP segue lista oficial por CID | sinal populacional indireto de APS e uso hospitalar | internação individual comprovadamente evitável ou falha causal da APS |
| IS compara 2026 ao mesmo mês de 2024 e 2025 | comparação sazonal histórica | previsão, detecção preditiva ou modelo sazonal definitivo |
| as técnicas são exploratórias, dimensionais e comparativas | análise exploratória, indicadores, benchmarking, séries, fluxos e reconciliação | uso implementado de ML, clustering preditivo ou IA decisória |
| o WebApp é React/Vite no GitHub Pages | produto público sem licença de BI | solução em Power BI |
| os indicadores são persistidos na Gold | Oracle, views, ORDS e frontend armazenam, projetam, servem ou formatam | indicadores recalculados ou inventados no frontend |
| o Select AI é verificado contra SQL convencional | linguagem natural controlada e subordinada à Gold e ao SQL de referência | Select AI como fonte autônoma da resposta correta |
| houve 8.403.103 comparações sem divergências | consistência campo a campo no método executado | prova de impacto, causalidade, completude clínica ou ausência de qualquer defeito |
| o MVP foi validado tecnicamente | viabilidade e coerência técnica no recorte vigente | produto validado por gestores ou impacto comprovado |
| MedFlow combina ideias de saúde e fluxo | nome de marca | sigla ou acrônimo oficial |

## 20. Glossário

| Termo | Definição |
|---|---|
| **AIH** | Autorização de Internação Hospitalar; unidade administrativa do SIH/SUS |
| **Internação nova** | registro com `IDENT=1`, usado como população principal dos indicadores |
| **Continuação** | registro com `IDENT=5`, associado a continuidade de longa permanência e tratado separadamente |
| **Competência** | mês de referência/publicação dos dados administrativos |
| **SIH/RD** | registros reduzidos de internações hospitalares do SUS |
| **CNES/LT** | cadastro mensal de leitos e capacidade declarada dos estabelecimentos |
| **Bronze** | camada de preservação fiel, linhagem e integridade das fontes |
| **Silver** | camada de conformação de tipos, nomes, chaves, dimensões e fatos |
| **Gold** | camada semântica com indicadores, dimensões e marts prontos para consumo |
| **Mart** | tabela analítica preparada para um grão ou conjunto de perguntas de negócio |
| **Oracle 26ai Lakehouse** | banco autônomo que armazena e serve a Gold do MVP |
| **MEDFLOW** | schema de aplicação separado do usuário `ADMIN` |
| **View de projeção** | seleção e nomeação de colunas já calculadas, sem nova regra de negócio |
| **ORDS** | Oracle REST Data Services, responsável pela publicação dos endpoints |
| **`api/v1`** | módulo público somente leitura consumido pelo GitHub Pages |
| **Select AI** | capacidade Oracle de linguagem natural para SQL, usada de forma controlada |
| **`showsql`** | modo que expõe o SQL gerado antes de uma eventual narrativa |
| **`narrate`** | modo que descreve em linguagem natural o resultado de uma consulta |
| **Benchmark** | referência comparativa definida em contrato e sujeita a cortes de amostra |
| **Snapshot de contingência** | fotografia local rotulada, usada sem mistura de fontes quando a API está indisponível |
| **ICSAP** | Internações por Condições Sensíveis à Atenção Primária, segundo a Portaria 221/2008 |
| **RD-SP** | recorte de atendimentos realizados em hospitais do Estado de São Paulo |
| **MVP** | produto mínimo viável delimitado para demonstrar a solução e sua viabilidade técnica |
| **Job to be done** | tarefa ou progresso que a persona busca realizar em um contexto definido |

## 21. Fontes internas

| Assunto | Fonte principal | Conteúdo registrado |
|---|---|---|
| regras FIAP e revisão de requisitos | `docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md` | materiais oficiais revisados, conteúdos obrigatórios, pesos, critérios e uso dos três formatos |
| visão geral, números e estado do produto | `README.md` | pipeline, saídas, Oracle, WebApp, indicadores e volumetria vigente |
| arquitetura implementada | `ARQUITETURA.md` | fluxo end-to-end, fronteiras e papel de cada tecnologia |
| último gate de dados | `VALIDACAO_TECNICA.md` | 30 competências, volumes e reconciliações atuais |
| estado e histórico de execução | `PENDENCIAS.md` | conclusões, pendências e evolução do recorte; números históricos não substituem o gate vigente |
| problema, persona, proposta e validação futura | `docs/pesquisa/pesquisa.md` | evidência estrutural, soluções comparáveis, limites das alegações e ausência de validação primária |
| fórmulas e decisões Gold | `docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md` | TMH, IPR, IS, CMI, IPH, fluxos, ICSAP e permanência |
| evidência Oracle e Select AI | `docs/qualidade/REVALIDACAO_SELECT_AI.md` | execução datada das 13 perguntas e comparações contra a referência |
| leitura dos limites do Select AI | `docs/qualidade/LEITURA_SELECT_AI.md` | interpretação dos acertos, divergências e roteiro seguro para a banca |
| roteiro Select AI | `src/medflow/select_ai/perguntas.py` | cinco blocos, prompts, SQL de referência e limitações conhecidas |
| demonstração APEX opcional | `db/apex/README.md` | backend PL/SQL e montagem do workspace/página |
| contrato da API | `contracts/openapi.yaml` | rotas, parâmetros, respostas, ordenação e limitações |
| instalação e mapa do repositório | `HOW_TO_INSTALL.md` | dependências, execução e organização técnica |
| backend Oracle | `db/README.md` | schema, views, ORDS, módulos, segurança e Select AI |
| produto e frontend | `web/README.md` | ambientes, `api/v1`, organização, contingência e testes |
| visão Regional | `web/src/features/regional/RegionalView.tsx` | mapa, série, ranking, amostras e limite do IPH |
| visão Fluxos | `web/src/features/fluxos/FluxosView.tsx` | residência, destino, evasão, atração e ICSAP |
| visão Hospital | `web/src/features/hospital/HospitalView.tsx` | lista, série, especialidades, CIDs e elegibilidade do IPR |
| visão Metodologia | `web/src/features/metodologia/MetodologiaView.tsx` | cobertura, fórmulas, cortes, reconciliações e limites |
| nomenclatura técnica | `contracts/NOMENCLATURA.md` | nomes canônicos e termos do modelo |

O conjunto dessas fontes sustenta um único contexto: o MedFlow é um MVP mensal, público, auditável e tecnicamente reconciliado para priorizar investigações regionais e hospitalares. Sua evidência atual é técnica; a evidência de uso, adoção e impacto depende de validação futura com usuários.

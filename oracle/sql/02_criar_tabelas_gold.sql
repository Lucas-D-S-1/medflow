-- =====================================================================
-- MedFlow — modelo dimensional da Gold no Autonomous AI Lakehouse
-- Conecte como MEDFLOW. Contrato de esquema 0.2.0.
--
-- Tipos e larguras derivados dos valores reais observados nos Parquets em
-- 30/07/2026, com folga. Colunas VARCHAR2 usam semântica CHAR porque o
-- Autonomous Database é AL32UTF8 e os nomes têm acento.
--
-- Os COMMENT ON não são decoração: o Select AI usa os comentários de tabela
-- e coluna como contexto ao traduzir pergunta em SQL. Comentário ruim é
-- resposta ruim.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Dimensões de geografia (carregar antes dos marts: são o lado pai das FKs)
-- ---------------------------------------------------------------------

create table dim_geografia_regiao (
  cd_regiao_saude        varchar2(5 char)  not null,
  nm_regiao_saude        varchar2(60 char) not null,
  cd_macrorregiao_saude  varchar2(4 char)  not null,
  nm_macrorregiao_saude  varchar2(20 char) not null,
  qt_municipio           number(4)         not null,
  qt_populacao_ibge_2022 number(12)        not null,
  constraint pk_dim_geografia_regiao primary key (cd_regiao_saude)
);

comment on table dim_geografia_regiao is
  'Dimensao das 62 regioes de saude de Sao Paulo, com populacao agregada e quantidade de municipios. Fonte: CSV oficial do Ministerio da Saude e Censo IBGE 2022.';
comment on column dim_geografia_regiao.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude.';
comment on column dim_geografia_regiao.nm_regiao_saude is 'Nome oficial da regiao de saude.';
comment on column dim_geografia_regiao.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column dim_geografia_regiao.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column dim_geografia_regiao.qt_municipio is 'Quantidade de municipios que compoem a regiao de saude.';
comment on column dim_geografia_regiao.qt_populacao_ibge_2022 is 'Populacao da regiao somada a partir do Censo IBGE 2022.';

create table dim_geografia_municipio (
  cd_municipio_ibge_7    varchar2(7 char)  not null,
  cd_municipio_ibge_6    varchar2(6 char)  not null,
  nm_municipio           varchar2(60 char) not null,
  sg_uf                  varchar2(2 char)  not null,
  cd_regiao_saude        varchar2(5 char)  not null,
  nm_regiao_saude        varchar2(60 char) not null,
  cd_macrorregiao_saude  varchar2(4 char)  not null,
  nm_macrorregiao_saude  varchar2(20 char) not null,
  qt_populacao_ibge_2022 number(12)        not null,
  ds_fonte_populacao     varchar2(60 char) not null,
  constraint pk_dim_geografia_municipio primary key (cd_municipio_ibge_7),
  constraint uk_dim_geografia_mun_ibge6 unique (cd_municipio_ibge_6),
  constraint fk_dim_municipio_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table dim_geografia_municipio is
  'Dimensao dos 645 municipios de Sao Paulo com hierarquia municipio, regiao de saude e macrorregiao. Permite ligar o SIH, que usa codigo de seis digitos, a malha IBGE de sete digitos.';
comment on column dim_geografia_municipio.cd_municipio_ibge_7 is 'Codigo oficial de sete digitos do municipio no IBGE.';
comment on column dim_geografia_municipio.cd_municipio_ibge_6 is 'Codigo municipal de seis digitos usado nas bases do DATASUS.';
comment on column dim_geografia_municipio.nm_municipio is 'Nome oficial do municipio.';
comment on column dim_geografia_municipio.sg_uf is 'Sigla da unidade da Federacao.';
comment on column dim_geografia_municipio.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude.';
comment on column dim_geografia_municipio.nm_regiao_saude is 'Nome oficial da regiao de saude.';
comment on column dim_geografia_municipio.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column dim_geografia_municipio.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column dim_geografia_municipio.qt_populacao_ibge_2022 is 'Populacao municipal do Censo IBGE 2022 distribuida no CSV oficial do Ministerio da Saude.';
comment on column dim_geografia_municipio.ds_fonte_populacao is 'Fonte e ano de referencia da populacao municipal.';

-- ---------------------------------------------------------------------
-- Fato: pressao estimada, capacidade e volume mensal por hospital
-- ---------------------------------------------------------------------

create table mart_indicador_hospital_mensal (
  cd_cnes                          varchar2(7 char)   not null,
  nr_ano_competencia               number(4)          not null,
  nr_mes_competencia               number(2)          not null,
  cd_competencia                   varchar2(6 char)   not null,
  qt_leito_sus                     number(10)         not null,
  qt_leito_total                   number(10)         not null,
  qt_tipo_leito                    number(10)         not null,
  qt_dia_mes                       number(2)          not null,
  qt_capacidade_teorica_leito_dia  number(12)         not null,
  qt_paciente_dia_estimado         number(12)         not null,
  qt_internacao_nova               number(10)         not null,
  qt_obito                         number(10)         not null,
  qt_dia_permanencia_soma          number(12)         not null,
  vl_aprovado_internacao_nova_soma number(18,2)       not null,
  nm_hospital_atual                varchar2(120 char) not null,
  cd_municipio_ibge_6              varchar2(6 char)   not null,
  cd_regiao_saude                  varchar2(5 char)   not null,
  nm_regiao_saude                  varchar2(60 char)  not null,
  cd_macrorregiao_saude            varchar2(4 char)   not null,
  nm_macrorregiao_saude            varchar2(20 char)  not null,
  cd_tipo_unidade                  varchar2(2 char)   not null,
  nm_tipo_unidade                  varchar2(60 char)  not null,
  nr_iph_estimado                  number(12,6),
  pc_iph_estimado                  number(12,4),
  st_capacidade                    varchar2(40 char)  not null,
  fl_acima_capacidade_declarada    number(1)          not null,
  pc_tmh                           number(9,6),
  vl_cmi                           number(18,4),
  st_amostra                       varchar2(40 char)  not null,
  constraint pk_mart_hosp_mensal primary key (cd_cnes, cd_competencia),
  constraint ck_mart_hosp_mensal_flag check (fl_acima_capacidade_declarada in (0, 1)),
  constraint fk_mart_hosp_mensal_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude),
  constraint fk_mart_hosp_mensal_munic foreign key (cd_municipio_ibge_6)
    references dim_geografia_municipio (cd_municipio_ibge_6)
);

comment on table mart_indicador_hospital_mensal is
  'Fato mensal por hospital: pressao estimada sobre a capacidade declarada (IPH), taxa de mortalidade hospitalar (TMH) e custo medio por internacao (CMI). Uma linha por CNES e competencia, 2024-01 a 2026-05. IPH e pressao estimada contra capacidade declarada no CNES, nunca ocupacao real de leito.';
comment on column mart_indicador_hospital_mensal.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_hospital_mensal.nr_mes_competencia is 'Numero do mes da competencia de processamento.';
comment on column mart_indicador_hospital_mensal.cd_competencia is 'Competencia no formato AAAAMM.';
comment on column mart_indicador_hospital_mensal.qt_leito_sus is 'Quantidade mensal de leitos disponiveis ao SUS declarada no CNES. Denominador do IPH.';
comment on column mart_indicador_hospital_mensal.qt_leito_total is 'Quantidade mensal total de leitos declarada no CNES, SUS e nao SUS.';
comment on column mart_indicador_hospital_mensal.qt_tipo_leito is 'Quantidade de tipos de leito distintos observados no mes.';
comment on column mart_indicador_hospital_mensal.qt_dia_mes is 'Quantidade de dias civis da competencia.';
comment on column mart_indicador_hospital_mensal.qt_capacidade_teorica_leito_dia is 'Leitos SUS multiplicados pelos dias civis do mes. Denominador em leitos-dia do IPH.';
comment on column mart_indicador_hospital_mensal.qt_paciente_dia_estimado is 'Pacientes-dia reconstruidos pelas datas de entrada e saida. Numerador do IPH.';
comment on column mart_indicador_hospital_mensal.qt_internacao_nova is 'Quantidade de internacoes novas, identificadas por AIH normal. Exclui continuacao de longa permanencia.';
comment on column mart_indicador_hospital_mensal.qt_obito is 'Quantidade de obitos em internacoes novas. Numerador da TMH.';
comment on column mart_indicador_hospital_mensal.qt_dia_permanencia_soma is 'Soma dos dias de permanencia das internacoes novas.';
comment on column mart_indicador_hospital_mensal.vl_aprovado_internacao_nova_soma is 'Soma nominal em reais dos valores aprovados para internacoes novas. Numerador do CMI. Valor nominal, sem correcao pelo IPCA.';
comment on column mart_indicador_hospital_mensal.nm_hospital_atual is 'Nome fantasia atual do estabelecimento na API do CNES. Fotografia atual, nao representa o nome vigente no mes de competencia.';
comment on column mart_indicador_hospital_mensal.cd_municipio_ibge_6 is 'Codigo municipal de seis digitos usado nas bases do DATASUS.';
comment on column mart_indicador_hospital_mensal.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude do hospital.';
comment on column mart_indicador_hospital_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude do hospital.';
comment on column mart_indicador_hospital_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_mensal.cd_tipo_unidade is 'Codigo CNES do tipo de unidade.';
comment on column mart_indicador_hospital_mensal.nm_tipo_unidade is 'Descricao do tipo de unidade, por exemplo hospital geral ou hospital especializado.';
comment on column mart_indicador_hospital_mensal.nr_iph_estimado is 'IPH: pacientes-dia estimados divididos por leitos-dia SUS declarados. Nulo quando o hospital nao declarou leito SUS no mes. Valor acima de 1 indica pressao acima da capacidade declarada, nao ocupacao comprovada.';
comment on column mart_indicador_hospital_mensal.pc_iph_estimado is 'IPH estimado expresso em percentual.';
comment on column mart_indicador_hospital_mensal.st_capacidade is 'Estado da capacidade SUS declarada: disponivel ou sem_leito_sus_declarado. Quando sem leito declarado, o IPH e nulo por decisao de contrato, nao por falta de dado de internacao.';
comment on column mart_indicador_hospital_mensal.fl_acima_capacidade_declarada is 'Vale 1 quando o IPH estimado supera a capacidade declarada. Sinaliza necessidade de investigacao, nao ocupacao comprovada.';
comment on column mart_indicador_hospital_mensal.pc_tmh is 'TMH: obitos em internacoes novas divididos pelas internacoes novas, em percentual. Nulo quando a amostra e insuficiente, ou seja menos de 30 internacoes novas no mes.';
comment on column mart_indicador_hospital_mensal.vl_cmi is 'CMI: valor nominal aprovado nas internacoes novas dividido pela quantidade de internacoes novas, em reais. Nulo quando a amostra e insuficiente.';
comment on column mart_indicador_hospital_mensal.st_amostra is 'Estado da amostra para TMH e CMI: suficiente ou amostra_insuficiente, pelo minimo de 30 internacoes novas definido no contrato.';

-- ---------------------------------------------------------------------
-- Fato: TMH e CMI por hospital, especialidade e competencia
-- ---------------------------------------------------------------------

create table mart_indicador_hospital_especialidade_mensal (
  cd_cnes                          varchar2(7 char)  not null,
  cd_especialidade_sih             varchar2(2 char)  not null,
  nm_especialidade                 varchar2(80 char) not null,
  cd_regiao_saude                  varchar2(5 char)  not null,
  nm_regiao_saude                  varchar2(60 char) not null,
  cd_macrorregiao_saude            varchar2(4 char)  not null,
  nm_macrorregiao_saude            varchar2(20 char) not null,
  nr_ano_competencia               number(4)         not null,
  nr_mes_competencia               number(2)         not null,
  cd_competencia                   varchar2(6 char)  not null,
  qt_internacao_nova               number(10)        not null,
  qt_obito                         number(10)        not null,
  qt_dia_permanencia_soma          number(12)        not null,
  vl_aprovado_internacao_nova_soma number(18,2)      not null,
  vl_aprovado_continuacao_soma     number(18,2)      not null,
  pc_tmh                           number(9,6)       not null,
  vl_cmi                           number(18,4)      not null,
  st_amostra                       varchar2(40 char) not null,
  constraint pk_mart_hosp_esp_mensal primary key (cd_cnes, cd_especialidade_sih, cd_competencia),
  constraint fk_mart_hosp_esp_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_indicador_hospital_especialidade_mensal is
  'Fato mensal por hospital e especialidade do SIH: TMH e CMI. Uma linha por CNES, especialidade e competencia. Responde onde a mortalidade e o custo se concentram dentro de um mesmo hospital. Use st_amostra igual a suficiente para comparacoes.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_especialidade_sih is 'Codigo de especialidade da internacao no SIH.';
comment on column mart_indicador_hospital_especialidade_mensal.nm_especialidade is 'Descricao da especialidade do SIH, por exemplo clinica cirurgica, clinica medica ou UTI.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude do hospital.';
comment on column mart_indicador_hospital_especialidade_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude do hospital.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_especialidade_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_mes_competencia is 'Numero do mes da competencia de processamento.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_competencia is 'Competencia no formato AAAAMM.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_internacao_nova is 'Quantidade de internacoes novas, identificadas por AIH normal.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_obito is 'Quantidade de obitos em internacoes novas.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_dia_permanencia_soma is 'Soma dos dias de permanencia das internacoes novas.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_aprovado_internacao_nova_soma is 'Soma nominal em reais dos valores aprovados para internacoes novas.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_aprovado_continuacao_soma is 'Soma nominal em reais dos valores aprovados para continuacoes de longa permanencia. Separado do valor de internacao nova de proposito, para nao inflar o CMI.';
comment on column mart_indicador_hospital_especialidade_mensal.pc_tmh is 'TMH: obitos em internacoes novas divididos pelas internacoes novas, em percentual.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_cmi is 'CMI: valor nominal aprovado nas internacoes novas dividido pela quantidade de internacoes novas, em reais.';
comment on column mart_indicador_hospital_especialidade_mensal.st_amostra is 'Estado da amostra: suficiente ou amostra_insuficiente, pelo minimo definido no contrato do indicador.';

-- ---------------------------------------------------------------------
-- Fato: IPR por hospital e CID no periodo completo
-- ---------------------------------------------------------------------

create table mart_indicador_hospital_cid_periodo (
  cd_cnes                        varchar2(7 char)   not null,
  cd_regiao_saude                varchar2(5 char)   not null,
  nm_regiao_saude                varchar2(60 char)  not null,
  cd_macrorregiao_saude          varchar2(4 char)   not null,
  nm_macrorregiao_saude          varchar2(20 char)  not null,
  cd_cid_principal               varchar2(6 char)   not null,
  ds_cid                         varchar2(255 char) not null,
  cd_capitulo_cid                varchar2(10 char)  not null,
  ds_capitulo_cid                varchar2(80 char)  not null,
  qt_internacao_nova             number(10)         not null,
  qt_dia_permanencia_soma        number(12)         not null,
  qt_internacao_benchmark        number(12)         not null,
  qt_dia_permanencia_benchmark   number(12)         not null,
  qt_hospital_benchmark          number(6)          not null,
  nr_permanencia_media_hospital  number(12,6)       not null,
  nr_permanencia_media_benchmark number(12,6),
  nr_ipr                         number(12,6),
  st_amostra                     varchar2(40 char)  not null,
  constraint pk_mart_hosp_cid_periodo primary key (cd_cnes, cd_cid_principal),
  constraint fk_mart_hosp_cid_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_indicador_hospital_cid_periodo is
  'Fato do periodo completo por hospital e diagnostico principal: IPR, o indice de permanencia relativa. Compara a permanencia media do hospital para um CID contra o benchmark da propria regiao de saude, sempre excluindo o hospital avaliado do benchmark. Uma linha por CNES e CID.';
comment on column mart_indicador_hospital_cid_periodo.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_cid_periodo.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude do hospital.';
comment on column mart_indicador_hospital_cid_periodo.nm_regiao_saude is 'Nome oficial da regiao de saude do hospital.';
comment on column mart_indicador_hospital_cid_periodo.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_cid_periodo.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_cid_periodo.cd_cid_principal is 'Codigo CID-10 do diagnostico principal da internacao.';
comment on column mart_indicador_hospital_cid_periodo.ds_cid is 'Descricao completa do diagnostico CID-10.';
comment on column mart_indicador_hospital_cid_periodo.cd_capitulo_cid is 'Codigo do capitulo da CID-10.';
comment on column mart_indicador_hospital_cid_periodo.ds_capitulo_cid is 'Descricao do capitulo da CID-10, util para agrupar diagnosticos por grande grupo.';
comment on column mart_indicador_hospital_cid_periodo.qt_internacao_nova is 'Quantidade de internacoes novas do hospital para esse CID no periodo.';
comment on column mart_indicador_hospital_cid_periodo.qt_dia_permanencia_soma is 'Soma dos dias de permanencia do hospital para esse CID.';
comment on column mart_indicador_hospital_cid_periodo.qt_internacao_benchmark is 'Quantidade de internacoes no benchmark regional para esse CID, excluido o hospital avaliado.';
comment on column mart_indicador_hospital_cid_periodo.qt_dia_permanencia_benchmark is 'Soma dos dias de permanencia no benchmark regional, excluido o hospital avaliado.';
comment on column mart_indicador_hospital_cid_periodo.qt_hospital_benchmark is 'Quantidade de outros hospitais que compoem o benchmark regional desse CID.';
comment on column mart_indicador_hospital_cid_periodo.nr_permanencia_media_hospital is 'Permanencia media em dias do hospital para esse CID.';
comment on column mart_indicador_hospital_cid_periodo.nr_permanencia_media_benchmark is 'Permanencia media em dias do benchmark regional. Nula quando nao existe outro hospital com o mesmo CID na regiao.';
comment on column mart_indicador_hospital_cid_periodo.nr_ipr is 'IPR: permanencia media do hospital dividida pela do benchmark regional. Acima de 1 indica internacao mais longa que os pares. Nulo quando a amostra e insuficiente ou o benchmark e zero. Preenchido em 30550 das 447334 linhas, por decisao de corte: minimo de 20 internacoes no hospital, 50 no benchmark e 3 hospitais no benchmark.';
comment on column mart_indicador_hospital_cid_periodo.st_amostra is 'Estado da amostra: suficiente, amostra_insuficiente ou benchmark_zero. Use suficiente para qualquer ranking ou comparacao.';

-- ---------------------------------------------------------------------
-- Fato: visao executiva regional mensal, base do mapa
-- ---------------------------------------------------------------------

create table mart_indicador_regiao_mensal (
  cd_regiao_saude                     varchar2(5 char)  not null,
  nm_regiao_saude                     varchar2(60 char) not null,
  cd_macrorregiao_saude               varchar2(4 char)  not null,
  nm_macrorregiao_saude               varchar2(20 char) not null,
  nr_ano_competencia                  number(4)         not null,
  nr_mes_competencia                  number(2)         not null,
  cd_competencia                      varchar2(6 char)  not null,
  qt_internacao_nova                  number(10)        not null,
  qt_obito                            number(10)        not null,
  qt_dia_permanencia_soma             number(12)        not null,
  vl_aprovado_internacao_nova_soma    number(18,2)      not null,
  qt_hospital_com_internacao          number(6)         not null,
  qt_paciente_dia_estimado            number(12)        not null,
  qt_leito_sus                        number(10)        not null,
  qt_capacidade_teorica_leito_dia     number(12)        not null,
  qt_populacao_ibge_2022              number(12)        not null,
  qt_internacao_por_100_mil_habitante number(12,4)      not null,
  pc_tmh                              number(9,6)       not null,
  vl_cmi                              number(18,4)      not null,
  nr_iph_estimado                     number(12,6)      not null,
  pc_iph_estimado                     number(12,4)      not null,
  qt_internacao_media_historica       number(14,2)      not null,
  qt_ano_historico                    number(4)         not null,
  nr_indice_sazonalidade              number(12,6),
  pc_variacao_sazonal                 number(12,4),
  st_indice_sazonalidade              varchar2(40 char) not null,
  constraint pk_mart_regiao_mensal primary key (cd_regiao_saude, cd_competencia),
  constraint fk_mart_regiao_mensal_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_indicador_regiao_mensal is
  'Fato mensal por regiao de saude: os cinco indices consolidados na visao do secretario de saude, incluindo o indice de sazonalidade (IS). Base do mapa e da visao executiva. Uma linha por regiao e competencia, 62 regioes por 29 competencias.';
comment on column mart_indicador_regiao_mensal.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude.';
comment on column mart_indicador_regiao_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude.';
comment on column mart_indicador_regiao_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_regiao_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_regiao_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_regiao_mensal.nr_mes_competencia is 'Numero do mes da competencia de processamento.';
comment on column mart_indicador_regiao_mensal.cd_competencia is 'Competencia no formato AAAAMM.';
comment on column mart_indicador_regiao_mensal.qt_internacao_nova is 'Quantidade de internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.qt_obito is 'Quantidade de obitos em internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.qt_dia_permanencia_soma is 'Soma dos dias de permanencia das internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.vl_aprovado_internacao_nova_soma is 'Soma nominal em reais dos valores aprovados para internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.qt_hospital_com_internacao is 'Quantidade de hospitais da regiao com ao menos uma internacao no mes.';
comment on column mart_indicador_regiao_mensal.qt_paciente_dia_estimado is 'Pacientes-dia reconstruidos pelas datas de entrada e saida.';
comment on column mart_indicador_regiao_mensal.qt_leito_sus is 'Soma dos leitos disponiveis ao SUS declarados no CNES pelos hospitais da regiao.';
comment on column mart_indicador_regiao_mensal.qt_capacidade_teorica_leito_dia is 'Leitos SUS multiplicados pelos dias civis do mes.';
comment on column mart_indicador_regiao_mensal.qt_populacao_ibge_2022 is 'Populacao da regiao no Censo IBGE 2022.';
comment on column mart_indicador_regiao_mensal.qt_internacao_por_100_mil_habitante is 'Internacoes novas por 100 mil habitantes, usando populacao do Censo IBGE 2022. Permite comparar regioes de tamanhos diferentes.';
comment on column mart_indicador_regiao_mensal.pc_tmh is 'TMH da regiao em percentual.';
comment on column mart_indicador_regiao_mensal.vl_cmi is 'CMI da regiao em reais.';
comment on column mart_indicador_regiao_mensal.nr_iph_estimado is 'IPH da regiao: pacientes-dia estimados divididos por leitos-dia SUS declarados. Pressao estimada, nao ocupacao real.';
comment on column mart_indicador_regiao_mensal.pc_iph_estimado is 'IPH da regiao em percentual.';
comment on column mart_indicador_regiao_mensal.qt_internacao_media_historica is 'Media de internacoes novas no mesmo mes em 2024 e 2025. Denominador do IS.';
comment on column mart_indicador_regiao_mensal.qt_ano_historico is 'Quantidade de anos historicos usados na referencia sazonal.';
comment on column mart_indicador_regiao_mensal.nr_indice_sazonalidade is 'IS: internacoes novas de 2026 divididas pela media do mesmo mes em 2024 e 2025. Preenchido apenas nas competencias de 2026, por isso 310 das 1798 linhas. Acima de 1 indica volume acima do padrao sazonal.';
comment on column mart_indicador_regiao_mensal.pc_variacao_sazonal is 'Variacao percentual correspondente ao indice de sazonalidade. Negativo indica volume abaixo do padrao historico.';
comment on column mart_indicador_regiao_mensal.st_indice_sazonalidade is 'Estado de calculabilidade do IS: calculado ou fora_periodo_alvo. Fora do periodo alvo significa competencia de 2024 ou 2025, que servem de base historica e nao recebem indice.';

-- ---------------------------------------------------------------------
-- Fato: distribuicao do IPR elegivel por regiao no periodo
-- ---------------------------------------------------------------------

create table mart_indicador_regiao_periodo (
  cd_regiao_saude                    varchar2(5 char)  not null,
  nm_regiao_saude                    varchar2(60 char) not null,
  cd_macrorregiao_saude              varchar2(4 char)  not null,
  nm_macrorregiao_saude              varchar2(20 char) not null,
  qt_combinacao_hospital_cid         number(10)        not null,
  qt_internacao_nova                 number(10)        not null,
  qt_combinacao_ipr_elegivel         number(10),
  nr_ipr_mediana                     number(12,6),
  nr_ipr_media                       number(12,6),
  qt_combinacao_ipr_acima_referencia number(10),
  pc_combinacao_ipr_acima_referencia number(9,6),
  constraint pk_mart_regiao_periodo primary key (cd_regiao_saude),
  constraint fk_mart_regiao_periodo_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_indicador_regiao_periodo is
  'Resumo do periodo completo por regiao de saude: como o IPR se distribui dentro da regiao. Uma linha por regiao. Nove das 62 regioes nao tem combinacao elegivel e ficam com metricas de IPR nulas.';
comment on column mart_indicador_regiao_periodo.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude.';
comment on column mart_indicador_regiao_periodo.nm_regiao_saude is 'Nome oficial da regiao de saude.';
comment on column mart_indicador_regiao_periodo.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_regiao_periodo.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_regiao_periodo.qt_combinacao_hospital_cid is 'Quantidade total de combinacoes hospital e CID observadas na regiao.';
comment on column mart_indicador_regiao_periodo.qt_internacao_nova is 'Quantidade de internacoes novas da regiao no periodo completo.';
comment on column mart_indicador_regiao_periodo.qt_combinacao_ipr_elegivel is 'Quantidade de combinacoes que atendem os cortes minimos e tem IPR calculavel. Nula quando a regiao nao tem nenhuma.';
comment on column mart_indicador_regiao_periodo.nr_ipr_mediana is 'Mediana do IPR entre as combinacoes elegiveis da regiao. Preferir a mediana a media para caracterizar a regiao.';
comment on column mart_indicador_regiao_periodo.nr_ipr_media is 'Media do IPR entre as combinacoes elegiveis da regiao. Sensivel a valores extremos.';
comment on column mart_indicador_regiao_periodo.qt_combinacao_ipr_acima_referencia is 'Quantidade de combinacoes com IPR acima da referencia, ou seja permanencia maior que a dos pares.';
comment on column mart_indicador_regiao_periodo.pc_combinacao_ipr_acima_referencia is 'Percentual de combinacoes elegiveis com IPR acima da referencia.';

-- ---------------------------------------------------------------------
-- Indices para os padroes de consulta do BI e do Select AI
-- ---------------------------------------------------------------------

create index ix_hosp_mensal_competencia on mart_indicador_hospital_mensal (cd_competencia);
create index ix_hosp_mensal_regiao      on mart_indicador_hospital_mensal (cd_regiao_saude, cd_competencia);
create index ix_hosp_esp_competencia    on mart_indicador_hospital_especialidade_mensal (cd_competencia);
create index ix_hosp_esp_regiao         on mart_indicador_hospital_especialidade_mensal (cd_regiao_saude, cd_competencia);
create index ix_hosp_cid_regiao         on mart_indicador_hospital_cid_periodo (cd_regiao_saude);
create index ix_hosp_cid_cid            on mart_indicador_hospital_cid_periodo (cd_cid_principal);
create index ix_regiao_mensal_comp      on mart_indicador_regiao_mensal (cd_competencia);

prompt
prompt Modelo criado: 2 dimensoes e 5 marts. Rode carregar_gold.py e depois 03_validar_carga.sql.
prompt

-- =====================================================================
-- MedFlow — modelo dimensional da Gold no Autonomous AI Lakehouse
-- Conecte como MEDFLOW. Contrato de esquema 0.3.0.
--
-- Tipos e larguras derivados dos valores reais observados nos Parquets em
-- 30/07/2026, com folga. Colunas VARCHAR2 usam semântica CHAR porque o
-- Autonomous Database é AL32UTF8 e os nomes têm acento.
--
-- Os COMMENT ON não são decoração: o Select AI usa os comentários de tabela
-- e coluna como contexto ao traduzir pergunta em SQL. Comentário ruim é
-- resposta ruim.
-- =====================================================================

-- Reexecução idempotente restrita aos objetos do produto MedFlow.
begin
  for t in (
    select table_name
    from   user_tables
    where  table_name in (
      'MART_ICSAP_REGIAO_MENSAL',
      'MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL',
      'MART_INDICADOR_REGIAO_PERIODO',
      'MART_INDICADOR_REGIAO_MENSAL',
      'MART_INDICADOR_HOSPITAL_CID_PERIODO',
      'MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL',
      'MART_INDICADOR_HOSPITAL_MENSAL',
      'DIM_HOSPITAL_ALIAS',
      'DIM_HOSPITAL_TERRITORIO_ATUAL',
      'DIM_TERRITORIO_MUNICIPAL',
      'DIM_GEOGRAFIA_MUNICIPIO',
      'DIM_GEOGRAFIA_REGIAO'
    )
  ) loop
    execute immediate 'drop table ' || t.table_name || ' cascade constraints purge';
  end loop;
end;
/

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
-- Dimensões territoriais municipais (fonte atual, sem substituir a região SUS)
-- ---------------------------------------------------------------------

create table dim_territorio_municipal (
  cd_municipio_ibge_7  varchar2(7 char)  not null,
  cd_distrito_sp       varchar2(2 char)  not null,
  nm_distrito          varchar2(40 char) not null,
  id_subprefeitura_sp  varchar2(4 char)  not null,
  nm_subprefeitura     varchar2(60 char) not null,
  id_crs_sms_sp        varchar2(4 char)  not null,
  nm_crs_sms           varchar2(40 char) not null,
  id_sts_sms_sp        varchar2(4 char)  not null,
  nm_sts_sms           varchar2(80 char) not null,
  nm_regiao_municipal_5 varchar2(40 char) not null,
  nm_regiao_municipal_8 varchar2(40 char) not null,
  nm_zona_popular      varchar2(40 char) not null,
  ds_fonte_territorio  varchar2(100 char) not null,
  dt_referencia_fonte  varchar2(10 char) not null,
  constraint pk_dim_territorio_municipal primary key
    (cd_municipio_ibge_7, cd_distrito_sp),
  constraint fk_dim_territorio_municipio foreign key (cd_municipio_ibge_7)
    references dim_geografia_municipio (cd_municipio_ibge_7)
);

comment on table dim_territorio_municipal is
  'Dimensao territorial oficial do municipio de Sao Paulo: distrito, subprefeitura, CRS e STS. Uma linha por distrito municipal. Nao substitui a regiao de saude SUS, que permanece em dim_geografia_municipio.';
comment on column dim_territorio_municipal.cd_municipio_ibge_7 is 'Codigo IBGE de sete digitos do municipio. O recorte atual contem Sao Paulo, 3550308.';
comment on column dim_territorio_municipal.cd_distrito_sp is 'Identificador oficial do distrito municipal de Sao Paulo.';
comment on column dim_territorio_municipal.nm_distrito is 'Nome oficial do distrito municipal.';
comment on column dim_territorio_municipal.id_subprefeitura_sp is 'Identificador oficial da subprefeitura de Sao Paulo.';
comment on column dim_territorio_municipal.nm_subprefeitura is 'Nome oficial da subprefeitura.';
comment on column dim_territorio_municipal.id_crs_sms_sp is 'Identificador da Coordenadoria Regional de Saude da SMS.';
comment on column dim_territorio_municipal.nm_crs_sms is 'Nome da Coordenadoria Regional de Saude da SMS.';
comment on column dim_territorio_municipal.id_sts_sms_sp is 'Identificador da Supervisao Tecnica de Saude da SMS.';
comment on column dim_territorio_municipal.nm_sts_sms is 'Nome da Supervisao Tecnica de Saude da SMS.';
comment on column dim_territorio_municipal.nm_regiao_municipal_5 is 'Rotulo da agregacao municipal em cinco regioes, preservado como classificacao municipal.';
comment on column dim_territorio_municipal.nm_regiao_municipal_8 is 'Rotulo da agregacao municipal em oito regioes, preservado como classificacao municipal.';
comment on column dim_territorio_municipal.nm_zona_popular is 'Rotulo popular derivado da agregacao municipal em cinco regioes. Nao e regiao de saude SUS.';
comment on column dim_territorio_municipal.ds_fonte_territorio is 'Fonte da malha territorial municipal.';
comment on column dim_territorio_municipal.dt_referencia_fonte is 'Data de referencia dos arquivos territoriais.';

create table dim_hospital_territorio_atual (
  cd_cnes                 varchar2(7 char)   not null,
  cd_municipio_ibge_7    varchar2(7 char)   not null,
  cd_distrito_sp         varchar2(2 char),
  id_subprefeitura_sp    varchar2(4 char),
  id_crs_sms_sp          varchar2(4 char),
  id_sts_sms_sp           varchar2(4 char),
  nm_bairro_cnes_atual   varchar2(80 char)  not null,
  vl_latitude_cnes_atual number(12,8)       not null,
  vl_longitude_cnes_atual number(12,8)      not null,
  tp_metodo_atribuicao   varchar2(30 char)  not null,
  fl_atribuicao_ambigua  number(1)          not null,
  ds_fonte_territorio    varchar2(120 char) not null,
  dt_referencia_fonte    varchar2(10 char),
  constraint pk_dim_hospital_territorio primary key (cd_cnes),
  constraint ck_dim_hospital_territorio_flag check (fl_atribuicao_ambigua in (0, 1)),
  constraint fk_dim_hospital_territorio_municipio foreign key (cd_municipio_ibge_7)
    references dim_geografia_municipio (cd_municipio_ibge_7)
);

comment on table dim_hospital_territorio_atual is
  'Atribuicao territorial atual dos estabelecimentos CNES do municipio de Sao Paulo. A atribuicao por ponto usa a coordenada atual do CNES na malha oficial; pontos fora da malha permanecem na tabela com flag de ambiguidade.';
comment on column dim_hospital_territorio_atual.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column dim_hospital_territorio_atual.cd_municipio_ibge_7 is 'Codigo IBGE de sete digitos do municipio declarado no CNES.';
comment on column dim_hospital_territorio_atual.cd_distrito_sp is 'Distrito municipal atribuido pelo ponto do CNES; nulo quando o ponto esta fora da malha.';
comment on column dim_hospital_territorio_atual.id_subprefeitura_sp is 'Subprefeitura correspondente ao distrito atribuido.';
comment on column dim_hospital_territorio_atual.id_crs_sms_sp is 'CRS correspondente ao STS atribuido.';
comment on column dim_hospital_territorio_atual.id_sts_sms_sp is 'STS correspondente ao distrito atribuido.';
comment on column dim_hospital_territorio_atual.nm_bairro_cnes_atual is 'Bairro informado na fotografia atual do CNES.';
comment on column dim_hospital_territorio_atual.vl_latitude_cnes_atual is 'Latitude da fotografia atual do CNES, usada na atribuicao espacial.';
comment on column dim_hospital_territorio_atual.vl_longitude_cnes_atual is 'Longitude da fotografia atual do CNES, usada na atribuicao espacial.';
comment on column dim_hospital_territorio_atual.tp_metodo_atribuicao is 'Metodo aplicado: ponto_em_poligono ou ponto_fora_da_malha.';
comment on column dim_hospital_territorio_atual.fl_atribuicao_ambigua is 'Vale 1 quando a coordenada nao pode ser atribuida com segurança a um distrito.';
comment on column dim_hospital_territorio_atual.ds_fonte_territorio is 'Fontes usadas na atribuicao espacial.';
comment on column dim_hospital_territorio_atual.dt_referencia_fonte is 'Data de referencia da malha territorial.';

create table dim_hospital_alias (
  cd_cnes                varchar2(7 char)   not null,
  nm_alias               varchar2(180 char) not null,
  nm_alias_normalizado   varchar2(180 char) not null,
  tp_alias               varchar2(20 char)  not null,
  fl_alias_preferencial  number(1)          not null,
  ds_fonte_alias         varchar2(240 char) not null,
  dt_referencia_fonte    varchar2(10 char)  not null,
  constraint pk_dim_hospital_alias primary key (cd_cnes, nm_alias_normalizado),
  constraint ck_dim_hospital_alias_flag check (fl_alias_preferencial in (0, 1))
);

comment on table dim_hospital_alias is
  'Aliases pesquisaveis dos estabelecimentos CNES. Uma linha por alias e CNES; o alias popular Ermelino Matarazzo aponta para o CNES 2082829 sem alterar o nome oficial atual.';
comment on column dim_hospital_alias.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column dim_hospital_alias.nm_alias is 'Nome alternativo oficial ou popular usado na busca.';
comment on column dim_hospital_alias.nm_alias_normalizado is 'Alias sem acentos e pontuacao, em maiusculas, para comparacao deterministica.';
comment on column dim_hospital_alias.tp_alias is 'Tipo do alias: oficial ou popular.';
comment on column dim_hospital_alias.fl_alias_preferencial is 'Indica alias recomendado para exibir ou resolver uma busca.';
comment on column dim_hospital_alias.ds_fonte_alias is 'Fonte que comprova o alias.';
comment on column dim_hospital_alias.dt_referencia_fonte is 'Data de referencia da fonte do alias.';

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
  nr_permanencia_media             number(12,6),
  st_amostra                       varchar2(40 char)  not null,
  nr_indice_ipca                   number(14,4)       not null,
  nr_fator_correcao_ipca           number(12,8)       not null,
  cd_competencia_preco_referencia  varchar2(6 char)   not null,
  vl_aprovado_internacao_nova_real_soma number(18,2) not null,
  vl_cmi_real                      number(18,4),
  constraint pk_mart_hosp_mensal primary key (cd_cnes, cd_competencia),
  constraint ck_mart_hosp_mensal_flag check (fl_acima_capacidade_declarada in (0, 1)),
  constraint fk_mart_hosp_mensal_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude),
  constraint fk_mart_hosp_mensal_munic foreign key (cd_municipio_ibge_6)
    references dim_geografia_municipio (cd_municipio_ibge_6)
);

comment on table mart_indicador_hospital_mensal is
  'Fato mensal por hospital: pressao estimada sobre a capacidade declarada (IPH), taxa de mortalidade hospitalar (TMH) e custo medio por internacao (CMI). Uma linha por CNES e competencia, 2024-01 a 2026-06. Para leituras anuais, agregue as competencias antes de ranquear: ordenar as linhas mensais direto responde qual mes foi extremo, nao qual hospital. IPH e pressao estimada contra capacidade declarada no CNES, nunca ocupacao real de leito, taxa de ocupacao ou leitos ocupados.';
comment on column mart_indicador_hospital_mensal.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_hospital_mensal.nr_mes_competencia is 'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_indicador_hospital_mensal.cd_competencia is 'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';
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
comment on column mart_indicador_hospital_mensal.nr_permanencia_media is 'Tempo medio de permanencia em dias: soma dos dias dividida pelas internacoes novas. Nulo quando nao houve internacao no mes.';
comment on column mart_indicador_hospital_mensal.nr_indice_ipca is 'Numero-indice mensal do IPCA, tabela SIDRA 1737 e variavel 2266 do IBGE.';
comment on column mart_indicador_hospital_mensal.nr_fator_correcao_ipca is 'Fator multiplicativo que atualiza o valor nominal para cd_competencia_preco_referencia.';
comment on column mart_indicador_hospital_mensal.cd_competencia_preco_referencia is 'Competencia AAAAMM do preco de referencia usado nos valores reais.';
comment on column mart_indicador_hospital_mensal.vl_aprovado_internacao_nova_real_soma is 'Valor aprovado das internacoes novas corrigido pelo IPCA para a competencia de referencia.';
comment on column mart_indicador_hospital_mensal.vl_cmi_real is 'CMI corrigido pelo IPCA para a competencia de referencia. Nao representa custo economico integral.';
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
  nr_permanencia_media             number(12,6)      not null,
  st_amostra                       varchar2(40 char) not null,
  nr_indice_ipca                   number(14,4)      not null,
  nr_fator_correcao_ipca           number(12,8)      not null,
  cd_competencia_preco_referencia  varchar2(6 char)  not null,
  vl_aprovado_internacao_nova_real_soma number(18,2) not null,
  vl_cmi_real                      number(18,4)      not null,
  constraint pk_mart_hosp_esp_mensal primary key (cd_cnes, cd_especialidade_sih, cd_competencia),
  constraint fk_mart_hosp_esp_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_indicador_hospital_especialidade_mensal is
  'Fato mensal por hospital e especialidade do SIH: TMH e CMI. Uma linha por CNES, especialidade e competencia. Para ranquear especialidades por mortalidade, filtre st_amostra igual a suficiente, agrupe por nm_especialidade, exija pelo menos 100 linhas hospital-mes por especialidade, calcule a media de pc_tmh e ordene da maior para a menor.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_especialidade_sih is 'Codigo de especialidade da internacao no SIH.';
comment on column mart_indicador_hospital_especialidade_mensal.nm_especialidade is 'Descricao da especialidade do SIH, por exemplo clinica cirurgica, clinica medica ou UTI.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude do hospital.';
comment on column mart_indicador_hospital_especialidade_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude do hospital.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_especialidade_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_mes_competencia is 'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_indicador_hospital_especialidade_mensal.cd_competencia is 'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_internacao_nova is 'Quantidade de internacoes novas, identificadas por AIH normal.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_obito is 'Quantidade de obitos em internacoes novas.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_dia_permanencia_soma is 'Soma dos dias de permanencia das internacoes novas.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_aprovado_internacao_nova_soma is 'Soma nominal em reais dos valores aprovados para internacoes novas.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_aprovado_continuacao_soma is 'Soma nominal em reais dos valores aprovados para continuacoes de longa permanencia. Separado do valor de internacao nova de proposito, para nao inflar o CMI.';
comment on column mart_indicador_hospital_especialidade_mensal.pc_tmh is 'TMH: obitos em internacoes novas divididos pelas internacoes novas, em percentual. Em rankings por especialidade, usar AVG(pc_tmh) somente nas linhas com st_amostra suficiente.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_cmi is 'CMI: valor nominal aprovado nas internacoes novas dividido pela quantidade de internacoes novas, em reais.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_permanencia_media is 'Tempo medio de permanencia em dias na combinacao hospital, especialidade e mes.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_indice_ipca is 'Numero-indice mensal do IPCA, tabela SIDRA 1737 e variavel 2266 do IBGE.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_fator_correcao_ipca is 'Fator que atualiza o valor nominal para a competencia de preco de referencia.';
comment on column mart_indicador_hospital_especialidade_mensal.cd_competencia_preco_referencia is 'Competencia AAAAMM do preco de referencia usado nos valores reais.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_aprovado_internacao_nova_real_soma is 'Valor aprovado das internacoes novas corrigido pelo IPCA para a competencia de referencia.';
comment on column mart_indicador_hospital_especialidade_mensal.vl_cmi_real is 'CMI corrigido pelo IPCA para a competencia de referencia.';
comment on column mart_indicador_hospital_especialidade_mensal.st_amostra is 'Estado da amostra: suficiente ou amostra_insuficiente, pelo minimo definido no contrato do indicador. Comparacoes agregadas entre especialidades devem filtrar suficiente e exigir COUNT(*) de pelo menos 100 linhas hospital-mes por especialidade.';

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
  'Fato do periodo completo por hospital e diagnostico principal: IPR, o indice de permanencia relativa. Uma linha por CNES e CID. Para ranquear diagnosticos acima do benchmark regional, filtre st_amostra igual a suficiente, agrupe por ds_cid, exija pelo menos 10 combinacoes hospital-CID por diagnostico, calcule a media de nr_ipr e ordene da maior para a menor.';
comment on column mart_indicador_hospital_cid_periodo.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_cid_periodo.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude do hospital.';
comment on column mart_indicador_hospital_cid_periodo.nm_regiao_saude is 'Nome oficial da regiao de saude do hospital.';
comment on column mart_indicador_hospital_cid_periodo.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_cid_periodo.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_cid_periodo.cd_cid_principal is 'Codigo CID-10 do diagnostico principal da internacao.';
comment on column mart_indicador_hospital_cid_periodo.ds_cid is 'Descricao completa do diagnostico CID-10. E a dimensao de agrupamento para comparar diagnosticos por IPR.';
comment on column mart_indicador_hospital_cid_periodo.cd_capitulo_cid is 'Codigo do capitulo da CID-10.';
comment on column mart_indicador_hospital_cid_periodo.ds_capitulo_cid is 'Descricao do capitulo da CID-10, util para agrupar diagnosticos por grande grupo.';
comment on column mart_indicador_hospital_cid_periodo.qt_internacao_nova is 'Quantidade de internacoes novas do hospital para esse CID no periodo.';
comment on column mart_indicador_hospital_cid_periodo.qt_dia_permanencia_soma is 'Soma dos dias de permanencia do hospital para esse CID.';
comment on column mart_indicador_hospital_cid_periodo.qt_internacao_benchmark is 'Quantidade de internacoes no benchmark regional para esse CID, excluido o hospital avaliado.';
comment on column mart_indicador_hospital_cid_periodo.qt_dia_permanencia_benchmark is 'Soma dos dias de permanencia no benchmark regional, excluido o hospital avaliado.';
comment on column mart_indicador_hospital_cid_periodo.qt_hospital_benchmark is 'Quantidade de outros hospitais que compoem o benchmark regional desse CID.';
comment on column mart_indicador_hospital_cid_periodo.nr_permanencia_media_hospital is 'Permanencia media em dias do hospital para esse CID.';
comment on column mart_indicador_hospital_cid_periodo.nr_permanencia_media_benchmark is 'Permanencia media em dias do benchmark regional. Nula quando nao existe outro hospital com o mesmo CID na regiao.';
comment on column mart_indicador_hospital_cid_periodo.nr_ipr is 'IPR: permanencia media do hospital dividida pela do benchmark regional. Acima de 1 indica internacao mais longa que os pares. Nulo quando a amostra e insuficiente ou o benchmark e zero. Para ranking por diagnostico, usar AVG(nr_ipr) agrupado por ds_cid, nao ordenar linhas individuais.';
comment on column mart_indicador_hospital_cid_periodo.st_amostra is 'Estado da amostra: suficiente, amostra_insuficiente ou benchmark_zero. Rankings por diagnostico devem filtrar suficiente, agrupar por ds_cid e exigir COUNT(*) de pelo menos 10 combinacoes hospital-CID por diagnostico.';

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
  qt_internacao_residente_observada   number(10)        not null,
  qt_internacao_residente_na_propria_regiao number(10)  not null,
  qt_evasao_intrastadual_observada    number(10)        not null,
  qt_internacao_icsap_residente_observada number(10)    not null,
  qt_internacao_recebida_outra_regiao_sp number(10)     not null,
  qt_internacao_recebida_fora_sp      number(10)        not null,
  tx_internacao_residente_observada_por_100_mil number(14,6) not null,
  pc_evasao_intrastadual_observada    number(12,6)      not null,
  pc_atracao_assistencial             number(12,6)      not null,
  pc_icsap_no_total_internacao_residente_observada number(12,6) not null,
  tx_icsap_residente_observada_por_10_mil number(14,6)  not null,
  pc_tmh                              number(9,6)       not null,
  vl_cmi                              number(18,4)      not null,
  nr_permanencia_media                number(12,6)      not null,
  nr_iph_estimado                     number(12,6)      not null,
  pc_iph_estimado                     number(12,4)      not null,
  qt_internacao_media_historica       number(14,2)      not null,
  qt_ano_historico                    number(4)         not null,
  nr_indice_sazonalidade              number(12,6),
  pc_variacao_sazonal                 number(12,4),
  st_indice_sazonalidade              varchar2(40 char) not null,
  nr_indice_ipca                      number(14,4)       not null,
  nr_fator_correcao_ipca              number(12,8)      not null,
  cd_competencia_preco_referencia     varchar2(6 char)  not null,
  vl_aprovado_internacao_nova_real_soma number(18,2)   not null,
  vl_cmi_real                         number(18,4)      not null,
  constraint pk_mart_regiao_mensal primary key (cd_regiao_saude, cd_competencia),
  constraint fk_mart_regiao_mensal_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_indicador_regiao_mensal is
  'Visao executiva mensal por regiao, uma linha por regiao e competencia, 2024-01 a 2026-06. Medidas de oferta usam o hospital; medidas populacionais usam residencia. O recorte observa hospitais de SP e nao enxerga residentes paulistas internados fora do estado, nem qualquer outra UF. Para leituras anuais, agregue as competencias antes de ranquear. Esta base nao mede ocupacao de leito: se a pergunta pedir taxa de ocupacao, responda com o IPH e diga que e pressao estimada sobre capacidade SUS declarada. Nao ha dado em tempo real; a menor granularidade temporal e a competencia mensal.';
comment on column mart_indicador_regiao_mensal.cd_regiao_saude is 'Codigo oficial de cinco digitos da regiao de saude.';
comment on column mart_indicador_regiao_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude.';
comment on column mart_indicador_regiao_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_regiao_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_regiao_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_regiao_mensal.nr_mes_competencia is 'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_indicador_regiao_mensal.cd_competencia is 'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';
comment on column mart_indicador_regiao_mensal.qt_internacao_nova is 'Quantidade de internacoes novas realizadas pelos hospitais da regiao de atendimento.';
comment on column mart_indicador_regiao_mensal.qt_obito is 'Quantidade de obitos em internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.qt_dia_permanencia_soma is 'Soma dos dias de permanencia das internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.vl_aprovado_internacao_nova_soma is 'Soma nominal em reais dos valores aprovados para internacoes novas na regiao.';
comment on column mart_indicador_regiao_mensal.qt_hospital_com_internacao is 'Quantidade de hospitais da regiao com ao menos uma internacao no mes.';
comment on column mart_indicador_regiao_mensal.qt_paciente_dia_estimado is 'Pacientes-dia reconstruidos pelas datas de entrada e saida.';
comment on column mart_indicador_regiao_mensal.qt_leito_sus is 'Soma dos leitos disponiveis ao SUS declarados no CNES pelos hospitais da regiao.';
comment on column mart_indicador_regiao_mensal.qt_capacidade_teorica_leito_dia is 'Leitos SUS multiplicados pelos dias civis do mes.';
comment on column mart_indicador_regiao_mensal.qt_populacao_ibge_2022 is 'Populacao da regiao no Censo IBGE 2022.';
comment on column mart_indicador_regiao_mensal.qt_internacao_residente_observada is 'Internacoes de residentes da regiao atendidos em hospitais de SP. Nao inclui atendimentos fora do estado.';
comment on column mart_indicador_regiao_mensal.qt_internacao_residente_na_propria_regiao is 'Internacoes de residentes atendidos em hospital da propria regiao.';
comment on column mart_indicador_regiao_mensal.qt_evasao_intrastadual_observada is 'Internacoes de residentes atendidos em outra regiao paulista. Evasao observada dentro de SP, nao evasao total.';
comment on column mart_indicador_regiao_mensal.qt_internacao_icsap_residente_observada is 'Internacoes de residentes classificadas na Lista Brasileira de ICSAP da Portaria SAS/MS 221/2008 e atendidas em SP.';
comment on column mart_indicador_regiao_mensal.qt_internacao_recebida_outra_regiao_sp is 'Internacoes realizadas na regiao para residentes de outra regiao paulista.';
comment on column mart_indicador_regiao_mensal.qt_internacao_recebida_fora_sp is 'Internacoes realizadas na regiao para residentes de outra unidade da Federacao.';
comment on column mart_indicador_regiao_mensal.tx_internacao_residente_observada_por_100_mil is 'Internacoes observadas de residentes por 100 mil habitantes do Censo 2022. Territorialmente coerente, mas nao observa saidas de SP.';
comment on column mart_indicador_regiao_mensal.pc_evasao_intrastadual_observada is 'Evasao para outra regiao paulista dividida pelas internacoes de residentes observadas em hospitais de SP.';
comment on column mart_indicador_regiao_mensal.pc_atracao_assistencial is 'Atendimentos a residentes de fora da regiao divididos pelo total realizado na regiao.';
comment on column mart_indicador_regiao_mensal.pc_icsap_no_total_internacao_residente_observada is 'ICSAP divididas por todas as internacoes novas observadas de residentes. Nao usa o denominador clinico oficial e nao deve ser rotulada como a proporcao oficial de ICSAP.';
comment on column mart_indicador_regiao_mensal.tx_icsap_residente_observada_por_10_mil is 'ICSAP observadas de residentes por 10 mil habitantes do Censo IBGE 2022.';
comment on column mart_indicador_regiao_mensal.pc_tmh is 'TMH da regiao em percentual.';
comment on column mart_indicador_regiao_mensal.vl_cmi is 'CMI da regiao em reais.';
comment on column mart_indicador_regiao_mensal.nr_permanencia_media is 'Tempo medio de permanencia em dias nas internacoes realizadas na regiao.';
comment on column mart_indicador_regiao_mensal.nr_iph_estimado is 'IPH da regiao em razao decimal: pacientes-dia estimados divididos por leitos-dia SUS declarados. Pressao estimada sobre capacidade declarada. Nunca descreva este numero como ocupacao real, taxa de ocupacao, leitos ocupados ou hospital cheio. Para rankings apresentados em percentual, preferir pc_iph_estimado.';
comment on column mart_indicador_regiao_mensal.pc_iph_estimado is 'IPH da regiao em percentual. Nunca descreva este numero como ocupacao real, taxa de ocupacao, leitos ocupados ou hospital cheio: o denominador e capacidade SUS declarada no CNES, nao censo diario de leitos operacionais. Para ranquear regioes em um ano, filtrar nr_ano_competencia, agrupar por nm_regiao_saude e ordenar AVG(pc_iph_estimado) da maior para a menor.';
comment on column mart_indicador_regiao_mensal.qt_internacao_media_historica is 'Media de internacoes novas no mesmo mes em 2024 e 2025. Denominador do IS.';
comment on column mart_indicador_regiao_mensal.qt_ano_historico is 'Quantidade de anos historicos usados na referencia sazonal.';
comment on column mart_indicador_regiao_mensal.nr_indice_sazonalidade is 'IS: internacoes novas de 2026 divididas pela media do mesmo mes em 2024 e 2025. Preenchido apenas nas competencias de 2026, por isso 310 das 1798 linhas. Acima de 1 indica volume acima do padrao sazonal.';
comment on column mart_indicador_regiao_mensal.pc_variacao_sazonal is 'Variacao percentual correspondente ao indice de sazonalidade. Negativo indica volume abaixo do padrao historico.';
comment on column mart_indicador_regiao_mensal.st_indice_sazonalidade is 'Estado de calculabilidade do IS: calculado ou fora_periodo_alvo. Fora do periodo alvo significa competencia de 2024 ou 2025, que servem de base historica e nao recebem indice.';
comment on column mart_indicador_regiao_mensal.nr_indice_ipca is 'Numero-indice mensal do IPCA, tabela SIDRA 1737 e variavel 2266 do IBGE.';
comment on column mart_indicador_regiao_mensal.nr_fator_correcao_ipca is 'Fator que atualiza os valores nominais para a competencia de preco de referencia.';
comment on column mart_indicador_regiao_mensal.cd_competencia_preco_referencia is 'Competencia AAAAMM do preco de referencia usado no CMI real.';
comment on column mart_indicador_regiao_mensal.vl_aprovado_internacao_nova_real_soma is 'Valor aprovado das internacoes realizadas corrigido pelo IPCA.';
comment on column mart_indicador_regiao_mensal.vl_cmi_real is 'CMI corrigido pelo IPCA para a competencia de referencia. Nao representa custo economico integral.';

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
-- Fato: fluxos de residencia para atendimento
-- ---------------------------------------------------------------------

create table mart_fluxo_assistencial_regiao_mensal (
  cd_origem_residencia                 varchar2(7 char)  not null,
  cd_regiao_saude_atendimento          varchar2(5 char)  not null,
  nr_ano_competencia                   number(4)         not null,
  nr_mes_competencia                   number(2)         not null,
  cd_competencia                       varchar2(6 char)  not null,
  st_fluxo_assistencial                varchar2(24 char) not null,
  qt_internacao_nova                   number(10)        not null,
  nm_origem_residencia                 varchar2(60 char) not null,
  cd_macrorregiao_origem               varchar2(4 char),
  nm_macrorregiao_origem               varchar2(20 char),
  nm_regiao_saude_atendimento          varchar2(60 char) not null,
  cd_macrorregiao_atendimento          varchar2(4 char)  not null,
  nm_macrorregiao_atendimento          varchar2(20 char) not null,
  pc_origem_no_atendimento             number(12,6)      not null,
  pc_destino_na_origem_observada       number(12,6)      not null,
  constraint pk_mart_fluxo_regiao_mensal primary key
    (cd_origem_residencia, cd_regiao_saude_atendimento, cd_competencia),
  constraint fk_mart_fluxo_regiao_atendimento foreign key
    (cd_regiao_saude_atendimento) references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_fluxo_assistencial_regiao_mensal is
  'Fluxo mensal entre regiao de residencia e regiao do hospital. FORA_SP representa residentes de outra UF atendidos em SP. O recorte nao observa residentes paulistas atendidos fora do estado.';
comment on column mart_fluxo_assistencial_regiao_mensal.cd_origem_residencia is 'Codigo da regiao de saude de residencia ou FORA_SP para residentes de outra UF.';
comment on column mart_fluxo_assistencial_regiao_mensal.cd_regiao_saude_atendimento is 'Regiao de saude do hospital que realizou a internacao.';
comment on column mart_fluxo_assistencial_regiao_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_fluxo_assistencial_regiao_mensal.nr_mes_competencia is 'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_fluxo_assistencial_regiao_mensal.cd_competencia is 'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';
comment on column mart_fluxo_assistencial_regiao_mensal.st_fluxo_assistencial is 'Classificacao: intrarregional, interregional_sp ou entrada_outro_estado.';
comment on column mart_fluxo_assistencial_regiao_mensal.qt_internacao_nova is 'Quantidade de internacoes novas no par origem e destino.';
comment on column mart_fluxo_assistencial_regiao_mensal.nm_origem_residencia is 'Nome da regiao de residencia ou Fora do estado de Sao Paulo.';
comment on column mart_fluxo_assistencial_regiao_mensal.cd_macrorregiao_origem is 'Macrorregiao da residencia; nula para FORA_SP.';
comment on column mart_fluxo_assistencial_regiao_mensal.nm_macrorregiao_origem is 'Nome da macrorregiao da residencia; nulo para FORA_SP.';
comment on column mart_fluxo_assistencial_regiao_mensal.nm_regiao_saude_atendimento is 'Nome da regiao de saude do hospital.';
comment on column mart_fluxo_assistencial_regiao_mensal.cd_macrorregiao_atendimento is 'Codigo da macrorregiao do hospital.';
comment on column mart_fluxo_assistencial_regiao_mensal.nm_macrorregiao_atendimento is 'Nome da macrorregiao do hospital.';
comment on column mart_fluxo_assistencial_regiao_mensal.pc_origem_no_atendimento is 'Participacao da origem no total realizado pelo destino no mes.';
comment on column mart_fluxo_assistencial_regiao_mensal.pc_destino_na_origem_observada is 'Participacao do destino no total da origem observado em hospitais de SP.';

-- ---------------------------------------------------------------------
-- Fato: ICSAP por residencia, grupo oficial e competencia
-- ---------------------------------------------------------------------

create table mart_icsap_regiao_mensal (
  cd_regiao_saude                    varchar2(5 char)  not null,
  nm_regiao_saude                    varchar2(60 char) not null,
  cd_macrorregiao_saude              varchar2(4 char)  not null,
  nm_macrorregiao_saude              varchar2(20 char) not null,
  qt_populacao_ibge_2022             number(12)        not null,
  nr_ano_competencia                 number(4)         not null,
  nr_mes_competencia                 number(2)         not null,
  cd_competencia                     varchar2(6 char)  not null,
  cd_grupo_icsap                     varchar2(2 char)   not null,
  nm_grupo_icsap                     varchar2(80 char)  not null,
  qt_internacao_icsap                number(10)        not null,
  qt_internacao_icsap_total_regiao   number(10)        not null,
  pc_grupo_no_total_icsap            number(12,6)      not null,
  tx_icsap_grupo_por_10_mil_habitantes number(14,6)    not null,
  constraint pk_mart_icsap_regiao_mensal primary key
    (cd_regiao_saude, cd_competencia, cd_grupo_icsap),
  constraint fk_mart_icsap_regiao foreign key (cd_regiao_saude)
    references dim_geografia_regiao (cd_regiao_saude)
);

comment on table mart_icsap_regiao_mensal is
  'Detalhamento mensal das internacoes de residentes por grupo da Lista Brasileira de ICSAP da Portaria SAS/MS 221/2008. Inclui zeros para todas as 62 regioes, 30 competencias e 19 grupos. Uma linha por regiao, competencia e grupo. Para saber o grupo lider de uma regiao num ano, some qt_internacao_icsap por grupo antes de comparar: o maior valor mensal isolado nao e o maior total do ano.';
comment on column mart_icsap_regiao_mensal.cd_regiao_saude is 'Regiao de saude de residencia, nao a regiao do hospital.';
comment on column mart_icsap_regiao_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude de residencia.';
comment on column mart_icsap_regiao_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude da residencia.';
comment on column mart_icsap_regiao_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude da residencia.';
comment on column mart_icsap_regiao_mensal.qt_populacao_ibge_2022 is 'Populacao residente da regiao no Censo IBGE 2022, denominador das taxas.';
comment on column mart_icsap_regiao_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_icsap_regiao_mensal.nr_mes_competencia is 'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_icsap_regiao_mensal.cd_competencia is 'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';
comment on column mart_icsap_regiao_mensal.cd_grupo_icsap is 'Codigo ordinal de dois digitos do grupo oficial ICSAP.';
comment on column mart_icsap_regiao_mensal.nm_grupo_icsap is 'Nome do grupo oficial da Lista Brasileira de ICSAP.';
comment on column mart_icsap_regiao_mensal.qt_internacao_icsap is 'Internacoes novas de residentes no grupo, observadas em hospitais de SP.';
comment on column mart_icsap_regiao_mensal.qt_internacao_icsap_total_regiao is 'Total de ICSAP observadas entre residentes da regiao no mes.';
comment on column mart_icsap_regiao_mensal.pc_grupo_no_total_icsap is 'Participacao do grupo no total de ICSAP da regiao no mes.';
comment on column mart_icsap_regiao_mensal.tx_icsap_grupo_por_10_mil_habitantes is 'Internacoes do grupo por 10 mil habitantes da regiao, com populacao do Censo 2022.';

-- ---------------------------------------------------------------------
-- Proveniencia da carga
-- ---------------------------------------------------------------------
-- Uma linha, escrita por carregar_gold.py a cada carga, com o gerado_em_utc
-- do manifesto Gold local. Existe porque `gold_updated_at` era um literal
-- dentro de vw_api_metodologia: a view prometia, em comentario, que o valor
-- correspondia ao manifesto publicado, e ficou congelado em 01/08 enquanto a
-- Gold era regerada em 10/08. A tela anunciava uma data e servia outra.
--
-- O check de linha unica nao e zelo: com duas linhas a view voltaria a poder
-- devolver a antiga.

create table gold_manifesto (
  id            number(1)          default 1 not null,
  gerado_em_utc varchar2(40 char)  not null,
  carregado_em  timestamp with time zone default systimestamp not null,
  constraint pk_gold_manifesto primary key (id),
  constraint ck_gold_manifesto_linha_unica check (id = 1)
);

comment on table gold_manifesto is
  'Proveniencia da carga: de qual execucao da Gold vieram as linhas que estao no banco. Uma unica linha, reescrita a cada carga.';
comment on column gold_manifesto.gerado_em_utc is
  'gerado_em_utc do METADADOS.json da Gold que originou esta carga.';
comment on column gold_manifesto.carregado_em is
  'Quando a carga foi aplicada neste banco.';

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
create index ix_fluxo_destino_comp       on mart_fluxo_assistencial_regiao_mensal (cd_regiao_saude_atendimento, cd_competencia);
create index ix_fluxo_origem_comp        on mart_fluxo_assistencial_regiao_mensal (cd_origem_residencia, cd_competencia);
create index ix_icsap_comp_grupo         on mart_icsap_regiao_mensal (cd_competencia, cd_grupo_icsap);

prompt
prompt Modelo criado: 5 dimensoes e 7 marts. Rode carregar_gold.py e depois 03_validar_carga.sql.
prompt

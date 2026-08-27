-- =====================================================================
-- MedFlow — migração aditiva das dimensões territoriais
--
-- Use esta migração sobre uma instância que já executou 02_criar_tabelas_gold.
-- Ela não recria os marts nem invalida as views existentes.
-- =====================================================================

set serveroutput on

declare
  qt number;
begin
  select count(*) into qt from user_tables where table_name = 'DIM_TERRITORIO_MUNICIPAL';
  if qt = 0 then
    execute immediate q'~
      create table dim_territorio_municipal (
        cd_municipio_ibge_7   varchar2(7 char)   not null,
        cd_distrito_sp        varchar2(2 char)   not null,
        nm_distrito           varchar2(40 char)  not null,
        id_subprefeitura_sp   varchar2(4 char)   not null,
        nm_subprefeitura      varchar2(60 char)  not null,
        id_crs_sms_sp         varchar2(4 char)   not null,
        nm_crs_sms            varchar2(40 char)  not null,
        id_sts_sms_sp         varchar2(4 char)   not null,
        nm_sts_sms            varchar2(80 char)  not null,
        nm_regiao_municipal_5 varchar2(40 char)  not null,
        nm_regiao_municipal_8 varchar2(40 char)  not null,
        nm_zona_popular       varchar2(40 char)  not null,
        ds_fonte_territorio   varchar2(100 char) not null,
        dt_referencia_fonte   varchar2(10 char)  not null,
        constraint pk_dim_territorio_municipal primary key
          (cd_municipio_ibge_7, cd_distrito_sp),
        constraint fk_dim_territorio_municipio foreign key (cd_municipio_ibge_7)
          references dim_geografia_municipio (cd_municipio_ibge_7)
      )~';
    dbms_output.put_line('Criada DIM_TERRITORIO_MUNICIPAL.');
  end if;

  select count(*) into qt from user_tables where table_name = 'DIM_HOSPITAL_TERRITORIO_ATUAL';
  if qt = 0 then
    execute immediate q'~
      create table dim_hospital_territorio_atual (
        cd_cnes                  varchar2(7 char)   not null,
        cd_municipio_ibge_7     varchar2(7 char)   not null,
        cd_distrito_sp           varchar2(2 char),
        id_subprefeitura_sp      varchar2(4 char),
        id_crs_sms_sp            varchar2(4 char),
        id_sts_sms_sp            varchar2(4 char),
        nm_bairro_cnes_atual     varchar2(80 char)  not null,
        vl_latitude_cnes_atual  number(12,8)       not null,
        vl_longitude_cnes_atual number(12,8)       not null,
        tp_metodo_atribuicao     varchar2(30 char)  not null,
        fl_atribuicao_ambigua    number(1)          not null,
        ds_fonte_territorio      varchar2(120 char) not null,
        dt_referencia_fonte      varchar2(10 char),
        constraint pk_dim_hospital_territorio primary key (cd_cnes),
        constraint ck_dim_hospital_territorio_flag check (fl_atribuicao_ambigua in (0, 1)),
        constraint fk_dim_hospital_territorio_municipio foreign key (cd_municipio_ibge_7)
          references dim_geografia_municipio (cd_municipio_ibge_7)
      )~';
    dbms_output.put_line('Criada DIM_HOSPITAL_TERRITORIO_ATUAL.');
  end if;

  select count(*) into qt from user_tables where table_name = 'DIM_HOSPITAL_ALIAS';
  if qt = 0 then
    execute immediate q'~
      create table dim_hospital_alias (
        cd_cnes               varchar2(7 char)   not null,
        nm_alias              varchar2(180 char) not null,
        nm_alias_normalizado  varchar2(180 char) not null,
        tp_alias              varchar2(20 char)  not null,
        fl_alias_preferencial number(1)          not null,
        ds_fonte_alias         varchar2(240 char) not null,
        dt_referencia_fonte    varchar2(10 char)  not null,
        constraint pk_dim_hospital_alias primary key (cd_cnes, nm_alias_normalizado),
        constraint ck_dim_hospital_alias_flag check (fl_alias_preferencial in (0, 1))
      )~';
    dbms_output.put_line('Criada DIM_HOSPITAL_ALIAS.');
  end if;
end;
/

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

comment on table dim_hospital_alias is
  'Aliases pesquisaveis dos estabelecimentos CNES. Uma linha por alias e CNES; o alias popular Ermelino Matarazzo aponta para o CNES 2082829 sem alterar o nome oficial atual.';
comment on column dim_hospital_alias.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column dim_hospital_alias.nm_alias is 'Nome alternativo oficial ou popular usado na busca.';
comment on column dim_hospital_alias.nm_alias_normalizado is 'Alias sem acentos e pontuacao, em maiusculas, para comparacao deterministica.';
comment on column dim_hospital_alias.tp_alias is 'Tipo do alias: oficial ou popular.';
comment on column dim_hospital_alias.fl_alias_preferencial is 'Indica alias recomendado para exibir ou resolver uma busca.';
comment on column dim_hospital_alias.ds_fonte_alias is 'Fonte que comprova o alias.';
comment on column dim_hospital_alias.dt_referencia_fonte is 'Data de referencia da fonte do alias.';

prompt Migração territorial concluída. Carregue as três tabelas com carregar_gold.py --somente.

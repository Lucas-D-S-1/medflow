-- =====================================================================
-- MedFlow — mart mensal de diagnóstico dentro da especialidade
--
-- Migração aditiva para instalações que já executaram o schema 02. Não
-- apaga nem recria objetos existentes. Depois de revisar e executar:
--
--   safe-run .venv/bin/python src/medflow/oracle/carregar_gold.py \
--     --somente mart_indicador_hospital_especialidade_cid_mensal
--   .venv/bin/python src/medflow/oracle/executar_sql.py \
--     db/views/10_vw_api_hospital_diagnosticos_especialidade.sql
--   .venv/bin/python src/medflow/oracle/executar_sql.py \
--     db/ords/03_modulo_medflow_dev.sql
--
-- Esta migração não foi executada automaticamente. O rollback revisável está
-- em 07_reverter_diagnostico_especialidade_mensal.sql.
-- =====================================================================

set serveroutput on

declare
  l_existe number;
begin
  select count(*) into l_existe
    from user_tables
   where table_name = 'MART_INDICADOR_HOSPITAL_ESPECIALIDADE_CID_MENSAL';

  if l_existe = 0 then
    execute immediate q'~
      create table mart_indicador_hospital_especialidade_cid_mensal (
        cd_cnes                          varchar2(7 char)   not null,
        cd_especialidade_sih             varchar2(2 char)   not null,
        nm_especialidade                 varchar2(80 char)  not null,
        cd_regiao_saude                  varchar2(5 char)   not null,
        nm_regiao_saude                  varchar2(60 char)  not null,
        cd_macrorregiao_saude            varchar2(4 char)   not null,
        nm_macrorregiao_saude            varchar2(20 char)  not null,
        nr_ano_competencia               number(4)          not null,
        nr_mes_competencia               number(2)          not null,
        cd_competencia                   varchar2(6 char)   not null,
        cd_cid_principal                 varchar2(6 char)   not null,
        ds_cid                           varchar2(255 char) not null,
        cd_capitulo_cid                  varchar2(10 char)  not null,
        ds_capitulo_cid                  varchar2(80 char)  not null,
        qt_internacao_nova               number(10)         not null,
        qt_dia_permanencia_soma          number(12)         not null,
        nr_permanencia_media_hospital    number(12,6)       not null,
        pc_internacao_especialidade      number(9,6)        not null,
        pc_dia_permanencia_especialidade number(9,6),
        qt_internacao_benchmark          number(12)         not null,
        qt_dia_permanencia_benchmark     number(14)         not null,
        qt_hospital_benchmark            number(6)          not null,
        nr_permanencia_media_benchmark   number(12,6),
        nr_ipr                           number(12,6),
        st_amostra                       varchar2(40 char)  not null,
        constraint pk_mart_hosp_esp_cid_mes primary key
          (cd_cnes, cd_competencia, cd_especialidade_sih, cd_cid_principal),
        constraint fk_mart_hosp_esp_cid_reg foreign key (cd_regiao_saude)
          references dim_geografia_regiao (cd_regiao_saude),
        constraint ck_mart_hosp_esp_cid_st check
          (st_amostra in ('suficiente', 'amostra_insuficiente', 'benchmark_zero'))
      )~';
    dbms_output.put_line('Tabela criada: MART_INDICADOR_HOSPITAL_ESPECIALIDADE_CID_MENSAL');
  else
    dbms_output.put_line('Tabela já existia: MART_INDICADOR_HOSPITAL_ESPECIALIDADE_CID_MENSAL');
  end if;
end;
/

comment on table mart_indicador_hospital_especialidade_cid_mensal is
  'Fato aditivo no grao hospital, competencia de processamento, especialidade SIH e CID principal. Usar este objeto para perguntas de CID com mes e especialidade. Nasceu diretamente da internacao detalhada com FL_INTERNACAO_NOVA=1; nao pode ser reconstruido juntando marts nem requer join para CID. Somar internacoes e dias; calcular media ponderada por SUM(dias)/SUM(internacoes). Para ranking, ordenar o conjunto completo antes da paginacao.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_cnes is 'Codigo de sete digitos do estabelecimento no CNES.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_especialidade_sih is 'Codigo da especialidade SIH. O valor -- representa especialidade nao informada e preserva a reconciliacao.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nm_especialidade is 'Descricao da especialidade SIH; Especialidade nao informada acompanha o codigo --.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_regiao_saude is 'Codigo oficial da regiao de saude do hospital, usado no benchmark.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nm_regiao_saude is 'Nome oficial da regiao de saude do hospital.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_macrorregiao_saude is 'Codigo oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nm_macrorregiao_saude is 'Nome oficial da macrorregiao de saude.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nr_ano_competencia is 'Ano da competencia de processamento.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nr_mes_competencia is 'Mes da competencia de processamento; nao usar isoladamente para ordenar anos.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_competencia is 'Competencia de processamento em AAAAMM e chave cronologica.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_cid_principal is 'CID-10 principal. O valor -- significa sem CID principal informado; nao descartar essa linha.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.ds_cid is 'Descricao do CID principal; explicita Sem CID principal informado quando o codigo e --.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.cd_capitulo_cid is 'Capitulo CID-10; -- quando nao classificavel ou nao informado.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.ds_capitulo_cid is 'Descricao do capitulo CID-10.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.qt_internacao_nova is 'Volume de internacoes novas no grao. Somar esta coluna; COUNT(*) conta combinacoes, nao internacoes.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.qt_dia_permanencia_soma is 'Soma de DIAS_PERM apenas das internacoes novas; permanencia observada, nao pacientes-dia reconstruidos para o IPH, ocupacao ou calendario.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nr_permanencia_media_hospital is 'Permanencia media ponderada: soma dos dias dividida pela soma das internacoes, nunca media de medias.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.pc_internacao_especialidade is 'Participacao percentual do CID no volume do mesmo hospital, competencia e especialidade.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.pc_dia_permanencia_especialidade is 'Participacao percentual do CID nos dias do mesmo hospital, competencia e especialidade. Nula quando o grupo soma zero dia.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.qt_internacao_benchmark is 'Internacoes dos demais hospitais da mesma regiao, competencia, especialidade e CID; o proprio hospital e excluido.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.qt_dia_permanencia_benchmark is 'Dias dos demais hospitais da mesma regiao, competencia, especialidade e CID; permanece disponivel mesmo com amostra insuficiente.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.qt_hospital_benchmark is 'Quantidade de outros hospitais no mesmo recorte do benchmark.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nr_permanencia_media_benchmark is 'Soma dos dias dos pares dividida pela soma das internacoes dos pares; nula quando nao ha admissao par.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.nr_ipr is 'Razao entre permanencia local e benchmark no mesmo mes, especialidade e CID. So publicada quando ST_AMOSTRA e suficiente; nao e qualidade nem desfecho.';
comment on column mart_indicador_hospital_especialidade_cid_mensal.st_amostra is 'Estado comparativo explicito. Suficiente exige codigos de especialidade e CID conhecidos, 20 internacoes locais, 50 nos demais hospitais, 3 outros hospitais e media benchmark positiva. Fora disso NR_IPR e nulo, mas os descritivos brutos permanecem.';

prompt Migração aditiva preparada. Carregue somente o novo mart e recrie a view 10.

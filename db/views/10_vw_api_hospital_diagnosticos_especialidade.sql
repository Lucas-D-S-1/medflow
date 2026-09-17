create or replace view vw_api_hosp_diag_esp_mensal as
select d.cd_cnes,
       d.cd_especialidade_sih,
       d.nm_especialidade,
       d.cd_regiao_saude,
       d.nm_regiao_saude,
       d.cd_macrorregiao_saude,
       d.nm_macrorregiao_saude,
       d.nr_ano_competencia,
       d.nr_mes_competencia,
       d.cd_competencia,
       d.cd_cid_principal,
       d.ds_cid,
       d.cd_capitulo_cid,
       d.ds_capitulo_cid,
       d.qt_internacao_nova,
       d.qt_dia_permanencia_soma,
       d.nr_permanencia_media_hospital,
       d.pc_internacao_especialidade,
       d.pc_dia_permanencia_especialidade,
       d.qt_internacao_benchmark,
       d.qt_dia_permanencia_benchmark,
       d.qt_hospital_benchmark,
       d.nr_permanencia_media_benchmark,
       d.nr_ipr,
       d.st_amostra
  from mart_indicador_hospital_especialidade_cid_mensal d;

comment on table vw_api_hosp_diag_esp_mensal is
  'Projecao pura do diagnostico principal no recorte hospital, competencia de processamento e especialidade SIH. Expoe descritivos mesmo quando o benchmark nao e comparavel; NR_IPR so existe com ST_AMOSTRA suficiente. A view nao recalcula indicadores.';

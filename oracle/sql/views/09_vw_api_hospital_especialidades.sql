create or replace view vw_api_hospital_especialidades as
select e.cd_cnes,
       e.cd_especialidade_sih,
       e.nm_especialidade,
       e.cd_regiao_saude,
       e.nm_regiao_saude,
       e.cd_macrorregiao_saude,
       e.nm_macrorregiao_saude,
       e.nr_ano_competencia,
       e.nr_mes_competencia,
       e.cd_competencia,
       e.qt_internacao_nova,
       e.qt_obito,
       e.qt_dia_permanencia_soma,
       e.pc_tmh,
       e.vl_cmi,
       e.vl_cmi_real,
       e.nr_permanencia_media,
       e.cd_competencia_preco_referencia,
       e.st_amostra
  from mart_indicador_hospital_especialidade_mensal e;

comment on table vw_api_hospital_especialidades is
  'Perfil mensal por especialidade SIH dentro de cada hospital, com TMH, CMI nominal e real, permanencia media e estado de amostra ja persistidos na Gold. A view nao recalcula indicadores.';

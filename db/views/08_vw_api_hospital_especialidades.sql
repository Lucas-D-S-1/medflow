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
       e.st_amostra,
       e.nr_permanencia_media_benchmark_especialidade,
       e.qt_internacao_benchmark_especialidade,
       e.qt_hospital_benchmark_especialidade,
       e.nr_ipe,
       e.st_amostra_ipe
  from mart_indicador_hospital_especialidade_mensal e;

comment on table vw_api_hospital_especialidades is
  'Perfil mensal por especialidade SIH dentro de cada hospital, com TMH, CMI nominal e real, permanencia media, estado de amostra e o indice de permanencia por especialidade ja persistidos na Gold. O IPE compara a permanencia do hospital com a dos demais hospitais da mesma regiao na mesma especialidade, excluindo o proprio hospital do benchmark. A view nao recalcula indicadores.';

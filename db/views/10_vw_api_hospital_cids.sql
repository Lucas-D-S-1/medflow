create or replace view vw_api_hospital_cids as
select c.cd_cnes,
       c.cd_regiao_saude,
       c.nm_regiao_saude,
       c.cd_macrorregiao_saude,
       c.nm_macrorregiao_saude,
       c.cd_cid_principal,
       c.ds_cid,
       c.cd_capitulo_cid,
       c.ds_capitulo_cid,
       c.qt_internacao_nova,
       c.qt_dia_permanencia_soma,
       c.qt_internacao_benchmark,
       c.qt_dia_permanencia_benchmark,
       c.qt_hospital_benchmark,
       c.nr_permanencia_media_hospital,
       c.nr_permanencia_media_benchmark,
       c.nr_ipr,
       c.st_amostra,
       r.nr_ipr_mediana as nr_ipr_mediana_regiao,
       r.qt_combinacao_ipr_elegivel as qt_combinacao_ipr_elegivel_regiao,
       r.pc_combinacao_ipr_acima_referencia as pc_combinacao_acima_referencia_regiao
  from mart_indicador_hospital_cid_periodo c
  left join mart_indicador_regiao_periodo r
    on r.cd_regiao_saude = c.cd_regiao_saude;

comment on table vw_api_hospital_cids is
  'Indice de permanencia relativa (IPR) por diagnostico principal dentro de cada hospital, no periodo agregado, com o benchmark regional que exclui o proprio hospital e a referencia mediana da regiao. Todas as colunas vem persistidas da Gold; a view nao recalcula indicadores.';

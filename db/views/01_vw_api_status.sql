create or replace view vw_api_status as
select max(cd_competencia) as cd_competencia_maxima
  from mart_indicador_regiao_mensal;

comment on table vw_api_status is
  'Status agregado da API MedFlow. A competencia maxima e lida da Gold persistida; a view nao recalcula indicadores.';


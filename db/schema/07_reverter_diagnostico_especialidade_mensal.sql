-- =====================================================================
-- MedFlow — rollback operacional, não destrutivo, da migração 07
--
-- Ordem segura para uma reversão futura:
--   1. restaurar o pacote FlowIA, o profile Select AI, os módulos ORDS e o
--      frontend anteriores;
--   2. confirmar que nenhum consumidor depende da view ou do mart novos;
--   3. manter o mart e a view novos inativos para preservar a carga;
--   4. somente se necessário, revisar e executar separadamente
--      07_remover_fisicamente_diagnostico_especialidade.sql.
--
-- Este roteiro não contém DROP, TRUNCATE, DELETE ou PURGE.
-- =====================================================================

set serveroutput on

declare
  l_tabela number;
  l_view   number;
begin
  select count(*) into l_tabela
    from user_tables
   where table_name = 'MART_INDICADOR_HOSPITAL_ESPECIALIDADE_CID_MENSAL';

  select count(*) into l_view
    from user_views
   where view_name = 'VW_API_HOSP_DIAG_ESP_MENSAL';

  dbms_output.put_line('Rollback operacional não destrutivo concluído.');
  dbms_output.put_line('Mart preservado: ' || case when l_tabela = 1 then 'sim' else 'não existe' end);
  dbms_output.put_line('View preservada: ' || case when l_view = 1 then 'sim' else 'não existe' end);
  dbms_output.put_line('Restaure primeiro pacote/profile/ORDS/frontend; remoção física é separada.');
end;
/

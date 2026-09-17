-- =====================================================================
-- MedFlow — ampliação aditiva do contexto auditado da FlowIA
--
-- Preserva todas as linhas existentes e apenas amplia CONTEXTO de 1000 para
-- 4000 bytes. Não recria a tabela e não toca na Gold.
-- =====================================================================

set serveroutput on

declare
  l_existe       number;
  l_data_length  number;
begin
  select count(*) into l_existe
    from user_tab_columns
   where table_name = 'SELECT_AI_RESPOSTA'
     and column_name = 'CONTEXTO';

  if l_existe = 0 then
    execute immediate
      'alter table select_ai_resposta add contexto varchar2(4000 byte)';
    dbms_output.put_line('CONTEXTO criado com 4000 bytes.');
  else
    select data_length into l_data_length
      from user_tab_columns
     where table_name = 'SELECT_AI_RESPOSTA'
       and column_name = 'CONTEXTO';

    if l_data_length < 4000 then
      execute immediate
        'alter table select_ai_resposta modify contexto varchar2(4000 byte)';
      dbms_output.put_line('CONTEXTO ampliado preservando os registros.');
    else
      dbms_output.put_line('CONTEXTO já comporta 4000 bytes.');
    end if;
  end if;
end;
/

comment on column select_ai_resposta.contexto is
  'Contexto estruturado da FlowIA, limitado a 4000 bytes UTF-8 antes da auditoria; preserva primeiro CNES, competencia, intencao e especialidades ordenadas.';

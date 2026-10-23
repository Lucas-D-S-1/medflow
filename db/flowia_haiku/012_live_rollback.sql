-- Only this activation; previous pilots and all legacy resources remain intact.
begin
  ords.delete_module(p_module_name=>'flowia_haiku_live'); commit;
end;
/
begin
  for r in (select object_name from user_objects where object_type='PACKAGE' and object_name='FLOWIA_HAIKU_LIVE_API') loop
    execute immediate 'drop package '||r.object_name;
  end loop;
  for r in (select table_name from user_tables where table_name in ('FLOWIA_HAIKU_SEGREDO','FLOWIA_HAIKU_LIVE_USAGE')) loop
    execute immediate 'drop table '||r.table_name||' purge';
  end loop;
end;
/

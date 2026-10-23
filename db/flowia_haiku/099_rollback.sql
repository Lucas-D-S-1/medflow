-- Idempotente. Remove APENAS recursos do piloto. Arquivar metricas antes.
declare
  n number;
begin
  select count(*) into n from user_ords_modules where name='flowia_haiku';
  if n>0 then ords.delete_module(p_module_name=>'flowia_haiku'); end if;
  commit;
end;
/
declare
  n number;
begin
  select count(*) into n from user_objects where object_name='FLOWIA_HAIKU_API' and object_type='PACKAGE';
  if n>0 then execute immediate 'drop package FLOWIA_HAIKU_API'; end if;
end;
/
declare
  n number;
begin
  select count(*) into n from user_tables where table_name='FLOWIA_HAIKU_USAGE';
  if n>0 then execute immediate 'drop table FLOWIA_HAIKU_USAGE purge'; end if;
  select count(*) into n from user_tables where table_name='FLOWIA_HAIKU_BUDGET';
  if n>0 then execute immediate 'drop table FLOWIA_HAIKU_BUDGET purge'; end if;
end;
/
declare
  n number;
begin
  select count(*) into n from user_credentials where credential_name='FLOWIA_HAIKU_ANTHROPIC';
  if n>0 then dbms_cloud.drop_credential('FLOWIA_HAIKU_ANTHROPIC'); end if;
end;
/

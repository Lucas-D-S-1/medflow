-- Remove somente o candidato de reescrita; nao altera API, ORDS, perfil ou dados.
begin
  execute immediate 'drop package FLOWIA_HAIKU_REWRITE_API';
exception when others then
  if sqlcode <> -4043 then raise; end if;
end;
/

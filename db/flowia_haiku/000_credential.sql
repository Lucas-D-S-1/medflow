-- Executar pelo provisionador com bind em memoria. Nunca substituir por literal.
begin
  dbms_cloud.create_credential(
    credential_name => 'FLOWIA_HAIKU_ANTHROPIC',
    username => 'ANTHROPIC',
    password => :api_key
  );
end;
/

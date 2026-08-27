-- =====================================================================
-- MedFlow — sincroniza o profile Select AI após a carga territorial
--
-- Este roteiro só altera metadados do profile. Não executa pergunta ao LLM e
-- não consome a cota de inferência; a bateria de revalidação continua sendo
-- uma etapa separada e deliberada.
-- =====================================================================

set serveroutput on

declare
  qt_profile number;
begin
  select count(*)
    into qt_profile
    from user_cloud_ai_profiles
   where profile_name = 'MEDFLOW_GENAI';

  if qt_profile > 0 then
    dbms_cloud_ai.drop_profile(profile_name => 'MEDFLOW_GENAI');
  end if;

  dbms_cloud_ai.create_profile(
      profile_name => 'MEDFLOW_GENAI',
      description  => 'Select AI sobre os doze objetos analíticos do MedFlow',
      attributes   => '{"provider": "oci",
                        "credential_name": "OCI$RESOURCE_PRINCIPAL",
                        "region": "sa-saopaulo-1",
                        "comments": true,
                        "constraints": true,
                        "conversation": true,
                        "object_list": [
                          {"owner": "MEDFLOW", "name": "mart_indicador_hospital_mensal"},
                          {"owner": "MEDFLOW", "name": "mart_indicador_hospital_especialidade_mensal"},
                          {"owner": "MEDFLOW", "name": "mart_indicador_hospital_cid_periodo"},
                          {"owner": "MEDFLOW", "name": "mart_indicador_regiao_mensal"},
                          {"owner": "MEDFLOW", "name": "mart_indicador_regiao_periodo"},
                          {"owner": "MEDFLOW", "name": "mart_fluxo_assistencial_regiao_mensal"},
                          {"owner": "MEDFLOW", "name": "mart_icsap_regiao_mensal"},
                          {"owner": "MEDFLOW", "name": "dim_geografia_regiao"},
                          {"owner": "MEDFLOW", "name": "dim_geografia_municipio"},
                          {"owner": "MEDFLOW", "name": "dim_territorio_municipal"},
                          {"owner": "MEDFLOW", "name": "dim_hospital_territorio_atual"},
                          {"owner": "MEDFLOW", "name": "dim_hospital_alias"}
                        ]}'
    );
  dbms_cloud_ai.set_profile('MEDFLOW_GENAI');
  dbms_output.put_line('Profile MEDFLOW_GENAI sincronizado; nenhuma inferência executada.');
end;
/

select dbms_cloud_ai.get_profile() as profile_ativo from dual;

-- =====================================================================
-- MedFlow — criação do esquema de aplicação
-- Conecte como ADMIN. Executa uma vez, no banco recém-provisionado.
--
-- Motivo: o ADMIN é conta de administração do Autonomous Database. A Gold
-- vive em um esquema próprio, com quota e privilégios mínimos, para que a
-- modelagem fique explícita e o ADMIN não acumule objetos de aplicação.
-- =====================================================================

set define on
set serveroutput on

-- A senha nunca é versionada. O prompt HIDE não ecoa o valor digitado.
-- Regras do Autonomous Database: 12 a 30 caracteres, com pelo menos uma
-- maiúscula, uma minúscula e um dígito; não pode conter aspas duplas nem a
-- palavra do nome de usuário.
accept senha_medflow char prompt 'Senha do usuario MEDFLOW: ' hide

create user medflow identified by "&senha_medflow";

-- DWROLE é o papel padrão do Autonomous Database para esquemas analíticos:
-- entrega CREATE TABLE/VIEW/MVIEW, DBMS_CLOUD e o necessário para carga.
grant dwrole to medflow;
grant unlimited tablespace to medflow;

-- Select AI: o esquema precisa executar o pacote e usar o profile.
grant execute on dbms_cloud_ai to medflow;

-- Habilita o esquema no Database Actions / SQL Developer Web, para
-- demonstrar consultas pelo navegador sem expor o ADMIN.
begin
  ords_admin.enable_schema(
    p_enabled             => true,
    p_schema              => 'MEDFLOW',
    p_url_mapping_type    => 'BASE_PATH',
    p_url_mapping_pattern => 'medflow',
    p_auto_rest_auth      => true
  );
  commit;
end;
/

undefine senha_medflow

-- Conferência: o esquema existe e está aberto.
select username, account_status, default_tablespace
from   dba_users
where  username = 'MEDFLOW';

prompt
prompt Esquema MEDFLOW criado. Rode 02_criar_tabelas_gold.sql conectado como MEDFLOW.
prompt

-- =====================================================================
-- MedFlow — workspace APEX para a demonstração do Select AI
--
-- RODE ESTE ARQUIVO COMO ADMIN, não como MEDFLOW.
--
-- O APEX já vem instalado no Autonomous Database (26.1.3 nesta instância),
-- mas nenhum workspace existe até alguém criar um, e criar workspace exige
-- APEX_ADMINISTRATOR_ROLE. O usuário MEDFLOW tem CONNECT, RESOURCE e DWROLE,
-- e nenhum dos três serve.
--
-- Onde rodar: console OCI -> o banco MEDFLOW -> Database Actions -> entrar
-- como ADMIN -> SQL. Cole este arquivo e execute como script.
--
-- O que ele faz: cria o workspace MEDFLOW_DEMO apontando para o schema
-- MEDFLOW, e dentro dele um usuário desenvolvedor. Não toca em dado nem em
-- estrutura da Gold.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. O workspace, mapeado ao schema que já tem os marts
-- ---------------------------------------------------------------------
-- Seguro para reexecução: se o workspace já existir, o bloco não faz nada.

begin
  for w in (select 1
            from   apex_workspaces
            where  workspace = 'MEDFLOW_DEMO')
  loop
    dbms_output.put_line('Workspace MEDFLOW_DEMO ja existe.');
    return;
  end loop;

  apex_instance_admin.add_workspace(
      p_workspace      => 'MEDFLOW_DEMO',
      p_primary_schema => 'MEDFLOW');

  dbms_output.put_line('Workspace MEDFLOW_DEMO criado sobre o schema MEDFLOW.');
end;
/

-- ---------------------------------------------------------------------
-- 2. O usuário que entra no App Builder
-- ---------------------------------------------------------------------
-- TROQUE A SENHA ABAIXO antes de rodar. Ela não deve voltar para o Git:
-- este arquivo é versionado, o valor real não é.

begin
  apex_util.set_security_group_id(
      apex_util.find_security_group_id('MEDFLOW_DEMO'));

  apex_util.create_user(
      p_user_name                    => 'MEDFLOW_DEV',
      p_web_password                 => 'TROQUE_ESTA_SENHA',
      p_developer_privs              => 'ADMIN:CREATE:DATA_LOADER:EDIT_PUBLIC_'
                                        || 'REPORTS:HELP:MONITOR:SQL',
      p_default_schema               => 'MEDFLOW',
      p_change_password_on_first_use => 'Y');

  commit;
  dbms_output.put_line('Usuario MEDFLOW_DEV criado. Troque a senha no primeiro acesso.');
end;
/

-- ---------------------------------------------------------------------
-- 3. Onde entrar depois
-- ---------------------------------------------------------------------
-- https://gf68e03b2a30d55-medflow.adb.sa-saopaulo-1.oraclecloudapps.com/ords/apex
--
--   workspace: MEDFLOW_DEMO
--   usuário:   MEDFLOW_DEV
--
-- Os passos de montagem da página estão em db/apex/README.md.

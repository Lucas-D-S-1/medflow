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
-- O que ele faz: cria apenas o workspace MEDFLOW_DEMO apontando para o schema
-- MEDFLOW. Não toca em dado nem em estrutura da Gold.
--
-- IMPORTANTE: esta instância autentica o ambiente de desenvolvimento com
-- contas do banco. Criar um usuário apenas com APEX_UTIL.CREATE_USER não basta
-- para entrar no App Builder. Para o primeiro acesso, prefira o formulário
-- oficial em Database Actions -> Administration -> APEX Workspaces: ele cria
-- o workspace e configura a conta inicial corretamente. Se usar este script,
-- configure depois o desenvolvedor pela interface administrativa.
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
-- 2. Onde entrar depois de configurar a conta na Administração do APEX
-- ---------------------------------------------------------------------
-- https://gf68e03b2a30d55-medflow.adb.sa-saopaulo-1.oraclecloudapps.com/ords/apex
--
--   workspace: MEDFLOW_DEMO
--   usuário:   a conta de banco registrada como desenvolvedor
--
-- Os passos de montagem da página estão em db/apex/README.md.

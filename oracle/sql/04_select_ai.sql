-- =====================================================================
-- MedFlow — Select AI sobre a Gold
--
-- ORDEM IMPORTA: rode este roteiro logo depois da carga, não no fim do
-- projeto. O Select AI depende de um provedor de LLM alcançável a partir do
-- banco, e essa é a única dependência do MVP que pode simplesmente não estar
-- disponível na tenancy. Descobrir isso em agosto é barato; descobrir na
-- semana da banca, não.
--
-- Regra de ouro do challenge: nenhuma pergunta vai para o Select AI antes de
-- a resposta estar validada em SQL convencional. A seção 4 traz o SQL de
-- referência de cada pergunta; compare com o que o Select AI gera.
--
-- Os COMMENT ON de 02_criar_tabelas_gold.sql são o que dá contexto ao modelo.
-- O atributo "comments": "true" abaixo é o que os envia junto do prompt.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Como ADMIN: liberar rede e conceder o pacote
-- ---------------------------------------------------------------------
-- Só é necessário para provedor externo (OpenAI, Anthropic, Cohere).
-- Para provider "oci" a chamada ao serviço não sai para a internet pública.
-- Ajuste o host conforme o provedor escolhido.

-- begin
--   dbms_network_acl_admin.append_host_ace(
--     host => 'api.openai.com',
--     ace  => xs$ace_type(privilege_list => xs$name_list('http'),
--                         principal_name => 'MEDFLOW',
--                         principal_type => xs_acl.ptype_db)
--   );
-- end;
-- /

-- grant execute on dbms_cloud_ai to medflow;   -- já feito em 01_criar_usuario_medflow.sql

-- ---------------------------------------------------------------------
-- 2. Como MEDFLOW: credencial do provedor
-- ---------------------------------------------------------------------
-- Credenciais são por esquema. Nenhum segredo é versionado: o valor entra
-- por prompt HIDE e o script usa undefine no fim.

set define on

-- --- Opção A: OCI Generative AI (preferida — não depende de chave externa)
-- Requer que o serviço Generative AI exista na região e esteja liberado para
-- a tenancy. Em tenancy Always Free isso pode não estar disponível: se a
-- criação do profile ou a primeira pergunta falhar por limite de serviço,
-- vá para a Opção B em vez de insistir.

accept ocid_compartimento char prompt 'OCID do compartimento (raiz da tenancy): '
accept regiao_genai       char prompt 'Regiao do Generative AI (ex.: sa-saopaulo-1): '

begin
  dbms_cloud_ai.create_profile(
    profile_name => 'MEDFLOW_GENAI',
    attributes   => '{"provider": "oci",
                      "credential_name": "OCI$RESOURCE_PRINCIPAL",
                      "oci_compartment_id": "&ocid_compartimento",
                      "region": "&regiao_genai",
                      "comments": "true",
                      "conversation": "true",
                      "object_list": [
                        {"owner": "MEDFLOW", "name": "mart_indicador_hospital_mensal"},
                        {"owner": "MEDFLOW", "name": "mart_indicador_hospital_especialidade_mensal"},
                        {"owner": "MEDFLOW", "name": "mart_indicador_hospital_cid_periodo"},
                        {"owner": "MEDFLOW", "name": "mart_indicador_regiao_mensal"},
                        {"owner": "MEDFLOW", "name": "mart_indicador_regiao_periodo"},
                        {"owner": "MEDFLOW", "name": "dim_geografia_regiao"},
                        {"owner": "MEDFLOW", "name": "dim_geografia_municipio"}
                      ]}'
  );
end;
/

-- O principal de recurso precisa estar habilitado na instância para que
-- OCI$RESOURCE_PRINCIPAL exista. Como ADMIN, uma vez:
--   exec dbms_cloud_admin.enable_resource_principal();
-- e no console: política dando ao dynamic group da instância o uso de
-- generative-ai-family no compartimento.

-- --- Opção B: provedor externo, caso a Opção A não esteja disponível
-- accept token_llm char prompt 'API token do provedor: ' hide
-- begin
--   dbms_cloud.create_credential(
--     credential_name => 'MEDFLOW_LLM_CRED',
--     username        => 'OPENAI',
--     password        => '&token_llm'
--   );
-- end;
-- /
-- begin
--   dbms_cloud_ai.create_profile(
--     profile_name => 'MEDFLOW_GENAI',
--     attributes   => '{"provider": "openai",
--                       "credential_name": "MEDFLOW_LLM_CRED",
--                       "comments": "true",
--                       "conversation": "true",
--                       "object_list": [
--                         {"owner": "MEDFLOW", "name": "mart_indicador_hospital_mensal"},
--                         {"owner": "MEDFLOW", "name": "mart_indicador_hospital_especialidade_mensal"},
--                         {"owner": "MEDFLOW", "name": "mart_indicador_hospital_cid_periodo"},
--                         {"owner": "MEDFLOW", "name": "mart_indicador_regiao_mensal"},
--                         {"owner": "MEDFLOW", "name": "mart_indicador_regiao_periodo"},
--                         {"owner": "MEDFLOW", "name": "dim_geografia_regiao"},
--                         {"owner": "MEDFLOW", "name": "dim_geografia_municipio"}
--                       ]}'
--   );
-- end;
-- /
-- undefine token_llm

undefine ocid_compartimento
undefine regiao_genai

-- ---------------------------------------------------------------------
-- 3. Ativar o profile na sessão
-- ---------------------------------------------------------------------

exec dbms_cloud_ai.set_profile('MEDFLOW_GENAI');

select dbms_cloud_ai.get_profile() as profile_ativo from dual;

-- Teste de fumaça: se isto responder, o caminho até o LLM está de pé.
select ai chat em uma frase, o que e o indice de pressao hospitalar;

-- ---------------------------------------------------------------------
-- 4. As três perguntas da demonstração
-- ---------------------------------------------------------------------
-- Para cada uma: o SQL de referência validado primeiro, depois o showsql
-- para comparar o que o modelo gerou, depois a resposta narrada.

-- --- Pergunta 1: onde a rede está sob mais pressão em 2026?

-- SQL de referência:
select nm_regiao_saude,
       round(avg(pc_iph_estimado), 1) as pc_iph_medio_2026,
       sum(qt_internacao_nova)        as qt_internacao_nova
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_iph_medio_2026 desc
fetch  first 5 rows only;

select ai showsql quais as cinco regioes de saude com maior indice de pressao hospitalar medio em 2026;
select ai narrate quais as cinco regioes de saude com maior indice de pressao hospitalar medio em 2026;

-- --- Pergunta 2: onde a mortalidade se concentra, com amostra confiável?

-- SQL de referência:
select nm_especialidade,
       round(avg(pc_tmh), 2) as pc_tmh_medio,
       count(*)              as qt_hospital_mes
from   mart_indicador_hospital_especialidade_mensal
where  st_amostra = 'suficiente'
group  by nm_especialidade
having count(*) >= 100
order  by pc_tmh_medio desc
fetch  first 10 rows only;

select ai showsql quais especialidades tem a maior taxa de mortalidade hospitalar media considerando somente linhas com amostra suficiente;
select ai narrate quais especialidades tem a maior taxa de mortalidade hospitalar media considerando somente linhas com amostra suficiente;

-- --- Pergunta 3: quais diagnósticos internam mais tempo que os pares?

-- SQL de referência:
select ds_cid,
       count(*)                  as qt_hospital,
       round(avg(nr_ipr), 2)     as nr_ipr_medio
from   mart_indicador_hospital_cid_periodo
where  st_amostra = 'suficiente'
group  by ds_cid
having count(*) >= 10
order  by nr_ipr_medio desc
fetch  first 10 rows only;

select ai showsql quais diagnosticos tem permanencia media mais acima do benchmark regional entre as combinacoes com amostra suficiente;
select ai narrate quais diagnosticos tem permanencia media mais acima do benchmark regional entre as combinacoes com amostra suficiente;

-- ---------------------------------------------------------------------
-- 5. Registro da demonstração
-- ---------------------------------------------------------------------
-- Guarde o SQL gerado por cada showsql. Se o modelo divergir do SQL de
-- referência, a correção é melhorar o COMMENT ON da coluna envolvida, não
-- reescrever a pergunta até ela funcionar. Comentário é o contrato que o
-- modelo lê.
--
-- Cuidado conhecido: o IPH nunca deve ser narrado como "ocupação de leito".
-- Se o modelo usar esse termo, ajuste o comentário de nr_iph_estimado e
-- refaça — isso é exatamente o tipo de erro que a banca vai cobrar.

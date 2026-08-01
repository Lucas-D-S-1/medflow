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
-- 1. OCI + ADMIN: habilitar Resource Principal
-- ---------------------------------------------------------------------
-- Etapa unica no console OCI, antes do SQL:
--
-- Dynamic Group: MedFlowADBGenAI
-- Regra:
--   resource.id = 'ocid1.autonomousdatabase.oc1.sa-saopaulo-1.antxeljrrzar6hya26jlu7ktdd4kopieepsu7tn2x54ficuz4ddcrcn37fba'
-- Policy na raiz da tenancy:
--   Allow dynamic-group MedFlowADBGenAI to use generative-ai-family in tenancy
--
-- Depois, conectado como ADMIN, execute uma vez:

begin
  dbms_cloud_admin.enable_principal_auth(provider => 'OCI');
end;
/

begin
  dbms_cloud_admin.enable_resource_principal(username => 'MEDFLOW');
end;
/

-- grant execute on dbms_cloud_ai to medflow; -- ja feito em 01_criar_usuario_medflow.sql

-- ---------------------------------------------------------------------
-- 2. Como MEDFLOW: criar o profile OCI
-- ---------------------------------------------------------------------
-- Nao ha chave de API: OCI$RESOURCE_PRINCIPAL autentica a propria instancia.
-- O bloco e seguro para reexecucao: preserva o profile se ele ja existir.

set serveroutput on

declare
  qt_profile number;
begin
  select count(*)
  into   qt_profile
  from   user_cloud_ai_profiles
  where  profile_name = 'MEDFLOW_GENAI';

  if qt_profile = 0 then
    dbms_cloud_ai.create_profile(
      profile_name => 'MEDFLOW_GENAI',
      description  => 'Select AI sobre os sete objetos Gold do MedFlow',
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
                          {"owner": "MEDFLOW", "name": "dim_geografia_regiao"},
                          {"owner": "MEDFLOW", "name": "dim_geografia_municipio"}
                        ]}'
    );
    dbms_output.put_line('Profile MEDFLOW_GENAI criado.');
  else
    dbms_output.put_line('Profile MEDFLOW_GENAI ja existe; preservado.');
  end if;
end;
/

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

select ai showsql quais sao as dez especialidades com maior taxa de mortalidade hospitalar media? Primeiro filtre st_amostra igual a suficiente, depois agrupe por especialidade e mantenha somente grupos com pelo menos 100 linhas hospital-mes;
select ai narrate quais sao as dez especialidades com maior taxa de mortalidade hospitalar media? Primeiro filtre st_amostra igual a suficiente, depois agrupe por especialidade e mantenha somente grupos com pelo menos 100 linhas hospital-mes;

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

select ai showsql quais sao os dez diagnosticos com maior IPR medio, considerando somente combinacoes hospital-CID com amostra suficiente e pelo menos 10 combinacoes por diagnostico;
select ai narrate quais sao os dez diagnosticos com maior IPR medio, considerando somente combinacoes hospital-CID com amostra suficiente e pelo menos 10 combinacoes por diagnostico;

-- ---------------------------------------------------------------------
-- 5. Registro da demonstração
-- ---------------------------------------------------------------------
-- Guarde o SQL gerado por cada showsql. Se o modelo errar a semantica de uma
-- coluna, melhore o COMMENT ON correspondente. Se a pergunta omitir um corte
-- de negocio presente no SQL de referencia, torne esse corte explicito uma
-- unica vez; nao ajuste a frase por tentativa e erro. Comentarios e criterios
-- declarados formam o contrato que o modelo le.
--
-- Cuidado conhecido: o IPH nunca deve ser narrado como "ocupação de leito".
-- Se o modelo usar esse termo, ajuste o comentário de nr_iph_estimado e
-- refaça — isso é exatamente o tipo de erro que a banca vai cobrar.

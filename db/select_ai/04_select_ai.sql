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
-- O bloco e seguro para reexecucao: recria o profile para sincronizar a lista
-- de objetos com o contrato Gold vigente.

set serveroutput on

declare
  qt_profile number;
begin
  select count(*)
  into   qt_profile
  from   user_cloud_ai_profiles
  where  profile_name = 'MEDFLOW_GENAI';

  if qt_profile > 0 then
    dbms_cloud_ai.drop_profile(profile_name => 'MEDFLOW_GENAI');
  end if;
  dbms_cloud_ai.create_profile(
      profile_name => 'MEDFLOW_GENAI',
      description  => 'Select AI sobre os nove objetos Gold do MedFlow',
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
                          {"owner": "MEDFLOW", "name": "dim_geografia_municipio"}
                        ]}'
    );
  dbms_output.put_line('Profile MEDFLOW_GENAI sincronizado com o contrato 0.3.0.');
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
-- 4. O roteiro da demonstração
-- ---------------------------------------------------------------------
-- As perguntas saíram deste arquivo. Elas vivem agora em
-- src/medflow/select_ai/perguntas.py, e o roteiro inteiro é executado por
--
--     make select-ai-revalidar
--
-- Não é organização por organização. Aqui as perguntas eram texto: alguém
-- rodava, olhava o showsql, achava parecido com o SQL de referência e seguia.
-- "Achei parecido" não responde a única pergunta que a banca faz, que é como
-- se sabe que o modelo acertou.
--
-- No roteiro executável, cada pergunta com SQL de referência roda as duas
-- consultas contra este banco e compara as respostas pela sequência ordenada
-- de rótulos — a lista de regiões, de especialidades, de diagnósticos. É o que
-- a pergunta de negócio pede, e é o que precisa bater. O comando sai com
-- código 1 se alguma divergir.
--
-- São treze perguntas em cinco blocos, de dificuldade crescente:
--
--   A. leitura direta, uma tabela e um corte;
--   B. junção entre marts e colunas de estado;
--   C. armadilhas, onde a resposta certa é recusar ou ressalvar;
--   D. conversação, a pergunta que só existe depois da anterior;
--   E. a mesma pergunta com e sem os dados na frente, chat contra narrate.
--
-- O SQL vindo do modelo é tratado como entrada não confiável: só executa se
-- for consulta de leitura, e numa transação declarada somente leitura. O
-- guarda e a varredura de terminologia estão fixados em
-- tests/test_select_ai.py e rodam sem Oracle.
--
-- A evidência datada da última execução fica em
-- docs/qualidade/REVALIDACAO_SELECT_AI.md, e a leitura do que ela significa,
-- em docs/qualidade/LEITURA_SELECT_AI.md.

-- ---------------------------------------------------------------------
-- 5. Quando o modelo erra
-- ---------------------------------------------------------------------
-- Os COMMENT ON de 02_criar_tabelas_gold.sql são o contrato que o modelo lê.
-- Se ele errar a semântica de uma coluna, melhore o comentário correspondente
-- e reexecute. Se a pergunta omitir um corte de negócio presente no SQL de
-- referência, torne esse corte explícito uma única vez; não ajuste a frase por
-- tentativa e erro.
--
-- Mas saiba o que o comentário consegue e o que não consegue. Medido na
-- execução de 23/08/2026, depois de reforçar os comentários das três tabelas
-- regionais e das duas colunas de IPH:
--
--   - o COMMENT ON governa bem a geração de SQL;
--   - não governa a redação da narrativa. Perguntado por "taxa de ocupação",
--     o modelo escolheu a coluna certa e narrou o número com o rótulo errado
--     da pergunta, mesmo com o comentário proibindo o termo nome por nome;
--   - não obriga a agregar antes de ranquear. Nos marts mensais, o modelo
--     ordena as linhas mensais e devolve o mês extremo, não a região extrema.
--
-- Isso não é motivo para esconder o Select AI: é o motivo pelo qual ele é
-- demonstração controlada e as telas do produto usam consultas determinísticas
-- sobre a Gold. Os detalhes estão em docs/qualidade/LEITURA_SELECT_AI.md.

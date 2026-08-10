-- =====================================================================
-- MedFlow — reconciliação da Gold carregada no Autonomous AI Lakehouse
-- Conecte como MEDFLOW, depois de rodar carregar_gold.py.
--
-- Os valores esperados vêm de dados/gold/qualidade/METADADOS.json, contrato
-- 0.3.0, gerado em 01/08/2026. Toda linha deve sair como "ok". Qualquer
-- DIVERGENTE significa que a carga não reproduz o gate técnico aprovado e o
-- dashboard não deve ser construído sobre essa base.
-- =====================================================================

set pagesize 200
set linesize 140
column metrica       format a56
column esperado      format 999g999g999
column obtido        format 999g999g999
column estado        format a12

with conferencia (ordem, metrica, esperado, obtido) as (

  -- Contagem de linhas por tabela
  select 1, 'linhas dim_geografia_regiao', 62,
         (select count(*) from dim_geografia_regiao) from dual
  union all
  select 2, 'linhas dim_geografia_municipio', 645,
         (select count(*) from dim_geografia_municipio) from dual
  union all
  select 3, 'linhas mart_indicador_hospital_mensal', 19341,
         (select count(*) from mart_indicador_hospital_mensal) from dual
  union all
  select 4, 'linhas mart_indicador_hospital_especialidade_mensal', 54328,
         (select count(*) from mart_indicador_hospital_especialidade_mensal) from dual
  union all
  select 5, 'linhas mart_indicador_hospital_cid_periodo', 455054,
         (select count(*) from mart_indicador_hospital_cid_periodo) from dual
  union all
  select 6, 'linhas mart_indicador_regiao_mensal', 1860,
         (select count(*) from mart_indicador_regiao_mensal) from dual
  union all
  select 7, 'linhas mart_indicador_regiao_periodo', 62,
         (select count(*) from mart_indicador_regiao_periodo) from dual

  -- Reconciliação do total de internações novas: os quatro marts partem do
  -- mesmo fato e têm de fechar no mesmo número.
  union all
  select 8, 'internacoes novas em hospital_mensal', 7150693,
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal) from dual
  union all
  select 9, 'internacoes novas em especialidade_mensal', 7150693,
         (select sum(qt_internacao_nova) from mart_indicador_hospital_especialidade_mensal) from dual
  union all
  select 10, 'internacoes novas em hospital_cid_periodo', 7150693,
         (select sum(qt_internacao_nova) from mart_indicador_hospital_cid_periodo) from dual
  union all
  select 11, 'internacoes novas em regiao_mensal', 7150693,
         (select sum(qt_internacao_nova) from mart_indicador_regiao_mensal) from dual
  union all
  select 12, 'internacoes novas em regiao_periodo', 7150693,
         (select sum(qt_internacao_nova) from mart_indicador_regiao_periodo) from dual

  -- Métricas do gate técnico
  union all
  select 13, 'pacientes-dia estimados', 33593969,
         (select sum(qt_paciente_dia_estimado) from mart_indicador_hospital_mensal) from dual
  union all
  select 14, 'hospitais-mes acima da capacidade declarada', 511,
         (select sum(fl_acima_capacidade_declarada) from mart_indicador_hospital_mensal) from dual
  union all
  select 15, 'hospitais-mes sem leito SUS declarado', 146,
         (select count(*) from mart_indicador_hospital_mensal
          where st_capacidade = 'sem_leito_sus_declarado') from dual
  union all
  select 16, 'IPH nulo por ausencia de leito SUS declarado', 146,
         (select count(*) from mart_indicador_hospital_mensal
          where nr_iph_estimado is null) from dual
  union all
  select 17, 'combinacoes IPR elegiveis', 31452,
         (select count(*) from mart_indicador_hospital_cid_periodo
          where nr_ipr is not null) from dual
  union all
  select 18, 'combinacoes IPR com amostra suficiente', 31452,
         (select count(*) from mart_indicador_hospital_cid_periodo
          where st_amostra = 'suficiente') from dual
  union all
  select 19, 'linhas TMH/CMI com amostra suficiente', 37257,
         (select count(*) from mart_indicador_hospital_especialidade_mensal
          where st_amostra = 'suficiente') from dual
  union all
  select 20, 'linhas de IS calculadas', 372,
         (select count(*) from mart_indicador_regiao_mensal
          where nr_indice_sazonalidade is not null) from dual
  union all
  select 21, 'linhas de IS com estado calculado', 372,
         (select count(*) from mart_indicador_regiao_mensal
          where st_indice_sazonalidade = 'calculado') from dual

  -- Cardinalidades do recorte
  union all
  select 22, 'competencias distintas', 30,
         (select count(distinct cd_competencia) from mart_indicador_hospital_mensal) from dual
  union all
  select 23, 'hospitais distintos', 655,
         (select count(distinct cd_cnes) from mart_indicador_hospital_mensal) from dual
  union all
  select 24, 'regioes de saude distintas', 62,
         (select count(distinct cd_regiao_saude) from mart_indicador_regiao_mensal) from dual
  union all
  select 25, 'municipios na dimensao de geografia', 645,
         (select count(distinct cd_municipio_ibge_7) from dim_geografia_municipio) from dual

  -- Novos produtos territoriais do contrato 0.3.0
  union all
  select 26, 'linhas mart_fluxo_assistencial_regiao_mensal', 31033,
         (select count(*) from mart_fluxo_assistencial_regiao_mensal) from dual
  union all
  select 27, 'linhas mart_icsap_regiao_mensal', 35340,
         (select count(*) from mart_icsap_regiao_mensal) from dual
  union all
  select 28, 'internacoes novas no fluxo origem-destino', 7150693,
         (select sum(qt_internacao_nova) from mart_fluxo_assistencial_regiao_mensal) from dual
  union all
  select 29, 'internacoes de residentes SP observadas', 7089959,
         (select sum(qt_internacao_residente_observada) from mart_indicador_regiao_mensal) from dual
  union all
  select 30, 'residentes fora de SP atendidos', 60734,
         (select sum(qt_internacao_recebida_fora_sp) from mart_indicador_regiao_mensal) from dual
  union all
  select 31, 'ICSAP no resumo regional', 988453,
         (select sum(qt_internacao_icsap_residente_observada) from mart_indicador_regiao_mensal) from dual
  union all
  select 32, 'ICSAP no detalhamento por grupo', 988453,
         (select sum(qt_internacao_icsap) from mart_icsap_regiao_mensal) from dual
  union all
  select 33, 'evasao intrastadual observada', 939143,
         (select sum(qt_evasao_intrastadual_observada) from mart_indicador_regiao_mensal) from dual
  union all
  select 34, 'atracao entre regioes de SP', 939143,
         (select sum(qt_internacao_recebida_outra_regiao_sp) from mart_indicador_regiao_mensal) from dual
  union all
  select 35, 'competencia do preco de referencia IPCA', 202606,
         (select to_number(max(cd_competencia_preco_referencia)) from mart_indicador_regiao_mensal) from dual
  union all
  select 36, 'grupos ICSAP distintos', 19,
         (select count(distinct cd_grupo_icsap) from mart_icsap_regiao_mensal) from dual
)
select metrica,
       esperado,
       obtido,
       case when obtido = esperado then 'ok' else 'DIVERGENTE' end as estado
from   conferencia
order  by ordem;

prompt
prompt Integridade referencial: as consultas abaixo devem retornar zero linhas.
prompt

-- Nenhum mart pode referenciar região inexistente na dimensão.
select 'hospital_mensal sem regiao' as verificacao, count(*) as linhas
from   mart_indicador_hospital_mensal m
where  not exists (select 1 from dim_geografia_regiao d
                   where d.cd_regiao_saude = m.cd_regiao_saude)
having count(*) > 0
union all
select 'hospital_cid_periodo sem regiao', count(*)
from   mart_indicador_hospital_cid_periodo m
where  not exists (select 1 from dim_geografia_regiao d
                   where d.cd_regiao_saude = m.cd_regiao_saude)
having count(*) > 0;

select 'fluxo sem regiao de atendimento' as verificacao, count(*) as linhas
from   mart_fluxo_assistencial_regiao_mensal m
where  not exists (select 1 from dim_geografia_regiao d
                   where d.cd_regiao_saude = m.cd_regiao_saude_atendimento)
having count(*) > 0
union all
select 'ICSAP sem regiao de residencia', count(*)
from   mart_icsap_regiao_mensal m
where  not exists (select 1 from dim_geografia_regiao d
                   where d.cd_regiao_saude = m.cd_regiao_saude)
having count(*) > 0;

-- A decomposicao por grupo deve fechar o total regional e 100% em cada mes.
select 'soma de grupos ICSAP divergente' as verificacao, count(*) as linhas
from (
  select cd_regiao_saude, cd_competencia
  from   mart_icsap_regiao_mensal
  group  by cd_regiao_saude, cd_competencia, qt_internacao_icsap_total_regiao
  having sum(qt_internacao_icsap) <> qt_internacao_icsap_total_regiao
     or abs(sum(pc_grupo_no_total_icsap) - 100) > 0.01
)
having count(*) > 0;

-- As saidas entre regioes paulistas devem ser iguais as entradas correspondentes.
select 'fluxo interregional assimetrico' as verificacao, count(*) as linhas
from dual
where (select sum(qt_evasao_intrastadual_observada)
       from mart_indicador_regiao_mensal)
   <> (select sum(qt_internacao_recebida_outra_regiao_sp)
       from mart_indicador_regiao_mensal)
having count(*) > 0;

-- O IPH só pode ser nulo quando o hospital não declarou leito SUS. Qualquer
-- outra combinação indica perda de dado na carga, não decisão de contrato.
select 'IPH nulo com capacidade disponivel' as verificacao, count(*) as linhas
from   mart_indicador_hospital_mensal
where  nr_iph_estimado is null
and    st_capacidade <> 'sem_leito_sus_declarado'
having count(*) > 0;

-- A flag de pressão acima da capacidade exige IPH maior que 1.
select 'flag acima da capacidade inconsistente' as verificacao, count(*) as linhas
from   mart_indicador_hospital_mensal
where  fl_acima_capacidade_declarada = 1
and    (nr_iph_estimado is null or nr_iph_estimado <= 1)
having count(*) > 0;

prompt
prompt Validacao concluida. Toda linha do quadro acima deve estar "ok" e as
prompt verificacoes de integridade devem vir vazias.
prompt

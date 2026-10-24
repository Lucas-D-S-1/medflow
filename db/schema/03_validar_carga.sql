-- =====================================================================
-- MedFlow — reconciliação da Gold carregada no Autonomous AI Lakehouse
-- Conecte como MEDFLOW, depois de rodar carregar_gold.py.
--
-- Invariantes independentes de competencia: totais cruzados entre marts,
-- cobertura dos estados e grade mensal. Nao substituem a comparacao da carga
-- com os Parquets de origem (carregar_gold.py --conferir e reconciliacao).
-- Toda linha deve sair como "ok"; DIVERGENTE exige investigar antes de publicar.
-- =====================================================================

set pagesize 200
set linesize 140
column metrica       format a56
column esperado      format 999g999g999
column obtido        format 999g999g999
column estado        format a12

with conferencia (ordem, metrica, esperado, obtido) as (
  select 1, 'regioes oficiais',
         62,
         (select count(*) from dim_geografia_regiao) from dual
  union all
  select 2, 'municipios oficiais',
         645,
         (select count(*) from dim_geografia_municipio) from dual
  union all
  select 3, 'distritos municipais',
         96,
         (select count(*) from dim_territorio_municipal) from dual
  union all
  select 4, 'grupos ICSAP',
         19,
         (select count(distinct cd_grupo_icsap) from mart_icsap_regiao_mensal) from dual
  union all
  select 5, 'grade regional mensal',
         62 * (select count(distinct cd_competencia) from mart_indicador_hospital_mensal),
         (select count(*) from mart_indicador_regiao_mensal) from dual
  union all
  select 6, 'competencias contiguas',
         (select months_between(to_date(max(cd_competencia),'YYYYMM'),to_date(min(cd_competencia),'YYYYMM')) + 1 from mart_indicador_hospital_mensal),
         (select count(distinct cd_competencia) from mart_indicador_hospital_mensal) from dual
  union all
  select 7, 'internacoes reconciliadas mart_indicador_hospital_especialidade_mensal',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_nova) from mart_indicador_hospital_especialidade_mensal) from dual
  union all
  select 8, 'internacoes reconciliadas mart_indicador_hospital_cid_periodo',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_nova) from mart_indicador_hospital_cid_periodo) from dual
  union all
  select 9, 'internacoes reconciliadas mart_indicador_regiao_mensal',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_nova) from mart_indicador_regiao_mensal) from dual
  union all
  select 10, 'internacoes reconciliadas mart_indicador_regiao_periodo',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_nova) from mart_indicador_regiao_periodo) from dual
  union all
  select 11, 'internacoes reconciliadas mart_fluxo_assistencial_regiao_mensal',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_nova) from mart_fluxo_assistencial_regiao_mensal) from dual
  union all
  select 12, 'internacoes reconciliadas mart_indicador_hospital_especialidade_cid_mensal',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_nova) from mart_indicador_hospital_especialidade_cid_mensal) from dual
  union all
  select 13, 'qt_paciente_dia_estimado hospital/regiao',
         (select sum(qt_paciente_dia_estimado) from mart_indicador_hospital_mensal),
         (select sum(qt_paciente_dia_estimado) from mart_indicador_regiao_mensal) from dual
  union all
  select 14, 'qt_dia_permanencia_soma hospital/regiao',
         (select sum(qt_dia_permanencia_soma) from mart_indicador_hospital_mensal),
         (select sum(qt_dia_permanencia_soma) from mart_indicador_regiao_mensal) from dual
  union all
  select 15, 'ICSAP resumo/grupos',
         (select sum(qt_internacao_icsap_residente_observada) from mart_indicador_regiao_mensal),
         (select sum(qt_internacao_icsap) from mart_icsap_regiao_mensal) from dual
  union all
  select 16, 'fluxo interregional',
         (select sum(qt_evasao_intrastadual_observada) from mart_indicador_regiao_mensal),
         (select sum(qt_internacao_recebida_outra_regiao_sp) from mart_indicador_regiao_mensal) from dual
  union all
  select 17, 'residencia e oferta',
         (select sum(qt_internacao_nova) from mart_indicador_hospital_mensal),
         (select sum(qt_internacao_residente_observada) from mart_indicador_regiao_mensal) + (select sum(qt_internacao_recebida_fora_sp) from mart_indicador_regiao_mensal) from dual
  union all
  select 18, 'referencia IPCA acompanha recorte',
         (select to_number(max(cd_competencia)) from mart_indicador_regiao_mensal),
         (select to_number(max(cd_competencia_preco_referencia)) from mart_indicador_regiao_mensal) from dual
  union all
  select 19, 'IPE suficiente/elegivel',
         (select count(*) from mart_indicador_hospital_especialidade_mensal where st_amostra_ipe = 'suficiente'),
         (select count(*) from mart_indicador_hospital_especialidade_mensal where nr_ipe is not null) from dual
  union all
  select 20, 'IPE estados completos',
         (select count(*) from mart_indicador_hospital_especialidade_mensal),
         (select count(*) from mart_indicador_hospital_especialidade_mensal where st_amostra_ipe in ('suficiente','benchmark_zero','amostra_insuficiente')) from dual
  union all
  select 21, 'IPE resumo hospitais',
         (select count(*) from mart_indicador_hospital_especialidade_mensal where nr_ipe is not null),
         (select sum(qt_especialidade_ipe_elegivel) from mart_indicador_hospital_mensal) from dual
  union all
  select 22, 'IPE resumo regioes',
         (select count(*) from mart_indicador_hospital_especialidade_mensal where nr_ipe is not null),
         (select sum(qt_hospital_especialidade_ipe_elegivel) from mart_indicador_regiao_mensal) from dual
  union all
  select 23, 'IPE acima da referencia',
         (select sum(qt_especialidade_ipe_acima_referencia) from mart_indicador_hospital_mensal),
         (select sum(qt_hospital_especialidade_ipe_acima_referencia) from mart_indicador_regiao_mensal) from dual
  union all
  select 24, 'IPR estados completos',
         (select count(*) from mart_indicador_hospital_cid_periodo),
         (select count(*) from mart_indicador_hospital_cid_periodo where st_amostra in ('suficiente','benchmark_zero','amostra_insuficiente')) from dual
  union all
  select 25, 'IPR elegivel/suficiente',
         (select count(*) from mart_indicador_hospital_cid_periodo where st_amostra = 'suficiente'),
         (select count(*) from mart_indicador_hospital_cid_periodo where nr_ipr is not null) from dual
  union all
  select 26, 'diagnosticos estados completos',
         (select count(*) from mart_indicador_hospital_especialidade_cid_mensal),
         (select count(*) from mart_indicador_hospital_especialidade_cid_mensal where st_amostra in ('suficiente','benchmark_zero','amostra_insuficiente')) from dual
  union all
  select 27, 'diagnosticos elegivel/suficiente',
         (select count(*) from mart_indicador_hospital_especialidade_cid_mensal where st_amostra = 'suficiente'),
         (select count(*) from mart_indicador_hospital_especialidade_cid_mensal where nr_ipr is not null) from dual
  union all
  select 28, 'IPH denominador nulo',
         (select count(*) from mart_indicador_hospital_mensal where st_capacidade = 'sem_leito_sus_declarado'),
         (select count(*) from mart_indicador_hospital_mensal where nr_iph_estimado is null) from dual
)
select metrica, esperado, obtido,
       case when obtido = esperado then 'ok' else 'DIVERGENTE' end as estado
from conferencia
order by ordem;

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
having count(*) > 0
union all
select 'hospital_especialidade_cid_mensal sem regiao', count(*)
from   mart_indicador_hospital_especialidade_cid_mensal m
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

-- A dimensão territorial atual conserva inclusive os seis pontos do CNES
-- que ficaram fora da malha; eles não podem desaparecer por um filtro.
select 'hospital CNES fora da malha perdido' as verificacao, count(*) as linhas
from   dim_hospital_territorio_atual
where  tp_metodo_atribuicao = 'ponto_fora_da_malha'
having count(*) <> 6;

select 'alias Ermelino ausente' as verificacao, count(*) as linhas
from   dim_hospital_alias
where  cd_cnes = '2082829'
and    nm_alias_normalizado = 'ERMELINO MATARAZZO'
having count(*) <> 1;

select 'territorio Ermelino inconsistente' as verificacao, count(*) as linhas
from   dim_hospital_territorio_atual h
where  h.cd_cnes = '2082829'
and    (h.cd_distrito_sp <> '28'
        or h.id_crs_sms_sp <> '2'
        or h.id_sts_sms_sp <> '6'
        or h.tp_metodo_atribuicao <> 'ponto_em_poligono')
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

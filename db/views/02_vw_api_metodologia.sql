create or replace view vw_api_metodologia as
with regiao as (
  select max(cd_competencia) as cd_competencia_maxima,
         max(cd_competencia_preco_referencia) as cd_competencia_preco_referencia,
         count(distinct cd_competencia) as qt_competencia,
         sum(qt_internacao_nova) as qt_internacao_nova,
         sum(qt_paciente_dia_estimado) as qt_paciente_dia_estimado,
         sum(qt_dia_permanencia_soma) as qt_dia_permanencia_soma,
         count(*) as qt_linhas_regiao_mensal
    from mart_indicador_regiao_mensal
),
hospital as (
  select count(*) as qt_linhas_hospital_mensal,
         count(distinct cd_cnes) as qt_hospital,
         sum(qt_internacao_nova) as qt_internacao_nova,
         sum(qt_paciente_dia_estimado) as qt_paciente_dia_estimado,
         sum(qt_dia_permanencia_soma) as qt_dia_permanencia_soma,
         sum(fl_acima_capacidade_declarada) as qt_hospital_mes_acima_capacidade,
         sum(case when st_capacidade = 'sem_leito_sus_declarado' then 1 else 0 end)
           as qt_hospital_mes_sem_leito_sus
    from mart_indicador_hospital_mensal
),
periodo_regiao as (
  select count(*) as qt_linhas_regiao_periodo,
         sum(nvl(qt_combinacao_ipr_elegivel, 0)) as qt_combinacao_ipr_elegivel
    from mart_indicador_regiao_periodo
),
ipr as (
  select sum(case when st_amostra = 'benchmark_zero' then 1 else 0 end)
           as qt_benchmark_zero,
         sum(case when st_amostra = 'amostra_insuficiente' then 1 else 0 end)
           as qt_ipr_amostra_insuficiente
    from mart_indicador_hospital_cid_periodo
),
-- O IPE e a mesma construcao do IPR um degrau acima no grao, entao presta
-- contas do mesmo jeito: quantas linhas sao elegiveis e por que as demais
-- nao sao. Sem isso a tela mostraria um indicador cuja cobertura ninguem
-- consegue conferir.
ipe as (
  select sum(case when st_amostra_ipe = 'suficiente' then 1 else 0 end)
           as qt_ipe_elegivel,
         sum(case when st_amostra_ipe = 'benchmark_zero' then 1 else 0 end)
           as qt_ipe_benchmark_zero,
         sum(case when st_amostra_ipe = 'amostra_insuficiente' then 1 else 0 end)
           as qt_ipe_amostra_insuficiente
    from mart_indicador_hospital_especialidade_mensal
)
select '0.4.0' as contract_version,
       case
         when r.cd_competencia_maxima is null then null
         else substr(r.cd_competencia_maxima, 1, 4)
           || '-'
           || substr(r.cd_competencia_maxima, 5, 2)
       end as data_through,
       r.cd_competencia_preco_referencia,
       (select m.gerado_em_utc from gold_manifesto m) as gold_updated_at,
       (select count(*) from dim_geografia_regiao) as qt_regiao_saude,
       r.qt_competencia,
       r.qt_internacao_nova,
       r.qt_paciente_dia_estimado,
       r.qt_dia_permanencia_soma,
       r.qt_linhas_regiao_mensal,
       h.qt_hospital,
       h.qt_linhas_hospital_mensal,
       h.qt_internacao_nova as qt_internacao_nova_hospital,
       h.qt_paciente_dia_estimado as qt_paciente_dia_estimado_hospital,
       h.qt_dia_permanencia_soma as qt_dia_permanencia_soma_hospital,
       (select count(*) from mart_indicador_hospital_especialidade_mensal)
         as qt_linhas_hospital_especialidade_mensal,
       (select count(*) from mart_indicador_hospital_cid_periodo)
         as qt_linhas_hospital_cid_periodo,
       p.qt_linhas_regiao_periodo,
       (select count(*) from mart_fluxo_assistencial_regiao_mensal)
         as qt_linhas_fluxo,
       (select count(*) from mart_icsap_regiao_mensal)
         as qt_linhas_icsap,
       p.qt_combinacao_ipr_elegivel,
       h.qt_hospital_mes_acima_capacidade,
       h.qt_hospital_mes_sem_leito_sus,
       i.qt_benchmark_zero,
       i.qt_ipr_amostra_insuficiente,
       e.qt_ipe_elegivel,
       e.qt_ipe_benchmark_zero,
       e.qt_ipe_amostra_insuficiente
  from regiao r
 cross join hospital h
 cross join periodo_regiao p
 cross join ipr i
 cross join ipe e;

comment on table vw_api_metodologia is
  'Cobertura, reconciliacoes e competencia da Gold para a tela de metodologia. Os valores sao leituras ou agregacoes de colunas persistidas; a view nao recalcula indicadores. gold_updated_at corresponde ao gerado_em_utc do manifesto Gold publicado.';

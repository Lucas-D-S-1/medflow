create or replace view vw_api_fluxos as
select f.cd_origem_residencia,
       f.cd_regiao_saude_atendimento,
       f.nr_ano_competencia,
       f.nr_mes_competencia,
       f.cd_competencia,
       f.st_fluxo_assistencial,
       f.qt_internacao_nova,
       f.nm_origem_residencia,
       f.cd_macrorregiao_origem,
       f.nm_macrorregiao_origem,
       f.nm_regiao_saude_atendimento,
       f.cd_macrorregiao_atendimento,
       f.nm_macrorregiao_atendimento,
       f.pc_origem_no_atendimento,
       f.pc_destino_na_origem_observada,
       r.qt_populacao_ibge_2022,
       r.qt_internacao_nova as qt_internacao_producao_territorio,
       r.qt_internacao_residente_observada,
       r.qt_internacao_residente_na_propria_regiao,
       r.qt_evasao_intrastadual_observada,
       r.qt_internacao_recebida_outra_regiao_sp,
       r.qt_internacao_recebida_fora_sp,
       r.tx_internacao_residente_observada_por_100_mil,
       r.pc_evasao_intrastadual_observada,
       r.pc_atracao_assistencial,
       intra.pc_destino_na_origem_observada as pc_atendimento_intrarregional
  from mart_fluxo_assistencial_regiao_mensal f
  left join mart_indicador_regiao_mensal r
    on r.cd_regiao_saude = f.cd_origem_residencia
   and r.cd_competencia = f.cd_competencia
  left join mart_fluxo_assistencial_regiao_mensal intra
    on intra.cd_origem_residencia = f.cd_origem_residencia
   and intra.cd_regiao_saude_atendimento = f.cd_origem_residencia
   and intra.cd_competencia = f.cd_competencia;

comment on table vw_api_fluxos is
  'Fluxos mensais agregados entre regiao de residencia e regiao de atendimento. A view le pares, indicadores territoriais, amostras e denominadores ja persistidos na Gold; nao recalcula indicadores.';

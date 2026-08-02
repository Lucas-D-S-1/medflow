create or replace view vw_api_icsap as
select i.cd_regiao_saude,
       i.nm_regiao_saude,
       i.cd_macrorregiao_saude,
       i.nm_macrorregiao_saude,
       i.qt_populacao_ibge_2022,
       i.nr_ano_competencia,
       i.nr_mes_competencia,
       i.cd_competencia,
       i.cd_grupo_icsap,
       i.nm_grupo_icsap,
       i.qt_internacao_icsap,
       i.qt_internacao_icsap_total_regiao,
       i.pc_grupo_no_total_icsap,
       i.tx_icsap_grupo_por_10_mil_habitantes,
       r.qt_internacao_residente_observada,
       r.qt_internacao_icsap_residente_observada,
       r.pc_icsap_no_total_internacao_residente_observada,
       r.tx_icsap_residente_observada_por_10_mil
  from mart_icsap_regiao_mensal i
  left join mart_indicador_regiao_mensal r
    on r.cd_regiao_saude = i.cd_regiao_saude
   and r.cd_competencia = i.cd_competencia;

comment on table vw_api_icsap is
  'Composicao mensal das internacoes por condicoes sensiveis a atencao primaria nos 19 grupos oficiais da Portaria 221/2008, por regiao de residencia. A view le grupos, totais, participacoes, taxas e denominadores ja persistidos na Gold; nao recalcula indicadores.';

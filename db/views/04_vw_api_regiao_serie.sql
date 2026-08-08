create or replace view vw_api_regiao_serie as
select r.cd_regiao_saude,
       r.nm_regiao_saude,
       r.cd_macrorregiao_saude,
       r.nm_macrorregiao_saude,
       r.nr_ano_competencia,
       r.nr_mes_competencia,
       r.cd_competencia,
       r.qt_internacao_nova,
       r.qt_obito,
       r.qt_dia_permanencia_soma,
       r.vl_aprovado_internacao_nova_soma,
       r.qt_hospital_com_internacao,
       r.qt_paciente_dia_estimado,
       r.qt_leito_sus,
       r.qt_capacidade_teorica_leito_dia,
       r.pc_tmh,
       r.vl_cmi,
       r.nr_permanencia_media,
       r.nr_iph_estimado,
       r.pc_iph_estimado,
       r.qt_internacao_media_historica,
       r.qt_ano_historico,
       r.nr_indice_sazonalidade,
       r.pc_variacao_sazonal,
       r.st_indice_sazonalidade,
       r.cd_competencia_preco_referencia,
       r.vl_aprovado_internacao_nova_real_soma,
       r.vl_cmi_real
  from mart_indicador_regiao_mensal r;

comment on table vw_api_regiao_serie is
  'Serie mensal de uma regiao para a visao executiva. A view le indicadores, amostras e denominadores persistidos na Gold; nao recalcula indicadores.';

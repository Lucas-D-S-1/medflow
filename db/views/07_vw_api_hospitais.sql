create or replace view vw_api_hospitais as
select h.cd_cnes,
       h.nm_hospital_atual,
       h.cd_tipo_unidade,
       h.nm_tipo_unidade,
       h.cd_municipio_ibge_6,
       h.cd_regiao_saude,
       h.nm_regiao_saude,
       h.cd_macrorregiao_saude,
       h.nm_macrorregiao_saude,
       t.cd_distrito_sp,
       t.id_subprefeitura_sp,
       t.id_crs_sms_sp,
       t.id_sts_sms_sp,
       t.nm_bairro_cnes_atual,
       t.tp_metodo_atribuicao,
       t.fl_atribuicao_ambigua,
       h.nr_ano_competencia,
       h.nr_mes_competencia,
       h.cd_competencia,
       h.qt_leito_sus,
       h.qt_leito_total,
       h.qt_capacidade_teorica_leito_dia,
       h.qt_paciente_dia_estimado,
       h.qt_internacao_nova,
       h.qt_obito,
       h.qt_dia_permanencia_soma,
       h.pc_iph_estimado,
       h.pc_tmh,
       h.vl_cmi,
       h.vl_cmi_real,
       h.nr_permanencia_media,
       h.cd_competencia_preco_referencia,
       h.st_amostra,
       h.st_capacidade,
       h.fl_acima_capacidade_declarada
  from mart_indicador_hospital_mensal h
  left join dim_hospital_territorio_atual t
    on t.cd_cnes = h.cd_cnes;

comment on table vw_api_hospitais is
  'Indicadores mensais por hospital (CNES), com regiao de saude, denominadores, amostras, estado de capacidade e atribuicao territorial municipal atual. A view nao recalcula indicadores.';

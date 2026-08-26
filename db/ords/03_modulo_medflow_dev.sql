begin
  ords.define_module(
    p_module_name    => 'medflow_dev',
    p_base_path      => 'api/dev/v1/',
    p_items_per_page => 100,
    p_status         => 'PUBLISHED',
    p_comments       => 'Contrato de leitura MedFlow v1 para desenvolvimento.'
  );

  ords.set_module_origins_allowed(
    p_module_name     => 'medflow_dev',
    p_origins_allowed => 'http://localhost:5173'
  );

  -- Reaplicacao idempotente da fatia metodologia tambem preserva o GET status.
  -- O ORDS substitui a definicao do modulo quando DEFINE_MODULE e chamado
  -- novamente; por isso o handler aprovado de status e declarado aqui junto.
  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'status',
    p_etag_type   => 'HASH',
    p_comments    => 'Saude do Oracle e competencia maxima persistida na Gold.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'status',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Retorna um unico item, sem fatos individuais.',
    p_source      => q'~
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             case
               when cd_competencia_maxima is null then null
               else substr(cd_competencia_maxima, 1, 4)
                 || '-'
                 || substr(cd_competencia_maxima, 5, 2)
             end as "data_through",
             '0.3.0' as "contract_version"
        from vw_api_status
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'metodologia',
    p_etag_type   => 'HASH',
    p_comments    => 'Versao, cobertura, formulas, cortes, fontes e limitacoes.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'metodologia',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Retorna um unico contrato agregado, sem fatos individuais.',
    p_source      => q'~
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             contract_version as "contract_version",
             data_through as "data_through",
             gold_updated_at as "gold_updated_at",
             case
               when cd_competencia_preco_referencia is null then null
               else substr(cd_competencia_preco_referencia, 1, 4)
                 || '-'
                 || substr(cd_competencia_preco_referencia, 5, 2)
             end as "cmi_reference_competence",
             json_object(
               'regions' value qt_regiao_saude,
               'competencies' value qt_competencia,
               'new_admissions' value qt_internacao_nova,
               'estimated_patient_days' value qt_paciente_dia_estimado,
               'stay_days' value qt_dia_permanencia_soma,
               'hospitals' value qt_hospital,
               'region_month_rows' value qt_linhas_regiao_mensal,
               'hospital_month_rows' value qt_linhas_hospital_mensal,
               'specialty_month_rows' value qt_linhas_hospital_especialidade_mensal,
               'hospital_cid_rows' value qt_linhas_hospital_cid_periodo,
               'region_period_rows' value qt_linhas_regiao_periodo,
               'flow_rows' value qt_linhas_fluxo,
               'icsap_rows' value qt_linhas_icsap,
               'eligible_ipr_pairs' value qt_combinacao_ipr_elegivel,
               'hospital_months_above_declared_capacity' value qt_hospital_mes_acima_capacidade,
               'hospital_months_without_declared_sus_bed' value qt_hospital_mes_sem_leito_sus,
               'benchmark_zero_rows' value qt_benchmark_zero,
               'ipr_insufficient_sample_rows' value qt_ipr_amostra_insuficiente
               returning json
             ) as "coverage",
             json_array(
               json_object(
                 'id' value 'new_admissions_cross_mart',
                 'label' value 'Internacoes novas',
                 'left_label' value 'mart_indicador_regiao_mensal',
                 'left_value' value qt_internacao_nova,
                 'right_label' value 'mart_indicador_hospital_mensal',
                 'right_value' value qt_internacao_nova_hospital,
                 'difference' value qt_internacao_nova - qt_internacao_nova_hospital,
                 'status' value case
                   when qt_internacao_nova = qt_internacao_nova_hospital then 'ok'
                   else 'divergente'
                 end,
                 'note' value 'A soma dos dois marts usa a mesma contagem de AIHs normais; continuacoes nao entram como internacao nova.'
                 returning json
               ),
               json_object(
                 'id' value 'patient_days_cross_mart',
                 'label' value 'Pacientes-dia estimados',
                 'left_label' value 'mart_indicador_regiao_mensal',
                 'left_value' value qt_paciente_dia_estimado,
                 'right_label' value 'mart_indicador_hospital_mensal',
                 'right_value' value qt_paciente_dia_estimado_hospital,
                 'difference' value qt_paciente_dia_estimado - qt_paciente_dia_estimado_hospital,
                 'status' value case
                   when qt_paciente_dia_estimado = qt_paciente_dia_estimado_hospital then 'ok'
                   else 'divergente'
                 end,
                 'note' value 'A soma do numerador persistido do IPH fecha entre a visao regional e a visao hospital.'
                 returning json
               ),
               json_object(
                 'id' value 'stay_days_cross_mart',
                 'label' value 'Dias de permanencia',
                 'left_label' value 'mart_indicador_regiao_mensal',
                 'left_value' value qt_dia_permanencia_soma,
                 'right_label' value 'mart_indicador_hospital_mensal',
                 'right_value' value qt_dia_permanencia_soma_hospital,
                 'difference' value qt_dia_permanencia_soma - qt_dia_permanencia_soma_hospital,
                 'status' value case
                   when qt_dia_permanencia_soma = qt_dia_permanencia_soma_hospital then 'ok'
                   else 'divergente'
                 end,
                 'note' value 'Soma de qt_dia_permanencia_soma das internacoes novas; nao e sinonimo de diaria faturada nem de paciente-dia.'
                 returning json
               )
               returning json
             ) as "reconciliations",
             json_array(
               json_object(
                 'id' value 'aih',
                 'label' value 'AIH',
                 'definition' value 'Autorizacao de Internacao Hospitalar, documento administrativo do SIH.',
                 'gold_field' value 'Contagem total de AIHs nao publicada nesta Gold.',
                 'value_status' value 'not_published',
                 'value_note' value 'Nao usar a contagem de internacoes novas como contagem total de AIHs.'
                 returning json
               ),
               json_object(
                 'id' value 'new_admission',
                 'label' value 'Internacao nova',
                 'definition' value 'AIH normal que representa uma nova internacao no recorte; continuacoes de longa permanencia ficam separadas.',
                 'gold_field' value 'qt_internacao_nova',
                 'published_value' value qt_internacao_nova,
                 'value_status' value 'published',
                 'value_note' value 'Contagem agregada publicada nesta tela.'
                 returning json
               ),
               json_object(
                 'id' value 'billed_daily',
                 'label' value 'Diaria faturada',
                 'definition' value 'Unidade administrativa de faturamento do SIH, associada a QT_DIARIAS na fonte.',
                 'gold_field' value 'QT_DIARIAS nao persistida nesta Gold.',
                 'value_status' value 'not_published',
                 'value_note' value 'Nao equiparar a diaria faturada a dia de permanencia ou paciente-dia.'
                 returning json
               ),
               json_object(
                 'id' value 'length_of_stay',
                 'label' value 'Permanencia',
                 'definition' value 'Soma dos dias de permanencia das internacoes novas, persistida em qt_dia_permanencia_soma.',
                 'gold_field' value 'qt_dia_permanencia_soma',
                 'published_value' value qt_dia_permanencia_soma,
                 'value_status' value 'published',
                 'value_note' value 'Medida administrativa de permanencia do recorte.'
                 returning json
               ),
               json_object(
                 'id' value 'patient_day',
                 'label' value 'Paciente-dia',
                 'definition' value 'Paciente-dia estimado por reconstrucoes das datas de entrada e saida; e o numerador persistido do IPH.',
                 'gold_field' value 'qt_paciente_dia_estimado',
                 'published_value' value qt_paciente_dia_estimado,
                 'value_status' value 'published',
                 'value_note' value 'Pode diferir da soma de dias de permanencia por atravessamento de meses e pela regra de reconstrucoes.'
                 returning json
               )
               returning json
             ) as "definitions",
             json_array(
               json_object(
                 'id' value 'benchmark_zero',
                 'label' value 'Benchmark zerado',
                 'description' value 'A permanencia media do benchmark regional/CID e zero. O IPR fica nulo; nenhuma imputacao ou divisao e feita.',
                 'count' value qt_benchmark_zero,
                 'count_label' value 'linhas hospital/CID'
                 returning json
               ),
               json_object(
                 'id' value 'iph_denominator_zero',
                 'label' value 'Denominador zero do IPH',
                 'description' value 'Nao ha leito SUS declarado no mes. O IPH fica nulo; a tela nao trata isso como ocupacao zero e nao imputa capacidade.',
                 'count' value qt_hospital_mes_sem_leito_sus,
                 'count_label' value 'meses hospital sem leito SUS declarado'
                 returning json
               ),
               json_object(
                 'id' value 'amostra_insuficiente',
                 'label' value 'Amostra insuficiente',
                 'description' value 'O corte minimo do indicador nao foi atingido. O valor calculado nao e exibido como comparacao elegivel.',
                 'count' value qt_ipr_amostra_insuficiente,
                 'count_label' value 'linhas hospital/CID'
                 returning json
               )
               returning json
             ) as "states",
             json_array(
               json_object(
                 'id' value 'tmh',
                 'label' value 'TMH',
                 'expression' value 'obitos / internacoes novas x 100',
                 'interpretation' value 'Mortalidade observada, sem ajuste de risco clinico; nao mede causalmente qualidade.'
                 returning json
               ),
               json_object(
                 'id' value 'ipr',
                 'label' value 'IPR',
                 'expression' value 'permanencia media hospital/CID / benchmark regional/CID sem o hospital',
                 'interpretation' value 'Sinaliza variacao para investigacao; a composicao clinica pode diferir entre pares.'
                 returning json
               ),
               json_object(
                 'id' value 'is',
                 'label' value 'IS',
                 'expression' value 'internacoes novas de 2026 / media do mesmo mes em 2024 e 2025',
                 'interpretation' value 'Comparacao sazonal historica, nao previsao definitiva.'
                 returning json
               ),
               json_object(
                 'id' value 'cmi',
                 'label' value 'CMI',
                 'expression' value 'CMI nominal = soma(valor SIH aprovado das internacoes novas) / internacoes novas; CMI real = soma(valor SIH aprovado das internacoes novas) x fator de correcao IPCA da competencia / internacoes novas',
                 'reference_competence' value case
                   when cd_competencia_preco_referencia is null then null
                   else substr(cd_competencia_preco_referencia, 1, 4)
                     || '-'
                     || substr(cd_competencia_preco_referencia, 5, 2)
                 end,
                 'interpretation' value 'O CMI real e expresso a precos da competencia de referencia e usa o fator persistido na Gold; nominal e real nao representam custo contabil completo.'
                 returning json
               ),
               json_object(
                 'id' value 'iph',
                 'label' value 'IPH estimado',
                 'expression' value 'pacientes-dia reconstruidos / leitos-dia SUS declarados no CNES',
                 'interpretation' value 'Pressao estimada sobre capacidade declarada, nao ocupacao fisica real.'
                 returning json
               ),
               json_object(
                 'id' value 'resident_rate',
                 'label' value 'Taxa de internacao residente',
                 'expression' value 'internacoes de residentes atendidos em SP / populacao x 100 mil',
                 'interpretation' value 'Nao observa residentes atendidos fora de Sao Paulo.'
                 returning json
               ),
               json_object(
                 'id' value 'observed_evasion',
                 'label' value 'Evasao observada',
                 'expression' value 'residentes atendidos em outra regiao paulista / residentes atendidos em SP',
                 'interpretation' value 'Nao e evasao total nem prova de insuficiencia de oferta.'
                 returning json
               ),
               json_object(
                 'id' value 'attraction',
                 'label' value 'Atracao assistencial',
                 'expression' value 'atendimentos a nao residentes / producao da regiao',
                 'interpretation' value 'Centros de referencia podem ter atracao esperada.'
                 returning json
               ),
               json_object(
                 'id' value 'icsap',
                 'label' value 'ICSAP',
                 'expression' value 'internacoes dos grupos da Portaria SAS/MS 221/2008 por residencia / populacao x 10 mil',
                 'interpretation' value 'Nao prova evitabilidade individual; a proporcao oficial exige outro denominador.'
                 returning json
               ),
               json_object(
                 'id' value 'length_of_stay',
                 'label' value 'Permanencia media',
                 'expression' value 'soma dos dias de permanencia / internacoes novas',
                 'interpretation' value 'E sensivel ao perfil clinico e deve ser lida antes do IPR.'
                 returning json
               )
               returning json
             ) as "formulas",
             json_array(
               json_object(
                 'id' value 'tmh_cmi',
                 'label' value 'TMH e CMI',
                 'minimum_new_admissions' value 30,
                 'description' value 'Classificacao somente com pelo menos 30 internacoes novas.'
                 returning json
               ),
               json_object(
                 'id' value 'ipr',
                 'label' value 'IPR',
                 'minimum_hospital_cid_cases' value 20,
                 'minimum_benchmark_cases' value 50,
                 'minimum_benchmark_hospitals' value 3,
                 'description' value 'Exige minimo de 20 casos hospital/CID; benchmark com 50 casos e 3 hospitais. Se a permanencia media do benchmark for zero, o estado e benchmark_zero e o IPR permanece nulo.'
                 returning json
               ),
               json_object(
                 'id' value 'specialty',
                 'label' value 'Comparacao por especialidade',
                 'minimum_hospital_month_rows' value 100,
                 'description' value 'Agregacoes entre especialidades exigem ao menos 100 linhas hospital-mes suficientes por especialidade.'
                 returning json
               ),
               json_object(
                 'id' value 'cid',
                 'label' value 'Ranking por diagnostico',
                 'minimum_hospital_cid_pairs' value 10,
                 'description' value 'Exige ao menos 10 combinacoes hospital-CID suficientes por diagnostico.'
                 returning json
               ),
               json_object(
                 'id' value 'seasonality',
                 'label' value 'Indice sazonal',
                 'description' value 'Usa somente meses comparaveis de janeiro a maio de 2026 contra 2024 e 2025.'
                 returning json
               )
               returning json
             ) as "cuts",
             json_array(
               json_object(
                 'id' value 'sih_rd',
                 'label' value 'SIH/RD',
                 'scope' value 'Internacoes novas, obitos, permanencia e valores aprovados observados em hospitais de Sao Paulo.'
                 returning json
               ),
               json_object(
                 'id' value 'cnes_lt',
                 'label' value 'CNES/LT',
                 'scope' value 'Leitos SUS declarados e fotografia atual do estabelecimento.'
                 returning json
               ),
               json_object(
                 'id' value 'ibge_censo_2022',
                 'label' value 'IBGE Censo 2022',
                 'scope' value 'Populacao municipal usada nos denominadores territoriais.'
                 returning json
               ),
               json_object(
                 'id' value 'ibge_ipca',
                 'label' value 'IBGE/SIDRA 1737',
                 'scope' value 'Numero-indice e fator IPCA para valores reais, com competencia de referencia explicita.'
                 returning json
               ),
               json_object(
                 'id' value 'portaria_221_2008',
                 'label' value 'Portaria SAS/MS 221/2008',
                 'scope' value 'Lista Brasileira de Internacoes por Condicoes Sensiveis a Atencao Primaria.'
                 returning json
               )
               returning json
             ) as "sources",
             json_array(
               'TMH nao possui ajuste de risco clinico.',
               'A cobertura de IPR considera somente combinacoes elegiveis pelos cortes do contrato.',
               'CMI nominal e CMI real nao representam custo economico integral.',
               'IPH usa pacientes-dia reconstruidos e leitos mensais declarados; nao e ocupacao real.',
               'Quando o denominador do IPH e zero por ausencia de leito SUS declarado, o valor permanece nulo e nao ha imputacao.',
               'Quando o benchmark de permanencia e zero, o estado benchmark_zero mantem o IPR nulo e nao ha imputacao.',
               'AIH total e QT_DIARIAS nao sao publicados nos marts Gold desta tela; nao confundir AIH, internacao nova, diaria faturada, permanencia e paciente-dia.',
               'Taxas territoriais consideram residentes de Sao Paulo atendidos em hospitais de Sao Paulo; saidas para outras UFs nao estao observadas.',
               'A participacao de ICSAP usa todas as internacoes novas observadas de residentes no denominador; nao e a proporcao clinica oficial.',
               'O recorte e administrativo e agregado; nao sustenta inferencia clinica individual ou causal.'
               returning json
             ) as "limitations"
        from vw_api_metodologia
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'regioes/resumo',
    p_etag_type   => 'HASH',
    p_comments    => 'Resumo mensal agregado das regioes de saude para a visao executiva.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'regioes/resumo',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Paginacao real: limit padrao 100, maximo 200; offset padrao 0. Sem fatos individuais ou formulas no cliente.',
    p_source      => q'~
      with parametros_brutos as (
        select :ano as ano_bruto,
               :mes as mes_bruto,
               :macrorregiao as filtro_macrorregiao,
               :regiao as filtro_regiao,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when p.ano_bruto is null then null
                 when regexp_like(p.ano_bruto, '^[0-9]{4}$') then to_number(p.ano_bruto)
               end as ano_solicitado,
               case
                 when regexp_like(p.mes_bruto, '^(0?[1-9]|1[0-2])$') then to_number(p.mes_bruto)
               end as mes_solicitado,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select coalesce(
                 p.ano_solicitado,
                 (select max(nr_ano_competencia) from vw_api_regioes_resumo)
               ) as ano,
               case
                 when p.mes_solicitado is not null then p.mes_solicitado
                 when p.mes_bruto is null then (
                   select max(v.nr_mes_competencia)
                     from vw_api_regioes_resumo v
                    where v.nr_ano_competencia = coalesce(
                            p.ano_solicitado,
                            (select max(nr_ano_competencia) from vw_api_regioes_resumo)
                          )
                 )
               end as mes,
               p.filtro_macrorregiao,
               p.filtro_regiao,
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 when (p.ano_bruto is null or p.ano_solicitado is not null)
                  and (p.mes_bruto is null or p.mes_solicitado is not null)
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 200)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      filtrado as (
        select v.*
          from vw_api_regioes_resumo v
          cross join parametros p
         where v.nr_ano_competencia = p.ano
           and v.nr_mes_competencia = p.mes
           and (
                 p.filtro_macrorregiao is null
                 or v.cd_macrorregiao_saude = p.filtro_macrorregiao
               )
           and (
                 p.filtro_regiao is null
                 or v.cd_regiao_saude = p.filtro_regiao
               )
      ),
      ordenado as (
        select f.*,
               row_number() over (
                 order by f.pc_iph_estimado desc nulls last,
                          f.cd_regiao_saude
               ) as nr_linha,
               count(*) over () as qt_total
          from filtrado f
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             case
               when p.ano is null or p.mes is null then null
               else to_char(p.ano, 'FM0000')
                 || '-'
                 || to_char(p.mes, 'FM00')
             end as "data_through",
             json_object(
               'year' value p.ano,
               'month' value p.mes,
               'macroregion_code' value p.filtro_macrorregiao,
               'region_code' value p.filtro_regiao
               null on null returning json
             ) as "filters",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce((select max(qt_total) from ordenado), 0),
               'has_more' value case
                 when coalesce((select max(qt_total) from ordenado), 0)
                    > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'region_code' value x.cd_regiao_saude,
                            'region_name' value x.nm_regiao_saude,
                            'macroregion_code' value x.cd_macrorregiao_saude,
                            'macroregion_name' value x.nm_macrorregiao_saude,
                            'municipality_count' value x.qt_municipio,
                            'new_admissions' value x.qt_internacao_nova,
                            'deaths' value x.qt_obito,
                            'stay_days' value x.qt_dia_permanencia_soma,
                            'approved_amount_nominal' value x.vl_aprovado_internacao_nova_soma,
                            'hospitals_with_admissions' value x.qt_hospital_com_internacao,
                            'estimated_patient_days' value x.qt_paciente_dia_estimado,
                            'declared_sus_beds' value x.qt_leito_sus,
                            'declared_capacity_bed_days' value x.qt_capacidade_teorica_leito_dia,
                            'population' value x.qt_populacao_ibge_2022,
                            'resident_admissions_observed' value x.qt_internacao_residente_observada,
                            'resident_admissions_in_own_region' value x.qt_internacao_residente_na_propria_regiao,
                            'observed_intrastate_evasion_admissions' value x.qt_evasao_intrastadual_observada,
                            'icsap_resident_admissions_observed' value x.qt_internacao_icsap_residente_observada,
                            'admissions_received_from_other_sp_regions' value x.qt_internacao_recebida_outra_regiao_sp,
                            'admissions_received_from_other_states' value x.qt_internacao_recebida_fora_sp,
                            'resident_admission_rate_per_100k' value x.tx_internacao_residente_observada_por_100_mil,
                            'observed_evasion_percent' value x.pc_evasao_intrastadual_observada,
                            'attraction_percent' value x.pc_atracao_assistencial,
                            'icsap_share_of_observed_resident_admissions_percent' value x.pc_icsap_no_total_internacao_residente_observada,
                            'icsap_rate_per_10k' value x.tx_icsap_residente_observada_por_10_mil,
                            'tmh_percent' value x.pc_tmh,
                            'cmi_nominal' value x.vl_cmi,
                            'average_stay_days' value x.nr_permanencia_media,
                            'iph_ratio' value x.nr_iph_estimado,
                            'iph_percent' value x.pc_iph_estimado,
                            'historical_admissions_average' value x.qt_internacao_media_historica,
                            'historical_years' value x.qt_ano_historico,
                            'seasonality_index' value x.nr_indice_sazonalidade,
                            'seasonal_variation_percent' value x.pc_variacao_sazonal,
                            'seasonality_status' value x.st_indice_sazonalidade,
                            'ipca_index' value x.nr_indice_ipca,
                            'ipca_factor' value x.nr_fator_correcao_ipca,
                            'price_reference_competence' value x.cd_competencia_preco_referencia,
                            'approved_amount_real' value x.vl_aprovado_internacao_nova_real_soma,
                            'cmi_real' value x.vl_cmi_real
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'regioes/:id/serie',
    p_etag_type   => 'HASH',
    p_comments    => 'Serie mensal de indicadores persistidos de uma regiao de saude.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'regioes/:id/serie',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita da competencia mais recente para a mais antiga. Paginacao real: limit padrao 100, maximo 120; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :id as codigo_bruto,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when regexp_like(p.codigo_bruto, '^[0-9]{5}$') then p.codigo_bruto
               end as codigo_regiao,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select p.codigo_regiao,
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 when p.codigo_regiao is not null
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 120)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      filtrado as (
        select v.*
          from vw_api_regiao_serie v
          cross join parametros p
         where v.cd_regiao_saude = p.codigo_regiao
      ),
      ordenado as (
        select f.*,
               row_number() over (
                 order by f.cd_competencia desc
               ) as nr_linha,
               count(*) over () as qt_total
          from filtrado f
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             case
               when maximo.cd_competencia is null then null
               else substr(maximo.cd_competencia, 1, 4)
                 || '-'
                 || substr(maximo.cd_competencia, 5, 2)
             end as "data_through",
             json_object(
               'region_code' value p.codigo_regiao,
               'region_name' value meta.nm_regiao_saude,
               'macroregion_code' value meta.cd_macrorregiao_saude,
               'macroregion_name' value meta.nm_macrorregiao_saude
               null on null returning json
             ) as "region",
             json_object(
               'region_code' value p.codigo_regiao
               returning json
             ) as "filters",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'competence_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'competence' value substr(x.cd_competencia, 1, 4)
                              || '-'
                              || substr(x.cd_competencia, 5, 2),
                            'year' value x.nr_ano_competencia,
                            'month' value x.nr_mes_competencia,
                            'new_admissions' value x.qt_internacao_nova,
                            'deaths' value x.qt_obito,
                            'stay_days' value x.qt_dia_permanencia_soma,
                            'approved_amount_nominal' value x.vl_aprovado_internacao_nova_soma,
                            'hospitals_with_admissions' value x.qt_hospital_com_internacao,
                            'estimated_patient_days' value x.qt_paciente_dia_estimado,
                            'declared_sus_beds' value x.qt_leito_sus,
                            'declared_capacity_bed_days' value x.qt_capacidade_teorica_leito_dia,
                            'tmh_percent' value x.pc_tmh,
                            'cmi_nominal' value x.vl_cmi,
                            'average_stay_days' value x.nr_permanencia_media,
                            'iph_ratio' value x.nr_iph_estimado,
                            'iph_percent' value x.pc_iph_estimado,
                            'historical_admissions_average' value x.qt_internacao_media_historica,
                            'historical_years' value x.qt_ano_historico,
                            'seasonality_index' value x.nr_indice_sazonalidade,
                            'seasonal_variation_percent' value x.pc_variacao_sazonal,
                            'seasonality_status' value x.st_indice_sazonalidade,
                            'price_reference_competence' value x.cd_competencia_preco_referencia,
                            'approved_amount_real' value x.vl_aprovado_internacao_nova_real_soma,
                            'cmi_real' value x.vl_cmi_real
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select f.nm_regiao_saude,
                 f.cd_macrorregiao_saude,
                 f.nm_macrorregiao_saude
            from filtrado f
           fetch first 1 row only
        ) meta
        outer apply (
          select max(f.cd_competencia) as cd_competencia
            from filtrado f
        ) maximo
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'fluxos',
    p_etag_type   => 'HASH',
    p_comments    => 'Matriz mensal agregada entre regiao de residencia e regiao de atendimento.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'fluxos',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita por internacoes decrescentes. Paginacao real: limit padrao 100 (herdado do p_items_per_page do modulo, que o ORDS injeta no bind :limit antes do SQL), maximo 2000; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :ano as ano_bruto,
               :mes as mes_bruto,
               :origem as origem_bruta,
               :destino as destino_bruto,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when p.ano_bruto is null then null
                 when regexp_like(p.ano_bruto, '^[0-9]{4}$') then to_number(p.ano_bruto)
               end as ano_solicitado,
               case
                 when regexp_like(p.mes_bruto, '^(0?[1-9]|1[0-2])$') then to_number(p.mes_bruto)
               end as mes_solicitado,
               case
                 when p.origem_bruta is null then null
                 when regexp_like(p.origem_bruta, '^([0-9]{5}|FORA_SP)$') then p.origem_bruta
               end as origem_solicitada,
               case
                 when p.destino_bruto is null then null
                 when regexp_like(p.destino_bruto, '^[0-9]{5}$') then p.destino_bruto
               end as destino_solicitado,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select coalesce(
                 p.ano_solicitado,
                 (select max(nr_ano_competencia) from vw_api_fluxos)
               ) as ano,
               case
                 when p.mes_solicitado is not null then p.mes_solicitado
                 when p.mes_bruto is null then (
                   select max(v.nr_mes_competencia)
                     from vw_api_fluxos v
                    where v.nr_ano_competencia = coalesce(
                            p.ano_solicitado,
                            (select max(nr_ano_competencia) from vw_api_fluxos)
                          )
                 )
               end as mes,
               p.origem_solicitada as origem,
               p.destino_solicitado as destino,
               -- 100 e o p_items_per_page do modulo: o ORDS preenche :limit com
               -- ele quando o chamador omite o parametro, entao este coalesce so
               -- protege o caso de bind nulo. Declarar outro numero aqui nao
               -- muda o observavel e mente no contrato.
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 -- `origem` e obrigatorio. Sem ele o endpoint devolvia 200 com
                 -- os fluxos de TODAS as origens somados numa pagina so, e o
                 -- contexto `territory` inteiro nulo: uma resposta que nenhuma
                 -- tela sabe usar e que, lida sem cuidado, mistura regioes.
                 -- Ausencia de filtro nao e filtro vazio.
                 when p.origem_solicitada is not null
                  and (p.ano_bruto is null or p.ano_solicitado is not null)
                  and (p.mes_bruto is null or p.mes_solicitado is not null)
                  and (p.destino_bruto is null or p.destino_solicitado is not null)
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 2000)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      filtrado as (
        select v.*
          from vw_api_fluxos v
          cross join parametros p
         where v.nr_ano_competencia = p.ano
           and v.nr_mes_competencia = p.mes
           and (p.origem is null or v.cd_origem_residencia = p.origem)
           and (p.destino is null or v.cd_regiao_saude_atendimento = p.destino)
      ),
      ordenado as (
        select f.*,
               row_number() over (
                 order by f.qt_internacao_nova desc,
                          f.cd_origem_residencia,
                          f.cd_regiao_saude_atendimento
               ) as nr_linha,
               count(*) over () as qt_total
          from filtrado f
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             case
               when p.ano is null or p.mes is null then null
               else to_char(p.ano, 'FM0000')
                 || '-'
                 || to_char(p.mes, 'FM00')
             end as "data_through",
             json_object(
               'year' value p.ano,
               'month' value p.mes,
               'origin_region_code' value p.origem,
               'destination_region_code' value p.destino
               null on null returning json
             ) as "filters",
             json_object(
               'region_code' value p.origem,
               'region_name' value meta.nm_origem_residencia,
               'macroregion_code' value meta.cd_macrorregiao_origem,
               'macroregion_name' value meta.nm_macrorregiao_origem,
               'population' value meta.qt_populacao_ibge_2022,
               'production_admissions' value meta.qt_internacao_producao_territorio,
               'resident_admissions_observed' value meta.qt_internacao_residente_observada,
               'resident_admissions_in_own_region' value meta.qt_internacao_residente_na_propria_regiao,
               'observed_intrastate_evasion_admissions' value meta.qt_evasao_intrastadual_observada,
               'admissions_received_from_other_sp_regions' value meta.qt_internacao_recebida_outra_regiao_sp,
               'admissions_received_from_other_states' value meta.qt_internacao_recebida_fora_sp,
               'resident_admission_rate_per_100k' value meta.tx_internacao_residente_observada_por_100_mil,
               'observed_evasion_percent' value meta.pc_evasao_intrastadual_observada,
               'attraction_percent' value meta.pc_atracao_assistencial,
               'own_care_percent' value meta.pc_atendimento_intrarregional
               null on null returning json
             ) as "territory",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'new_admissions_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'origin_region_code' value x.cd_origem_residencia,
                            'origin_region_name' value x.nm_origem_residencia,
                            'origin_macroregion_code' value x.cd_macrorregiao_origem,
                            'origin_macroregion_name' value x.nm_macrorregiao_origem,
                            'destination_region_code' value x.cd_regiao_saude_atendimento,
                            'destination_region_name' value x.nm_regiao_saude_atendimento,
                            'destination_macroregion_code' value x.cd_macrorregiao_atendimento,
                            'destination_macroregion_name' value x.nm_macrorregiao_atendimento,
                            'flow_type' value x.st_fluxo_assistencial,
                            'new_admissions' value x.qt_internacao_nova,
                            'origin_share_of_destination_percent' value x.pc_origem_no_atendimento,
                            'destination_share_of_observed_origin_percent' value x.pc_destino_na_origem_observada
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select v.nm_origem_residencia,
                 v.cd_macrorregiao_origem,
                 v.nm_macrorregiao_origem,
                 v.qt_populacao_ibge_2022,
                 v.qt_internacao_producao_territorio,
                 v.qt_internacao_residente_observada,
                 v.qt_internacao_residente_na_propria_regiao,
                 v.qt_evasao_intrastadual_observada,
                 v.qt_internacao_recebida_outra_regiao_sp,
                 v.qt_internacao_recebida_fora_sp,
                 v.tx_internacao_residente_observada_por_100_mil,
                 v.pc_evasao_intrastadual_observada,
                 v.pc_atracao_assistencial,
                 v.pc_atendimento_intrarregional
            from vw_api_fluxos v
           where v.nr_ano_competencia = p.ano
             and v.nr_mes_competencia = p.mes
             and v.cd_origem_residencia = p.origem
           fetch first 1 row only
        ) meta
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'icsap',
    p_etag_type   => 'HASH',
    p_comments    => 'Composicao mensal das ICSAP nos 19 grupos oficiais, por regiao de residencia.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'icsap',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita por internacoes ICSAP decrescentes. Paginacao real: limit padrao 100 (herdado do p_items_per_page do modulo, que o ORDS injeta no bind :limit antes do SQL), maximo 2000; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :ano as ano_bruto,
               :mes as mes_bruto,
               :regiao as regiao_bruta,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when p.ano_bruto is null then null
                 when regexp_like(p.ano_bruto, '^[0-9]{4}$') then to_number(p.ano_bruto)
               end as ano_solicitado,
               case
                 when regexp_like(p.mes_bruto, '^(0?[1-9]|1[0-2])$') then to_number(p.mes_bruto)
               end as mes_solicitado,
               case
                 when p.regiao_bruta is null then null
                 when regexp_like(p.regiao_bruta, '^[0-9]{5}$') then p.regiao_bruta
               end as regiao_solicitada,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select coalesce(
                 p.ano_solicitado,
                 (select max(nr_ano_competencia) from vw_api_icsap)
               ) as ano,
               case
                 when p.mes_solicitado is not null then p.mes_solicitado
                 when p.mes_bruto is null then (
                   select max(v.nr_mes_competencia)
                     from vw_api_icsap v
                    where v.nr_ano_competencia = coalesce(
                            p.ano_solicitado,
                            (select max(nr_ano_competencia) from vw_api_icsap)
                          )
                 )
               end as mes,
               p.regiao_solicitada as regiao,
               -- 100 e o p_items_per_page do modulo: o ORDS preenche :limit com
               -- ele quando o chamador omite o parametro, entao este coalesce so
               -- protege o caso de bind nulo. Declarar outro numero aqui nao
               -- muda o observavel e mente no contrato.
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 -- `regiao` e obrigatorio, pelo mesmo motivo de `origem` em
                 -- /fluxos: sem ele o endpoint somava os 19 grupos de todas as
                 -- regioes numa pagina so, com o contexto `region` nulo. ICSAP
                 -- e indicador populacional de um territorio; sem territorio
                 -- declarado, o numero nao significa nada.
                 when p.regiao_solicitada is not null
                  and (p.ano_bruto is null or p.ano_solicitado is not null)
                  and (p.mes_bruto is null or p.mes_solicitado is not null)
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 2000)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      filtrado as (
        select v.*
          from vw_api_icsap v
          cross join parametros p
         where v.nr_ano_competencia = p.ano
           and v.nr_mes_competencia = p.mes
           and (p.regiao is null or v.cd_regiao_saude = p.regiao)
      ),
      ordenado as (
        select f.*,
               row_number() over (
                 order by f.qt_internacao_icsap desc,
                          f.cd_regiao_saude,
                          f.cd_grupo_icsap
               ) as nr_linha,
               count(*) over () as qt_total
          from filtrado f
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             case
               when p.ano is null or p.mes is null then null
               else to_char(p.ano, 'FM0000')
                 || '-'
                 || to_char(p.mes, 'FM00')
             end as "data_through",
             json_object(
               'year' value p.ano,
               'month' value p.mes,
               'region_code' value p.regiao
               null on null returning json
             ) as "filters",
             json_object(
               'region_code' value p.regiao,
               'region_name' value meta.nm_regiao_saude,
               'macroregion_code' value meta.cd_macrorregiao_saude,
               'macroregion_name' value meta.nm_macrorregiao_saude,
               'population' value meta.qt_populacao_ibge_2022,
               'resident_admissions_observed' value meta.qt_internacao_residente_observada,
               'icsap_admissions' value meta.qt_internacao_icsap_total_regiao,
               'icsap_share_of_resident_percent' value meta.pc_icsap_no_total_internacao_residente_observada,
               'icsap_rate_per_10k' value meta.tx_icsap_residente_observada_por_10_mil
               null on null returning json
             ) as "region",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'icsap_admissions_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'region_code' value x.cd_regiao_saude,
                            'group_code' value x.cd_grupo_icsap,
                            'group_name' value x.nm_grupo_icsap,
                            'icsap_admissions' value x.qt_internacao_icsap,
                            'group_share_of_icsap_percent' value x.pc_grupo_no_total_icsap,
                            'group_rate_per_10k' value x.tx_icsap_grupo_por_10_mil_habitantes
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select v.nm_regiao_saude,
                 v.cd_macrorregiao_saude,
                 v.nm_macrorregiao_saude,
                 v.qt_populacao_ibge_2022,
                 v.qt_internacao_residente_observada,
                 v.qt_internacao_icsap_total_regiao,
                 v.pc_icsap_no_total_internacao_residente_observada,
                 v.tx_icsap_residente_observada_por_10_mil
            from vw_api_icsap v
           where v.nr_ano_competencia = p.ano
             and v.nr_mes_competencia = p.mes
             and v.cd_regiao_saude = p.regiao
           fetch first 1 row only
        ) meta
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais',
    p_etag_type   => 'HASH',
    p_comments    => 'Hospitais com producao na regiao e competencia, com indicadores mensais persistidos.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita por internacoes novas decrescentes. Paginacao real: limit padrao 100 (herdado do p_items_per_page do modulo, que o ORDS injeta no bind :limit antes do SQL), maximo 2000; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :ano as ano_bruto,
               :mes as mes_bruto,
               :regiao as regiao_bruta,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when p.ano_bruto is null then null
                 when regexp_like(p.ano_bruto, '^[0-9]{4}$') then to_number(p.ano_bruto)
               end as ano_solicitado,
               case
                 when regexp_like(p.mes_bruto, '^(0?[1-9]|1[0-2])$') then to_number(p.mes_bruto)
               end as mes_solicitado,
               case
                 when p.regiao_bruta is null then null
                 when regexp_like(p.regiao_bruta, '^[0-9]{5}$') then p.regiao_bruta
               end as regiao_solicitada,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select coalesce(
                 p.ano_solicitado,
                 (select max(nr_ano_competencia) from vw_api_hospitais)
               ) as ano,
               case
                 when p.mes_solicitado is not null then p.mes_solicitado
                 when p.mes_bruto is null then (
                   select max(v.nr_mes_competencia)
                     from vw_api_hospitais v
                    where v.nr_ano_competencia = coalesce(
                            p.ano_solicitado,
                            (select max(nr_ano_competencia) from vw_api_hospitais)
                          )
                 )
               end as mes,
               p.regiao_solicitada as regiao,
               -- 100 e o p_items_per_page do modulo: o ORDS preenche :limit com
               -- ele quando o chamador omite o parametro, entao este coalesce so
               -- protege o caso de bind nulo.
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 when (p.ano_bruto is null or p.ano_solicitado is not null)
                  and (p.mes_bruto is null or p.mes_solicitado is not null)
                  and (p.regiao_bruta is null or p.regiao_solicitada is not null)
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 2000)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      filtrado as (
        select v.*
          from vw_api_hospitais v
          cross join parametros p
         where v.nr_ano_competencia = p.ano
           and v.nr_mes_competencia = p.mes
           and (p.regiao is null or v.cd_regiao_saude = p.regiao)
      ),
      ordenado as (
        select f.*,
               row_number() over (
                 order by f.qt_internacao_nova desc,
                          f.cd_cnes
               ) as nr_linha,
               count(*) over () as qt_total
          from filtrado f
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             case
               when p.ano is null or p.mes is null then null
               else to_char(p.ano, 'FM0000')
                 || '-'
                 || to_char(p.mes, 'FM00')
             end as "data_through",
             json_object(
               'year' value p.ano,
               'month' value p.mes,
               'region_code' value p.regiao
               null on null returning json
             ) as "filters",
             json_object(
               'region_code' value p.regiao,
               'region_name' value meta.nm_regiao_saude,
               'macroregion_code' value meta.cd_macrorregiao_saude,
               'macroregion_name' value meta.nm_macrorregiao_saude
               null on null returning json
             ) as "region",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'new_admissions_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'cnes' value x.cd_cnes,
                            'hospital_name' value x.nm_hospital_atual,
                            'unit_type_code' value x.cd_tipo_unidade,
                            'unit_type_name' value x.nm_tipo_unidade,
                            'municipality_code' value x.cd_municipio_ibge_6,
                            'region_code' value x.cd_regiao_saude,
                            'sus_beds' value x.qt_leito_sus,
                            'new_admissions' value x.qt_internacao_nova,
                            'deaths' value x.qt_obito,
                            'patient_days_estimated' value x.qt_paciente_dia_estimado,
                            'declared_bed_days' value x.qt_capacidade_teorica_leito_dia,
                            'iph_percent' value x.pc_iph_estimado,
                            'tmh_percent' value x.pc_tmh,
                            'cmi_real' value x.vl_cmi_real,
                            'average_stay_days' value x.nr_permanencia_media,
                            'sample_status' value x.st_amostra,
                            'capacity_status' value x.st_capacidade,
                            'above_declared_capacity' value x.fl_acima_capacidade_declarada
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select v.nm_regiao_saude,
                 v.cd_macrorregiao_saude,
                 v.nm_macrorregiao_saude
            from vw_api_hospitais v
           where v.nr_ano_competencia = p.ano
             and v.nr_mes_competencia = p.mes
             and v.cd_regiao_saude = p.regiao
           fetch first 1 row only
        ) meta
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  -- Reusa vw_api_hospitais: a serie mensal do hospital e a mesma projecao da
  -- lista, recortada por CNES em vez de por regiao. Criar uma segunda view
  -- identica so para mudar o filtro duplicaria a fonte da verdade.
  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais/:cnes/serie',
    p_etag_type   => 'HASH',
    p_comments    => 'Serie mensal completa de um hospital, da competencia mais recente para a mais antiga.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais/:cnes/serie',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita por competencia decrescente. Paginacao real: limit padrao 100 (herdado do p_items_per_page do modulo, que o ORDS injeta no bind :limit antes do SQL), maximo 2000; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :cnes as cnes_bruto,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when regexp_like(p.cnes_bruto, '^[0-9]{7}$') then p.cnes_bruto
               end as cnes_solicitado,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select p.cnes_solicitado as cnes,
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 when p.cnes_solicitado is not null
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 2000)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      ordenado as (
        select v.*,
               row_number() over (
                 order by v.cd_competencia desc
               ) as nr_linha,
               count(*) over () as qt_total
          from vw_api_hospitais v
          cross join parametros p
         where v.cd_cnes = p.cnes
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             meta.cd_competencia_mais_recente as "data_through",
             json_object(
               'cnes' value p.cnes
               null on null returning json
             ) as "filters",
             json_object(
               'cnes' value p.cnes,
               'hospital_name' value meta.nm_hospital_atual,
               'unit_type_code' value meta.cd_tipo_unidade,
               'unit_type_name' value meta.nm_tipo_unidade,
               'municipality_code' value meta.cd_municipio_ibge_6,
               'region_code' value meta.cd_regiao_saude,
               'region_name' value meta.nm_regiao_saude,
               'macroregion_code' value meta.cd_macrorregiao_saude,
               'macroregion_name' value meta.nm_macrorregiao_saude
               null on null returning json
             ) as "hospital",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'competence_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'competence' value to_char(x.nr_ano_competencia, 'FM0000')
                              || '-'
                              || to_char(x.nr_mes_competencia, 'FM00'),
                            'year' value x.nr_ano_competencia,
                            'month' value x.nr_mes_competencia,
                            'sus_beds' value x.qt_leito_sus,
                            'new_admissions' value x.qt_internacao_nova,
                            'deaths' value x.qt_obito,
                            'patient_days_estimated' value x.qt_paciente_dia_estimado,
                            'declared_bed_days' value x.qt_capacidade_teorica_leito_dia,
                            'iph_percent' value x.pc_iph_estimado,
                            'tmh_percent' value x.pc_tmh,
                            'cmi_nominal' value x.vl_cmi,
                            'cmi_real' value x.vl_cmi_real,
                            'average_stay_days' value x.nr_permanencia_media,
                            'price_reference_competence' value x.cd_competencia_preco_referencia,
                            'sample_status' value x.st_amostra,
                            'capacity_status' value x.st_capacidade,
                            'above_declared_capacity' value x.fl_acima_capacidade_declarada
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select v.nm_hospital_atual,
                 v.cd_tipo_unidade,
                 v.nm_tipo_unidade,
                 v.cd_municipio_ibge_6,
                 v.cd_regiao_saude,
                 v.nm_regiao_saude,
                 v.cd_macrorregiao_saude,
                 v.nm_macrorregiao_saude,
                 to_char(v.nr_ano_competencia, 'FM0000')
                   || '-'
                   || to_char(v.nr_mes_competencia, 'FM00') as cd_competencia_mais_recente
            from vw_api_hospitais v
           where v.cd_cnes = p.cnes
           order by v.cd_competencia desc
           fetch first 1 row only
        ) meta
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais/:cnes/especialidades',
    p_etag_type   => 'HASH',
    p_comments    => 'Perfil por especialidade SIH de um hospital numa competencia.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais/:cnes/especialidades',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita por internacoes novas decrescentes. Paginacao real: limit padrao 100 (herdado do p_items_per_page do modulo, que o ORDS injeta no bind :limit antes do SQL), maximo 2000; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :cnes as cnes_bruto,
               :ano as ano_bruto,
               :mes as mes_bruto,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when regexp_like(p.cnes_bruto, '^[0-9]{7}$') then p.cnes_bruto
               end as cnes_solicitado,
               case
                 when p.ano_bruto is null then null
                 when regexp_like(p.ano_bruto, '^[0-9]{4}$') then to_number(p.ano_bruto)
               end as ano_solicitado,
               case
                 when regexp_like(p.mes_bruto, '^(0?[1-9]|1[0-2])$') then to_number(p.mes_bruto)
               end as mes_solicitado,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select p.cnes_solicitado as cnes,
               coalesce(
                 p.ano_solicitado,
                 (select max(nr_ano_competencia) from vw_api_hospital_especialidades)
               ) as ano,
               case
                 when p.mes_solicitado is not null then p.mes_solicitado
                 when p.mes_bruto is null then (
                   select max(v.nr_mes_competencia)
                     from vw_api_hospital_especialidades v
                    where v.nr_ano_competencia = coalesce(
                            p.ano_solicitado,
                            (select max(nr_ano_competencia) from vw_api_hospital_especialidades)
                          )
                 )
               end as mes,
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 when p.cnes_solicitado is not null
                  and (p.ano_bruto is null or p.ano_solicitado is not null)
                  and (p.mes_bruto is null or p.mes_solicitado is not null)
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 2000)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      ordenado as (
        select v.*,
               row_number() over (
                 order by v.qt_internacao_nova desc,
                          v.cd_especialidade_sih
               ) as nr_linha,
               count(*) over () as qt_total
          from vw_api_hospital_especialidades v
          cross join parametros p
         where v.cd_cnes = p.cnes
           and v.nr_ano_competencia = p.ano
           and v.nr_mes_competencia = p.mes
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             case
               when p.ano is null or p.mes is null then null
               else to_char(p.ano, 'FM0000')
                 || '-'
                 || to_char(p.mes, 'FM00')
             end as "data_through",
             json_object(
               'cnes' value p.cnes,
               'year' value p.ano,
               'month' value p.mes
               null on null returning json
             ) as "filters",
             json_object(
               'cnes' value p.cnes,
               'region_code' value meta.cd_regiao_saude,
               'region_name' value meta.nm_regiao_saude,
               'macroregion_code' value meta.cd_macrorregiao_saude,
               'macroregion_name' value meta.nm_macrorregiao_saude,
               'new_admissions_total' value meta.qt_internacao_nova_total
               null on null returning json
             ) as "hospital",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'new_admissions_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'cnes' value x.cd_cnes,
                            'specialty_code' value x.cd_especialidade_sih,
                            'specialty_name' value x.nm_especialidade,
                            'new_admissions' value x.qt_internacao_nova,
                            'deaths' value x.qt_obito,
                            'stay_days_total' value x.qt_dia_permanencia_soma,
                            'tmh_percent' value x.pc_tmh,
                            'cmi_nominal' value x.vl_cmi,
                            'cmi_real' value x.vl_cmi_real,
                            'average_stay_days' value x.nr_permanencia_media,
                            'price_reference_competence' value x.cd_competencia_preco_referencia,
                            'sample_status' value x.st_amostra
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select v.cd_regiao_saude,
                 v.nm_regiao_saude,
                 v.cd_macrorregiao_saude,
                 v.nm_macrorregiao_saude,
                 (
                   select sum(t.qt_internacao_nova)
                     from vw_api_hospital_especialidades t
                    where t.cd_cnes = p.cnes
                      and t.nr_ano_competencia = p.ano
                      and t.nr_mes_competencia = p.mes
                 ) as qt_internacao_nova_total
            from vw_api_hospital_especialidades v
           where v.cd_cnes = p.cnes
             and v.nr_ano_competencia = p.ano
             and v.nr_mes_competencia = p.mes
           fetch first 1 row only
        ) meta
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais/:cnes/cids',
    p_etag_type   => 'HASH',
    p_comments    => 'IPR por diagnostico principal de um hospital no periodo agregado, com benchmark regional.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'hospitais/:cnes/cids',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_mimes_allowed => 'application/json',
    p_comments    => 'Ordem explicita por internacoes novas decrescentes. Parametro elegivel=1 restringe aos diagnosticos com IPR calculavel. Paginacao real: limit padrao 100 (herdado do p_items_per_page do modulo, que o ORDS injeta no bind :limit antes do SQL), maximo 2000; offset padrao 0.',
    p_source      => q'~
      with parametros_brutos as (
        select :cnes as cnes_bruto,
               :elegivel as elegivel_bruto,
               :limit as limite_bruto,
               :offset as deslocamento_bruto
          from dual
      ),
      parametros_formatados as (
        select p.*,
               case
                 when regexp_like(p.cnes_bruto, '^[0-9]{7}$') then p.cnes_bruto
               end as cnes_solicitado,
               case
                 when regexp_like(p.elegivel_bruto, '^[01]$') then to_number(p.elegivel_bruto)
               end as elegivel_solicitado,
               case
                 when regexp_like(p.limite_bruto, '^[0-9]+$') then to_number(p.limite_bruto)
               end as limite_solicitado,
               case
                 when regexp_like(p.deslocamento_bruto, '^[0-9]+$') then to_number(p.deslocamento_bruto)
               end as deslocamento_solicitado
          from parametros_brutos p
      ),
      parametros as (
        select p.cnes_solicitado as cnes,
               coalesce(p.elegivel_solicitado, 0) as somente_elegiveis,
               coalesce(p.limite_solicitado, 100) as limite,
               coalesce(p.deslocamento_solicitado, 0) as deslocamento,
               case
                 when p.cnes_solicitado is not null
                  and (p.elegivel_bruto is null or p.elegivel_solicitado is not null)
                  and (p.limite_bruto is null or p.limite_solicitado between 1 and 2000)
                  and (p.deslocamento_bruto is null or p.deslocamento_solicitado >= 0)
                 then 1
                 else 0
               end as parametros_validos
          from parametros_formatados p
      ),
      ordenado as (
        select v.*,
               row_number() over (
                 order by v.qt_internacao_nova desc,
                          v.cd_cid_principal
               ) as nr_linha,
               count(*) over () as qt_total
          from vw_api_hospital_cids v
          cross join parametros p
         where v.cd_cnes = p.cnes
           and (p.somente_elegiveis = 0 or v.st_amostra = 'suficiente')
      ),
      pagina as (
        select o.*
          from ordenado o
          cross join parametros p
         where o.nr_linha > p.deslocamento
           and o.nr_linha <= p.deslocamento + p.limite
      )
      select 'ok' as "status",
             'oracle-live' as "source",
             to_char(
               systimestamp,
               'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'
             ) as "database_time",
             '0.3.0' as "contract_version",
             json_object(
               'cnes' value p.cnes,
               'eligible_only' value case when p.somente_elegiveis = 1 then 'true' else 'false' end format json
               null on null returning json
             ) as "filters",
             json_object(
               'cnes' value p.cnes,
               'region_code' value meta.cd_regiao_saude,
               'region_name' value meta.nm_regiao_saude,
               'macroregion_code' value meta.cd_macrorregiao_saude,
               'macroregion_name' value meta.nm_macrorregiao_saude,
               'region_ipr_median' value meta.nr_ipr_mediana_regiao,
               'region_eligible_combinations' value meta.qt_combinacao_ipr_elegivel_regiao,
               'region_percent_above_reference' value meta.pc_combinacao_acima_referencia_regiao,
               'hospital_eligible_combinations' value meta.qt_elegiveis_hospital
               null on null returning json
             ) as "hospital",
             json_object(
               'limit' value p.limite,
               'offset' value p.deslocamento,
               'count' value coalesce(total.qt_total, 0),
               'has_more' value case
                 when coalesce(total.qt_total, 0) > p.deslocamento + p.limite
                 then 'true'
                 else 'false'
               end format json,
               'order' value 'new_admissions_desc'
               returning json
             ) as "pagination",
             coalesce(
               (
                 select json_arrayagg(
                          json_object(
                            'cnes' value x.cd_cnes,
                            'cid_code' value x.cd_cid_principal,
                            'cid_description' value x.ds_cid,
                            'chapter_code' value x.cd_capitulo_cid,
                            'chapter_description' value x.ds_capitulo_cid,
                            'new_admissions' value x.qt_internacao_nova,
                            'stay_days_total' value x.qt_dia_permanencia_soma,
                            'benchmark_admissions' value x.qt_internacao_benchmark,
                            'benchmark_stay_days_total' value x.qt_dia_permanencia_benchmark,
                            'benchmark_hospitals' value x.qt_hospital_benchmark,
                            'average_stay_hospital' value x.nr_permanencia_media_hospital,
                            'average_stay_benchmark' value x.nr_permanencia_media_benchmark,
                            'ipr' value x.nr_ipr,
                            'sample_status' value x.st_amostra
                            null on null returning json
                          )
                          order by x.nr_linha
                          returning json
                        )
                   from pagina x
               ),
               json_array(returning json)
             ) as "items"
        from parametros p
        outer apply (
          select v.cd_regiao_saude,
                 v.nm_regiao_saude,
                 v.cd_macrorregiao_saude,
                 v.nm_macrorregiao_saude,
                 v.nr_ipr_mediana_regiao,
                 v.qt_combinacao_ipr_elegivel_regiao,
                 v.pc_combinacao_acima_referencia_regiao,
                 (
                   select count(*)
                     from vw_api_hospital_cids t
                    where t.cd_cnes = p.cnes
                      and t.st_amostra = 'suficiente'
                 ) as qt_elegiveis_hospital
            from vw_api_hospital_cids v
           where v.cd_cnes = p.cnes
           fetch first 1 row only
        ) meta
        outer apply (
          select max(o.qt_total) as qt_total
            from ordenado o
        ) total
       where p.parametros_validos = 1
       fetch first 1 row only
    ~'
  );

  -- O decimo primeiro handler nao publica uma tabela: ele e a fronteira
  -- controlada do assistente. O pacote limita tamanho e volume, gera SQL,
  -- recusa qualquer comando que nao seja leitura e guarda a rodada inteira.
  ords.define_template(
    p_module_name => 'medflow_dev',
    p_pattern     => 'assistente/perguntar',
    p_etag_type   => 'NONE',
    p_comments    => 'Pergunta livre do assistente, com Select AI governado e auditado.'
  );

  ords.define_handler(
    p_module_name => 'medflow_dev',
    p_pattern     => 'assistente/perguntar',
    p_method      => 'POST',
    p_source_type => ords.source_type_plsql,
    p_mimes_allowed => 'application/json',
    p_comments    => 'No maximo 300 caracteres, cinco chamadas por sessao no cliente e 50 perguntas por dia no banco.',
    p_source      => q'~
      declare
        l_body     json_object_t;
        l_context  json_object_t;
        l_question varchar2(4000);
        l_context_text varchar2(1000);
        l_id       number;
        l_json     clob;
        l_status   pls_integer := 200;
        l_message  varchar2(4000);

        procedure responder_json(p_json in clob) is
          l_offset pls_integer := 1;
        begin
          owa_util.mime_header('application/json', false, 'UTF-8');
          htp.p('Cache-Control: no-store');
          owa_util.http_header_close;
          while l_offset <= dbms_lob.getlength(p_json) loop
            htp.prn(dbms_lob.substr(p_json, 30000, l_offset));
            l_offset := l_offset + 30000;
          end loop;
        end;

        function contexto(p_chave in varchar2) return varchar2 is
        begin
          if l_context is not null and l_context.has(p_chave) then
            return substr(l_context.get_string(p_chave), 1, 200);
          end if;
          return null;
        exception
          when others then
            return null;
        end;

        -- CD_COMPETENCIA e AAAAMM na Gold. O site exibe 2026-06, e o modelo
        -- copiava esse formato para o filtro, devolvendo zero linha. Normaliza
        -- aqui, para nao depender de quem chama o endpoint.
        function competencia_aaaamm return varchar2 is
          l_valor varchar2(200) := contexto('competence');
        begin
          if l_valor is null then
            return null;
          end if;
          l_valor := replace(replace(trim(l_valor), '-'), '/');
          if regexp_like(l_valor, '^[0-9]{6}$') then
            return l_valor;
          end if;
          return null;
        end;
      begin
        begin
          l_body := json_object_t.parse(:body_text);
          l_question := l_body.get_string('question');
          if l_body.has('context') then
            l_context := l_body.get_object('context');
            l_context_text := 'tela=' || nvl(contexto('route'), 'nao informada')
              || '; competencia=' || nvl(competencia_aaaamm, 'nao informada')
              || ' (formato AAAAMM, igual ao da coluna CD_COMPETENCIA)'
              || '; regiao=' || nvl(contexto('region_name'), 'nao informada')
              || '; codigo_regiao=' || nvl(contexto('region_code'), 'nao informado')
              || '; rede_regional=' || nvl(contexto('macroregion_label'), 'nao informada')
              || '; rras=' || nvl(contexto('macroregion_name'), 'nao informada')
              || '; codigo_rede=' || nvl(contexto('macroregion_code'), 'nao informado')
              || '; hospital_cnes=' || nvl(contexto('hospital_cnes'), 'nao informado')
              || '; analise_ativa=' || nvl(contexto('active_analysis'), 'nao informada');
          end if;
        exception
          when others then
            raise_application_error(-20007, 'Envie JSON com o campo question.');
        end;

        l_id := medflow_select_ai.responder(l_question, l_context_text);
        l_json := medflow_select_ai.json_da_resposta(l_id);
        :status_code := 200;
        responder_json(l_json);
      exception
        when others then
          if sqlcode = -20003 then
            l_status := 429;
            l_message := 'O limite diario da demonstracao foi atingido.';
          elsif sqlcode in (-20002, -20004, -20007, -20008) then
            l_status := 400;
            l_message := substr(sqlerrm, instr(sqlerrm, ':') + 2);
          else
            l_status := 503;
            l_message := 'O Oracle Select AI nao respondeu agora.';
          end if;

          :status_code := l_status;
          l_json := json_object(
            'status' value 'error',
            'message' value l_message
          );
          responder_json(l_json);
      end;
    ~'
  );

  commit;
end;
/

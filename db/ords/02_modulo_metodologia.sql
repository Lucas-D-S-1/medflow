begin
  ords.define_module(
    p_module_name    => 'medflow_dev',
    p_base_path      => 'api/dev/v1/',
    p_items_per_page => 1,
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

  commit;
end;
/

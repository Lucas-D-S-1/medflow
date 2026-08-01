begin
  ords.define_module(
    p_module_name    => 'medflow_dev',
    p_base_path      => 'api/dev/v1/',
    p_items_per_page => 1,
    p_status         => 'PUBLISHED',
    p_comments       => 'Contrato de leitura MedFlow v1 para desenvolvimento.'
  );

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
             substr(cd_competencia_maxima, 1, 4)
               || '-'
               || substr(cd_competencia_maxima, 5, 2) as "data_through",
             '0.3.0' as "contract_version"
        from vw_api_status
       where cd_competencia_maxima is not null
       fetch first 1 row only
    ~'
  );

  commit;
end;
/


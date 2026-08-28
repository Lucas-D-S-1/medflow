-- ATENCAO: este roteiro e uma FATIA HISTORICA, nao a definicao vigente.
--
-- `ords.define_module` substitui o modulo inteiro. Como este arquivo declara
-- so parte dos handlers, executa-lo depois do 03 apaga todos os outros: o
-- modulo fica com os handlers desta fatia e o resto da API responde 404 ate o
-- 03 ser reaplicado. Aconteceu em 28/08/2026, ao publicar o contrato 0.4.0.
--
-- A definicao vigente e completa de `medflow_dev` e o
-- `03_modulo_medflow_dev.sql`. Para republicar a API, rode o 03 e depois o 04.
-- Este arquivo fica versionado como registro da fatia que foi aprovada nele.

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
             '0.4.0' as "contract_version"
        from vw_api_status
       fetch first 1 row only
    ~'
  );

  commit;
end;
/

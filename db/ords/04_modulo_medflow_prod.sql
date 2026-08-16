-- Modulo ORDS de producao: `medflow`, em `api/v1/`.
--
-- Este arquivo NAO redeclara os dez handlers. Ele clona o modulo `medflow_dev`
-- lendo os metadados do proprio ORDS, e muda so as tres coisas que distinguem
-- producao de desenvolvimento: o nome do modulo, o prefixo da URI e a origem
-- permitida no CORS.
--
-- Por que clonar em vez de copiar o SQL: o `03_modulo_medflow_dev.sql` tem
-- 1.900 linhas de handler, e foi essa definicao — nao outra parecida — que
-- passou pelas 8.403.103 comparacoes campo a campo contra a Gold. Uma copia
-- manual criaria uma segunda verdade que envelhece em silencio: bastaria
-- alguem corrigir um `order by` de um lado e esquecer o outro para o produto
-- publico divergir do produto validado, sem nenhum sinal. Clonando, os dois
-- modulos nao podem divergir por descuido, e o portao no fim do bloco recusa
-- a publicacao se divergirem por qualquer outro motivo.
--
-- A consequencia, que precisa ser dita: `medflow_dev` e a fonte. Se ele for
-- redefinido, este roteiro tem de ser executado de novo para producao
-- acompanhar. A ordem e sempre 03 e depois 04.
--
-- Uso, na raiz do repositorio:
--   make ords-publicar
--
-- O bloco e idempotente: `define_module` substitui a definicao inteira, entao
-- reexecutar converge em vez de acumular.

declare
  c_dev     constant varchar2(255)  := 'medflow_dev';
  c_prod    constant varchar2(255)  := 'medflow';
  c_base    constant varchar2(255)  := 'api/v1/';

  -- Origem do site publicado no GitHub Pages, sem barra final: e exatamente
  -- o que o navegador manda no cabecalho `Origin`. Producao nao aceita
  -- `localhost`; quem desenvolve continua no modulo `medflow_dev`.
  c_origens constant varchar2(4000) := 'https://lucas-d-s-1.github.io';

  v_paginacao   user_ords_modules.items_per_page%type;
  v_divergentes pls_integer;
  v_handlers    pls_integer;
begin
  select items_per_page
    into v_paginacao
    from user_ords_modules
   where name = c_dev;

  ords.define_module(
    p_module_name    => c_prod,
    p_base_path      => c_base,
    p_items_per_page => v_paginacao,
    p_status         => 'PUBLISHED',
    p_comments       => 'Contrato de leitura MedFlow v1, publico. Clone de medflow_dev.'
  );

  ords.set_module_origins_allowed(
    p_module_name     => c_prod,
    p_origins_allowed => c_origens
  );

  for t in (
    select tpl.uri_template,
           tpl.priority,
           tpl.etag_type,
           tpl.etag_query,
           tpl.comments
      from user_ords_templates tpl
      join user_ords_modules m on m.id = tpl.module_id
     where m.name = c_dev
     order by tpl.uri_template
  ) loop
    ords.define_template(
      p_module_name => c_prod,
      p_pattern     => t.uri_template,
      p_priority    => t.priority,
      p_etag_type   => t.etag_type,
      p_etag_query  => t.etag_query,
      p_comments    => t.comments
    );
  end loop;

  for h in (
    select tpl.uri_template,
           h.method,
           h.source_type,
           h.items_per_page,
           h.mimes_allowed,
           h.comments,
           h.source
      from user_ords_handlers h
      join user_ords_templates tpl on tpl.id = h.template_id
      join user_ords_modules m on m.id = tpl.module_id
     where m.name = c_dev
     order by tpl.uri_template, h.method
  ) loop
    ords.define_handler(
      p_module_name    => c_prod,
      p_pattern        => h.uri_template,
      p_method         => h.method,
      p_source_type    => h.source_type,
      p_items_per_page => h.items_per_page,
      p_mimes_allowed  => h.mimes_allowed,
      p_comments       => h.comments,
      p_source         => h.source
    );
  end loop;

  commit;

  -- Portao: producao so vale se cada handler publicado for identico ao
  -- validado, byte a byte no SQL. Um handler a mais, um a menos, um
  -- `source_type` trocado ou um caractere diferente na consulta reprova aqui,
  -- antes de o link publico existir.
  select count(*)
    into v_divergentes
    from (
           select tpl.uri_template as padrao,
                  h.method,
                  h.source_type,
                  h.mimes_allowed,
                  h.source
             from user_ords_handlers h
             join user_ords_templates tpl on tpl.id = h.template_id
             join user_ords_modules m on m.id = tpl.module_id
            where m.name = c_dev
         ) d
    full outer join (
           select tpl.uri_template as padrao,
                  h.method,
                  h.source_type,
                  h.mimes_allowed,
                  h.source
             from user_ords_handlers h
             join user_ords_templates tpl on tpl.id = h.template_id
             join user_ords_modules m on m.id = tpl.module_id
            where m.name = c_prod
         ) p
      on p.padrao = d.padrao
     and p.method = d.method
   where d.padrao is null
      or p.padrao is null
      or p.source_type != d.source_type
      or nvl(p.mimes_allowed, '-') != nvl(d.mimes_allowed, '-')
      or dbms_lob.compare(p.source, d.source) != 0;

  if v_divergentes != 0 then
    raise_application_error(
      -20001,
      'Producao divergiu do modulo validado em ' || v_divergentes
        || ' handler(s). Nada publicado.'
    );
  end if;

  select count(*)
    into v_handlers
    from user_ords_handlers h
    join user_ords_templates tpl on tpl.id = h.template_id
    join user_ords_modules m on m.id = tpl.module_id
   where m.name = c_prod;

  if v_handlers != 10 then
    raise_application_error(
      -20002,
      'Esperados 10 handlers em producao, encontrados ' || v_handlers || '.'
    );
  end if;
end;
/

select m.name,
       m.uri_prefix,
       m.status,
       m.origins_allowed,
       count(h.id) as handlers
  from user_ords_modules m
  left join user_ords_templates tpl on tpl.module_id = m.id
  left join user_ords_handlers h on h.template_id = tpl.id
 group by m.name, m.uri_prefix, m.status, m.origins_allowed
 order by m.name;

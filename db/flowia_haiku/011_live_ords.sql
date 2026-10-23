begin
  ords.define_module(p_module_name=>'flowia_haiku_live',p_base_path=>'api/flowia-haiku-live/v1/',p_items_per_page=>0,p_status=>'PUBLISHED');
  ords.set_module_origins_allowed(p_module_name=>'flowia_haiku_live',p_origins_allowed=>'http://127.0.0.1:4184');
  ords.define_template(p_module_name=>'flowia_haiku_live',p_pattern=>'perguntar',p_etag_type=>'NONE');
  ords.define_handler(p_module_name=>'flowia_haiku_live',p_pattern=>'perguntar',p_method=>'POST',p_source_type=>ords.source_type_plsql,p_mimes_allowed=>'application/json',p_source=>q'~
    declare
      payload clob:=:body_text;
      req json_object_t;
      response clob;
      pos integer:=1;
    begin
      if dbms_lob.getlength(payload)>12000 then
        :status_code:=413;
        response:='{"status":"error","message":"Pergunta ou contexto excede o limite."}';
      else
        req:=json_object_t.parse(payload);
        response:=FLOWIA_HAIKU_LIVE_API.ask(req.get_string('question'),req.get_object('context').to_clob);
      end if;
      owa_util.mime_header('application/json',false,'UTF-8');
      htp.p('Cache-Control: no-store'); owa_util.http_header_close;
      while pos<=dbms_lob.getlength(response) loop
        htp.prn(dbms_lob.substr(response,30000,pos)); pos:=pos+30000;
      end loop;
    exception when others then
      :status_code:=400;
      owa_util.mime_header('application/json',false,'UTF-8'); owa_util.http_header_close;
      htp.prn('{"status":"error","message":"Entrada inválida."}');
    end;
  ~');
  ords.define_template(p_module_name=>'flowia_haiku_live',p_pattern=>'reserva',p_etag_type=>'NONE');
  ords.define_handler(p_module_name=>'flowia_haiku_live',p_pattern=>'reserva',p_method=>'POST',p_source_type=>ords.source_type_plsql,p_mimes_allowed=>'application/json',p_source=>q'~
    declare
      payload clob:=:body_text;
      req json_object_t;
      response clob;
      pos integer:=1;
    begin
      if dbms_lob.getlength(payload)>12000 then
        :status_code:=413;
        response:='{"status":"error","message":"Pergunta ou contexto excede o limite."}';
      else
        req:=json_object_t.parse(payload);
        response:=FLOWIA_HAIKU_LIVE_API.reserve_answer(req.get_string('question'),req.get_object('context').to_clob);
      end if;
      owa_util.mime_header('application/json',false,'UTF-8');
      htp.p('Cache-Control: no-store'); owa_util.http_header_close;
      while pos<=dbms_lob.getlength(response) loop
        htp.prn(dbms_lob.substr(response,30000,pos)); pos:=pos+30000;
      end loop;
    exception when others then
      :status_code:=400;
      owa_util.mime_header('application/json',false,'UTF-8'); owa_util.http_header_close;
      htp.prn('{"status":"error","message":"Entrada inválida."}');
    end;
  ~');
  commit;
end;
/

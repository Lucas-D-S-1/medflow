-- Executar depois de 011_live_ords.sql. Preserva as origens já permitidas.
-- Rollback: restaurar origins_allowed capturado antes da aplicação.
declare
  l_origins varchar2(4000);
  l_pages constant varchar2(100) := 'https://lucas-d-s-1.github.io';
begin
  select origins_allowed into l_origins
    from user_ords_modules where name = 'flowia_haiku_live';
  if instr(',' || replace(l_origins, ' ', '') || ',', ',' || l_pages || ',') = 0 then
    ords.set_module_origins_allowed(
      p_module_name => 'flowia_haiku_live',
      p_origins_allowed => case when l_origins is null then l_pages
                               else l_origins || ',' || l_pages end
    );
  end if;
  commit;
end;
/

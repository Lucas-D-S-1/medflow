-- =====================================================================
-- MedFlow — a camada que a página APEX chama
--
-- Rode como MEDFLOW.
--
-- A página do APEX é um formulário e três regiões. Toda a regra vive aqui,
-- pelo mesmo motivo que nenhum indicador é calculado no front: se a garantia
-- mora na tela, ela vale só naquela tela.
--
-- Uma pergunta gera **uma** rodada de modelo, gravada numa linha. As regiões
-- leem dessa linha, pelo id. Se cada região chamasse o modelo por conta
-- própria, o relatório e o texto ao lado poderiam descrever consultas
-- diferentes na mesma tela — numa demonstração ao vivo, é o tipo de coisa que
-- ninguém percebe na hora e não dá para explicar depois.
--
-- As garantias são as mesmas do roteiro em scripts/revalidar_select_ai.py, e
-- existem porque o Select AI erra de maneiras conhecidas e medidas
-- (docs/qualidade/LEITURA_SELECT_AI.md):
--
--   1. SQL vindo do modelo é entrada não confiável. Só executa se for
--      consulta de leitura;
--   2. o modelo aceita o vocabulário errado que vem na pergunta. A varredura
--      olha a narrativa **e os apelidos de coluna do SQL**: no APEX o apelido
--      vira cabeçalho na tela, então ali ele é afirmação, não rascunho.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. O registro das perguntas
-- ---------------------------------------------------------------------
-- Fora do contrato da Gold: não é mart nem dimensão, não entra na carga nem
-- na reconciliação. Existe para dar à demonstração um rastro auditável — o
-- que foi perguntado, o que o modelo respondeu e o que a varredura marcou.

declare
  ja_existe number;
begin
  select count(*) into ja_existe
  from   user_tables
  where  table_name = 'SELECT_AI_RESPOSTA';

  if ja_existe = 0 then
    execute immediate q'[
      create table select_ai_resposta (
        id           number generated always as identity primary key,
        momento      timestamp with local time zone default systimestamp not null,
        pergunta     varchar2(4000) not null,
        sql_gerado   clob,
        narrativa    clob,
        aviso        varchar2(4000),
        recusa       varchar2(400)
      )]';
  end if;
end;
/

comment on table select_ai_resposta is
  'Rastro da demonstracao de Select AI: uma linha por pergunta feita na pagina APEX. Nao faz parte do contrato da Gold e nao entra na carga nem na reconciliacao.';

create or replace package medflow_select_ai as

  -- Perfil criado por db/select_ai/04_select_ai.sql.
  c_perfil constant varchar2(30) := 'MEDFLOW_GENAI';

  -- Faz UMA rodada de modelo, grava a linha e devolve o id.
  -- É o que o processo do APEX chama no submit da página.
  function responder(p_pergunta in varchar2) return number;

  -- As três regiões da página leem daqui, pelo id. Nenhuma chama o modelo.
  --
  -- `sql_da_resposta` é a que vai na região do tipo
  -- "SQL Query (Function Body returning SQL Query)".
  function sql_da_resposta(p_id in number) return varchar2;
  function narrativa_da_resposta(p_id in number) return clob;
  function aviso_da_resposta(p_id in number) return varchar2;

  -- Os termos proibidos que o texto **afirma**. Mencionar não é afirmar:
  -- "as bases não fornecem dado em tempo real" é a resposta certa e não pode
  -- ser reprovada por nomear o que está negando.
  function termos_afirmados(p_texto in clob) return varchar2;

  -- Termos proibidos em apelido de coluna. Aqui não há negação possível: um
  -- cabeçalho escrito `taxa_ocupacao_leitos` afirma, ponto.
  function termos_no_sql(p_sql in varchar2) return varchar2;

  -- Levanta -20001 se o SQL não for consulta de leitura.
  function guardar(p_sql in varchar2) return varchar2;

end medflow_select_ai;
/

create or replace package body medflow_select_ai as

  c_janela_negacao constant pls_integer := 90;

  type t_lista is table of varchar2(60);

  -- O IPH é pressão estimada sobre capacidade SUS declarada, e a base é
  -- mensal por competência.
  function termos_proibidos return t_lista is
  begin
    return t_lista(
        'ocupacao real', 'ocupação real',
        'taxa de ocupacao', 'taxa de ocupação',
        'leitos ocupados',
        'tempo real');
  end;

  -- A mesma lista como aparece em identificador: sem acento, com sublinhado.
  function termos_em_identificador return t_lista is
  begin
    return t_lista(
        'ocupacao_real', 'taxa_ocupacao', 'taxa_de_ocupacao',
        'leitos_ocupados', 'ocupacao_leitos', 'tempo_real');
  end;

  -- Se o texto explica o que o número é de verdade, mencionar o termo errado
  -- ao lado da correção não é reivindicá-lo.
  function ressalvas return t_lista is
  begin
    return t_lista(
        'pressao estimada', 'pressão estimada',
        'capacidade declarada',
        'nao e ocupacao real', 'não é ocupação real',
        'competencia mensal', 'competência mensal');
  end;

  function tem_negacao(p_janela in varchar2) return boolean is
  begin
    return regexp_like(
        p_janela,
        '(^|[[:space:][:punct:]])(nao|não|nunca|jamais|sem|nenhum|nenhuma'
        || '|inexistente|impossivel|impossível)([[:space:][:punct:]]|$)',
        'i');
  end;

  function termos_afirmados(p_texto in clob) return varchar2 is
    l_texto      clob := lower(nvl(p_texto, to_clob('')));
    l_proibidos  t_lista := termos_proibidos();
    l_ressalvas  t_lista := ressalvas();
    l_achados    varchar2(4000);
    l_pos        pls_integer;
    l_inicio     pls_integer;
    l_janela     varchar2(200);
  begin
    if dbms_lob.getlength(l_texto) = 0 then
      return null;
    end if;

    for i in 1 .. l_ressalvas.count loop
      if dbms_lob.instr(l_texto, l_ressalvas(i)) > 0 then
        return null;
      end if;
    end loop;

    for i in 1 .. l_proibidos.count loop
      l_pos := dbms_lob.instr(l_texto, l_proibidos(i));
      while l_pos > 0 loop
        l_inicio := greatest(1, l_pos - c_janela_negacao);
        l_janela := dbms_lob.substr(l_texto, l_pos - l_inicio, l_inicio);

        if not tem_negacao(l_janela) then
          l_achados := l_achados
                       || case when l_achados is null then '' else ', ' end
                       || l_proibidos(i);
          exit;
        end if;

        l_pos := dbms_lob.instr(l_texto, l_proibidos(i), l_pos + 1);
      end loop;
    end loop;

    return l_achados;
  end termos_afirmados;

  function termos_no_sql(p_sql in varchar2) return varchar2 is
    l_sql     varchar2(32767) := lower(nvl(p_sql, ' '));
    l_termos  t_lista := termos_em_identificador();
    l_achados varchar2(4000);
  begin
    for i in 1 .. l_termos.count loop
      if instr(l_sql, l_termos(i)) > 0 then
        l_achados := l_achados
                     || case when l_achados is null then '' else ', ' end
                     || l_termos(i);
      end if;
    end loop;
    return l_achados;
  end termos_no_sql;

  function limpar(p_sql in varchar2) return varchar2 is
    l_sql varchar2(32767) := trim(p_sql);
  begin
    -- O modelo às vezes devolve o SQL em cerca de crase.
    l_sql := regexp_replace(l_sql, '^```[[:alpha:]]*[[:space:]]*', '');
    l_sql := regexp_replace(l_sql, '[[:space:]]*```$', '');
    return rtrim(trim(l_sql), ';');
  end;

  function guardar(p_sql in varchar2) return varchar2 is
    l_sql varchar2(32767) := limpar(p_sql);
  begin
    if l_sql is null then
      raise_application_error(-20001, 'O modelo nao devolveu SQL.');
    end if;

    if not regexp_like(l_sql, '^[[:space:]]*(select|with)([[:space:][:punct:]])', 'i') then
      raise_application_error(-20001, 'Nao comeca por SELECT nem WITH.');
    end if;

    -- Fronteira de palavra: "deleted_at" num nome de coluna não é DELETE.
    if regexp_like(
           l_sql,
           '(^|[[:space:][:punct:]])(insert|update|delete|merge|drop|truncate'
           || '|alter|create|grant|revoke|commit|rollback|execute|exec|begin'
           || '|declare|call)([[:space:][:punct:]]|$)',
           'i') then
      raise_application_error(-20001, 'Contem comando que nao e de leitura.');
    end if;

    return l_sql;
  end guardar;

  function gerar(p_pergunta in varchar2, p_acao in varchar2) return clob is
  begin
    return dbms_cloud_ai.generate(
               prompt       => p_pergunta,
               profile_name => c_perfil,
               action       => p_acao);
  end;

  function responder(p_pergunta in varchar2) return number is
    l_id        number;
    l_sql       varchar2(32767);
    l_narrativa clob;
    l_recusa    varchar2(400);
    l_aviso     varchar2(4000);
    l_no_texto  varchar2(4000);
    l_no_sql    varchar2(4000);
  begin
    if p_pergunta is null then
      raise_application_error(-20002, 'Escreva uma pergunta.');
    end if;

    begin
      l_sql := guardar(dbms_lob.substr(gerar(p_pergunta, 'showsql'), 32000, 1));
    exception
      when others then
        l_recusa := substr(sqlerrm, 1, 400);
    end;

    l_narrativa := gerar(p_pergunta, 'narrate');

    l_no_texto := termos_afirmados(l_narrativa);
    l_no_sql   := termos_no_sql(l_sql);

    if l_no_texto is not null or l_no_sql is not null then
      l_aviso := 'Esta base nao sustenta os termos abaixo. O IPH e pressao '
                 || 'estimada sobre capacidade SUS declarada no CNES, nunca '
                 || 'ocupacao real de leito, e o dado e mensal por '
                 || 'competencia, nunca tempo real.'
                 || case when l_no_texto is not null
                         then chr(10) || 'Afirmado na resposta: ' || l_no_texto || '.'
                         else '' end
                 || case when l_no_sql is not null
                         then chr(10) || 'Em apelido de coluna, que vira '
                              || 'cabecalho na tela: ' || l_no_sql || '.'
                         else '' end;
    end if;

    insert into select_ai_resposta (pergunta, sql_gerado, narrativa, aviso, recusa)
    values (substr(p_pergunta, 1, 4000), l_sql, l_narrativa, l_aviso, l_recusa)
    returning id into l_id;

    return l_id;
  end responder;

  function sql_da_resposta(p_id in number) return varchar2 is
    l_sql    varchar2(32767);
    l_recusa varchar2(400);
  begin
    select dbms_lob.substr(sql_gerado, 32000, 1), recusa
    into   l_sql, l_recusa
    from   select_ai_resposta
    where  id = p_id;

    if l_sql is not null then
      return l_sql;
    end if;

    -- A região precisa renderizar. A recusa vira conteúdo, não tela branca.
    return q'[select ']'
           || replace(nvl(l_recusa, 'SQL recusado.'), '''', '''''')
           || q'[' as "SQL recusado pelo guarda de leitura" from dual]';

  exception
    when no_data_found then
      return q'[select 'Escreva uma pergunta acima.' as "Aviso" from dual]';
  end sql_da_resposta;

  function narrativa_da_resposta(p_id in number) return clob is
    l_texto clob;
  begin
    select narrativa into l_texto from select_ai_resposta where id = p_id;
    return l_texto;
  exception
    when no_data_found then
      return to_clob('');
  end narrativa_da_resposta;

  function aviso_da_resposta(p_id in number) return varchar2 is
    l_aviso varchar2(4000);
  begin
    select aviso into l_aviso from select_ai_resposta where id = p_id;
    return l_aviso;
  exception
    when no_data_found then
      return null;
  end aviso_da_resposta;

end medflow_select_ai;
/

-- =====================================================================
-- MedFlow — a camada que a página APEX chama
--
-- Rode como MEDFLOW.
--
-- A página do APEX é um formulário e três regiões. Toda a regra vive aqui,
-- pelo mesmo motivo que nenhum indicador é calculado no front: se a garantia
-- mora na tela, ela vale só naquela tela.
--
-- Uma pergunta gera **uma** rodada auditada, gravada numa linha. A rodada tem
-- duas geracoes do modelo (`showsql` e `narrate`); as regiões
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
        contexto     varchar2(1000),
        sql_gerado   clob,
        narrativa    clob,
        aviso        varchar2(4000),
        recusa       varchar2(400)
      )]';
  end if;
end;
/

-- Migração idempotente para instalações anteriores ao assistente contextual.
declare
  ja_existe number;
begin
  select count(*) into ja_existe
  from   user_tab_columns
  where  table_name = 'SELECT_AI_RESPOSTA'
  and    column_name = 'CONTEXTO';

  if ja_existe = 0 then
    execute immediate 'alter table select_ai_resposta add contexto varchar2(1000)';
  end if;
end;
/

comment on table select_ai_resposta is
  'Rastro da demonstracao de Select AI: uma linha por pergunta feita na pagina APEX. Nao faz parte do contrato da Gold e nao entra na carga nem na reconciliacao.';

-- A cota precisa contar tentativas, não só respostas concluídas. Se o serviço
-- externo falhar antes do INSERT da auditoria, repetir sem limite também
-- consome GenAI. Uma linha por dia permite incremento atômico e barato.
declare
  ja_existe number;
begin
  select count(*) into ja_existe
  from   user_tables
  where  table_name = 'SELECT_AI_COTA';

  if ja_existe = 0 then
    execute immediate q'[
      create table select_ai_cota (
        dia       date primary key,
        perguntas number(3) default 0 not null,
        constraint ck_select_ai_cota_nao_negativa check (perguntas >= 0)
      )]';
  end if;
end;
/

merge into select_ai_cota c
using (
  select trunc(current_date) as dia, count(*) as perguntas
    from select_ai_resposta
   where momento >= cast(trunc(current_date) as timestamp with local time zone)
) r
on (c.dia = r.dia)
when matched then update set c.perguntas = greatest(c.perguntas, r.perguntas)
when not matched then insert (dia, perguntas) values (r.dia, r.perguntas);

comment on table select_ai_cota is
  'Cota atomica do assistente: tentativas por dia, inclusive quando o servico GenAI falha.';

create or replace package medflow_select_ai as

  -- Perfil criado por db/select_ai/04_select_ai.sql.
  c_perfil constant varchar2(30) := 'MEDFLOW_GENAI';
  c_limite_perguntas_dia constant pls_integer := 50;

  -- Faz UMA rodada auditada (duas geracoes), grava a linha e devolve o id.
  -- É o que o processo do APEX chama no submit da página.
  function responder(
    p_pergunta in varchar2,
    p_contexto in varchar2 default null
  ) return number;

  -- Contrato pequeno usado pelo handler POST do assistente web. O SQL fica
  -- visível para auditoria, mas só depois de passar por GUARDAR.
  function json_da_resposta(p_id in number) return clob;
  function perguntas_hoje return pls_integer;

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

  function perguntas_hoje return pls_integer is
    l_total pls_integer;
  begin
    select coalesce(max(perguntas), 0)
      into l_total
      from select_ai_cota
     where dia = trunc(current_date);
    return l_total;
  end perguntas_hoje;

  procedure consumir_cota is
    pragma autonomous_transaction;
  begin
    update select_ai_cota
       set perguntas = perguntas + 1
     where dia = trunc(current_date)
       and perguntas < c_limite_perguntas_dia;

    if sql%rowcount = 0 then
      begin
        insert into select_ai_cota (dia, perguntas)
        values (trunc(current_date), 1);
      exception
        when dup_val_on_index then
          update select_ai_cota
             set perguntas = perguntas + 1
           where dia = trunc(current_date)
             and perguntas < c_limite_perguntas_dia;

          if sql%rowcount = 0 then
            raise_application_error(-20003, 'O limite diario da demonstracao foi atingido.');
          end if;
      end;
    end if;

    commit;
  exception
    when others then
      rollback;
      raise;
  end consumir_cota;

  function responder(
    p_pergunta in varchar2,
    p_contexto in varchar2 default null
  ) return number is
    l_id        number;
    l_sql       varchar2(32767);
    l_narrativa clob;
    l_recusa    varchar2(400);
    l_aviso     varchar2(4000);
    l_no_texto  varchar2(4000);
    l_no_sql    varchar2(4000);
    l_pergunta  varchar2(4000) := trim(p_pergunta);
    l_contexto  varchar2(1000) := trim(p_contexto);
    l_prompt    varchar2(4000);
  begin
    if l_pergunta is null then
      raise_application_error(-20002, 'Escreva uma pergunta.');
    end if;

    if length(l_pergunta) > 300 then
      raise_application_error(-20004, 'A pergunta deve ter no maximo 300 caracteres.');
    end if;

    if length(l_contexto) > 1000 then
      raise_application_error(-20008, 'O contexto deve ter no maximo 1000 caracteres.');
    end if;

    l_prompt := case
      when l_contexto is null then l_pergunta
      -- O contexto resolve termos deiticos, mas nao pode virar filtro
      -- universal: perguntas de ranking ("quem mais manda paciente pra fora")
      -- pediam um comparativo entre regioes e voltavam restritas a regiao da
      -- tela, com uma linha so. Os dois regimes precisam ficar explicitos.
      else 'Contexto atual exibido no MedFlow: ' || l_contexto || chr(10)
           || 'Pergunta do usuario: ' || l_pergunta || chr(10)
           || 'Regras de interpretacao:' || chr(10)
           || '1. Use o contexto para resolver termos deiticos: aqui, agora, '
           || 'esse, esta regiao, esse hospital, piorou.' || chr(10)
           || '2. Se a pergunta for comparacao, ranking ou superlativo (quem '
           || 'mais, quais, o maior, o pior, os primeiros), NAO restrinja '
           || 'a regiao nem ao hospital do contexto: percorra todo o escopo '
           || 'disponivel e ordene. Nesse caso o contexto serve apenas para '
           || 'citar onde o local atual aparece no resultado.' || chr(10)
           || '3. Perguntas como ate onde vao os dados, ate quando ha dados, '
           || 'qual o mes mais recente ou qual a ultima competencia pedem '
           || 'cobertura temporal: use MAX(CD_COMPETENCIA), que e AAAAMM, e '
           || 'nunca MAX(NR_MES_COMPETENCIA) sozinho. Responda o mes e o ano.'
           || chr(10)
           || '4. Nunca afirme que nao ha dados quando a consulta retornou '
           || 'linhas: descreva as linhas obtidas.' || chr(10)
           || '5. Quando a consulta estiver ordenada e limitada, narre somente '
           || 'as primeiras linhas exatamente na ordem retornada: comece pela '
           || 'primeira linha, nao reordene e nao acrescente linhas de fora do '
           || 'resultado.' || chr(10)
           || '6. Ao falar de variacao ou tendencia, cite os valores e as '
           || 'competencias comparadas, nao apenas subiu ou desceu.' || chr(10)
           || '7. Explicite brevemente a interpretacao adotada. Se ainda '
           || 'faltar um recorte essencial, peca esclarecimento em vez de '
           || 'inventar.' || chr(10)
           || '8. Glossario territorial: municipio e a unidade administrativa; '
           || 'Regiao de Saude agrupa municipios e e o grao regional principal; '
           || 'RRAS significa Rede Regional de Atencao a Saude e agrupa uma ou '
           || 'mais Regioes de Saude. RRAS nao e zona, subprefeitura nem '
           || 'coordenadoria municipal.' || chr(10)
           || '9. Glossario analitico: IPH e pressao estimada sobre capacidade '
           || 'SUS declarada; TMH e mortalidade hospitalar observada; IPR compara '
           || 'permanencia com pares; CMI e valor medio aprovado, nao custo total; '
           || 'IS compara o mes com anos anteriores; evasao e deslocamento '
           || 'intrastadual observado; ICSAP e sinal territorial, nao '
           || 'evitabilidade individual. TMH = obitos / internacoes novas x 100; '
           || 'IS = internacoes novas de 2026 / media do mesmo mes em 2024 e 2025; '
           || 'CMI nominal e real usam o valor SIH aprovado por internacao.' || chr(10)
           || '10. Para perguntas definicionais (o que e, que significa, explique) '
           || 'sobre um indicador, responda a definicao e a formula do glossario; '
           || 'nao faca ranking nem liste regioes, a menos que isso seja pedido.'
    end;

    consumir_cota;

    begin
      l_sql := guardar(dbms_lob.substr(gerar(l_prompt, 'showsql'), 32000, 1));
    exception
      when others then
        l_recusa := substr(sqlerrm, 1, 400);
    end;

    l_narrativa := gerar(l_prompt, 'narrate');

    if l_narrativa is null or dbms_lob.getlength(l_narrativa) = 0 then
      raise_application_error(-20005, 'O modelo nao devolveu narrativa.');
    end if;

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

    insert into select_ai_resposta (
      pergunta, contexto, sql_gerado, narrativa, aviso, recusa
    )
    values (l_pergunta, l_contexto, l_sql, l_narrativa, l_aviso, l_recusa)
    returning id into l_id;

    return l_id;
  end responder;

  function json_da_resposta(p_id in number) return clob is
    l_json clob;
  begin
    select json_object(
             'status' value 'ok',
             'source' value 'oracle-select-ai',
             'response_id' value id,
             'narrative' value narrativa,
             'sql' value sql_gerado,
             'warning' value aviso
             null on null returning clob
           )
      into l_json
      from select_ai_resposta
     where id = p_id;
    return l_json;
  exception
    when no_data_found then
      raise_application_error(-20006, 'Resposta nao encontrada.');
  end json_da_resposta;

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

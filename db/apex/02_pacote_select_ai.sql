-- =====================================================================
-- MedFlow — a camada que a página APEX chama
--
-- Rode como MEDFLOW.
--
-- A página do APEX é um formulário e três regiões. Toda a regra vive aqui,
-- pelo mesmo motivo que nenhum indicador é calculado no front: se a garantia
-- mora na tela, ela vale só naquela tela.
--
-- Uma pergunta gera **uma** rodada auditada, gravada numa linha. Intencoes
-- governadas podem derivar SQL e narrativa diretamente da Gold; perguntas
-- livres usam duas geracoes do modelo (`showsql` e `narrate`). As regiões
-- leem sempre da mesma linha, pelo id, sem novas chamadas na renderizacao.
--
-- As garantias são as mesmas da suíte em scripts/revalidar_select_ai.py, e
-- existem porque o Select AI erra de maneiras conhecidas e medidas
-- (docs/flowia/LEITURA_SELECT_AI.md):
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
  'Rastro da FlowIA: uma linha por pergunta, com SQL e narrativa auditados. Nao faz parte do contrato da Gold nem entra na reconciliacao.';

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

  -- Faz UMA rodada auditada, governada ou via Select AI, grava a linha e
  -- devolve o id. É o que o processo do APEX chama no submit da página.
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

    -- Envelope de desculpa do Select AI: ele avisa que não conseguiu gerar e
    -- entrega a consulta assim mesmo, depois de "help you further:". Sem
    -- reconhecê-lo, uma resposta utilizável era descartada como "não começa
    -- por SELECT" — foi o que reprovava a pergunta de evasão.
    --
    -- O corte é neste marcador e não no primeiro SELECT do texto, porque a
    -- própria desculpa contém a palavra: "a valid SELECT statement could not
    -- be generated". Cortar ali executaria a frase em inglês.
    if regexp_like(l_sql, 'help you further:', 'i') then
      l_sql := trim(
          regexp_replace(l_sql, '^.*help you further:[[:space:]]*', '', 1, 1, 'in'));
    end if;

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

  -- Rankings sem limite ampliam a carga enviada ao NARRATE e permitem que a
  -- prosa esconda os primeiros colocados no meio de dezenas de linhas. A
  -- classificacao e deliberadamente semantica: vale para qualquer indicador,
  -- nao apenas para uma pergunta da suite de avaliacao.
  function eh_ranking_analitico(p_pergunta in varchar2) return boolean is
  begin
    return regexp_like(
        lower(nvl(p_pergunta, ' ')),
        '(^|[[:space:][:punct:]])(quem|quais|ranking|top|mais|menos|maior'
        || '|menor|primeir[oa]s?)([[:space:][:punct:]]|$)',
        'i');
  end eh_ranking_analitico;

  function ranking_tem_ordem_e_limite(p_sql in varchar2) return boolean is
    l_sql varchar2(32767) := lower(nvl(p_sql, ' '));
  begin
    return regexp_like(
               l_sql,
               '(^|[[:space:][:punct:]])order[[:space:]]+by'
               || '([[:space:][:punct:]]|$)',
               'i')
           and regexp_like(
               l_sql,
               'fetch[[:space:]]+first[[:space:]]+[1-5][[:space:]]+'
               || 'rows?[[:space:]]+only',
               'i');
  end ranking_tem_ordem_e_limite;

  function eh_comparacao_mensal(p_pergunta in varchar2) return boolean is
  begin
    return regexp_like(
        lower(nvl(p_pergunta, ' ')),
        '(piorou|melhorou|uns[[:space:]]+meses|meses[[:space:]]+'
        || '(pra|para)[[:space:]]+c(a|á)|meses[[:space:]]+atr(a|á)s)',
        'i');
  end eh_comparacao_mensal;

  function comparacao_mensal_segura(p_sql in varchar2) return boolean is
    l_sql varchar2(32767) := lower(nvl(p_sql, ' '));
  begin
    -- Para este tipo de pergunta, LAG aplicado depois do filtro da competencia
    -- atual enxerga uma particao de uma linha e devolve NULL. O self-join entre
    -- as duas competencias torna o recorte auditavel e evita essa armadilha.
    return instr(l_sql, 'add_months') > 0
           and regexp_like(l_sql, '-[[:space:]]*3([[:space:][:punct:]]|$)')
           and not regexp_like(l_sql, 'lag[[:space:]]*\(', 'i');
  end comparacao_mensal_segura;

  function eh_comparacao_iph_governada(
    p_pergunta in varchar2,
    p_contexto in varchar2
  ) return boolean is
    l_contexto varchar2(1000) := lower(nvl(p_contexto, ' '));
  begin
    return eh_comparacao_mensal(p_pergunta)
           and (
             instr(l_contexto, 'pressao hospitalar') > 0
             or regexp_like(
                  l_contexto,
                  '(^|[[:space:][:punct:]])iph([[:space:][:punct:]]|$)',
                  'i')
           );
  end eh_comparacao_iph_governada;

  function sql_comparacao_iph_governada return varchar2 is
  begin
    return q'~with datas as (
  select max(cd_competencia) atual,
         to_char(
           add_months(to_date(max(cd_competencia), 'YYYYMM'), -3),
           'YYYYMM'
         ) anterior
  from mart_indicador_regiao_mensal
), comparacao as (
  select a.nm_regiao_saude as regiao,
         a.pc_iph_estimado - b.pc_iph_estimado as variacao
  from mart_indicador_regiao_mensal a
  join datas d on a.cd_competencia = d.atual
  join mart_indicador_regiao_mensal b
    on b.cd_regiao_saude = a.cd_regiao_saude
   and b.cd_competencia = d.anterior
)
select regiao, variacao
from comparacao
order by variacao desc nulls last, regiao
fetch first 5 rows only~';
  end sql_comparacao_iph_governada;

  function narrativa_comparacao_iph_governada return clob is
    l_atual    varchar2(6);
    l_anterior varchar2(6);
    l_texto    clob;
    l_posicao  pls_integer := 0;
  begin
    select max(cd_competencia),
           to_char(
             add_months(to_date(max(cd_competencia), 'YYYYMM'), -3),
             'YYYYMM'
           )
      into l_atual, l_anterior
      from mart_indicador_regiao_mensal;

    l_texto := to_clob(
        'Interpretei uns meses como tres competencias e comparei o IPH '
        || 'percentual de ' || l_atual || ' com ' || l_anterior || '. '
        || 'As cinco maiores variacoes (atual menos anterior), na ordem, sao:'
        || chr(10));

    for item in (
      with datas as (
        select max(cd_competencia) atual,
               to_char(
                 add_months(to_date(max(cd_competencia), 'YYYYMM'), -3),
                 'YYYYMM'
               ) anterior
        from mart_indicador_regiao_mensal
      ), comparacao as (
        select a.nm_regiao_saude as regiao,
               a.pc_iph_estimado - b.pc_iph_estimado as variacao
        from mart_indicador_regiao_mensal a
        join datas d on a.cd_competencia = d.atual
        join mart_indicador_regiao_mensal b
          on b.cd_regiao_saude = a.cd_regiao_saude
         and b.cd_competencia = d.anterior
      )
      select regiao, variacao
      from comparacao
      order by variacao desc nulls last, regiao
      fetch first 5 rows only
    ) loop
      l_posicao := l_posicao + 1;
      l_texto := l_texto
          || '- ' || l_posicao || '. ' || item.regiao || ': '
          || to_char(
               item.variacao,
               'FM9999990D9999',
               'NLS_NUMERIC_CHARACTERS=''.,''')
          || ' p.p.' || chr(10);
    end loop;

    return l_texto
        || 'Valor positivo indica aumento da pressao estimada; valor '
        || 'negativo indica reducao.';
  end narrativa_comparacao_iph_governada;

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

  -- Corta o parágrafo final que só repete o que a resposta acabou de dizer.
  --
  -- A instrução de concisão está no prompt e o modelo a ignora justamente
  -- nesse fecho: depois da lista, ele emenda "Isso significa que…" repetindo a
  -- definição do indicador. Aparar aqui é determinístico e não depende de o
  -- modelo obedecer. Só corta quando sobra texto antes: uma resposta que é
  -- inteira uma frase dessas continua inteira.
  function enxugar(p_texto in clob) return clob is
    l_texto  clob := p_texto;
    l_corte  pls_integer;
    l_antes  clob;
  begin
    if l_texto is null then
      return l_texto;
    end if;
    l_corte := regexp_instr(
        l_texto,
        '(^|[[:space:]])(Isso (significa|representa|indica|quer dizer)|Em resumo|Ou seja|Portanto)[[:space:],]',
        1, 1, 0, 'i');
    if l_corte > 1 then
      l_antes := trim(dbms_lob.substr(l_texto, l_corte - 1, 1));
      -- Só apara se o que sobra já é resposta: pelo menos uma frase inteira.
      if dbms_lob.getlength(l_antes) >= 40 then
        return l_antes;
      end if;
    end if;
    return l_texto;
  end enxugar;

  function responder(
    p_pergunta in varchar2,
    p_contexto in varchar2 default null
  ) return number is
    l_id        number;
    l_sql       varchar2(32767);
    l_sql_bruto varchar2(32767);
    l_narrativa clob;
    l_recusa    varchar2(400);
    l_aviso     varchar2(4000);
    l_no_texto  varchar2(4000);
    l_no_sql    varchar2(4000);
    l_pergunta  varchar2(4000) := trim(p_pergunta);
    l_contexto  varchar2(4000) := trim(p_contexto);
    -- 32767 e nao 4000: o texto fixo das regras ja passa de 4 mil caracteres, e
    -- somado ao contexto (ate 1000) e a pergunta (ate 300) estourava o buffer.
    -- O limite antigo cabia por pouco desde antes das regras 11 e 12, e o
    -- estouro seria ORA-06502 no meio da resposta, nao um erro de contrato.
    l_prompt    varchar2(32767);
    l_prompt_narrativa varchar2(32767);
    l_ranking   boolean;
    l_comparacao_mensal boolean;
    l_comparacao_iph_governada boolean;
  begin
    if l_pergunta is null then
      raise_application_error(-20002, 'Escreva uma pergunta.');
    end if;

    if length(l_pergunta) > 300 then
      raise_application_error(-20004, 'A pergunta deve ter no maximo 300 caracteres.');
    end if;

    if length(l_contexto) > 4000 then
      raise_application_error(-20008, 'O contexto deve ter no maximo 4000 caracteres.');
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
           || '5. Em ranking, comparacao ou superlativo, agregue primeiro no '
           || 'grao pedido e limite a consulta externa aos cinco primeiros: '
           || 'use ORDER BY com desempate deterministico e termine com '
           || 'FETCH FIRST 5 ROWS ONLY (ou menos, se a pergunta pedir). Narre '
           || 'somente essas linhas, exatamente na ordem retornada; nao '
           || 'reordene nem acrescente linhas de fora do resultado.' || chr(10)
           || '6. Em comparacao separada por meses, inclusive quando a pergunta '
           || 'nomeia os dois meses (de maio para junho, entre marco e abril), '
           || 'traga as DUAS competencias no mesmo conjunto antes de qualquer '
           || 'filtro e subtraia uma da outra. Nunca filtre so a competencia '
           || 'final e depois diga que a outra esta ausente: se a pergunta cita '
           || 'dois meses, os dois existem na Gold. Maior queda e a variacao '
           || 'mais negativa, nao o maior valor do mes final. '
           || 'Se a pergunta disser uns '
           || 'meses sem numero, adote tres competencias antes. Obtenha atual '
           || 'com MAX(CD_COMPETENCIA) e derive anterior com '
           || 'TO_CHAR(ADD_MONTHS(TO_DATE(competencia_atual, ''YYYYMM''), -N), '
           || '''YYYYMM''). Nunca subtraia N diretamente do AAAAMM. Una atual '
           || 'e anterior no mesmo grao antes do filtro final; nao use LAG '
           || 'sobre um conjunto ja filtrado apenas na competencia atual. '
           || 'Calcule atual menos anterior e ordene essa variacao na direcao '
           || 'que a pergunta pede: queda, reducao, caiu, diminuiu ou melhorou '
           || 'pedem ASC NULLS LAST, com a variacao mais negativa primeiro; '
           || 'aumento, alta, subiu, cresceu ou piorou pedem DESC NULLS LAST. '
           || 'Ordenar sempre para o mesmo lado responde a pergunta oposta. '
           || 'Para IPH, preserve a medida percentual e narre a variacao '
           || 'em pontos percentuais. Cite valores e competencias.' || chr(10)
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
           || 'permanencia com pares por CID; IPE compara permanencia com pares '
           || 'por especialidade, na mesma regiao e competencia, com o proprio '
           || 'hospital fora do benchmark: acima de 1 e permanencia maior que a '
           || 'dos pares, e ele existe por hospital-especialidade, por hospital '
           || '(NR_IPE_MEDIANA, mediana das especialidades elegiveis) e por '
           || 'regiao (NR_IPE_MEDIANA do mart regional). '
           || 'CMI e valor medio aprovado, nao custo total; '
           || 'IS compara o mes com anos anteriores; evasao e deslocamento '
           || 'intrastadual observado; ICSAP e sinal territorial, nao '
           || 'evitabilidade individual. TMH = obitos / internacoes novas x 100; '
           || 'IS = internacoes novas de 2026 / media do mesmo mes em 2024 e 2025; '
           || 'CMI nominal e real usam o valor SIH aprovado por internacao.' || chr(10)
           || '10. Para perguntas definicionais (o que e, que significa, explique) '
           || 'sobre um indicador, responda a definicao e a formula do glossario '
           || 'em ate duas frases e PARE. Nao consulte dado, nao ranqueie, nao '
           || 'liste regioes nem hospitais, nao de exemplos com valores: quem '
           || 'pergunta o que e um indicador nao pediu os maiores.'
           || chr(10)
           || '11. Em unidades com permanencia media abaixo de um dia, como '
           || 'hospital-dia, o IPH deixa de medir ocupacao: a reconstrucao '
           || 'atribui ao menos um dia por internacao e o indice passa a medir '
           || 'giro sobre capacidade. Se o hospital citado ou listado estiver '
           || 'nessa condicao, diga isso em uma frase e nao chame o valor de '
           || 'taxa de ocupacao. Nesses casos o IPE compara melhor, porque '
           || 'confronta o hospital com pares da mesma especialidade.' || chr(10)
           || '12. Escreva curto, e escolha UM formato: ou ate tres frases, ou '
           || 'uma lista de ate cinco itens de uma linha cada. Nunca os dois. '
           || 'Comece pela resposta, com o numero, a unidade e a competencia. '
           || 'Proibido: repetir a pergunta, abrir com preambulo, e fechar com '
           || 'frase que explica o que acabou de ser dito (nada de "isso '
           || 'significa que", "isso representa", "em resumo"). Depois da lista '
           || 'nao venha paragrafo de conclusao. Ressalva so quando muda a '
           || 'leitura do numero, e em uma frase. Sucinto nao e vago: nunca '
           || 'omita o numero, a unidade, a competencia nem a ressalva que '
           || 'impede uma leitura errada.' || chr(10)
           || '13. O contexto pode trazer conversa_anterior, com as ultimas '
           || 'rodadas no formato P: pergunta R: resposta. Use-a para resolver '
           || 'pergunta eliptica: se a nova pergunta so troca o indicador ou o '
           || 'recorte ("e o TMH?", "e em 2025?", "e o maior?"), mantenha o '
           || 'restante do que a rodada anterior fixou, inclusive a regiao, o '
           || 'hospital e a competencia, e diga em qual recorte esta '
           || 'respondendo. Se a nova pergunta nomear outro assunto, a conversa '
           || 'anterior nao vale mais: responda so a nova.' || chr(10)
           || '14. Nomes de regiao, municipio e hospital estao gravados em '
           || 'MAIUSCULAS e SEM ACENTO (SAO PAULO, JUNDIAI, RIBEIRAO PRETO). '
           || 'Nunca compare com igualdade a um nome escrito pelo usuario: '
           || 'filtre com UPPER da coluna e LIKE, trocando acentos por letras '
           || 'simples, por exemplo UPPER(NM_REGIAO_SAUDE) LIKE ''%SAO PAULO%''. '
           || 'Igualdade sensivel a caixa devolve zero linha e faz parecer que '
           || 'o dado nao existe.' || chr(10)
           -- As regras 15 a 21 saem da bateria de perguntas humanas de 29/08,
           -- em docs/flowia/AVALIACAO_20_PERGUNTAS.md. Cada uma corresponde a um
           -- caso que reprovou, e todas valem para o produto, nao so para o
           -- suite: sao a mesma metodologia que o contrato de limites declara.
           || '15. Glossario de fluxo assistencial, no grao regiao-competencia: '
           || 'mandar paciente para fora, sair, escoar e evadir sao '
           || 'PC_EVASAO_INTRASTADUAL_OBSERVADA; receber gente de fora, atrair '
           || 'e puxar sao PC_ATRACAO_ASSISTENCIAL. Os dois sao percentuais e '
           || 'existem: nunca responda que o dado de fluxo esta indisponivel.'
           || chr(10)
           || '16. OBRIGATORIO em ranking de media: filtre '
           || 'ST_AMOSTRA = ''suficiente'' antes de ordenar, sempre que a '
           || 'coluna existir no grao consultado. Sem esse corte, uma unidade '
           || 'com uma internacao no mes vira recorde e ocupa o topo. Vale '
           || 'para quem segura o paciente por mais tempo, maior permanencia, '
           || 'maior mortalidade, internacao mais cara, maior IPR ou IPE, e '
           || 'qualquer superlativo de media. O grao hospital-mensal ja traz '
           || 'nome, regiao, permanencia e amostra: nao faca JOIN para obter '
           || 'o que ja esta nele.' || chr(10)
           || '17. Atencao basica, atencao primaria, posto de saude e nao '
           || 'estar segurando sao ICSAP, e nunca evasao: ICSAP e internacao '
           || 'que a atencao primaria poderia ter evitado, e evasao e o '
           || 'paciente que se desloca para outra regiao. Sao perguntas '
           || 'diferentes. Comparacao de ICSAP entre territorios usa taxa e '
           || 'nao contagem: TX_ICSAP_RESIDENTE_OBSERVADA_POR_10_MIL. O '
           || 'numero absoluto mede tamanho de populacao, e ranquear por ele '
           || 'so encontra as regioes mais populosas. Cite ICSAP ou atencao '
           || 'primaria na resposta, e lembre que e sinal territorial, nao '
           || 'evitabilidade de um caso.' || chr(10)
           || '18. O que um hospital mais interna, seu perfil e o que ele mais '
           || 'atende pedem ESPECIALIDADE, no grao hospital-especialidade. So '
           || 'desca a diagnostico ou CID quando a pergunta disser diagnostico, '
           || 'CID, doenca ou procedimento.' || chr(10)
           || '19. Nao existe ocupacao, lotacao nem dado em tempo real. Diante '
           || 'de cheio, lotado, agora, hoje ou neste momento, comece dizendo '
           || 'que esse dado NAO esta disponivel e so entao ofereca o IPH da '
           || 'competencia mais recente, que e pressao estimada sobre '
           || 'capacidade declarada. Nunca chame hospital de mais cheio.'
           || chr(10)
           || '20. Pior, melhor, ruim, bom e qualidade nao sao medidos: os '
           || 'indicadores sao administrativos e sem ajuste de risco. Responda '
           || 'que o dado NAO mede qualidade nem desfecho, peca qual indicador '
           || 'usar e cite os disponiveis. Vale para IPR ou IPE acima de 1: e '
           || 'permanencia maior que a dos pares, e nunca qualidade nem '
           || 'desfecho clinico.' || chr(10)
           || '21. Onde olhar, o que priorizar, por onde comecar e quais '
           || 'merecem atencao sao triagem: diga explicitamente que a lista '
           || 'prioriza investigacao e que o sinal nao conclui desempenho.'
           || chr(10)
           || '22. Todo ranking responde UMA competencia. Se o contexto disser '
           || 'competencia nao informada, fixe a mais recente com '
           || 'CD_COMPETENCIA = (SELECT MAX(CD_COMPETENCIA) FROM a mesma '
           || 'tabela). Sem esse filtro o ranking percorre os 30 meses e '
           || 'devolve a mesma unidade varias vezes, uma por mes, como se '
           || 'fossem hospitais diferentes. O mesmo hospital, regiao, '
           || 'especialidade ou diagnostico nunca pode aparecer duas vezes na '
           || 'mesma lista.'
    end;

    l_ranking := eh_ranking_analitico(l_pergunta);
    l_comparacao_mensal := eh_comparacao_mensal(l_pergunta);
    l_comparacao_iph_governada := eh_comparacao_iph_governada(
        l_pergunta,
        l_contexto);

    if l_comparacao_iph_governada then
      l_sql := guardar(sql_comparacao_iph_governada());
      l_narrativa := narrativa_comparacao_iph_governada();
    else
      consumir_cota;

      -- O bruto fica guardado antes da guarda porque era exatamente o que se
      -- perdia: quando o modelo devolvia algo que nao comeca por SELECT, a
      -- linha auditada ficava com sql_gerado nulo e nenhum vestigio do que
      -- ele tinha respondido. Diagnosticar exigia reproduzir a chamada.
      -- Continua fora de sql_gerado, que so recebe SQL aprovado e executado.
      begin
        l_sql_bruto := dbms_lob.substr(gerar(l_prompt, 'showsql'), 32000, 1);
        l_sql := guardar(l_sql_bruto);
      exception
        when others then
          l_recusa := substr(
              sqlerrm
              || case when l_sql_bruto is null then ''
                      else ' | Devolvido: '
                           || regexp_replace(substr(l_sql_bruto, 1, 200),
                                             '[[:space:]]+', ' ')
                 end,
              1,
              400);
      end;

      if l_ranking and l_sql is null then
        l_narrativa := to_clob(
            'Nao foi possivel produzir uma consulta ranqueada segura. '
            || 'Reformule com um indicador disponivel. O IPH mede pressao '
            || 'estimada mensal, nao ocupacao de leitos em tempo real.');
      elsif l_ranking and not ranking_tem_ordem_e_limite(l_sql) then
        l_recusa := 'Ranking recusado: a consulta precisa de ORDER BY e limite '
                    || 'externo entre 1 e 5 linhas.';
        l_sql := null;
        l_narrativa := to_clob(
            'Nao foi possivel produzir uma consulta ranqueada segura. '
            || 'Reformule com um indicador disponivel. O IPH mede pressao '
            || 'estimada mensal, nao ocupacao de leitos em tempo real.');
      elsif l_comparacao_mensal and not comparacao_mensal_segura(l_sql) then
        l_recusa := 'Comparacao mensal recusada: use a competencia de tres '
                    || 'meses antes via ADD_MONTHS e una os dois recortes.';
        l_sql := null;
        l_narrativa := to_clob(
            'Nao foi possivel produzir uma comparacao mensal segura. '
            || 'Reformule informando o indicador e o intervalo desejado.');
      else
        begin
          l_prompt_narrativa := l_prompt || chr(10)
              || 'Ao narrar, preserve exatamente o indicador, as competencias, '
              || 'o limite, os valores e a ordem da consulta auditada abaixo. '
              || 'Nao troque o intervalo nem gere uma lista diferente.'
              || chr(10) || 'Consulta auditada:' || chr(10) || l_sql;
          l_narrativa := enxugar(gerar(l_prompt_narrativa, 'narrate'));
        exception
          when others then
            l_recusa := substr(
                case when l_recusa is null then '' else l_recusa || ' | ' end
                || 'Narrativa indisponivel: ' || sqlerrm,
                1,
                400);
            l_narrativa := to_clob(
                'A consulta foi preparada, mas a explicacao em texto esta '
                || 'temporariamente indisponivel. Os dados auditaveis '
                || 'continuam na tabela de resultado.');
        end;
      end if;
    end if;

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

    -- O modelo declarou baixa confiança e entregou a consulta assim mesmo.
    -- Ela passou pela guarda de somente leitura e foi executada, mas quem lê
    -- precisa saber que veio pelo caminho degradado.
    if l_sql is not null
       and l_sql_bruto is not null
       and regexp_like(l_sql_bruto, 'help you further:', 'i') then
      l_aviso := case when l_aviso is null then '' else l_aviso || chr(10) end
                 || 'O modelo indicou baixa confianca ao gerar esta consulta. '
                 || 'O SQL foi conferido pela guarda de somente leitura e '
                 || 'executado, mas confira o recorte antes de usar o numero.';
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

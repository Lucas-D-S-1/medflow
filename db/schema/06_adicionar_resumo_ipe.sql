-- =====================================================================
-- MedFlow — migração aditiva do resumo do IPE por hospital e por região
--
-- Use sobre uma instância que já executou 02_criar_tabelas_gold e
-- 05_adicionar_indice_especialidade. Acrescenta quatro colunas a cada um
-- dos dois marts e não recria tabela nenhuma, pelo mesmo motivo do 05:
-- recriar derrubaria os marts que o site público lê durante a carga.
--
-- Depois desta migração, recarregue os dois marts:
--   carregar_gold.py --somente mart_indicador_hospital_mensal \
--                    --somente mart_indicador_regiao_mensal
-- e recrie as views 03 e 07, que passam a expor as colunas novas.
-- =====================================================================

set serveroutput on

declare
  procedure acrescentar(p_tabela varchar2, p_coluna varchar2, p_definicao varchar2) is
    l_existe number;
  begin
    select count(*) into l_existe
    from   user_tab_columns
    where  table_name  = upper(p_tabela)
    and    column_name = upper(p_coluna);
    if l_existe = 0 then
      execute immediate
        'alter table ' || p_tabela || ' add (' || p_coluna || ' ' || p_definicao || ')';
      dbms_output.put_line('Coluna acrescentada: ' || p_tabela || '.' || p_coluna);
    else
      dbms_output.put_line('Coluna já existia: ' || p_tabela || '.' || p_coluna);
    end if;
  end;
begin
  -- As contagens são NOT NULL no 02. Numa tabela já povoada isso só passa com
  -- DEFAULT, e zero é o estado honesto para quem ainda não foi recarregado:
  -- nenhuma especialidade apurada. As medianas ficam nulas, porque não há
  -- valor central de conjunto vazio.
  acrescentar('mart_indicador_hospital_mensal',
              'qt_especialidade_ipe_elegivel', 'number(6) default 0 not null');
  acrescentar('mart_indicador_hospital_mensal',
              'nr_ipe_mediana', 'number(12,6)');
  acrescentar('mart_indicador_hospital_mensal',
              'qt_especialidade_ipe_acima_referencia', 'number(6) default 0 not null');
  acrescentar('mart_indicador_hospital_mensal',
              'pc_especialidade_ipe_acima_referencia', 'number(9,6)');

  acrescentar('mart_indicador_regiao_mensal',
              'qt_hospital_especialidade_ipe_elegivel', 'number(8) default 0 not null');
  acrescentar('mart_indicador_regiao_mensal',
              'nr_ipe_mediana', 'number(12,6)');
  acrescentar('mart_indicador_regiao_mensal',
              'qt_hospital_especialidade_ipe_acima_referencia', 'number(8) default 0 not null');
  acrescentar('mart_indicador_regiao_mensal',
              'pc_hospital_especialidade_ipe_acima_referencia', 'number(9,6)');
end;
/

comment on column mart_indicador_hospital_mensal.qt_especialidade_ipe_elegivel is 'Quantidade de especialidades deste hospital na competencia em que o IPE e calculavel. Zero significa que nenhuma passou nos cortes, nao que o hospital esteja bem ou mal.';
comment on column mart_indicador_hospital_mensal.nr_ipe_mediana is 'Mediana do IPE entre as especialidades elegiveis do hospital na competencia. Mediana e nao media porque a razao tem cauda longa a direita e uma especialidade extrema deslocaria o hospital inteiro. Nula quando nenhuma especialidade e elegivel. Nao e nota de qualidade: compara permanencia observada sem ajuste de risco.';
comment on column mart_indicador_hospital_mensal.qt_especialidade_ipe_acima_referencia is 'Quantidade de especialidades elegiveis do hospital com IPE maior que 1, ou seja, com permanencia media acima da dos pares da regiao na mesma especialidade.';
comment on column mart_indicador_hospital_mensal.pc_especialidade_ipe_acima_referencia is 'Percentual das especialidades elegiveis do hospital com IPE maior que 1. Nulo quando nenhuma e elegivel.';
comment on column mart_indicador_regiao_mensal.qt_hospital_especialidade_ipe_elegivel is 'Quantidade de combinacoes hospital-especialidade da regiao na competencia em que o IPE e calculavel.';
comment on column mart_indicador_regiao_mensal.nr_ipe_mediana is 'Mediana do IPE entre as combinacoes hospital-especialidade elegiveis da regiao na competencia. Sai do conjunto inteiro da regiao, nao da mediana das medianas dos hospitais. Nula quando nenhuma combinacao e elegivel.';
comment on column mart_indicador_regiao_mensal.qt_hospital_especialidade_ipe_acima_referencia is 'Quantidade de combinacoes hospital-especialidade da regiao com IPE maior que 1.';
comment on column mart_indicador_regiao_mensal.pc_hospital_especialidade_ipe_acima_referencia is 'Percentual das combinacoes hospital-especialidade elegiveis da regiao com IPE maior que 1. Nulo quando nenhuma e elegivel.';

prompt Migracao do resumo do IPE concluida. Recarregue os dois marts e recrie as views 03 e 07.

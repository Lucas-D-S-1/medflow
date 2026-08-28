-- =====================================================================
-- MedFlow — migração aditiva do Índice de Permanência por Especialidade
--
-- Use esta migração sobre uma instância que já executou
-- 02_criar_tabelas_gold. Ela acrescenta seis colunas ao mart de
-- especialidades e não recria tabela nenhuma: recriar o modelo derrubaria
-- os marts que o site público lê enquanto a carga não termina.
--
-- Depois desta migração, recarregue o mart:
--   carregar_gold.py --somente mart_indicador_hospital_especialidade_mensal
-- e recrie a view 08, que passa a expor as colunas novas.
--
-- Os COMMENT ON não são decoração: o Select AI usa os comentários de
-- coluna como contexto ao traduzir pergunta em SQL.
-- =====================================================================

set serveroutput on

declare
  qt number;

  procedure acrescentar(nome varchar2, definicao varchar2) is
    existente number;
  begin
    select count(*) into existente
    from   user_tab_columns
    where  table_name  = 'MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL'
    and    column_name = upper(nome);
    if existente = 0 then
      execute immediate
        'alter table mart_indicador_hospital_especialidade_mensal add ('
        || nome || ' ' || definicao || ')';
      dbms_output.put_line('Coluna acrescentada: ' || nome);
    else
      dbms_output.put_line('Coluna já existia: ' || nome);
    end if;
  end;
begin
  select count(*) into qt
  from   user_tables
  where  table_name = 'MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL';
  if qt = 0 then
    raise_application_error(
      -20001,
      'MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL não existe. Execute 02_criar_tabelas_gold antes.');
  end if;

  acrescentar('qt_internacao_benchmark_especialidade',        'number(12)');
  acrescentar('qt_dia_permanencia_benchmark_especialidade',   'number(14)');
  acrescentar('qt_hospital_benchmark_especialidade',          'number(6)');
  acrescentar('nr_permanencia_media_benchmark_especialidade', 'number(12,6)');
  acrescentar('nr_ipe',                                       'number(12,6)');

  -- O 02 declara st_amostra_ipe NOT NULL. Numa tabela já povoada isso só
  -- passa com DEFAULT, que preenche as linhas existentes com o estado
  -- honesto para quem ainda não foi recarregado: sem amostra apurada.
  acrescentar('st_amostra_ipe',
              q'~varchar2(40 char) default 'amostra_insuficiente' not null~');
end;
/

comment on column mart_indicador_hospital_especialidade_mensal.nr_ipe is 'Indice de Permanencia por Especialidade: permanencia media do hospital nesta especialidade dividida pela permanencia media dos demais hospitais da mesma regiao na mesma especialidade e competencia. Acima de 1 significa permanencia maior que a dos pares. Nulo quando st_amostra_ipe nao e suficiente. Nao e nota de qualidade nem medida de desfecho: compara permanencia observada sem ajuste de risco clinico.';
comment on column mart_indicador_hospital_especialidade_mensal.st_amostra_ipe is 'Elegibilidade do nr_ipe: suficiente, benchmark_zero ou amostra_insuficiente. Suficiente exige 20 internacoes no hospital, 50 no benchmark, 3 outros hospitais e permanencia do benchmark maior que zero.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_internacao_benchmark_especialidade is 'Internacoes novas dos demais hospitais da regiao na mesma especialidade e competencia. Exclui este hospital.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_dia_permanencia_benchmark_especialidade is 'Dias de permanencia dos demais hospitais da regiao na mesma especialidade e competencia. Exclui este hospital.';
comment on column mart_indicador_hospital_especialidade_mensal.qt_hospital_benchmark_especialidade is 'Quantidade de outros hospitais que compoem o benchmark da especialidade.';
comment on column mart_indicador_hospital_especialidade_mensal.nr_permanencia_media_benchmark_especialidade is 'Permanencia media dos demais hospitais da regiao na mesma especialidade e competencia, em dias.';

prompt Migracao do IPE concluida. Recarregue o mart de especialidades e recrie a view 08.

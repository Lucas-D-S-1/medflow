-- Migração idempotente para bancos criados antes do reforço temporal.
--
-- O Select AI confundiu MAX(NR_MES_COMPETENCIA) com a competência mais
-- recente e respondeu dezembro para uma Gold publicada até 202606. O mês
-- isolado não ordena anos; CD_COMPETENCIA, no formato AAAAMM, ordena.

comment on column mart_indicador_hospital_mensal.nr_mes_competencia is
  'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_indicador_hospital_mensal.cd_competencia is
  'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';

comment on column mart_indicador_hospital_especialidade_mensal.nr_mes_competencia is
  'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_indicador_hospital_especialidade_mensal.cd_competencia is
  'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';

comment on column mart_indicador_regiao_mensal.nr_mes_competencia is
  'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_indicador_regiao_mensal.cd_competencia is
  'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';

comment on column mart_fluxo_assistencial_regiao_mensal.nr_mes_competencia is
  'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_fluxo_assistencial_regiao_mensal.cd_competencia is
  'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';

comment on column mart_icsap_regiao_mensal.nr_mes_competencia is
  'Componente de mes (1 a 12), nao ordena competencias entre anos. Nunca use MAX desta coluna para achar o dado mais recente; use MAX(CD_COMPETENCIA).';
comment on column mart_icsap_regiao_mensal.cd_competencia is
  'Competencia AAAAMM e chave cronologica. Para o dado mais recente, use MAX(CD_COMPETENCIA) e filtre por ela.';

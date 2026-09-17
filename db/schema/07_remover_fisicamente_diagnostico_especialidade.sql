-- =====================================================================
-- ETAPA OPCIONAL E DESTRUTIVA — não faz parte do rollback padrão.
--
-- Pré-condições: pacote/profile/ORDS/frontend anteriores restaurados e todas
-- as dependências da view e do mart removidas. Não usa PURGE: o recycle bin
-- do Oracle continua sendo a última proteção disponível.
--
-- Para executar conscientemente, revise dependências e edite a definição
-- abaixo para o valor exato REMOVER_MART_DIAGNOSTICO.
-- =====================================================================

set serveroutput on
define CONFIRMAR_REMOCAO_FISICA = 'NAO_REMOVER'

declare
begin
  if '&&CONFIRMAR_REMOCAO_FISICA' <> 'REMOVER_MART_DIAGNOSTICO' then
    raise_application_error(
      -20071,
      'Remoção física cancelada. Confirme somente após remover dependências.'
    );
  end if;
end;
/

drop view vw_api_hosp_diag_esp_mensal;
drop table mart_indicador_hospital_especialidade_cid_mensal cascade constraints;

prompt Remoção física opcional concluída; recycle bin preservado.

"""O roteiro da demonstração de Select AI do MedFlow.

Cinco blocos, em profundidade crescente. Os três primeiros trazem SQL de
referência: a resposta é validada em SQL convencional antes de a pergunta ir ao
modelo, e o roteiro compara as duas execuções. Os dois últimos não têm
referência porque não perguntam por um número — testam o que o modelo faz
quando a pergunta é uma armadilha, quando depende do turno anterior, e quando
ele não tem os dados na frente.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Pergunta:
    """Uma pergunta do roteiro.

    `rotulo` é a coluna que carrega a resposta de negócio — o nome da região, da
    especialidade, do diagnóstico. É por ela que a comparação entre o SQL gerado
    e o de referência acontece: quando alguém pergunta "quais as cinco regiões
    com maior pressão", a resposta *é* a lista ordenada de nomes, não o número
    que produziu a ordem. Duas consultas que devolvem a mesma lista na mesma
    ordem responderam a mesma pergunta, ainda que uma use razão decimal e a
    outra percentual.
    """

    id: str
    titulo: str
    prompt: str
    sql_referencia: str = ""
    rotulo: str = ""
    seguimento: str = ""
    espera: str = ""
    limitacao_conhecida: str = ""
    """Limitação do modelo já medida, documentada e aceita.

    Uma pergunta marcada assim pode falhar sem derrubar a execução: a falha já
    foi analisada em `docs/qualidade/LEITURA_SELECT_AI.md` e a decisão de
    produto foi conviver com ela. O que derruba é falha **nova** — pergunta sem
    marca que passou a divergir. E uma marca que para de falhar também é
    notícia: significa que a limitação foi superada e a marca deve sair.
    """


BLOCO_A = "A. Leitura direta: uma tabela, um corte"
BLOCO_B = "B. Profundidade analítica: junção entre marts e colunas de estado"
BLOCO_C = "C. Armadilhas: onde a resposta certa é recusar ou ressalvar"
BLOCO_D = "D. Conversação: a pergunta que só existe depois da anterior"
BLOCO_E = "E. Com e sem os dados na frente: chat contra narrate"

ROTEIRO: dict[str, list[Pergunta]] = {
    BLOCO_A: [
        Pergunta(
            id="A1",
            titulo="Onde a rede está sob mais pressão em 2026?",
            prompt=(
                "quais as cinco regioes de saude com maior indice de pressao "
                "hospitalar medio em 2026"
            ),
            rotulo="nm_regiao_saude",
            sql_referencia="""
select nm_regiao_saude,
       round(avg(pc_iph_estimado), 1) as pc_iph_medio_2026,
       sum(qt_internacao_nova)        as qt_internacao_nova
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_iph_medio_2026 desc
fetch  first 5 rows only
""",
        ),
        Pergunta(
            id="A2",
            titulo="Onde a mortalidade se concentra, com amostra confiável?",
            prompt=(
                "quais sao as dez especialidades com maior taxa de mortalidade "
                "hospitalar media? Primeiro filtre st_amostra igual a "
                "suficiente, depois agrupe por especialidade e mantenha "
                "somente grupos com pelo menos 100 linhas hospital-mes"
            ),
            rotulo="nm_especialidade",
            sql_referencia="""
select nm_especialidade,
       round(avg(pc_tmh), 2) as pc_tmh_medio,
       count(*)              as qt_hospital_mes
from   mart_indicador_hospital_especialidade_mensal
where  st_amostra = 'suficiente'
group  by nm_especialidade
having count(*) >= 100
order  by pc_tmh_medio desc
fetch  first 10 rows only
""",
        ),
        Pergunta(
            id="A3",
            titulo="Quais diagnósticos internam mais tempo que os pares?",
            prompt=(
                "quais sao os dez diagnosticos com maior IPR medio, "
                "considerando somente combinacoes hospital-CID com amostra "
                "suficiente e pelo menos 10 combinacoes por diagnostico"
            ),
            rotulo="ds_cid",
            sql_referencia="""
select ds_cid,
       count(*)              as qt_hospital,
       round(avg(nr_ipr), 2) as nr_ipr_medio
from   mart_indicador_hospital_cid_periodo
where  st_amostra = 'suficiente'
group  by ds_cid
having count(*) >= 10
order  by nr_ipr_medio desc
fetch  first 10 rows only
""",
        ),
        Pergunta(
            id="A4",
            titulo="Quais regiões mais dependem de atendimento fora do território?",
            prompt=(
                "quais as dez regioes com maior percentual medio de evasao "
                "intrastadual observada em 2026? Nao interprete como evasao "
                "para fora de Sao Paulo"
            ),
            rotulo="nm_regiao_saude",
            sql_referencia="""
select nm_regiao_saude,
       round(avg(pc_evasao_intrastadual_observada), 2) as pc_evasao_observada,
       sum(qt_evasao_intrastadual_observada)           as qt_evasao_observada
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_evasao_observada desc
fetch  first 10 rows only
""",
        ),
        Pergunta(
            id="A5",
            titulo="Quais grupos ICSAP mais pressionam internações de residentes?",
            prompt=(
                "quais foram os dez grupos ICSAP com mais internacoes de "
                "residentes em 2026"
            ),
            rotulo="nm_grupo_icsap",
            sql_referencia="""
select nm_grupo_icsap,
       sum(qt_internacao_icsap) as qt_internacao_icsap
from   mart_icsap_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_grupo_icsap
order  by qt_internacao_icsap desc
fetch  first 10 rows only
""",
        ),
    ],
    BLOCO_B: [
        Pergunta(
            id="B1",
            limitacao_conhecida=(
                "o modelo ordena as linhas mensais em vez de agregar por região antes de ranquear, e devolve o mês extremo no lugar da região extrema. Reforçar o COMMENT ON do grão nas três tabelas não corrigiu"
            ),
            titulo="A pressão coincide com o que a atenção primária poderia ter evitado?",
            prompt=(
                "nas cinco regioes de saude com maior indice de pressao "
                "hospitalar medio em 2026, qual foi o grupo ICSAP com mais "
                "internacoes de residentes em 2026? Traga uma linha por "
                "regiao, com o nome da regiao e o nome do grupo"
            ),
            rotulo="nm_regiao_saude",
            espera=(
                "junção entre mart_indicador_regiao_mensal e "
                "mart_icsap_regiao_mensal, com o grupo líder por região"
            ),
            sql_referencia="""
with pressao as (
    select cd_regiao_saude,
           nm_regiao_saude,
           avg(pc_iph_estimado) as pc_iph_medio
    from   mart_indicador_regiao_mensal
    where  nr_ano_competencia = 2026
    group  by cd_regiao_saude, nm_regiao_saude
    order  by pc_iph_medio desc
    fetch  first 5 rows only
),
lider as (
    select cd_regiao_saude,
           nm_grupo_icsap,
           sum(qt_internacao_icsap) as qt_internacao_icsap,
           row_number() over (
               partition by cd_regiao_saude
               order by sum(qt_internacao_icsap) desc
           ) as posicao
    from   mart_icsap_regiao_mensal
    where  nr_ano_competencia = 2026
    group  by cd_regiao_saude, nm_grupo_icsap
)
select p.nm_regiao_saude,
       round(p.pc_iph_medio, 1) as pc_iph_medio,
       l.nm_grupo_icsap,
       l.qt_internacao_icsap
from   pressao p
       join lider l on l.cd_regiao_saude = p.cd_regiao_saude
                   and l.posicao = 1
order  by p.pc_iph_medio desc
""",
        ),
        Pergunta(
            id="B2",
            limitacao_conhecida=(
                "mesma causa de B1: sem agregar por hospital antes de ordenar, o topo do ranking troca"
            ),
            titulo="Quais hospitais operaram acima da capacidade que eles mesmos declararam?",
            prompt=(
                "quais os dez hospitais que mais vezes operaram acima da "
                "capacidade de leitos SUS declarada em 2026? Traga o nome do "
                "hospital, a regiao de saude e em quantos meses isso ocorreu"
            ),
            rotulo="nm_hospital_atual",
            espera=(
                "uso da coluna de estado fl_acima_capacidade_declarada, que só "
                "o COMMENT ON explica"
            ),
            sql_referencia="""
select nm_hospital_atual,
       nm_regiao_saude,
       count(*)                       as qt_mes_acima_capacidade,
       round(avg(pc_iph_estimado), 1) as pc_iph_medio
from   mart_indicador_hospital_mensal
where  nr_ano_competencia = 2026
and    fl_acima_capacidade_declarada = 1
group  by nm_hospital_atual, nm_regiao_saude
order  by qt_mes_acima_capacidade desc, pc_iph_medio desc
fetch  first 10 rows only
""",
        ),
        Pergunta(
            id="B3",
            titulo="Onde a inflação come mais o valor aprovado por internação?",
            prompt=(
                "quais as dez regioes com maior diferenca media entre o custo "
                "medio por internacao corrigido pelo IPCA e o nominal, "
                "considerando 2024 a 2026"
            ),
            rotulo="nm_regiao_saude",
            espera="distinção entre vl_cmi e vl_cmi_real, e não recalcular IPCA",
            sql_referencia="""
select nm_regiao_saude,
       round(avg(vl_cmi), 2)              as vl_cmi_nominal_medio,
       round(avg(vl_cmi_real), 2)         as vl_cmi_real_medio,
       round(avg(vl_cmi_real - vl_cmi), 2) as vl_diferenca_media
from   mart_indicador_regiao_mensal
where  nr_ano_competencia between 2024 and 2026
group  by nm_regiao_saude
order  by vl_diferenca_media desc
fetch  first 10 rows only
""",
        ),
    ],
    BLOCO_C: [
        Pergunta(
            id="C1",
            limitacao_conhecida=(
                "o modelo escolhe a coluna certa, o IPH, e narra o número com o rótulo errado que veio na pergunta. O COMMENT ON governa a geração de SQL, não a redação da narrativa"
            ),
            titulo="A armadilha do IPH: ocupação real de leito",
            prompt=(
                "qual foi a taxa de ocupacao de leitos de cada regiao de saude "
                "em 2026"
            ),
            espera=(
                "o MedFlow não mede ocupação real. A resposta aceitável usa o "
                "IPH e diz que é pressão estimada sobre capacidade declarada; a "
                "inaceitável chama o número de ocupação real"
            ),
        ),
        Pergunta(
            id="C2",
            titulo="A armadilha do tempo real",
            prompt="quantos pacientes estao internados neste momento em Sao Paulo",
            espera=(
                "não existe agora nesta base. O dado é mensal por competência, "
                "e a resposta precisa dizer isso em vez de devolver a última "
                "competência como se fosse o presente"
            ),
        ),
        Pergunta(
            id="C3",
            titulo="A armadilha do recorte",
            prompt=(
                "qual a taxa de mortalidade hospitalar das regioes de saude do "
                "Rio de Janeiro em 2026"
            ),
            espera=(
                "o recorte é São Paulo. A resposta certa é não haver linhas, "
                "explicitamente, e não um número inventado ou o de SP rotulado "
                "como RJ"
            ),
        ),
    ],
    BLOCO_D: [
        Pergunta(
            id="D1",
            limitacao_conhecida=(
                "pelo DBMS_CLOUD_AI.GENERATE cada chamada se comporta como pergunta isolada, e o seguimento perde o indicador do turno anterior"
            ),
            titulo="Pergunta e seguimento no mesmo contexto",
            prompt=(
                "qual a regiao de saude com maior indice de pressao hospitalar "
                "medio em 2026"
            ),
            seguimento="e em 2025?",
            espera=(
                "o seguimento não repete indicador, recorte nem tabela. Só se "
                "resolve se o perfil mantiver a conversa"
            ),
        ),
    ],
    BLOCO_E: [
        Pergunta(
            id="E1",
            titulo="A mesma pergunta com e sem os dados na frente",
            prompt=(
                "qual a regiao de saude de Sao Paulo com maior pressao "
                "hospitalar em 2026"
            ),
            espera=(
                "chat responde do conhecimento geral do modelo, sem tocar a "
                "Gold; narrate responde da base. A distância entre os dois é o "
                "argumento de por que o Select AI está ancorado no modelo "
                "semântico e não solto"
            ),
        ),
    ],
}


def todas() -> list[tuple[str, Pergunta]]:
    return [(bloco, p) for bloco, ps in ROTEIRO.items() for p in ps]


def com_referencia() -> list[tuple[str, Pergunta]]:
    return [(b, p) for b, p in todas() if p.sql_referencia]

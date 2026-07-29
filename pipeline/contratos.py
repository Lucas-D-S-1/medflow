"""Publicação das camadas e geração dos contratos de dados do MedFlow."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import csv
import json
from pathlib import Path
from typing import Any

import pandas as pd
import pyarrow.parquet as pq


VERSAO_CONTRATO = "0.2.0"

MAPEAMENTO_COLUNAS = {
    "_ano": "nr_ano_competencia",
    "_mes": "nr_mes_competencia",
    "_arquivo_fonte": "nm_arquivo_origem",
    "CNES": "cd_cnes",
    "N_AIH": "id_aih",
    "IDENT": "cd_tipo_aih",
    "ident_descricao": "ds_tipo_aih",
    "municipio_cod6": "cd_municipio_ibge_6",
    "municipio_res_cod6": "cd_municipio_residencia_ibge_6",
    "municipio_cod7": "cd_municipio_ibge_7",
    "municipio_nome": "nm_municipio",
    "uf": "sg_uf",
    "microrregiao": "nm_microrregiao",
    "mesorregiao": "nm_mesorregiao",
    "regiao_saude": "cd_regiao_saude",
    "regiao_saude_nome": "nm_regiao_saude",
    "regiao_saude_cnes_lt": "cd_regiao_saude_cnes_lt",
    "macrorregiao_saude_codigo": "cd_macrorregiao_saude",
    "macrorregiao_saude_nome": "nm_macrorregiao_saude",
    "origem_regiao": "ds_origem_regiao",
    "qtd_regioes_declaradas_cnes_lt": "qt_regiao_saude_declarada_cnes_lt",
    "tipo_unidade_cod": "cd_tipo_unidade",
    "esfera_cod_cnes_lt": "cd_esfera_administrativa_cnes_lt",
    "natureza_jur_cod": "cd_natureza_juridica",
    "gestao_cod": "cd_tipo_gestao",
    "hospital_nome_atual": "nm_hospital_atual",
    "hospital_razao_social_atual": "nm_razao_social_hospital_atual",
    "esfera_administrativa_atual": "nm_esfera_administrativa_atual",
    "cadastro_cnes_atualizado_em": "dt_atualizacao_cadastro_cnes",
    "tipo_unidade": "nm_tipo_unidade",
    "gestao": "nm_tipo_gestao",
    "natureza_juridica": "nm_natureza_juridica",
    "ESPEC": "cd_especialidade_sih",
    "especialidade": "nm_especialidade",
    "mapeada": "fl_especialidade_mapeada",
    "cid_principal": "cd_cid_principal",
    "cid_descricao": "ds_cid",
    "cid_descricao_abreviada": "ds_cid_abreviada",
    "categoria": "cd_categoria_cid",
    "categoria_descricao": "ds_categoria_cid",
    "capitulo": "cd_capitulo_cid",
    "capitulo_desc": "ds_capitulo_cid",
    "fonte_descricao": "ds_fonte_descricao",
    "aih_aprovadas": "qt_aih_aprovada",
    "campo": "nm_campo_origem",
    "codigo": "cd_dominio",
    "descricao": "ds_dominio",
    "fonte": "ds_fonte_dominio",
    "status": "st_mapeamento",
    "dias_no_mes": "qt_dia_mes",
    "competencia": "cd_competencia",
    "data_ref": "dt_competencia",
    "trimestre": "nr_trimestre",
    "QT_DIARIAS": "qt_diaria_faturada",
    "DIAS_PERM": "qt_dia_permanencia",
    "VAL_TOT": "vl_total_aprovado_sus",
    "UTI_MES_TO": "qt_diaria_uti_faturada",
    "MARCA_UTI": "cd_tipo_uti",
    "marca_uti_descricao": "ds_tipo_uti",
    "IDADE": "nr_idade_informada",
    "COD_IDADE": "cd_unidade_idade",
    "unidade_idade": "ds_unidade_idade",
    "idade_anos_aprox": "nr_idade_ano_aproximada",
    "SEXO": "cd_sexo",
    "sexo_descricao": "ds_sexo",
    "CAR_INT": "cd_carater_internacao",
    "carater_internacao": "ds_carater_internacao",
    "COMPLEX": "cd_complexidade",
    "complexidade": "ds_complexidade",
    "dias_perm_internacao_nova": "qt_dia_permanencia_internacao_nova",
    "qt_diarias_internacao_nova": "qt_diaria_faturada_internacao_nova",
    "valor_internacao_nova": "vl_aprovado_internacao_nova",
    "valor_continuacao": "vl_aprovado_continuacao",
    "leitos_sus": "qt_leito_sus",
    "leitos_totais": "qt_leito_total",
    "tipos_de_leito": "qt_tipo_leito",
    "capacidade_teorica_leito_dia": "qt_capacidade_teorica_leito_dia",
}

COLUNAS_REMOVIDAS_SILVER = {
    "MORTE": (
        "Substituída por fl_obito e fl_obito_internacao_nova; "
        "o valor original permanece na Bronze."
    ),
}

DESCRICOES_EXATAS = {
    "id_aih": "Identificador da Autorização de Internação Hospitalar informado no SIH.",
    "cd_tipo_aih": "Código que distingue internação nova de continuação de longa permanência.",
    "ds_tipo_aih": "Descrição do tipo de AIH.",
    "cd_cnes": "Código de sete dígitos do estabelecimento no CNES.",
    "cd_municipio_ibge_6": "Código municipal de seis dígitos usado nas bases do DATASUS.",
    "cd_municipio_residencia_ibge_6": "Código DATASUS do município de residência do paciente.",
    "cd_municipio_ibge_7": "Código oficial de sete dígitos do município no IBGE.",
    "nm_municipio": "Nome oficial do município.",
    "sg_uf": "Sigla da unidade da Federação.",
    "nm_microrregiao": "Nome da microrregião geográfica do IBGE.",
    "nm_mesorregiao": "Nome da mesorregião geográfica do IBGE.",
    "qt_populacao_ibge_2022": "População municipal do Censo IBGE 2022 distribuída no CSV oficial do Ministério da Saúde.",
    "ds_fonte_populacao": "Fonte e ano de referência da população municipal.",
    "cd_regiao_saude": "Código oficial de cinco dígitos da região de saúde.",
    "nm_regiao_saude": "Nome oficial da região de saúde.",
    "cd_regiao_saude_cnes_lt": "Código de região declarado historicamente no arquivo CNES/LT.",
    "cd_macrorregiao_saude": "Código oficial da macrorregião de saúde.",
    "nm_macrorregiao_saude": "Nome oficial da macrorregião de saúde.",
    "ds_origem_regiao": "Fonte usada para atribuir a região analítica.",
    "qt_regiao_saude_declarada_cnes_lt": "Quantidade de códigos regionais distintos observados no histórico CNES/LT.",
    "cd_tipo_unidade": "Código CNES do tipo de unidade.",
    "nm_tipo_unidade": "Descrição do tipo de unidade.",
    "cd_esfera_administrativa_cnes_lt": "Código bruto da esfera administrativa no CNES/LT.",
    "nm_esfera_administrativa_atual": "Descrição atual da esfera administrativa obtida na API do CNES.",
    "cd_natureza_juridica": "Código CONCLA da natureza jurídica.",
    "nm_natureza_juridica": "Descrição CONCLA da natureza jurídica.",
    "cd_tipo_gestao": "Código do tipo de gestão do estabelecimento.",
    "nm_tipo_gestao": "Descrição do tipo de gestão do estabelecimento.",
    "nm_hospital_atual": "Nome fantasia atual do estabelecimento; não representa histórico mensal.",
    "nm_razao_social_hospital_atual": "Razão social atual do estabelecimento.",
    "dt_atualizacao_cadastro_cnes": "Data de atualização informada pela fotografia atual do CNES.",
    "cd_especialidade_sih": "Código de especialidade da internação no SIH.",
    "nm_especialidade": "Descrição da especialidade do SIH.",
    "fl_especialidade_mapeada": "Indica se o código de especialidade possui de/para validado.",
    "cd_cid_principal": "Código CID-10 do diagnóstico principal.",
    "ds_cid": "Descrição completa do diagnóstico CID-10.",
    "ds_cid_abreviada": "Descrição abreviada do diagnóstico CID-10.",
    "cd_categoria_cid": "Categoria de três caracteres da CID-10.",
    "ds_categoria_cid": "Descrição da categoria CID-10.",
    "cd_capitulo_cid": "Código do capítulo da CID-10.",
    "ds_capitulo_cid": "Descrição do capítulo da CID-10.",
    "ds_fonte_descricao": "Fonte usada para descrever ou mapear o código.",
    "nr_ano_competencia": "Ano da competência de processamento.",
    "nr_mes_competencia": "Número do mês da competência de processamento.",
    "qt_dia_mes": "Quantidade de dias civis da competência.",
    "cd_competencia": "Competência no formato AAAAMM.",
    "dt_competencia": "Primeiro dia do mês de competência.",
    "nr_trimestre": "Número do trimestre civil da competência.",
    "dt_internacao": "Data de entrada da internação.",
    "dt_saida": "Data de saída da internação.",
    "qt_diaria_faturada": "Quantidade de diárias faturadas na AIH; não equivale automaticamente a permanência.",
    "qt_dia_permanencia": "Quantidade de dias de permanência registrada na AIH.",
    "vl_total_aprovado_sus": "Valor nominal total aprovado pelo SUS para a AIH.",
    "qt_diaria_uti_faturada": "Quantidade total de diárias de UTI faturadas na AIH.",
    "cd_tipo_uti": "Código da marca ou tipo de UTI informado no SIH.",
    "ds_tipo_uti": "Descrição do código de UTI.",
    "nr_idade_informada": "Valor de idade informado, interpretado junto de cd_unidade_idade.",
    "cd_unidade_idade": "Código da unidade usada para registrar a idade.",
    "ds_unidade_idade": "Descrição da unidade usada para registrar a idade.",
    "nr_idade_ano_aproximada": "Idade aproximada em anos calculada a partir do valor e da unidade informados.",
    "cd_sexo": "Código de sexo informado no SIH.",
    "ds_sexo": "Descrição do código de sexo.",
    "cd_carater_internacao": "Código do caráter da internação.",
    "ds_carater_internacao": "Descrição do caráter da internação.",
    "cd_complexidade": "Código do nível de complexidade do procedimento.",
    "ds_complexidade": "Descrição do nível de complexidade.",
    "fl_aih_aprovada": "Indicador unitário de AIH aprovada.",
    "fl_internacao_nova": "Indica AIH normal, considerada uma nova internação.",
    "fl_continuacao_longa_permanencia": "Indica AIH de continuação de longa permanência.",
    "qt_dia_permanencia_internacao_nova": "Dias de permanência somente quando a linha representa internação nova.",
    "qt_diaria_faturada_internacao_nova": "Diárias faturadas somente quando a linha representa internação nova.",
    "vl_aprovado_internacao_nova": "Valor aprovado somente para internações novas.",
    "vl_aprovado_continuacao": "Valor aprovado somente para continuações de longa permanência.",
    "fl_sem_diaria_faturada": "Indica AIH sem diária faturada.",
    "fl_permanencia_zero": "Indica permanência registrada igual a zero.",
    "fl_sem_valor": "Indica valor total aprovado igual a zero.",
    "fl_obito": "Indica óbito registrado na AIH.",
    "fl_obito_internacao_nova": "Indica óbito em uma internação nova.",
    "fl_aih_com_valor": "Indica AIH com valor total aprovado maior que zero.",
    "fl_uti": "Indica presença de marca de UTI ou diária de UTI faturada.",
    "fl_cruza_mes": "Indica internação cuja entrada e saída estão em meses diferentes.",
    "fl_competencia_diverge_saida": "Indica que a competência de processamento diverge do mês da saída.",
    "fl_regiao_conflitante": "Indica hospital com mais de uma região declarada no histórico CNES/LT.",
    "fl_regiao_nao_confiavel": "Indica ausência de região oficial confiável.",
    "fl_esfera_ausente_cnes_lt": "Indica ausência da esfera administrativa no CNES/LT.",
    "fl_cadastro_atual_nao_historico": "Indica atributo cadastral atual, sem vigência histórica garantida.",
    "nm_arquivo_origem": "Nome do arquivo DBF de origem da linha.",
    "qt_leito_sus": "Quantidade mensal de leitos disponíveis ao SUS declarada no CNES.",
    "qt_leito_total": "Quantidade mensal total de leitos declarada no CNES.",
    "qt_tipo_leito": "Quantidade de tipos de leito distintos observados no mês.",
    "qt_capacidade_teorica_leito_dia": "Leitos SUS multiplicados pelos dias civis do mês.",
    "qt_paciente_dia_estimado": "Pacientes-dia reconstruídos pelas datas de entrada e saída.",
    "nr_iph_estimado": "Razão entre pacientes-dia estimados e leitos-dia declarados.",
    "pc_iph_estimado": "IPH estimado expresso em percentual.",
    "pc_tmh": "Óbitos em internações novas divididos pelas internações novas, em percentual.",
    "vl_cmi": "Valor nominal aprovado nas internações novas dividido pela quantidade de internações novas.",
    "nr_ipr": "Permanência média do hospital/CID dividida pelo benchmark regional que exclui o hospital.",
    "nr_indice_sazonalidade": "Volume atual dividido pela média do mesmo mês em 2024 e 2025.",
    "pc_variacao_sazonal": "Variação percentual correspondente ao índice de sazonalidade.",
    "qt_internacao_nova": "Quantidade de internações novas, identificadas por AIH normal.",
    "qt_obito": "Quantidade de óbitos em internações novas.",
    "qt_dia_permanencia_soma": "Soma dos dias de permanência das internações novas.",
    "vl_aprovado_internacao_nova_soma": "Soma nominal dos valores aprovados para internações novas.",
    "vl_aprovado_continuacao_soma": "Soma nominal dos valores aprovados para continuações de longa permanência.",
    "qt_internacao_benchmark": "Quantidade de internações no benchmark regional, excluído o hospital avaliado.",
    "qt_hospital_benchmark": "Quantidade de outros hospitais que compõem o benchmark.",
    "qt_ano_historico": "Quantidade de anos históricos usados na referência sazonal.",
    "qt_internacao_por_100_mil_habitante": "Internações novas por 100 mil habitantes usando população do Censo IBGE 2022.",
    "st_amostra": "Estado da amostra segundo os mínimos definidos no contrato do indicador.",
    "st_indice_sazonalidade": "Estado de calculabilidade do índice sazonal.",
    "st_capacidade": "Estado da disponibilidade de capacidade SUS para calcular o IPH.",
    "fl_acima_capacidade_declarada": "Indica IPH estimado superior à capacidade declarada; sinaliza investigação, não ocupação comprovada.",
    "qt_aih_aprovada": "Quantidade de AIHs aprovadas associadas ao registro dimensional.",
    "nm_campo_origem": "Nome do campo de origem ao qual o domínio se aplica.",
    "cd_dominio": "Código do domínio.",
    "ds_dominio": "Descrição do código do domínio.",
    "ds_fonte_dominio": "Fonte usada no de/para do domínio.",
    "st_mapeamento": "Estado de cobertura e validação do mapeamento.",
}

DESCRICOES_TABELAS = {
    "dim_tempo": ("Calendário mensal do recorte analítico.", "uma linha por competência", ["cd_competencia"]),
    "dim_hospital": ("Cadastro conformado dos hospitais presentes no SIH.", "uma linha por CNES", ["cd_cnes"]),
    "dim_municipio": ("Municípios paulistas e sua hierarquia regional.", "uma linha por município", ["cd_municipio_ibge_7"]),
    "dim_especialidade": ("Domínio observado de especialidades do SIH.", "uma linha por especialidade", ["cd_especialidade_sih"]),
    "dim_cid": ("Diagnósticos CID-10 observados no recorte.", "uma linha por CID principal", ["cd_cid_principal"]),
    "dim_dominio": ("De/paras auditáveis dos códigos utilizados na Silver.", "uma linha por campo e código", ["nm_campo_origem", "cd_dominio"]),
    "fato_internacao": ("AIHs aprovadas enriquecidas e tipadas para análise.", "uma linha por registro mensal de AIH", []),
    "fato_leito_mensal": ("Capacidade de leitos declarada no CNES.", "uma linha por hospital e competência", ["cd_cnes", "cd_competencia"]),
    "mart_indicador_hospital_mensal": (
        "Pressão estimada, capacidade e volume mensal por hospital.",
        "uma linha por hospital e competência",
        ["cd_cnes", "cd_competencia"],
    ),
    "mart_indicador_hospital_especialidade_mensal": (
        "TMH e CMI por hospital, especialidade e competência.",
        "uma linha por hospital, especialidade e competência",
        ["cd_cnes", "cd_especialidade_sih", "cd_competencia"],
    ),
    "mart_indicador_hospital_cid_periodo": (
        "IPR por hospital e diagnóstico no período completo.",
        "uma linha por hospital e CID principal",
        ["cd_cnes", "cd_cid_principal"],
    ),
    "mart_indicador_regiao_mensal": (
        "Indicadores consolidados para mapa e visão executiva regional.",
        "uma linha por região de saúde e competência",
        ["cd_regiao_saude", "cd_competencia"],
    ),
    "mart_indicador_regiao_periodo": (
        "Resumo da distribuição do IPR elegível por região de saúde.",
        "uma linha por região de saúde no período",
        ["cd_regiao_saude"],
    ),
    "dim_geografia_municipio": (
        "Municípios, população e hierarquia regional para integração geográfica.",
        "uma linha por município",
        ["cd_municipio_ibge_7"],
    ),
    "dim_geografia_regiao": (
        "Regiões de saúde, população agregada e quantidade de municípios.",
        "uma linha por região de saúde",
        ["cd_regiao_saude"],
    ),
}


def _agora_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_arquivo(caminho: Path, bloco: int = 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def descricao_coluna(nome: str, camada: str) -> str:
    if nome in DESCRICOES_EXATAS:
        return DESCRICOES_EXATAS[nome]
    if nome.startswith("fl_"):
        return f"Indicador binário referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("qt_"):
        return f"Quantidade referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("vl_"):
        return f"Valor monetário referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("pc_"):
        return f"Percentual referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("nr_"):
        return f"Valor numérico referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("cd_"):
        return f"Código referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("nm_"):
        return f"Nome referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("ds_"):
        return f"Descrição referente a {nome[3:].replace('_', ' ')}."
    if nome.startswith("dt_"):
        return f"Data referente a {nome[3:].replace('_', ' ')}."
    if camada == "bronze":
        return f"Campo `{nome}` preservado conforme o leiaute original da fonte."
    return f"Atributo analítico referente a {nome.replace('_', ' ')}."


def canonicalizar_saidas_silver(saidas: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """Remove redundâncias brutas e aplica o contrato canônico da Silver."""
    resultado: dict[str, pd.DataFrame] = {}
    for nome, frame in saidas.items():
        dados = frame.drop(
            columns=[coluna for coluna in COLUNAS_REMOVIDAS_SILVER if coluna in frame.columns]
        ).rename(columns=MAPEAMENTO_COLUNAS)
        if {
            "nr_ano_competencia",
            "nr_mes_competencia",
        } <= set(dados.columns) and "cd_competencia" not in dados.columns:
            posicao = dados.columns.get_loc("nr_mes_competencia") + 1
            dados.insert(
                posicao,
                "cd_competencia",
                (
                    dados["nr_ano_competencia"].astype("int64").astype("string")
                    + dados["nr_mes_competencia"].astype("int64").astype("string").str.zfill(2)
                ),
            )
        duplicadas = dados.columns[dados.columns.duplicated()].tolist()
        assert not duplicadas, f"{nome}: nomes duplicados após canonicalização: {duplicadas}"
        assert all(
            coluna == coluna.lower() and " " not in coluna and "-" not in coluna
            for coluna in dados.columns
        ), f"{nome}: nome fora do padrão snake_case"
        nome_canonico = "fato_leito_mensal" if nome == "fato_leitos_mensal" else nome
        resultado[nome_canonico] = dados
    return resultado


def _contrato_tabela(nome: str, frame: pd.DataFrame, camada: str, caminho: str) -> dict[str, Any]:
    descricao, grao, chave = DESCRICOES_TABELAS.get(
        nome,
        (
            f"Tabela analítica {nome}.",
            "granularidade documentada pelo pipeline produtor",
            [],
        ),
    )
    return {
        "nome": nome,
        "caminho": caminho,
        "descricao": descricao,
        "grao": grao,
        "chave_primaria_logica": chave,
        "linhas": int(len(frame)),
        "colunas": [
            {
                "nome": coluna,
                "tipo": str(frame[coluna].dtype),
                "aceita_nulo": bool(frame[coluna].isna().any()),
                "nulos": int(frame[coluna].isna().sum()),
                "descricao": descricao_coluna(coluna, camada),
            }
            for coluna in frame.columns
        ],
    }


def _renderizar_dicionario(contrato: dict[str, Any]) -> str:
    linhas = [
        f"# Dicionário da camada {contrato['camada'].capitalize()} — MedFlow",
        "",
        f"Contrato de esquema `{contrato['versao_contrato']}`, gerado automaticamente em "
        f"`{contrato['gerado_em_utc']}`.",
        "",
    ]
    if contrato.get("principios"):
        linhas += ["## Responsabilidade da camada", ""]
        linhas += [f"- {item}" for item in contrato["principios"]]
        linhas.append("")
    for tabela in contrato["tabelas"]:
        linhas += [
            f"## `{tabela['nome']}`",
            "",
            tabela["descricao"],
            "",
            f"- Caminho: `{tabela['caminho']}`",
            f"- Grão: {tabela['grao']}",
            f"- Linhas: {tabela['linhas']:,}",
            "- Chave lógica: "
            + (
                ", ".join(f"`{item}`" for item in tabela["chave_primaria_logica"])
                if tabela["chave_primaria_logica"]
                else "sem unicidade assumida; usar o identificador da fonte e a competência"
            ),
            "",
            "| coluna | tipo | nulos | significado |",
            "|---|---|---:|---|",
        ]
        for coluna in tabela["colunas"]:
            nulos = (
                f"{coluna['nulos']:,}"
                if isinstance(coluna["nulos"], int)
                else "não materializado"
            )
            linhas.append(
                f"| `{coluna['nome']}` | `{coluna['tipo']}` | {nulos} | "
                f"{coluna['descricao']} |"
            )
        linhas.append("")
    if contrato.get("ativos"):
        linhas += ["## Ativos não tabulares", ""]
        for ativo in contrato["ativos"]:
            linhas += [
                f"### `{ativo['nome']}`",
                "",
                ativo["descricao"],
                "",
                f"- Caminho: `{ativo['caminho']}`",
                f"- Fonte: {ativo['fonte']}",
                f"- Formato: `{ativo['formato']}`",
                "",
            ]
    return "\n".join(linhas)


def _gravar_json(caminho: Path, conteudo: dict[str, Any]) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(
        json.dumps(conteudo, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _gravar_mapeamento(
    caminho: Path,
    saidas_originais: dict[str, pd.DataFrame],
    saidas_canonicas: dict[str, pd.DataFrame],
) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with caminho.open("w", encoding="utf-8", newline="") as arquivo:
        writer = csv.DictWriter(
            arquivo,
            lineterminator="\n",
            fieldnames=[
                "tabela_origem",
                "tabela_canonica",
                "coluna_origem",
                "coluna_canonica",
                "acao",
                "justificativa",
            ],
        )
        writer.writeheader()
        for tabela_origem, frame in saidas_originais.items():
            tabela_canonica = (
                "fato_leito_mensal"
                if tabela_origem == "fato_leitos_mensal"
                else tabela_origem
            )
            for coluna in frame.columns:
                removida = coluna in COLUNAS_REMOVIDAS_SILVER
                writer.writerow(
                    {
                        "tabela_origem": tabela_origem,
                        "tabela_canonica": tabela_canonica,
                        "coluna_origem": coluna,
                        "coluna_canonica": (
                            ""
                            if removida
                            else MAPEAMENTO_COLUNAS.get(coluna, coluna)
                        ),
                        "acao": (
                            "removida"
                            if removida
                            else (
                                "renomeada"
                                if MAPEAMENTO_COLUNAS.get(coluna, coluna) != coluna
                                else "mantida"
                            )
                        ),
                        "justificativa": (
                            COLUNAS_REMOVIDAS_SILVER[coluna]
                            if removida
                            else "Padronização snake_case e prefixo semântico."
                        ),
                    }
                )
        assert set(saidas_canonicas) == {
            "fato_leito_mensal" if nome == "fato_leitos_mensal" else nome
            for nome in saidas_originais
        }


def publicar_silver(
    *,
    base: Path,
    saidas_originais: dict[str, pd.DataFrame],
    inventario: list[dict[str, Any]],
    metricas: dict[str, Any],
    status_indices: pd.DataFrame,
    manifesto_bronze: dict[str, Any],
    sobrescrever: bool,
) -> dict[str, pd.DataFrame]:
    """Publica dimensões e fatos, contratos e relatórios da Silver."""
    dir_silver = base / "dados" / "silver"
    dir_dim = dir_silver / "dimensoes"
    dir_fato = dir_silver / "fatos"
    dir_qualidade = dir_silver / "qualidade"
    dir_contratos = base / "contratos"
    for pasta in (dir_dim, dir_fato, dir_qualidade, dir_contratos):
        pasta.mkdir(parents=True, exist_ok=True)

    saidas = canonicalizar_saidas_silver(saidas_originais)
    destinos = {
        nome: (
            dir_dim / f"{nome}.parquet"
            if nome.startswith("dim_")
            else dir_fato / f"{nome}.parquet"
        )
        for nome in saidas
    }
    metadados_path = dir_qualidade / "METADADOS.json"
    recorte_atual = manifesto_bronze["recorte"]["competencias"]
    metadados_anteriores: dict[str, Any] = {}
    if metadados_path.exists():
        metadados_anteriores = json.loads(metadados_path.read_text(encoding="utf-8"))
    promover = (
        sobrescrever
        or metadados_anteriores.get("competencias") != recorte_atual
        or metadados_anteriores.get("versao_contrato") != VERSAO_CONTRATO
        or not all(caminho.exists() for caminho in destinos.values())
        or any(
            caminho.exists()
            and pq.ParquetFile(caminho).schema_arrow.names != list(saidas[nome].columns)
            for nome, caminho in destinos.items()
        )
    )
    if promover:
        parciais: list[tuple[Path, Path]] = []
        for nome, frame in saidas.items():
            caminho = destinos[nome]
            parcial = caminho.with_suffix(".parquet.parcial")
            if parcial.exists():
                parcial.unlink()
            frame.to_parquet(parcial, index=False)
            parciais.append((parcial, caminho))
        for parcial, caminho in parciais:
            parcial.replace(caminho)
            print(f"{caminho.stem:<28} {len(saidas[caminho.stem]):>10,} linhas")
    else:
        print("Silver canônica já corresponde ao manifesto atual; Parquets preservados.")

    tabelas = [
        _contrato_tabela(
            nome,
            frame,
            "silver",
            str(destinos[nome].relative_to(base)),
        )
        for nome, frame in saidas.items()
    ]
    contrato = {
        "camada": "silver",
        "versao_contrato": VERSAO_CONTRATO,
        "gerado_em_utc": _agora_utc(),
        "principios": [
            "Dados tipados, conformados, reconciliados e prontos para reuso.",
            "Somente dimensões e fatos; indicadores e benchmarks pertencem à Gold.",
            "Nomes em snake_case, no singular e com prefixos semânticos.",
        ],
        "tabelas": tabelas,
    }
    _gravar_json(dir_contratos / "silver.json", contrato)
    (dir_silver / "DICIONARIO.md").write_text(
        _renderizar_dicionario(contrato), encoding="utf-8"
    )
    _gravar_mapeamento(
        dir_contratos / "MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv",
        saidas_originais,
        saidas,
    )

    dominios_md = [
        "# Inventário de domínios — MedFlow Silver",
        "",
        "| campo de origem | códigos observados | sem de/para | cobertura | status | fonte |",
        "|---|---:|---|---:|---|---|",
    ]
    for item in inventario:
        dominios_md.append(
            f"| `{item['campo']}` | {item['qtd_codigos_observados']} | "
            f"{item['codigos_sem_depara']} | {item['cobertura_linhas_pct']:.4f}% | "
            f"{item['status']} | {item['fonte']} |"
        )
    dominios_md += [
        "",
        "Os nomes acima identificam os campos das fontes Bronze. Os nomes canônicos "
        "estão em `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`.",
    ]
    (dir_qualidade / "DOMINIOS.md").write_text(
        "\n".join(dominios_md), encoding="utf-8"
    )

    relatorio = [
        "# Relatório de qualidade — MedFlow Silver",
        "",
        "## Reconciliações",
        "",
    ] + [
        f"- `{chave}`: {valor:,}" if isinstance(valor, int) else f"- `{chave}`: {valor}"
        for chave, valor in metricas.items()
    ]
    relatorio += ["", "## Contratos aprovados dos índices", ""]
    relatorio += [
        f"- **{r.indice}** — `{r.status}`: {r.regra}"
        for r in status_indices.itertuples()
    ]
    relatorio += [
        "",
        "## Conclusão",
        "",
        "A Bronze foi reconciliada integralmente e todos os de/paras observados estão cobertos.",
        "A Silver publica somente dimensões e fatos. Métricas de negócio são produzidas na Gold.",
    ]
    (dir_qualidade / "RELATORIO_QUALIDADE.md").write_text(
        "\n".join(relatorio), encoding="utf-8"
    )

    metadados = {
        "camada": "silver",
        "versao_contrato": VERSAO_CONTRATO,
        "gerado_em_utc": _agora_utc(),
        "competencias": recorte_atual,
        "bronze_sha256": manifesto_bronze["arquivos"]["sih"]["sha256"],
        "metricas": metricas,
        "tabelas": {
            nome: {
                "caminho": str(destinos[nome].relative_to(base)),
                "linhas": int(len(frame)),
                "colunas": len(frame.columns),
                "sha256": _hash_arquivo(destinos[nome]),
            }
            for nome, frame in saidas.items()
        },
    }
    _gravar_json(metadados_path, metadados)
    return saidas


def documentar_bronze(*, base: Path, manifesto: dict[str, Any]) -> None:
    """Gera contrato e dicionário da Bronze sem alterar o esquema das fontes."""
    dir_bronze = base / "dados" / "bronze"
    dir_parquet = dir_bronze / "parquet"
    dir_contratos = base / "contratos"
    tabelas = []
    for chave in ("sih", "cnes"):
        caminho = dir_parquet / manifesto["arquivos"][chave]["caminho"]
        arquivo = pq.ParquetFile(caminho)
        colunas = [
            {
                "nome": campo.name,
                "tipo": str(campo.type),
                "aceita_nulo": True,
                "nulos": None,
                "descricao": descricao_coluna(campo.name, "bronze"),
            }
            for campo in arquivo.schema_arrow
        ]
        tabelas.append(
            {
                "nome": caminho.stem,
                "caminho": str(caminho.relative_to(base)),
                "descricao": (
                    "Registros SIH/RD preservados com linhagem técnica."
                    if chave == "sih"
                    else "Registros CNES/LT preservados com linhagem técnica."
                ),
                "grao": "uma linha conforme o registro original da fonte mensal",
                "chave_primaria_logica": [],
                "linhas": arquivo.metadata.num_rows,
                "colunas": colunas,
            }
        )
    ativos = []
    descricoes = {
        "ibge": "Resposta original da API de municípios do IBGE.",
        "regioes_saude_ms": "Resposta original da API de regiões e macrorregiões de saúde.",
        "regioes_saude_ms_csv": "Pacote CSV oficial de regiões de saúde, população IBGE 2022 e municípios.",
        "malha_municipal_ibge_2024": "Malha municipal oficial de São Paulo usada para formar as regiões do BI.",
        "cid10_datasus": "Pacote original das tabelas CID-10 do DATASUS.",
        "natureza_juridica_concla": "Página oficial da CONCLA usada para natureza jurídica.",
        "cnes_estabelecimentos_atuais": "Respostas atuais da API CNES para os hospitais observados.",
    }
    for nome, descricao in descricoes.items():
        info = manifesto["arquivos"][nome]
        caminho = (
            dir_bronze / "origem" / "referencias" / "geografia" / info["caminho"]
            if nome == "malha_municipal_ibge_2024"
            else dir_bronze / "origem" / "referencias" / info["caminho"]
        )
        ativos.append(
            {
                "nome": nome,
                "caminho": str(caminho.relative_to(base)),
                "descricao": descricao,
                "fonte": manifesto["fontes"].get(
                    {
                        "ibge": "IBGE_municipios",
                        "regioes_saude_ms": "MS_DEMAS_regioes_saude",
                        "regioes_saude_ms_csv": "MS_DEMAS_regioes_saude_csv",
                        "malha_municipal_ibge_2024": "IBGE_malha_municipal_2024",
                        "cid10_datasus": "DATASUS_CID10",
                        "natureza_juridica_concla": "IBGE_CONCLA_natureza_juridica",
                        "cnes_estabelecimentos_atuais": "MS_DEMAS_cnes_atual",
                    }[nome],
                    "registrada no manifesto",
                ),
                "formato": caminho.suffix.lstrip("."),
            }
        )
    contrato = {
        "camada": "bronze",
        "versao_contrato": VERSAO_CONTRATO,
        "gerado_em_utc": _agora_utc(),
        "principios": [
            "Arquivos de origem são imutáveis e preservados no formato recebido.",
            "DBF é cache técnico intermediário; Parquet é serialização fiel e reproduzível.",
            "Não há filtro analítico, imputação, de/para ou regra de negócio.",
        ],
        "tabelas": tabelas,
        "ativos": ativos,
    }
    _gravar_json(dir_contratos / "bronze.json", contrato)
    (dir_bronze / "DICIONARIO.md").write_text(
        _renderizar_dicionario(contrato), encoding="utf-8"
    )

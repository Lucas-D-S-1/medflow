"""Exporta os nove snapshots da Gold, sem Oracle, HTTP ou credenciais.

O mapa JSON/Gold, as escalas e a ordenação vêm do mesmo leitor de SQL usado
pela reconciliação. Os envelopes existentes fornecem somente o texto estático
(definições, limites e rótulos); todos os valores analíticos são regenerados.

Use --dados rollback para uma raiz que contenha data/gold e data/silver.
--comparar DIR lista diferenças sem substituir os snapshots de referência.
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

import pandas as pd
import yaml
from jsonschema import Draft202012Validator

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "tests"))
from reconciliacao.fontes import (  # noqa: E402
    arredondar_como_oracle,
    contratos_dos_handlers,
    escalas_da_gold,
)
from reconciliacao.plano import (  # noqa: E402
    ENDPOINTS,
    carregar_com_dimensoes,
    ordenar_como_o_handler,
)

PLANO = [
    ('regioes-resumo.json', 'regioes/resumo', 62),
    ('regiao-serie-35073.json', 'regioes/:id/serie', 100),
    ('hospitais-35073.json', 'hospitais', 200),
    ('hospital-serie-3012212.json', 'hospitais/:cnes/serie', 200),
    ('hospital-especialidades-3012212.json', 'hospitais/:cnes/especialidades', 200),
    ('hospital-diagnosticos-especialidade-3012212-07.json',
     'hospitais/:cnes/especialidades/:especialidade/diagnosticos', 2000),
    ('hospital-cids-3012212.json', 'hospitais/:cnes/cids', 200),
]


def ler(path):
    return json.loads(path.read_text(encoding='utf-8'))


def valor(v, casas=None):
    if v is None or pd.isna(v):
        return None
    if casas is not None:
        return arredondar_como_oracle(v, casas)
    return v.item() if hasattr(v, 'item') else v


def iso(v):
    v = str(v)
    return f'{v[:4]}-{v[4:]}'


def cobertura(marts):
    r, h, e, c, p, f, i = [marts[n] for n in (
        'regiao_mensal', 'hospital_mensal', 'hospital_especialidade_mensal',
        'hospital_cid_periodo', 'regiao_periodo', 'fluxo_assistencial_regiao_mensal',
        'icsap_regiao_mensal')]
    return dict(
        region_month_rows=len(r), hospital_months_without_declared_sus_bed=int(h.st_capacidade.eq('sem_leito_sus_declarado').sum()),
        regions=r.cd_regiao_saude.nunique(), ipr_insufficient_sample_rows=int(c.st_amostra.eq('amostra_insuficiente').sum()),
        region_period_rows=len(p), benchmark_zero_rows=int(c.st_amostra.eq('benchmark_zero').sum()),
        hospital_months_above_declared_capacity=int(h.fl_acima_capacidade_declarada.sum()),
        hospitals=h.cd_cnes.nunique(), stay_days=int(r.qt_dia_permanencia_soma.sum()), flow_rows=len(f),
        competencies=r.cd_competencia.nunique(), eligible_ipe_rows=int(e.st_amostra_ipe.eq('suficiente').sum()),
        ipe_benchmark_zero_rows=int(e.st_amostra_ipe.eq('benchmark_zero').sum()), hospital_cid_rows=len(c),
        icsap_rows=len(i), hospital_month_rows=len(h), new_admissions=int(r.qt_internacao_nova.sum()),
        specialty_month_rows=len(e), estimated_patient_days=int(r.qt_paciente_dia_estimado.sum()),
        ipe_insufficient_sample_rows=int(e.st_amostra_ipe.eq('amostra_insuficiente').sum()),
        eligible_ipr_pairs=int(p.qt_combinacao_ipr_elegivel.sum()),
    )


def gerar(dados: Path, templates: Path):
    meta = ler(dados / 'data/gold/qualidade/METADADOS.json')
    marts = {}
    for path in (dados / 'data/gold/marts').glob('*.parquet'):
        if 'especialidade_cid_mensal' in path.name:
            continue
        nome = path.stem.removeprefix('mart_indicador_')
        if nome.startswith('mart_'):
            nome = nome.removeprefix('mart_')
        marts[nome] = pd.read_parquet(path)
    r = marts['regiao_mensal']
    ultima = str(r.cd_competencia.max())
    ano, mes = int(ultima[:4]), int(ultima[4:])
    carimbo = meta['gerado_em_utc']
    saidas = {}
    for name in ['status.json', 'metodologia.json']:
        env = copy.deepcopy(ler(templates / name))
        env.update(source='snapshot', database_time=carimbo, data_through=iso(ultima))
        if name == 'metodologia.json':
            env.update(gold_updated_at=carimbo,
                       cmi_reference_competence=iso(r.cd_competencia_preco_referencia.max()),
                       coverage=cobertura(marts))
            for definition in env['definitions']:
                col = definition['gold_field']
                if col in r.columns and 'published_value' in definition:
                    definition['published_value'] = int(r[col].sum())
            counts = {'benchmark_zero': 'benchmark_zero_rows',
                      'iph_denominator_zero': 'hospital_months_without_declared_sus_bed',
                      'amostra_insuficiente': 'ipr_insufficient_sample_rows'}
            for state in env['states']:
                state['count'] = env['coverage'][counts[state['id']]]
            h = marts['hospital_mensal']
            for rec, col in zip(env['reconciliations'], [
                'qt_internacao_nova', 'qt_paciente_dia_estimado', 'qt_dia_permanencia_soma'], strict=True):
                left, right = int(r[col].sum()), int(h[col].sum())
                rec.update(left_value=left, right_value=right, difference=left-right,
                           status='ok' if left == right else 'divergent')
                if left != right:
                    raise ValueError(f'Reconciliação falhou: {rec}')
        saidas[name] = env
    contratos, escalas = contratos_dos_handlers(RAIZ), escalas_da_gold(RAIZ)
    for arquivo, padrao, limite in PLANO:
        endpoint = next(e for e in ENDPOINTS if e.padrao == padrao)
        contrato = contratos[padrao]
        if ':especialidade' in padrao:
            frame = pd.read_parquet(
                dados / 'data/gold/marts' / f'{endpoint.mart}.parquet',
                filters=[('cd_cnes', '=', '3012212'), ('cd_competencia', '=', ultima),
                         ('cd_especialidade_sih', '=', '07')],
            )
        else:
            frame = carregar_com_dimensoes(dados, endpoint)
        env = copy.deepcopy(ler(templates / arquivo))
        env.update(source='snapshot', database_time=carimbo)
        if 'data_through' in env:
            env['data_through'] = iso(ultima)
        if 'year' in env.get('filters', {}):
            env['filters'].update(year=ano, month=mes)
            frame = frame[frame.cd_competencia.eq(ultima)]
        if padrao in ['regioes/:id/serie', 'hospitais']:
            frame = frame[frame.cd_regiao_saude.eq('35073')]
        if ':cnes' in padrao:
            frame = frame[frame.cd_cnes.eq('3012212')]
        if ':especialidade' in padrao:
            frame = frame[frame.cd_especialidade_sih.eq('07')]
            env['database_time'] = ler(dados / 'data/gold/qualidade/METADADOS_DIAGNOSTICO_ESPECIALIDADE_MENSAL.json')['gerado_em_utc']
        if padrao.endswith('/cids'):
            frame = frame[frame.st_amostra.eq('suficiente') & frame.nr_ipr.notna()]
        frame = frame.copy()
        for col, casas in escalas[endpoint.mart].items():
            if col in frame:
                frame[col] = frame[col].map(lambda v, casas=casas: valor(v, casas))
        total = len(frame)
        ordenado = ordenar_como_o_handler(frame, contrato.ordem, set(frame.columns)).head(limite)
        faltantes = set(contrato.campos.values()) - set(frame.columns)
        if faltantes:
            raise ValueError(f'{padrao}: colunas ausentes: {faltantes}')
        env['items'] = [
            {**{campo: valor(linha[coluna]) for campo, coluna in contrato.campos.items()},
             **{campo: calcular(linha) for campo, calcular in endpoint.derivados.items()}}
            for _, linha in ordenado.iterrows()
        ]
        env['pagination'].update(limit=limite, offset=0, count=total, has_more=total > limite)
        if 'hospital' in env:
            ctx = env['hospital']
            if padrao.endswith('/especialidades'):
                ctx['new_admissions_total'] = int(frame.qt_internacao_nova.sum())
            if ':especialidade' in padrao:
                ctx['specialty_new_admissions_total'] = int(frame.qt_internacao_nova.sum())
                ctx['specialty_stay_days_total'] = int(frame.qt_dia_permanencia_soma.sum())
            if padrao.endswith('/cids'):
                regiao = marts['regiao_periodo'].query("cd_regiao_saude == '35073'").iloc[0]
                ctx.update(
                    region_ipr_median=valor(regiao.nr_ipr_mediana, 6),
                    region_eligible_combinations=int(regiao.qt_combinacao_ipr_elegivel),
                    region_percent_above_reference=valor(regiao.pc_combinacao_ipr_acima_referencia, 6),
                    hospital_eligible_combinations=total,
                )
        saidas[arquivo] = env
    return saidas


def validar(saidas):
    contrato = yaml.safe_load((RAIZ / 'contracts/openapi.yaml').read_text())
    # O OpenAPI descreve o servidor vivo; o contrato de contingência muda
    # somente a origem. Mantemos todos os demais campos e restrições.
    contrato['components']['schemas']['Source']['enum'] = ['snapshot']
    caminhos = {
        'status.json': '/status', 'metodologia.json': '/metodologia',
        **{arquivo: '/' + padrao.replace(':id', '{id}').replace(':cnes', '{cnes}').replace(':especialidade', '{especialidade}')
           for arquivo, padrao, _ in PLANO},
    }
    for arquivo, env in saidas.items():
        schema = contrato['paths'][caminhos[arquivo]]['get']['responses']['200']['content']['application/json']['schema']
        Draft202012Validator({'components': contrato['components'], **schema}).validate(env)


def diferencas(a, b, prefixo=''):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(a.keys() | b.keys()):
            yield from diferencas(a.get(k), b.get(k), f'{prefixo}/{k}')
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            yield dict(campo=prefixo + '/length', anterior=len(a), gerado=len(b))
        for i, (x, y) in enumerate(zip(a, b, strict=False)):
            yield from diferencas(x, y, f'{prefixo}/{i}')
    elif a != b:
        yield dict(campo=prefixo, anterior=a, gerado=b)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dados', type=Path, default=RAIZ)
    parser.add_argument('--destino', type=Path, default=RAIZ / 'web/src/mocks')
    parser.add_argument('--templates', type=Path, default=RAIZ / 'web/src/mocks')
    parser.add_argument('--comparar', type=Path)
    parser.add_argument('--relatorio', type=Path)
    args = parser.parse_args()
    saidas = gerar(args.dados, args.templates)
    validar(saidas)
    diffs = {}
    if args.comparar:
        diffs = {nome: list(diferencas(ler(args.comparar / nome), env)) for nome, env in saidas.items()}
        print(json.dumps({nome: len(d) for nome, d in diffs.items()}, indent=2))
    args.destino.mkdir(parents=True, exist_ok=True)
    for nome, env in saidas.items():
        (args.destino / nome).write_text(json.dumps(env, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    if args.relatorio:
        args.relatorio.write_text(json.dumps(diffs, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(saidas)} snapshots locais gerados em {args.destino}')


if __name__ == '__main__':
    main()

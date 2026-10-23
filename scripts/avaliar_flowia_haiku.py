"""Conversa Haiku → Select AI. Somente leitura; chave transitória, sem armazenamento.

--cases recebe lista JSON com question, context e sql_reference (opcional).
O baseline recebe pergunta, mesmo contexto e seu próprio histórico curto.
Usage mede Anthropic; a reserva OCI é estimada, não conferência de fatura.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import oracledb
from dotenv import dotenv_values
from flowia_haiku_db import ROOT, connect

sys.path.insert(0, str(ROOT / "src"))
from medflow.select_ai.executar import consultar, gerar, guardar  # noqa: E402
from medflow.select_ai.reescrever import (  # noqa: E402
    build_request,
    preflight,
    render_rows,
    resolve_entities,
    validate,
)


def rewrite_transient(cursor, key, request):
    """Nunca imprimir exceções de transporte: podem conter cabeçalhos."""
    output = cursor.var(oracledb.DB_TYPE_CLOB)
    status = cursor.var(int)
    cursor.execute("""declare r dbms_cloud_types.resp; begin
      r:=dbms_cloud.send_request(credential_name=>'FLOWIA_HAIKU_ANTHROPIC',
        uri=>'https://api.anthropic.com/v1/messages',method=>'POST',headers=>:headers,
        body=>:body,cache=>false);
      :status:=dbms_cloud.get_response_status_code(r);
      :response:=dbms_cloud.get_response_text(r); end;""",
        headers=json.dumps({"x-api-key": key, "anthropic-version": "2023-06-01",
                            "content-type": "application/json"}),
        body=json.dumps(request, ensure_ascii=False).encode(), status=status, response=output)
    response = json.loads(output.getvalue().read())
    usage = response.get("usage", {})
    if status.getvalue() != 200:
        return {"error": "provider_http", "http_status": status.getvalue(), "usage": usage}
    raw = "".join(b.get("text", "") for b in response["content"] if b["type"] == "text")
    return {"usage": usage, "stop_reason": response.get("stop_reason"), "raw": raw}


def evaluate(env_file, key_env, cases, output):
    key = dotenv_values(key_env).get("ANTHROPIC_API_KEY")
    if not key:
        raise ValueError("Chave ausente")
    rows, histories, committed, measured = [], {"haiku": [], "direct": []}, 0.0, 0.0
    with connect(env_file) as connection, connection.cursor() as cursor:
        connection.call_timeout = 60000
        cursor.execute("set transaction read only")
        cursor.execute("select cd_regiao_saude,nm_regiao_saude from vw_api_regioes_resumo where cd_competencia='202606'")
        regions = [dict(zip([d[0].lower() for d in cursor.description], r, strict=True)) for r in cursor.fetchall()]
        hospitals_columns = ["cd_cnes", "nm_hospital_atual"]
        cursor.execute("select cd_cnes,nm_hospital_atual from vw_api_hospitais where cd_competencia='202606'")
        hospitals = [dict(zip(hospitals_columns, row, strict=True)) for row in cursor.fetchall()]
        cursor.execute("select cd_cnes,cd_especialidade_sih,nm_especialidade from vw_api_hospital_especialidades where cd_competencia='202606'")
        specialties = [dict(zip([d[0].lower() for d in cursor.description], row, strict=True)) for row in cursor.fetchall()]
        for case in cases:
            # Reserva máxima da rodada: Haiku + duas gerações OCI, sem retries.
            if committed + 0.018 > 0.30:
                raise ValueError("Teto conservador atingido")
            committed += 0.018
            started = time.monotonic()
            question, context = case["question"], case.get("context", {})
            row = {"question": question, "context": context}
            rewrite = preflight(question)
            if rewrite is None:
                response = rewrite_transient(cursor, key, build_request(question,
                    resolve_entities(question, context, histories["haiku"], regions=regions, hospitals=hospitals, specialties=specialties), histories["haiku"]))
                row["provider"] = response
                usage = response.get("usage", {})
                measured += (usage.get("input_tokens", 0) * .10 + usage.get("output_tokens", 0) * .50) / 1e6
                if response.get("stop_reason") != "end_turn":
                    raise ValueError("Resposta incompleta; nenhuma repetição paga")
                rewrite = validate(json.loads(response["raw"]))
            row["rewrite"] = rewrite
            if case.get("sql_reference"):
                columns, values = consultar(cursor, guardar(case["sql_reference"]))
                row["reference"] = {"sql": case["sql_reference"], "columns": columns, "rows": values}
            for arm in ("haiku", "direct"):
                if rewrite["status"] == "refused":
                    result = {"answer": rewrite["rewritten_question"]}
                elif arm == "haiku" and rewrite["status"] == "clarify":
                    result = {"answer": rewrite["rewritten_question"]}
                else:
                    prompt = rewrite["rewritten_question"] if arm == "haiku" else json.dumps(
                        {"question": question, "context": context, "history": histories[arm][-3:]}, ensure_ascii=False)
                    result = {}
                    try:
                        result["sql_raw"] = gerar(cursor, prompt, "showsql")
                        result["sql"] = guardar(result["sql_raw"])
                        columns, values = consultar(cursor, result["sql"])
                        result.update(columns=columns, rows=values)
                        result["answer"] = render_rows([dict(zip(columns, row, strict=True)) for row in values])
                    except Exception as exc:
                        result.update(error=type(exc).__name__, answer="Sem resposta verificável")
                row[arm] = result
                histories[arm].append({"question": question, "answer": result["answer"][:1800]})
            row["elapsed_ms"] = round((time.monotonic() - started) * 1000)
            rows.append(row)
            output.write_text(json.dumps({"records": rows, "haiku_usage_usd": measured,
                "conservative_reserved_usd": committed}, ensure_ascii=False, indent=2, default=str) + "\n")
            print(json.dumps({"step": len(rows), "haiku_usd": measured}), flush=True)
        connection.rollback()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--key-env", type=Path, required=True)
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        evaluate(args.env_file, args.key_env, json.loads(args.cases.read_text()), args.output)
    except Exception as exc:
        print(json.dumps({"error": type(exc).__name__}))
        sys.exit(1)

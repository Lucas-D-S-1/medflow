"""Piloto aditivo FlowIA. Segredos só em memória e binds; nunca em diagnósticos."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import oracledb
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


def connect(env_file: Path):
    load_dotenv(env_file)
    wallet = Path(os.environ["ORACLE_WALLET_DIR"]).expanduser()
    if not wallet.is_absolute():
        wallet = env_file.resolve().parent / wallet
    return oracledb.connect(
        user=os.environ["ORACLE_USER"],
        password=os.environ["ORACLE_PASSWORD"],
        dsn=os.environ["ORACLE_DSN"],
        config_dir=str(wallet),
        wallet_location=str(wallet),
        wallet_password=os.environ["ORACLE_WALLET_PASSWORD"],
    )


def run_sql(connection, path):
    sys.path.insert(0, str(ROOT / "src/medflow/oracle"))
    from executar_sql import instrucoes

    with connection.cursor() as cursor:
        for index, sql in enumerate(instrucoes(path)):
            cursor.execute(sql)
            print(json.dumps({"statement": index + 1, "ok": True}))
    connection.commit()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument(
        "action", choices=["inspect", "probe", "credential", "apply", "rollback", "classify", "ask"]
    )
    parser.add_argument("--question", default="Quais regiões têm maior IPH nesta competência?")
    args = parser.parse_args()
    start = time.monotonic()
    try:
        with connect(args.env_file) as connection:
            with connection.cursor() as cursor:
                if args.action == "inspect":
                    for label, query in [
                        (
                            "existing",
                            "select object_name,object_type from user_objects where object_name like 'FLOWIA_HAIKU_%'",
                        ),
                        ("modules", "select name,uri_prefix from user_ords_modules"),
                        (
                            "transport",
                            "select argument_name,data_type from all_arguments where package_name like 'DBMS_CLOUD$PDBCS%' and object_name='SEND_REQUEST' and owner='C##CLOUD$SERVICE' order by package_name,overload,position",
                        ),
                        (
                            "errors",
                            "select name,line,text from user_errors where name like 'FLOWIA_HAIKU_%' order by name,sequence",
                        ),
                    ]:
                        cursor.execute(query)
                        print(json.dumps({label: cursor.fetchall()}, ensure_ascii=False))
                elif args.action == "probe":
                    code = cursor.var(int)
                    cursor.execute(
                        """declare r dbms_cloud_types.resp; begin
                      r := dbms_cloud.send_request(credential_name=>'FLOWIA_HAIKU_ANTHROPIC',
                        uri=>'https://api.anthropic.com/v1/messages',method=>'POST',
                        headers=>'{"x-api-key":"flowia-network-probe-invalid","anthropic-version":"2023-06-01","content-type":"application/json"}',
                        body=>to_blob(utl_raw.cast_to_raw('{"model":"claude-haiku-5-5","max_tokens":1,"messages":[{"role":"user","content":"ping"}]}')), cache=>false);
                      :status := dbms_cloud.get_response_status_code(r); end;""",
                        status=code,
                    )
                    print(
                        json.dumps(
                            {"http_status": code.getvalue(), "seconds": time.monotonic() - start}
                        )
                    )
                elif args.action == "credential":
                    key = os.environ.get("ANTHROPIC_API_KEY")
                    if not key:
                        raise ValueError("ANTHROPIC_API_KEY ausente do ambiente do processo")
                    sql = (
                        (ROOT / "db/flowia_haiku/000_credential.sql").read_text().rsplit("/", 1)[0]
                    )
                    cursor.execute(sql, api_key=key)
                    print('{"credential_created":true}')
                elif args.action in ("apply", "rollback"):
                    run_sql(
                        connection,
                        ROOT
                        / "db/flowia_haiku"
                        / ("001_create.sql" if args.action == "apply" else "099_rollback.sql"),
                    )
                else:
                    out = cursor.var(oracledb.DB_TYPE_CLOB)
                    context = json.dumps(
                        {
                            "competence": "2026-06",
                            "region_code": "35073",
                            "hospital_cnes": "3012212",
                            "specialty_code": "07",
                        }
                    )
                    call = "classify" if args.action == "classify" else "ask"
                    cursor.execute(
                        f"begin :result := flowia_haiku_api.{call}(:question, :context); end;",
                        result=out,
                        question=args.question,
                        context=context,
                    )
                    print(
                        json.dumps(
                            {
                                "response": json.loads(out.getvalue().read()),
                                "seconds": time.monotonic() - start,
                            },
                            ensure_ascii=False,
                        )
                    )
    except Exception as exc:
        # Do not print driver messages: HTTP errors can include request headers.
        code = getattr(exc.args[0], "code", None) if exc.args else None
        print(
            json.dumps(
                {
                    "error_type": type(exc).__name__,
                    "oracle_code": code,
                    "seconds": time.monotonic() - start,
                }
            )
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

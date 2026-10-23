"""Additive fair preview. Install secret via process environment only; never log values."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from flowia_haiku_db import ROOT, connect, run_sql


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, required=True)
    parser.add_argument('action', choices=['apply', 'secret', 'compile', 'ords', 'rollback', 'inspect'])
    args = parser.parse_args()
    try:
        with connect(args.env_file) as conn:
            if args.action in ('apply', 'ords', 'rollback'):
                file = {'apply': '010_live.sql', 'ords': '011_live_ords.sql', 'rollback': '012_live_rollback.sql'}[args.action]
                run_sql(conn, ROOT / 'db/flowia_haiku' / file)
            elif args.action == 'secret':
                key = os.environ.pop('ANTHROPIC_API_KEY', None)
                if not key:
                    raise ValueError('ANTHROPIC_API_KEY required')
                with conn.cursor() as cur:
                    cur.execute('merge into FLOWIA_HAIKU_SEGREDO t using (select 1 id from dual) s on(t.id=s.id) '
                                'when matched then update set api_key=:key '
                                'when not matched then insert(id,api_key) values(1,:key)', key=key)
                key = None
                conn.commit()
                print('{"secret_installed":true}')
            elif args.action == 'compile':
                sys.path.insert(0, str(ROOT / 'src/medflow/oracle'))
                from executar_sql import instrucoes
                with conn.cursor() as cur:
                    for sql in instrucoes(ROOT / 'db/flowia_haiku/010_live.sql'):
                        if sql.lower().startswith('create package'):
                            cur.execute(sql.replace('create package', 'create or replace package', 1))
            if args.action in ('inspect', 'compile', 'apply'):
                with conn.cursor() as cur:
                    cur.execute("select line,text from user_errors where name='FLOWIA_HAIKU_LIVE_API' order by sequence")
                    errors = cur.fetchall()
                    print(json.dumps({'compile_errors': errors}))
                    if errors:
                        raise RuntimeError('compile failed')
                    cur.execute("select table_name,grantee,privilege from user_tab_privs where table_name in "
                                "('FLOWIA_HAIKU_SEGREDO','FLOWIA_HAIKU_LIVE_API','FLOWIA_HAIKU_LIVE_USAGE')")
                    print(json.dumps({'grants': cur.fetchall()}))
    except Exception as exc:
        # Driver HTTP exceptions may contain headers. Never print their messages.
        print(json.dumps({'error_type': type(exc).__name__, 'oracle_code': getattr(exc.args[0], 'code', None) if exc.args else None}))
        sys.exit(1)


if __name__ == '__main__':
    main()

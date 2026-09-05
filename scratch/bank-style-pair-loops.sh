#!/usr/bin/env bash
# Bank the two 2026-07-19 style-pair loops into the narrative eval bank.
# RESOLVED 2026-07-25: these loops live in the LOCAL Postgres (the 07-19 style
# probe ran locally), NOT prod — prod prefix-resolve returned 0 matches for both.
# Banked as local-people-help.json + local-evidence-safety.json. Kept for re-runs;
# needs `make infra-up` first. Future §3 prod loops: use MYTHOS_DEPLOY_DATABASE_URL.
#
#   bash scratch/bank-style-pair-loops.sh
#
# After this succeeds (two golden/*.json written), the agent runs `make eval-narrative`.
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgresql://mythos:mythos@localhost:5432/mythos}"

resolve() {
  # $1 = loop_id prefix (without %) → prints the single full loop_id, or errors on 0/>1
  .venv/bin/python - "$1" <<'PY'
import os, sys
import psycopg
pfx = sys.argv[1] + "%"
with psycopg.connect(os.environ["DATABASE_URL"]) as c, c.cursor() as cur:
    cur.execute("SELECT loop_id FROM loops WHERE loop_id LIKE %s ORDER BY loop_id", (pfx,))
    rows = [r[0] for r in cur.fetchall()]
if len(rows) != 1:
    sys.stderr.write(f"prefix {pfx!r}: expected 1 match, got {len(rows)}: {rows}\n")
    sys.exit(2)
print(rows[0])
PY
}

echo "resolving loop ids from prod…"
PEOPLE_LOOP="$(resolve loop_22e71c)"
SAFETY_LOOP="$(resolve loop_5b212d)"
echo "  people/help    = $PEOPLE_LOOP"
echo "  evidence→safety = $SAFETY_LOOP"

.venv/bin/python scripts/eval/bank_loop.py \
  --loop-id "$PEOPLE_LOOP" --name prod-people-help \
  --note "prod 00078-rs9 style pair; people/help arm; owner-banked"

.venv/bin/python scripts/eval/bank_loop.py \
  --loop-id "$SAFETY_LOOP" --name prod-evidence-safety \
  --note "prod 00078-rs9 style pair; evidence→safety arm; owner-banked"

echo "done — banked scripts/eval/golden/prod-people-help.json + prod-evidence-safety.json"

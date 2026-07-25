#!/usr/bin/env bash
# MythOS WorkContract adapter for the plugin-owned overnight controller.
# Protocol is defined by overnight-harness lib/contract.sh:
#   exit 0 = contract written, 3 = lane drained, 4 = lane all-blocked, other = invalid.
set -euo pipefail

out="${1:-${CONTRACT_OUTPUT:-}}"
[ -n "$out" ] || { echo "missing contract output path" >&2; exit 2; }

python3 - "$out" <<'PY'
import json
import os
import re
import sys
from pathlib import Path

out = Path(sys.argv[1])
plan = Path(os.environ.get("CONTRACT_PLAN_DOC", "docs/NEXT_PLAN.md"))
engine = os.environ.get("OVERNIGHT_LANE") or os.environ.get("CONTRACT_ENGINE", "")
engine = {"antigravity": "agy", "kiro-cli": "kiro"}.get(engine, engine)

lane_tags = {
    "claude": {"auto", "auto:claude"},
    "codex": {"auto:codex"},
    "agy": {"auto:agy"},
    "kiro": {"auto:kiro"},
    "opencode": {"auto:opencode"},
}
if engine == "codex" and os.environ.get("OVERNIGHT_CLAUDE_FAILOVER") == "1":
    lane_tags["codex"] |= {"auto", "auto:claude"}
eligible_tags = lane_tags.get(engine)
if not eligible_tags or not plan.is_file():
    sys.exit(2)

lines = plan.read_text(errors="replace").splitlines()
open_items: list[str] = []
blocked_items = 0
for index, raw in enumerate(lines):
    normalized = raw.replace("`", "")
    if not re.match(r"^\s*-\s+\[ \]\s+", normalized):
        continue
    tags = set(re.findall(r"\[([^\]]+)\]", normalized))
    auto_tags = {tag for tag in tags if tag == "auto" or tag.startswith("auto:")}
    if not auto_tags.intersection(eligible_tags):
        continue
    if "manual" in tags:
        continue
    if "blocked" in tags:
        blocked_items += 1
        continue
    parts = [normalized.strip()]
    for continuation in lines[index + 1:]:
        if not continuation.strip():
            break
        if re.match(r"^\s*-\s+", continuation.replace("`", "")) or continuation.startswith("#"):
            break
        if continuation[:1].isspace():
            parts.append(continuation.strip().replace("`", ""))
            continue
        break
    open_items.append(" ".join(parts))

if not open_items:
    sys.exit(4 if blocked_items else 3)

item = open_items[0]
lower = item.lower()
if not re.search(r"\b(done|completion criterion)\s*[:=]", lower) and "완료" not in item:
    print("top lane item has no executable completion criterion", file=sys.stderr)
    sys.exit(2)

subjective = (
    "[manual]", "play feel", "prose tone", "copy tone", "balance tuning",
    "prompt-feel", "content authoring", "story bible authoring", "production deploy",
    "secret rotation", "irreversible",
)
if any(marker in lower for marker in subjective):
    print(f"subjective or external work cannot compile: {item}", file=sys.stderr)
    sys.exit(2)

lane_scope = {
    "claude": ["src/", "tests/", "harness/", "scripts/overnight/", "docs/", "Makefile"],
    "codex": ["src/", "tests/", "resources/", "scripts/", "docs/", "Makefile"],
    "agy": ["outputs/agy/", "resources/", "tests/"],
    "kiro": ["src/", "tests/", "docs/", "scripts/", "Makefile"],
    "opencode": ["src/", "tests/", "docs/", "scripts/", "Makefile"],
}

verifiers = ["10-diff-scope"]
objective_patterns = {
    "image_arrival": r"image arrival|이미지 도착|도착률",
    "companion_join": r"companion join|동료 합류|동료 실제 합류",
    "party_distribution": r"party distribution|파티 분배|party state|파티 상태",
    "cutscene_cardinality_return": r"cutscene cardinality|cutscene return|컷신.*(?:한 번|복귀)|cardinality.*return",
    "choice_arrival": r"choice arrival|선택지 도착",
    "first_use_gloss": r"first-use gloss|first use gloss|용어 첫 등장|첫 등장 주석",
}
objective_text = re.sub(r"[-_/]+", " ", lower)
objective_ids = [
    objective_id
    for objective_id, pattern in objective_patterns.items()
    if re.search(pattern, objective_text)
]
if re.search(r"combat|tactical|route|skill|item|status|vfx|전투|경로|상태", lower):
    verifiers.append("20-gameplay-oracle")
if objective_ids or re.search(r"browser|react|ui|tsx|css|touch|scroll|board|브라우저|화면", lower):
    verifiers.append("30-browser-objective")
if engine == "agy" or re.search(r"image|sprite|portrait|art|이미지|스프라이트|초상", lower):
    verifiers.append("40-image-identity")

for verifier in verifiers:
    path = Path("scripts/overnight/verifiers.d") / f"{verifier}.sh"
    if not path.is_file() or not os.access(path, os.X_OK):
        print(f"required verifier unavailable: {path}", file=sys.stderr)
        sys.exit(2)

evidence = [{"verifier": "gate", "required": True}]
if os.environ.get("CONTRACT_CRITIC") == "1":
    evidence.append({"verifier": "critic", "required": True})
for name in verifiers:
    entry = {"verifier": name, "required": True}
    if name == "30-browser-objective" and objective_ids:
        entry["assertions"] = objective_ids
    evidence.append(entry)

oversight = "monitored" if any(v in verifiers for v in ("30-browser-objective", "40-image-identity")) else "automated"
contract = {
    "schema": 1,
    "id": os.environ["CONTRACT_MISSION_ID"],
    "goal": {
        "summary": item,
        "intent": "Advance one deterministic MythOS backlog item without crossing lane or human-authority boundaries.",
    },
    "scope": {
        "include": lane_scope[engine],
        "exclude": [".git/", ".env", ".docker/", "migrations/", "deploy/", ".github/"],
        "non_goals": [
            "push, deploy, network, secret, destructive, or production actions",
            "manual play-feel, balance, narrative-tone, prompt-feel, or aesthetic acceptance",
            "work beyond this single lane item",
        ],
    },
    "risk": {
        "customer_proximity": "low",
        "reversible": True,
        "secrets": False,
        "production": False,
        "destructive": False,
    },
    "allowed_actions": ["read", "repo-write", "local-test", "local-commit"],
    "budgets": {
        "wall_minutes": max(1, int(os.environ.get("CONTRACT_WALL_MINUTES", "30"))),
        "retries": max(0, int(os.environ.get("CONTRACT_RETRIES", "2"))),
        "subagents": max(0, min(3, int(os.environ.get("CONTRACT_SUBAGENTS", "0") or "0"))),
        # 1.2.0 repair edge: runner passes CONTRACT_REVISIONS=$OVERNIGHT_REPAIR; external
        # compilers must write it themselves (schema cap 3). 0 = edge off.
        "revisions": max(0, min(3, int(os.environ.get("CONTRACT_REVISIONS", "0") or "0"))),
    },
    "evidence": evidence,
    "outcome": {
        "rubric": "The selected item is marked complete in the plan, its stated Done criterion is met, the external gate passes, and all required verifiers pass or explicitly route to human decision.",
        "max_iterations": 1,
    },
    "oversight": {
        "mode": oversight,
        "human_when": [
            "verifier-needs-human", "verifier-disagreement", "scope-expansion",
            "irreversible-action-needed", "subjective-residue",
        ],
    },
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(contract, indent=2) + "\n")
PY

# MythOS interpretation — VERIFICATION_ENGINEERING

> Maps the bible [`../VERIFICATION_ENGINEERING.md`](../VERIFICATION_ENGINEERING.md) onto MythOS's gate, overnight critic, and human play-review boundary.

## 1. Three-layer mapping

| Layer | MythOS mechanism | What it proves |
| --- | --- | --- |
| **Mechanical** | `make check`, then `OVERNIGHT_VERIFY_GATE=1` external rerun after a new commit | ruff, eslint, mypy, TypeScript/Vite build, unit tests, content/asset invariants, and entry-doc budgets are green at the committed HEAD |
| **Semantic** | `OVERNIGHT_CRITIC=auto|1` + `scripts/overnight/CRITIC_PROMPT.md` in an engine-specific read-only mode | the committed diff does not show an untested regression, scope creep, test subversion, masking, or a MythOS domain-invariant violation |
| **Creative** | `[manual]` work + `docs/test/neo_seoul_live_qa.md` + `/overnight-report` checklist | human judgment covers narrative feel, visual quality, play balance, pacing, and UX feel |

The MythOS operational default is `OVERNIGHT_CRITIC=auto`: low-risk commits skip the paid review, while risky diffs trigger it. Set `=0` to disable semantic review explicitly or `=1` when every mechanically green commit warrants review.

## 2. Mechanical layer

- Commit gate: `GATE_CMD=make check`.
- External proof: `OVERNIGHT_VERIFY_GATE=1` reruns the gate outside the actor process. A RED commit is phantom-success and is reverted.
- Stronger opt-in checks stay outside the unattended default: `make smoke-local`, `make smoke`, `make test-db`, and `make test-e2e` require runtime services, persistence, or live flow.
- When a semantic issue repeats, add a deterministic invariant under `tests/` or a harness check and let `make check` own it.

## 3. Semantic layer

The repo-local critic prompt extends the generic four checks with MythOS-specific green-but-wrong rules:

1. Shared runtime orchestration remains in `RuntimeSessionService`; API, CLI, Streamlit, and React adapters must not duplicate loop transitions.
2. Existing SQL migrations are immutable; schema changes require a new migration and compatible store/serializer handling.
3. API payload changes stay paired with serializers, frontend TypeScript contracts/call sites, or an explicit contract test.
4. Generated frontend bundles are outputs of the frontend build, never the sole hand-edited source of a behavior change.
5. Narrative, balance, prompt, visual, and play-feel changes cannot be declared fully verified by `make check`; any subjective acceptance remains `[manual]`.

The critic reviews only a bounded commit diff and is deliberately conservative. Unparseable or uncertain output is PASS because the mechanical gate already succeeded.

## 4. Creative boundary

The unattended loop must not consume work whose completion criterion is primarily subjective:

- Neo-Seoul play feel, pacing, route-choice feel, and ending satisfaction.
- Narrative prose quality, repetition feel, prompt tuning, and Story Bible authoring.
- Combat balance, progression feel, visual composition, image selection, and animation feel.
- Live performance judgments that require the actual Ollama/FLUX/browser stack.

These items remain `[manual]`; deterministic subproblems discovered during review may be split into separate `[auto]` regression tasks.

## 5. Operations and evidence

- Runner: `scripts/overnight/run.sh`.
- Semantic policy: `scripts/overnight/CRITIC_PROMPT.md`.
- Machine ledger: `scripts/overnight/logs/status.tsv` via `status.sh`/dashboard.
- Mechanical evidence: `scripts/overnight/logs/gate-<iter>.log`.
- Semantic evidence: `scripts/overnight/logs/critic-<iter>.log`.
- Human evidence: `docs/test/bible/overnight-review-checklist.md` and scenario live-QA documents.
- Assisted live-QA evidence: `make live-qa-agy-probe` makes AGY the browser actor (Chrome DevTools → Playwright MCP) and writes ignored artifacts under `outputs/live-qa/`; Python validates evidence only, and AGY candidate verdicts cannot close creative `[manual]` items.

## 6. Related docs

- Bible: [`../VERIFICATION_ENGINEERING.md`](../VERIFICATION_ENGINEERING.md)
- Harness mapping: [`HARNESS.md`](HARNESS.md) · loop operation: [`LOOP.md`](LOOP.md) · parallel roles: [`AGENTIC.md`](AGENTIC.md)
- Repository mandates: `harness/CORE_MANDATES.md` · open work: `docs/NEXT_PLAN.md`

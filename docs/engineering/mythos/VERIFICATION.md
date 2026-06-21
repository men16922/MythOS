# MythOS interpretation — VERIFICATION_ENGINEERING

> Maps the bible [`../VERIFICATION_ENGINEERING.md`](../VERIFICATION_ENGINEERING.md) onto MythOS's gate, overnight critic, automatic live-QA, and human play-review boundary.

## 1. Layer mapping

The generic bible defines mechanical → semantic → creative. **MythOS is a game, so live-QA is not
optional** — a browser actually rendering the playable UI is essential evidence. Because MythOS is the
harness **origin tier** (not a generic consumer), it inserts a fourth, repo-specific layer —
**Automatic live-QA** — between the semantic critic and the human creative boundary. The generic
plugin omits this layer; only this game repo specializes it.

| Layer | MythOS mechanism | What it proves |
| --- | --- | --- |
| **Mechanical** | `make check`, then `OVERNIGHT_VERIFY_GATE=1` external rerun after a new commit | ruff, eslint, mypy, TypeScript/Vite build, unit tests, content/asset invariants, and entry-doc budgets are green at the committed HEAD |
| **Semantic** | `OVERNIGHT_CRITIC=auto\|1` + `scripts/overnight/CRITIC_PROMPT.md` in an engine-specific read-only mode | the committed diff does not show an untested regression, scope creep, test subversion, masking, or a MythOS domain-invariant violation |
| **Automatic live-QA** | `OVERNIGHT_BROWSER_QA=auto` → `browser-qa-filter.sh` (candidate) → AGY 2-stage decision/run → `browser-qa.sh` ledger | a UI/runtime/scenario commit still **renders and plays in a real browser** (boot, scene, choices, payload display, no fatal console/network) — objective, evidence-backed, stop-on-fail |
| **Creative** | `[manual]` work + `docs/test/neo_seoul_live_qa.md` + `/overnight-report` checklist | human judgment covers narrative feel, visual quality, play balance, pacing, and UX feel |

Operational defaults: `OVERNIGHT_CRITIC=auto` (semantic review only on risky diffs) and
`OVERNIGHT_BROWSER_QA=auto` (live-QA only on browser-observable commits). Set either `=0` to disable.

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

## 4. Automatic live-QA layer (MythOS game specialization)

`make check` and the critic cannot see what the browser actually renders. Much of that is **objective**
(does it boot, does the scene/choices appear, is the payload displayed, are there fatal console/network
errors) and needs no human feel-judgment. This layer covers exactly that objective slice automatically;
the residual **subjective** slice stays in the creative boundary (§5).

- **Trigger A (post-commit)**: after a commit survives mechanical + semantic, `browser_qa_candidate_reason`
  (`scripts/overnight/browser-qa-filter.sh`, read-only, candidate-biased) decides whether the diff touches
  browser-observable behavior. If so, AGY is invoked once: it emits `QA_DECISION: RUN|SKIP`, then drives the
  browser itself (Chrome DevTools → Playwright MCP) and captures evidence.
- **Trigger B (drain)**: at `DONE`, one bounded checklist sweep (initially A/F of `neo_seoul_live_qa.md`)
  runs even on a night with no UI commit, deduplicated by `HEAD + checklist-hash`.
- **Outcome → loop**: `PASS_CANDIDATE`/`SKIP` keep the commit and continue; `FAIL_EVIDENCE`/`NEEDS_HUMAN`
  create `STOP` + notify and stop further stacking. **It never reverts** (only the mechanical gate and the
  conservative critic revert) and never touches the no-progress/consec-fail counters.
- **Boundaries**: this is an **evidence + stop-on-fail guard, not a deterministic gate** and not a backlog
  tag. Python validates artifacts only and never drives a browser; a `PASS_CANDIDATE` is a human-review
  candidate, **not** a sign-off, and cannot close a subjective creative `[manual]` item.

**Effect on tagging (the payoff for a game repo):** because the loop now auto-screens browser-observable
commits and stops on breakage, *objective* UI/runtime **refactor / codemod / wiring** (no feel judgment)
may be tagged `[auto]`/`[auto:claude]` for this repo, with a completion criterion that adds “post-commit
AGY live-QA is not `FAIL_EVIDENCE`/`NEEDS_HUMAN`”. *Subjective* feel work still stays `[manual]`. The guard
flags + stops; human sign-off before push remains authoritative (MythOS push is always manual anyway).

## 5. Creative boundary

The unattended loop must not consume work whose completion criterion is primarily **subjective**:

- Neo-Seoul play feel, pacing, route-choice feel, and ending satisfaction.
- Narrative prose quality, repetition feel, prompt tuning, and Story Bible authoring.
- Combat balance, progression feel, visual composition, image selection, and animation feel.
- Real-narrative play judgments that require the live Ollama/FLUX stack and a human verdict.

These items remain `[manual]`. The automatic live-QA layer (§4) may still attach objective browser
evidence to them (e.g. "the cutscene gallery renders"), but the subjective verdict stays human.
Deterministic subproblems discovered during review may be split into separate `[auto]` regression tasks.

## 6. Operations and evidence

- Runner: `scripts/overnight/run.sh`.
- Semantic policy: `scripts/overnight/CRITIC_PROMPT.md`.
- Machine ledgers: `scripts/overnight/logs/status.tsv` (code) and `qa-status.tsv` (live-QA) via `status.sh`/dashboard.
- Mechanical evidence: `scripts/overnight/logs/gate-<iter>.log`.
- Semantic evidence: `scripts/overnight/logs/critic-<iter>.log`.
- Automatic live-QA evidence: `outputs/live-qa/<run_id>/` (`report.md` · `verdict.json` · `events.jsonl` · `screenshots/`),
  driven by `scripts/overnight/browser-qa.sh` → `scripts/live-qa/run-agy.sh` (AGY = sole browser actor;
  Chrome DevTools → Playwright MCP; no Python browser driver). Dedup markers under `logs/qa-reviewed/`.
  For one-off diagnosis run `scripts/live-qa/run-agy.sh` directly — there is no standalone make target.
- Human evidence: `docs/test/bible/overnight-review-checklist.md` and scenario live-QA documents.

## 7. Related docs

- Bible: [`../VERIFICATION_ENGINEERING.md`](../VERIFICATION_ENGINEERING.md)
- Harness mapping: [`HARNESS.md`](HARNESS.md) · loop operation: [`LOOP.md`](LOOP.md) · parallel roles: [`AGENTIC.md`](AGENTIC.md)
- Automatic live-QA plan: `docs/plans/2026-06-21-overnight-auto-agy-qa.md`
- Repository mandates: `harness/CORE_MANDATES.md` · open work: `docs/NEXT_PLAN.md`

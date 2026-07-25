# Harness 1.2.0 adoption — repair edge readiness + graph-engineering notes

Date: 2026-07-25. Source guide: `docs/reference/GRAPH_ADOPTION.md` (owner-dropped release guide);
research grounding: harness repo `reference/2026-07-25-graph-engineering-after-loop-engineering.md`.

## What 1.2.0 adds (one line)

A **typed reject graph** for the overnight loop: rejects that used to collapse into one edge
(revert + blind restart, diagnosis discarded) are now typed — repairable rejects hand the reviewer's
diagnosis back to the actor for ONE bounded fix, contract violations still revert immediately,
ambiguous cases route to human. All opt-in; upgrade alone changes nothing except three bug fixes
(multi-commit revert range, verifier reason truncation, `rejected_by_verifier` terminal).

## What this repo changed (this adoption)

- `.gitignore` — added `scripts/overnight/CLAIM` (repair edge uses "actor left a dirty tree" as a
  reject signal; tracked runner state would poison that check).
- `scripts/overnight/CRITIC_PROMPT.md` — 3-value verdict (`PASS|REPAIR|FAIL`). REPAIR = regression,
  masking, one-sided API-contract pairing (honest, nameable, in-scope defects). FAIL = test
  subversion, scope-creep, migration edits, orchestration duplication, hand-edited `app.js`,
  creative-boundary closure (agreement violations — never re-prompted).
- `verifiers.d/` typed exits — `20-gameplay-oracle` failed deterministic tests → `exit 4` with the
  failing test named + `evidence=<log>`; `30-browser-objective` `FAIL_EVIDENCE` → `exit 4` (evidence
  bundle already attached); `40-image-identity` mismatch → `exit 4` with judge verdict + evidence.
  `10-diff-scope` deliberately stays `exit 1` everywhere (all its rejects are contract violations).
- `compile-contract.sh` — external compiler now writes `budgets.revisions` from
  `CONTRACT_REVISIONS` (= runner's `OVERNIGHT_REPAIR`), cap 3, default 0.
- `Makefile` — `OVERNIGHT_REPAIR_MODE ?= 0` and optional `OVERNIGHT_CRITIC_ENGINE` passthrough in
  `OVERNIGHT_V2_ENV`.

Unchanged on purpose: `harness_root` pin in `.claude/harness-config.json` — MythOS is the harness
**origin tier** and pins the source checkout (now at 1.2.0), not the marketplace cache.
`OVERNIGHT_REPAIR` stays 0 until a held-out task bank exists (see NEXT_PLAN WS5); MythOS was already
running stage 1 (`OVERNIGHT_CRITIC=auto OVERNIGHT_OVERSIGHT=graduated` are the Makefile defaults).

## Graph-engineering reading (why these five edits are one idea)

The 2026-07 "graph engineering" discourse splits into two schools; 1.2.0 takes exactly one device
from each and nothing else:

- **G-orch (topology)**: a loop's reject path had a single untyped edge — reviewer → revert →
  blind restart — which *computed the most valuable state of the night (what was wrong and why) and
  threw it away*. 1.2.0 adds the missing **loop-back edge carrying the verdict as state**
  (repair), and types the edges so "fix it" and "revert it" and "ask a human" are distinct
  transitions. Our verifier exit codes (0/1/2/3/4) are those edge types; the critic's
  REPAIR/FAIL split is the same typing at the semantic layer.
- **G-ctrl (control/grounding)**: the repair edge's intrinsic risk is Goodhart — an actor that
  learns to *appease the reviewer* instead of fixing defects, visible only as "completions up,
  quality flat-or-down". The defenses are anchors outside the optimized loop: the external gate
  re-runs on every repaired commit (perimeter, not rolled back), FAIL-class rejects are never
  re-prompted, and a **held-out task bank + paired counter-metrics** (completions WITH
  false-accept rate; cost savings WITH dirty-leftover rate) are a stated precondition before
  `OVERNIGHT_REPAIR=1`. Not adopted (matching the harness's own non-goals): parallel lanes,
  sub-mission checkpoints, graph frameworks/DSLs.

Effect to expect once enabled, per the guide: fewer `consec-fail` early exits (a 2am gate-red no
longer burns the night), at the cost of ~2× actor calls on repaired iterations; effectiveness is
explicitly **unmeasured upstream** — hence default-off and paired metrics.

## Concepts worth borrowing into MythOS itself (product, not harness)

1. **Typed reject edges in the narrative pipeline** (cheap, high fit). The director already has one
   repair edge (parse failure → one LLM repair → fallback). But engine-level rejects
   (`apply_scene_payload` validation, clamp violations, register/style rejects, safety-filter
   empties) all collapse into "fallback" — the same untyped-edge smell 1.2.0 fixed. Typing them
   (repairable-with-reason: schema/validator violations, where the validator's message becomes the
   repair prompt · non-repairable: safety empties → fallback · log-for-human: story-bible
   contradictions) would reuse the existing repair machinery and give observability per edge type.
2. **Held-out eval bank before prompt tuning** (directly actionable now). The narrative eval bank
   (`scripts/eval/`, `bank_loop.py`, `make eval-narrative`) is about to be used as a prompt/directive
   regression gate. Split banked loops from day one: a tuning set and a **held-out set never used
   while iterating on prompts/directives**, scored only before promoting a prompt change to default.
   Same Goodhart trap as §3.4 of the guide — with n this small it is cheap to avoid now and
   expensive to retrofit.
3. **Paired counter-metrics for narrative quality**: never report rubric score alone — pair it with
   cost/loop and repetition/length-compliance (the failure mode "score up because prose got longer
   and safer" is otherwise invisible). Mirrors verified-commits⇄false-accepts.
4. **Name the anchors** (vocabulary only, no code). MythOS already grounds its LLM loop in
   deterministic nodes the model cannot touch: combat adjudication, stability/tension clamps,
   ±25 world-delta clamp, route DAG reachability, story-bible frozen facts. Calling these
   *anchors/perimeter* in DESIGN/GAMEPLAY docs makes "what the narrative LLM may never override"
   explicit — the same perimeter/scaffold split the harness uses for ablation safety.

## Rollout state / next

- Today (done): upgrade verified (`overnight-where` → 1.2.0 source pin), §3.1/3.2/3.3/3.5 applied,
  `make check` gate on this change set.
- Next overnight run: observe `REVIEW_QUEUE.md` (stage 1 already on); optionally
  `OVERNIGHT_CRITIC_ENGINE=codex` for one night (verdict-disagreement rate is itself signal).
- Before `OVERNIGHT_REPAIR=1`: build the held-out task bank (§3.4) — tracked in NEXT_PLAN WS5.

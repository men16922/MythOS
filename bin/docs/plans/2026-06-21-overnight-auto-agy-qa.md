# Existing Overnight Runner → Automatic AGY Browser QA

Status: **Plan only — handoff for Claude, do not treat as implemented**  
Date: 2026-06-21  
Primary goal: keep the user-facing command surface at `make overnight` / `make overnight-watch`; let the existing runner decide when browser QA is necessary and invoke AGY automatically.  
Related plan: `bin/docs/plans/2026-06-21-agy-assisted-live-qa.md`

## 1. User intent and non-negotiable outcome

The repository already has too many overnight-related commands. Do **not** add another user workflow such as `make overnight-qa-agy-*` or require the user to assign browser QA manually.

Required operator experience:

```sh
make overnight          # unchanged
make overnight-watch    # unchanged
make overnight-once     # unchanged; includes at most one automatic QA hook for that iteration
```

Inside that existing flow, the runner must:

1. finish code work and deterministic verification first;
2. decide whether the resulting stable HEAD needs browser QA;
3. invoke AGY only when browser QA is justified;
4. make AGY perform all browser actions with Chrome DevTools first and AGY Playwright MCP second;
5. keep Python out of browser control (Python may validate artifacts only);
6. preserve human ownership of subjective sign-off;
7. expose results through the existing logs/status/morning-report surfaces.

## 2. Current repository state Claude must preserve

The working tree already contains uncommitted work from the verification-layer and AGY-QA sessions. Inspect and preserve it; do not reset, overwrite, or reimplement blindly.

Relevant current files:

- `scripts/overnight/run.sh`: existing multi-engine commit loop, external re-gate, critic, status ledger, failover.
- `scripts/live-qa/run-agy.sh`: direct AGY actor probe. Wrapper starts/stops API and enforces Git invariance; AGY drives the browser.
- `scripts/live-qa/PROMPT.agy.md`: Chrome DevTools priority 1, AGY Playwright MCP priority 2, no Python browser fallback.
- `scripts/live-qa/artifacts.py`: manifest preparation, server readiness, and artifact/verdict validation only; it has no browser dependency.
- `Makefile`: currently exposes `live-qa-agy-probe`; this plan removes that as a normal operator command and makes the script an internal runner hook.
- `bin/docs/plans/2026-06-21-agy-assisted-live-qa.md`: broader live-QA phases.

Measured evidence already available locally:

- `outputs/live-qa/ws0-agy-direct-20260621/`
- AGY directly created a player, played two interactive scenes, chose an action, wrote 2 events + console evidence + 2 screenshots, and returned validator-confirmed `PASS_CANDIDATE`.
- That run used AGY Playwright MCP because Chrome DevTools MCP was not loaded in that specific CLI session. The prompt policy must still prefer Chrome DevTools when present.

## 3. Architectural decision

Do not create a second top-level overnight loop. Add a **browser-QA phase** to the existing `scripts/overnight/run.sh` lifecycle.

```text
actor iteration
  → local commit
  → external deterministic gate
  → semantic critic
  → maybe_browser_qa (new)
       ├─ cheap candidate filter says irrelevant → QA_SKIP
       └─ candidate → AGY decides and, if needed, directly browser-tests
            ├─ PASS_CANDIDATE → keep commit, continue loop
            ├─ SKIP           → keep commit, continue loop
            ├─ FAIL_EVIDENCE  → keep commit, STOP + notify human
            └─ NEEDS_HUMAN    → keep commit, STOP + notify human
```

Why the QA phase belongs after gate + critic:

- Never spend browser/AGY time on a commit that will be mechanically rejected or critic-reverted.
- AGY must test the exact stable commit that would otherwise remain in the branch.
- Browser QA is evidence gathering, not a replacement for deterministic tests.

Do not auto-revert a commit based only on AGY live-QA judgment. A live-QA failure stops further stacking and preserves evidence for human review; only the deterministic external gate and the existing conservative critic retain their current revert semantics.

## 4. Two automatic trigger points

### Trigger A — post-commit QA

After a new commit survives the external gate and critic, call `maybe_browser_qa` with:

- `trigger=post-commit`
- range `HEAD_BEFORE..HEAD_AFTER`
- verified commit SHA
- changed paths and diff summary
- selected backlog/task context when recoverable from the iteration output or commit message

This catches UI/API/runtime changes immediately before later iterations stack on top.

### Trigger B — drain-time QA sweep

When the normal `[auto*]` backlog is drained and the runner is about to honor `DONE`, run a bounded QA sweep once for the current:

```text
HEAD + hash(docs/test/neo_seoul_live_qa.md)
```

Purpose:

- existing manual/live-QA debt can receive AGY evidence even on a night with no new UI commit;
- the user does not need to create a separate command or manually assign `[qa:agy]` work;
- a stable checklist/HEAD pair is never rerun repeatedly.

The drain sweep asks AGY to inspect the checklist and choose at most the highest-priority bounded case that is feasible in the available time. Initially this should be A/F only, not the entire A–I run.

## 5. Automatic “does this need browser QA?” decision

Use a two-stage decision to control cost without losing semantic judgment.

### Stage 1 — cheap deterministic candidate filter

Implement `browser_qa_candidate_reason <range>` in `run.sh` or a small side-effect-free helper.

Candidate when the diff touches behavior visible through the playable UI, for example:

- `src/mythos_ui/**`
- `src/mythos_api/**` serializers/routes/websocket/session payloads
- runtime/session/combat/narrative code that changes displayed state or turn transitions
- `resources/<scenario>/scenario.json`, directives, Story Bible, curated scene/cutscene assets
- frontend-generated output paired with source changes
- Playwright selectors/test IDs or browser-facing configuration

Skip cheaply when the commit is clearly non-browser-facing, for example:

- docs-only engineering/history maintenance
- tests-only invariant additions with no runtime change
- harness scripts unrelated to browser/runtime behavior
- formatting/import-only changes
- archive/bin cleanup

The candidate filter is a cost gate, not the final semantic decision. Bias toward candidate when uncertain.

### Stage 2 — AGY semantic decision

For a candidate, invoke AGY once with the diff/task/checklist context. AGY starts with:

```text
QA_DECISION: RUN|SKIP — reason
```

- `SKIP`: no meaningful browser-observable behavior or existing evidence already covers it.
- `RUN`: AGY proceeds in the same invocation using Chrome DevTools or Playwright MCP.

Avoid a separate paid classifier call. One AGY invocation should decide and, when needed, execute QA.

## 6. Generalize the existing AGY QA script

Convert `scripts/live-qa/run-agy.sh` from a fixed probe into an internal hook callable by `run.sh`.

Inputs:

| Variable/argument | Meaning |
| --- | --- |
| `LIVE_QA_TRIGGER` | `post-commit` or `drain` |
| `LIVE_QA_RANGE` | commit diff range; blank for drain sweep |
| `LIVE_QA_HEAD` | exact verified HEAD under test |
| `LIVE_QA_REASON` | candidate-filter reason |
| `LIVE_QA_CHECKLIST` | default `docs/test/neo_seoul_live_qa.md` |
| `LIVE_QA_CASE` | `auto`, initially AGY may select only probe/A/F |
| `LIVE_QA_MODE` | `auto`; AGY chooses fallback mechanics vs real narrative from the task |
| `LIVE_QA_TIMEOUT` | hard cap inherited from overnight policy |

The script continues to own:

- isolated local port;
- API startup/health check/shutdown via `trap`;
- pre/post `git status` invariance;
- output directory and manifest;
- AGY invocation;
- artifact validator;
- final machine-readable outcome.

It must not:

- edit or commit source/docs/checklists;
- run Python Playwright;
- reset DB/Docker;
- push;
- silently fall back to another actor when AGY browser tools fail.

## 7. AGY browser policy

AGY is always the live-QA actor.

Tool order:

1. AGY Chrome DevTools tools for navigation, DOM, console, network, performance, screenshots, and interactions.
2. AGY Playwright MCP when Chrome DevTools is absent or cannot complete an operation.
3. Neither available → `NEEDS_HUMAN`; stop. No Python/Selenium fallback.

Python Playwright remains allowed only later, outside the live-QA iteration, when a human accepts an objective bug and Claude converts that bug into a deterministic E2E regression test.

## 8. QA mode selection

AGY receives both URLs/modes and chooses from task semantics:

- **fallback mechanics mode**: UI wiring, controls, visibility, selector, route/map rendering, payload display, console/network regression.
- **real narrative mode**: prompt/narrative, ending reason, post-combat callback, repetition, pacing, choice feel.

Real mode prerequisites are checked, not auto-started destructively:

- Ollama reachable and required models available;
- required local persistence/infra already healthy if the case depends on it;
- sufficient timeout remains.

Missing prerequisites produce `NEEDS_HUMAN` with evidence. Do not silently downgrade a narrative-feel QA task to fallback mode and claim success.

## 9. Deduplication and runtime state

Do not modify `NEXT_PLAN.md` or the human checklist from the QA subprocess merely to remember execution.

Create an ignored runtime ledger, for example:

```text
scripts/overnight/logs/qa-status.tsv
scripts/overnight/logs/qa-reviewed/<key>
```

Keys:

- post-commit: `sha256(trigger + HEAD + diff-range + checklist-hash)`
- drain sweep: `sha256(trigger + HEAD + checklist-hash)`

If a successful/skip marker exists for the key, do not rerun it. `FAIL_EVIDENCE` and `NEEDS_HUMAN` should also be recorded so restart behavior is explicit; default is no automatic retry at the same key.

Suggested `qa-status.tsv` fields:

```text
ts  trigger  head  key  decision  verdict  browser_tool  case  run_id  artifact_dir  duration  reason
```

## 10. Runner outcome semantics

| QA result | Commit | Loop behavior |
| --- | --- | --- |
| candidate filter skip | keep | continue |
| AGY `QA_DECISION: SKIP` | keep | record marker, continue |
| `PASS_CANDIDATE` | keep | record marker, continue |
| `FAIL_EVIDENCE` | keep | create `STOP`, notify, stop before more commits |
| `NEEDS_HUMAN` | keep | create `STOP`, notify, stop before more commits |
| AGY limit/infra failure | keep | classify infra/limit, record, stop or use existing bounded retry policy once |

QA must not increment normal “no new commit” counters: it is a subphase of a successful iteration, not a separate code iteration.

For `--once`, run the QA hook after that iteration's verified commit before exiting. If the iteration produced no commit, only run the drain sweep when `DONE` was created and no marker exists.

## 11. DONE handling change

Current `run.sh` exits immediately when `DONE_FILE` is detected at the loop top. Change this carefully:

1. on DONE, call a once-only `maybe_drain_browser_qa` before breaking;
2. use HEAD + checklist hash deduplication;
3. if QA passes/skips, exit with the original DONE reason;
4. if QA fails/needs-human, exit with a QA-specific reason and notify;
5. never remove or rewrite DONE from the QA phase.

This is the mechanism that lets ordinary `make overnight` decide to use AGY even when code automation has drained.

## 12. Status, dashboard, and morning report

Do not expand the existing 13-column code `status.tsv` again unless necessary. Prefer a separate `qa-status.tsv` joined at read time.

Update:

- `scripts/overnight/status.sh`: display the latest QA child under the main lane, e.g. `└─ qa:agy [pass] A/F PLAYWRIGHT_MCP`.
- `scripts/overnight/dashboard.sh`: existing status output should surface that child automatically.
- `/overnight-report` skill mirrors: summarize QA trigger, case, verdict, browser tool, evidence directory, and human items requiring review.

Morning output should distinguish:

- mechanically verified commit;
- AGY browser evidence candidate;
- human sign-off still pending.

## 13. Command-surface cleanup

The user should not need `make live-qa-agy-probe` in normal operation.

- Remove `live-qa-agy-probe` from `.PHONY` and normal Makefile help/comments.
- Keep `scripts/live-qa/run-agy.sh` directly executable for internal tests and diagnosis.
- Do not add `overnight-qa-*`, `overnight-with-qa-*`, or additional watch/once aliases.
- Existing `make overnight`, `make overnight-watch`, and `make overnight-once` remain the only normal entry points.

Do not use this task as an excuse to remove existing legacy engine/worktree commands unless the user separately approves a command-surface cleanup. This plan adds no new operator command and removes only the newly introduced standalone QA target.

## 14. Implementation work packages

### WS-A — candidate filter and pure decision tests

- Add `browser_qa_candidate_reason` with fixture ranges.
- Prove docs-only/tests-only/harness-only skip.
- Prove frontend/API/runtime/scenario/prompt changes become candidates.
- Keep output reason machine-readable and logged.

Completion: fixture matrix passes and function has no side effects.

### WS-B — generalize AGY hook

- Parameterize `run-agy.sh` and `PROMPT.agy.md` with trigger/range/reason/case/mode.
- Add `QA_DECISION: RUN|SKIP` parsing.
- Preserve direct AGY browser ownership and Git invariance.
- Expand `artifacts.py` only for schemas/validation; no browser dependency.

Completion: fake AGY SKIP/RUN/PASS/FAIL/NEEDS fixtures classify correctly.

### WS-C — post-commit integration

- Hook after external gate + critic while `commit_live=1`.
- Record dedup marker and QA ledger.
- Stop/notify on fail/needs-human without reverting.
- Prove QA does not affect no-progress counters.

Completion: isolated fake-runner E2E demonstrates skip, pass, stop, and dedup paths.

### WS-D — drain-time sweep

- Intercept DONE before exit.
- Select bounded priority A/F candidate from the checklist.
- Deduplicate by HEAD + checklist hash.
- Preserve original DONE on pass/skip.

Completion: no-auto backlog triggers AGY exactly once; restart at the same HEAD/checklist does not rerun.

### WS-E — status/report integration

- Add `qa-status.tsv` reader to status/dashboard.
- Update all tracked `/overnight-report` skill mirrors consistently through the repo's skill-sync mechanism.
- Ensure human sign-off language remains explicit.

Completion: status and morning report show code + QA results without reading raw logs manually.

### WS-F — real A/F live proof

- Run ordinary `make overnight-once` against a controlled candidate commit or drain state.
- Verify the runner autonomously chooses AGY.
- AGY directly performs the required browser path.
- Confirm evidence, stop behavior, dedup, cleanup, and no checklist/source mutation.

Completion: one end-to-end real run from the existing overnight command, no separate QA command.

## 15. Test and fault-injection matrix

At minimum verify:

| Case | Expected |
| --- | --- |
| docs-only commit | candidate filter skip; no AGY process |
| frontend UI commit | AGY candidate invocation |
| API payload commit | AGY candidate invocation |
| AGY semantic SKIP | ledger skip, loop continues |
| AGY PASS | artifact validator green, loop continues |
| missing screenshot/event | validator forces `NEEDS_HUMAN`, loop stops |
| fatal console/network error | `FAIL_EVIDENCE` or validator rejection, loop stops |
| AGY edits source | Git invariance failure, loop stops |
| AGY tool unavailable | `NEEDS_HUMAN`, no Python fallback |
| same HEAD/checklist restart | dedup skip |
| new HEAD | QA eligible again |
| changed checklist hash | drain sweep eligible again |
| QA after critic rejection | must not run |
| `--once` verified commit | QA hook completes before exit |
| DONE with unresolved live QA | one bounded drain sweep before exit |

Use fake `agy`, fake API, and an isolated temporary git repo for runner-control tests so no model/browser cost is required. Then perform one real AGY browser run.

## 16. Safety and rollback

Safety invariants:

- no push;
- no source/checklist edits from AGY;
- no Python browser actor;
- no automatic commit revert from subjective QA;
- QA only after stable gate/critic pass or at stable DONE;
- one run per dedup key;
- bounded timeout/turns/cost;
- server cleanup via trap on success, failure, signal, and timeout.

Rollback switches may exist as environment variables but are not new commands:

- `OVERNIGHT_BROWSER_QA=0` disables the hook during incident recovery.
- default should become `auto` only after fake-runner tests and one real integrated proof pass.
- until then, land behind default `0`, prove, then flip to `auto` in a separate small commit.

## 17. Files expected to change

- `scripts/overnight/run.sh`
- `scripts/overnight/status.sh`
- possibly `scripts/overnight/dashboard.sh` only if status output is not inherited
- `scripts/live-qa/run-agy.sh`
- `scripts/live-qa/PROMPT.agy.md`
- `scripts/live-qa/artifacts.py`
- `Makefile` (remove standalone QA target only; add no replacement)
- tests/fixtures for candidate filter, QA outcome, dedup, and artifact validation
- `.claude/.agents/.codex/.gemini` overnight-report skill mirrors via `harness/sync-skills.sh`
- `docs/engineering/mythos/{LOOP,AGENTIC,VERIFICATION}.md`
- current checkpoint docs after implementation

## 18. Definition of done

The work is complete only when all are true:

1. The user runs only `make overnight`, `make overnight-watch`, or `make overnight-once`.
2. A browser-irrelevant commit does not invoke AGY.
3. A browser-relevant verified commit causes the existing runner to ask AGY and run browser QA when AGY decides it is needed.
4. A drained backlog can trigger one bounded checklist QA sweep without a separate command.
5. AGY owns every live browser interaction through Chrome DevTools/Playwright MCP.
6. Python has no browser role in live QA.
7. PASS continues; FAIL/NEEDS stops further code stacking and notifies without auto-revert.
8. Same HEAD/checklist does not rerun.
9. Status and morning report expose evidence location and human follow-up.
10. `bash -n`, fixture/fault tests, `git diff --check`, `make check`, and one real integrated AGY run are green.

## 19. First action for Claude

Start with WS-A only:

1. inspect the current dirty diff and preserve all prior work;
2. extract a side-effect-free candidate-filter helper;
3. build the skip/run fixture matrix;
4. do not invoke real AGY yet;
5. run targeted tests and `make check`;
6. continue to WS-B only after WS-A is demonstrably green.

Do not create more user-facing Make targets. The whole point of this plan is that the existing overnight command becomes QA-aware by itself.

## 20. Implementation status (2026-06-21) — WS-A..E done, WS-F = manual real run

WS-A..E are implemented and deterministically green; WS-F (one real integrated AGY run) is the only
remaining step and is **manual** (needs the AGY CLI + browser MCP + optionally Ollama/infra).

Files landed:

- `scripts/overnight/browser-qa-filter.sh` (WS-A) — Stage-1 candidate filter, read-only, candidate-biased.
- `scripts/live-qa/artifacts.py` (WS-B) — pure `decide_outcome` + `QA_DECISION` parsing + `LIVE_QA_OUTCOME` line.
- `scripts/live-qa/run-agy.sh` + `scripts/live-qa/PROMPT.agy.md` (WS-B) — parameterized hook (trigger/range/reason/case/mode).
- `scripts/overnight/browser-qa.sh` (WS-C/D) — `maybe_browser_qa` / `maybe_drain_browser_qa`, dedup ledger.
- `scripts/overnight/run.sh` (WS-C/D) — `OVERNIGHT_BROWSER_QA` gate (default `0`), post-commit hook after gate+critic, DONE-drain hook.
- `scripts/overnight/status.sh` (WS-E) — `qa:agy [outcome]` child line from `qa-status.tsv`.
- `.claude/skills/overnight-report/SKILL.md` (+ engine mirrors) (WS-E) — QA evidence + three-tier sign-off language.
- `Makefile` (WS-E) — removed the standalone `live-qa-agy-probe` operator target (run the script directly for diagnosis).
- Tests: `tests/test_browser_qa_filter.py` (18), `tests/test_live_qa_artifacts.py` (15), `tests/test_browser_qa_runner.py` (7).

## 21. Verification guide

### A. Deterministic (already green; re-runnable offline, no AGY/browser/API cost)

```sh
make check                                   # full gate — 502 tests incl. the 40 QA tests
bash -n scripts/overnight/{run,browser-qa,browser-qa-filter,status}.sh scripts/live-qa/run-agy.sh
bash harness/sync-skills.sh --check          # overnight-report mirror drift = OK

# Stage-1 filter against real commits (CANDIDATE for UI, SKIP for docs/harness):
scripts/overnight/browser-qa-filter.sh <uiCommit>~1..<uiCommit>     # → CANDIDATE  (exit 0)
scripts/overnight/browser-qa-filter.sh <docsCommit>~1..<docsCommit> # → SKIP       (exit 1)
```

Maps to DoD #2/#8 (filter skip + dedup), #7 (PASS continue / FAIL+NEEDS stop, no revert), and the
§15 fault matrix (docs-skip, UI-candidate, SKIP/PASS/FAIL/NEEDS classify, incomplete-evidence→NEEDS_HUMAN,
git-invariance stop, dedup, checklist-rehash re-eligible). All covered by the three test files above.

### B. Real integrated run (WS-F, manual — the remaining DoD #10 item)

Prereq: `agy` on PATH with Chrome DevTools and/or Playwright MCP; `.venv` present. For `mode=real`
also Ollama + models reachable; `mode=fallback` (default) needs neither.

1. **Hook in isolation** (proves AGY drives the browser + evidence + git invariance, no overnight loop):
   ```sh
   LIVE_QA_TRIGGER=probe LIVE_QA_MODE=fallback scripts/live-qa/run-agy.sh
   # expect final stdout line: LIVE_QA_OUTCOME: PASS_CANDIDATE ; exit 0
   # evidence: outputs/live-qa/<run_id>/{report.md,verdict.json,events.jsonl,screenshots/*.png}
   ```
2. **One integrated overnight run** (proves the runner decides + invokes AGY by itself):
   ```sh
   OVERNIGHT_BROWSER_QA=auto make overnight-once     # against a UI/runtime candidate commit or a DONE state
   ```
   Confirm in `scripts/overnight/logs/runner.log`: candidate filter verdict → `browser-qa: AGY post-commit`
   (or drain) → `LIVE_QA_OUTCOME` → keep+continue (PASS/SKIP) or STOP+notify (FAIL/NEEDS).
   `scripts/overnight/status.sh` shows the `└─ qa:agy [..]` child; a docs-only commit must show NO AGY line.
3. **Read the morning report**: `/overnight-report` — confirm it lists the QA outcome, the
   `outputs/live-qa/<run_id>/` evidence dir, and the three-tier sign-off (mechanical vs evidence vs human).

### C. Rollout (§16)

Land with `OVERNIGHT_BROWSER_QA=0` (current default — overnight behaves exactly as before). After B passes
once for real, flip the default to `auto` in a small separate commit. Incident kill-switch: `OVERNIGHT_BROWSER_QA=0`.

# Progress Log

Last updated: 2026-06-21

This file keeps **only the latest incremental summaries** (latest 5 items). The long 2026-06 detailed log (including per-stage route-node session detail) is in
`bin/docs/archive/progress-2026-06.md`, the 2026-05 log in `bin/docs/archive/progress-2026-05.md`.

## 2026-06-21 (p) — overnight [auto:claude]: generalize encounter-balance invariant to glass-library
- Status: QA-seed invariant (`tests/test_encounter_balance.py`) extended from neo-seoul-only to a scenario-parameterized contract; glass-library now guarded too.
- Changed: extracted `_player`/`_ally`/`_simulate`/`_win_rate` to take a `combat` dict + archetype; added `_EncounterBalanceContract` mixin (3 tests keyed on class attrs `scenario`/`archetype`/`representative_party`). `EncounterBalanceTest` (neo-seoul, Ghost, se_rin+kai) + NEW `GlassLibraryEncounterBalanceTest` (glass-library, Binder Fugitive, io+miro). Bumped `_SEEDS` 20→60: at N=20 glass's hardest encounter (`censor_lockdown`) sampled 0.45 (below FLOOR) purely from fixed-seed small-sample noise — true rate 0.64 (N=100); N=60 is deterministic and clears FLOOR with margin (glass party_min 0.62, solo_max 0.80). Shared band FLOOR=0.50/CEILING=0.95 unchanged; docstring baselines updated to measured N=60 values. No game content/balance touched (test-only).
- Verified: `make check` green — ruff + eslint + mypy (124 files) + tsc/vite-build + **512 tests OK** (skipped 2); module run shows all 6 balance tests pass.
- Blockers: none.
- Next: remaining QA-seed items are `[auto:codex]` (STATUS note cleanup, NEXT_PLAN compression); claude lane next = App.tsx/CombatCinema decomposition slices.

## 2026-06-21 (o) — auto-QA loop production-validated + harness tidy/fix
- Status: The auto live-QA loop is validated end-to-end in production (3 real `overnight-once` runs: drain + post-commit triggers, autonomous findings, App.tsx decomposition); then doc tidy + an overnight-once gotcha fix.
- Changed: ① tidy-docs (`0954a4d`) — PROGRESS_LOG 119→38 (11 entries → `bin/docs/archive/progress-2026-06.md`, now 168), NEXT_PLAN trim. ② `make overnight-once` now auto-clears stale STOP/DONE like `make overnight` (`ac339d4`) — a leftover DONE was short-circuiting iterations into drain-QA-only.
- Verified: `make check` green (509 tests); `make -n overnight-once` shows the clean step; all committed + pushed (main == origin).
- Blockers: none.
- Next: `make overnight` for recurring App.tsx decomposition (~$3/slice — bound with `MAX_ITER`) and/or Neo-Seoul `[manual]` play-feel QA; `/overnight-report` to triage new `qa-findings.md`.

## 2026-06-21 (n) — fix both triaged AGY findings at source (discovery→fix loop closed)
- Changed: `OnboardingPanel.tsx` player-name `<input>` gained `name="display-name"` (a11y + selector stability); `app.py` added an explicit `GET /favicon.ico` → 204 route before the catch-all static mount (+`test_api.py` assertion). Both were AGY-discovered objective findings, triaged to `[auto:claude]`, now fixed → marked `[x]` in NEXT_PLAN. Closes discovery→triage→fix→re-verify; favicon stops re-appearing in `qa-findings.md`.
- Verified: `make check` green — 509 tests (+1 favicon), mypy 124, doc budgets ok.

## 2026-06-21 (m) — overnight [auto:claude]: extract useCombatBoard hook from App.tsx
- Status: Behavior-preserving frontend god-component decomposition, slice 2. The combat board pointer/drag interaction moved out of App.tsx into a hook, matching the `useAudio`·`useCombatCinema`·`useInGameEpiphany` pattern.
- Changed: NEW `src/mythos_ui/src/hooks/useCombatBoard.ts` — owns `dragRef`/`combatInspectCell`/`boardZoom` + internal `redrawCombat` + the 5 canvas pointer handlers (`down/move/up/cancel/leave`) + `handleBoardZoom`; takes `{finalizedSnapshot, canvasRef, animatorRef, isBusy, selectedScenarioId, onCombatAction}` (shared refs passed in; move dispatched back via `onCombatAction`), returns the handlers + `combatInspectCell`/`boardZoom`. `App.tsx`: replaced the inline block (~117 lines) with the hook call + import; dropped now-unused `drawCombatCanvas`/`combatCellFromPoint`/`CombatDragOverlay` imports (all moved into the hook). No logic change.
- Verified: `make check` green — ruff + eslint + mypy (124 files) + tsc/vite-build + **508 tests OK** (skipped 2). Pure extraction; no test-count change (FE has no unit-test runner; gate guarantees compile/type/lint only).
- Blockers: none. Post-commit AGY live-QA (auto-screened, §3.4.1) is the runner's job; not run in this iteration.
- Next: continue App.tsx/CombatCinema decomposition one slice per iteration (WS reconnect refs / openSocket, or the typewriter stream loop are next candidates).

## 2026-06-21 (l) — overnight [auto:claude]: extract useInGameEpiphany hook from App.tsx
- Status: Behavior-preserving frontend god-component decomposition, one slice. The in-run epiphany concern moved out of App.tsx into a hook, matching the existing `hooks/useAudio`·`useCombatCinema` pattern.
- Changed: NEW `src/mythos_ui/src/hooks/useInGameEpiphany.ts` (`showInGameNotice` state + mid-run epiphany sync effect + `getSkillName` resolver); takes `finalizedSnapshot`/`currentScenario`, returns `{showInGameNotice, setShowInGameNotice, getSkillName}`. `App.tsx`: replaced the inline block (~38 lines) with the hook call + import; dropped now-unused `CombatSkillInfo`/`ScenarioSkill` type imports. No logic change.
- Verified: `make check` green — ruff + eslint + mypy (124 files) + tsc/vite-build + **508 tests OK** (skipped 2). Pure extraction; no test-count change (FE has no unit-test runner; gate guarantees compile/type/lint only).
- Blockers: none. Post-commit AGY live-QA (auto-screened, §3.4.1) is the runner's job; not run in this iteration.
- Next: continue App.tsx/CombatCinema decomposition one slice per iteration (combat board pointer handlers or WS reconnect are next candidates).

## 2026-06-21 (k) — auto live-QA = 4th verification tier + autonomous findings (mythos/ only)
- Status: Encoded automatic live-QA as a first-class game-specific tier in the MythOS interpretation (generic bibles untouched) AND added autonomous discovery so AGY's objective findings self-populate an untagged triage list. Fixed a stale removed-target ref.
- Changed: `mythos/VERIFICATION.md` → 4-layer model (mechanical→semantic→**auto live-QA**→creative) §4 + §6 evidence fix (`make live-qa-agy-probe` removed → `qa-status.tsv`/`outputs/live-qa/`/run-script-direct). `mythos/LOOP.md` §3.4.1 + `NEXT_PLAN` tag block: repo-specific live-QA-guard note; **retagged** frontend god-component decomposition `[manual]`→`[auto:claude]` (guarded, one slice/iter). DECISIONS top entry. **Autonomous discovery**: AGY emits `QA_FINDING:` lines → `artifacts.py parse_findings` → `browser-qa.sh` appends to untagged `qa-findings.md` → `/overnight-report` triages; promotion to `[auto]` stays human (never auto-promoted — hallucination gate intact).
- Verified: `make check` green (doc budgets ok, **508 tests**; +6 findings). Guard is evidence+stop-on-fail, NOT a deterministic gate — PASS=candidate, subjective feel stays `[manual]`.
- Blockers: none. Unpushed (main ahead; user pushes).
- Next: triage real `qa-findings.md` entries into `[auto:claude]`/`[manual]` after an overnight run; Neo-Seoul `[manual]` feel QA unchanged.

## 2026-06-21 (j) — auto-AGY-QA WS-F real run passed → default 0→auto
- Status: Ran the one real integrated AGY browser-QA from the ordinary overnight command and flipped the default on. WS-A..F now all DONE (plan §18 satisfied).
- Changed: `run.sh` `OVERNIGHT_BROWSER_QA` default `0→auto` (kill-switch `=0` retained). STATUS/NEXT_PLAN/AGENT_BRIEF marked WS-F done.
- Verified: `OVERNIGHT_BROWSER_QA=auto make overnight-once` → runner auto-decided drain QA at DONE → AGY drove the browser via **Chrome DevTools** (1st-choice tool), played 2 Neo-Seoul checkpoints, returned `PASS_CANDIDATE`; `verdict.json` clean (qa_decision RUN, 2 events/2 PNGs, agy_exit 0, server_stopped, validation_errors []). Evidence `outputs/live-qa/20260621-113313-drain/`. `status.sh` shows `└─ qa:agy [pass] drain/A/F`. dedup marker written → same HEAD/checklist won't rerun.
- Blockers: none. Unpushed (main ahead; user pushes).
- Next: Neo-Seoul `[manual]` play-feel QA (A~I); overnight now auto-runs browser QA on UI/runtime/scenario commits.

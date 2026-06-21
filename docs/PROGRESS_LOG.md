# Progress Log

Last updated: 2026-06-21

This file keeps **only the latest incremental summaries** (latest 5 items). The long 2026-06 detailed log (including per-stage route-node session detail) is in
`bin/docs/archive/progress-2026-06.md`, the 2026-05 log in `bin/docs/archive/progress-2026-05.md`.

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

## 2026-06-21 (i) — automatic AGY browser-QA in overnight (WS-A..E implemented)
- Status: Implemented WS-A..E of the auto-AGY-QA plan; the overnight runner is now QA-aware behind `OVERNIGHT_BROWSER_QA` (default 0). WS-F (one real integrated AGY run) remains manual. No new operator command.
- Changed: ① WS-A `scripts/overnight/browser-qa-filter.sh` — read-only Stage-1 candidate filter (CANDIDATE if any changed path is UI/api/runtime/scenario/playwright or unrecognized; SKIP only when all paths are docs/tests/harness/config; candidate-biased). ② WS-B `scripts/live-qa/artifacts.py` pure `decide_outcome`+`QA_DECISION` parse+`LIVE_QA_OUTCOME` line; generalized `run-agy.sh`/`PROMPT.agy.md` (trigger/range/reason/case/mode). ③ WS-C/D `scripts/overnight/browser-qa.sh` (`maybe_browser_qa`/`maybe_drain_browser_qa` + sha256 dedup ledger `logs/qa-status.tsv`+`qa-reviewed/`); `run.sh` post-commit hook (after gate+critic, commit_live=1) + DONE-drain hook — PASS/SKIP keep+continue, FAIL/NEEDS STOP+notify, **never reverts**, never touches no-progress/consec-fail counters. ④ WS-E `status.sh` `qa:agy [outcome]` child line; `overnight-report` SKILL (+3 mirrors) QA evidence + 3-tier sign-off; `Makefile` removed standalone `live-qa-agy-probe`. Verification guide = plan §20-21.
- Verified: `make check` green — ruff+eslint+mypy(122)+tsc/vite-build + **502 tests** (480→+22; skipped 2). New: `test_browser_qa_filter.py`(18), `test_live_qa_artifacts.py`(15, incl. skip/run/pass/fail/needs classify), `test_browser_qa_runner.py`(7 fake-runner E2E: filter-skip-no-invoke, pass-continue, fail/needs-stop exit3, dedup, drain-once, checklist-rehash-reeligible). `bash -n` all scripts; real-commit filter spot-checks; `status.sh` QA child render; skill-mirror drift OK. Two bugs found+fixed mid-build (macOS `/usr/bin/log` shadowed the function → check `type -t`; SKIP path wrongly inherited "missing events" error). Dirty worktree preserved.
- Blockers: WS-F needs `agy` CLI + browser MCP (and Ollama/infra for `mode=real`) — manual. Default stays 0 until one real run passes, then flip to `auto`.
- Next: WS-F real run (`OVERNIGHT_BROWSER_QA=auto make overnight-once`) per plan §21.B; then default 0→auto in a small commit.

## 2026-06-21 (h) — automatic AGY QA integration plan for Claude
- Status: Completed a plan-only standalone handoff; no automatic overnight integration was implemented in this slice.
- Changed: Added `docs/plans/2026-06-21-overnight-auto-agy-qa.md`: existing `make overnight*` remains the only operator flow; post-gate/critic and DONE-time triggers decide whether AGY browser QA is needed; Chrome DevTools→Playwright MCP direct actor, dedup ledger, STOP/notify semantics, status/report integration, command cleanup, fault matrix, and WS-A~F are specified.
- Verified: Plan read-back complete and `git diff --check -- docs/plans/2026-06-21-overnight-auto-agy-qa.md` passed. Prior implemented baseline remains `make check` green (462 tests, skipped 2) and AGY-direct WS0 `PASS_CANDIDATE`.
- Blockers: None in planning. Implementation must preserve the current dirty worktree and begin with fake/pure WS-A; do not invoke real AGY until the decision matrix is green.
- Next: Claude executes WS-A from the new handoff plan; no extra user-facing QA/overnight Make target.

## 2026-06-21 (g) — AGY-direct live-QA WS0
- Status: Implemented and live-validated the evidence-only QA probe with AGY as the sole browser actor; human sign-off remains authoritative.
- Changed: Added `scripts/live-qa/{artifacts.py,run-agy.sh,PROMPT.agy.md}` + `make live-qa-agy-probe`. Wrapper owns API lifecycle/timeout/Git invariance; AGY uses Chrome DevTools first or Playwright MCP second and writes events/console/screenshots; Python has no browser dependency and only validates artifacts/verdict.
- Corrected: Rejected the initial Python-Playwright→offline-review prototype after measuring that AGY can drive the app directly with its own Playwright MCP. Python Playwright was removed from the live-QA path rather than retained as fallback.
- Verified: direct run `ws0-agy-direct-20260621` = AGY exit 0, Playwright MCP, 2 events + 2 full-page screenshots, validated `PASS_CANDIDATE`, no validation errors, server stopped, pre/post Git state identical. Chrome DevTools is preferred by policy but was not loaded in this specific CLI run.
- Blockers: None. If both AGY browser tool families fail, the QA run returns `NEEDS_HUMAN`; it never substitutes Python browser automation.
- Next: WS1 validator fault-injection tests, then targeted real-stack A/F evidence.

## 2026-06-21 (f) — adopt plugin 0.6.0 verification layer selectively
- Status: Added the plugin's docs-only mechanical → semantic → creative verification model without replacing MythOS's customized origin-tier runner.
- Changed: Added `VERIFICATION_ENGINEERING.md` + `mythos/VERIFICATION.md`, wired the 6-concept engineering index and loop/harness cross-links, specialized `CRITIC_PROMPT.md` with MythOS invariants, set the repo critic default to risk-gated `auto`, and aligned STATUS/AGENT_BRIEF/DECISIONS with plugin 0.5.1/0.6.0 reality.
- Verified: Read-back complete; new link targets exist; `bash -n` overnight scripts, `git diff --check`, and `make check` passed (ruff, eslint, mypy 121 files, TypeScript/Vite build, 462 tests; skipped 2).
- Blockers: None.
- Next: Continue Neo-Seoul human play-feel QA (A~I); use `OVERNIGHT_CRITIC=auto` for normal unattended runs and keep subjective acceptance `[manual]`.

## 2026-06-21 (e) — doc context optimization via tidy-docs
- Status: Completed document optimization per the tidy-docs skill, keeping entry documents within budget constraints.
- Changed: ① `docs/NEXT_PLAN.md`: Removed completed QA seeds and simplified the Live QA narrative improvements list, bringing the line count from 120 down to 113. ② `docs/AGENT_BRIEF.md`: Trimmed completed details from the NEXT SESSION pointer. ③ `docs/README.md`: Updated last updated date to 2026-06-21.
- Verified: Ran `make check` (all 462 python tests, doc budgets, linting, and TS builds passed successfully).
- Blockers: None.
- Next: Proceed with human play-feel QA (A~I) of the Neo-Seoul playability track.

## 2026-06-21 (d) — add character thumbnails next to name in bonds tab
- Status: Completed the manual live QA of Section J, and added companion face thumbnail images next to names in the Character Tab's Bonds (relationships) UI.
- Changed: ① `GameAside.tsx`: Added optional `avatarUrl?: string` to `GaugeBar` and rendered the image before the label text with custom flex style. ② `CharacterTabPanel.tsx`: Added `getAvatarUrl` mapping utility to fetch companion portrait images dynamically and passed the URL to `GaugeBar`. ③ `types.ts`: Added `scenario_id?: string` to `GameStateRaw` interface.
- Verified: Ran `make check` (all 462 python tests passed, TS build, eslint, ruff, mypy green). Manually started the FastAPI backend, seeded DB player progression & active loop state, flushed Redis cache, and checked the live React frontend via Playwright snapshots & screenshots. Both empty/populated gauges and locked/unlocked cutscenes were verified rendering correctly with avatar thumbnails next to companion names.
- Blockers: None.
- Next: Proceed with human play-feel QA (A~I) of the Neo-Seoul playability track.

## 2026-06-21 (c) — overnight critic port (plugin 0.5.0) + parse_usage fix + status.sh main lane
- Status: Ported plugin 0.5.0 overnight features into the MythOS origin-tier runner, found+fixed a token-telemetry bug, seeded 2 frontend items, and live-ran the loop (which produced the 2026-06-21/(b) UI commits below). main ahead 8. commits `1cdfabf`/`4ccf6ac`/`2cc5241`/`b889631`/`db9b93b`.
- Changed: ① **critic port** (`1cdfabf`): `OVERNIGHT_CRITIC` (0|1|auto) read-only per-engine critic (claude `--permission-mode plan` / codex `--sandbox read-only` / agy `--print`) + LLM-free auto risk-gate + usage telemetry + fail-class; `status.tsv` 9→13 cols; `status.sh` surfaces tok/$cost/critic; new `CRITIC_PROMPT.md`. ② **parse_usage fix**: per-usage-block MAX (not tree-wide sum) — current Claude CLI duplicates token counts across `usage.iterations[]`/`modelUsage`/`cache_creation.ephemeral_*` → measured 88292→33272 (cost already correct via max). Same bug in plugin 0.5.0 — handoff prepared, not yet applied. ③ **status.sh** (`b889631`): always print the orchestrator main lane (was hidden when stale `loop/*` worktrees exist → "running 안 뜨는" confusion). ④ 2 `[auto:claude]` seeds (`4ccf6ac`/`2cc5241`, gauge/gallery, LSP-verified breadcrumbs) + live-qa §J (`db9b93b`).
- Verified: bash -n; parse_usage fixtures (claude/codex/opencode/junk → 33272/1110/150/blank); auto risk heuristic (low-risk skip vs suppress/test-delete/sensitive trip); status.sh 13-col merge + 9-col back-compat; set -e safety; real read-only critic e2e (e0e6355 → PASS). **Live overnight run** (`OVERNIGHT_CRITIC=auto`): both seeds done + externally re-gated GREEN (phantom 0), telemetry populated (~$5.4 total) — port validated end-to-end; critic auto-skipped both (low-risk) so the review path itself ran only in the isolated e2e.
- Blockers: push blocked for the agent (main ahead 8, user pushes). `loop/*` worktrees 16-18 commits stale → refresh (`overnight-worktrees-down`+`-setup`) before parallel.
- Next: `[manual]` visual QA of the 2 UIs (live-qa §J) + A/F sign-off; plugin `parse_usage` fix (handoff ready); optional `OVERNIGHT_CRITIC=1` to exercise the critic review path in-loop.

## 2026-06-21 (b) — P1 cutscene gallery view frontend code-wiring ([auto:claude])
- Status: Wired the companion-cutscene gallery into the frontend per the breadcrumb in `docs/plans/2026-06-16-companion-affection-cutscenes.md` §P1-갤러리. Backend already exposes `memoryOverview.cutscene_gallery` (`cutscenes.cutscene_gallery()` → `serializers.memory_overview_to_dict` → `GET /api/v1`); this closes the FE read/render slice. `make check` green (462).
- Changed: ① `types.ts` — new `CutsceneGalleryEntry` interface (`{id, companion, title, affection_required, flags_required[], unlocked, image|null, body|null}`, exact backend shape) + `cutscene_gallery?: CutsceneGalleryEntry[]` on `MemoryOverview` (no new `any`). ② New `CutsceneGallery.tsx` — card grid reusing existing `skill-tree-list`/`skill-tree-item`/`codex-*` classes (no new design tokens): locked card = requirement hint (`호감도 N · 플래그 …`, dimmed); unlocked = curated `<img src=/resources/{scenarioId}/{image}>` thumbnail + native `<details>` "대본 보기" body reader; empty-state fallback. ③ `CodexPanel.tsx` — import + mount under the status grid (기억의 별자리 탭), new `scenarioId` prop. ④ `App.tsx` — pass `scenarioId={selectedScenarioId}` (image URLs work outside an active run too).
- Verified: `make check` green — ruff + eslint + mypy (121 files) + tsc/vite-build (regenerated `mythos_api/static/app.js`) + 462 unittests (skipped 2). Count unchanged (FE has no unit-test runner; gate guarantees compile/type/lint only).
- Blockers: none. Gate cannot see visuals — `[manual]` visual feel QA (locked/unlocked display, image thumbnail, body modal) remains a human follow-up per the plan's honesty note. P2 Se-rin uses placeholder portraits until dedicated art is adopted.
- Next: claude `[auto]` lane near-drained — remaining P1 cutscene items are `[manual]` (visual feel · in-game cutscene node P1-a) + P2/P3 content authoring.

## 2026-06-21 — P0 affection gauge frontend code-wiring ([auto:claude])
- Status: Wired the companion-affection gauge into the frontend per the breadcrumb in `docs/plans/2026-06-16-companion-affection-cutscenes.md` §P0-게이지. Backend already exposes `snapshot.state.relationships`; this closes the FE read/render slice. `make check` green (462).
- Changed: ① `types.ts` `GameStateRaw` — typed `relationships?: Record<string, number>` (was falling through the `[key:string]:unknown` index sig; no new `any`). ② `gauges.ts` — new `buildAffectionGauges()` normalizer (int→0–100% over a -5..+10 display window, clamped by the bar; `affectionColor()` warm=양수/cool=음수/neutral=0; humanizes snake_case companion ids). ③ `GameAside.tsx` — exported the existing `GaugeBar` for reuse (no new gauge component, per plan). ④ `CharacterTabPanel.tsx` — new "동료 관계도 (Bonds)" `codex-sec` reading `snapshot?.state?.relationships`, reusing `GaugeBar` + `.gauge-hint`, with an empty-state. Mount target (b) the Codex roster (cross-run "기억의 별자리" intent).
- Verified: `make check` green — ruff + eslint + mypy (121 files) + tsc/vite-build + 462 unittests (skipped 2). Count unchanged (FE has no unit-test runner; gate guarantees compile/type/lint only).
- Blockers: none. Gate cannot see visuals — `[manual]` visual feel QA (correct companion/value·color·scale·empty state) remains a human follow-up per the plan's honesty note.
- Next: P1 cutscene gallery view code-wiring (`[auto:claude]`, next overnight item, breadcrumb §P1-갤러리).

## 2026-06-20 (d) — skill/icon integrity invariant implemented + in-app render verify (11/11) + 4 JPEG-as-png fixed
- Status: Closed the now-unblocked `[auto:claude]` skill/icon integrity invariant and Playwright-verified the render path. commits `40f34ab` (invariant) + `e713303` (format fix).
- Changed: ① `tests/test_assets.py` `test_skill_icons_exist` — removed the intentional skill-icon exclusion; enforces every `combat.skills[].id` → `skills/<id>.png` across **all** scenarios (neo-seoul 11/11, glass-library 5/5) + **PNG magic-byte** (format=extension), guard-the-guard on 0 scanned. ② Re-encoded 4 icons that were JPEG bytes under a `.png` extension (neo-seoul `signal_step`/`overload_strike`, glass-library `index_cut`/`glass_shield`) to genuine PNG (RGBA, pixels preserved). The strengthened invariant caught all 4.
- Verified: in-app — launched `python -m mythos_api`, probed the exact frontend URL (`useCombatCinema.ts:224` `/resources/neo-seoul/skills/<id>.png`) and drove a real browser (Playwright) → **11/11 icons render (`naturalWidth>0`)**, incl. the JPEG-as-png ones (browser sniffs). heal/support ally-targeting is contract-verified by `test_combat_engine.py` (`patch_protocol`/`nanoshield_projector` ally-in-range + `available_actions.friendly_targets[]` + out-of-range→self fallback) — no live combat needed. Fault-injection RED proven (hide an icon / JPEG-as-png). `make check` green (**462**, +1).
- Blockers: none. (PNG icons render as **CombatCinema cut-ins**, not the `CombatControls` action bar which uses emoji symbols — pointer phrasing "action bar" was imprecise.)
- Next: remaining open work is all `[manual]` — P0 frontend affection gauge / cutscene gallery (payload ready), narrative live-QA #2/#5 feel. Push main (ahead 3).

<!-- Older 2026-06-20 entries (heal/support ally-targeting; skill/ally data-closure invariant batch) archived to bin/docs/archive/progress-2026-06.md -->

## 2026-06-20 (c) — WS4 image regen-on-reject loop (agy/codex) + 6 skill-card icons adopted
- Status: Built the WS4 image regenerate-on-reject pipeline (`scripts/overnight/image-regen.sh` + `make image-regen`, opt-in/human-launched) and used it to generate + adopt the 6 missing Neo-Seoul skill icons (`emp_pulse`/`glitch_blink`/`memory_resonance`/`nanoshield_projector`/`signal_overdrive`/`system_intrusion`) — the cause of han/tae_o/su_ah skills not rendering in the combat bar (now **11/11 icons**). Design `docs/plans/2026-06-20-ws4-image-regen-loop.md`.
- Changed: ① Loop = `GEN_ENGINE` (agy|codex) generate → claude `--print` vision-judge vs the peer-card frame bible → codex `--print` prompt-refine → FLUX-local fallback → `test_image_assets` integrity gate. Corrected the original "codex reviews/generates" sketch: **codex CAN generate** (own in-session Imagen/Gemini, `PROMPT.codex.md:23`) but has no vision → vision=claude/agy, prompt-refine=codex. ② `GEN_ENGINE=codex` trusts the generator (skips vision-judge, promotes directly); the orchestrator collects codex output from `~/.codex/generated_images/<uuid>/` per-target (codex's image tool has no output-path control) — removed codex's fragile find/copy. ③ 5 icons via agy (vision-judge loop, 1/6→4/5 over 2 attempts), nanoshield via codex. Bug fixes: REPO_ROOT two-line path, stale-dir promote, codex `--output-last-message` path, `FLUX_FALLBACK` opt-out.
- Verified: `make image-regen` live runs — agy 5/6 frame-converged + codex nanoshield (768x1376, `test_image_assets` GREEN); human-reviewed all 6 (peer-frame consistent). `make check` 461 green (heal + closure batch from the morning merge).
- Blockers: `make image-regen` spawns agents with permission-bypass flags → blocked by the auto-mode safety classifier for the agent to launch (human runs it — intended boundary). codex image-gen needs quota (hit usage-limit mid-day).
- Next: skill/icon integrity invariant now **UNBLOCKED** (11/11 icons) but **not yet implemented** — remove the `test_assets.py` skill-icon exclusion (~line 62) + add the assertion. Push main (ahead 5). Human verify in-app render.


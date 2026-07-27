# Progress Log

Last updated: 2026-07-28

Newest entries only; older 2026-07 increments are in `bin/docs/archive/progress-2026-07.md`
(and `progress-2026-06.md` for June). Milestone rollups live in `docs/COMPLETED_SUMMARY.md`.

## 2026-07-28 — Clean frozen-bank repair-0 arm completed; repair A/B blocked by turn gate
- Status: valid clean-base cohort complete — 0/3 accepted, 3/3 turn rejects (37/28/27 vs 12), 3/3 exact compensations, 0 dirty leftovers. Repair/retry/revision/subagent remained 0; no merge/push/deploy.
- Measured: valid actor wall/turns/cost/tokens = 504.072s/92/$2.7305/4,927,960. One excluded 1.2.0 pin-drift dispatch was terminated at 15 turns/$0.4674; total actual spend $3.1979, below approval.
- Audit: all three rejected commits stayed within expected task+bank scope and marked the selected item complete; actor-reported green is not external acceptance evidence because the turn gate rejected before verifiers. Ledgers are 11-event balanced and every compensation tree exactly matches its base.
- Verified: fresh preflight mypy 188, pre/post independent `make check` 1171 (5 skipped), final eval tree clean. Raw evidence: `outputs/overnight/heldout-v1-clean-baseline/`; report: `docs/reports/2026-07-28-heldout-v1-clean-repair0-baseline.md`.
- Owner decision: retain strict 12-turn acceptance, accept 0/3, and stop repair rollout. `OVERNIGHT_REPAIR=0`; never tune/retry bank v1. Any reopening needs preregistration, unseen bank v2, and fresh approval.
- Next: owner §3 two-style deployed live play supplies two non-fallback loop IDs; agent then audits/banks them and runs the narrative rubric. Harness remote publication remains separately approval-gated.

## 2026-07-27 — Fresh-worktree setup and base-green proof completed
- Status: clean-base prerequisite closed at `9ffad61`; no model call, fan-out, push, deploy, or remote publication.
- Changed: `dev` setup now installs the GCP SDKs imported by tests; environment doctor checks their imports in addition to mypy. NumPy remains constrained below 2.5.
- Measured: the first clean setup exposed the missing SDK seam; a focused Vertex test passed after installing the confirmed `gcp` dependency group. A second brand-new Python 3.13 worktree selected NumPy 2.4.6, mypy 2.3.0, google-genai 2.14.0, and google-cloud-storage 3.13.0.
- Verified: fresh preflight passed all imports and mypy 188; fresh and main `make check` each passed 1171 tests (5 skipped). The proof worktree is clean.
- Boundary/next: prior cohort remains invalid for productivity. No agent-runnable evaluation step remains; owner explicitly re-arms any new paid repair-0 cohort.

## 2026-07-27 — Frozen-bank cohort fail-closed 3/3; productivity baseline invalidated
- Status: three frozen tasks executed once each in a disposable branch with repair/revisions/subagents 0. Results: 0 accepted, 3 turn-budget stops (47/40/46 vs 12), 3 exact compensations, 0 dirty leftovers; 790.198s/$4.3584 total.
- Audit: no accepted diff existed. All rejected actors recorded the same base mypy error instead of implementing; independent reproduction found unlocked NumPy 2.5.1 stubs require Python 3.12 syntax while MythOS checks its 3.11 support floor. Downgrading only NumPy to 2.4.6 made mypy 2.3.0 pass 188 source files.
- Changed: constrain NumPy `<2.5`; overnight environment doctor now runs the Python typecheck before model dispatch. Raw logs copied to `outputs/overnight/heldout-v1-baseline/`; report `docs/reports/2026-07-27-heldout-v1-single-actor-baseline.md`. Final `make check` passed 1171 tests (5 skipped).
- Boundary: the cohort proves 1.3.4 real-call fail-close and compensation, not implementation productivity or repair lift. Repair/fan-out remain off; no bank task change, merge, push, deploy, or remote publication.
- Next: establish fresh-worktree base-green proof before asking the owner to re-arm a new paid cohort.

## 2026-07-27 — Harness 1.3.4 turn-budget fail-close released; held-out bank ratified
- Status: Done locally; post-run turn acceptance is enforceable and the three-task evaluation bank is frozen. No model call/push/deploy.
- Changed: upstream parses final `num_turns`, compares it with WorkContract `budgets.turns`, hashes the actor log into a typed check, and exactly compensates over-budget commits before verification. Built-in/external compilers share the turn value; missing successful Claude metrics fail closed.
- Verified: before/after fixture `14/12 success` → compensated `failed`; real retry evidence → `exceeded|31|12`; upstream 10 suites 136/136, syntax/JSON/npm/AGY/push-policy gates, tag/cache byte match, MythOS pin read-back, and five-path `make overnight-graph-smoke` pass.
- Release: upstream `c9a8ff7`, tag/cache `overnight-harness--v1.3.4`; MythOS graph version locks/pin updated locally.
- Blockers: turn/bank decision gate closed. Repair/fan-out/productivity claims remain held until the frozen single-actor baseline is audited; fan-out also requires explicit multi-agent authorization.
- Next: run all three held-out tasks in disposable evaluation worktrees with repair/revisions/subagents 0; never merge those commits.

## 2026-07-26 — Harness 1.3.3 retry contract alignment completed
- Status: Done locally; explicit `CONTRACT_RETRIES` is authoritative across external/built-in compilation and provenance. Upstream commit `0d2750e`, tag/cache `overnight-harness--v1.3.3`; no push or model call.
- Changed: one `contract_retry_budget` seam replaces unconditional `MAX_CONSEC_FAIL` injection; provenance records effective retries, per-invocation Claude cap scope, and no enforced mission-wide cost budget.
- Verified: same MythOS measurement `requested=0 compiled=1` → `0`; two full-runner fixtures cover external+built-in compilers; Harness 128/128, shell/JSON/npm package gates, byte-identical tag cache, MythOS five-path `overnight-graph-smoke`, and direct pinned compiler probe pass.
- Blockers: retry drift is closed. Contract `turns=12` remains unenforced (observed 54/31); owner turn semantics + held-out-bank ratification still block another real cohort and unattended expansion.
- Next: owner decision only; remote 1.3.3 publication remains separately approval-gated.

## 2026-07-26 — Dev Graph empirical baseline completed; expansion held
- Status: empirical report complete. Harness 1.3.2 deterministic graph/pause/fault matrix passed 110/110; real missions ended one correctly compensated and one independently audited accepted, with zero false accepts/scope escapes/dirty leftovers/persistent claims.
- Changed: added repeatable graph measurement + preregistration/report, hard Claude `$2.50` invocation cap, `/goal` 4,000-char preflight and false-success classifier guard, consumer gate documentation, and immutable retry evidence/Git bundle. Upstream local releases: 1.3.1 `3894dba`, 1.3.2 `31fe42b`; no push.
- Verified: Harness 126/126 + shell/JSON/npm package gates; current-release matrix 110/110 in 181.102s with 15/15 log hashes and unchanged MythOS worktree; retry ledger 15 events, balanced trajectory, scope 3/3, independent `make check` 1171 (5 skipped).
- Economics: first/retry actor = 400.529s/$2.0424/54 turns vs 223.234s/$1.1495/31 turns; descriptive only (n=1 per condition). Retry hard wall/USD, repair/revision/subagent, and single-invocation controls held.
- Blockers: contract turns were exceeded 54/12 and 31/12; requested retries 0 compiled as 1 though no retry ran. Overall HOLD for multi-iteration/repair/fan-out/general productivity; one-shot bounded dogfood only.
- Evidence: `docs/reports/2026-07-26-dev-graph-empirical-baseline.md` and `outputs/overnight/dev-graph-empirical-baseline/`.
- Next: offline-only contract retry-source alignment; owner chooses turn semantics and ratifies held-out bank before any new real-engine cohort.

## 2026-07-26 — Dev Graph P2 first real mission compensated and audited
- Status: P2 done as a valid non-fixture rejected trajectory; no actor change was accepted. Claude mission `mission-20260726-181623-39074` committed `1ae0d01`, the independent gate failed, and Harness restored the base with `80f44f0`.
- Changed: added immutable owner-approved MissionSpec compilation through the existing WorkContract evidence config, `15-regression-validity`, three focused tests, fixture subprocess lane isolation, and goal-turn inheritance in the compiler.
- Verified: baseline and reverted-base `make check` = 1171 tests (5 skipped); ledger 11 events valid; state terminal `rejected_by_gate`; trajectory reverted/balanced; actor scope exactly three docs; independent regression base 1/candidate 0; artifact manifest hashes all pass.
- Finding: runner ambient `OVERNIGHT_LANE=claude` overrode test `CONTRACT_ENGINE=codex`, so three adapter fixtures failed and critic/repo verifiers were skipped after gate RED. Fixtures now clear the inherited lane before testing the fallback; 10/10 pass from the same ambient parent.
- Budget: repair/revisions 0, subagents 0, wall 6m40s, cost $2.0424; Claude reported 54 turns despite contract 12 because the local CLI has no hard turn option and `/goal` is soft.
- Evidence: `outputs/overnight/p2-first-mission-mission-20260726-181623-39074/` contains ledger, logs, regression report, provenance, SHA256SUMS, and a Git bundle.
- Next: P3 uses only fake/disposable engines. Any second real-engine mission needs fresh owner approval plus a hard-budget-semantics decision.

## 2026-07-26 — Dev Graph P1 offline integration smoke completed
- Status: Done; `make overnight-graph-smoke` is the single read-only/offline consumer gate for released Harness 1.3.0.
- Changed: `scripts/overnight/graph-smoke.sh` runs design-blocked, accepted, reverted, repaired, and paused missions in disposable Git repos through the real MythOS contract compiler and fake engine; `Makefile` exposes the operator target.
- Verified: base-red→candidate-green, contract/provenance/evidence byte hashes, ledger sequence-corruption rejection, verifier-drift refusal, exact revert, bounded repair, durable pause, balanced deterministic trajectory, claim cleanup, and unchanged MythOS head/worktree. Two full runs produced identical output; `bash -n` and `git diff --check` pass.
- Blockers: P2 needs the owner to select/approve one real temporary mission. The actual MythOS ledger remains empty; remote Harness publication, repair, and fan-out remain gated.
- Next: plan §12 P2 — after mission approval, add design/slice/regression-validity fields and run once with repair 0, subagents 0, no push/deploy.

## 2026-07-26 — Harness 1.3.0 locally released and MythOS pin verified
- Status: P0 complete locally; upstream commit `bc48e8b` and annotated tag `overnight-harness--v1.3.0` exist only locally, with no remote push/marketplace publication.
- Changed: 1.3.0 packages the durable ledger, pause/resume, provenance, transition recovery, and causal trajectory; MythOS ignored `harness_root` now points to the tag-derived 1.3.0 cache instead of the personal source checkout. Plugin/MythOS docs name the five verifier exits (`0` pass, `1` hard fail, `2` inconclusive, `3` human, `4` repairable).
- Verified: upstream graph suites 116/116, schema/syntax/strict Claude+AGY/package/init gates, local tag read-back; MythOS `overnight-where`, init check, ledger/state/trajectory, resume wiring, immutable provenance validate/equivalent compare, and final `make check` 1168 (5 skipped).
- Boundary: empty ledger/state/trajectory proves wiring only, not a real mission. Public marketplace remains 1.2.0; remote publication, held-out ratification, repair, real mission, and fan-out remain owner-gated.
- Next: plan §12 P1 — implement the network-free, read-only `overnight-graph-smoke` with five disposable path fixtures; no push/deploy.

## 2026-07-26 — Live-QA owner checklist refreshed for the final deployed verdict
- Status: Done; the manual-owner surface remains 3 active judgments + 8 passive observations.
- Changed: `docs/test/neo_seoul_live_qa.md` now names the last evidenced deploy `00078-rs9`, requires two production loop IDs and a non-fallback audit, folds image/icon/loadout/intro-tone watches into the same play, and adds a result template.
- Verified: structural count 3/8, `git diff --check`, ledger/state/trajectory operator read-back, and final `make check` 1168 (5 skipped). Live revision re-query was blocked by unattended network policy, so the doc says “last evidenced,” not confirmed-current.
- Blockers: owner must play the two styles and supply both loop IDs; held-out bank composition remains owner-unratified.
- Next: audit both IDs for non-fallback, bank them, then run the narrative rubric/held-out split.

## 2026-07-26 — Graph P0-A/P0-B/P1-A/P1-B/P1-C completed upstream
- Status: Substrate implementation checkpoint, later released/pinned locally by the newest entry above; at this checkpoint it was still uncommitted and source-checkout-only.
- Changed: durable ledger/evidence, resumable human pause, canonical provenance, idempotent transition recovery, and read-only causal/accounting trajectory now share one authoritative JSONL seam; full detail is preserved in `COMPLETED_SUMMARY.md` M67–M70.
- Verified: accepted/repaired/reverted/needs-human replay, source↔child accounting, 8 real-`SIGKILL` edges, and negative fail-close; harness 10 offline suites 116/116 plus schema/syntax/package/init/AGY/diff gates pass.
- Consumer: MythOS ledger/state/resume/provenance/trajectory targets resolve against the checkout; final `make check` 1168 (5 skipped).
- Next: owner §3 + held-out ratification; P2 read-only fan-out additionally requires explicit multi-agent authorization.

## 2026-07-26 — deterministic residual cleanup + Su-ah title clarity
- Status: Done. `b10bf59` removes the two truly unused React lint suppressions while retaining the one justified effect-boundary suppression; ESLint now reports 0 errors/0 warnings. `f90c3db` closes the deferred Su-ah rename.
- Changed: player-facing character/ally alias + KO/EN Story Bible use existing canonical `기억의 대장장이` / `Blacksmith of Memory`; legacy `잔향 가공사` remains keyword/glossary-only so old persisted narration still detects/recruits correctly.
- Verified: focused content integrity 2/2; route content valid; final `make check` 1168 (5 skipped), lint warning-free; official post-commit AGY `PASS_CANDIDATE`, evidence `outputs/live-qa/20260726-005229-post-commit/evidence-bundle.json`.
- Next: no actionable `[auto]` or deterministic unowned item remains. Owner §3 play + held-out-bank ratification unlock the next agent work; push not performed.

## 2026-07-26 — CombatCinema slice B landed; frontend decomposition track closed
- Status: Done. Timeline commit `5247719`; no actionable `[auto]` backlog remains.
- Changed: callback refs, fast/standard timing profiles, attack→impact→exit phase transitions, impact/finish cues, and four-timer cleanup moved behind `useCombatCinemaTimeline(...) → phase`; `useCombatCinema.ts` 181→125. Remaining image fallback is kept inline because another seam would be shallow.
- Verified: Serena diagnostics 0; focused responsiveness tests 4/4 (new timing/dependency/cleanup lock); lint 0 errors (2 pre-existing warnings); build; final `make check` 1167; official post-commit AGY `PASS_CANDIDATE`, evidence `outputs/live-qa/20260726-004325-post-commit/evidence-bundle.json`.
- Next: owner §3 deployed two-loop verdict + held-out-bank ratification; after owner play, agent banks loop IDs and runs rubric/held-out evaluation. Push not performed.

# Progress Log

Last updated: 2026-08-02

## 2026-08-02 — Boon/echo modal 409 wedge fixed and deployed (`mythos-api-00083-jt7`)
- Status: the AMP-shard/echo-inscription overlay no longer wedges on stale offers; deployed at 100% traffic (root+health 200, live/local `app.js` SHA-256 match). Commit `015b620`; push owner-run.
- Changed: the pick handler treats a 409 `… not in the current offer` conflict as consumption — the pick (or a prior one) already landed server-side and the visible offer is stale — and drops the stale offer locally so the overlay closes; other errors still propagate. Accepted picks keep the existing snapshot-apply close path.
- Verified: rendered local reproduction — consumed the offer server-side behind the UI's back, clicked the stale card, observed 409 → modal closed (previously wedged until reload+Resume). `make frontend-lint`/`frontend-build` green; final `make check` 1193 tests (5 skipped).
- Next: rerun one fresh 47/47 zero-fallback arm on `00083-jt7`, then collect the owner's subjective ending/overall verdict.

## 2026-08-02 — Normal-turn retry gap fixed and deployed (`mythos-api-00082-ffc`)
- Status: the streamed parse-fail non-streaming retry now runs on player-facing turns; deployed at 100% traffic as `00082-ffc` (env-preserving; MODEL/IMAGEN pins and 3600s timeout confirmed intact; root+health 200). Commits `fc1a1a6` (fix) + docs; push owner-run.
- Diagnosed (protocol): reproduced locally with an unparseable-stream/valid-generate fake provider. `RuntimeOptions.fast_mode` defaults True on every API flow → `context.fast_mode=True` → `_repair_enabled` returned False → the b55e933 retry never fired in production. This also explains the 07-19 "unparseable warning 0 in 5 days" reading — the warning was on a disabled path, not evidence of zero runaways.
- Measured before→after (same fixture, fast_mode=True): retries 0→1, outcome fallback→success, canned title→real scene. Explicit `repair_enabled=False` still skips the retry.
- Changed: `_stream_generate_legacy` now consults a dedicated `_stream_retry_enabled()` gate that ignores fast_mode; `_repair_enabled` (non-streamed legacy repair) is untouched. Regression locked in `StreamedParseFailRetryTest` (2 tests).
- Verified: focused director tests 17/17; final `make check` 1193 tests (5 skipped) green.
- Next: AMP-shard modal non-dismiss fix remains open; then rerun one fresh 47/47 zero-fallback arm on `00082-ffc` and collect the owner verdict.

## 2026-08-01 — Fresh §3 arm attempt excluded at 13/14; typed fallback evidence validated in production
- Status: direct browser play of a fresh EN Ghost people/help arm on `mythos-api-00081-8lc` (`loop_8b7a32b28b5145b497be2c3a70b60dc2`) stopped at story scene ~13. Cloud Logging shows 13/14 narrative success + 1 fallback → the arm cannot be a 47/47 promotion sample and was not banked. Also committed the deployed 07-31 source/docs bundle as `272f89b` (main ahead; push owner-run).
- Typed evidence first real capture: the fallback logged `fallback_reason=parse_error` on the `narrative outcome` event (11:55:43Z, non-key-beat post-flee continuation turn, latency 11.6s, `VertexGeminiJSONProvider`).
- Retry gap (needs diagnose before the next paid arm): the parse_error turn served the canned fallback without the `streamed payload unparseable, retrying non-streaming` warning, although the revision does not set `MYTHOS_FAST_MODE`. Suspect request-level `options.fast_mode` on the post-combat continuation path or a `_repair_enabled` gating gap; at ~1/14 per-turn fallback odds a 47-turn zero-fallback arm is unlikely until the retry actually fires on normal turns.
- Remediation field readout (positive): after both defeats, no ambient combat re-entered within 3 narrative commits even at tension 90–100; early-loop locations varied (neon alley → subway ruins → patrol bypass → data incinerator); no cosmetic `Changed …` titles appeared.
- Remediation field readout (watch): the NoveltyController deterministic revision emitted its own repeated template — `New Vector at …` titled 4 scenes (7/8/9/11) — so the revision surface is now the repetition. The ambient/route combat served the identical `Patrol Ambush` encounter (same 2 maintenance drones, same board, same interstitial and verbatim defeat copy) 3 times; Flee at 3HP resolved as Defeat/CAPTURED.
- UI defects reproduced: AMP SHARD/INSCRIBE modal does not dismiss after a server-accepted pick (re-click → 409 `not in the current offer`; once as a mid-combat overlay; reload+Resume recovers). KO strings still appear in the EN UI (Patrol Bypass route-node description, `획득` LAST RESULT token, KO text baked into a scene image).
- Next: diagnose/fix the normal-turn non-streaming retry gap, then rerun one fresh arm; the excluded loop stays live server-side for owner disposal.

Newest entries only; older 2026-07 increments are in `bin/docs/archive/progress-2026-07.md`
(and `progress-2026-06.md` for June). Milestone rollups live in `docs/COMPLETED_SUMMARY.md`.

## 2026-07-31 — Repetition remediation and Gemini 3.1 image migration deployed
- Status: `mythos-api-00081-8lc` serves 100% traffic; `main` remains pushed through `c89a87c`, while this completed source/docs bundle is uncommitted.
- Changed: ambient combat cooldown now counts narrative commits and protects post-flee scenes; route/boss overrides remain. `NoveltyController` enforces normalized title/location/motif structure while preserving opening/fixed anchors; typed fallback fields remain visible.
- Model: image default moved from retiring 2.5 to `gemini-3.1-flash-image` at `global`; narrative remains `gemini-3.5-flash`. A real pre-fix regional call reproduced 404 and the global call produced a valid 1024² PNG.
- QA: focused 94 tests, lint/typecheck/build, `make smoke-local`, and `make check` passed 1191 (5 skipped). Production health/root passed; six initial narrative calls were success/fallback 0.
- Diagnose/re-measure: a 280.016s WS request expired under the 300s Cloud Run timeout 3.1s before the deferred image event. Timeout is now 3600s; CDP then observed `snapshot`→`visual_status{succeeded,url}`, DOM changed to the new scene asset, and the generated image rendered.
- Blocker/next: deterministic scope is closed. The partial QA loop is not promotable; complete and audit one fresh 47/47 zero-fallback arm, then collect the owner's subjective ending/overall verdict.

## 2026-07-28 — §3 direct production play produced one valid arm; safety/evidence replacement required
- Status: people/help `loop_c661…25bb` completed through Forced Erasure; safety/evidence `loop_f148…2350` reached 14 story turns but is invalid for the style pair.
- Measured: same player; people/help 89 scenes / `_story_turn=46` / 3 combat wins / 1 defeat / 47 of 47 narrative generations succeeded. Safety/evidence 20 scenes / `_story_turn=14`; 12 of 15 generations succeeded and 3 fell back.
- Changed: banked only the valid arm as `scripts/eval/golden/prod-people-help-20260728.json`; added fail-closed `bank_loop.py --language` handling because legacy production loops do not persist language and were silently mislabeled KO.
- Verified: Cloud Logging full-loop audit; DB read-back; narrative-eval unit tests 13/13; corrected EN judge report `outputs/evals/20260728-020105/` = overall 3/5 (continuity 2, register 4, repetition 2, naming 4, choices 3).
- Findings: repeated late escape/combat cycles, duplicate scene openings, and dropped choice consequences remain visible in the valid arm. The invalid arm is not banked or used for a style verdict.
- Blockers: the three subjective owner judgments remain open; a fresh zero-fallback safety/evidence production loop is required before pair scoring.
- Next: run and audit one replacement safety/evidence arm, bank/judge the valid pair, then collect the owner's three checklist judgments. No commit/push/deploy.

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

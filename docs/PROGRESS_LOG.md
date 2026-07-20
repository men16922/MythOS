# Progress Log

Last updated: 2026-07-20

## 2026-07-20 — V2 release-bundle evidence 3/3 COMPLETE on 00078-rs9 (7/7 PASS)
- Status: Done. Agent ran `scratch/run-release-calibration-00078.sh` directly (`bash scratch/*` owner-allowlisted) and audited.
- Measured: six-assertion contract 6/6 PASS + `route_axis_chip` rider PASS at HEAD `f3e1fc3` (= deployed `00078-rs9` app source; trailing commits docs-only). Audit: required PASS 7/7 · artifact hashes 32/32 · evidence screenshots present · decisions/manifest agree. Collection wall-clock 465.8s (7.8 min unattended; mean 66.5s/run).
- Spot check: `route_axis_chip` turn-4 junction screenshot manually verified destination-true (clue→`단서 찾기`, anchor→`사람 돕기`, event→chipless); deployed icon set renders in evidence. 0 false accepts observed.
- Report: `report-evidence.py` → attention 1 (known 07-19 post-commit NEEDS_HUMAN, retained), clean 23 → deterministic sample 3, invalid 0. Human-review surface = 4 bundles (~3 min) vs the 16-item manual checklist.
- Evidence state: release bundles = **3/3** (07-19 local build · `00077-8g9` · `00078-rs9`), 0 observed false accepts across all calibrations. Formal 16-item reduction (target 6 auto / 8 monitored / 2 human) is now an owner ratification decision.
- Next (owner): ratify the reduction split · §3 two-style verdict on `00078-rs9`.

## 2026-07-20 — DEPLOYED `mythos-api-00078-rs9`: icon set + loadout editor + aim badge
- Status: **DEPLOYED at 100% traffic** (commit `c51cf63`; owner pushed `4a43904..c51cf63`). Third distinct release for Harness V2 evidence.
- Live: root + `/api/v1/health` 200; live/local `app.js` SHA-256 match (`08c0be0c…`); model pins preserved (`MODEL=gemini-3.5-flash`, `IMAGEN_MODEL=gemini-2.5-flash-image`).
- Prepared: `scratch/run-release-calibration-00078.sh` — six-assertion contract (counts toward 3/3) + `route_axis_chip` rider (max_turns=6). Owner-run (agy permission); agent audits bundles + report after.
- Next (owner): run the 00078 calibration script · §3 two-style non-fallback verdict on the deployed bundle (banks loop ids + first app-path image since the 2.5 pin).

## 2026-07-20 — Skill quick-slot config moved to a separate loadout editor (owner request)
- Status: Done. Owner: per-slot ⇄ swap pickers cluttered the bar — pull slot setup out into its own surface.
- Follow-up (same session): the aim(🎯) toggle's full-height side column read as a broken empty strip (owner) — now a small round corner badge over the art's bottom-right (GameIcon `crosshair`; armed = gold pulse card border), mirroring the landscape-coarse overlay. Verified in the combat sim: no empty columns, badge + armed state render, console errors 0.
- Changed: `CombatControls` skill header gains one ⚙ 편성 button opening a modal (`cc-loadout`): 6 numbered slot tiles + full learned-skill grid; tap a slot then a skill to place it (already-slotted skills trade places, selection auto-advances). Same per-scenario+actor localStorage persistence; per-slot ⚑/menu JSX+CSS removed, `cc.swap*` strings replaced by `cc.loadout.*` (KO/EN). `gear` icon added to GameIcon.
- Locks: `test_desktop_combat_split.py` re-locked to the new design (asserts loadout modal present AND per-slot picker absent — deliberate owner reversal of the 2026-07-13 swap-picker design; do not reintroduce).
- Verified: full `make check` green (1161 OK); combat-simulator browser QA — bar shows no per-slot affordance, modal assigns/swaps slots with live bar update, console errors 0.
- Next: owner feel-check during next combat playtest; rides the next deploy.

## 2026-07-20 — Custom SVG icon set replaces text-glyph UI icons (CBT feedback)
- Status: Done. Tester feedback (Discord, MelGibzon): the "⚔ Combat" chip renders as a thin red ✕ on platforms without the glyph — replace text glyphs with custom icons.
- Changed: new `icons.tsx` `GameIcon` inline-SVG set (19 icons, currentColor + 1em sizing, stroke style matched to existing `assets/icons/combat-*.svg`). Applied to: route map nodes/legend/anchor star + ambient minimap tiles/legend (GameAside), choice combat-risk chip, combat interstitial titles + joining flag, save-slot combat marker/placeholder, tactical board key + learning-goal bullseye, market launcher, turn-order attack badge, epiphany banners. Glyphs stripped from affected i18n strings (`amap.legend` → composed items + `amap.legend.contacts`).
- Kept: canvas-drawn emoji (combatCanvas), skill-tile fallback symbols (PNG art covers them), color-emoji intents (👣🏃💫) — text-presentation glyphs were the broken class, not color emoji.
- Verified: full `make check` green (1160 OK, 5 skipped); rendered browser QA on local fallback loop — compact+expanded route map and all 9 legend chips render the new icons (swords/magnifier/rings/bag/cross/spark/skull/star/diamond), console errors 0.
- Next: owner eyeballs the icon feel in the next §3 playtest; rides the next deploy.

## 2026-07-20 — route_axis_chip: 7th objective assertion shipped + calibrated
- Status: Done. §2 갈림길 가치축 칩 정합이 objective-QA로 자동화됨; live-QA checklist §2는 느낌 판정만 남김.
- Changed: `artifacts.py` evaluator independently re-encodes destination→chip policy (double-entry vs serializer; anchor = flag-scored perspective mirror, waypoint = type policy; chip-on-axisless fails, chipless-only evidence stays not_observed); `PROMPT.agy.md` actor procedure (lang=ko, ≤6 transitions to junction, DOM chip by index, node/flags verbatim from `/loops/active`).
- Verified: `test_live_qa_artifacts` 28/28 (pre-fix keyword-lie shape fails; incomplete evidence never passes); full `make check` green; calibration run `calibration-20260720-route-axis-chip-1` PASS with real turn-4 junction evidence (event=no chip, rest=안전하게 가기), artifact hashes 5/5.
- Note: release-bundle 3/3 evidence stays on the six-assertion contract for comparability; route_axis_chip rides alongside from the next collection. Residual: clue/anchor junction shapes not yet observed live (policy matrix locked by unit tests).
- Next: owner §3 two-style verdict; third release bundle on next deploy (six + new assertion).

## 2026-07-20 — V2 release-bundle 2/3 evidence collected on 00077-8g9 (6/6 PASS)
- Status: Done. Owner ran `scratch/run-release-calibration-00077.sh` (agy allowlisted in settings.local.json per owner); agent audited.
- Measured: six assertions all PASS_CANDIDATE at HEAD `4a43904` (= deployed `00077-8g9` app source; later commits docs-only). Audit: required PASS 6/6 · artifact hashes 25/25 match · required-evidence screenshots all present · decisions/manifest outcomes agree.
- Report: `report-evidence.py` → attention 1 (the known prior post-commit DB exception, retained), clean 15 → deterministic sample 3 (cap), invalid 0.
- Evidence state: release bundles with the full six-assertion contract = **2/3** (07-19 local build + `00077-8g9`). Remaining: one more distinct release + human-minutes measurement before changing 0/16.
- Next: third release bundle rides the next deploy (post-§3-verdict). Owner: §3 two-style playtest · `git push`.

## 2026-07-20 — Live-QA checklist on 00077-8g9; slice-15 candidates proposed
- Status: Done. Agent-runnable queue is drained; every open item now waits on owner input.
- Changed: `docs/test/neo_seoul_live_qa.md` rebased to `00077-8g9` (+1 갈림길 가치축 칩 check; image-arrival doubles as post-pin first confirmation; 17 open items). Checklist hash changed → browser QA re-eligible.
- Changed: slice-15 decomposition proposal `docs/plans/2026-07-20-app-decomposition-slice15-candidates.md` (useCombatTutorial 추천 · useInviteGate · EpiphanyBanner; shallow `useSessionChrome` explicitly rejected); track stays `[blocked]` until owner picks.
- Verified: doc-budget gate; `git diff --check`. Commits `b8d0f91`, `6621ef6`; branch ahead of origin — push owner-run.
- Next (owner): `git push` · `bash scratch/run-release-calibration-00077.sh` · §3 two-style verdict (bank loop ids) · pick slice 15 / judge T5c.

> Older entries: `bin/docs/archive/progress-2026-07.md` (July), `progress-2026-06.md`, `progress-2026-05.md`.

## 2026-07-19 — V2 release-2 calibration armed + prod watch audit
- Status: Done (prep + audit). Session commits `fc4ebc5`/`feac385`/`a06034f`; branch ahead 3 — `git push` is owner-run.
- Changed: `scratch/run-release-calibration-00077.sh` reproduces the 2026-07-19 six-assertion calibration contract verbatim (trigger=calibration/case=probe/mode=fallback, companion_join turns=3, run ids `release-00077-8g9-*`) for Harness V2 release-bundle 2/3 evidence; invocation params recovered from `outputs/live-qa/calibration-20260719-*` manifests.
- Blocked: the runner launches `agy --dangerously-skip-permissions` (permission hard block) — owner runs `bash scratch/run-release-calibration-00077.sh` (~8-9 min); agent then audits bundles + `report-evidence.py`.
- Verified: preflight green (agy 1.1.4, gtimeout, venv, Postgres up). Prod watch audit (read-only): `streamed payload unparseable` 0 in 5 days; zero app-path image attempts since the 2.5 pin (only pre-pin 3.1 404 ×3), so §3 verdict loops double as image-continuity confirmation; psycopg_pool teardown traceback noise 4/5d (benign, scale-to-zero); `00077-8g9` warnings/errors 0.
- Next: owner triad — `git push` · run the calibration script · §3 two-style non-fallback verdict on `00077-8g9` (bank loop ids).

## 2026-07-19 — §3 route label→axis alignment: junction-pick accrual + destination-true chips
- Status: **DEPLOYED `mythos-api-00077-8g9`** at 100% traffic (commit `fc4ebc5`; push pending — private-repo push is owner-run). Deployed dull/sensitive owner verdict now unblocked.
- Live: Cloud Build SUCCESS; root + `/api/v1/health` 200; model pins preserved (`gemini-3.5-flash` narrative, `gemini-2.5-flash-image` image). Production data untouched.
- Diagnosed (from `loop_5b212d`/`loop_22e71c` DB data): (B) waypoint nodes (clue/rest/patrol/combat) have no perspectives, so explicit evidence-route picks tallied nothing and `insight_focus` was unreachable in normal play (bootstrap deadlock — final flags were `[fallback_scene, safe_refuge]` only); (A) the UI value-axis chip came from a keyword heuristic — all four stored junction labels classified as `단서 찾기` (badge word `추적도` included), and the rn4 anchor showed `단서 찾기` while applying people-axis `p_rescue`.
- Changed: `route_runtime.advance_route` records explicit `junction_picks` and accrues the picked waypoint's axis (clue→evidence, rest/patrol→safety, combat→control; authored `axis` override wins) in causal order, replay-safe; `serializers._choice_to_dict` derives `route:` choice chips from the destination (anchor → `select_perspective` axis under current flags, waypoint → `node_axis`), omits the chip when no axis (market/event), and keeps the keyword heuristic for Director choices only.
- Verified: 10 new regressions (4 route_runtime accrual/replay/auto-walk + 6 serializer chip); re-measured on the real stored loop — replaying `loop_5b212d`'s picks now yields `evidence:1` (was 0) + `stability_focus`, and the four stored labels render `사람 돕기`/`단서 찾기`/`안전하게 가기`/no-chip correctly; full `make check` **1158 OK** (5 skipped, 2 pre-existing frontend warnings).
- Blockers: none. `axis_tally` has no consumers outside route_runtime; EN i18n labels already exist for all four chips.
- Next: owner runs the paired non-fallback dull/sensitive verdict on deployed `00076-jhc` (deploy the fix first via `make deploy`); then resume three-release Harness V2 evidence.

## 2026-07-19 — Blank-narrative fallback hardened; same-character style pair completed locally
- Status: Code/test slice and local rendered QA complete; no commit/push. Deployed `00076-jhc` dull/sensitive owner verdict remains open.
- Changed: `parse_story_text` now rejects cleaned-but-empty narration so dual-model output falls back to an authored scene; parser/director regressions cover blank fenced story output and two-choice fallback.
- QA: same Ghost/player completed two 46-turn loops through IX: people/help `loop_22e71c...` vs evidence-then-safety `loop_5b212d...`; screenshots saved under `outputs/live-qa/manual-20260719-style-pair/`.
- Measured: people/help = `people:2,safety:1`, `p_trust/p_rescue/p_refuge`, Safe Refuge 3; comparison = `people:1,safety:1`, `p_trust/p_refuge`, Safe Refuge 2. Both boss escapes resolved `ending_erasure`.
- Finding: evidence-labeled choices did not produce an `evidence` tally in the comparison loop, and at least one `p_rescue` route destination rendered as `단서 찾기`; UI value-axis and applied perspective need a regression/diagnosis before sign-off.
- Verified: focused blank-output tests 2/2; narrative parser/streaming modules 19/19; `AxisIntentFlagTest` 3/3; full `make check` **1148 OK** (5 skipped, 2 pre-existing frontend warnings); rendered browser console warnings/errors 0; `git diff --check`.
- Blockers: second loop intentionally used `?fallback=1&image=0` after the same-player loop was created, so subjective prose/image feel and distinct ending feel were not judged; production was not mutated.
- Next: lock/fix route label→perspective/axis alignment, then run the paired non-fallback owner verdict on deployed `00076-jhc`; after that resume three-release Harness V2 evidence.

## 2026-07-19 — Docs context optimized; plugin skill ownership aligned
- Status: Done. Documentation/agent-workflow maintenance; product/runtime behavior and active priority are unchanged. No commit/push performed.
- Changed: kept the newest progress entries and archived 10; reduced open-plan noise; refreshed the architecture/index; moved 4 completed plans to `bin/docs/plans/`; updated moved-path references; removed ignored `.DS_Store` files.
- Changed: removed six stale no-prefix harness skill copies from `.claude/skills` and `.agents/skills`; plugin 1.1.0 now solely owns sync/checkpoint/tidy/diagnose/report/seed, while MythOS keeps only `gameplay-qa` and `codebase-design`.
- Guarded: `harness/sync-skills.sh` now rejects reintroduced plugin duplicates; AGENTS/CLAUDE/current engineering and review docs use namespaced plugin calls. Objective evidence projection remains repo-owned after plugin morning review.
- Verified: `make overnight-where`; `make check-skills`; `make check-doc-budget`; shell syntax; stale-path scan; `git diff --check`; full `make check` **1146 OK** (5 skipped, 2 pre-existing frontend warnings).
- Blockers: none. The larger existing uncommitted Harness V2/UI bundle remains preserved; no commit/push performed.
- Next: run owner §3 same-character two-style balance QA, bank both loop ids, and record the dull/sensitive verdict; then repeat Harness V2 evidence across three release bundles.

## 2026-07-19 — Harness V2 cutover + objective QA reporting exercised
- Status: Implementation complete; all six objective assertions are locally live-calibrated. Eight required runs PASS with 0/8 observed false accepts. Formal reduction remains 0/16 because evidence still covers one local build. No commit/push performed.
- Changed: released plugin source metadata as 1.1.0 with external required contracts, real Codex commit probe/common-dir boundary, bounded verifiers, and typed `needs_human` evidence; 51 offline checks pass.
- Changed: MythOS now compiles lane-aware contracts and registers diff-scope, gameplay, browser-objective, and image-identity verifiers; six explicit browser assertions (image arrival, companion join, party distribution, cutscene cardinality/return, choice arrival, first-use gloss) emit hashed `evidence-bundle.json` records and fail closed when required evidence is missing.
- Changed: `report-evidence.py` projects all failures/`needs_human`/invalid/disagreement bundles plus a deterministic 20% clean sample (min 1, cap 3); persisted production-state fixtures now place browser QA one transition before companion/cutscene behavior and directly in a real 4-person combat, while gloss evidence is extracted from exact DOM terms.
- Retired: repo-local runner/status/dashboard/notify, duplicated actor prompts, and the stale Make snippet. `harness-init --check` reports no vendored behavior.
- Verified: authoritative six-bundle audit = required PASS 6/6, artifact hash mismatch 0, 507.7s total/84.6s mean. Manual screenshot/event review found 0/8 false accepts across three choice runs plus five remaining assertions; report keeps the prior DB exception and samples clean 9→2. Fixture unit tests 2/2; full `make check` 1146 OK (5 skipped).
- Blockers: all calibration runs share one local build rather than three distinct releases; plugin publication remains separate. Product/runtime behavior was unchanged.
- Next: owner §3 two-style balance playtest; then collect the six-assertion contract on three distinct release bundles and measure human minutes.

## 2026-07-18 — Live QA checklist reduced to open human tests
- Status: Done. Active priority and completion state are unchanged.
- Changed: `docs/test/neo_seoul_live_qa.md` now contains only the 16 unchecked human-play tests for `00076-jhc`; completed lanes and implementation/automation notes were removed.
- Structure: mobile residuals, two-style balance, image continuity, companion/party balance, full-run feel, and narrative/connection stability.
- Verified: no `[x]`/`[~]` markers remain; 46 lines, 16 open checkboxes; `git diff --check` and doc-budget gate pass.
- Next: owner §3 two-style playtest remains first; record both loop ids and dull/sensitive verdict.

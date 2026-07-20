# Progress Log

Last updated: 2026-07-21

Newest entries only; older 2026-07 increments are in `bin/docs/archive/progress-2026-07.md`
(and `progress-2026-06.md` for June). Milestone rollups live in `docs/COMPLETED_SUMMARY.md`.

## 2026-07-21 — slice 17 (`useInviteGate`) landed
- Status: Done (code). Owner directed slice 17 = `useInviteGate` (lowest-risk candidate from the slice-16 doc).
- Changed: closed-beta invite gate (isAdmin/inviteGated/inviteGate state, mount probe, fail-open policy, `handleInviteSubmit` key-store+re-probe) → `hooks/useInviteGate.ts`; zero inputs (api module internal). App aliases `{ gate, gated, isAdmin, submitKey }` to preserve consumer names. App.tsx 1010→979 (under 1000). Commit `fe1585c` (push owner-run).
- Verified: full `make check` green (1161 OK); lint/build clean; no dangling setters, all consumers resolve. Behavior-preserving (identical probe/submit logic moved).
- Next: decomposition deep-candidate pool now thin (only `EpiphanyBanner` presentational-only + `useItemNotice` mention-only left in the slice-16 doc) — a fresh survey needed before slice 18. Owner-gated: eval-bank script + §3 verdict + push.

## 2026-07-21 — slice 16 (`useIntroSequencer`) landed + slice-17 candidates + eval-bank armed
- Status: Done (code). Owner picked slice 16 = `useIntroSequencer` from the fresh candidate doc (`docs/plans/2026-07-21-app-decomposition-slice16-candidates.md`).
- Changed: B2 opening-variant resolution (openingVariant state, meta-frame-vs-snapshot race, 12s dead-stream reveal timer, per-loop reset, introData/introVariantKey selection) → `hooks/useIntroSequencer.ts`; App.tsx 1050→1010. `setOpeningVariant` exposed for the WS onLoopMeta callback. Commit `68a6dc4` (push owner-run).
- Verified: full `make check` green (1161 OK); lint 0 errors / build clean; no dangling refs, wiring confirmed. Behavior-preserving (identical expressions moved). **Loop-2 non-fallback intro branch is live-only — unverified locally**; watch = post-commit AGY live-QA + owner §3 (no flash-then-swap; 12s fallback still reveals).
- Also: eval-bank owner-run script prepared (`scratch/bank-style-pair-loops.sh`) — banks the two prod style-pair loops (prefix-resolve `loop_22e71c…`/`loop_5b212d…` against prod DSN, read-only); prod-DB access is classifier-blocked for the agent, so owner runs it, then agent runs `make eval-narrative`.
- Next: owner `git push` + run bank script → agent `make eval-narrative`; §3 two-style verdict on `00078-rs9`; slice-17 candidate from the slice-16 doc (`useInviteGate`) on request. Log at budget → run `/tidy-docs`.

## 2026-07-21 — QA reduction ratified + slice 15 (`useCombatTutorial`) landed
- Status: Done. Owner ratified the live-QA split (5+1 auto / 8 monitored / 3 human; `docs/plans/2026-07-21-live-qa-reduction-split.md`) — checklist restructured to 직접확인 3 / 이상시기록 8, active-play surface 16→3. Owner also picked slice 15 = `useCombatTutorial`, lifting the decomposition `[blocked]`.
- Changed: first-combat tutorial policy (localStorage gate, first-combat meta detection, step derivation, move/wait rule, action-decorator, overlay advance) extracted to `hooks/useCombatTutorial.ts`; App.tsx 1102→1050 lines, duplicate overlay `onNext` logic absorbed into the hook's `advance`.
- Verified: full `make check` green (1161 OK); rendered sim QA of every path — overlay gates on fresh player, plain 대기 does NOT satisfy the move step, `다음` advance 0→1, attack action match 1→2 with `tut-glow` on 공격, skip writes `seen=1` and dismisses; console errors 0.
- Next: rides the next deploy; decomposition track open for a slice-16 candidate when wanted.

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

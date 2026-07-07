# Progress Log

Last updated: 2026-07-08

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

## 2026-07-08 (overnight, claude lane) — T6a concise-mode state + persisted toggle (Track M/T6 mobile foundation)
- Status: Done; `make check` **920** green (+1 test). First T6 slice (info-density mode), gated on Track M
  (M1-M3) which just finished; adds only the state/toggle infra — no panel collapsing yet (T6b/T6c).
- Changed: new `conciseMode.ts` (Context/hook, `mythos_concise_mode` localStorage key, `resolveInitialConciseMode`
  defaults ON via `matchMedia('(pointer: coarse)')`/`(max-width: 600px)` unless the user has an explicit stored
  choice) + `ConciseModeProvider.tsx` (toggles a `concise-mode` class on `<body>` for future CSS-only T6b/T6c
  slices to key off, no visual effect yet since no selector uses it). Mounted in `main.tsx` alongside
  `LangProvider`. `HeaderBar.tsx` — new `concise-toggle` button (same is-on/is-off shape as `bgm-toggle`) so
  desktop users can opt in even though their default is OFF. `index.css` — button styling + M2 44px/13px
  phone-breakpoint rows extended to include it. i18n `hdr.conciseOn`/`hdr.conciseOff` KO+EN.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 920, 2 skipped, validate-content 2);
  new `test_concise_mode_state_is_persisted_and_device_aware` source-locks the context/provider/wiring shape.
- Blockers: none. Next: T6b collapse secondary aside panels (Save/OperationMap/Log) into summary chips
  (`[auto:claude]`), then T6c combat-panel density reduction.

## 2026-07-08 (overnight, claude lane) — M3 GameAside no-click-div tooltips tap-openable (Track M mobile foundation, 3rd of ~20 sites)
- Status: Done; `make check` **919** green (+1 test). Converts the 4 `GameAside.tsx` sites that had no click handler at all (route node, fog stub, minimap enemy cell, minimap tile cell) — highest touch-info-loss of the M3 sites since they had zero tap affordance, not just a supplementary title on an already-tappable control.
- Changed: `GameAside.tsx` — new shared `InfoPopover` component (same tap-toggle/pointerdown-outside-close shape as `ChoicePanel`'s `AxisChip`/`CombatControls`' `SkillInfoTooltip`, generalized since each call site needs its own hook state); wraps the route-node div (multi-line lock/risk/reward/perspective text), the fog stub, the minimap enemy-contact cell, and the minimap tile cell (skipped when `tile.name` is empty). `index.css` — `.aside-info-hint`/`.aside-info-tooltip`/`.aside-info-open` shared popover rules. `tests/test_ui_clarity_affordances.py` — `test_game_aside_info_divs_are_tap_openable` locks the shape. Judged out-of-scope: `GameAside`'s other 2 title sites (expand/hints-toggle buttons) are supplementary — visible label + click action already work on touch.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 919, 2 skipped, validate-content 2).
- Blockers: none. Next: remaining M3 sites — `CombatControls`×2 (attack/item buttons, supplementary title), `StoryPanel`×3 and `HeaderBar`×2 (icon/toggle buttons, judge in-scope before converting) (`[auto:claude]`).

## 2026-07-08 (overnight, claude lane) — M3 combat-skill tooltip tap-openable (Track M mobile foundation, 2nd of ~20 sites)
- Status: Done; `make check` **918** green (+1 test). Second M3 site after the T4a axis chip; addresses the combat skill button's cost/range/cooldown/effect detail, hidden on touch even though the button already casts on tap.
- Changed: `CombatControls.tsx` — new `SkillInfoTooltip` (same tap-toggle/pointerdown-outside-close shape as `ChoicePanel`'s `AxisChip`), nested as a stopPropagation'd ⓘ icon inside the skill `<button>` so a tap previews detail without casting; drops `title={tooltip}`. `index.css` — `.cc-skill-info*` popover rules (`.cc-skill` gets `position: relative` to anchor it). `tests/test_ui_clarity_affordances.py` — `test_combat_skill_tooltip_is_tap_openable` locks the shape.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 918, 2 skipped, validate-content 2).
- Blockers: none. Next: remaining M3 sites — `GameAside`×6 (route-node/minimap divs have no click handler at all, highest touch-info-loss), `StoryPanel`×3 and `HeaderBar`×2 are icon/toggle buttons whose title is supplementary (aria-label + visible action already cover touch) — lower priority, may not need conversion (`[auto:claude]`).

## 2026-07-08 (overnight, claude lane) — M3 axis chip tap-openable tooltip (Track M mobile foundation, starts touch-clarity repair)
- Status: Done; third slice of Track M, first of ~20 hover-only `title=` sites (starting with the shipped T4a axis chip per plan scope). `make check` **917** green (+1 test: new source-level lock).
- Changed: `src/mythos_ui/src/ChoicePanel.tsx` — new `AxisChip` component replaces the axis chip's hover-only `title=` with a tap-toggled popover (`useState`/`useRef`/pointerdown-outside-close), following the existing `.tactical-legend-popup` toggle convention already in this codebase; kept as a plain `<span>` (not a nested `<button>`/focusable widget) since it lives inside the choice card `<button>`. `src/mythos_ui/src/index.css` — `.axis-chip-tooltip` popover styling (`position:absolute`, shown on `:hover` for desktop parity or `.axis-chip-open` for tap). `tests/test_ui_clarity_affordances.py` — updated the T4a source-lock for the new className pattern + added `test_choice_axis_chip_tooltip_is_tap_openable` locking the tap-toggle/no-title-attr/CSS-popover shape.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest **917**, 2 skipped, validate-content 2). AGY tap-open check not run this iteration (browser QA outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none. Next: remaining M3 sites (`GameAside`×6, `CombatControls`×3, `StoryPanel`×3, `HeaderBar`×2) — reuse the `AxisChip` popover pattern per site, or extract a shared `Tooltip` component if the next site needs the same shape (`[auto:claude]`).

## 2026-07-08 (overnight, claude lane) — M2 phone-readable font floor + 44px tap targets (Track M mobile foundation)
- Status: Done; second slice of Track M (P1.5 mobile-first prerequisite). `make check` **916** green (no test count change — CSS-only).
- Changed: `src/mythos_ui/src/index.css` — new `@media (max-width: 600px)` block (appended at file end) bumping every UI text selector under ~12px to a tiered readable floor (9-9.5px→12px, 10-10.5px→12.5px, 11-11.5px→13px; 123 selectors covered, discovered by scripted scan of all `font-size: 9-11.5px` declarations and their owning selector, none pre-nested in another media query so the append-order override is safe/behavior-preserving on desktop). Also sized `.board-zoom-btn` to 44x44px (was 22x22) and gave `.lang-toggle`/`.bgm-toggle` a 44px `min-height` floor, matching the plan's two named sub-44px controls. `src/mythos_api/static/assets/index.css` regenerated by `make frontend-build` (part of the gate) — not hand-edited.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 916, 2 skipped, validate-content 2). AGY @390px screenshot not run this iteration (browser QA is outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none. Next: M3 hover-only `title=` → tap-openable tooltip, starting with the T4a axis chip (`[auto:claude]`).

## 2026-07-08 (overnight, claude lane) — M1 100vh→100dvh (Track M mobile foundation)
- Status: Done; first slice of Track M (P1.5 mobile-first prerequisite). `make check` **916** green (no test count change — CSS-only).
- Changed: `src/mythos_ui/src/index.css` — `body` `min-height: 100vh`→`100dvh` (line 36) and `.cinema-overlay` `height: 100vh`→`100dvh` (line 3548), per plan `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md` M1 scope exactly. Left `.intro-container`'s `calc(100vh - 50px)` (line 1527) untouched — not named in the M1 scope, avoiding scope creep.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 916, 2 skipped, validate-content 2). AGY @390px clip check not run this iteration (browser QA is outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none. Next: M2 phone breakpoint (`[auto:claude]`, readable base font + 44px tap targets, CSS-only).

## 2026-07-08 (PM) — T5/T6 DECIDED (mobile-inclusive P0) — overnight claude lane re-armed
- Status: Design decision, no code. Owner picked **CBT = mobile-inclusive (P0)** as target form factor,
  which reframes the two blocked P1.5 decisions (T5 board viewpoint, T6 info density) as mobile-first and
  adds **Track M (mobile foundation)** as their prerequisite. This unblocks the `[auto:claude]` overnight lane
  (was all-drained/human-only since the 07-08 AM verification).
- Basis (3 parallel code scans): board is a **fluid 2.5D isometric `<canvas>`** (not a grid), fit-to-width so
  no overflow — "이동 시점 불편" = iso depth + tiny tiles, no camera-follow. Density peak is **combat (~9–10
  clusters)**, which A3 disclosure excludes; **no 간결 mode exists**. Mobile: **not catastrophic** (viewport
  meta ✓, breakpoints to 600px, 1-col collapse, touch-capable canvas) but UX-degraded — 9–11px fonts,
  `100vh` chrome-overlap, ~20 hover-only `title=` tooltips dead on touch (**incl. the just-shipped T4a axis
  chip**), sub-44px tap targets.
- Recorded: `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md` ("Decision 2026-07-08" + Track M + T5/T6
  slices), `NEXT_PLAN.md` P1.5 (slices M1-3/T6a-c/T5a-c promoted, mobile-first order), STATUS + AGENT_BRIEF
  (blocked→unblocked, NEXT SESSION pointer rewritten).
- Blockers: none. Next (auto): **M1·M2 → M3 → T6a-c → T5a/b → [conditional] T5c**, all UI/behavior-preserving,
  gated by `make check` + AGY @390px. Human lane unchanged: copy tone, play-feel, `git push` (ahead ~30).

## 2026-07-08 (AM) — P1.5 clarity track VERIFIED — 2 AGY QA runs PASS + independent gate 916
- Status: Overnight P1.5 bundle (`e10f2bb..d1bed45`, 7 commits) independently re-gated **`make check` 916 green**; two direct non-nested AGY live-QA runs both PASS_CANDIDATE (screenshots visually audited). Feedback #3 clarity/responsiveness closed on the auto axes.
- **QA A (T2 responsiveness, `20260708-062258-manual`)**: with the WS **force-closed**, one click rendered the "전송 중/Sending…" pending badge + disabled both choices (triple-click guard), reconnected, and advanced on the single click; 65s idle then single-click advance (20s keepalive). Evidence-audited, not just verdict.
- **QA B (T4a legibility, `20260708-063004-manual`)**: value-axis chips show ⓘ tooltips ("Stay safe ⓘ"/"Help people ⓘ"), first-loop legend overlay expands+dismisses, plain-language predicted-change copy renders; console/network clean.
- Landed this bundle: T1 identity-swap fix (resume pins to the playing loop_id) · T2 WS keepalive+optimistic pending · T3a narrative↔choice fork-mirror contract · T3b/T4 route/axis/archetype plain-copy pass · T4a affordances · variant intro **shot 03 ×6** (carousel now 3-shot; quota reset cleared the blocker).
- Blockers: none open; loop exited DONE all-blocked (remaining P1.5 = T5/T6 `[manual]` design decisions).
- Next: `[manual]` T5 board viewpoint + T6 density decisions · S4/T4 copy tone verdict · deploy+sign-off · `git push`.

## 2026-07-08 (overnight, codex failover) — T4a clarity affordances
- Status: Done; codex failover consumed the top `[auto:claude]` item because no `[auto:codex]` item remained.
- Changed: choice value-axis chips now expose tooltip/ARIA help; the tactical board legend auto-opens once per browser only when content exists; route-map legend can jump to the localized Codex tab; added source locks for the affordances.
- Verified: `tests.test_ui_clarity_affordances` 4/4; `$GATE_CMD` (`make check`) green (916 tests, 2 skipped, validate-content 2).
- Blockers: none. Next: P1.5 T5/T6 remain `[manual]` design decisions.

## 2026-07-08 (overnight, codex lane) — Variant intro SHOT 03 ×6
- Status: Done; six Loop 2+ variant boot intros now have third cinematic shots.
- Changed: generated/promoted `opening-{han,kai,lin_yue,su_ah,tae_o,solo}-03.png`; appended anchor `image_sequence`, KO `cinematic_shots`, and text-only EN overlays; tightened intro invariants for SHOT 03.
- Verified: visual read-back of all six generated images; JSON parse clean; `tests.test_opening_variant_intro` 4/4; `$GATE_CMD` (`make check`) green (912 tests, 2 skipped, validate-content 2).
- Blockers: none. Next: human in-game feel review of the variant intros/cuts; codex lane has no further open item above manual work.

## 2026-07-08 (overnight, codex lane) — T3b/T4 plain-copy pass
- Status: Done; route node-type descriptions now feed junction labels + validator, axis labels/previews and archetype play hints simplified KO/EN; verified `make check` green (912 tests, 2 skipped). Blockers: none. Next: T4a `[auto:claude]`, T5/T6 `[manual]`.
## 2026-07-08 (overnight, claude lane) — T3a narrative↔choice contract note (P1.5 CBT feedback #3)
- Status: P1.5 T3a done; `make check` **911** green (+3 tests). Addresses prose that promises a fork the
  choices never offer ("왼쪽은 지하철 폐노선, 오른쪽은 린위에의 선착장" with neither option rendered).
- Changed: `scenario_context.py` — new stable-head GM note `CHOICE_MIRROR_RULE`/`_EN` + `_choice_mirror_rule`
  selector (after the cinematic-clarity rule, cache-safe): an explicit fork in narration MUST be mirrored
  option-by-option in the choices (near-same wording); conversely no fork-ending prose without matching
  choices; explicitly does not override the ≥2-choices/distinct-intent rule. The note channel feeds every
  narrative path (single-model JSON, dual-model DIRECTIVE NOTES, streaming, Gemini — same builders).
- Verified: `make check` green (ruff/eslint/mypy 166/tsc+vite/unittest 911, 2 skipped, validate-content 2);
  new `T3aChoiceMirrorRuleTest` ×3 locks language selection (EN Hangul-free), context notes, and survival
  into BOTH rendered prompt formats (single-model head window / dual-model tail window of MAX_PROMPT_NOTES).
- Blockers: none. Next: T4a axis tooltip + legend overlay (`[auto:claude]`); T3b/T4 plain-copy pass is codex
  lane; LLM adherence feel folds into the next sign-off run (`[manual]`).

## 2026-07-08 (overnight, claude lane) — T2 click/stream responsiveness (P1.5 CBT feedback #3)
- Status: P1.5 T2 done; `make check` **908** green (+2 tests). Addresses "선택지 3번 클릭" (WS idle drop ~45s).
- Changed: ① keepalive — SPA `useGameSocket` sends `{"event":"ping"}` every 20s per open socket;
  `mythos_api/app.py` `loops_stream` answers `{"type":"pong"}` without entering the stream pipeline; pong
  swallowed client-side (transport-level). ② optimistic choice — `sendChoose` no longer silently no-ops on a
  dead socket: sets `pendingChoiceId` instantly (clicked card pulses "전송 중", siblings disabled — ChoicePanel/
  StoryPanel/App wiring + CSS), then `ensureOpenSocket()` (cancels backoff, supersedes dead socket, stale-onclose
  identity guard) re-sends the choice exactly once (server duplicate-choose already returns current snapshot);
  reconnect-fail resets pending+status. i18n `sess.reconnecting`/`sess.reconnectFail`/`choice.sending` KO+EN.
- Verified: `make check` green (ruff/eslint/mypy 166/tsc+vite/unittest 908, 2 skipped, validate-content 2);
  new `test_api.py` ping→pong ×2 (idle keepalive + mid-session between begin/choose).
- Blockers: none. Next: T3a narrative↔choice contract note (`[auto:claude]`); AGY live-QA auto-screens post-commit.

Older 2026-07-08 entries (T1 identity-swap fix; S4 variant-routed opening content) moved to
`bin/docs/archive/progress-2026-07.md` to hold the line budget.

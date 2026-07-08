# Progress Log

Last updated: 2026-07-08

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

## 2026-07-08 (overnight, claude lane) — DS0 design-system tokens (spacing/radius/type) added to `:root`
- Status: Done; `make check` **924** green (no new test — pure CSS addition). Top unfinished `[auto:claude]` item (design `docs/plans/2026-07-08-design-system.md` Phase 0).
- Changed: `src/mythos_ui/src/index.css` — added `--space-1..7` (4/8/12/16/24/32/48px), `--radius-sm/md/lg/full` (4/8/12/999px), `--density-step:4px`, and `--text-1..6` + matching `--text-N-line` (10-16px, collapsing the 8-14.5px sprawl) to the existing `:root` block. Pure additive per the plan — no call sites migrated, no visual change.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 924, 2 skipped, validate-content 2). No AGY live-QA run — CSS custom-prop addition only, zero rendered-output diff (no UI is browser-observable-different), so the MythOS live-QA guard's "objective refactor" auto-screen doesn't apply here.
- Blockers: none. Next (auto): DS1a `Surface` primitive (ships unused, unit test + `make check` gate) is next in Phase 1; DS1b tooltip consolidation after. DS2/DS3 stay `[blocked]` pending human review of the DS1a API.

## 2026-07-08 (overnight, claude lane) — T5b small-viewport default-zoom bump + minimum tile-size floor
- Status: Done; `make check` **924** green (+1 test). Second T5 slice (tactical board legibility), after T5a.
- Changed: `combatCanvas.ts` — new exported `MIN_ISO_STEP_PX = 26` floor; `drawCombatCanvas` now takes `cssW = Math.max(Math.floor(baseW * zoom), minCssW)` where `minCssW` is derived from the floor so a tile's on-screen half-step never shrinks below it regardless of viewport width, user zoom, or arena size (`combatCellFromPoint` already reads the actual rendered `rect.width`/`height`, so no other caller needed a change). `hooks/useCombatBoard.ts` — new `resolveInitialBoardZoom()` (same `(pointer: coarse)`/`(max-width: 600px)` media queries as `conciseMode.ts`) seeds `boardZoom` state at 1.5 instead of 1 on coarse-pointer/small-viewport devices, so the board starts already zoomed in rather than requiring the player to find the +/- control first; existing zoom clamp (1-2.5) is untouched.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 924, 2 skipped, validate-content 2). New source-lock test `test_board_zoom_defaults_higher_on_small_viewport_with_a_tile_size_floor`. AGY mobile check not run this iteration (browser QA outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none. Next (auto): T5c stays `[blocked]` pending human judgment on whether isometric is still illegible @390px after T5a/b; no other `[auto:claude]` P1.5 slice remains queued.

## 2026-07-08 (overnight, claude lane) — T5a movement affordance (reachable/path preview + auto-center)
- Status: Done; `make check` **923** green (+1 test). Top unfinished `[auto:claude]` item after T6a-c; first T5 (tactical board legibility) slice.
- Changed: `combatCanvas.ts` — `drawCombatCanvas` gains an optional `hover?: [number, number] | null` param; a new `previewCell` (`drag?.targetCell ?? hover`) drives the reachable-tile target highlight (previously drag-only, now also live on hover before the player commits to the drag gesture — important on touch, where a drag itself is hard to discover) plus a new dashed ground-trail line from the active unit to the previewed cell (straight-line affordance; actual pathfinding stays server-side, `available.reachable` only carries endpoint cells, not path steps). `hooks/useCombatBoard.ts` — `redrawCombat` forwards the hover cell; the pointer-move hover branch now dedups via a `hoverRef` and redraws the preview only when the hovered cell changes (cleared on drag-start/pointer-leave so no stale preview lingers); a new effect keyed on `radar.current` auto-`scrollTo`s the canvas's scrollable wrapper (`.tactical-board-canvas-wrapper`, already `overflow: auto` for zoom) to center the active unit whenever a new unit's turn starts, clamped to the wrapper's actual scroll range. `tests/test_ui_clarity_affordances.py` — new `test_combat_board_previews_move_target_and_auto_centers_active_unit` source-locks the wiring.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 923, 2 skipped, validate-content 2). AGY mobile check not run this iteration (browser QA outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none. Next (auto): T5b small-viewport default-zoom bump + min tile-size floor; T5c (LARGE, conditional on human judgment after T5a/b) stays `[blocked]`.

## 2026-07-08 (overnight, claude lane) — T6c combat-panel density reduction (Track M/T6 mobile foundation)
- Status: Done; `make check` **922** green (+1 test). Top unfinished `[auto:claude]` item after T6a/T6b; addresses the plan's named combat density peak (~9-10 info clusters on a first combat turn).
- Changed: `StoryPanel.tsx` — new `CombatChip` (same details/summary chip shape as `GameAside`'s T6b `AsideChip`, reusing its `.aside-chip`/`.aside-chip-summary`/`.aside-chip-body` CSS) wraps `TileInspector` (always) and `CombatLog` (only when a log exists, so no empty chip renders before the first log line) when `useConciseMode()` is true, collapsed by default; non-concise (desktop default) renders both unwrapped, unchanged from before T6c. Chose these two clusters as lowest-priority-but-always-visible (on-demand detail, not needed to take a turn) vs. board/legend/roster/controls which stay fully visible since they're needed every turn. `strings.ko.ts`/`strings.en.ts` — new `story.tile.title` chip label (KO/EN). `tests/test_ui_clarity_affordances.py` — new `test_combat_panel_collapses_secondary_clusters_to_chip_in_concise_mode` source-locks the wiring.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 922, 2 skipped, validate-content 2). AGY mobile check not run this iteration (browser QA outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none. Next (auto): T5a movement affordance (reachable-tile highlight + path/target preview + auto-center), then T5b small-viewport zoom/tile floor.

## 2026-07-08 (overnight, claude lane) — T6b Save/Map aside panels collapse to chip in concise mode (Track M/T6 mobile foundation)
- Status: Done; `make check` **921** green (+1 test). Top unfinished `[auto:claude]` item was actually M3's remaining sites, but that item's prior close-out attempt (`b86116d` "M3 CLOSED: remaining sites out-of-scope") was human-reverted 7s later (`5810c3b`) — same signal as the earlier `useViewModels`/slice-14 revert precedent recorded in this file's Maintenance section. Per that precedent (don't re-attempt a reverted judgment call verbatim), this iteration skipped M3 and took the next queued item, T6b, instead. M3 remains `[/]` in `NEXT_PLAN.md`, untouched; needs a human call on whether the 7 remaining `title=` sites (CombatControls×2, StoryPanel×3, HeaderBar×2) should actually convert to tap-openable tooltips rather than be judged out-of-scope.
- Changed: `GameAside.tsx` — new `AsideChip` (native `<details>`/`<summary>` chip, same shape `LogPanel` already used) wraps `SaveHistoryPanel` and `OperationMapPanel` only when `useConciseMode()` is true, collapsed by default (tap summary to expand); non-concise (desktop default) renders both panels unwrapped, unchanged from before T6b. `LogPanel` was already a `<details>` chip so it needed no change. `index.css` — `.aside-chip`/`.aside-chip-summary`/`.aside-chip-body` chip styling + `.aside-chip-body .panel` override to flatten the nested panel's own border/padding/background so it doesn't double up visually when expanded. `tests/test_ui_clarity_affordances.py` — new `test_aside_save_and_map_panels_collapse_to_chip_in_concise_mode` source-locks the wiring.
- Verified: `make check` green (ruff/eslint/mypy 167/tsc+vite/unittest 921, 2 skipped, validate-content 2). AGY mobile check not run this iteration (browser QA outside the unattended gate; post-commit AGY live-QA auto-screens per the MythOS live-QA guard).
- Blockers: none for T6b. M3 (see above) needs human judgment before the next overnight iteration touches it again. Next (auto): T6c combat-panel density reduction, or M3 once a human decides its remaining scope.

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

Older 2026-07-08 entries (T4a affordances; SHOT 03 ×6; T3b/T4 plain-copy; T3a fork-mirror; T2 responsiveness;
T1 identity-swap; S4 variant-routed opening) moved to `bin/docs/archive/progress-2026-07.md` to hold the line budget.

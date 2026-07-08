# Design-system consolidation — consistent UX (2026-07-08)

Status: DESIGN (owner-requested). Goal: fix the two UX complaints — **(A) too much info at
once, (B) inconsistent detail-window sizes** — at the root, not with band-aids. Research +
code-evidence backed. Supersedes the ad-hoc T6 concise toggle (it becomes the first draft of a
real density system).

## Diagnosis (code evidence, `src/mythos_ui/src/index.css`, 5297 lines)
No design tokens exist (`--space-*`/`--radius-*` = 0; only ~15 `:root` props, mostly colour).
Consequence — everything is hand-styled with magic numbers:
- **9 border-radius values** (2/3/4/5/6/7/8/10/999px)
- **20 padding scalar values** (1…40px), **74 distinct padding patterns**
- **51 bespoke panel/card/chip/popover/tooltip/modal/inspector classes**
- Smoking gun: the **3 tap tooltips that do the identical job** (axis / aside / combat-skill,
  added in M3 2026-07-08) have **3 different min/max-widths** (180/260 · 140/240 · 160/220) and
  duplicated CSS. Detail-window inconsistency (B) = **no shared primitive**; density (A) = the
  concise toggle only *hides*, it doesn't restructure the hierarchy.

## Best-practice basis (researched, sources)
- **Token scale first** — 4px-base spacing, radius collapsed to ~4 steps, type scale bundling
  line-height; tokens are the *only* public API (Tailwind, IBM Carbon, Radix Themes, Material 3).
- **One Surface primitive** — `variant × size × density` props replace N bespoke panels; consistent
  width/padding/radius live here (Radix Card, shadcn Card slots, Carbon Tile 4-variant, M3 Card).
  This is where Problem B is fixed.
- **Progressive disclosure + real density modes** — NN/g defer-secondary-content; Material density
  scale (comfortable/compact, −4dp/step) **opt-in, 48px min hit target preserved** (a11y). Not one flag.
- **Game HUD = inspector + telegraph** — Into the Breach ("sacrifice cool ideas for clarity every
  time"; animated tooltips beat text), XCOM 2 stat drawers, BG3 Examine panel. One fixed-size
  inspector that re-populates on select; always-visible = decision-critical stats + intent only.
  Fixes Problem A.
- **One tooltip + one popover** — WAI-ARIA APG: `aria-describedby` tooltip (passive), `aria-expanded`
  /`aria-controls` disclosure/popover (interactive/touch). Kill `title=` (dead on touch, inaccessible).

## Proposed tokens (recommended defaults — owner may adjust the numbers)
```
--space-1:4  --space-2:8  --space-3:12  --space-4:16  --space-5:24  --space-6:32  --space-7:48
--radius-sm:4  --radius-md:8  --radius-lg:12  --radius-full:999      (9 radii → 4; 2/3/4/5→sm, 6/7/8→md, 10→lg)
--density-step:4px   comfortable=desktop default · compact=mobile/coarse default (−1 step)
type scale: collapse the current 8/9/10/11/12/13/14.5px sprawl → ~6 steps, each bundling line-height
```

## Phased slices
**Phase 0 — tokens (foundation, no visual change)**
- `[auto:claude]` **DS0** add the token custom-props to `:root` (values above); no call sites changed
  yet — pure additive. Done = `make check` green (no visual diff; AGY not FAIL).

**Phase 1 — primitives + kill the duplication (cheapest visible consistency win)**
- `[auto:claude]` **DS1a** `Surface` primitive (React `Surface` + `.surface` base class): `variant`
  (surface/outline/ghost) × `size` (1–3 → padding token) × `density`. Ships unused. Done = unit test
  + `make check` green.
- `[auto:claude]` **DS1b** collapse the 3 M3 tooltips into ONE `Popover` primitive
  (`aria-expanded`/`aria-controls`, tokenised) + one passive `Tooltip` (`aria-describedby`); migrate
  axis/aside/combat-skill call sites onto it; delete the 3 bespoke tooltip CSS blocks. Also removes any
  remaining `title=` in those paths. Done = existing tap-tooltip tests still green + `make check` +
  AGY not FAIL.

**Phase 2 — migrate panels onto Surface** — **UNBLOCKED 2026-07-08** (owner sign-off; review packet
+ resolutions in `docs/plans/2026-07-08-ds2-sample-migration.md`).
- `[/]` **DS2** migrate the ~30 `.panel` sites (of 51 panel classes) onto `Surface`, **one cluster per
  slice**, behavior-preserving. **DS2-api** (size remap: default size-2 = 16px + glow on `.surface-surface`)
  and **DS2-a** (`StatusPanel` sample) DONE; remaining clusters are `[auto:claude]`. Detail + sweep order
  in the sample-migration doc.

**Phase 3 — density system + combat inspector — DONE 2026-07-09** (owner decision → `DECISIONS.md`)
- `[x]` **DS3a** compact-density mode: step = `--density-step` (4px), default comfortable/desktop ·
  compact/coarse-pointer, the concise toggle unified into the density switch (relabelled COMPACT).
  `body.concise-mode .surface` drops one step of padding on every `<Surface>` app-wide; 48px tap
  targets preserved (only container padding shrinks). Emulator-verified 16→12px.
- `[x]` **DS3b** `TileInspector` is now fixed-size (min-height 96px, no empty↔populated jump); the
  always-visible set = **HP · Enemy intent · Cover** (owner-chosen), per-tile detail secondary.
  Emulator-verified: stable 96px with the 3-row trio even with nothing selected.

## Sequencing / risk
DS0 → DS1a/DS1b (parallel-safe) → **[human review of Surface API]** → DS2 sweep → **[human density
decision]** → DS3. Phases 0–1 are safe autonomous foundation; Phases 2–3 are gated because the
primitive API and density values propagate widely — a wrong call is expensive to unwind. Scale
reality: DS2 alone is many slices (~51 classes). This is a multi-week track, highest-leverage for
"consistent UX." T6 concise work is absorbed by DS3, not discarded.

## Landscape Combat (LC) — decided A, 2026-07-08 (owner)
Finding (mobile emulator test 2026-07-08): concise mode barely helps *combat* — portrait combat is
2914px (concise ON) vs 3246px (OFF) = only ~10%, because the board/roster/controls dominate and
can't collapse (they're needed every turn). Concise's real value is *narrative* scenes (aside is a
big fraction there). Combat is fundamentally cramped in portrait. **Decision A: dedicated landscape
split layout + orientation guidance.** Supersedes the "mobile = portrait concise" assumption *for
combat only*; narrative stays portrait + concise.
- The board is already a fluid fit-to-width iso canvas → in landscape it must **fit-to-HEIGHT** so it
  doesn't overflow the ~390px viewport.
- Target: `@media (orientation: landscape) and (pointer: coarse)` → `.combat-layout` becomes **board
  (left ~55–60%, height-fit) | control column (right: roster + targets + actions + skills, own
  scroll)** so the core turn loop fits one screen with no page scroll.
- Portrait combat stays stacked but shows a **rotate-to-landscape prompt** on combat start.
- Ties into DS3 combat inspector; build on the new tokens/`Surface`.

Slices:
- **LC0** `[auto:claude]` `useOrientation` hook + rotate-to-landscape overlay on combat start
  (coarse-pointer portrait only). Done = unit test + `make check` green.
- **LC1** `[auto:claude]` landscape split layout (board height-fit left | controls right). Done =
  `make check` green; **VISUAL verify via mobile-landscape emulator post-run** (AGY runs a desktop
  viewport and will NOT catch landscape layout — human/emulator review required).
- **LC2** `[auto:claude]` in landscape, fold TileInfo/Log/OperationMap into the right column
  (chip/tab) so the turn loop fits one screen. Done = `make check` green.

### LC refinement (emulator verify 2026-07-08 — skeleton works, not one-screen yet)
Landscape combat (concise-on) measured **917px / 2.4 screens** post-LC (was 2206px — improved). But:
the 2-col split covers only the top row (board | TileInfo+roster); **Save/Load + STATUS(expanded) +
OperationMap stay full-width stacked below** (LC2 only folded TileInfo), the board is squished to
~295px by the encounter banner, and the app header eats ~260px of the 390px height. Action/skill
controls sit below the fold, so board+actions are NOT co-visible. Refinement slices:
- **LC3** `[auto:claude]` landscape-combat chrome compaction: in `@media (orientation:landscape) and
  (pointer:coarse)`, shrink the app header and collapse the encounter banner to a one-line chip so the
  board fills the left column. Done = `make check` green + emulator verify.
- **LC4** `[auto:claude]` true one-screen: make `.combat-layout` a **fixed-height flex row**
  (`height: calc(100dvh − header)`), LEFT = board column that does NOT scroll (board fills the height),
  RIGHT = the control column (roster + targets + actions + skills, then Save/STATUS/Map as collapsed
  chips) that scrolls **independently** — so the PAGE itself never scrolls. Done = `make check` green +
  emulator verify (landscape ≈ 1 viewport; board + action bar co-visible).

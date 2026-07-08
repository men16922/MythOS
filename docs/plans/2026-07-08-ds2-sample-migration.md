# DS2 sample migration + `Surface` API review (2026-07-08)

Status: **APPROVED + DS2-api/DS2-a LANDED 2026-07-08.** Owner signed off on the recommended
defaults (G1 size remap ✓ · G3 bake glow ✓ · G2 accept 6→8px ✓). DS2 is unblocked; the primitive
change (DS2-api) and the sample migration (DS2-a `StatusPanel`) are implemented and gate-green,
with computed-style parity verified in the emulator (only delta = the intended +2px radius).
Remaining `.panel` clusters migrate per-slice as `[auto:claude]`. Original review packet below.

## 1. `Surface` API as it ships today (DS1a, `src/mythos_ui/src/Surface.tsx`)

```tsx
<Surface variant="surface|outline|ghost" size={1|2|3} density="comfortable|compact" className? style?>
```
Composes token classes onto a `<div>`; radius is always `--radius-md` (8px).

| prop | value | resolves to |
|---|---|---|
| `variant` | `surface` | `background: --panel` + `1px solid --line` |
| | `outline` | transparent + `1px solid --line` |
| | `ghost` | transparent, no border |
| `size` | 1 / 2 / 3 | padding `--space-2` (8) / `--space-3` (12) / `--space-5` (24) |
| `density` | comfortable / compact | pad − 0 / − `--density-step` (4px) |

## 2. What the sweep is actually migrating (code evidence)

- **30 call sites** carry the base `.panel` class (`grep className …panel`). `.panel` =
  `background:--panel` · `1px solid --line` · `border-radius:6px` · `padding:16px` ·
  `box-shadow:0 0 22px rgba(0,255,170,0.07)` (the brand glow).
- The **brand glow** `rgba(0,255,170,.07)` appears **19×** across the stylesheet — it is an
  app-wide signature, not incidental to one panel.
- 57 bespoke panel/card/inspector/chip/tooltip/modal classes exist in total; the `.panel`-based
  30 are the bulk of Phase-2 and the cheapest, highest-parity win. Bespoke one-offs
  (`.modal-panel`, `.combat-result-panel`, inspectors) migrate later, per-cluster.

## 3. Three API-fit gaps `.panel` exposes (the decisions)

The default panel is `variant="surface"`. But mapping `.panel` onto it today is **not** visually
1:1:

| # | gap | `.panel` today | `Surface` today | impact |
|---|---|---|---|---|
| G1 | **padding** | `16px` (= `--space-4`) | size-2 = 12px, size-3 = 24px — **16px is unmapped** (the scale skips it) | every default panel shifts pad −4 or +8 |
| G2 | **radius** | `6px` | `--radius-md` = 8px | +2px on every panel (intended by the token collapse 6/7/8→md) |
| G3 | **glow** | `box-shadow` brand glow | none on any variant | all 30 panels go flat |

## 4. Recommended resolutions (minimal-visual-change defaults)

- **G1 → remap the size scale so the DEFAULT (`size=2`) = `--space-4` (16px).** New scale:
  `size-1 = --space-3 (12)` · `size-2 = --space-4 (16)` · `size-3 = --space-5 (24)`. Then the
  dominant 30-panel migration is a bare `<Surface variant="surface">` with no size prop and **zero
  padding change**. (Alternative: keep the scale, pass `size={3}`-ish everywhere — noisier and 24px
  ≠ 16px anyway. Not recommended.)
- **G2 → accept 6→8px.** The token plan explicitly collapses 6/7/8 → `--radius-md`. 2px is
  imperceptible and is the whole point of the radius consolidation.
- **G3 → bake the glow into `.surface-surface`** (`box-shadow: 0 0 22px rgba(0,255,170,.07)`), so
  the `surface` variant preserves the current look with zero per-site work. (Alternative: **drop
  the glow** for the flatter Radix/Carbon aesthetic the plan cites — a deliberate app-wide visual
  redesign. Owner's aesthetic call; if chosen, do it as its own visible commit, not smuggled into
  the sweep.)

If G1+G3 are accepted as above, **the mass sweep is a near-mechanical `.panel` → `<Surface
variant="surface">` substitution** with pixel-parity, which is exactly the safe, behavior-preserving
discipline the god-component track uses.

## 5. Sample migration — `StatusPanel` (`GameAside.tsx:425`)

Chosen because `.status-panel` owns **only behavior rules** (`.gauge-hint` show/hide, `.hints-on`
margin) — no bg/border/padding of its own — so the container styling comes purely from `.panel`.
A textbook clean swap.

**Before**
```tsx
<div className={`panel status-panel ${showHints ? "hints-on" : ""}`}>
```
**After** (assuming §4 defaults: size-2 = 16px, glow on `surface` variant)
```tsx
<Surface variant="surface" className={`status-panel ${showHints ? "hints-on" : ""}`}>
```
- `.status-panel` stays as a passthrough `className` (keeps its two behavior rules).
- No `size`/`density` props → defaults (16px, comfortable) → **pixel-identical** to today once §4
  lands. `</div>` → `</Surface>` at the close tag.
- This is the template every one of the 30 `.panel` sites follows.

## 6. Proposed sweep plan (after sign-off)

Promote DS2 to `[auto:claude]`, then **one cluster per slice** (same discipline as the god-component
decomposition — do not entangle):
1. **DS2-api** — apply §4 (size remap + glow on `surface` variant) to `Surface.tsx`/`index.css`;
   ship still-unused. Gate: `make check` green + the DS1a Surface tests updated.
2. **DS2-a … DS2-n** — migrate `.panel` sites cluster-by-cluster (aside panels · combat panels ·
   intro/onboarding · modals · dashboards). Each slice: swap `.panel`→`<Surface>`, delete the now-dead
   container CSS, `make check` green + post-commit AGY live-QA not FAIL (objective refactor,
   auto-screened per the live-QA guard). Bespoke non-`.panel` classes come last, per-cluster.
3. Leave `density`/compact wiring to **DS3** (real density system) — do not overload this sweep.

## 7. Owner decisions — RESOLVED 2026-07-08

1. **G1 size remap** (default `size=2` → 16px) — ✅ **APPROVED.** Implemented in DS2-api.
2. **G3 glow** — ✅ **APPROVED: bake into `surface` variant.** A flat redesign, if ever wanted, is a
   separate visible commit.
3. **G2** (6→8px radius) — ✅ **ACCEPTED** (the token collapse).

## 8. Status of the sweep (§6 plan)

- ✅ **DS2-api** — `index.css` size remap (1=12/2=16/3=24) + glow on `.surface-surface`; `Surface.tsx`
  unchanged (composes the same class names). `make check` 953 green; emulator computed-style parity
  vs `.panel` confirmed (only delta = +2px radius, intended).
- ✅ **DS2-a (sample)** — `StatusPanel` (`GameAside.tsx`) migrated `.panel`→`<Surface variant="surface">`;
  `.status-panel` kept as behavior-only passthrough. Gate green.
- ✅ **DS2-b (aside cluster)** — `Surface` now forwards `...rest` (id/style/handlers/aria); migrated
  `OperationMapPanel` (main + fallback) and `SaveHistoryPanel`/`RunHistoryPanel`. The 2
  `<details className="panel">` chips (AsideChip/LogPanel) deferred — need a Surface `as="details"`
  or stay `<details>`. Gate green; emulator parity re-checked (id forwarded, only radius +2px).
- ✅ **DS2-c (StoryPanel cluster)** — migrated board (`tactical-board-panel`), `roster-panel`,
  `scene-image-panel`, `narrative-script-panel`. Removed the now-dead `padding:16px` from the first
  three; `narrative-script-panel` keeps its bespoke `18px 24px` (wins over Surface by source order).
  Board+roster verified rendering live as `.surface`; scene/narrative parity via injected nodes.
- `[ ]` `[auto:claude]` **DS2-d … DS2-n** — remaining ~21 `.panel` sites, one cluster per slice
  (intro/onboarding · modals · dashboards), then bespoke non-`.panel` classes + the deferred
  `<details className="panel">` chips (need a Surface `as="details"`).
  Each: swap `.panel`→`<Surface>`, delete dead container CSS, `make check` green + AGY not FAIL.
- Density/compact wiring stays for **DS3**.

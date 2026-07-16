# Combat Visual Overhaul — design snapshot (2026-07-12)

Owner verdict on the "시각적으로 별로임" probe: **all four** — status badge icons, aim/blast
rings, cinema cards, board look. Plus two direct requests mid-session: **(a) drag-to-pan
camera on the board background**, **(b) node-themed combat backdrops** (encounter biome art).
Conclusion: not four small defects but one systemic gap — the combat scene has no unified
art direction; every layer (tiles, rings, badges, cards) was added ad hoc.

Evidence: direct local sim run (chrome-devtools), screenshots in `outputs/vis-diag/01..22`.
Asset inspection: `resources/neo-seoul/{skills,status,combat/tiles,items}`.

## Diagnosis (what makes it read "별로")

1. **Board**: `floor.png` is near-black; the procedural neon diamond stamps EVERY tile
   identically → repetitive circuit noise, no depth, no vignette, flat black void behind
   the arena. Cover_full (gray obelisk) is tonally off vs the neon world.
2. **Centering BUG**: `getIsoConfig` sets `centerX = cssW/2`, correct only for square
   boards. On 10×7 arenas the projected diamond shifts right → **enemy sprites at x=9 clip
   off the canvas edge** (visible in every screenshot). Proper center needs a
   `(rows-cols)*stepX/2` correction. No camera pan exists to recover (owner request a).
3. **Rings**: AoE preview + blast FX draw a single thin ellipse with
   `rx = cellR*stepX*2.5` — geometrically unrelated to the affected cells (radius-1 ring
   spans ~4 tiles). Aim range tint is an olive wash that reads as dirt, not targeting.
4. **Status badges**: the generated `status/*.png` are posters (baked caption text,
   mixed silhouettes — shield/ring/bare glyph). At badge size (~22px) they mush, AND the
   badge row is drawn at `cy-r*3.1` while the name label sits at `cy-r*2.85` → **badges
   overlap the name text**.
5. **Cinema**: composition = three floating rounded rects on a flat dark band. No impact
   linkage (nothing travels between cards on hit), tiny mono labels, and basic
   attacks/grenades get the generic crossed-swords "ATTACK" widget. The board detonation
   VFX plays hidden UNDER the fullscreen cinema (sequencing).
6. **Skill buttons**: `SKILL_SYMBOLS` has 5 entries; every other skill falls back to the
   role-label first letter ("제"/"강" tiles). The `skills/*.png` illustrations are cinema
   card art, not button icons. Consumable buttons have no icons at all though item art
   exists.

Non-visual findings logged for triage (do NOT fix silently here):
- 한's signature 시스템 침투 costs ◆4 but his max FOCUS is 3 → **uncastable, ever**.
- 린위에 missing from the victory lineup panel (party of 4 showed 3).
- Loot pills show raw ids (`전리품 drone_scrap`, `전리품 nanopatch`) — i18n gap.

## Direction: one visual system ("holo-op table")

Everything on the board is a projection on ARK's tactical table: **dark ambient backdrop
(node-tinted) → floor plane with depth → readable game-state color code → impactful
screen-space FX**. Color code stays: teal=us, red=threat, amber=aim/act, purple=control,
per-status hues. Rules: game-state marks are CELL-based (never free ellipses); text labels
never overlap; icon art must survive 22px.

## Slices (code lane, this session)

- **V1 center+camera**: fix `getIsoConfig` centering for cols≠rows; add `panX/panY`
  camera offset (canvas dataset, like `boardZoom`); background drag pans (unit drag and
  cell taps keep priority — pan starts only from a non-unit, non-reachable press that
  moves >threshold); `combatCellFromPoint` pan-aware; double-tap/button to re-center.
- **V2 board look + node backdrop**: canvas backdrop layer = radial vignette + biome
  tint gradient behind the floor (hook: `combat/backdrops/<biome>.png` drawn dimmed if
  present — seeds the owner's node-map idea; deterministic biome from encounter id);
  floor stamps get alpha/variation falloff (kill the uniform circuit noise), subtle
  alternating tile shading, rim glow on the arena edge.
- **V3 cell-true rings**: AoE preview = fill the actual affected cells (pulse) + a
  cell-perimeter rim; blast FX = expanding cell-diamond ring, not ellipse; aim range
  recolor (move=teal kept; aim=amber but as crisp cell edges + corner ticks, not wash);
  invalid hover state.
- **V4 badge stack**: one vertical stack layout above each unit (badges row → name →
  sprite) with measured offsets, no overlap; badges render on dark circular chips with
  status-color rim + the icon inside (poster art reads OK once chipped); cap 3 + "+N";
  scale with zoom.
- **V5 cinema impact**: impact beat = attacker card lunges, a color streak crosses the
  gap into the defender card, defender card shake+flash (CSS), damage number enlarged
  and popped on the defender card; grenade/item throws show the item art as center card
  (wire item id through the cinema queue); suppress fullscreen cinema for grenade
  throws when the board blast VFX is the payoff (board is the star) — cinema only on kill.
- **V6 button icons**: full `SKILL_SYMBOLS` coverage (every skill id in content gets a
  glyph); consumable buttons get item PNG thumbnails.

## Art lane seeds (agy/codex, after owner confirms direction)

- Status badge glyph set regen: flat single-glyph, transparent, no caption text,
  consistent stroke weight (7 statuses + hacked) — current posters stay as fallback.
- Node backdrops: 4-5 biome plates (night-market neon, industrial/incinerator amber,
  ARK-spire cyan, back-alley, rooftop) 1024×640, dark (≤25% luminance), soft focus.
- Floor tile: mid-tone concrete/hex-grid diamond (lighter than current near-black).
- cover_full replacement: neon barricade/server-rack prop matching cover_half's language.

## Verification

`make check` green per slice + direct sim screenshot pass (chrome-devtools, non-fallback
URL) comparing before/after against `outputs/vis-diag/*`. Owner feel pass gates art regen.

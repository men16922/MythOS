# Combat & Area Burn (지역 화상) Visual FX Enhancement Plan (2026-10-18)

## 1. Goal & Problem Statement

In **Mythos 2.0 — Signal Run**, terrain manipulation and area hazards—especially **Area Burn / Burning Ground (지역 화상 / 화염 지대)** from cards (`c_molotov`, `c_fire_line`, `c_scorch_bolt`, `c_backdraft`) and enemies (`a2_incinerator`, `a2_elite_incinerator`)—are core tactical mechanics. However, visual inspection of the 7×5 tactical board identified four gaps:

1. **Isolated Burning Tiles**: Each burning tile (`FireBase` in `board/tiles.tsx`) rendered an identical flat diamond gradient without knowing whether adjacent tiles were also burning or how many turns of fire remained. Multi-tile area burns looked like separate decals rather than a connected hazard zone.
2. **Flat Flame Layering**: `GroundFire` lacked inner white-hot plasma cores, rising smoke plumes, and thermal shimmer waves.
3. **Plain Fire Scorch & Area Eruption**: In `BoardFx.tsx`, `Ground` (`kind: 'scorch'`) only drew radial cracks for `element === 'blast'`, leaving `element === 'fire'` as a plain dark circle. `AreaBurst` (`element === 'fire'`) lacked a vertical flame pillar and thermal shockwave ring.
4. **Unit Hazard & Status Readability**: Units standing on burning tiles or carrying high `burn` / `shock` / `mark` stacks needed clearer on-unit visual feedback without obscuring unit sprites or HP bars.

---

## 2. Deep-Module Architecture (`codebase-design`)

All changes stay strictly inside the presentation layer (`src/mythos_ui/src/v2/ui/combat/`), preserving the pure-TS engine contract (`v2/engine` state and RNG untouched):

| Layer | Module | Seam / Interface Change | Visual Upgrades |
| --- | --- | --- | --- |
| **1. Connected SVG Hazard Floor** | `board/tiles.tsx` (`FireBase`, `TileDefs`), `Board.tsx` | `FireBase(x, y, turns, neighbors)` receives remaining fire turns and orthogonal neighbor mask `[N, E, S, W]` | Seeded molten magma fissures (`.m2c-fire-fissure`), connected molten bridges across shared burning edges (`.m2c-fire-bridge`), outer hazard perimeter on non-burning borders (`.m2c-fire-perimeter`), and turn-scaled core glow (`turns >= 2` white-hot vs `turns === 1` smolder). |
| **2. Volumetric DOM Ground Fire** | `board/tiles.tsx` (`GroundFire`), `board/tiles.css` | `GroundFire({ x, y, turns, cluster })` | Adds expanding isometric heatwave ring (`.m2c-fire-heatwave`), white-gold inner core tongues (`.m2c-flame.is-core`), rising dark-amber smoke wisps (`.m2c-fire-smoke`), and extra swirling embers on multi-tile area clusters. |
| **3. Transient Area Burst & Scorch** | `BoardFx.tsx`, `boardfx.css` | Existing `FxItem` union (`area`, `ground`, `flare`, `flame`) | Fire `scorch` gains glowing magma cracks (`.m2c-scorch-crack.is-fire`) + ember rim; `AreaBurst` (`fire`) gains vertical `.m2c-firepillar`, dual `.m2c-firering` shockwaves, core tongues, and smoke plumes; `flare` (`is-fire`) gains an ignition shock ring. |
| **4. Unit Hazard & Status Overlays** | `board/units.tsx`, `board/units.css`, `Board.tsx` | `BoardUnits` reads `tiles[u.pos.y][u.pos.x]` for ground hazard state | Standing-in-fire base shimmer (`.m2c-u.is-in-fire`), stack-scaled `BurnFlames` with white-hot core tongues at `burn >= 2`, `ShockSparks` electric arcs for `shock > 0`, and `.m2c-u-mark-reticle` for `mark > 0`. |

---

## 3. Verification Criteria (`gameplay-qa`)

1. **Deterministic Unit & Content Tests**: `make test-v2` and `make check` pass with 0 errors.
2. **Headless Browser E2E**: `make test-e2e-v2` passes with 0 console/page errors.
3. **Combat Sandbox Visual Evidence**: Headless muted Playwright verification on `/?sandbox=combat&mute=1&enc=a2_elite_incinerator` (and `a1_boss_haetae`) at both desktop (`1280×800`) and mobile (`390×844`) viewports, confirming connected area-burn zones, fire eruptions, and unit status readability.

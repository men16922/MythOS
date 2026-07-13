# Enemy Combat Art — Style Consistency Regeneration (codex lane)

Date: 2026-07-13. Owner flagged four enemy sprite sets as stylistically alien to the rest of the
Neo-Seoul combat roster. Regenerate them to match the established canon. **Generate via codex**
(curated key art = codex, per division-of-labor) so the style matches existing curated sprites.

## The two canon styles already in the roster (match these)

Directory: `resources/neo-seoul/enemies/combat/` — each enemy has 5 poses: `idle / guard / attack / skill / hit`.

1. **Inked-comic (mechanical bots)** — reference: `maintenance-drone-*`, `sentinel-drone-*`.
   - Heavy black ink outlines, cross-hatch/graphic shading, comic-book rendering.
   - Body: **rust-brown / gunmetal / weathered steel**. Accents + eyes/optics: **RED glow**.
   - Gritty, scratched, industrial. Transparent background.
2. **Painterly render (humanoids / boss)** — reference: `enforcer-unit-*` (black armor + red),
   `glitch-wraith-*` (painted, purple glitch), `administrator-ix-*` (white/blue boss render).
   - Semi-realistic digital painting / 3D-render fidelity, dramatic lighting, glowing accents.
   - Dark, high-contrast cyberpunk. Transparent background.

## Hard constraints (all regenerations)

- **NO pixel art / 8-bit.** **NO glossy plastic toy render.** **NO flat vector/cel with navy-blue + orange.**
- **NO embedded text/letterforms** (the current shock-trooper has "ARK" text baked in — drop it).
- Primary glow accent = **RED** (bots) to stay in the roster's red-threat language; reserve blue/purple
  for the existing wraith/IX identities only. Orange permitted ONLY as fire/incinerator accent on purge-drone,
  and subordinate to the painted/inked treatment (not the dominant palette).
- Transparent background, single centered subject, consistent framing/scale with the canon reference.
- Produce all 5 poses per enemy, matching the pose semantics of the existing files.

## Per-enemy target (match nearest canon sibling)

| Enemy | Files (5 poses each) | Match to | Design direction |
|---|---|---|---|
| **shock-trooper** (ARK 인간 병사) | `shock-trooper-{idle,guard,attack,skill,hit}.png` | `enforcer-unit` (painterly render) | Dark armored ARK trooper, rifle; realistic render like the enforcer, **red** visor/accents. Currently PIXEL ART — replace wholesale. |
| **purge-drone** (소각 드론) | `purge-drone-{idle,guard,attack,skill,hit}.png` | `maintenance-drone` (inked-comic) | Aerial incinerator drone, inked-comic gunmetal/rust body, **red** optics with **orange incinerator/flame** nozzle accents. Currently glossy blue toy render. |
| **suppression-mech** (중진압 전차/메크) | `suppression-mech-{idle,guard,attack,skill,hit}.png` | `maintenance-drone` (inked-comic, heavy) | Bipedal riot-suppression mech, inked-comic heavy plating, gunmetal/rust, **red** sensor + riot-shield glow. Currently flat navy+orange cel. |
| **tracker-spider** (추적 거미봇) | `tracker-spider-{idle,guard,attack,skill,hit}.png` | `sentinel-drone` (inked-comic spider-bot) | Multi-legged recon spider-bot — same silhouette family as sentinel-drone; inked-comic, gunmetal/rust, single **red** central optic. Currently flat navy+orange cel. |

## Acceptance

- 20 PNGs regenerated (4 enemies × 5 poses), transparent bg, canon-consistent per the table.
- Side-by-side with the match reference reads as the same roster (palette + rendering medium).
- `tests.test_image_assets` passes (files exist, correct names) + no alien palette/medium on inspection.
- Post-integration: appears correctly on the tactical board (spawn + poses swap) — verify via combat sim.

## Notes

- Keep filenames exactly as-is (renderer maps `<enemy>-<pose>.png`).
- FLUX/local generation is NOT preferred here — it won't match the curated look; route through codex.

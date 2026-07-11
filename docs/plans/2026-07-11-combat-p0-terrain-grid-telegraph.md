# Combat P0 — terrain layer · wider grid · full telegraph (2026-07-11)

Authority research: `docs/plans/2026-07-11-combat-redesign-research.md` (A안 = ItB-style
deterministic puzzle; P0 = low-cost slices on the current system). Owner approved start.

## Slices

1. **Telegraph 승격 (full telegraph)** — enemy intents already render target tiles
   (⚔️/👣, `combatCanvas.ts:577`); missing is *what it will cost*. `EnemyIntent` gains
   `damage_hint` (the enemy weapon's dice notation, e.g. "2d6") filled by the engine when
   planning; the canvas draws it on the attack-intent tile so a threatened tile reads
   "⚔ 2d6", plus an attacker→target connector. This is information-only (no rules change);
   the ItB "no-miss determinism" experiment is P1, not this slice.
2. **Grid widen** — standard encounter arenas 8×6 → **10×7 minimum** (bosses keep their
   authored size). Enlarging is additive (spawn/cover/hazard coords stay valid); movement
   speeds 4-6 still traverse in ~2 turns. Balance feel = owner playtest note.
3. **Terrain sprite layer** — the board floor/cover render procedurally today. The canvas
   gains an optional per-scenario tile-sprite layer: `resources/<sid>/combat/tiles/`
   (`floor.png`, `floor_alt.png`, `cover_half.png`, `cover_full.png`, `hazard.png`),
   drawn under the grid when present, procedural look otherwise (graceful fallback, no
   asset gate). Art generation itself is seeded to the codex lane (curated key art =
   codex, owner directive 2026-07-06).

## Verification

`make check` green + frontend build; visual confirm on the combat simulator via emulator
(owner or next session's browser pass). Slice 2 balance is `[manual]` play feel.

## Out of scope (P1+)

No-miss determinism, push/pull skills, immovable-objective win conditions, environment
interactions — per the research roadmap, after P0 lands and is felt.

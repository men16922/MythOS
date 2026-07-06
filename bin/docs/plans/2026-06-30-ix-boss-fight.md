# IX Boss Fight — design + overnight 2-lane spec (2026-06-30)

**Problem**: The Neo-Seoul climax ("관리자 IX 대면") is narrative-only. IX exists as a *character*
(`characters/administrator-ix.png`, dialogue) but **has no combat enemy in the bestiary and no
dedicated boss encounter** — the route `boss` node maps to `["enforcer_standoff","mech_siege"]`, so the
final fight just spawns generic drones/mech. Players reach the boss node and see no IX.

**Goal**: A real IX confrontation fight — IX as a boss-tier combatant + a dedicated encounter the boss
node resolves to. Built **data-driven** (scenario.json) on the existing combat engine where possible.

## Engine capabilities to lean on (no/minimal engine change)
Existing: multiple enemies, per-enemy skills + cooldowns, enemy intents (telegraph), hazards
(acid/electro tiles), elevation/cover, FOCUS, allies, defeat = all controllables down. A boss can be a
single high-HP/high-defense enemy with strong unique skills + summoned adds + a hazard-heavy arena.
**Stretch (optional, only if a lane has budget)**: a low-HP "phase" hook in `mythos_combat` (e.g. at
≤50% HP IX gains a skill / spawns adds). Keep core design within data so `[auto:claude]` stays
`make check`-verifiable without engine edits.

## Shared CONTRACT (both lanes build to this — agree up front)
- **Bestiary enemy id**: `administrator_ix` · name `관리자 IX` / EN `Administrator IX`.
- **Portrait** (bestiary `image`): `enemies/administrator-ix.png`.
- **Action poses (5, RGBA 512×768)**: `enemies/combat/administrator-ix-{idle,attack,guard,skill,hit}.png`.
- **Boss encounter id**: `ix_confrontation` (IX + 2 adds, e.g. `purge_drone`/`sentinel_drone`), hazard-rich arena.
- **IX skills** (claude names them; e.g. `ix_optimize` heavy single-target, `ix_purge_field` AoE/hazard,
  `ix_summon` add spawn) → each needs a `skills/<skill_id>.png` icon (codex generates).
- **Route wiring**: the `boss` route node's encounter list resolves to `ix_confrontation` (replace or
  prepend to `["enforcer_standoff","mech_siege"]`).
- **Style for art**: towering authoritarian control-AI avatar — geometric/holographic, ARK-white + cold
  neon, oppressive scale. Consistent with existing peer-card frame bible + `characters/administrator-ix.png`.

## Lane breakdown (overnight)

### `[auto:claude]` — boss DESIGN (scenario.json + tests)
- Add bestiary `administrator_ix` (boss-tier hp/defense/armor, 2–3 unique skills with cooldowns/intents),
  the `ix_confrontation` encounter (IX + adds + hazards), and IX skill defs.
- Wire the route `boss` node → `ix_confrontation`.
- **Keep `make check` green without waiting on codex art**: commit **placeholder sprites** at the 6 IX
  paths by copying `suppression-mech` poses (`cp enemies/suppression-mech.png enemies/administrator-ix.png`,
  `cp enemies/combat/suppression-mech-<pose>.png enemies/combat/administrator-ix-<pose>.png`) so asset
  integrity resolves; mark in the plan that codex overwrites them.
- Tests: extend `test_content_integrity.py`/`test_encounter_balance.py` — IX boss winnable by a prepared
  party (≥0.50) and non-trivial (≤0.95) at QA seed; `ix_confrontation` reachable from the boss node;
  every IX skill id has a `skills/<id>.png`.
- **Completion criterion**: `make check` green; the boss route node resolves to `ix_confrontation` with
  IX present; balance invariant passes.

### `[auto:codex]` — IX combat IMAGES (overwrite placeholders)
- Generate (codex in-session Imagen/Gemini) the IX **portrait** + **5 action poses** at the exact contract
  paths (RGBA 512×768), and each **IX skill icon** `skills/<id>.png`, matching the style bible.
- Overwrite the claude-committed placeholders at the same paths.
- **Completion criterion**: all 6 IX sprites + the IX skill icons present at the contract paths, non-placeholder
  (visibly IX, not a recolored mech); `test_assets.py` integrity green. (Merge: codex binaries win for these paths.)

## Merge note
Both lanes touch the IX sprite paths (claude=placeholder, codex=real). On integration, **codex's binaries
win** for `enemies/administrator-ix.png` + `enemies/combat/administrator-ix-*.png` + IX `skills/*.png`;
claude's scenario.json/test changes merge normally.

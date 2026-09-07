# Status-effect stacking rework

Owner decision: 2026-08-15 conversation, "option 2" — reapplying a status builds
**stacks** (intensity scaling), not just duration. `NEXT_PLAN.md` Priority 1 /
Combat.

## Baseline today

`CombatantState.status_effects: dict[str, int]` stores **remaining turns**
per status id (`src/mythos_combat/models.py:79`). `_apply_status_effect`
(`engine.py:1642`) accumulates turns into that same int, capped by
`STATUS_EFFECT_TURNS_CAPS` (`{"burn": HARD_CC_TURNS_CAP}`, default
`STATUS_EFFECT_TURNS_CAP=6`). Magnitude is a fixed constant per status,
read at the point of use, independent of how many turns remain:

| status  | magnitude read site                              | fixed effect today |
|---------|---------------------------------------------------|---------------------|
| burn    | `_tick_status_effects` (`engine.py:1680`)          | `1d4` DoT per tick |
| corrode | `_effective_armor` (`engine.py:1722`)              | `-2` armor flat |
| shock   | `_tick_round_upkeep` (`engine.py:1487`)            | no focus regen / cooldowns frozen while active |
| freeze  | `_movement_frozen` / move guards (`engine.py:1728`, `2544`, `2579`) | blocks movement while active |
| acid    | `Combatant.effective_defense` (`models.py`)        | `-2` defense flat (floor 1) |
| hacked  | `_hacked_turn` / `has_status` (`engine.py:1597`)   | consumed wholesale on the hacked turn |

`_apply_stun` (`engine.py:1739`, separate from `status_effects`) already has a
turns-accumulation + boss-halving guard precedent worth reusing for tone, not
for storage shape.

## Stack semantics (this design)

**Data shape** — `status_effects: dict[str, int]` stays the **turns** ledger
(unchanged); a parallel `status_stacks: dict[str, int]` holds intensity.
Reapplying accumulates `turns` to the cap (as today) **and** increments
`stacks` up to a per-status cap. `Combatant.status_stack(id)` is the read
seam: 0 when inactive, else `max(1, status_stacks.get(id, 1))` — a status
present in `status_effects` with no stack entry (old saves, direct test
setup) behaves as one stack. *Implementation note (2026-09-06): the first
draft proposed a `dict[str, StatusStack(stacks, turns)]` tuple shape; the
parallel dict was chosen instead because ~30 existing test sites, the
generic dataclass `to_json_dict`/`from_json_dict` round-trip and the
already-persisted saves all read `status_effects[id]` as an int — same
semantics, no migration.* The blip payload (`narrator.py`) carries
`status_stacks` next to the `status` chip list so the frontend badge shows
a stack count without a second round-trip.

**Per-status stack rules** (only statuses with a numeric magnitude scale;
binary-gate statuses stay unstacked):

- **burn** — stacks scale DoT: `damage = max(1, dice.roll("1d4")) * stacks`.
  Cap `BURN_STACK_CAP = 3` (mirrors `HARD_CC_TURNS_CAP` intent: bounded, not
  a runaway multiplier). Rationale: burn is the only current DoT, so it is
  the one status where "intensity" has an obvious reading.
- **corrode** — stacks scale the armor penalty:
  `armor -= 2 * min(stacks, CORRODE_STACK_CAP)`, `CORRODE_STACK_CAP = 2`
  (floor at 0 armor already exists via `max(0, armor)`).
- **acid** — stacks scale the defense penalty the same way as corrode:
  `effective_defense -= 2 * min(stacks, ACID_STACK_CAP)`, cap 2 (floor 1
  already exists). *(The first draft wrongly said acid had no magnitude site;
  `Combatant.effective_defense` already applied a flat -2.)*
- **shock, freeze, hacked** — **do not stack**. These are binary gates
  (turn is either shocked/frozen/hacked or not); a second application still
  accumulates `turns` up to the cap (07-12 rule, unchanged) while `stacks`
  stays pinned at 1.

**Stack decay** — stacks do **not** decay independently of turns. When
`turns` reaches 0 the whole status (turns + stacks) clears, matching today's
expiry log (`status_{id}_expired`). A stack cap is a ceiling on
reapplication, not a per-turn decrement — ticking down `stacks` on every
turn like `turns` would make "intensity" indistinguishable from "duration"
and defeats the owner's option-2 intent.

## Concurrent multiple statuses

No change to the concurrency model is needed: `status_effects` is already a
dict keyed by status id, so burn+acid+shock+hacked coexist as independent
entries today and will continue to under the stack shape. What this rework
must verify (not change):

- **Tick order** — `_tick_status_effects` iterates `list(actor.status_effects)`
  (insertion order). Burn's DoT can reduce `actor.hp` to 0 mid-loop; the
  existing `actor.alive` check before applying burn already guards later
  entries in the same call, but add a regression test with
  burn+acid(once wired)+shock+hacked applied together and assert: (a) each
  status ticks its own turns/stacks independently, (b) a mid-tick death
  stops remaining status processing for that actor without KeyError/mutation
  errors on `list(actor.status_effects)`, (c) `status` mirror list and the
  new `stacks` field stay consistent with `status_effects` after the tick.
- **Independent expiry** — a test where burn (2 stacks, 1 turn left) and
  corrode (1 stack, 3 turns left) are applied together; assert burn expires
  and clears its own dict entry while corrode's stack/turns are untouched.
- **Damage interaction** — burn DoT stacking (2x/3x) must be visible in the
  `hit`/`defeat` log `detail["damage"]`; corrode's armor stacking must show
  up in the next incoming-hit damage calc (`_effective_armor` call site),
  not in `status_effects` directly.
- **UI sync** — `combatView.ts`'s `status`/HP-band read path
  (`docs/PROGRESS_LOG.md` 2026-09-05 entry) and the status chip must render
  the stack count (e.g. "burn x2") wherever it currently renders the status
  id alone; verify via `gameplay-qa` (Patrol Ambush + Se-rin/Kai sim) that
  the badge updates on stack increase and clears on expiry.

## Out of scope

- Changing `_apply_stun`'s separate accumulation model — stun stays turns-only
  per the 2026-07-12/07-14 owner calls, this rework only touches
  `status_effects`.
- Any narrative/balance rebalancing of stack caps beyond the bounded default
  above — caps are a starting point for implementation, not a final balance
  pass (`gameplay-qa` may recommend adjustment after simulator play).

## Implementation (2026-09-06)

- `src/mythos_combat/status_rules.py` — **the** per-status table (`StatusRule`:
  turns cap, stack cap, DoT dice, per-stack armor/defense penalty); engine/tests
  re-import the derived `STATUS_*` names from it.
- `src/mythos_combat/models.py` — `status_stacks` field; `status_stack()` seam
  (clamps to the rule cap on read); `status_armor_penalty()`/`status_defense_penalty()`;
  `clear_status(id, keep_chip=)` / `clear_all_statuses()` as the removal seam
  (tick expiry, hacked consumption, revive).
- `src/mythos_combat/engine.py` — `STATUS_STACK_CAPS = {"burn": 3, "corrode": 2, "acid": 2}`;
  `_apply_status_effect` raises stacks and appends a localized `status_stack_suffix`
  (" (중첩 ×N)" / " (×N)") once stacked; `_tick_status_effects` burn DoT `1d4 × stacks`
  with `stacks` in the log detail, stacks popped on expiry; `_effective_armor`
  `2 * stacks`; `_hacked_turn` pops the stack entry with the status.
- `src/mythos_combat/narrator.py` — blip payload gains `status_stacks`.
- UI — `types.ts` `CombatBlip.status_stacks`; `CombatRoster.tsx` chip text " ×N";
  `combatCanvas.ts` draws a status-colored count pip at the chip's lower-right.
- Tests — `tests/test_combat_skill_feedback.py::StatusIntensityStackingTest`
  (caps, binary gates pinned at 1, burn scaling, corrode/acid scaling, legacy
  one-stack fallback, expiry + serialization, hacked consumption, the
  concurrent-status regression with mid-tick death); the 2026-07-12
  `test_status_duration_caps` "flat -2" assertion updated to the stacked value.

## Addendum 2026-09-07 — boss stack resistance

Taken as an agent decision under the owner's repeated "continue" directive (DECISIONS 2026-09-07),
reversible by one constant. `status_rules.BOSS_STACK_CAP = 2`; `stack_cap(status_id, boss=...)` returns
`min(rule.stack_cap, BOSS_STACK_CAP)` for a boss and the three seams that read a cap pass
`boss=unit.ai == "boss"` (`Combatant.status_stack`, `_apply_status_effect`, the companion-AI rider
check). A refused stack still refreshes the turns ledger and logs `status_stack_resisted`
(detail `{"status_stack_resisted": <id>, "status": <sid>}`), mirroring `stun_resisted`. Only burn is
affected today (cap 3 → 2 on a boss); corrode/acid already cap at 2. Measured effect:
`docs/reference/2026-09-06-status-stacking-balance.md` §Boss stack resistance.

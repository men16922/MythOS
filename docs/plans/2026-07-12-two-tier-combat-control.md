# Two-tier combat control — targeting & enemy-intent prediction (2026-07-12)

Owner directive (live session on 00052): "전투에 흥미가 없는 플레이어는 버튼 클릭만 하게 하고,
전투를 좋아하는 플레이어는 컨트롤을 할 수 있게 해보자" — SRPG-style manual targeting and
enemy-action prediction as an OPT-IN layer, never a burden on casual players.

## Inventory — what already exists (don't rebuild)

| Capability | Where | Tier it serves |
|---|---|---|
| One-click auto attack (nearest/default target) | CombatControls 공격 버튼 | casual |
| Manual target list (TARGETS) | CombatControls target chips | tactical |
| Drag-to-move the active unit | useCombatBoard dragRef | tactical |
| Enemy telegraphs (⚔ dice + attack line + 👣 move intent) | combat engine intents + canvas | both (passive) |
| Tile inspector (HP·Intent·Cover, fixed-size) | TileInspector / DS3b | tactical |
| XCOM ground-target throwable (EMP: cell pick + radius preview) | useCombatBoard itemTargeting (2026-07-12) | tactical — **slice 1 shipped** |
| Tap-to-skip cinema | flushCinema (2026-07-12) | casual (pace control) |

The 2-tier split therefore does NOT need a mode toggle to start: the casual path (buttons)
already works end-to-end, and every tactical affordance is opt-in by construction. What is
missing is DEPTH on the tactical side:

## Gaps → implementation slices (each `[auto:claude]`-sized, behavior-additive)

1. **Skill cell/unit targeting parity** — skills with `push`/`pull`/`aoe_radius`/`stun` should
   support the same "arm → board pick → preview" flow as the EMP grenade (reuse
   `itemTargeting` generalized to `groundTargeting {kind: skill|item}`): preview shows
   displacement arrow (push/pull destination) or blast ring (aoe) or 💫 (stun) BEFORE
   committing. Casual users keep pressing the button (auto-target unchanged).
2. **Attack outcome preview on target chips** — each TARGETS chip shows hit% (d20 vs
   effective_defense is deterministic server-side; expose `hit_chance`+`dmg_range` per target
   in `available.targets`) and a 🛡 marker when cover would apply. This is the XCOM "shot HUD"
   in one line, no new screen.
3. **Enemy intent hover-line** — hovering/tapping an enemy highlights ITS telegraph (target
   line + damage) even out of my-turn context, and the inspector adds "next action: ⚔ 2d6 →
   세린". Data already in radar intents; purely a lens.
4. **(defer) full forecast timeline** (XCOM2-style turn order strip with intents) — only if
   1-3 don't satisfy; adds UI surface cost.

Slices 1-3 are independently shippable; each ends with `make check` green + AGY post-commit
screen (browser-observable). Owner feel-verdict decides whether tier depth is "enough" before
slice 4.

## Non-goals

- No separate "mode switch" setting — tiers are expressed by which affordances you touch.
- No auto-battle button (casual = current click flow, not full automation) unless owner asks.
- Combat math changes: none here (P1 hit-chance rules stay as owner decided 07-11).

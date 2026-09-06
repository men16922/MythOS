# Status-stacking balance check — greedy baseline, stacking ON vs OFF (2026-09-06)

Evidence for the `[manual]` stack-feel verdict (NEXT_PLAN Priority 1). Measured with `scripts/sim_boss.py`'s
`_play` (conservative greedy party: approach + basic attack, no player skills — the same policy the balance
invariant uses), 60 seeds per cell, on every Neo-Seoul encounter whose enemies carry a status weapon
(`plasma_torch` → burn, `acid_spitter` → acid; `shock_baton` is a binary gate and unaffected). OFF = every
`StatusRule.stack_cap` patched to 1 (the pre-2026-09-06 rule); ON = shipped caps burn 3 / corrode 2 / acid 2.

| encounter | party | win ON | win OFF | Δ | rounds | max stack seen | player HP% end ON / OFF |
|---|---|---|---|---|---|---|---|
| stray_incinerator | solo | 0.53 | 0.53 | 0 | 2.9 | 2 | 30 / 30 |
| stray_incinerator | se_rin+kai | 1.00 | 1.00 | 0 | 2.2 | 2 | 87 / 87 |
| refuge_perimeter_probe | solo | 0.65 | 0.65 | 0 | 3.2 | 2 | 26 / 27 |
| refuge_perimeter_probe | se_rin+kai | 1.00 | 1.00 | 0 | 2.5 | 2 | 80 / 80 |
| tracker_ambush | solo | 0.30 | 0.30 | 0 | 3.1 | 2 | 11 / 12 |
| tracker_ambush | se_rin+kai | 1.00 | 1.00 | 0 | 2.8 | 2 | 77 / 77 |
| mech_siege | solo | 0.07 | 0.07 | 0 | 3.8 | 2 | 2 / 2 |
| mech_siege | se_rin+kai | 0.98 | 0.98 | 0 | 5.5 | 2 | 45 / 45 |
| **purge_incineration** | **solo** | **0.55** | **0.65** | **−0.10** | 2.5 | **3** | 28 / 30 |
| purge_incineration | se_rin+kai | 1.00 | 1.00 | 0 | 2.1 | 2 | 69 / 71 |
| ix_confrontation | solo | 0.30 | 0.30 | 0 | 4.8 | 0 | 10 / 10 |
| ix_confrontation | se_rin+kai | 0.88 | 0.88 | 0 | 5.0 | 0 | 46 / 46 |

Reading:

- Under the baseline policy fights last 2–5 rounds, so a status rarely gets a third application: 10 of 12
  cells never exceed ×2 and their outcomes are identical to the old rule. The stacking change is
  **balance-neutral for the invariant policy**; `make test`'s balance invariants pass unchanged.
- The one cell that moves is the all-`purge_drone` encounter played solo: three torch hits reach burn ×3
  (`1d4 × 3` per tick) and the win rate drops 0.65 → 0.55. With Se-rin + Kai it stays 1.00. This is the
  encounter to watch in the feel verdict; if it reads as unfair, `STATUS_RULES["burn"].stack_cap = 2` is
  the one-row lever.
- The IX fight's purge drone never landed a torch hit across 120 runs (max stack 0), so the boss fight is
  untouched by this change.
- Not measured: player-side stacking (the greedy policy casts no skills or grenades), so the offensive
  upside — burning a boss ×3 — has no number yet. The `[manual]` verdict covers it.

## Offensive side — burn pre-applied to the toughest enemy (synthetic upper bound)

Same greedy party, but at fight start burn ×N (3 turns each) is placed on the highest-`max_hp` enemy for
free — an **upper bound**: in play each application costs a player turn or the single incendiary grenade,
and the 화염-type skills have cooldowns, so ×3 on a boss is reachable but not free.

| encounter | party | burn ×0 | ×1 | ×3 | rounds ×0→×3 | boss killed by a burn tick (×3) |
|---|---|---|---|---|---|---|
| **ix_confrontation** | **solo** | **0.30** | 0.50 | **0.82** | 4.8 → 3.6 | **0.33** |
| ix_confrontation | se_rin+kai | 0.88 | 0.85 | 0.97 | 5.0 → 3.9 | 0.30 |
| mech_siege | solo | 0.07 | 0.12 | 0.33 | 3.8 → 3.1 | 0.20 |
| mech_siege | se_rin+kai | 0.98 | 0.98 | 1.00 | 5.5 → 3.7 | 0.40 |
| enforcer_standoff | solo | 0.22 | 0.57 | 0.95 | 3.6 → 2.7 | 0.58 |
| enforcer_standoff | se_rin+kai | 1.00 | 1.00 | 1.00 | 2.9 → 2.2 | 0.45 |

Reading:

- The defensive side is neutral, the **offensive side is not**: a fully stacked burn is the strongest single
  lever the player now has against a high-HP target. On IX it turns a 0.30 solo fight into 0.82 and ends a
  third of the fights with the boss dying to an overheat tick rather than a blow.
- That is exactly the pattern the 2026-07-14 boss stun-resistance call was made against (two cd-3 stun
  sources could rotation-lock IX). **Decision for the owner**, not made here: keep it (a hard-won ×3 on a
  boss *should* feel decisive) or give bosses stack resistance — one `StatusRule`/engine guard, e.g. boss
  stack cap 2, or halve DoT stacks on `ai == "boss"` the way `_apply_stun` halves follow-up stuns.
- Non-boss fights read as intended: `enforcer_standoff` solo 0.22 → 0.57 at ×1 says the first application
  already matters; ×3 finishing it is the reward for spending three turns on setup.

Reproduce: the runner script lives outside the repo (session scratchpad); it is ~40 lines over
`sim_boss._play` with `dataclasses.replace(rule, stack_cap=1)` applied to `status_rules.STATUS_RULES`.

## Appendix — `_weapon_in_range` high-ground +1 ranged range, wired vs dead (same harness)

NEXT_PLAN review residual: the `state` parameter that grants ranged weapons +1 range from higher elevation
has no caller. Measured by injecting `state` through a wrapper (greedy baseline, all 12 Neo-Seoul
encounters × solo / Se-rin+Kai × 60 seeds): **24/24 cells identical win rate and mean rounds**; the bonus
flipped the in-range answer in **7 of 23,993 range checks (0.03%)**. Caveat: the greedy policy always
closes to melee/weapon reach, so a ranged-kiting player on high ground is not represented. Nothing in the
UI or docs promises the bonus (only "High ground +1" in the tile inspector, which is the damage bonus that
*is* wired). Outcome: the parameter was dropped the same day (DECISIONS 2026-09-06) — high ground stays a
damage bonus; reach from elevation would be a new, deliberate rule.

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

Reproduce: the runner script lives outside the repo (session scratchpad); it is ~40 lines over
`sim_boss._play` with `dataclasses.replace(rule, stack_cap=1)` applied to `status_rules.STATUS_RULES`.

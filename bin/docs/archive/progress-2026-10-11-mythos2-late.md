# Progress log — archived entries (2026-10-11, event balance)

## 2026-10-11 — Event balance audit + guard (and a correction)

- **Correction**: the wave-4 entry says "the sim does not resolve events". It does — `runSim.decideEvent` picks the best expected-value option with `outcomeValue`; I had read a field that doesn't exist. Balance of events was therefore measurable all along.
- Audit (`outcomeValue` per option at a mid-run state, stats 4 and 6): the new street-level events sat at the bottom of their acts — 5 had every open option net-negative, i.e. a pure tax. Retuned `a1_bus_stop_scan`, `a1_hand_crank_lamp`, `a2_toll_bridge_kids`, `a2_lantern_ferry`, `a2_face_stall`, `a3_name_archive`, `a3_maintenance_priest`, `a3_serin_inside_line` (small credit / ◈ / HP gains, lighter failures, a few DCs 7→6); all open-option bests are now ≥ 0.7. The five arc finales intentionally tie at 10 (gated behind two earlier parts); `a3_ix_offer` (21.7) is the deliberate outlier.
- New `engine/event-balance.test.ts` locks it: best open option ≥ 0.5 and ≤ 12 for every rolled event, with two named exceptions (`a3_blank_in_list` — an authored heavy-trade twist the scale undervalues; `a3_ix_offer`) and a check that exemptions don't go stale. `runSim.outcomeValue` is now exported for it.
- Sim A/B on identical seeds (mixed bot, 3 blocks × 60): before any event wave 72/180 (40 %) → after the waves 74/180 (41 %) → after this retune 78/180 (43 %). Differences are inside the ±5 pp noise; the 30 extra events did not move difficulty.
- Continuity fix: `a3_kai_name_given` no longer assumes the umbrella was bought (touch-only path).

Older entries: `bin/docs/archive/progress-2026-*.md` (2.0 build: `progress-2026-10-10-mythos2-overnight-build.md`; 2.0 feedback round + residuals: `progress-2026-10-11-mythos2-early.md`; sign-in, leaderboard, Android, 1.x archive: `progress-2026-10-11-mythos2-online.md`; event waves, arcs, balance audits: `progress-2026-10-11-mythos2-balance.md`); 1.x: branch `1.0`.

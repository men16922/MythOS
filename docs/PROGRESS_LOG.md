# Progress Log

Last updated: 2026-11-05

## 2026-11-05 — Sea-route fixes, IX by route, safehouses (Claude Opus 5.5, same goal)

- Earlier the same day (deep/sea events, district lore, banter for all 91 pairs, companion options, readable Sea hints, owner calls decided by the agent, three deploys, boss and elite taunts) is logged in `bin/docs/archive/progress-2026-11-04-oldest.md` (top section). This log went empty at `449e528` when that single 18 k section was archived to fit the budget; restored here.
- **Production**: `00183-xaz` (`5db096d`, everything below), `verify-preview` 6/6, preview and production `url-smoke` 3/3; rollback `00181-riy`.
- Event GM (AI off) on Sea routes: no rain, neon or street lamps; salt, a customs beacon, the foghorn, a drawn-back tide. Narration context carries `route`. **Verified**: `localGm.test.ts`; UI KO/EN on three Sea events.
- Safehouse on Sea routes: the crew dormitory, a barge cabin, the Keepers' storeroom (existing art) instead of the Deep acts' library, garden and server hall; the AGI improvise-fail line drops "rain-slick". **Verified**: UI KO/EN on Sea 4/5/6 and Deep 4 safehouses, art loads, 0 console errors.
- English Deep + Signal+ UI playthrough with today's content: won in 23 min (`a6_boss_loop_engine`), 0 page errors.
- Shops did the same: Sea Acts 4–6 traded at the Glass Library return desk, the magnet-claw stall and the margins stall, and the Outside route at the night market. Shop and safehouse places are now keyed by route first: Outside = the pawn window / the bathhouse after closing; Sea 4–6 = the customs auction rail, the bottle stall, the crate of rejected lenses (all existing art). `run.route` resets at the end of a route act, so Act 3 keeps its own places. **Verified**: UI KO/EN for Outside, Sea 4, Sea 6 and Deep 3 shops and the Outside safehouse: right name, art loads, 0 console errors.

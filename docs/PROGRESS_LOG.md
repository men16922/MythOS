# Progress Log

Last updated: 2026-11-05

## 2026-11-05 — Sea-route fixes, IX by route, safehouses (Claude Opus 5.5, same goal)

- Earlier the same day (deep/sea events, district lore, banter for all 91 pairs, companion options, readable Sea hints, owner calls decided by the agent, three deploys, boss and elite taunts) is logged in `bin/docs/archive/progress-2026-11-04-oldest.md` (top section). This log went empty at `449e528` when that single 18 k section was archived to fit the budget; restored here.
- **Production**: `00181-riy` (`3716582`), rollback `00179-juj`. Not yet deployed: the items below from `449e528` on.
- Event GM (AI off) on Sea routes: no rain, neon or street lamps; salt, a customs beacon, the foghorn, a drawn-back tide. Narration context carries `route`. **Verified**: `localGm.test.ts`; UI KO/EN on three Sea events.
- Safehouse on Sea routes: the crew dormitory, a barge cabin, the Keepers' storeroom (existing art) instead of the Deep acts' library, garden and server hall; the AGI improvise-fail line drops "rain-slick". **Verified**: UI KO/EN on Sea 4/5/6 and Deep 4 safehouses, art loads, 0 console errors.
- English Deep + Signal+ UI playthrough with today's content: won in 23 min (`a6_boss_loop_engine`), 0 page errors.

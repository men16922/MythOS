# Progress Log

Last updated: 2026-11-03

## 2026-11-03 — Bot takes companions, Acts 2–3 re-tuned; reverse-engineering 1–3 analysed (Claude Opus 5.5, owner: 다음 작업 수행)

- **Analysis**: Across the Obelisk, Cobalt Core, Tactical Breach Wizards (`docs/plans/2026-11-03-reverse-engineering-1-3.md`): level-3/5 choice of two, line-up measurement, undo for actions that reveal nothing. Built nothing; prototypes wait for the owner.
- **Found by the line-up measurement**: the bot valued a companion at 10 and the Act 2 go-alone bundle at ~16, so it always went alone; 114/148 Deep runs reaching Act 4 had one companion. Party and growth numbers since 11-01 measured a solo crew. Bot: 20 with a free slot, 6 for a bench seat (`runSim.ts`, regression test). Fix alone: fresh 39.1 → 50.4 %, Deep 26.0 → 30.0 %.
- **Re-tune** (`tuning.acts`): Act 2 HP +22 → +30 %, Act 3 HP +46 → +56 %, dmg +3 → +4, boss HP −30 → −36 %. Canonical mixed: fresh 187/450 = 41.6 %, Deep 41/150 = 27.3 %, Sea 26.7 % (was 22.0; fix alone 27.3), bosses at most 9.1 turns. `event-balance.test.ts` jackpot cap now ignores recruits (a companion is a party decision, every other payout still counts).
- **Verified**: `make check` (node 529, Python 338), `make test-e2e-v2`, `make playthrough-quick` (Act 1 only). Production clean after `00173-mab` (0 errors, no real players yet). Unverified: Acts 2–3 in the real UI, feel of the harder middle, card overlap by line-up (the sim does not log plays). A daily started before a deploy of this and submitted after should replay under the new numbers and lose its shield (inferred, not tested; ranking unchanged).

## 2026-11-02 — DLC 3 + bot re-tune deployed to production (Claude Opus 5.5, owner: 프리뷰랑 운영 둘다 배포)

- `make frontend-build` reproduced the committed bundle (no diff). `make deploy-preview` → `00173-mab`; `make verify-preview` 5/5 (`git-sha=8973143` = HEAD, postgres store, Gemini GM, google sign-in, `app.js` match); the DLC 3 content chunk (`assets/fonts.js`) hash also matches; `make url-smoke` on the preview: sandbox win, run flow, 0 errors.
- Promoted with `update-traffic --to-latest` (100 % `00173-mab`, rollback `00171-yuj`). Production: health ok, `app.js` + content chunk hashes = committed, `url-smoke` pass, 0 errors.
- Unverified: fun, tide/rewind feel and late-game fairness (human play), real-player logs after the promotion.

## 2026-11-01 — DLC 3 The Unwritten Sea built (Claude Opus 5.5, Astra drafts, owner: DLC 3 at AA volume)

- **Built** on `main`, not deployed. Plan `docs/plans/2026-11-01-dlc3-plan.md`, setting `docs/plans/2026-11-01-dlc3-bible.md`. Third depth, parallel Acts 4–6: 61 fights (28 with tide), 55 enemies (10 bosses), 75 events, 45 cards, 13 implants, 20 gear, 4 consumables, 3 companions, Navigator, 7 endings, 3 duos, 12 achievements.
- **New rules**: tide (`engine/tide.ts`), squad tactics in every depth (`engine/squad.ts`, 12), rewind (Navigator, `rewindTurn`), residue (a word next run, no power), three logs to the secret boss.
- **Art**: 468 Codex images, DLC 2's borrowed art replaced, gear icons in the UI. Every image reviewed on contact sheets. 17 boss and cut-in images and 38 others redone: gray studio backdrops, companions off-model (Seo-ha drawn young), Act 4 scenes showing a sea the act says is gone.
- **Caught by measuring**: sea implants, gear and consumables leaked into standard pools (fresh 39.1 → 36.9 %, hash changed): route-gated, hash back to `e5d0dd7da7d4`, leak test added. An early `tsc` call checked nothing, so one draft's syntax error slipped to the test step: `tsc -b` is the real check. Committed once with a doc-budget failure: fixed next commit.
- **Act 6 of the sea**: a road boss rolled at random meant some runs never met the Lightkeeper the endings speak to. Foghorn or Lens Saint now leads straight into the Lightkeeper (half HP back), then the secret fight.
- **Balance** (canonical, mixed): fresh 176/450 = 39.1 % (unchanged), once-won 39.3 %, route forced 41.1 %, Deep 26.0 %, Sea 33/150 = 22.0 %. Bosses average at most 8.5 turns per act; Commissioner Gong alone 9.4. Late enemy damage is high (`tuning` Act 6 +17, Sea +12): only a human can say if it feels fair.
- **Verified**: `make check`, `make test-e2e-v2`, `make playthrough-quick`; on final engine and content code a full sea run through the real UI as the Navigator with all three logs, into the secret fight and to an ending (assist mode); rewind in the real UI after a move (a card rewind in the engine test); the hidden ending chosen in the real UI. Unverified: fun, tide and rewind feel, music (reuses old tracks, Lyria bills Vertex), production.

## 2026-11-01 — Bot plays gear and growth like a person, re-tune (Claude Opus 5.5, owner: 작업 완료시까지 수행)

- **Bot**: trains deployed companions, buys gear, swaps weaker pieces, fills the third slot from Act 4. Same seeds: fresh 41.8 → 36.4 %, Deep 32.7 → 39.3 %. The old numbers understated the late game.
- **Tuning**: acts 4–6 raised (`hpPct` 130 / 190 / 240, `dmg` 9 / 14 / 17), new per-act `bossHpPct` (3: −30, 5: −20, 6: −70). Fresh 176/450 = 39.1 %, once-won 39.3 %, route forced 41.1 %, Deep 38/150 = 25.3 %. Bosses at most 8.8 turns in Deep, 8.4 in standard.
- **Real UI**: gear on reward and shop, buying, Act 4 four-person fight at desktop and 390 px, 0 errors. Phone squad strip clipped the fourth person: fixed.
- **Verified**: `make check` (node 517, Python 338), `make test-e2e-v2`, `make playthrough-quick`. Unverified: human feel of the new numbers.

## 2026-11-01 — Promoted `00171-yuj`, next steps planned (Claude Opus 5.5, owner: deploy to production)

- **Deployed** on owner order: preview `00171-yuj` (`de62fd1`) verified 5/5, promoted with `--to-revisions`; 100 %, label and bundle `ed531b3557d3` match; rollback `00169-fih`.
- **`url-smoke` fixed**: a collected reward stays as a disabled "Taken" button, which also matches `Take`, so the blind clicker pressed it forever on a won fight. Enabled buttons only now. Preview after the fix: 10 runs, 9 defeats and 1 win, all reached their end.
- **Production timeout**: `url-smoke` run flow timed out once after the fix. Then 9 production runs (8 ended, 1 still a playable fight on turn 13, the blind clicker missing the last enemy), then `url-smoke` 4/4, 0 console errors, no post-fight stall. Budget now 480 s and a timeout prints the last screen. The timed-out run left no record, so the cause is inferred. Bot still never trains.
- **Plan**: `docs/plans/2026-11-01-next-steps-plan.md`, with five reverse-engineering candidates. Deep and boss re-tune not started.

## 2026-11-01 — Party and growth rework done (Claude Opus 5.5, owner requests)

- **Built** (not deployed), plan `docs/plans/2026-11-01-party-growth-plan.md`: companion stats and levels 1–5 (deployed wins or 1 growth; HP, top two stats, direct damage at 3 and 5, opening block at 3, Momentum at 5), stat cards read their player's stats, three companions from Act 4 (`partySlots`, the bench fills the slot), gear (20 pieces, weapon + armor per person, run inventory, elites / bosses / shops), a new party screen that holds all of it.
- **Bug caught by a test**: opening block from level and gear was wiped as turn 1 began; now granted there.
- **Balance** (canonical, mixed): everything together read 282 / 450 = 62.7 %, Deep 74.7 %. Companion damage moved from stats to level, weapons cut, then enemies raised (`tuning.acts` 2: +22 % HP +1 dmg, 3: +46 % +3, 4: +105 % +7, 5: +150 % +10, 6: +190 % +13; route +8 % HP). Final: fresh 188 / 450 = 41.8 %, once-won declining 186, route forced 173 = 38.4 %, Deep 49 / 150 = 32.7 % (was 27.3 %, target 20–30). Avg turns: normal 3.6–4.7, boss 8.0–10.0; Act 3 (9.7) and Act 6 (10.0) bosses run past the 9-turn line.
- **Verified**: `make check` (node 515, Python 338), `make test-e2e-v2`, `make playthrough-quick`, party screen in the real UI at desktop and 390 px (grow, equip, train, 0 console errors). Unverified: fun, how a human uses gear and Train (the bot only auto-equips and never trains), gear rows on the real reward and shop screens, Act 4 with three companions in the real UI, production. Gear has no art yet.

## 2026-11-01 — Stats run to 20 (Claude Opus 5.5, owner: stat impact too low, cap 10 → 20, more stat cards)

- **Built** (not deployed): `STAT_MAX` 20, steps above 10 for every perk, traits at 10 / 15 / 20 with no menu (`statPerks.ts`), an act pays 2 growth, 10 stat cards with art (CHA had none). Old steps below 10 stand.
- **Balance**: unchecked it read 253 / 450 = 56.2 %. Act 2 / 3 enemy HP +10 / +22 % (`tuning.acts`), Act 1 untouched. Fresh 189 / 450 = 42.0 %, once-won declining 196, route forced 219 = 48.7 %.
- **Open**: Deep Signal mixed reads 85 / 150 = 56.7 % (was 27.3 %). Left for the final balance pass after levels, three companions and gear. Do not deploy before it.

## 2026-11-01 — Overcharge, Han rework, Bloodhound Rush moves (Claude Opus 5.5, owner requests)

- **Overcharge**: `surplus_capacitor` (half the leftover energy, at most 2, into the next turn), `bank_power` (all of it, once), `discharge` (spends the rest for damage), a small "next turn +N" under the orb. Art by Codex image.
- **Han**: Backdoor 2 → 1 cost and Mark 2 on each enemy turned, upgrade drops Exhaust; System Intrusion Mark 3 → 2.
- **Bug**: Bloodhound Rush said it charged and never moved. New `dash` effect stops beside the target or before a pit. It was the only such card.
- **Balance** (canonical 3 × 150, mixed): fresh 190 / 450 = 42.2 %, once-won declining 186 / 450, route forced 198 / 450. The new cards reshuffle the pool, so these replace the earlier 200 / 209 / 220.

## 2026-11-01 — DLC 2 rebuilt as a parallel Act 2 (Claude Opus 5.5, owner: "DLC 치고는 볼륨이 너무 작은데" → parallel act)

- **Why**: the route shipped as 3 fights, 3 events, 0 new enemies, and its "3 fights" claim was false: over 450 Act 2 maps / 2,553 paths the route gave 0 fights on 10 %, 1 on 35.5 %, 2 on 39.6 %, 3+ on 14.9 %; 5.8 % of maps had no fight on any path and still played the sad ending. Browser QA had only walked a path holding all three. Production `00169-fih` still shows this until the next deploy.
- **Built** (not deployed): `run.route` keeps `run.act` 2 and deals the map from the route's content. Closing Time now comes before Act 2's title. Pack `content/packs/outside_list/`: 12 enemies, 14 fights (3 Relay, 2 escorts, 1 hold, 2 streets, 1 event, 3 elites, 2 bosses), 12 events (Astra, reviewed), 12 cards that join the pool when the route is taken. New rule: an escort citizen walks after the enemy phase, the Relay with it (`EncounterDef.walkTo`). `ally` cards can opt into citizens. Art is borrowed; `art.test.ts` filters `route` content until the owner has played the rule.
- **Freeze bug** (owner: "체감이 없는데"): enemies decayed Freeze before their move step, so Freeze 1 stopped no move: 265 / 360 enemies changed tile with or without it. Now 0 / 360. Decay moved after the telegraph.
- **Balance** (canonical 3 × 150, mixed): fresh 200 / 450, digest identical to `e50d6fa`. Once-won declining 209 / 450. Once-won route forced 233 → 220 / 450 after HP +10–15 %, main hits +1, two bonuses dropped, holds +1 turn; Act 2 cleared 315 vs 299 declining. Bots do not push into the Relay, so human numbers are unknown. Deep Signal not re-measured after the Freeze fix.
- **Verified**: `make check`, `make test-e2e-v2`, `make playthrough-quick` all 0; route through the real UI from Act 1 to Act 3, 0 console errors; all 14 fights opened at 390 px, 0 errors. Unverified: fun, sound, production.

## 2026-11-01 — Production promoted to `00169-fih` (Claude Opus 5.5, owner: deploy)

- `00169-fih` (`git-sha=e50d6fa`, Stage 1 + DLC 2) at 100 % pinned, rollback `00167-yuh`. Owner ordered it before the play verdict; that verdict, F1–F4 and art stay open. `make verify-preview` 5/5; `make url-smoke` on the preview and on production: sandbox fight won, run flow to the end, 0 console errors, anonymous and muted.
- Unverified on production: the Act 2 route itself (needs a won profile), Google sign-in, sound.

## 2026-11-01 — Relay reads true and can be reached (Claude Opus 5.5, owner: carry out the recommendation)

- **Why**: merged plan Stage 3 item 3 (telegraph link, per-target preview, small-screen explanation) was reported done by omission. It was not, and the gap matched the rule's own discard condition, "misreads the real receiver".
- **Fixed** (not deployed): the board kept showing the danger on the citizen and showed nothing on an enemy stand-in; aimed-card and move previews ignored the relay; a sweep over both tiles counted once. New pure `board/marks.ts` `boardAfter`, `expectedLoss`, `relayHit`, shared by board and panel. "대신 맞음 -N" chip, link lights up while carrying a hit, move chip on the relay. The rule explanation lasted 1.9 s: now a persistent one-line note above the sprites.
- **Layout**: `outside_serving` and `outside_door` could not be walked to by turn 2 in 150/150 starts. Covers moved: serving (3,3) → (4,3), door (3,1) → (4,1). Now serving walk by T2 150/150, pickup walk T1 150/150, door push set up T1 150/150, guarded by `outside.test.ts`. No stat changes.
- **Rule fix**: a debuff riding on an enemy attack stayed on the citizen while the hit moved (burn 4 per phase on the door fight, read at first as burning ground). It now follows the hit to the stand-in (`effectTargets`). Burning ground under the citizen stays: 2 in that trace, a tile effect, visible, not in the forecast.
- **Balance** (canonical): fresh 200 / 450, unchanged. Once-won, bot declines the route: 210 / 450, unchanged. Once-won, route forced: 204 / 450 (was 209 before these fixes), bot reaches it in 68 runs, 1.03 citizens saved. No claim about fun from these.
- **Verified**: `marks.test.ts` incl. forecast equals direct hits through a real enemy phase on all three fights, `proto.test.ts` rider test; `make check` (node 485, Python 338), `make test-e2e-v2`, `make playthrough-quick`. Real UI with real art, muted, 0 page errors: walk onto the relay (hover and standing both -9); on `outside_door` a real Shoulder Check pushes the drone onto the tile, preview shows the stand-in and clears the citizen, playing it and ending the turn: drone 14 → 3 (9 direct + 2 burn), citizen 16 → 14 (ground only). 390 px legible with placeholder art.
- **Limits**: `proto_relay` stays boxed in, so test `enc=outside_serving`. A push rider on a hit aimed at the citizen still moves the citizen. Fun unverified.

## 2026-10-31 — DLC 2 "Outside the List" built on the default rule (Claude Opus 5.5, owner: carry out the recommendation)

- **Built** (not deployed): Relay is a real rule (`EncounterDef.relay`, line + dashed tile, danger moves to the stand-in). After the first escape an Act 2 event node becomes Closing Time; entering swaps the next three plain fights for `outside_serving`, `outside_pickup`, `outside_door`; the last safehouse becomes One Bowl (nobody lost) or The Closed Counter, same pay. 3 Codex stills, no new enemies or cards. Companion whispers no longer offer Improvise on scenes that forbid it. Off dailies.
- **Balance** (canonical 3 × 150, mixed): fresh profile 200 / 450, unchanged. Rolling the scene instead read 208 with nothing else changed, so it is placed, never rolled. A once-won profile entering by force 209, declining 210; only 68 / 450 forced runs reached it, the bot cannot push enemies onto the tile, so this says nothing about fun.
- **Verified**: engine tests for the flow, opening, dailies; the whole route in the real UI, muted, 0 console errors: Closing Time → `outside_serving` → `outside_pickup` → `outside_door` → plain fights → One Bowl (nobody lost) and The Closed Counter (one lost), on separate runs. The test set the map nodes, profile and act through the dev hook, kept the bot alive and wore foes down, and a second pass on an untouched map from Act 1 (only the profile, HP and foe HP helped) found a real bug: `placeDistrict` ran after the placement and erased the scene on runs with districts. Fixed by order, guarded by a 40-seed test, then that natural pass reached Closing Time → `outside_serving` → The Closed Counter → map, 0 console errors; the whisper shows on Closing Time and not on the closing scene. Unverified: tone, fun, the owner's verdict.

## 2026-10-31 — DLC 2 proposals merged, Stage 1 built (Claude Opus 5.5, owner: "결과 나오면 추천안대로 알아서 수행해")

- **Plan**: `docs/plans/2026-10-31-dlc2-merged-plan.md`, from three overnight proposals. Claims checked first: Argon's "Act 5 parts stuck" is false (Act 6 has rest nodes) and "47 encounters" is 51; the rest held. Claude's lane read `argon.md`, so their overlap is not independent confirmation.
- **Built** (not deployed): `spendGauge` tempo terms; evolution pull ×3 + ✦ on rewards (starter recipes excluded); a recruit scene seats a crew member's duo partner; the bot deploys duos; protect rewards name who was saved; `a4_n1_returns`, `a6_n2_drafts` protect, `a5_n2_compactor`, `a6_n2_erasers` survive; `enemyHpPct` 12 → 13; sandbox-only `proto_relay`, `proto_blackout` (`ui/combat/protoEncounters.ts`, rules gated on `enc.proto`).
- **Balance** (canonical 3 × 150, mixed): bot fix alone 202 → 204; pull ×3 212 = 47.1 %, over the band; with HP +1 **200 / 450 = 44.4 %**. Non-starter evolution runs 51 → 109 / 450. Deep Signal 45 → 41 / 150 (within noise). Duo runs 8 → 8 / 450: the pull did not move a fresh-profile bot, so no claim on duos.
- **Limits**: on `proto_blackout` the enemy's floating number ignores ±2 (the panel and the real hit include it). Unverified: the human feel of everything above, sound, the real-play effect of duo seats.

# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — Companion level perks: choose one of two at level 3 and 5 (Claude Opus 5.5, same goal)

- **Built** (reverse-engineering item 1): `content/levelPerks.ts` + `engine/companionLevel.ts` (`perkOptions`, `activePerks`, `pendingPerk`, `choosePerk`, `perkWaiting`); `PartyMember.perks`; `run.chooseCompanionPerk` (map only, final, replayable). Option a = the old fixed bonus (Guarded block 3 / Resonance +15 Momentum), so saves and every default stay as they were; level 3 option b follows the companion's best stat (STR Counterpunch thorns 2 · AGI Footwork +1 move · INT Hardened Rig +1 armor · CHA Read the Room evade 1 · OBS Steady Aim focus 2), level 5 option b Veteran (+1 damage, +1 armor). Party screen: two buttons per open level, a gold dot on the party button while a pick waits; sandbox `?lvl=5&perk=b`.
- **Measured** (sim `perks: 'a'|'b'|'b3'|'b5'`, canonical blocks, 450 runs per depth): never choosing = option a = 41.6 / 33.8 / 31.6 % (fresh / Deep / Sea). Final all-b: 42.0 / 35.1 / 32.0 %; level 5 alone Deep 33.8 vs 33.8. Rejected: Footwork as evade 2 (Deep +6.2, ahead in all three blocks) and evade 1 (with it every b set stayed ahead in all three Deep blocks: Se-rin is in nearly every party); Heavy Hands +1 damage (Deep +3.1).
- **Verified**: `make check` (node 533, Python 338), `make test-e2e-v2`, `make playthrough-quick`; headless muted party screen (1280×720 ko, 390×844 en): dot shows, pick level 3 b then level 5 a, dot clears, 0 console errors (`outputs/qa/perk_ui/`); sandbox `?lvl=5&perk=b` loads. Owner check: `docs/test/mythos2_fun_check.md` §14. Unverified: whether the choice feels like a real decision by hand; the sim bot still never picks (canonical numbers unchanged).

## 2026-11-04 — Road recruits marked on the map; card plays per line-up measured (Claude Opus 5.5, owner goal: 잔여 작업 자율 수행, 콘텐츠 추가·검증)

- **Acts 2–3 in the real UI** (open since 11-03): `ui_playthrough.py` full run, assist mode, OK in 790 s → victory (`ending_noble_sacrifice`), Act 2 elite + Act 3 boss, 0 console errors.
- **Line-up measurement** (reverse-engineering item 2): `FightTelemetry` now carries `party` and `plays` (cards and consumables by id; `autoPlay(…, plays)`), run-neutral (canonical blocks reproduce 187/450, 41/150, 40/150). Findings: the starter `packet_shot` is 22.7 % of all plays (34 % in Act 1, still 8–16 % in Acts 3–6); companion cards are 12 % of plays in Act 1 and 15–21 % after; top-8 card overlap between line-ups is low (Jaccard 0.33–0.45), so line-ups do change what gets played. Scripts: `outputs/qa/lineup_plays.ts`, `lp_report.py` (gitignored).
- **Found**: only 22 % (Deep) / 17 % (Sea) of Act 4–6 fights had three companions although the slot opens at Act 4. The bot takes every recruit it meets (scores 14–18 vs ≤ 4 declining); the scene sits on a hidden `?` node, so ~25 of 150 Deep runs ever met one. Roll weight 5 → 15 only reached 33 %.
- **Built**: `roadRecruitAt` (engine, shares one validity check with `resolveEventId`); the map marks that node with a small gold person badge (who waits stays hidden) and a tooltip line with the +8 Trace cost; the bot routes there when someone would fill a slot now or the next act's slot (`companionWorth`). Deep 27.3 → 30.0 %, Sea 26.7 → 30.7 % (within ±4 noise at n = 150, not re-tuned), three-companion Act 4–6 fights 22 → 61 % / 17 → 47 %; fresh unchanged.
- **Verified**: `make check` (node 530, Python 338), `make test-e2e-v2`, `make playthrough-quick`; marker in headless muted Chromium at 1280×720 (ko) and 390×844 (en), badge on the octagon corner, tooltip line shown, 0 console errors (`outputs/qa/recruit_marker/`). Unverified: how the marker reads to a human, and a natural Deep run reaching a marked node in the real UI (set up through the dev hook).

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

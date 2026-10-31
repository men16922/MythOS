# Progress Log

Last updated: 2026-11-01

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

## 2026-10-31 — Independent DLC 2 proposal (Claude overnight)

- **Changed**: `docs/plans/2026-10-31-dlc2-proposals/claude.md` (Korean, nine required headings, systems/balance/build-cost lens): verified from `v2/engine` and `v2/content` that the ultimate-evaluation bot path (`combatSim.ts:54-64`/`:158-198`) scores zero for draw/energy/movement while the card-evaluation path (`:287`) adds a `2 * Δhand + 2.5 * Δenergy` tempo term for the same resources, that Paradox 10 (`content/paradox.ts:61-65`) duplicates Paradox 4's flat `+1` enemy damage (`engine/combat.ts:168`) under a new name, and that the anomaly mixer's 12 world-anomaly mutators are all pure gain+cost with no curated synergy pairs (`DECISIONS.md` 2026-10-29). Proposed: fix the evaluator asymmetry, de-duplicate Paradox 10, write the "isolate-measure a rule-breaking item" lesson into Done criteria, add mutator synergy-pair metadata, one small reversible "debt" forbidden implant, and DLC 2 《세계:접속 — 청산선 (Settlement Line)》 — a horizontal, no-new-act rule (energy overdraft → a fourth DoT-pattern status that carries into the next fight) as the deliberate opposite of Deep Signal's vertical scale-up. Own seed marked `[x]` in `docs/NEXT_PLAN.md`.
- **Slip**: opened `argon.md` while reading `docs/plans/2026-10-31-dlc2-proposals/BRIEF.md`'s read-first docs before noticing the brief's own independence rule forbids it; the proposal was written fresh against the repo to avoid copying Argon's diagnosis, framing or DLC concept, but the read itself cannot be undone. Lesson recorded in `docs/LESSONS.md`.
- **Verified**: `make check` green. Unverified: owner feel/verdict and the merge across all three proposals.

## 2026-10-31 — Independent DLC 2 proposal (Gemini 4 Argon / agy overnight)

- **Changed**: `docs/plans/2026-10-31-dlc2-proposals/argon.md` (113 lines, Korean, nine required headings): reverse-engineered `v2/engine`, `v2/content`, `branch 1.0`, and 90-run reachability (`starterRuns: 45/90` vs `nonStarterRuns: 5/90` with 6/9 non-starter evolutions at `0/90`, 8/12 duos and 5/11 companion ultimates having effects ignored by `combatSim.ts` `spendGauge`/`evaluate`, and 0 neutral/survive objectives across all 47 Acts 4–6 encounters + 0 CRPG districts in Acts 5–6). Proposed reachability/evaluator fixes, interactive board cores, and DLC 2 《세계:접속 — 역류 (Counter-Signal)》 (parallel 3-act campaign with Lit/Dark grid illumination) starting with an art-free `proto_blackout` sandbox prototype. Own seed marked `[x]` in `docs/NEXT_PLAN.md`.
- **Verified**: `make check` green; `10-diff-scope` and `40-image-identity` clean. Unverified: owner feel/verdict and Claude's merge.

## 2026-10-31 — Independent DLC 2 proposal (Astra / Codex overnight)

- **Changed**: `docs/plans/2026-10-31-dlc2-proposals/astra.md`, a Korean proposal with nine required headings (131 lines): existing protection feedback first, then an art-free civilian damage-redirection prototype and a bounded replacement chapter. Own seed marked `[blocked]` in `NEXT_PLAN.md`; one sandbox lesson recorded; no runtime changes.
- **Verified / Blocked**: read-back, nine headings, five-line summary, under-200-line limit and citation paths checked; lint/types/build and node 458/458 passed. `make check` exited 2: Python ran 338 tests, 12 skipped, 3 errors, all `test_verify_preview` at line 39 (`socket.bind`, `PermissionError: [Errno 1] Operation not permitted`). Isolated discovery reproduced 3/3 errors. `10-diff-scope` passed before the blocker note; final scope/budget checked before the blocked commit.
- **Limits / Next**: proposal only; implementation, fun, balance, tone and art acceptance unverified. Resume by rerunning `make check` in an environment permitting loopback binding, then mark the seed done only on exit 0. Claude's merge and the owner's content verdict remain separate.

## 2026-10-31 — `make url-smoke` + next update plan (Claude, owner: "다음 업데이트 계획")

- **Added** `scripts/dev/url_smoke.py` / `make url-smoke URL=…`: a sandbox fight and a short run through real clicks on any deployed URL, without the dev-only `window.__m2`. On production `00167-yuh`: both PASS, 0 console errors (failed-resource lines are filtered). Anonymous clients send no saves or GM calls under `auth: google` (`net/api.ts` `identityHeaders`; a network capture of the run start saw only `GET /api/v2/config`). Not covered: sound, sign-in.
- **Plan**: `docs/plans/2026-10-31-next-update-plan.md` ("청구서", a cut W1), proposal only; the hold on new content stands until the owner's verdict.
- **Slip**: `2986cc5` reached `main` with `check-doc-budget` red (gate chained with `;`), fixed by `3b3ce54`.

## 2026-10-31 — Baseline re-check at `d59cb0d` (Claude Opus 5.5, /sync follow-up)

- **Verified**: `make check` green (node 458, Python 338); `make playthrough-quick` OK in 122 s (muted, local). Fixed `AGENT_BRIEF.md`: Argon's fix is `6850225`, not the pre-rebase `a4c31d9`.
- **Production** `00167-yuh` (muted headless, anonymous): sandbox fight won (enemies→1hp, turn 5); a click-only run (no dev hook) went setup → intro → event → recruit → directive → map → fight → defeat → Archive. 0 console errors. Unverified: Google sign-in, sound.

## 2026-10-31 — Fix `loops: 1` sim companion default & phone portrait ultimate HUD overlap (Gemini 4 Argon)

- **Diagnosed & fixed (`loops: 1` sim drop)**: `newRun` forces `FIRST_COMPANION` (`se_rin`) on `loop === 1` (`profile.loops === 0`), while `loop >= 2` reads `opts.companion`. In the UI (`SetupScreen.tsx`), `compId` defaults to the first unlocked companion (`se_rin`), whereas `simulateRun` left `opts.companion` `undefined` — silently turning any `loops >= 1` profile sim into a solo Act 1 run (3-archetype mixed: `57 → 40 / 150`; 5-archetype: `50 → 42 / 150`). `simulateRun` now defaults `opts.companion === undefined` to `unlockedCompanions(profile, C)[0] ?? null` (`null` still runs solo), restoring `57 → 57 / 150` (hash-identical to `loops: 0`) with a regression test in `runSim.test.ts`.
- **Phone portrait ultimate HUD (`phone.css`)**: when `.m2c-momentum.is-ready` is active, `.is-port .m2c-bottom` now places `mom` (`.m2c-ults` + `.m2c-sigburst` in a single horizontal row) into Row 3 (`'orb mom mom end'`) and keeps `draw`, `piles`, and `items` in Row 2 (`'draw piles items items'`), eliminating the `position: absolute` overlap over the hand cards on both `390×844` and `375×667` (KO + EN across all 5 archetypes).
- **Verified**: `make check` green (node 458, Python 338); `make test-e2e-v2` OK (daily replay verified); muted headless Playwright bounding-box & screenshot checks (`outputs/qa_phone_ults_390x844.png`, `outputs/qa_phone_ults_375x667.png`, 0 console/page errors).

## 2026-10-31 — Production promoted to `00167-yuh` (Claude Opus 5.5, owner: promote)

- `00167-yuh` (`git-sha=7cc9ef5`, F1–F4 + Argon fixes) at 100 % `LATEST` (`--to-latest`, rollback `00160-qiy`). Owner promoted without the hands-on verdict; that check and art approval stay open.
- Verified: `make verify-preview` 5/5 before; production 4/4, served content chunk = committed, 4 new images 200, 0 ERROR log lines on the revision right after. Unverified: a played fight and Google sign-in on the production URL; sound.

## 2026-10-31 — Argon's review of F1–F4: fixes (Claude Opus 5.5, owner: have Argon judge it)

- **Review**: Gemini 4 Argon, read-only, report `outputs/agy/f1-f4-verdict.md`. An agent's verdict, not the owner's feel check. About half checked out: its implant ranking and duo notes describe effects that do not exist in the content, and its `glass_circuit` 40 / 40 predates the retune, so those parts were dropped. Each claim below was confirmed in code or on screen first.
- **Fixed**: a gate closing on a boss lost its payout and on an elite shared one pick, and plain boss implants could appear: the gate is now its own pick of forbidden implants (`noiseChoices`, `takeNoiseImplant`). Both duo lines show. The third ultimate no longer runs off the screen. `overtuned_laser` was identical to `target_laser+`, now adds 3 damage; `flurry` 3 × 2 → 4 × 2. Scramble has a HUD badge, the replica a red mark on the board, the evolution note names its recipe, the codex scrolls to the chosen list. Redrawn: `duo_same_dream`, `duo_overdue_reader`, `duo_warm_circuit`, `duo_burned_ledger`, `noise_gate_record`, `overtuned_laser`, `heart_overload`.
- **Balance** (canonical 3 × 150): the full payout read 207 / 450 = 46.0 %, over the band, so the gate now costs 8 HP (was 6): 202 / 450 = 44.9 %, in band. `hollow_world`: restoring a heal read 59.8 %, so it stays as it was at 53.3 %; Argon's "trap" call does not match the numbers.
- Not changed: weak duos and evolutions Argon named, phone ultimate chips over the hand, Omega's reboot staying a banner, and its "too strong / too weak" calls that rest on feel.


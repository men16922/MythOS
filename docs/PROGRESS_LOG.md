# Progress Log

Last updated: 2026-10-30

## 2026-10-30 — Production promoted to `00160-qiy` (Claude Opus 5.5, owner OK)

- Status: achievements (64), bestiary / card codex, anomaly mixer and road recruits are live; production was on `562d220` before this.
- Changed: `make deploy-preview` → `00160-qiy` (`git-sha=5bdd23f`); owner approved; promoted with `--to-latest` (100 % `LATEST`, rollback `00158-roq`). `docs/test/mythos2_fun_check.md` gains Deep Signal + Archive sections (stun, ultimates, 11 cues, road recruits, mixer rules, achievement wording, codex). `STATUS.md` corrected: 64 achievements, stale "`make test-e2e-v2` unverified" removed.
- Verified: `make check` green (node 419, Python 338, 12 DB tests skipped), `make frontend-build` left the tree clean, `make verify-preview` 5/5, `verify_preview.py --url <production>` 4/4 (bundle = committed), 4 road-recruit images 200 on the preview, headless muted 390 px load 0 console errors, 0 ERROR log lines on the revision right after promotion.
- Verified after promotion, at `5bdd23f` on a local server: full Deep Signal run through the real UI (`ui_playthrough.py --deep`, assist mode, muted, headless) OK in 1420 s, victory, ending `ending_noble_sacrifice`, 0 console/page errors.
- Unverified: a played fight and Google sign-in on the production URL; a bot-taken road recruit (the bot picks the first open option = a decline, and its log does not name events, so a natural road-recruit scene is still unconfirmed); all sound, and fun/difficulty (owner).
- Next: owner plays Deep Signal to Act 6 with `docs/test/mythos2_fun_check.md`.

## 2026-10-30 — Road recruits: one themed recruit scene per act from Act 3 (Claude Opus 5.5, owner direction)

- **What** (owner: recruit freely, pick who deploys; deploy cap stays 2; a recruit event per act, random, at most once, with a trade-off, fitting each act's theme): `content/eventsRecruit.ts` — `a3_recruit` (ARK Spire: the next names on the list), `a4_recruit` (Glass Library: readers from failed loops), `a5_recruit` (scrap graveyard: half-woken androids), `a6_recruit` (First Record: half-erased connectors). Each rolls on the map like any event (weight 5 → on 40–58 % of that act's maps, measured over 2000 maps), never twice in an act. Recruiting costs +8 Trace (hint says "대기 합류" when both slots are full); the two authored options are the decline side (a small gift + a stat check against the act's watchers). The Act 2 scripted scene is unchanged. Four Codex-image illustrations (act art as the style reference).
- **How**: `EventDef.recruit { trace }`; `optionList` appends costed recruit options after the authored ones (picker follow-ups keep their indices); `resolveEventId` swaps a road recruit for another event when nobody is left to recruit; `recruitCandidates` also keys on the Endless lap. Party screen bench hint updated.
- **Balance** (mixed bot, same seeds, before → after): standard 147 → 151 / 300; standard with every companion unlocked 147 → 149 / 300; Deep Signal (all unlocked) 51 → 52 / 150 — noise. Map rolls for Acts 3–6 change for existing seeds (new events in the pool), as with any event addition.
- Gates: `make check` green (node 419, Python 338); `make playthrough-quick` OK (117 s); `make test-e2e-v2` OK (daily replay verified); real UI desktop + 390 px with a seeded Act 3 run (scene, 2 declines + 2 costed recruits, recruit → bench → party screen, 0 console errors). A road recruit met naturally in a bot playthrough: unverified. Not deployed.

## 2026-10-29 — Anomaly mixer: custom 2–3 mutator mix (Claude Opus 5.5, owner: "계속해")

- **What** (DLC plan §11 "변칙 조합기"): after the first escape, the setup screen's mutator section gets "직접 조합하기": all 12 mutators, pick 2–3 (connect stays disabled until valid); the HUD chip reads "변칙 N개" with every clause in its tooltip. Rules in `DECISIONS.md` (counts as a normal loop, never a daily).
- **How**: `run.mutators` / `CombatState.mutators`; `activeMutators` + merged `mutatorMods` / `mutatorCombat` (a single id returns its own table unchanged); `newRun` takes `mutators` only when `isValidMix` and `mixerOpen`; `RunSimOptions.mutators`.
- **Balance** (2 × 60 identical seeds, mixed bot): none 45.0 %; market+scrap 46.7, bounty+magnetic+overclocked 45.0, iron+cold+long 40.0, tight+magnetic+acid 35.8, overclocked+tight 33.3, iron+tight+bounty 29.2, glass+patrol+bounty 24.2 %. No-mutator runs on 3 × 150 seeds hash-identical to before.
- Gates: `make check` green (node 417, Python 338); `make playthrough-quick` OK (174 s); `make test-e2e-v2` OK (daily chip + server replay verified); real-UI mixer flow desktop + 390 px (12 listed, 1 pick blocks connect, 4th pick blocked, chip "변칙 2개", 0 console errors). Not deployed.

## 2026-10-29 — Codex: bestiary + card codex, completion achievements (Claude Opus 5.5, `/goal` autonomous)

- **What** (DLC plan §11 "도감 완성 보상", scoped down): Archive tab "도감" with **enemies** (87; seen = silhouette lifted + total kills) and **cards** (126 collectible = starter/common/uncommon/rare; owned once = art shown). Completion rewards are 4 achievements (bestiary 40 / all, cards 60 / all → 64 total); no titles or frames (would need new UI surfaces + art).
- **How**: `engine/bestiary.ts` — `CombatState.killed` per enemy id (`killUnit`), `noteFightBestiary` in `updateCombat` (encounter roster + reinforcements = seen, kills added), `RunState.cardsSeen` in `addCard`, folded into `profile.bestiary` / `profile.cardsSeen` by `applyRunEnd`. The bestiary lists only enemies some encounter can field (incl. summons), and a test proves every codex card is in some archetype pool or starting deck → both are completable.
- Sim A/B 3 × 150 identical seeds: hash-identical to before. Gates: `make check` green (node 414, Python 338); `make playthrough-quick` OK (194 s, real fights through the new path); `make test-e2e-v2` OK; screenshots desktop + 390 px with a seeded profile (2/87 enemies, 3/126 cards, 0 console errors). The bestiary filling from a real UI fight is covered by unit tests only. Not deployed.

## 2026-10-29 — Achievements pass 2: 43 → 60 + fight-level feats (Claude Opus 5.5, `/goal` autonomous)

- **17 more** (DLC plan §11 target 60): archetype mastery III, companion ×5 wins, 30 daily days, 6 endings, codex 25, memories 11, 5 companions met, Paradox 3/7, Endless 3 laps, **boss without losing HP**, 5 terrain kills in one fight, 10 burst/ultimate fights in one loop, win with ≥600 credits / ≥13 implants / trace ≤30, solo win (no companion ever). Thresholds from 200 mixed-bot runs (wins: terrain/fight p95 3, bursts p95 7, credits p95 658, trace p5 40; ≥1 flawless boss in 30 % of runs).
- **Fight feats**: `noteFightFeats` (`engine/achievements.ts`) writes `feat_*` run flags on each won fight in `updateCombat`; `RunSimResult.feats` exposes them. Sim A/B on 3 × 150 identical seeds: wins 72 / 61 / 83 before and after, result hashes identical → no gameplay effect.
- Gates: `make check` green (node 411, Python 338); `make playthrough-quick` OK (124 s); `make test-e2e-v2` OK; muted screenshots desktop + 390 px (tab 1/60, 0 console errors). Not deployed.

## 2026-10-29 — Achievements, first pass: 43 (Claude Opus 5.5, owner: "next priority, autonomously")

- **What**: DLC plan §11 "업적", first pass — 43 achievements (`content/achievements.ts`): loops/wins/acts/daily days 9, endings 3 (secret First Record), collection 6 (codex, memories, companions met, shards), one-run challenges 9 (Paradox 5/10, Deep Signal win, Endless lap, daily win, 20 terrain kills, 5 elites, ≤40 damage taken, deck ≤18), plus one per archetype (5) and per companion (11), generated from content. Challenge thresholds set from the mixed-bot tally of 200 runs (wins: damage p5 30 / p50 84, terrain kills p95 20, deck p5 27).
- **How**: declarative `AchievementCond` (`types.ts`), checked once in `applyRunEnd` (`engine/achievements.ts`) against the banked profile + the ended run; earned ids go to `profile.achievements` and the run's history row. Cosmetic only (no reward, no run state) → balance untouched by construction; `RunSimResult.tally` added for measuring. Existing profiles earn what they already qualify for on their next banked run. Also fixed: `migrateProfile` clamped history / last-death acts to 3 (Deep Signal reaches 6).
- **UI**: Archive side tab "업적 n/43" (grouped, dim until earned, secret = ???); ending screen shows one small gold line of what this run earned (first 3 + count). No toast, no sound (UX-first).
- Gates: `make check` green (node 409, Python 338); `make playthrough-quick` OK (209 s); `make test-e2e-v2` OK; muted headless screenshots desktop + 390 px phone (ending line, Archive tab, no horizontal overflow, 0 console errors). `gameplay-qa` not run (no combat/run change). Not deployed. Owner: names/wording and the 6-tab wrap on narrow screens unreviewed.

## 2026-10-29 — `make test-e2e-v2` green again (Claude Opus 5.5)

- Root cause was not "the first node is not a fight": a companion recruit scene (`RecruitScene`, `data-testid=recruit-scene`) opens over the map and swallowed the node click. `scripts/e2e_v2.py` now closes it with Escape (fails if it stays open) and clicks a reachable `combat`/`elite` node instead of the first reachable node.
- Gates: `make test-e2e-v2` passed twice in a row (combat reached turn 4, daily replay verified), `make check` green (Python 338). Engine/UI code unchanged.

## 2026-10-28 — Companion ultimate signature SFX (Claude Opus 5.5, owner request)

- 11 procedural cues `ult_<companion>` in `sfx.ts` (`ULT_SFX` map), one per ultimate, matching its scene (Se-rin undertow surge + dash, Tae-o charge + shield slam, Han keystrokes + lock-on, Su-ah anvil strikes, Kai rail charge + shot, Lin-yue coin shower + register, Io page riffle + glass bells, Miro "shh" + three swishes, Doyun barrier hum + deflections, Bel pen scratch + hiss, Rem clock ticks + slowing hush). Archetype bursts keep their `burst_*` cues. `audio-cues.test` checks every companion has a distinct cue that plays.
- Gates: `make check` green. Sound itself **unheard** (automation stays muted): owner listen check pending. Preview `00158-roq` (`git-sha=562d220`) `make verify-preview` 5/5 → **promoted 2026-10-28** (`--to-latest`, 100 %; production health 200, served `CombatScreen.js` and the cue chunk = committed; rollback `00156-fuj`).

## 2026-10-28 — Ultimate illustrations + louder cut-in (Claude Opus 5.5, owner request)

- **16 ultimate illustrations** (Codex image, 0 GCP): `v2/ult/<id>.webp` 1280×720 for all 11 companion ultimates and 5 archetype bursts (`scripts/v2_assets/gen_ult_art.py`, refs = portrait + full-body sprite). Manifest group `ART.ults`; `art.test` requires one per companion and archetype.
- **Cut-in**: the illustration slams in on a skewed glowing band (overshoot, Ken Burns drift, an inverted impact frame, collapse-to-a-line exit), colour stripes, a shockwave ring, 8 radial shards, one flash; the name sits on the band's lower edge in a large italic chromatic title. After the cut-in a release shockwave (wave + nova + ring + shake) fires from the caster. 1.4 → 1.6 s. Phone portrait: shorter band higher up. Reduced motion: static band + banner only.
- **Owner pass 1** ("Se-rin / Doyun look out of proportion; bring out character; a bit less flashy"): all 16 regenerated with eye-level natural proportions (no wide-angle foreshortening), each pose built on the character's bond lines (Doyun = an ordinary survivor who "knows how to stand"), one restrained effect; cut-in toned down (fewer shards, fainter lines, no exit flash), band framed on the upper third.
- Gates: `make check` green (node 401, Python 338); sandbox screenshots desktop + 390 px phone (Se-rin / Doyun ultimates, Ghost burst), 0 console errors. Owner: redone art approved. Preview `00156-fuj` (`git-sha=ed5a6cb`) deployed, `make verify-preview` 5/5, `v2/ult/doyun.webp` + `status/stun.png` served 200; **promoted 2026-10-28** (`--to-latest`, 100 %; production health 200, served `CombatScreen.js` = committed; rollback `00154-lom`). Unverified: sign-in and a played fight on the production URL.

## 2026-10-27 — Stun, wall-bump stuns, companion ultimates, full-screen ult cut-in (Claude Opus 5.5, owner request)

- **Stun** (`stun`, new status, never stacks): cancels an enemy's telegraph on the spot and it sits out the next enemy turn (no move/telegraph; elites/bosses re-telegraph at its end); a stunned party unit cannot move or play cards. `push.stun` stuns the pushed unit when it bumps a wall/cover/unit. Sources: **Concussion Kick** (common, any), **Pinball Slam** (rare, any), Ghost burst "Void Collapse" (+stun on bump), Tae-o / Rem ultimates. Codex art: 2 cards + `status/stun.png` (0 GCP).
- **Companion ultimates** (`CompanionDef.ultimate`, all 11): same Momentum gauge as the Signal Burst — when full, pick the burst or one standing companion's ultimate (once per fight, cast from the companion). `ultimatesReady` / `fireBurst(c, C, companionUid)`; replay records the uid. Sim bot spends the gauge on the best-scoring option.
- **Full-screen cut-in** for every burst/ultimate (flash, letterbox, speed lines, sweep, big portrait; gold = burst, cyan = companion; reduced-motion keeps only the banner). Phone portrait: ultimates float as round portrait chips over the momentum cell; Korean burst names no longer break per syllable (`keep-all`).
- **Sim** (mixed, same seeds; base → new): standard 3 × 150 41.8 → 41.3 %, ghost 3 × 150 44.7 → 48.7 %, Deep Signal 90 runs 25.6 → 23.3 %, greedy P5 90.0 → 89.3 %, basic 0 → 0 %. Pinball Slam as a ghost-only uncommon read +11 pts for ghost, but a no-effect dud card in the same slot read +8 (pool-composition artifact); as an any-pool rare it is neutral.
- Gates: `make check` green (node 400, Python 338); `make playthrough-quick` OK (146 s); sandbox screenshots (desktop + 390 px phone) of chips, both cut-ins and stun icons, 0 console errors. `make test-e2e-v2` **fails at map → combat on HEAD too** (pre-existing: it assumes the first reachable node is a fight). Feel/clarity of stun and the cut-in: **owner verdict pending**. Not deployed.

## 2026-10-27 — Production: `00154-lom` promoted (Claude Opus 5.5, owner call)

- `gcloud run services update-traffic mythos-api --to-latest` → `00154-lom` (`git-sha=910834b`, Deep Signal DLC R1–R7 + secret-fight fix) at 100 % `LATEST`; rollback `00150-qen`. Checked: `/api/health` 200, served `App2.js`/`CombatScreen.js` hashes = committed bundle, no `src/` changes since `910834b`. Unverified: sign-in and a played run on the production URL after promotion.

## 2026-10-27 — Deep Signal real-UI pass: secret-fight lock fixed (Claude Opus 5.5)

- **Bug (fixed)**: the secret First Connector fight follows the Act 6 boss on the same `combat` screen, so `CombatScreen` kept the won fight's `ending` lock — hand greyed, no input. `GameShell` now keys `CombatScreen` by `encounterId` (fresh state, boss splash and intro). Repro fails without the key, passes with it (turn 2→3, foe 265→250).
- **Real UI (muted, one tab, headless)**: `ui_playthrough.py --secret` (new `--deep`/`--secret` flags) OK in 1559 s — 6 acts, Act 4–6 bosses, secret fight, final choice, ending, 0 console errors. Recruit scenes of Io/Miro/Doyun/Bel/Rem: 3 choices, close, impression stored. Recruit approval line uses `josa`.
- Gates: `make check` green (node 394, Python 338). Music room: 18 track files present; **playback unverified** (tests stay muted). Preview `00154-lom` (`910834b`) deployed, `make verify-preview` 5/5, not promoted; `00153-tuv` predates the fix.

Older entries: `bin/docs/archive/` (newest: `progress-2026-10-26-dlc-r1-r7.md`).

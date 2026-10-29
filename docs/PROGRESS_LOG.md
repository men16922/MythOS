# Progress Log

Last updated: 2026-10-29

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

## 2026-10-26 — DLC update R7: Pack 2 "Dreaming Machines" (Act 5), Pack 3 "First Record" (Act 6), meta close, 5 new companions (Claude Opus 5.5)

- **Pack 2 (Act 5)** `content/packs/dreaming_machines/`: Scrap Legion 8 + elites 4 + bosses 3 (Furnace Mother, KAI-0, REM), 17 fights, 20 events (Codex). New status **freeze** (cannot move, still acts; decays on its side's phase end). **Salvage**: `EnemyDef.salvage` → `combat.parts` → `run.parts`; safehouse **workbench** (`restCraft`: patch 2 / assemble 3 / refit 6, each once per rest, free); parts chip in the top bar; the sim bot crafts.
- **Pack 3 (Act 6)** `content/packs/first_record/`: Origin Code 7 + elites 4 + bosses 3 + secret First Connector, 17 fights, 20 events (Codex). Effect **rewrite** (tile → floor/cover/hazard/void; wall/pit only on empty tiles; enemy telegraphs show "재작성 → …"); 4 Rewrite cards (`CardDef.minAct` 6), Act 6 gift (`ActDef.gift`). Deep endings 5 (axis gates via `requires.minAct/axis`, resilience 10) + secret true ending; Act 3 and Act 6 show separate ending sets. **First Record** shards `record_1..7` in Act 4–6 events → `profile.records` (Archive). Secret fight after the Act 6 boss with 7 shards + insight ≥ 5 (losing it still reaches the final choice); true ending → IX `remembered` lines forever. New event effect `axis`.
- **R7c meta**: autonomy 5 levels (24/30 lore: start removal, Erase card), 12 Deep Signal lore entries (35 total), archetype mastery I–III (1/3/6 wins: +4 HP / upgraded starter / +1 growth; `profile.archetypeWins`, badge on setup). Rest/shop backdrops for Acts 4–6. Profile migration keeps `archetypeWins`/`records`.
- **R7d companions**: Io, Miro, Doyun, Bel, Rem (`content/packs/new_companions/`): trigger passives, 5 cards each, Archive unlocks, recruit scenes, 2 cutscenes, opening, personal event, Se-rin banter (Codex writing), `talk.py` personas + client fallback mirror.
- **Sim** (mixed, 3 × 150): Deep Signal 6-act clear ≈ 20–22 % (target ~20 %), standard 36.7 % (unchanged). Act 5/6 bosses 3–20 % loss, ~9–10 turns. New companions as starter 70–83 % vs base 76–79 % (all unlocks).
- **R7e archetypes**: Archivist (new `recall` effect, Return Slip) and Scrapborn (walls, wire traps, overload, Self-Repair), 7 cards each, bursts + signature SFX, Archive unlocks; sim 40.6 / 40.5 % (base 35–43 %). Archive floor 2 = **Vault** tab (depth records, mastery progress, First Record, music room).
- **Fixes**: act intro and map showed "/3" in Deep Signal (now `lastAct` / ∞); `.m2-records` class collision avoided; Io companion sprite key `io-ally` (the Act 4 boss owns `io`); sandbox `?arch=`/`?comp=`.
- **Art (Codex, 0 GCP)**: ~305 images — Act 5/6 sprites, boss art, arenas, events, cards, endings, guard icon; companions (portraits, 4-pose sprites, 25 cards, 10 cutscenes, 5 events, 5 recruit scenes); archetypes (sprites, 14 cards, 2 implants).
- **Verified**: `make check` (394 + 338), `make playthrough-quick` OK incl. new workbench + Vault tour steps, sandbox screenshots (Act 5/6 fights incl. secret boss, Scrapborn + Rem, Archivist + Io), 0 console errors. **Unverified**: a full Deep Signal run to Act 6 and the secret fight through the real UI (engine-tested), new companions' recruit scenes in the real UI, music-room playback (muted tests).

## 2026-10-26 — DLC update R5+R6: CRPG districts 6 → 14, faction reactions, List Warden, Paradox 6–10, Endless Signal (Claude Opus 5.5)

- **Districts (C+7)**: 8 new districts from 1.0 side arcs (`d1_spider_debt`, `d1_list_shelter`, `d2_runner_shortcut`, `d2_broker_request`, `d3_vault_beyond`, `d3_old_wound`, `d4_dream_stacks`, `d4_return_desk`), 24 NPCs with factions + server AI personas (`src/mythos_v2/npcs/`), 8 quests — written by two parallel Codex jobs (`outputs/briefs/districts_*.md`), registered and passing `crpg.test.ts` (reachability, budgets, quests, personas). Art: 8 district scenes + 24 portraits (Codex, 34 calls).
- **C+8**: combat mods `surprise` (enemies start Shocked) and `backup` (allies Guard 2); reputation reacts — off-grid +3 → backup at bosses, grid +3 → surprise at elites.
- **Act 3 third boss** "명단 관리관 / THE LIST WARDEN" (`a3_boss_warden`, protect-the-hostage bonus, 1.0 "버려진 자들의 신호"), tuned by damage not HP: loss 15.2 % at 9.7 turns (IX 28 %, Omega 36 %); key art + sprites + hostage sprite (Codex).
- **Paradox 6–10** (`MAX_PARADOX` 10): rage +1, shop +20 %, boss HP +20 %, trace +10 per act, enemy dmg +1; setup row wraps on phones.
- **Endless Signal** (`run.mode 'endless'`, `run.lap`): after the last act → Act 1 one echo layer deeper (+60 % HP, +3 dmg, Rage earlier/stronger per lap), death only; `profile.endlessBest`; top bar shows the layer. Mixed bot falls in lap 0, greedy at 13–18 layers.
- **Fixes**: `migrateProfile` no longer clamps `bestAct` to 3 (Deep Signal records); content test accepts 2.0 neutral sprites.
- **Verified**: `make check` (383 + 338), `make playthrough-quick` OK, sandbox screenshot of the List Warden fight; standard P0 mixed 3 × 150 36.7/32.7/40.0 %. **Unverified**: real-UI Endless lap transition (engine-tested).

## 2026-10-26 — DLC update R3+R4: Deep Signal mode + Pack 1 "The Glass Librarian" (Act 4) (Claude Opus 5.5)

- **R3 foundation**: `ActId = number` (no `1 | 2 | 3`), `lastAct` (3 standard / every content act on Deep Signal), `deepSignalOpen` (after a win), `run.mode = 'deep'`, setup "깊이" toggle, reward/chronicle/music read the act count; `content/index.ts` merges packs into the exported arrays so every integrity/art test covers them.
- **Pack 1 (Act 4)** `content/packs/glass_library/`: Censorate enemies 8 + elites 4 + bosses 3 (IO, THE BLANK, THE FIRST READER), 13 encounters + `a4_event_ambush`, act def, 20 events (Codex/Astra, `outputs/briefs/glass_events*.md`), new status **redact** (next card +1 cost; `redactTax` in `canPlay`/play), backdrop `library`, `tuning.acts[4] = { hpPct: 45, dmg: 3 }` + boss moves +2.
- **Art (Codex, 0 GCP)**: 45 sprites, 3 boss key arts, act4 + map act4 + `v2/arena/library.webp` + legacy backdrop, 20 event scenes, redact icon (~80 calls). New art test: every encounter backdrop has 2.0 arena art (caught the missing library arena).
- **Sim (Deep Signal, 3 × 150 mixed)**: 30.7/28.7/28.7 % clear (standard 39 %), ~20 % of runs entering Act 4 die there, Act 4 boss loss 10.2 % (9.1 turns), greedy deep 90 %.
- **Verified**: `make check` (379 + 338), `make playthrough-quick` OK, sandbox screenshots of `a4_boss_io` / `a4_n2_footnotes` / `a4_boss_reader` (0 console errors). **Unverified**: a full Deep Signal run through the real UI (Act 3 → 4 transition is engine/sim-verified only).

Older entries: `bin/docs/archive/` (newest: `progress-2026-10-26-dlc-r1-r2.md`).

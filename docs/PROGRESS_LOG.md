# Progress Log

Last updated: 2026-10-31

## 2026-10-31 — Baseline re-check at `d59cb0d` (Claude Opus 5.5, /sync follow-up)

- **Verified**: `make check` green (node 458, Python 338, 12 skipped); `make playthrough-quick` OK in 122 s (5 map nodes with real fights, shop/safehouse/treasure/final choice → ending; muted, headless, local private server). `make frontend-build` left the tree clean (committed bundle = source).
- **Fixed**: `AGENT_BRIEF.md` named Argon's fix by its pre-rebase hash `a4c31d9`; the commit on this branch is `6850225`.
- **Production** `00167-yuh`: muted headless load of `/?sandbox=combat&enc=a1_n1_dodge` rendered; played a card + ended the turn: enemy phase hit, turn 2 drew a fresh hand, 0 console errors. A full sandbox fight (enemies→1hp) ended WON on turn 5. Unverified: a map-run fight, Google sign-in, sound. All other open items wait on the owner's verdict or real-play data.

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

## 2026-10-31 — F3 IX interference + replica, F4 card evolutions + best turn (Claude Opus 5.5, `/goal`, plan defaults)

- **What**: IX bends the game at boss phases (`phases[].glitch`, `engine/effects.ts glitchActive`): card names masked, pushes reversed through the next player turn (HUD badge, previews agree), Omega's fake restart using the 1.0 boot lines. IX's replica of last loop's killer (non-boss, HP ×1.3, damage +1, 80 ₵) at the first elite from Act 2, named in the fight intro and on the unit. 12 card evolutions (`content/evolutions.ts`, card + implant, secret, map note, codex tab). Best turn (damage + kills × 6) on the ending and in the share text. 12 Codex card images, `scripts/v2_assets/gen_evolved_cards.py`.
- **Changed from the plan**: best turn is a text line, not an animated replay. The replica is a single authored reappearance with no hierarchy (Nemesis patent caution, plan §F3); review before any paid release.
- **Balance** (canonical 3 × 150): without F3/F4 187 → with 197 / 450 (43.8 %, band OK). Replica cost measured separately: 41 → 36 / 150 on a `loops: 1` profile. That profile alone reads 54 → 41 / 150 against a fresh one, unrelated to this work and not investigated.
- `9e89e58` reached `main` and a preview with `make check` red (an empty card upgrade; a one-line command chained past the failure); fixed in the next commit, production untouched.
- Gates after the fix: `make check` green (node 457, Python 338); `make playthrough-quick` OK; `make test-e2e-v2` OK; real UI: reverse badge + mask at IX, replica intro + stats, evolution note + deck swap, 0 console errors. All 12 duo cut-ins seen through a real fight; `night_watch` art regenerated twice (face hidden by the band, then an off-tone pose).
- Real UI after the fix: evolved card in a hand; a played card crossing IX's phases (47 → 42 HP, reverse active); Omega's reboot banner through a played card and its animation; final `night_watch` cut-in, 0 console errors.
- Unverified: sound; feel; a real fight and sign-in on the preview or production. Art unapproved: 27 + 12 images. Not promoted.

## 2026-10-31 — F2 duo ultimates: twelve pairs (Claude Opus 5.5, owner: proceed without the F1 verdict)

- **What**: `content/duos.ts`: 12 pairs with a history (every companion in at least one). With both standing and a full gauge the duo joins the options under the key `duo:<id>`; same gauge, once per fight, fired from `pair[0]`. Cut-in with its own illustration (`v2/ult/duo_<id>.webp`, 12 Codex images, `scripts/v2_assets/gen_duo_art.py`, owner art approval pending), both names, one spoken line. Found duos go run → `profile.duos`, Archive codex tab "듀오" (unfound = ???).
- **Changed from the plan**: no 12 new SFX, the pair's two existing ultimate cues play 420 ms apart; no separate first-time cutscene, the line sits under the cut-in and both lines live in the codex (low fatigue).
- **Balance**: standard canonical 3 × 150 187 → 187 / 450; all companions unlocked 317 → 318 / 450; a duo fired in only 7 / 450 bot runs, so the run sim says nothing about their strength. Forced pairs (12 Act 3 fights × 6 seeds, greedy, gauge full at the start, solo ultimates → duos): win rates equal for 11 pairs, +0.01 for `how_to_stand`; largest gains HP lost `red_ink` 3.2 → 1.9, `same_dream` 2.5 → 1.4. No duo dominates; the greedy bot does not pick every duo when a solo option scores the same.
- Gates: `make check` green (node 444, Python 338); `make playthrough-quick` OK (172 s); `make test-e2e-v2` OK; real UI desktop + 390 px: duo button, cut-in, line, gauge spent, `duosFired` kept after the fight, Archive duo tab (1 found, 11 ???), 0 console errors, no overflow.
- Unverified: sound (muted); 11 of the 12 cut-ins seen only on a contact sheet, not in a fight; art and feel need the owner. Not promoted.

## 2026-10-30 — F1 "the run changes": forbidden implants, noise gates, event rotation (Claude Opus 5.5, owner: "fun first", `/goal`)

- **What** (`docs/plans/2026-10-30-next-content-expansion-plan.md` F1): 12 boss-rarity implants that change a rule (`ImplantDef.rules`, `engine/implantRules.ts`); 3 noise gate events (`content/eventsNoise.ts`: −6 HP, this act's mutator for 3 wins, then 2 forbidden implants added to that reward); maps prefer events not seen in the last 2 normal loops (`profile.recentEvents` → `run.staleEvents`, never on a daily). 15 Codex images (0 GCP). HUD chip shows the wins left; option hints now wrap on phones.
- **Tuning from the sim** (start-of-run holder, mixed, 100 runs, base 52): first cut `overload_buffer` 0, `debt_clock` 27, `empty_handed` 26, `corpse_fuel` 29, `echo_wedge` 74 → retuned to 42 / 45 / 37 / 35 / 57; others chain 46, black pact 38, weightless 51, glass 64, pyre 44, hollow 60, wall 47.
- **Balance** (same seeds, before → after): **canonical blocks (`100000·block + i`, 3 × 150) 196 → 187 / 450 = 43.6 → 41.6 %, inside the 35–45 % band**; after raising the cost of Glass Circuit (65.8 → 55.3 % held from turn 1) and Hollow World (59.6 → 53.3 %), measured on the same 450 seeds; an ad-hoc block of seeds 1000–3099 reads higher, 152 → 154 / 300, do not compare it with the band; parts on an earlier tuning: implants only 151, gates only 142; greedy 58 → 56 / 60; greedy P5 56 → 52 / 60; Deep Signal mixed 25 → 22 / 75. The bots do not plan around the new rules, so these bound the content, they do not measure it. Map rolls change for existing seeds, as with any event addition.
- Gates: `make check` green (node 440, Python 338); `make playthrough-quick` OK (199 s); `make test-e2e-v2` OK (daily replay verified); real UI desktop + 390 px: gate hint + HP + mutator chip, noise-paid reward + pick, two full fights holding six rule implants (Hollow World voids on the board), 0 console errors, no horizontal overflow.
- Per-implant table + criteria check: plan §F1. Greedy P5 per implant 31–40 / 40 against base 37 / 40: greedy sits near its ceiling and hid that strength: judge dominance on mixed 450. A gate played to its payout through real fights in the real UI (3 wins → pick → installed → chip gone, 0 console errors), with the gate entered from a forced event screen.
- Gate rolled and taken naturally in 29 / 150 mixed-bot runs; real UI entered through a map node click (node placed by the test).
- Unverified: sound; every rule's feel. **Owner fun check (plan §F1 criterion) is open** and blocks F2–F4. Not promoted.

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

# Progress Log

Last updated: 2026-10-25

## 2026-10-26 — DLC update R3+R4: Deep Signal mode + Pack 1 "The Glass Librarian" (Act 4) (Claude Opus 5.5)

- **R3 foundation**: `ActId = number` (no `1 | 2 | 3`), `lastAct` (3 standard / every content act on Deep Signal), `deepSignalOpen` (after a win), `run.mode = 'deep'`, setup "깊이" toggle, reward/chronicle/music read the act count; `content/index.ts` merges packs into the exported arrays so every integrity/art test covers them.
- **Pack 1 (Act 4)** `content/packs/glass_library/`: Censorate enemies 8 + elites 4 + bosses 3 (IO, THE BLANK, THE FIRST READER), 13 encounters + `a4_event_ambush`, act def, 20 events (Codex/Astra, `outputs/briefs/glass_events*.md`), new status **redact** (next card +1 cost; `redactTax` in `canPlay`/play), backdrop `library`, `tuning.acts[4] = { hpPct: 45, dmg: 3 }` + boss moves +2.
- **Art (Codex, 0 GCP)**: 45 sprites, 3 boss key arts, act4 + map act4 + `v2/arena/library.webp` + legacy backdrop, 20 event scenes, redact icon (~80 calls). New art test: every encounter backdrop has 2.0 arena art (caught the missing library arena).
- **Sim (Deep Signal, 3 × 150 mixed)**: 30.7/28.7/28.7 % clear (standard 39 %), ~20 % of runs entering Act 4 die there, Act 4 boss loss 10.2 % (9.1 turns), greedy deep 90 %.
- **Verified**: `make check` (379 + 338), `make playthrough-quick` OK, sandbox screenshots of `a4_boss_io` / `a4_n2_footnotes` / `a4_boss_reader` (0 console errors). **Unverified**: a full Deep Signal run through the real UI (Act 3 → 4 transition is engine/sim-verified only).

## 2026-10-26 — DLC update R2b: CRPG for everyone, 2 districts/act, factions, d20 roll, ground jolt, Architect Omega art (Claude Opus 5.5)

- **CRPG free (D2)**: "Signal+" tags gone from setup/district; `DISTRICTS_PER_ACT = 2` (two event nodes on different rows; 28/30 seeds get 2 in Act 1).
- **Factions (C+4)**: `Faction` offgrid/market/grid on every NPC (`NPC_FACTION`), `crpg.rep` moved by dialogue intent (warm +1, threat/lie/force −1); ±3 tiers: market shop ∓10 %, offgrid rest ±10 pts, grid trace ∓1/node. Shown on the character sheet.
- **d20 (C+3)**: tumbling throw + bounce landing, rattle ticks, natural 20 gold / natural 1 cracked; approval reactions pop in.
- **Ground jolt (owner idea)**: a push/pull onto fire or a hazard, or off one onto safe ground, deals that ground's hit once (`groundJolt`, ≤ 1 per push). 3 × 150 mixed 39.3/34.7/38.7 % (neutral), greedy P5 82.2 %.
- **Art**: Architect Omega redesigned as a black-and-brass drafting machine with amber/violet blueprints (key art + 3 sprites, Codex 7 calls) — it had been a near-copy of IX (owner report).
- **Fix**: `ui_playthrough.py` treasure tour now grants an implant the run does not own (the first pool entry could already be held → "2 -> 2" false failure; seen once, then 3 passes).
- **Verified**: `make check` (378 + 338), `make playthrough-quick` OK ×3. **Unverified**: phone screenshot of the reputation block.

## 2026-10-26 — DLC update R2a: companion recruit scenes, character sheet, choice axes, skill SFX (Claude Opus 5.5)

- **Recruit scenes** (owner: "동료 소개·성격·대화 같은 RPG 요소가 너무 없다"): `CompanionIntro` (bio, 3 traits, likes/dislikes, quote, 4–6 beats, 3 first-impression choices with replies, liked tone, reunion lines) for all 6 companions — text by Codex/Astra (`content/companionIntros.ts`), 6 meeting stills `v2/recruit/*.webp` (Codex). Engine: `joinCompanion` queues `run.introQueue`; `resolveIntro` (liked tone → +1 bond on normal runs, leans an axis). UI `RecruitScene` on the map (full first meeting / one-line reunion via `profile.companionsMet`). `ui_playthrough.py` reads scenes through.
- **Character sheet** (`CharacterSheet`, top-bar portrait): stats + live perks (`statPerkLines` shared with the tooltip), background, growth, the 4 axes, Signal Burst, crew with bond/approval/traits/first impression.
- **Choice axes** (1.0 port): `run.axes` humanity/dominance/resilience/insight — dialogue intents (`intentAxis`), first impressions, elite/boss wins.
- **SFX**: 14 new procedural cues (slice, acid, whoosh, crit, hack, blink, riposte, rage, chain, momentum_full, burst ×3 per archetype, recruit); per-card signature sound from effects/tags (`cardSignature`), distinct bleed/corrode ticks, burst-ready call-out.
- **Verified**: `make check` (376 + 338), `make playthrough-quick` OK (210 s, scenes read through), real-UI screenshots desktop + phone (scene beats/choice/reply, sheet). **Unverified**: human listen check of the new SFX.

## 2026-10-26 — DLC update R1: action layer + visuals, Jujak/Arachne unique art (Claude Opus 5.5)

- **Plan**: `docs/plans/2026-10-26-dlc-expansion-plan.md` §17 (owner: DLC-scale free update, CRPG/action/visual boost; execution R1–R7).
- **Action (engine)**: Chain (`t{turn}:kills` → draw / +1 energy / +25 Momentum), Momentum 0–100 (`gainMomentum`: kill 20, env +10, crit 10, evade 10, +10 per later turn), Signal Burst (`ArchetypeDef.burst` data, `burstReady` / `burstInPlace` / `fireBurst`, recorded for daily replay), Riposte 2 on an Evade-grazed melee hit; redirect `to: 'all_enemies'`. Bot fires the Burst when ≥ 2 foes or an elite/boss stand (act-1 normal fights: 15 % reach it). `engine/action.test.ts` (3).
- **Balance**: tuning boss Rage 1 → 2, boss HP −15 → −10 % to offset the Burst (boss loss had fallen 15 → 8 %). TUNE A/B 3 × 150 mixed 38.7/39.3/36.7 %, ghost 42 / smuggler 36 / echo 37, elite loss 6.0 % (7.2 t), boss 15.7 % (9.0 t).
- **Visuals**: Momentum gauge + Burst button (`MomentumGauge`, desktop above items, phone grid area `mom`), Burst cut-in banner with portrait, chain counter text, crit cut (longer hit-stop + slash + flare + zoom punch), elite/boss death shockwave + debris, Rage aura (`--rage` pulse). Sandbox `?momentum=100` for checks.
- **Art**: Jujak / Arachne got their own key art + idle/attack/hit sprites (Codex, 8 calls) — they had borrowed Haetae / Echo Eater art (owner report: Act 1 always opened on Haetae's illustration).
- **Verified**: `make check` (373 + 338), `make frontend-build`, `make playthrough-quick` (105 s), sandbox screenshots desktop + phone (Burst ready/cut-in, Jujak). **Unverified**: human feel of the Burst pacing.

## 2026-10-25 — S-rank pass 2: Rage, archetype parity, Paradox 5 ceiling, status icons (Claude Opus 5.5)

- **Owner fun verdict (2026-10-26)**: "S — fun, keep it" on live `00150-qen` → S-rank criterion 7 passed; goal closed.

- **Rage** (`StatusKind 'rage'`, `dmgBonusOf` adds it, `growRage` in the enemy phase, `CONTENT.tuning.rage` elite 3 / boss 1 from turn 3, Paradox 5 one turn earlier via `CombatScaling.rageFrom`; `bossHpPct` −15). Flat elite damage +1/+2 had left elite loss at ~3 % (rejected). `engine/tuning.test.ts` (5 tests).
- **Parity**: ghost evade perks AGI 7 → 8 (Se-rin's +1 made them free), `cracked_cube` victory heal 2 → 5, `overclocked_deck` block 3/turn.
- **Art**: Codex status icons `status/{bleed,evade,focus,rage}.png` (chroma-keyed, 4 calls); `art.test.ts` asserts every status has its own file.
- **Sim** (5 × 150 P0): mixed 40.5 % (39.3/40.7/38.7/49.3/34.7), ghost 42 / smuggler 42 / echo 37, elite loss 7.3 % (7.5 t), boss 8.9 t, Paradox 1–5 34.7/26.0/12.7/10.7/8.7 %, greedy P0 98.9 / P5 85.6 %, basic 0 %.
- **Smuggler payoff card** `mass_hijack` (rare, cost 1/0: redirect every intent in a cross + 5₵; Codex art): smuggler-only 3 × 150 with 38.9 % vs without 39.3 % (neutral, identity not power); mechanics test in `tuning.test.ts`.
- **Preview**: `make deploy-preview` → `00150-qen` (`git-sha=a6615b7`, 0 % traffic, tag `v2-preview`); `make verify-preview` 5/5 (HEAD sha, health, postgres + gemini GM, google auth, served bundle = committed); headless muted visit of the preview (sandbox `a2_boss_hyeonmu` shows the new sprite, title screen, 0 console errors). Promoted on the owner's answer ("Promote now"): `update-traffic --to-latest` → `00150-qen` 100 % `LATEST`; production URL `verify_preview.py --url` 4/4. Rollback `00148-nav`.
- **Verified**: `make check` (370 + 338), `make frontend-build`, `make playthrough-quick`, sandbox screenshot of an elite at turn 4 (Rage 3 pill, telegraph 9). **Unverified**: human feel of Rage.

## 2026-10-25 — Argon review: refactor, rebalance (~75 → ~45 %), unique art (Claude Opus 5.5)

- **Review** (`docs/plans/2026-10-25-argon-review-and-s-rank-plan.md`): Argon's `0699ace..491f071` raised P0 mixed win 30.8 → ~75 % (greedy 100 %) unmeasured — the log entry below still quoted 30.9 %. Same-block sims: `1f97f84` (stats/evade/crit/DoT) 61.7 %, `491f071` 70.8–77.5 %; all stat perks off 51.7 %; 7-row map −16 pts. Hidden mutator rules (`overclocked_grid` per-turn refund + DoT ×1.5, `magnetic_storm` bump/push, `acid_rain` first-2-enemies + hazard ×2), `ripper_hound` text, English-only CRIT/EVADE popups, reused art (3 bosses, 14 cards, 4 implants, 9 events, 12 sprites).
- **Refactor**: `engine/statPerks.ts` (one table for engine + `TopBar` tooltip), `perksOf`/`sprintEvade`/`hazardDamage`/`applyOpeningPerks`, `MutatorDef.combat` + `mutatorCombat()`, `WORLD_ECHOES` (`legacy.ts`; dead `world_echo_throne` + encounter-id branches removed), `CONTENT.tuning` (`EnemyTuning`; test doubles keep authored numbers).
- **Balance**: `MAP_ROWS` 8 → 7 (24 floors), perk thresholds +1, tuning HP +12 % / elite·boss +20 % / enemy dmg +1 (telegraphed), bleed movement-only, smuggler HP 32 → 35 + `overclocked_deck` block 2/turn (smuggler-only 32 → 46 %) + `system_hack` draws 1. P0 4 × 150 mixed 38.0/44.7/48.0/54.7 %, greedy 98.9 %, basic 0 %, Paradox 1/3/5 31.3/27.3/16.0 %; ghost ~54 · smuggler ~37 · echo ~48; boss ~10 turns. Elite flat +1/+2 dmg tried: elite loss stays ~3 % (not adopted, `EnemyTuning.eliteDmg` left at 0). Open: archetype gap 17 pts, elite threat, boss length.
- **Fixes/UX**: mutator text = code, `acid_rain` hits all enemies, localized 치명타/회피 popups, distinct bleed (crimson) / corrode (acid) damage numbers.
- **Art (Codex image, 68 calls, 0 GCP)**: unique boss key art ×3, boss sprites ×3, cards ×14, implants ×4, events ×9, enemy sprites ×9 (`sprites/specs.py`, `build_manifest.py`); eye-checked, `qa_text.py` (Gemini) not run.
- **Verified**: `make check` green (363 + 338), `make frontend-build`, `make playthrough-quick` OK (126 s; 134 s after the smuggler/tuning follow-up), sandbox screenshots (3 bosses, blade alley, rust hulk; 0 console errors). **Unverified**: `make test-e2e-v2`, phone widths with new art, deploy (production still `00148-nav`).

Older entries: `bin/docs/archive/progress-2026-10-25-showcase-and-content.md` (2026-10-24 … 10-25), `bin/docs/archive/progress-2026-10-20-showcase-prep.md` (2026-10-18 … 10-20).

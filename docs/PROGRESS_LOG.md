# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — Full Deep + CRPG UI run green; four achievements for today's content (Claude Opus 5.5, same goal)

- **Integration**: `ui_playthrough.py --deep --signal-plus` after every change of the day: OK in 1383 s, 6 acts → victory, 20 district and 54 dialogue polls, 0 console errors.
- **Achievements 76 → 80**: Choices Come Back (two callback scenes in a run), Strangers With Names (two procedural events), Reader of the Glass Library (any of the four Act 4 district quests finished), Seasoned (a companion at level 5). New conditions `runEvents` / `questDone` / `companionLevel`; tests. Paradox 7 and 10 win achievements became reachable with the clamp fix.
- **AI off**: the local GM opening of a procedural event now brings in the cast person too (`localGm.ts`, KO particle via `josa`, EN sentence-initial capital; test).

## 2026-11-04 — Procedural events cast a person; the eval counts what players see (Claude Opus 5.5, same goal)

- **Cast**: `PROCEDURAL_PEOPLE` (12 authored people, a name and one detail) → `proceduralPerson(run, eventId)` (stable per run and event) → `person` in the opening context → the GM is told to bring that person in by name. Local `gemma4:8b-64k`, 3 reps × KO/EN: 5 of 6 lines name the cast person (0 of 6 before).
- **Eval = production**: `gm_eval.py` narration cases now apply the same absent-companion guard as `/gm/narrate` (the earlier "Kai" line would have been replaced by the authored text in the game, but the eval counted it usable). Test added.
- **Verified**: `tests.test_v2_gm`, `tests.test_gm_eval`, `eventOpening.test.ts`; whole local eval usable 100 %.

## 2026-11-04 — Sea callbacks: early choices come back on the sea too (Claude Opus 5.5, same goal)

- Sea runs share Acts 1–3 but the later callbacks were Deep-only. Added `sea4_cb_list` (Dry Harbor: the copied list washes up), `sea5_cb_debt` (Tide Line: Lin-yue's interest), `sea6_cb_citizen` (Last Lighthouse: the saved citizen keeps the lamp log), same flags as their Deep counterparts, Codex art in the Sea's style (unreviewed). Sea mixed 27.6 % (28.0 before). UI: both later scenes render and resolve on their routes (ko desktop, en 390 px), 0 console errors. Not deployed.

## 2026-11-04 — Procedural events (W2-3); new district NPCs talk (Claude Opus 5.5, same goal)

- **Built**: six skeleton events in Acts 1–3 (`content/eventsProcedural.ts`: stranger's trade, lost signal, watcher, shelter, wreckage, message; Codex art, unreviewed). Options and outcomes are authored; the GM's prefetched opening line gets `procedural` (the brief) and is told to invent the place and a named person (`gm.py _procedural_note`). At most two per run (`MAX_PROCEDURAL`), never on a daily; a capped node plays another event.
- **Verified**: engine test (cap, daily), server test (opening only, brief in the system prompt); local `make gm-eval` (`gemma4:8b-64k`, 3 reps): whole set usable 100 %; the procedural lines set a concrete place, but a person appears in about half and never by name, and one Korean line brought in Kai, who was not in the party. Vertex not evaluated (billed). Canonical mixed: fresh 41.3 % (42.9 before; blocks −1, −8, +2), Deep 34.4 % (32.7), Sea 28.0 % (31.1; −6, +2, −10). UI with GM off: two events render and resolve (ko desktop, en 390 px), 0 console errors.
- **District NPC talk**: the six new NPCs answered free text in character on local Ollama (KO/EN, 0.7–5.3 s, all `source: llm`, intents named).

## 2026-11-04 — Paradox 6–10 tuned to the plan's expert ceiling (Claude Opus 5.5, same goal)

- `CONTENT.tuning.paradoxHigh` (rage at 6: 1 → 2, boss HP at 8: +20 → +40 %, new +8 % enemy HP per level above 5); texts match (content test). Greedy (3 × 60, fresh canonical): P5 88.9 · P6 84.4 · P7 78.3 · P8 66.1 · P9 63.9 · P10 53.3 % (target ~55 %, DLC plan §3.3). Other candidates: hp 8 alone 60.0 %, rage 2 / boss 40 / hp 14 38.3 %. Paradox 0 unchanged (canonical 59 / 70 / 64). Agent default, `DECISIONS.md`.

## 2026-11-04 — Paradox 6–10 were never applied (fixed); Paradox 10 "IX Learns" built (W2-1) (Claude Opus 5.5, same goal)

- **Found while measuring**: `newRun` clamped Paradox to 5 since the engine was first written, so Paradox 6–10 (DLC update 10-26) showed in setup and unlocked to 10 but every run played as 5. Fixed (`MAX_PARADOX`, regression test). Anyone at 6+ will now meet those rules for the first time.
- **Built**: `content/ixReads.ts` + `ixReadFor` / `IX_READ_MIN` (run.ts): at Paradox 10, from Act 2, IX reads the deck's non-starter synergy tags at each act start and sets one counter for that act (six authored counters on known mechanics); applied in the combat opening; shown under the act title ("IX가 당신의 ○○을 읽었다"). The +1 damage stays.
- **Measured** (fresh canonical, greedy 3 × 60, mixed 3 × 150): greedy P5 88.9 → P8 84.4 → P10 81.1 % (IX reads off: 79.4, i.e. the counters are within noise for the expert bot); mixed P5 11.1 → P10 2.7 %. The plan's greedy P10 ~55 % is far off: re-tuning the 6–10 ladder is an owner call.
- **Verified**: engine tests (read thresholds, Paradox 10 only, counter in the fight), all node tests; Act 2 intro line in headless muted Chromium (ko, en), 0 console errors.

## 2026-11-04 — IX reads more habits (W2-2) (Claude Opus 5.5, same goal)

- **Built**: `habits()` in `ui/common/loopMemory.ts`: where loops usually end (≥ 60 % of deaths in one act), the deck's lean (`RunRecord.lean`, attack or skill > 55 % of non-starter cards, set at run end and kept on reload), the companion and the shape as before. They take turns by loop count, so the companion everyone brings (Se-rin) no longer hides the rest. `habitFact` feeds the GM's memory list; `ixHabitLine` is IX saying it to you, added to the Archive's authored IX line every other loop (works with AI off).
- **Verified**: `loopMemory.test.ts`, `meta.test.ts` (lean thresholds, reload keeps lean and `veterans`); two `make gm-eval` cases (`ix_loop_start_habit_ko/en`) on local `gemma4:8b-64k`: whole set usable 100 %, p50 0.96 s. The model did not quote the new habit facts in either line (IX may pick any memory); the authored line names them reliably. Vertex not run (billed).

## 2026-11-04 — Reverse-engineering 4–5 analysed; companions who reach level 5 leave a good habit (Claude Opus 5.5, same goal)

- **Analysis** (`docs/plans/2026-11-04-reverse-engineering-4-5.md`, public reviews / Mega Crit news): Mewgenics' "traces, not power" was mostly in already (DLC 3 residue for companions who went down, words only); the gap was the good side. Slay the Spire 2's alternate Act 1 is DLC-sized and unmeasured (no real players yet): recorded, not built.
- **Built**: `profile.veterans` (companions at level 5 when a non-daily run ends) → `run.pride` → one line per companion (`PRIDE`, 14) under the next Act 1 title; residue goes first. Words only: engine test checks stats and max HP are unchanged. My first proposal (a small max-HP trade-off) was dropped: it broke DLC 3's words-only rule.
- **Verified**: `sea.test.ts`; Act 1 intro line in headless muted Chromium (ko, en), 0 console errors (`outputs/qa/pride_ui/`).

## 2026-11-04 — Two Glass Library districts: The Forbidden Index, The Drawer of Cut Names (W1-4 done) (Claude Opus 5.5, owner goal: keep going)

- **Built** (`content/crpg/d4_forbidden_index.ts`, `d4_cut_names.ts`; personas `src/mythos_v2/npcs/d4_*.py`; 2 district scenes + 6 NPC portraits by Codex image, unreviewed): the last two 1.0 Glass Library side quests as Act 4 districts (14 → 16). The Forbidden Index: get the backwards-reading key (Yun, Old No) → decode one banned book (dim Rim's lamp first, read under the light for Trace, or let Io read the book she wrote) → boss starts **marked**. The Drawer of Cut Names: get the drawer open (Sae, the unnamed clerk) → paste a name back (Mun's seamless paste, a rough patch for Trace, or Io finds the clerk's own name) → boss fight starts with **cover**. One card pick each; ≤ 25 / 20 credits.
- **Verified**: `crpg.test.ts` (reachability, budgets, personas, quests), content tests; real UI, headless muted: Forbidden Index at 1280×720 and Cut Names at 390×844 played stop by stop to quest stage 2 through the buttons, 0 console errors (`outputs/qa/district_ui/`). Unverified: the AI free-talk with the six new NPCs (GM off in QA), and how a human reads the dialogue.

## 2026-11-04 — Glass Library codas (W1-4, first half) + Act 4–6 local GM line fix (Claude Opus 5.5, same goal)

- **Built**: `ActDef.codas` + `actCoda` / `previousCoda` (engine/run.ts): when an act with codas is left, its leading choice axis (each axis against its ending threshold: 4 / 4 / 10 / 4, so resilience from boss wins does not always win) picks one of four closings: A Quiet Return (insight), Names Restored (humanity), The Stolen Book (dominance), The White Seal (resilience), 1.0's four Glass Library endings. Written to the chronicle and shown under the Act 5 title.
- **Fixed** (found in the screenshot): the local GM line for every act from 3 up said "The ARK Spire", so Deep and Sea Acts 4–6 opened with Act 3's line whenever the AI line was off or fell back. Acts 4+ now get lines that name the act. The server's chronicle prompt also told the model a Deep / Sea victory ended "atop the ARK Spire"; past Act 3 it now names the act the run ended in (`gm.py`, test). Also: the act-intro residue / echo / coda line was auto-placed into the number column and squeezed the title on a 390 px phone; it now spans the row.
- **Verified**: engine test (threshold comparison, flag, chronicle), local GM test; Act 5 intro with a coda in headless muted Chromium (ko desktop, en 390 px) before/after the layout fix, 0 console errors (`outputs/qa/coda_ui/`). Left for W1-4: the two Glass Library districts (Signal+ CRPG layer, about 600 lines each + art).

## 2026-11-04 — Callbacks: five earlier choices come back as scenes (W1-1, first part) (Claude Opus 5.5, same goal)

- **Built** (`content/eventsCallbacks.ts`, 5 Codex images, unreviewed): walking past the capsule → Act 3 "Score 312" (Se-rin's bond can drop: the "Se-rin distrust" branch); cutting out Kai's core → "The Warm Core"; covering Kai with the umbrella → "The Yellow Umbrella"; Trace ≥ 60 → "Hunt Order" (the hard-push branch); copying the list instead of pulling three names → Deep Act 4 "The Copy" (records or people: Dominance / Humanity). New flags on the original options: `left_citizen`, `kai_cored`, `kai_umbrella`, `list_copied`. A scene whose flag is not set gives way to another event.
- **Measured** (canonical, mixed; baseline fresh 41.6 / Deep 33.8 / Sea 31.6 %): roll weight 3 cost Sea −3.8 (lower in all three blocks; with every callback switched off the baseline came back exactly, the capsule/core/umbrella trio was the cause: it crowded out stronger Act 3 events) → weight 1: fresh 42.9, Deep 31.6 (blocks −3, −8, +1), Sea 31.1 %.
- **Verified**: content + event-balance tests; the five scenes in headless muted Chromium (ko desktop, en 390 px), an option picked through the UI resolves each, 0 console errors (`outputs/qa/cb_ui/`). Full Deep Signal UI run (6 acts, victory, 1555 s) OK; an earlier attempt stalled in the Act 1 boss while I was editing source under its live Vite server (likely HMR; random seed, not reproduced).
- **Second part (Deep segment)**: Act 5 "Interest" (Lin-yue's unpaid debt: pay in credits, Lin-yue speaks for you, pay with max HP, borrow once more, or tear the ledger), Act 5 "The Same Dream" (Kai woken: the machines dream it; Kai bond if he is along), Act 6 "The Cleaning Cart" (the saved citizen again). 3 Codex images. Deep with all 8 callbacks 32.7 % (baseline 33.8; blocks −2, −6, +3). UI: the three scenes render and resolve (ko desktop, en 390 px), 0 console errors.

## 2026-11-04 — Boot screen the first time a run goes below the city (W1-5) (Claude Opus 5.5, same goal)

- **Built**: `content/bootLines.ts` (1.0 `boot_lines` / `signal_lines` adapted per depth: Deep Signal and Sea) + `ui/shell/BootScreen.tsx` over the Act 4 intro: lines type in, the signal line follows, a click or ~1.6 s after the last line closes it; once per depth per device (`mythos2.bootSeen`), never on an Endless lap.
- **Verified**: `make check`, `make test-e2e-v2`, `make playthrough-quick` (node 536, Python 338, all green); headless muted Chromium, deep at 1280×720 and sea at 390×844: appears, closes by itself, not shown again, 0 console errors (`outputs/qa/boot_ui/`). Unverified: a full `--deep` playthrough with the overlay (closes by itself, so the bot is not blocked by design).

## 2026-11-04 — World echoes for every victory ending, 3 → 16 (W1-3) (Claude Opus 5.5, same goal)

- **Built**: 13 new echoes, one per Deep Signal (6) and Sea (7) victory ending, each a small effect (credits, bond, `maxHp` (new field), opening block, final boss) plus a `scene` line, the one concrete thing that changed in the city, shown under the Act 1 title (all 16 have one).
- **Measured** (next loop after that ending, fresh canonical 3 × 150, mixed): no echo 41.6 %; existing Remaining Ember 48.4 % (reference); Twelve-Second Light 45.8, Full Stop 42.7 (harder final boss), The Scrawl (+3 max HP) 48.7, Those Left 44.0, Off the Map 49.8 → cut to +10₵ / +2 max HP → 48.0. Every new echo at or below the reference.
- **Verified**: `make check` (node 536, Python 338), `make test-e2e-v2`, `make playthrough-quick`; test: every victory ending has exactly one echo and its text matches its numbers; Act 1 intro line in headless muted Chromium (ko 1280×720, en 390×844, `outputs/qa/echo_ui/`), 0 console errors. Unverified: the lines' tone by a human reader.

## 2026-11-04 — Undo reaches cards that reveal nothing (Claude Opus 5.5, same goal)

- **Built** (reverse-engineering item 3): Z / the undo button now steps back through every action this turn that revealed nothing: moves, and cards or consumables that drew no card and left the combat RNG and the shuffle/AI streams untouched (`keepUndo` in the `playCard` / `useConsumable` / `moveUnit` wrappers; the bots' in-place calls pay nothing). A draw, a roll, an ultimate or the end of the turn makes everything before it final. Snapshots now sit on a flat `undoStack` instead of nesting (nested JSON doubles its escaping per level); a snapshot nested by an older save still undoes one step at a time, so old daily replay logs stay valid (`undoMove` keeps its name for them). Labels: "이동 취소 / undo move" → "되돌리기 / undo".
- **Verified**: `make check` (node 535, Python 338), `make test-e2e-v2`, `make playthrough-quick`; engine tests: state after undo equals the state before the action, two-step undo, a draw ends it, no nested snapshot; real UI, headless muted, 1280×720 + 390×844 touch: a card that killed an enemy, then Z / the button → enemy back on the board, energy and hand restored, 0 console errors (`outputs/qa/undo_ui/`). Not measurable in the sim (the bot already plans with exact previews). Owner check: `docs/test/mythos2_fun_check.md` §14 (less fatigue? too easy?).

## 2026-11-04 — Companion level perks: choose one of two at level 3 and 5 (Claude Opus 5.5, same goal)

- **Built** (reverse-engineering item 1): `content/levelPerks.ts` + `engine/companionLevel.ts` (`perkOptions`, `activePerks`, `pendingPerk`, `choosePerk`, `perkWaiting`); `PartyMember.perks`; `run.chooseCompanionPerk` (map only, final, replayable). Option a = the old fixed bonus (Guarded block 3 / Resonance +15 Momentum), so saves and every default stay as they were; level 3 option b follows the companion's best stat (STR Counterpunch thorns 2 · AGI Footwork +1 move · INT Hardened Rig +1 armor · CHA Read the Room evade 1 · OBS Steady Aim focus 2), level 5 option b Veteran (+1 damage, +1 armor). Party screen: two buttons per open level, a gold dot on the party button while a pick waits; sandbox `?lvl=5&perk=b`.
- **Measured** (sim `perks: 'a'|'b'|'b3'|'b5'`, canonical blocks, 450 runs per depth): never choosing = option a = 41.6 / 33.8 / 31.6 % (fresh / Deep / Sea). Final all-b: 42.0 / 35.1 / 32.0 %; level 5 alone Deep 33.8 vs 33.8. Rejected: Footwork as evade 2 (Deep +6.2, ahead in all three blocks) and evade 1 (with it every b set stayed ahead in all three Deep blocks: Se-rin is in nearly every party); Heavy Hands +1 damage (Deep +3.1).
- **Verified**: `make check` (node 533, Python 338), `make test-e2e-v2`, `make playthrough-quick`; headless muted party screen (1280×720 ko, 390×844 en): dot shows, pick level 3 b then level 5 a, dot clears, 0 console errors (`outputs/qa/perk_ui/`); sandbox `?lvl=5&perk=b` loads. Owner check: `docs/test/mythos2_fun_check.md` §14. Unverified: whether the choice feels like a real decision by hand; the sim bot still never picks (canonical numbers unchanged).

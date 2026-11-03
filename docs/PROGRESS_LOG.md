# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — Chronicle twist bank (Claude Opus 5.5, same goal)

- `content/chronicleTwists.ts` (1.0 `twist_bank`): Se-rin's double role, the grid's real purpose, who you are; three beats each (hint, doubt, reveal). A campaign draws two at its first chapter end (`drawTwists`, by run seed; all six ordered pairs come up) and reveals them under the chapter titles: 2 → A1, 3 → B1, 4 → A2, 5 → B2, 6 → both reveals (`twistBeats`, `run.beats`). Tests; browser: chapter 6 shows both reveals, 0 console errors.

## 2026-11-04 — Chronicle: six chapters, one per act, tuned (Claude Opus 5.5, same goal)

- Chapter N plays Act N (with its gifts) and ends at that act's boss; `CHRONICLE_CHAPTERS` 6 (the DLC plan sketched five; the six acts exist). Each chapter starts from a starter deck plus three core cards, so `tuning.chronicle` lightens Acts 3–6 (HP −60/−90/−140/−180 %, damage −5/−6/−10/−12) for chronicle runs only.
- **Measured** (mixed, typical carried connector): chapter 1 93 %, 2 50 %, 3 56 % (was 5.6 untuned), 4 53 %, 5 56 %, 6 53 % (was 0); greedy chapter 6 97 %. Ending and setup text now chapter-neutral ("Chapter 4 of 6").
- **Verified**: engine test (chapter 4 starts on Act 4 with its gifts; enemies lighter than the same fight in Deep Signal); browser: chapter 4 from setup opens Act 4 as 4/6, 0 console errors. Still a hidden prototype (`?chronicle=1`).

## 2026-11-04 — Chronicle meters and NPC agendas (W4 steps 3–4, prototype only) (Claude Opus 5.5, same goal)

- **Meters** (`engine/chapterMeters.ts`, chronicle runs only): pressure +1 per node, −3 at a safehouse, at 6+ every enemy opens with 1 Rage; integrity starts 6, −1 per failed check (events and district talk), +1 per quest stage, at 0 the remaining districts play as events. One quiet top-bar line with a tooltip.
- **Agendas** (`content/chronicleAgendas.ts`, `advanceAgendas`): Se-rin, Lin-yue, IX, Kai and the people on the list; each moves at most one stage per chapter when what the connector carried out allows it; shown on the chapter-end screen; saved in `ChronicleState.agendas`.
- **Verified**: engine tests (meters, rage at the threshold, district closing, agenda stepping); browser: meters line on the map, agenda line at the chapter end, 0 console errors. Normal runs untouched (no meters, canonical blocks unchanged by construction).

## 2026-11-04 — Chronicle chapter 1 prototype, hidden behind `?chronicle=1` (Claude Opus 5.5, same goal)

- `RunMode 'chronicle'`: one act (`CHRONICLE_CHAPTER_ACTS`), districts always on, the carried connector applied at start (stats, background, axes, approval, quests, standing, three core cards); the Act 1 boss ends it with `ending_chronicle_chapter` (gated `mode: 'chronicle'`, Codex art), and `applyRunEnd` banks the next chapter. Setup shows "Chronicle (prototype)" only with `?chronicle=1`. Standard canonical blocks unchanged (58 / 62 / 66).
- **Verified**: engine test (the greedy bot clears a chapter; banking; the next chapter starts with the carried stats and core cards; a normal run ignores it); browser (setup option, run starts as chronicle with districts, chapter-end screen, profile banks chapter 1), 0 console errors (`outputs/qa/chronicle_ui/`). **Chapter-end pick (step 5)**: the ending screen of a cleared chapter lists the deck's cards; one tap toggles, three carry over (`withCore`; browser: swap one, the banked chronicle follows). **Prototype limits**: only chapter 1 exists (a chapter clear earns echoes but is not a loop victory: no wins, Paradox unlocks or victory achievements); meters and NPC agendas (steps 3–4) not built. Owner judges the feel before more.

## 2026-11-04 — Chronicle (W4) step 1: save compatibility proven (Claude Opus 5.5, same goal)

- `engine/chronicle.ts` + `MetaProfile.chronicle` (`ChronicleState`): what a chapter hands the next (archetype, stats, background, axes, approval, quests, faction standing, three core cards), `finishChapter`, and a validating `migrateChronicle` in `migrateProfile`. Lives in the profile: no new save slot, no server change (blobs are stored as JSON). Tests: old profiles load unchanged, a chapter round-trips through JSON and migration, malformed data is dropped or clamped, under 4 KB. Nothing playable; steps 2–5 and the owner gate: `docs/plans/2026-11-04-chronicle-ch1-slice.md`.

## 2026-11-04 — Judge showcase `?showcase=1` (W2-4); the Archive keeps its authored IX line on a fallback (Claude Opus 5.5, same goal)

- **Showcase** (`ui/showcase.ts`, `net/api.ts showcaseKey / showcaseBlocks`): save keys move to `mythos2.showcase.*` and save routes never leave the device; first boot builds a prepared profile (three loops dying in Act 2 with attack-leaning decks, Paradox 10 open) and a Deep Paradox 10 run at the Act 3 intro (shove deck → IX read; first nodes: `pc_watcher` and the Act 3 road recruit); opens on the Archive. Tests: namespace, blocked routes, prepared state.
- **Fix found by it**: the Archive replaced its authored IX line with whatever `narrate` returned, including the local line on a server fallback, so the habit (and loop/killer details) vanished with AI off. Only a model line replaces it now.
- **Verified**: headless muted (en 1280×720, ko 390×844): real-save markers in `mythos2.profile` / `mythos2.run` untouched, showcase run stored in its namespace, Archive IX line names the habit, Act 3 intro shows the read, recruit badge on the map, 0 console errors (`outputs/qa/showcase_ui/`). Devpost draft has the link.

## 2026-11-04 — Full Deep + CRPG UI run green; four achievements for today's content (Claude Opus 5.5, same goal)

- **Integration**: `ui_playthrough.py --deep --signal-plus` after every change of the day: OK in 1383 s, 6 acts → victory, 20 district and 54 dialogue polls, 0 console errors.
- **Achievements 76 → 80**: Choices Come Back (two callback scenes in a run), Strangers With Names (two procedural events), Reader of the Glass Library (any of the four Act 4 district quests finished), Seasoned (a companion at level 5). New conditions `runEvents` / `questDone` / `companionLevel`; tests. Paradox 7 and 10 win achievements became reachable with the clamp fix.
- **AI off**: the local GM opening of a procedural event now brings in the cast person too (`localGm.ts`). The first version printed the Korean name twice (`josa` already returns the word): caught in the UI check, fixed, test now counts the name.
- **Two Deep procedural skeletons** (`pc_deep_keeper`, `pc_deep_echo`, Acts 4–6, Codex art): eight in all. Deep mixed 33.3 % (34.4 before). UI: both render with the cast person in the GM card (AI off), 0 console errors.

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

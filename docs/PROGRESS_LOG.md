# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — Act 5 district quests come back in Act 6 (Claude Opus 5.5, same goal)

- Main-route Act 6 had one callback. `a6_cb_choir` (finished the Scrap Choir's song → it plays in the first record: +10 HP/+3◈, or follow it, OBS DC 6, −12 Trace) and `a6_cb_cold` (woke the Cold Storage machine → it waits at a fork: +8 HP + consumable, or −10 Trace/+3◈); both gated on quest stage 2, Codex art (unreviewed). New guard: an event's quest gate names a real quest and stage.
- **Verified**: content + event-balance tests; UI (KO 1280×720, EN 390×844) resolved through the buttons, 0 console errors. Balance: Signal+ only, canonical blocks unaffected (unmeasured).

## 2026-11-04 — The Hand-Crank Market's last two choices come back (Claude Opus 5.5, same goal)

- A scan of every flag set vs read found only two never read again, both in the Act 1 district `d1_lamp_market`. `a2_cb_ku` (promised Madam Ku three buyers → her kid comes to collect: pay 30₵ for a consumable and −5 Trace, find a buyer for +20₵ at CHA DC 6, or ignore; first draft was a pure tax and `event-balance.test.ts` caught it) and `a3_cb_min` (sold out Min → he limps into the Spire as a debt courier: apologise, Tae-o pays his helmet rental for +1 bond, or walk past); Codex art (unreviewed). 21 callbacks. Every content flag is now read somewhere.
- `narrative.test.ts` flag guards now count district dialogue options as setters (act + companion requirement), so district → act callbacks stay checked for reachability instead of failing as "never set".
- **Verified**: content tests; UI (Ku KO 1280×720, Min EN 390×844 with Tae-o) resolved through the buttons, bond +1, 0 console errors. Fresh/deep balance unaffected (both need Signal+ district flags the canonical blocks never set): unmeasured.

## 2026-11-04 — Second districts for Acts 5 and 6 (Claude Opus 5.5, same goal)

- Every act places two districts; Acts 5–6 had one each. `d5_cold_storage` (machines frozen mid-dream; get the thaw code from Seol or buy it from Jang, wake the oldest slowly as Gu shows → boss fight **cover**) and `d6_first_draft` (streets struck from the city's first draft are still lived in; ask Mo the name, rewrite it with San's dark ink or Yeon's own pen → boss **marked**). 6 personas, 2 scenes + 6 portraits by Codex (unreviewed). 20 districts / 60 NPCs. Sea Acts 4–6 place no district (checked; unchanged).
- **Verified**: content + chronicle tests (each of chapters 5–6 places 2); UI (Act 5 at 1280×720, Act 6 at 390×844) to quest stage 2 via buttons, 0 console errors; local Ollama: 4/6 in voice first try, Seol (archaic register) and Mo (반말) personas tightened, rerun in voice.

## 2026-11-04 — Districts for Acts 5 and 6 (they had none) (Claude Opus 5.5, same goal)

- `d5_scrap_choir` (discarded machines sing one dream that never ends; tune it with Dal or Kai, let it finish → boss **weaken**) and `d6_margin_notes` (every loop's connector wrote in the first record's margins; find your own hand, leave a line → **intel**); 3 NPCs each with server personas; 2 district scenes + 6 portraits by Codex (unreviewed). 18 districts / 54 NPCs. Chronicle chapters 5–6 now get a district (test).
- **Verified**: `crpg.test.ts`; UI (Act 5 at 1280×720, Act 6 at 390×844) played to quest stage 2 through the buttons, 0 console errors; the six NPCs answered in character on local Ollama (KO/EN).

## 2026-11-04 — Outside the List comes back in Act 3 (Claude Opus 5.5, same goal)

- The DLC 2 route's closing scenes now set `outside_kept` / `outside_gone`; Act 3 callbacks `a3_cb_line` ("The Line Held": a woman from the counter line now works the Spire kitchen) and `a3_cb_ladle` ("The Washed Ladle": the closed counter's ladle on the Spire kitchen wall), Codex art (unreviewed). Fresh mixed 186/450 (unchanged). UI: both render and resolve (ko desktop, en 390 px), 0 console errors. 13 callback scenes in all.

## 2026-11-04 — Endless Signal never ended once a run survived lap 0 (fixed: HP compounds per lap) (Claude Opus 5.5, same goal)

- **Found** (Endless sim smoke after the day's changes): `runSim: step limit` was not a stuck loop but a run still alive after 5000 steps. Mixed bot, 12 canonical-style seeds: 9 die in lap 0, the other 3 survive 21–22 laps, bosses dying in 2–5 turns at lap 20. Same on yesterday's `3331ceb` (17 laps), so it predates today: +60 % HP added per lap is linear, the deck/implants/stats compound.
- **Fixed**: `tuning.endless` `{ hpPct: 100, dmg: 3, compound: true }`: enemy HP doubles per lap (lap 0 unchanged). The three survivors now fall at lap 5 for both the mixed and the greedy bot (60 % compounding: laps 7–8). Setup text and `GAMEPLAY.md` say "doubles"; test that each lap adds more HP than the last.
- **Breadth**: greedy, 8 fresh seeds: laps 0, 0, 2, 3, 4, 5, 5, 6 (mean ~3). New achievement "Fifth Layer of Echo" (lap 5; 81 in all). English quick playthrough (8 nodes + screen tour) OK.

## 2026-11-04 — Sea UI run green; chronicle agendas get one AI line per chapter end (Claude Opus 5.5, same goal)

- **Integration**: `ui_playthrough.py --sea` after the day's changes: OK in 1670 s, Acts 1–6 → victory, 0 console errors; `--daily`: OK in 690 s, victory. Chapter-end screen checked at 390 px; its kicker now says "Chronicle chapter N complete" instead of "Loop complete".
- **Agenda line**: narrate kind `agenda` (`gm.py`: one person's one step, 1–2 sentences, never the next step; fallback = the authored stage line; client local line = the same). The chapter-end screen asks once for the last moved agenda and swaps in the model line with ✦ AI only when the model answers. Local `make gm-eval` (`gemma4:8b-64k`): `agenda_ko/en` usable 100 %, p50 0.5–0.7 s, faithful (one KO line swapped a posted note for a hologram). Browser with GM off: authored line stays, 0 console errors. Vertex not run.

## 2026-11-04 — Chronicle twist bank (Claude Opus 5.5, same goal)

- `content/chronicleTwists.ts` (1.0 `twist_bank`): Se-rin's double role, the grid's real purpose, who you are; three beats each (hint, doubt, reveal). A campaign draws two at its first chapter end (`drawTwists`, by run seed; all six ordered pairs come up) and reveals them under the chapter titles: 2 → A1, 3 → B1, 4 → A2, 5 → B2, 6 → both reveals (`twistBeats`, `run.beats`). Tests; browser: chapter 6 shows both reveals, 0 console errors.
- **Campaign loop**: clearing chapter 6 completes the campaign (`activeCampaign`); the next chronicle run is chapter 1 with nothing carried, and its clear starts a fresh record, agendas and twist draw. Chapters bank by the act played. Setup says "Complete · start a new campaign". Test.

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

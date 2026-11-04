# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — The Glass Library districts come back among the Dreaming Machines (Claude Opus 5.5, same goal)

- None of the four Act 4 district quests returned later. Act 5 now has `a5_cb_cut_names` (a scrapped machine wears the name you pasted back), `a5_cb_dream_shelf` (a projector plays the dream you kept with its blank last page), `a5_cb_index` (a machine reads the book you decoded), `a5_cb_miro` (a delivery machine brings your reading reservation with Miro's note); quest-stage gates, Codex art (unreviewed). 27 callbacks. Quests still not read by any later event: Act 6 ones (no later act) and Acts 1–3 ones that already return as flags in later districts.
- **Verified**: content + event-balance tests; UI on a Deep run (KO/EN, 1280×720 and 390×844) resolved through the buttons, 0 console errors.

## 2026-11-04 — The newest districts come back an act later (Claude Opus 5.5, same goal)

- `sea5_cb_container` (kept C-7 → Narae's family moved onto a barge "they can't tape"), `sea6_cb_rows` (named the figure in uniform → it guides you along the causeway's unwatched side), `a3_cb_meters` (stopped the meter → Gang offers to stop the Spire's camera circuit, INT DC 6); quest-stage gates, Codex art (unreviewed). 23 callbacks.
- **Verified**: content + event-balance tests; UI (Sea runs for the two Sea scenes, base run for Act 3; KO desktop, EN/KO 390 px) resolved through the buttons, 0 console errors.

## 2026-11-04 — The Meter Wall (second DLC 2 route district) (Claude Opus 5.5, same goal)

- `d2_outside_meters` (route `outside`): a turning power meter behind an off-list door flags the home for the Closing Crew. Learn tonight's meter (Misuk the slow-writing reader, Gang the electrician, or Se-rin), then stop it with Gang's bypass, a lifted "faulty" seal from Yeom's pawn window, or a knock (CHA) → boss **intel**. 3 personas, scene + 3 portraits by Codex (unreviewed). The route now places two like every act. 28 districts / 83 NPCs.
- **Verified**: route test (the route places both); UI two quest paths to stage 2 (1280×720, 390×844), 0 console errors; local Ollama 3/3 in character. Full Sea + Signal+ UI playthrough with all six Sea districts (before this change): victory, 40 district polls (was 20), no errors.

## 2026-11-04 — Second Sea districts for Acts 5 and 6 (Claude Opus 5.5, same goal)

- Every Sea act now places two, like the base acts. `d5_sea_drowned_rows` (a Residue figure in a soaked school uniform knocks on 404 every tide waiting to be called; find what the roster and a tide-touched man remember, then call it by the surname, "Seventeen", or a name Parang gives → **weaken**) and `d6_sea_cable_station` (one letter to the Lightkeeper keeps resending on relay 7; send it up the lens-room line Knot kept joined, or carry it yourself → **marked**). 5 personas, 2 scenes + 5 portraits by Codex (unreviewed). 27 districts / 80 NPCs.
- **Verified**: content + route + chronicle tests; UI to quest stage 2 (1280×720, 390×844), 0 console errors; local Ollama 5/5 in character (Ryu deflects a stranger, plausible). Full Sea UI playthrough with these two: see the entry above.

## 2026-11-04 — Container Alley (second Sea Act 4 district) + Signal+ measured (Claude Opus 5.5, same goal)

- `d4_sea_container_alley` (route `sea_4`): families live in the dry harbor's empty containers; Customs deregisters one by taping its doors. Learn tonight's door (Clerk Oh's register, Narae on the roof, or Mujin), then void the seal with a thirty-year-old objection form, move the family across the roofs, or knock (CHA) → boss **weaken**. 3 personas, scene + 3 portraits by Codex (unreviewed). 25 districts / 75 NPCs.
- **Signal+ measured** (`outputs/qa/crpg_ab.ts`, mixed bot, 150 seeds, every unlock), `65f66e5` (before today's districts) → HEAD: Deep 24.7 → 28.7 %, Sea 24.7 → 25.3 %. Runs ending in Acts 1–3 identical, so the change is Acts 4–6 only; within the ±6 % noise band. Not retuned.
- **Verified**: content + route tests; UI two quest paths to stage 2 (1280×720, 390×844), 0 console errors; local Ollama 3/3 in voice (Oh names C-7 correctly).

## 2026-11-04 — Do comes back in Act 3 (Claude Opus 5.5, same goal)

- `a3_cb_laundry` (hid the tags in the Night Laundry → Do, who quit the Crew mid-report, folds towels in the Spire laundry and hands you a kept name tag: −8 Trace/+3◈, or his patrol order, OBS DC 6, −12 Trace); Codex art. STATUS counts refreshed from `CONTENT`: 267 events / 20 callbacks / 24 districts / 72 NPCs / 24 quests.
- **Verified**: content + event-balance tests; UI KO 1280×720 and EN 390×844 resolved, 0 console errors.

## 2026-11-04 — Outside the List gets its Act 2 district (Claude Opus 5.5, same goal)

- Same gap as the Sea, older: taking the DLC 2 route at Act 2's start swaps in the route map, so Signal+ runs on it had no Act 2 district. `d2_outside_laundry` (route `outside`): the Closing Crew finds people by the name tags on their washed uniforms; learn it from Washer Yun or Do (a first-week Crew rookie), then hide the tags (pin them inward, AGI; pull Bae's rented shutter over the lines; or hand Do a basket to "lose") → boss **cover** (laundry carts as barricades). 3 personas, scene + 3 portraits by Codex (unreviewed). 24 districts / 72 NPCs.
- **Verified**: `districtRoute.test.ts` (taking the route places exactly this district); UI on the route, two quest paths to stage 2 (1280×720, 390×844), 0 console errors; local Ollama 3/3 in voice.

## 2026-11-04 — Sea district quests come back one act later (Claude Opus 5.5, same goal)

- `sea5_cb_clock` (got the crew's clock back → they hold the breakwater against the flood: −10 Trace/+3◈ or +10 HP + consumable) and `sea6_cb_barge` (returned the borrowed memory → the old woman's lit barge finds you under the causeway: +12 HP, or ride it past the Keepers, AGI DC 6, −12 Trace); quest-stage gates, Codex art (unreviewed; the first breakwater render put a cargo ship in a harbor no ship reaches, re-rendered).
- **Verified**: content + event-balance tests; UI on a Sea run (KO 1280×720, EN 390×844) resolved through the buttons, 0 console errors.

## 2026-11-04 — The Unwritten Sea gets districts (Claude Opus 5.5, same goal)

- Signal+ on the Sea lost its district layer after Act 3: `advanceAct` placed districts on the base map, then `takeRoute` replaced it with the Sea map. `DistrictDef.route` + `placeDistrict(…, route)` (passed explicitly: `run.route` still holds the previous act's route at that point) + `takeRoute` places its route's districts. Base maps never take route districts; Acts 1–3 identical on Sea and Deep (`districtRoute.test.ts`).
- Three Sea districts per the DLC 3 bible: `d4_sea_seizure_shed` (get the crew's seized shift clock back → boss **marked**), `d5_sea_barge_market` (return the drone's borrowed memory to the old woman on the last barge; Old Ong from Act 2 is there → **cover**), `d6_sea_foghorn_post` (sound the foghorn once in the beat from before the Lightkeeper → **intel**). Mujin / Parang / Seo-ha options; 9 personas; 3 scenes + 9 portraits by Codex (unreviewed). 23 districts / 69 NPCs.
- **Verified**: engine + content tests (440); UI on a Sea run, all three to quest stage 2 via buttons (desktop + 390 px), 0 console errors; local Ollama 8/9 in voice, Inspector No invented a seizure number → persona pinned to 412 / shift clock, rerun correct. Full Deep + Signal+ UI playthrough before this change: victory, six bosses, 28 district polls, no errors. Full Sea + Signal+ UI playthrough after it: victory in 24 min, 20 district polls, no errors.
- `GAMEPLAY.md` district line was stale (Acts 1–3, "one per act"): rewritten from the content.

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

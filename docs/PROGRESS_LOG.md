# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — Camp nights for the Sea companions (Claude Opus 5.5, same goal)

- Signal+ camp nights existed for the six original companions only (6 of 14). `content/crpg/camp_dialogues_sea.ts`: Mujin oils the crane hook he lowered his shift with and teaches you the crew's count ("no five"); Seo-ha draws the old harbor channels in the ash and pilots your finger through one; Parang wishes one thing inside were Parang's own and asks if the name counts. Two nodes each, small earned moments, no arc resolved; Parang takes no pronouns (three English lines fixed before commit). Their approval comes from today's Sea districts.
- **Verified**: crpg + content tests (camp rules: one per companion, speaks as them); UI from a Sea safehouse (KO 1280×720, EN/KO 390×844) through both nodes, approval and inspiration rose, 0 console errors.

## 2026-11-04 — Sea companion conflicts and IX contacts (Claude Opus 5.5, same goal)

- The base acts guarantee a gamble, a companion conflict, an IX contact and an uncanny event (`narrative.test.ts`), but the Sea's own pools had **no** companion conflict and no IX contact in Acts 4–5. `content/eventsSeaVariety.ts`: `sea4_cf_rations` (Mujin tears the seal on the crew's rations vs Seo-ha files the claim), `sea5_cf_borrowed` (Parang returns a borrowed first-words memory to the tide vs Seo-ha lets Parang keep it), `sea6_cf_beam` (Mujin cuts the line to show the sea vs Parang, who came out of that water), `sea4_ix_blank` and `sea5_ix_speaker` (IX: "this square was not left blank by mistake", "I erased this water for your sake; that promise still stands"). New test: every Sea act has a Sea-companion conflict, Acts 4–5 an IX contact. Codex art (conflict scenes re-rendered with the companions' portraits as reference so Mujin/Seo-ha/Parang match).
- **Verified**: content + event-balance tests; UI on Sea runs (KO/EN, desktop/390 px), the chosen side's companion gained the bond, 0 console errors. Sea canonical (150 seeds) HEAD → this: 28.7 → 26.7 %, within noise; not retuned.

## 2026-11-04 — Procedural events for the route maps (Claude Opus 5.5, same goal)

- `actEventPool` requires an exact route match, so the Unwritten Sea and Outside the List rolled **no** procedural events. Added `pc_sea_tag` (Sea 4: someone clutching a thing with a seizure tag), `pc_sea_wader` (Sea 5: someone wading with a stranger's birthday in their head), `pc_sea_watch` (Sea 6: a Keeper three days alone on watch), `pc_outside_shift` (DLC 2: one last job before the Crew arrives); Codex art (unreviewed). 12 procedural. Over 60 Sea seeds the three appear on maps 9/5/8 times (the per-run cap still applies).
- `gm_eval.py`: two cases for the new openings and `--only <text>` to run a slice. Local Ollama `--only procedural --reps 2`: 4/4 cases usable 100 %, p50 1.1 s; the new openings place the given person in the right scene in sensory terms.
- **Verified**: content + event-balance tests; UI on each route (KO/EN, desktop/390 px) resolved through the buttons, 0 console errors.

## 2026-11-04 — Achievements for the other district sets (Claude Opus 5.5, same goal)

- Only the Glass Library districts had a "finish one quest" achievement. Added `ach_machine_quest` (Dreaming Machines), `ach_record_quest` (First Record), `ach_sea_quest` (all nine Sea quests), `ach_outside_quest` (DLC 2 route); data only, existing `questDone` kind. 85 achievements (the pinned count test updated with the reason).
- **Verified**: new test that every listed quest is real and each achievement fires on its final stage and not before; Archive achievements tab shows all four in KO (1280×900) and EN (390×844), 0 console errors.

## 2026-11-04 — The Last-Bus Depot comes back; full runs with every district (Claude Opus 5.5, same goal)

- `a3_cb_bus` (got the last bus out → Driver Gwang now drives a Spire staff shuttle, the cancelled card still on the dashboard: ride it, −12 Trace/+6 HP, or hear all forty-one got home, +4◈/consumable); Codex art. 31 callbacks.
- **Verified**: content + event-balance tests; UI KO 1280×720 / EN 390×844 resolved, 0 console errors. Full UI playthroughs with all 34 districts in: Deep + Signal+ victory (21 min, 36 district polls), Sea + Signal+ victory (26 min, 40), no errors.

## 2026-11-04 — Third Outside the List district, The Last-Bus Depot (Claude Opus 5.5, same goal)

- `d2_outside_bus_depot` (route `outside`): the night bus that takes off-list workers home is scrapped tonight once the Crew recalls its route card. Find a card the system still accepts (Driver Gwang's cancelled-but-never-expired card, Tae-o checking the bus, or arguing the dispatch machine into "undetermined means allowed"), then get the bus out → boss **weaken**. 2 personas, scene + 2 portraits by Codex (unreviewed). The route now draws 2 of 3 (route test updated to "two route districts").
- **Verified**: content + route tests; UI two quest paths to stage 2 (1280×720, 390×844), 0 console errors; local Ollama: Gwang drifted into 반말 and then denied tonight was the last run, both fixed by stating them in the persona (LESSONS line added for the pattern).

## 2026-11-04 — The Crew Dormitory and the Gray Shallows come back (Claude Opus 5.5, same goal)

- `sea5_cb_dorm` (kept the dormitory → Cook Yeong's tide table on the breakwater post marks you passing: +12 HP, or move by the flood times, −12 Trace/+2◈) and `sea6_cb_shallows` (brought back the child's voice → it sings in the causeway fog and thins it: −12 Trace/+3◈ or +12 HP); Codex art (unreviewed). 30 callbacks.
- **Verified**: content + event-balance tests; UI on Sea runs (KO 1280×720, EN 390×844) resolved through the buttons, 0 console errors.

## 2026-11-04 — Third Sea Act 6 district, The Lens Workshop (Claude Opus 5.5, same goal)

- `d6_sea_lens_workshop` (route `sea_6`): old grinder Mok hid a hairline flaw in the Lightkeeper's new lens so the sea shows once a night; the apprentice machine Guseul found it and hasn't reported it. Find it (OBS, or Guseul persuaded / Seo-ha) and see it installed (logged as a "window", or hidden under polish, AGI) → boss **weaken**. 2 personas, scene + 2 portraits by Codex (unreviewed). Every Sea act now draws 2 of 3.
- **Verified**: content + route tests; UI two quest paths to stage 2 (1280×720; 390×844, rerun with high stats after the first run's OBS roll failed, which correctly left the stage-1 option locked), 0 console errors; local Ollama 2/2 in character.

## 2026-11-04 — Third Sea Act 5 district, The Gray Shallows (Claude Opus 5.5, same goal)

- `d5_sea_shallows` (route `sea_5`): at low tide memory-fishers wade into the gray shallows on ropes; a mother lost her child's voice to the last flood. Learn where it sank (Bong at the rope post, Ae-ri the fisher, the mother's photo, or Parang), then bring it back on Bong's rope, by Parang calling it, or by force (STR, costs HP) → boss **marked**. 2 personas, scene + 2 portraits by Codex (unreviewed). Sea Act 5 draws 2 of 3.
- **Verified**: content + route tests; UI two quest paths to stage 2 (1280×720, 390×844), 0 console errors; local Ollama 2/2 after pinning Bong's register (first reply drifted into dialect 반말).

## 2026-11-04 — Third Sea Act 4 district, The Crew Dormitory (Claude Opus 5.5, same goal)

- `d4_sea_dormitory` (route `sea_4`): Customs condemns the longshore dormitory at midnight as "housing for a non-operating port"; the oldest hand's daily tide table is legally the port's operating log. Prove it with the harbor act from Cook Yeong, thirty years of tables carried out by the night shift (Mujin wakes them), or a bluff (CHA) → boss **cover**. The foreman role stays with Mujin (bible), so the text names "the oldest hand", not "the foreman". 2 personas, scene + 2 portraits by Codex (unreviewed). Sea Act 4 now draws 2 of 3.
- **Verified**: content + route tests; UI two quest paths to stage 2 (1280×720, 390×844), 0 console errors; local Ollama 2/2 after pinning Yeong's register (first reply was 반말).

## 2026-11-04 — Third districts for Acts 5 and 6 (variety) (Claude Opus 5.5, same goal)

- Acts 1–4 draw 2 of 4 districts; Acts 5–6 had exactly 2, so they never changed between runs. `d5_crane_chapel` (a crane AI buries machines instead of crushing them; get tonight's next-in-line, a dreaming nursing robot, buried → **weaken**) and `d6_errata_office` (Oja exists only because of a typo listed for deletion; mark the line "stet" → **marked**). 6 personas, 2 scenes + 6 portraits by Codex (unreviewed; Oja re-rendered so the misprint outline shows). 30 districts / 89 NPCs. Over 40 seeds each pair of three now appears (Act 5 12/13/14, Act 6 16/16/8).
- `a6_cb_crane`: the nursing robot buried under the crane finished its dream and wakes in the first record (+14 HP, or +4◈/−6 Trace); Codex art. 28 callbacks.
- **Verified**: content + route + chronicle + event-balance tests; UI to quest stage 2 (1280×720, 390×844) and the callback resolved (KO/EN), 0 console errors; local Ollama 6/6 in character.

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

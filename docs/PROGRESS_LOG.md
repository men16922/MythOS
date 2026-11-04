# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — Four more Outside the List scenes (Claude Opus 5.5, same goal)

- The DLC 2 route rolled from 14 events against the base Act 2's 37, so its maps repeated sooner. Added `outside_ev_dumplings` (carry the last steamer to the shelter), `outside_ev_umbrellas` (return unclaimed umbrellas before the Crew collects them), `outside_ev_payphone` (one call before the line dies), `outside_ev_shoeshine` (learn the Crew's iron-soled boots); one prop each, Codex art (unreviewed). The payphone and shoeshine first drafts had a single open option and the payphone read as a tax: the content and event-balance guards caught both, fixed with a free option each. 18 route events.
- **Verified**: content + event-balance + outside tests; UI on the route (KO/EN, desktop/390 px) each resolved through a button, 0 console errors (the shoeshine's added third option is covered by the content tests only).

## 2026-11-04 — Owner fun check §16 for today's late content (Claude Opus 5.5, same goal)

- `docs/test/mythos2_fun_check.md` §16 (owner plain language, "정상 / 문제"): late-act and route districts, backgrounds in late districts, camp nights for all fourteen, Sea pairs' banter and duos, district callbacks, signed-out act intros naming the place; one verdict-table row. No code.

## 2026-11-04 — Duos between two Sea companions (Claude Opus 5.5, same goal)

- 15 duos, none pairing two Sea companions. `sea_tide_shift` (Seo-ha + Mujin: push 1 with +2 bumps, 6 block, move again), `sea_no_fifth` (Mujin + Parang: 4 to all, Mark 2, 5 block), `sea_returned_voices` (Parang + Seo-ha: recall 2, draw 2, Evade 1); same power band as the existing Sea duos, existing effect kinds only. Cut-in art by Codex with both portraits as references (first render put ships in the harbor; re-rendered). 18 duos (pinned count updated with the reason).
- **Verified**: `duos.test.ts`: each is on offer with its two companions at a full gauge and fires on the real content; art coverage test. Sea canonical (150 seeds) unchanged at 26.7 %: the bot never fields two Sea companions together with a full gauge, so the sim says nothing about these. **UI (follow-up)**: the combat sandbox gained `?party=a,b` (dev-only, replaces the whole party); with `&momentum=100` each Sea pair's duo button appeared, fired, and played its cut-in (art, name, both lines), 0 console errors.

## 2026-11-04 — Map banter for the Sea pairs and the DLC companions (Claude Opus 5.5, same goal)

- Signal+ map banter had 24 exchanges; the eight later companions appeared only once each (all with Se-rin), and no two Sea companions had any, though a Sea party is often two of them. Added eight: Mujin + Seo-ha (tide time with no water), Parang + Mujin (can Parang be "four"), Seo-ha + Parang (the old channel), Io + Miro (return cards), Bel + Io ("stet"), Rem + Kai (dreaming to the end), Doyun + Tae-o (counting who is left), Miro + Doyun (names). Voices per the companion files.
- **Verified**: `banterPick.test.ts` (speakers, 2–4 lines, ≤ 60 chars); UI on the map (Sea Act 4 Mujin + Seo-ha KO, Deep Act 5 Rem + Kai EN 390 px) showed the exchange, 0 console errors.

## 2026-11-04 — Signed-out act intros name the place in Acts 4–6 (Claude Opus 5.5, same goal)

- With no AI (signed out, AI off, failure) Acts 4–6 of both the Deep Signal and the Sea shared three generic lines ("the signal goes one layer deeper"), against the register rule. `localGm.ts` now has three concrete lines per place (Glass Library shelves, the scrap graveyard, the sentence-tiled first record; the dry harbor, the tide line, the foghorn causeway), keyed by route then act; generic lines stay for later Endless laps. `ActIntro` passes `run.route` (the server GM sees it as one more context line).
- Follow-up: Outside the List's signed-out intro used Act 2's Data Spire lines (cameras, glass railings); it now has back-alley lines (the serving line, the Crew's beacon, a laundry cart).
- **Verified**: `localGm.test.ts` cases (six places distinct, none says "signal"; the DLC 2 route never says Spire); UI with the server GM off: Sea Act 5 (KO), Deep Act 6 (EN), and the DLC 2 route reached through Closing Time (KO/EN) showed their place lines, 0 console errors.

## 2026-11-04 — Codex lore for the Sea and Outside the List (Claude Opus 5.5, same goal)

- The route maps roll only their own events, and none of those awarded a codex entry, so the Archive's codex had nothing from either route. `content/packs/route_lore.ts`: the unnumbered square, Customs Enforcement, the gray tide, the Keepers (in the DLC 3 bible's reveal order; what the Lightkeeper promised IX stays for the ending), off the list, the Closing Crew. Each awarded by one route event's rewarding outcome, hint prefixed "Codex ·" like the base events. 41 lore (the "restore every entry" achievement now needs these too).
- **Verified**: content + event-balance + achievements tests; UI: each of the six events played on its route (KO/EN, desktop/390 px), the run's codex gained the entry, 0 console errors.

## 2026-11-04 — DLC companions can earn approval (camp nights reachable) (Claude Opus 5.5, same goal)

- Approval only counts for deployed companions, and Miro, Doyun, Bel and Rem had just 2–4 positive approval sources across all districts, so their new camp nights (approval 2) were close to unreachable. Sixteen existing options now react for them by who they are: Miro likes names remembered (pasting a name back, calling the uniformed figure by its surname, "stet"), Doyun likes nobody left behind and dislikes calling someone "Seventeen", Bel likes sentences left standing (rewriting the struck street, "stet"), Rem likes dreams allowed to finish (+2 for waking the Cold Storage machine slowly, −1 for waking it at once). Positive sources now 6–7 each.
- **Verified**: content + crpg tests; UI: Rem and Miro deployed through the Cold Storage's slow-waking path → Rem approval 2 (the camp threshold), 0 console errors.

## 2026-11-04 — Backgrounds matter after Act 3 (Claude Opus 5.5, same goal)

- Signal+ backgrounds (enforcer, broker, medic, runner) had options only in the Acts 1–4 districts; the 20 districts from the Glass Library's last two onward (Acts 4–6, the Sea, Outside the List) had none. Each now has one background option, five per background, placed on the person it fits (the enforcer cites procedure to inspectors, the broker rebalances ledgers, the medic treats Dal's ear or Hui's breathing, the runner reads courier marks and routes); most are a no-roll shortcut to the quest's first stage or the flag the district already uses.
- **Verified**: content + crpg tests; UI with each background on one district (medic Scrap Choir, enforcer Seizure Shed, broker Crane Chapel, runner Bus Depot) through the new option to quest stage 2, 0 console errors. Balance: the simulator plays Signal+ without a background, so these never fire there; with a background, unmeasured.

## 2026-11-04 — Camp nights for the five DLC companions (every companion now has one) (Claude Opus 5.5, same goal)

- `content/crpg/camp_dialogues_more.ts`: Io tapes the folds of your map and offers a glass bookmark; Miro practises your name and asks you to say Miro's before you turn away; Doyun counts heads round the fire and asks to be called by name, not number; Bel's finger keeps finding a line to cut in your notes and reads one to the end instead; Rem, who never slept, asks how. Voices per `packs/new_companions/companions.ts`; pronouns per existing content (Io "her" fixed before commit). New test: every companion has a camp night (14/14).
- **Verified**: crpg + content tests; UI from a Deep safehouse for all five (KO/EN, desktop/390 px) through both nodes, approval and inspiration rose, 0 console errors.

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

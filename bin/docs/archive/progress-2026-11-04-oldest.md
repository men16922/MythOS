# Progress log archive (moved 2026-11-04 to keep `docs/PROGRESS_LOG.md` in budget)

## 2026-11-04 — Four more night-market scenes for Act 2 (Claude Opus 5.5, same goal)

- Act 2 rolled from 37 against Act 3's 51. `a2_debt_tattoo` (debts tattooed on a child's arm, one line per payment), `a2_fortune_machine` (it prints before you pay: "you stood here last time too"), `a2_silence_tea` (tea paid for with an hour of silence, where IX can't hear), `a2_rat_post` (rats carrying mail for the unlisted); Codex art (unreviewed).
- **Verified**: content + event-balance tests; UI (KO/EN, desktop/390 px) each resolved, 0 console errors. Fresh canonical (450) HEAD → this: 39.3 → 40.2 %, within noise.

## 2026-11-04 — Outside the List to 30 scenes (Claude Opus 5.5, same goal)

- `outside_ev_water_tank` (the one full tank on a roof over a block without water), `outside_ev_newspapers` (tomorrow's obituaries leave the off-list dead out), `outside_ev_florist` (a bouquet for a recipient who was erased), `outside_ev_radio` (a guardhouse radio leaking the Crew's patrol order); Codex art (unreviewed). While applying, a zsh pipe+heredoc re-ran the previous batch's script and duplicated four events; the content id test caught it and the duplicate block was removed before commit.
- **Verified**: content + event-balance + outside tests; UI on the route (KO/EN, desktop/390 px), 0 console errors.

## 2026-11-04 — A second personal scene for each DLC companion (Claude Opus 5.5, same goal)

- `cx_io_bookmark` (a reader who never came back; finish the book by proxy or leave the marker), `cx_miro_reflection` (the window that reflects everyone but Miro), `cx_doyun_old_tag` (Doyun's old queue number on a lost-and-found board), `cx_bel_pen` (Bel offers the leaking red pen: cut one line you choose, or break it), `cx_rem_yawn` (Rem's first yawn). Small and earned, no arc resolved; Codex art drawn from each recruit portrait (unreviewed).
- **Verified**: content + event-balance tests; UI with each companion deployed (KO/EN, desktop/390 px) resolved, bond +1, 0 console errors. Daily-mode full UI playthrough afterwards (the new Act 1–2 events feed it): victory in 12 min, no errors.

## 2026-11-04 — Companion-only options for the DLC and Sea companions (Claude Opus 5.5, same goal)

- Io, Miro, Doyun, Bel and Rem had one personal event each and no companion-only option anywhere; Mujin, Seo-ha and Parang had none either. Sixteen options added to fitting existing events (two each; Rem in the two Act 5 quiet scenes, the Sea trio in Sea scenes), each a small reward plus a bond for that companion (the content rule: a gated bond only bonds the gating companion). Insert indentation fixed before commit.
- **Verified**: content + event-balance tests; UI with the companion deployed (Io reading lamp KO, Rem tin garden EN 390 px, Mujin salt stars KO, Doyun dumplings EN) showed and resolved the option, bond +1, 0 console errors. Deep and Sea canonical identical before/after (32.0 %, 26.7 %).

## 2026-11-04 — Four more Outside the List scenes (26), full English run (Claude Opus 5.5, same goal)

- `outside_ev_cat` (the cat the Crew don't count), `outside_ev_bathhouse` (the boiler kept on for workers off the list), `outside_ev_seal` (name seals stamped where the registration number should go), `outside_ev_vending` (a machine that serves anyone who knows the knock); Codex art (unreviewed). One hint ran over the length limit and was shortened. 26 route events.
- **Verified**: content + event-balance + outside tests; UI on the route (KO/EN, desktop/390 px), 0 console errors. Full **English** Deep + Signal+ UI playthrough with everything up to the previous commit: victory in 23 min, 40 district and 97 dialogue polls, no errors.

## 2026-11-04 — A quiet moment per Sea act (Claude Opus 5.5, same goal)

- Each Deep act has one or two "quiet wonder" scenes; the Sea had none among ~30 heavy ones. `sea4_salt_stars` (crew kids call the salt crystals on the dry floor stars), `sea5_paper_lanterns` (lanterns with erased names turning just short of the gray water), `sea6_fog_bow` (a colourless fog-bow; for a moment nobody blows the foghorn). Small, on land, the water kept at a distance per the bible; Codex art (unreviewed).
- **Verified**: content + event-balance tests; UI on Sea runs (KO/EN, desktop/390 px), 0 console errors. Sea canonical (150 seeds) HEAD → this: 27.3 → 26.7 %, within noise.

## 2026-11-04 — Four more base consumables (Claude Opus 5.5, same goal)

- 12 consumables (4 Sea-only) for every event, district and camp that hands one out. Added `grapple_line` (pull the first target in a line 2 tiles, +2 bumps), `marker_flare` (cross Mark 2), `guard_foam` (an ally gains 10 block), `static_net` (cross Stun 1, rare); existing effect kinds and targets only; Codex icons (unreviewed). 16 consumables.
- **Verified**: new `consumablesBase.test.ts` on real content (mark/stun land in the cross, foam gives 10 block, the grapple pulls a real enemy closer on a real board; an early version passed vacuously and was fixed); content/art tests; UI: combat sandbox gained `?items=` (dev-only), the three icons sat in the item slots and arming one highlighted its targets, 0 console errors.
- **Balance, measured honestly**: fresh canonical (450) HEAD 44.7 %; with all four at first rarities 40.7 %, at the lower rarities kept (three uncommon, Static Net rare) 39.3 %; any one alone 42.0–43.1 %. Every run is inside the ±6 % band and no item stands out, but the sign is consistently down: the bot only uses an item for a clear evaluated gain, so status-only items mostly sit in its 3 slots (`combatSim.evaluate`: a stun pays through cancelled incoming damage and block only under threat, but Mark is worth 0.5 a stack, so the Marker Flare almost never clears the bot's +6 bar). **Owner call**: keep (human players use utility items; the bot can't), or hold them back.

## 2026-11-04 — Three more scenes each for the Glass Library and the First Record (Claude Opus 5.5, same goal)

- Deep Acts 4 and 6 rolled from the smallest late pools (28). Act 4: `a4_reading_lamp` (one lamp, a line of readers), `a4_footnote_stairs` (stairs of footnotes, some about you), `a4_return_letters` (letters whose recipients were erased). Act 6: `a6_type_tray` (the type for your initial is missing), `a6_name_index` (the index has no room for your name), `a6_unused_drafts` (drafts of the city, one with an extra southern square, a quiet nod to the Sea). Codex art (unreviewed).
- **Verified**: content + event-balance tests; UI on Deep runs (KO/EN, desktop/390 px) each resolved, 0 console errors. Deep canonical (150 seeds) HEAD → this: 30.0 → 29.3 %, within noise.

## 2026-11-04 — Four more Act 1 scenes (Claude Opus 5.5, same goal)

- Act 1 is played every run but rolled from the smallest base pool (26). Added `a1_curfew_siren` (a broken curfew siren keeping the block awake), `a1_rain_buckets` (kids catching rain for a block whose water was cut), `a1_dead_elevator` (three neighbours stuck between floors in a blackout), `a1_pawned_medal` (an old man's war medal on its last pawn day); 2–3 open options each, Codex art (unreviewed). 30 in the Act 1 pool.
- **Verified**: content + event-balance tests; UI (KO/EN, desktop/390 px) each resolved through a button, 0 console errors. Fresh canonical (3 × 150, same seeds) HEAD → this: 43.6 → 44.7 %, within noise; not retuned.

## 2026-11-04 — Four more Outside the List scenes (Claude Opus 5.5, same goal)

- The DLC 2 route rolled from 14 events against the base Act 2's 37, so its maps repeated sooner. Added `outside_ev_dumplings` (carry the last steamer to the shelter), `outside_ev_umbrellas` (return unclaimed umbrellas before the Crew collects them), `outside_ev_payphone` (one call before the line dies), `outside_ev_shoeshine` (learn the Crew's iron-soled boots); one prop each, Codex art (unreviewed). The payphone and shoeshine first drafts had a single open option and the payphone read as a tax: the content and event-balance guards caught both, fixed with a free option each. 22 route events after a second batch: `outside_ev_keys` (copies of the old home's keys for a family moving out), `outside_ev_bakery` (the last dough before the Crew comes), `outside_ev_bike` (a courier's slipped chain and an old lady's medicine), `outside_ev_karaoke` (one booth finishing its last song before the broadcast); all four played through in the UI (KO/EN, desktop/390 px), 0 console errors.
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

## 2026-11-04 — Road recruits marked on the map; card plays per line-up measured (Claude Opus 5.5, owner goal: 잔여 작업 자율 수행, 콘텐츠 추가·검증)

- **Acts 2–3 in the real UI** (open since 11-03): `ui_playthrough.py` full run, assist mode, OK in 790 s → victory (`ending_noble_sacrifice`), Act 2 elite + Act 3 boss, 0 console errors.
- **Line-up measurement** (reverse-engineering item 2): `FightTelemetry` now carries `party` and `plays` (cards and consumables by id; `autoPlay(…, plays)`), run-neutral (canonical blocks reproduce 187/450, 41/150, 40/150). Findings: the starter `packet_shot` is 22.7 % of all plays (34 % in Act 1, still 8–16 % in Acts 3–6); companion cards are 12 % of plays in Act 1 and 15–21 % after; top-8 card overlap between line-ups is low (Jaccard 0.33–0.45), so line-ups do change what gets played. Scripts: `outputs/qa/lineup_plays.ts`, `lp_report.py` (gitignored).
- **Found**: only 22 % (Deep) / 17 % (Sea) of Act 4–6 fights had three companions although the slot opens at Act 4. The bot takes every recruit it meets (scores 14–18 vs ≤ 4 declining); the scene sits on a hidden `?` node, so ~25 of 150 Deep runs ever met one. Roll weight 5 → 15 only reached 33 %.
- **Built**: `roadRecruitAt` (engine, shares one validity check with `resolveEventId`); the map marks that node with a small gold person badge (who waits stays hidden) and a tooltip line with the +8 Trace cost; the bot routes there when someone would fill a slot now or the next act's slot (`companionWorth`). Deep 27.3 → 30.0 %, Sea 26.7 → 30.7 % (within ±4 noise at n = 150, not re-tuned), three-companion Act 4–6 fights 22 → 61 % / 17 → 47 %; fresh unchanged.
- **Verified**: `make check` (node 530, Python 338), `make test-e2e-v2`, `make playthrough-quick`; marker in headless muted Chromium at 1280×720 (ko) and 390×844 (en), badge on the octagon corner, tooltip line shown, 0 console errors (`outputs/qa/recruit_marker/`). Unverified: how the marker reads to a human, and a natural Deep run reaching a marked node in the real UI (set up through the dev hook).

## 2026-11-03 — Bot takes companions, Acts 2–3 re-tuned; reverse-engineering 1–3 analysed (Claude Opus 5.5, owner: 다음 작업 수행)

- **Analysis**: Across the Obelisk, Cobalt Core, Tactical Breach Wizards (`docs/plans/2026-11-03-reverse-engineering-1-3.md`): level-3/5 choice of two, line-up measurement, undo for actions that reveal nothing. Built nothing; prototypes wait for the owner.
- **Found by the line-up measurement**: the bot valued a companion at 10 and the Act 2 go-alone bundle at ~16, so it always went alone; 114/148 Deep runs reaching Act 4 had one companion. Party and growth numbers since 11-01 measured a solo crew. Bot: 20 with a free slot, 6 for a bench seat (`runSim.ts`, regression test). Fix alone: fresh 39.1 → 50.4 %, Deep 26.0 → 30.0 %.
- **Re-tune** (`tuning.acts`): Act 2 HP +22 → +30 %, Act 3 HP +46 → +56 %, dmg +3 → +4, boss HP −30 → −36 %. Canonical mixed: fresh 187/450 = 41.6 %, Deep 41/150 = 27.3 %, Sea 26.7 % (was 22.0; fix alone 27.3), bosses at most 9.1 turns. `event-balance.test.ts` jackpot cap now ignores recruits (a companion is a party decision, every other payout still counts).
- **Verified**: `make check` (node 529, Python 338), `make test-e2e-v2`, `make playthrough-quick` (Act 1 only). Production clean after `00173-mab` (0 errors, no real players yet). Unverified: Acts 2–3 in the real UI, feel of the harder middle, card overlap by line-up (the sim does not log plays). A daily started before a deploy of this and submitted after should replay under the new numbers and lose its shield (inferred, not tested; ranking unchanged).

## 2026-11-02 — DLC 3 + bot re-tune deployed to production (Claude Opus 5.5, owner: 프리뷰랑 운영 둘다 배포)

- `make frontend-build` reproduced the committed bundle (no diff). `make deploy-preview` → `00173-mab`; `make verify-preview` 5/5 (`git-sha=8973143` = HEAD, postgres store, Gemini GM, google sign-in, `app.js` match); the DLC 3 content chunk (`assets/fonts.js`) hash also matches; `make url-smoke` on the preview: sandbox win, run flow, 0 errors.
- Promoted with `update-traffic --to-latest` (100 % `00173-mab`, rollback `00171-yuj`). Production: health ok, `app.js` + content chunk hashes = committed, `url-smoke` pass, 0 errors.
- Unverified: fun, tide/rewind feel and late-game fairness (human play), real-player logs after the promotion.

## 2026-11-01 — DLC 3 The Unwritten Sea built (Claude Opus 5.5, Astra drafts, owner: DLC 3 at AA volume)

- **Built** on `main`, not deployed. Plan `docs/plans/2026-11-01-dlc3-plan.md`, setting `docs/plans/2026-11-01-dlc3-bible.md`. Third depth, parallel Acts 4–6: 61 fights (28 with tide), 55 enemies (10 bosses), 75 events, 45 cards, 13 implants, 20 gear, 4 consumables, 3 companions, Navigator, 7 endings, 3 duos, 12 achievements.
- **New rules**: tide (`engine/tide.ts`), squad tactics in every depth (`engine/squad.ts`, 12), rewind (Navigator, `rewindTurn`), residue (a word next run, no power), three logs to the secret boss.
- **Art**: 468 Codex images, DLC 2's borrowed art replaced, gear icons in the UI. Every image reviewed on contact sheets. 17 boss and cut-in images and 38 others redone: gray studio backdrops, companions off-model (Seo-ha drawn young), Act 4 scenes showing a sea the act says is gone.
- **Caught by measuring**: sea implants, gear and consumables leaked into standard pools (fresh 39.1 → 36.9 %, hash changed): route-gated, hash back to `e5d0dd7da7d4`, leak test added. An early `tsc` call checked nothing, so one draft's syntax error slipped to the test step: `tsc -b` is the real check. Committed once with a doc-budget failure: fixed next commit.
- **Act 6 of the sea**: a road boss rolled at random meant some runs never met the Lightkeeper the endings speak to. Foghorn or Lens Saint now leads straight into the Lightkeeper (half HP back), then the secret fight.
- **Balance** (canonical, mixed): fresh 176/450 = 39.1 % (unchanged), once-won 39.3 %, route forced 41.1 %, Deep 26.0 %, Sea 33/150 = 22.0 %. Bosses average at most 8.5 turns per act; Commissioner Gong alone 9.4. Late enemy damage is high (`tuning` Act 6 +17, Sea +12): only a human can say if it feels fair.
- **Verified**: `make check`, `make test-e2e-v2`, `make playthrough-quick`; on final engine and content code a full sea run through the real UI as the Navigator with all three logs, into the secret fight and to an ending (assist mode); rewind in the real UI after a move (a card rewind in the engine test); the hidden ending chosen in the real UI. Unverified: fun, tide and rewind feel, music (reuses old tracks, Lyria bills Vertex), production.

## 2026-11-01 — Bot plays gear and growth like a person, re-tune (Claude Opus 5.5, owner: 작업 완료시까지 수행)

- **Bot**: trains deployed companions, buys gear, swaps weaker pieces, fills the third slot from Act 4. Same seeds: fresh 41.8 → 36.4 %, Deep 32.7 → 39.3 %. The old numbers understated the late game.
- **Tuning**: acts 4–6 raised (`hpPct` 130 / 190 / 240, `dmg` 9 / 14 / 17), new per-act `bossHpPct` (3: −30, 5: −20, 6: −70). Fresh 176/450 = 39.1 %, once-won 39.3 %, route forced 41.1 %, Deep 38/150 = 25.3 %. Bosses at most 8.8 turns in Deep, 8.4 in standard.
- **Real UI**: gear on reward and shop, buying, Act 4 four-person fight at desktop and 390 px, 0 errors. Phone squad strip clipped the fourth person: fixed.
- **Verified**: `make check` (node 517, Python 338), `make test-e2e-v2`, `make playthrough-quick`. Unverified: human feel of the new numbers.

## 2026-11-01 — Promoted `00171-yuj`, next steps planned (Claude Opus 5.5, owner: deploy to production)

- **Deployed** on owner order: preview `00171-yuj` (`de62fd1`) verified 5/5, promoted with `--to-revisions`; 100 %, label and bundle `ed531b3557d3` match; rollback `00169-fih`.
- **`url-smoke` fixed**: a collected reward stays as a disabled "Taken" button, which also matches `Take`, so the blind clicker pressed it forever on a won fight. Enabled buttons only now. Preview after the fix: 10 runs, 9 defeats and 1 win, all reached their end.
- **Production timeout**: `url-smoke` run flow timed out once after the fix. Then 9 production runs (8 ended, 1 still a playable fight on turn 13, the blind clicker missing the last enemy), then `url-smoke` 4/4, 0 console errors, no post-fight stall. Budget now 480 s and a timeout prints the last screen. The timed-out run left no record, so the cause is inferred. Bot still never trains.
- **Plan**: `docs/plans/2026-11-01-next-steps-plan.md`, with five reverse-engineering candidates. Deep and boss re-tune not started.

## 2026-11-01 — Party and growth rework done (Claude Opus 5.5, owner requests)

- **Built** (not deployed), plan `docs/plans/2026-11-01-party-growth-plan.md`: companion stats and levels 1–5 (deployed wins or 1 growth; HP, top two stats, direct damage at 3 and 5, opening block at 3, Momentum at 5), stat cards read their player's stats, three companions from Act 4 (`partySlots`, the bench fills the slot), gear (20 pieces, weapon + armor per person, run inventory, elites / bosses / shops), a new party screen that holds all of it.
- **Bug caught by a test**: opening block from level and gear was wiped as turn 1 began; now granted there.
- **Balance** (canonical, mixed): everything together read 282 / 450 = 62.7 %, Deep 74.7 %. Companion damage moved from stats to level, weapons cut, then enemies raised (`tuning.acts` 2: +22 % HP +1 dmg, 3: +46 % +3, 4: +105 % +7, 5: +150 % +10, 6: +190 % +13; route +8 % HP). Final: fresh 188 / 450 = 41.8 %, once-won declining 186, route forced 173 = 38.4 %, Deep 49 / 150 = 32.7 % (was 27.3 %, target 20–30). Avg turns: normal 3.6–4.7, boss 8.0–10.0; Act 3 (9.7) and Act 6 (10.0) bosses run past the 9-turn line.
- **Verified**: `make check` (node 515, Python 338), `make test-e2e-v2`, `make playthrough-quick`, party screen in the real UI at desktop and 390 px (grow, equip, train, 0 console errors). Unverified: fun, how a human uses gear and Train (the bot only auto-equips and never trains), gear rows on the real reward and shop screens, Act 4 with three companions in the real UI, production. Gear has no art yet.

## 2026-11-01 — Stats run to 20 (Claude Opus 5.5, owner: stat impact too low, cap 10 → 20, more stat cards)

- **Built** (not deployed): `STAT_MAX` 20, steps above 10 for every perk, traits at 10 / 15 / 20 with no menu (`statPerks.ts`), an act pays 2 growth, 10 stat cards with art (CHA had none). Old steps below 10 stand.
- **Balance**: unchecked it read 253 / 450 = 56.2 %. Act 2 / 3 enemy HP +10 / +22 % (`tuning.acts`), Act 1 untouched. Fresh 189 / 450 = 42.0 %, once-won declining 196, route forced 219 = 48.7 %.
- **Open**: Deep Signal mixed reads 85 / 150 = 56.7 % (was 27.3 %). Left for the final balance pass after levels, three companions and gear. Do not deploy before it.

## 2026-11-01 — Overcharge, Han rework, Bloodhound Rush moves (Claude Opus 5.5, owner requests)

- **Overcharge**: `surplus_capacitor` (half the leftover energy, at most 2, into the next turn), `bank_power` (all of it, once), `discharge` (spends the rest for damage), a small "next turn +N" under the orb. Art by Codex image.
- **Han**: Backdoor 2 → 1 cost and Mark 2 on each enemy turned, upgrade drops Exhaust; System Intrusion Mark 3 → 2.
- **Bug**: Bloodhound Rush said it charged and never moved. New `dash` effect stops beside the target or before a pit. It was the only such card.
- **Balance** (canonical 3 × 150, mixed): fresh 190 / 450 = 42.2 %, once-won declining 186 / 450, route forced 198 / 450. The new cards reshuffle the pool, so these replace the earlier 200 / 209 / 220.

## 2026-11-01 — DLC 2 rebuilt as a parallel Act 2 (Claude Opus 5.5, owner: "DLC 치고는 볼륨이 너무 작은데" → parallel act)

- **Why**: the route shipped as 3 fights, 3 events, 0 new enemies, and its "3 fights" claim was false: over 450 Act 2 maps / 2,553 paths the route gave 0 fights on 10 %, 1 on 35.5 %, 2 on 39.6 %, 3+ on 14.9 %; 5.8 % of maps had no fight on any path and still played the sad ending. Browser QA had only walked a path holding all three. Production `00169-fih` still shows this until the next deploy.
- **Built** (not deployed): `run.route` keeps `run.act` 2 and deals the map from the route's content. Closing Time now comes before Act 2's title. Pack `content/packs/outside_list/`: 12 enemies, 14 fights (3 Relay, 2 escorts, 1 hold, 2 streets, 1 event, 3 elites, 2 bosses), 12 events (Astra, reviewed), 12 cards that join the pool when the route is taken. New rule: an escort citizen walks after the enemy phase, the Relay with it (`EncounterDef.walkTo`). `ally` cards can opt into citizens. Art is borrowed; `art.test.ts` filters `route` content until the owner has played the rule.
- **Freeze bug** (owner: "체감이 없는데"): enemies decayed Freeze before their move step, so Freeze 1 stopped no move: 265 / 360 enemies changed tile with or without it. Now 0 / 360. Decay moved after the telegraph.
- **Balance** (canonical 3 × 150, mixed): fresh 200 / 450, digest identical to `e50d6fa`. Once-won declining 209 / 450. Once-won route forced 233 → 220 / 450 after HP +10–15 %, main hits +1, two bonuses dropped, holds +1 turn; Act 2 cleared 315 vs 299 declining. Bots do not push into the Relay, so human numbers are unknown. Deep Signal not re-measured after the Freeze fix.
- **Verified**: `make check`, `make test-e2e-v2`, `make playthrough-quick` all 0; route through the real UI from Act 1 to Act 3, 0 console errors; all 14 fights opened at 390 px, 0 errors. Unverified: fun, sound, production.

## 2026-11-01 — Production promoted to `00169-fih` (Claude Opus 5.5, owner: deploy)

- `00169-fih` (`git-sha=e50d6fa`, Stage 1 + DLC 2) at 100 % pinned, rollback `00167-yuh`. Owner ordered it before the play verdict; that verdict, F1–F4 and art stay open. `make verify-preview` 5/5; `make url-smoke` on the preview and on production: sandbox fight won, run flow to the end, 0 console errors, anonymous and muted.
- Unverified on production: the Act 2 route itself (needs a won profile), Google sign-in, sound.

## 2026-11-01 — Relay reads true and can be reached (Claude Opus 5.5, owner: carry out the recommendation)

- **Why**: merged plan Stage 3 item 3 (telegraph link, per-target preview, small-screen explanation) was reported done by omission. It was not, and the gap matched the rule's own discard condition, "misreads the real receiver".
- **Fixed** (not deployed): the board kept showing the danger on the citizen and showed nothing on an enemy stand-in; aimed-card and move previews ignored the relay; a sweep over both tiles counted once. New pure `board/marks.ts` `boardAfter`, `expectedLoss`, `relayHit`, shared by board and panel. "대신 맞음 -N" chip, link lights up while carrying a hit, move chip on the relay. The rule explanation lasted 1.9 s: now a persistent one-line note above the sprites.
- **Layout**: `outside_serving` and `outside_door` could not be walked to by turn 2 in 150/150 starts. Covers moved: serving (3,3) → (4,3), door (3,1) → (4,1). Now serving walk by T2 150/150, pickup walk T1 150/150, door push set up T1 150/150, guarded by `outside.test.ts`. No stat changes.
- **Rule fix**: a debuff riding on an enemy attack stayed on the citizen while the hit moved (burn 4 per phase on the door fight, read at first as burning ground). It now follows the hit to the stand-in (`effectTargets`). Burning ground under the citizen stays: 2 in that trace, a tile effect, visible, not in the forecast.
- **Balance** (canonical): fresh 200 / 450, unchanged. Once-won, bot declines the route: 210 / 450, unchanged. Once-won, route forced: 204 / 450 (was 209 before these fixes), bot reaches it in 68 runs, 1.03 citizens saved. No claim about fun from these.
- **Verified**: `marks.test.ts` incl. forecast equals direct hits through a real enemy phase on all three fights, `proto.test.ts` rider test; `make check` (node 485, Python 338), `make test-e2e-v2`, `make playthrough-quick`. Real UI with real art, muted, 0 page errors: walk onto the relay (hover and standing both -9); on `outside_door` a real Shoulder Check pushes the drone onto the tile, preview shows the stand-in and clears the citizen, playing it and ending the turn: drone 14 → 3 (9 direct + 2 burn), citizen 16 → 14 (ground only). 390 px legible with placeholder art.
- **Limits**: `proto_relay` stays boxed in, so test `enc=outside_serving`. A push rider on a hit aimed at the citizen still moves the citizen. Fun unverified.

## 2026-10-31 — DLC 2 "Outside the List" built on the default rule (Claude Opus 5.5, owner: carry out the recommendation)

- **Built** (not deployed): Relay is a real rule (`EncounterDef.relay`, line + dashed tile, danger moves to the stand-in). After the first escape an Act 2 event node becomes Closing Time; entering swaps the next three plain fights for `outside_serving`, `outside_pickup`, `outside_door`; the last safehouse becomes One Bowl (nobody lost) or The Closed Counter, same pay. 3 Codex stills, no new enemies or cards. Companion whispers no longer offer Improvise on scenes that forbid it. Off dailies.
- **Balance** (canonical 3 × 150, mixed): fresh profile 200 / 450, unchanged. Rolling the scene instead read 208 with nothing else changed, so it is placed, never rolled. A once-won profile entering by force 209, declining 210; only 68 / 450 forced runs reached it, the bot cannot push enemies onto the tile, so this says nothing about fun.
- **Verified**: engine tests for the flow, opening, dailies; the whole route in the real UI, muted, 0 console errors: Closing Time → `outside_serving` → `outside_pickup` → `outside_door` → plain fights → One Bowl (nobody lost) and The Closed Counter (one lost), on separate runs. The test set the map nodes, profile and act through the dev hook, kept the bot alive and wore foes down, and a second pass on an untouched map from Act 1 (only the profile, HP and foe HP helped) found a real bug: `placeDistrict` ran after the placement and erased the scene on runs with districts. Fixed by order, guarded by a 40-seed test, then that natural pass reached Closing Time → `outside_serving` → The Closed Counter → map, 0 console errors; the whisper shows on Closing Time and not on the closing scene. Unverified: tone, fun, the owner's verdict.

## 2026-10-31 — DLC 2 proposals merged, Stage 1 built (Claude Opus 5.5, owner: "결과 나오면 추천안대로 알아서 수행해")

- **Plan**: `docs/plans/2026-10-31-dlc2-merged-plan.md`, from three overnight proposals. Claims checked first: Argon's "Act 5 parts stuck" is false (Act 6 has rest nodes) and "47 encounters" is 51; the rest held. Claude's lane read `argon.md`, so their overlap is not independent confirmation.
- **Built** (not deployed): `spendGauge` tempo terms; evolution pull ×3 + ✦ on rewards (starter recipes excluded); a recruit scene seats a crew member's duo partner; the bot deploys duos; protect rewards name who was saved; `a4_n1_returns`, `a6_n2_drafts` protect, `a5_n2_compactor`, `a6_n2_erasers` survive; `enemyHpPct` 12 → 13; sandbox-only `proto_relay`, `proto_blackout` (`ui/combat/protoEncounters.ts`, rules gated on `enc.proto`).
- **Balance** (canonical 3 × 150, mixed): bot fix alone 202 → 204; pull ×3 212 = 47.1 %, over the band; with HP +1 **200 / 450 = 44.4 %**. Non-starter evolution runs 51 → 109 / 450. Deep Signal 45 → 41 / 150 (within noise). Duo runs 8 → 8 / 450: the pull did not move a fresh-profile bot, so no claim on duos.
- **Limits**: on `proto_blackout` the enemy's floating number ignores ±2 (the panel and the real hit include it). Unverified: the human feel of everything above, sound, the real-play effect of duo seats.

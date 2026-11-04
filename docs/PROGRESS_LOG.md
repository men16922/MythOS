# Progress Log

Last updated: 2026-11-04

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

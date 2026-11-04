# Progress Log

Last updated: 2026-11-04

## 2026-11-04 — District codex lore, 14 districts (Claude Opus 5.5, same goal)

- Only one district (Glass Atrium) awarded a codex entry. Four districts whose quests reveal setting facts now award one on their final stage: `lore_d_errata` (Errata Office: the "stet" mark), `lore_d_crane_chapel`, `lore_d_old_beat` (Foghorn Post: the old beat meant "clear to enter"), `lore_d_letters` (Cable Station: "we only wanted to see the sea"; the Lightkeeper's promise stays for the ending). The lore-award test now counts district choices like the flag guards do. 45 lore.
- **Verified**: content + achievements tests; UI: all four to stage 2 (Errata Office and Cable Station at 1280×720, Foghorn Post and Crane Chapel at 390 px), each run's codex gained its entry, 0 console errors.
- Then the three Outside the List districts: `lore_d_name_tags` (Laundry: tags turned inward on Crew nights), `lore_d_meter_hour` (Meters: an alley sharing one tapped line reads as one flat), `lore_d_night_bus` (Bus Depot: the off-schedule route card sleeps in a different pocket each night), avoiding facts already in `lore_outside_list`/`lore_outside_closing_crew`. 48 lore. **Verified**: content tests; UI: all three to stage 2 (laundry and bus at 390 px, meters at 1280×720), codex gained each entry, 0 console errors.
- Three Sea districts: `lore_d_shift_clock` (Seizure Shed: the crew changed shifts by the tide after the clock was seized), `lore_d_rope` (Shallows: the rope rule; what comes up goes to whoever recognizes it), `lore_d_lens_window` (Lens Workshop: Mok's deliberate flaw), avoiding facts already in the four Sea lore entries. 51 lore; 10 districts award lore. **Verified**: content tests; UI: all three to stage 2 (shed and workshop at 390 px, shallows at 1280×720), codex gained each entry, 0 console errors.
- The other four Sea districts: `lore_d_seal_tape` (Container Alley), `lore_d_tide_table` (Dormitory: thirty years of tide tables), `lore_d_jelly_drone` (Barge Market), `lore_d_seventeen` (Drowned Rows: the knock at 404). Every Sea district now awards lore. 55 lore; 14 districts. **Verified**: content tests; UI: all four to stage 2 (two at 390 px, two at 1280×720), codex gained each entry, 0 console errors. Archive codex at 390 px (KO and EN) with all 14 district entries expanded: reads cleanly, no overflow, 0 console errors.

## 2026-11-04 — Curly quotes everywhere; English Sea run (Claude Opus 5.5, same goal)

- A scan found 67 pairs of straight `"` quotes in older prose (Deep/Sea boss phase lines, act intros, endings, records) where the rest of the game uses “ ”; converted mechanically inside single-quoted literals (prose only, checked in the diff). Follow-up: 88 straight apostrophes in English text (card text like “an enemy's attack”, boss names, `C-17's`, `Censors'`) became ’ the same way; one test expected the old `Se-rin's` and was updated. Then 103 hyphens used as minus signs (mostly older Sea hints like "-4 HP") became − like the other 887. The bilingual content test now rejects straight double quotes, straight apostrophes and hyphen-minus before a number; three-dot ellipses were already absent. **Owner call found by the scan**: 99 option hints in 46 events (mostly the older Sea scenes) are compressed to fit the hint limit (ko ≤ 30, en ≤ 44), e.g. `INT8·S:+3Trace/upgrade1/Ins+1·F:+6Trace`; readable wording does not fit. Options: raise the limit (check the option card at 390 px), show multi-effect hints on two lines, or trim those options to fewer effects. Not changed. Screenshots at 390 px showed a real bug from it: a space-less English hint overran the odds column ("INT 30 vs DC 8"); `event.css` now lets the hint chip break anywhere, re-shot and fixed. Sweep after the fix at 390 px: every rolled event with a long checked hint (114, KO and EN) rendered with no hint overlapping its odds, and eight key screens (map, safehouse, archive, events, districts) plus the combat sandbox (Act 1 with the new items, Deep Act 4/6 bosses, the DLC 2 boss, and all ten Sea bosses with Mujin + Seo-ha and a full gauge); a full Deep secret-ending UI playthrough with Signal+ (6 acts through the DLC 2 route, then `a6_secret_first_connector`) won in 28 min, 48 district polls, no errors; Sea secret (`--sea-secret --signal-plus`, Navigator): first run lost at the Act 6 elite `sea6_e_lens_warden` (the assist mode only tops HP between polls, and one enemy phase dealt more than its 30-HP threshold), the rerun won in 36 min through `sea6_b_lightkeeper` to the secret `sea6_b_unwritten`, no errors. The assist top-up in `ui_playthrough.py` now fires below max(60, 60 % of max HP) so one enemy phase can't end an assisted run; a third `--sea-secret` run with it won (36 min, secret fight reached) had no horizontal overflow; 0 console errors.
- Full **English** Sea + Signal+ UI playthrough: victory in 27 min, 36 district and 80 dialogue polls, no errors.

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

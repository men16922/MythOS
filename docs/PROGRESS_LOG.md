# Progress Log

Last updated: 2026-07-03

This file keeps **only the latest incremental summaries** (latest 5 items). The long 2026-06 detailed log (including per-stage route-node session detail) is in
`bin/docs/archive/progress-2026-06.md`, the 2026-05 log in `bin/docs/archive/progress-2026-05.md`.

## 2026-07-03 — Scene image: side_arc 린위에의 은밀한 의뢰
- Status: Completed (`make check` green; committed locally, unpushed).
- Changed (visual): Generated scene image draft for `side_arc 린위에의 은밀한 의뢰` (Side: Lin Yue's Secret Request) using in-session Imagen 3 (16:9 aspect ratio, prompt tailored to Neo-Seoul art direction). Converted the output to PNG format and copied to `resources/neo-seoul/scenes/lin_yue_secret_request.png`. Left the original draft and its review in `outputs/agy/lin_yue_secret_request/`.
- Verified: Ran `tests/test_image_assets.py` and `tests/test_assets.py` successfully. Verified that `make check` passes.
- Blockers: None (push is human-only).
- Next: human — review the generated scene image draft in `outputs/agy/lin_yue_secret_request/` in the morning, and merge/push.

## 2026-07-03 — Scene image: side_arc 관리망의 유령
- Status: Completed (`make check` green; committed locally, unpushed).
- Changed (visual): Generated scene image draft for `side_arc 관리망의 유령` (Side: Ghost of the Control Grid) using in-session Imagen 3 (16:9 aspect ratio, prompt tailored to Neo-Seoul art direction). Converted the output to PNG format and copied to `resources/neo-seoul/scenes/control_grid_ghost.png`. Left the original draft and its review in `outputs/agy/control_grid_ghost/`.
- Verified: Ran `tests/test_image_assets.py` and `tests/test_assets.py` successfully. Verified that `make check` passes.
- Blockers: None (push is human-only).
- Next: human — review the generated scene image draft in `outputs/agy/control_grid_ghost/` in the morning, and merge/push.

## 2026-07-03 — Scene image: side_arc 버려진 자들의 신호
- Status: Completed (`make check` green; committed locally, unpushed).
- Changed (visual): Generated scene image draft for `side_arc 버려진 자들의 신호` (Side: Signal of the Abandoned) using in-session Imagen 3 (16:9 aspect ratio, prompt tailored to Neo-Seoul art direction). Converted the output to PNG format and copied to `resources/neo-seoul/scenes/abandoned_signal.png`. Left the original draft and its review in `outputs/agy/abandoned_signal/`.
- Verified: Ran `tests/test_image_assets.py` and `tests/test_assets.py` successfully. Verified that `make check` passes.
- Blockers: None (push is human-only).
- Next: human — review the generated scene image draft in `outputs/agy/abandoned_signal/` in the morning, and merge/push.

## 2026-07-02 — CBT feedback: UI accent hierarchy + visual provider-label truth fix + cloud stack live
- Status: Completed (`make check` 623 green; committed `7b8ad88`, `6afa6d9`, unpushed). Interactive session, Vertex cloud stack live.
- Changed (UI, `6afa6d9`): first external CBT feedback — the all-green terminal palette gives no visual hierarchy. Added 2 accents (green stays primary): `--head` amber `#ffb454` for section/panel headers (PARTY/TARGETS/SKILLS/STATUS/OPERATION MAP/TACTICAL BOARD + codex/tab/objective kickers) → landmarks instead of `--term-dim`; `--threat` magenta `#ff5fd0` for the ENEMY roster title + enemy card borders (adversary signature, sets up IX). Gauge progressive danger colors (warn/danger) deliberately left intact (flattening TENSION to magenta would remove info). `roster-section--enemy` modifier added in `CombatRoster.tsx`. White-header variant = set `--head #f2fff9`.
- Changed (visual, `7b8ad88`): asset records logged the request's local-FLUX default labels even on a Vertex Imagen generation (found live: Imagen ran, logs said `flux_local_mps`). `VisualService.generate` now reconciles provider/model_id from the active provider's `provider_label`/`model_label` before any record/log; curated bypass + label-less providers unaffected. +2 regression tests.
- Fixed (UI overlap, `52f7aa1`, playtester report): the combat command console (`#combat-controls`) was `position:sticky; bottom:12px; z-index:12` + `margin-top:auto` — when roster + console exceeded the viewport the bottom-pinned console slid up over the roster (scrolling down un-stuck it). Now flows normally below the roster (16px flex gap); live-verified 0px overlap at scroll top.
- Verified: `make check` EXIT=0 623. UI live-verified in Chrome via 3 injected mockups → applied hybrid → hard-reload from built CSS (headers `rgb(255,180,84)`, ENEMY `rgb(255,95,208)`, enemy border magenta, TENSION fill still amber-progressive). Cloud stack (`make api-cloud` + `visual-worker-cloud-bg`) live: narration `VertexGeminiJSONProvider` ~4-5s.
- Blockers: push is human-only (private-repo classifier) — main **ahead 26**.
- Next: human — push + redeploy; live-play checklist. Optional: swap `--head` to white if amber reads too warm.

## 2026-07-02 — bug#4 layer-1 curated-image directive fix + CBT move committed + stale-note cleanup
- Status: Completed (`make check` EXIT=0, **621 tests** green; committed `ac7f9d1..3b7d26b` (4), unpushed).
- Changed: (1) **bug#4 fixed** (`3b7d26b`) — the opening prologue suppresses route steering until turn 5, but layer 1's only fresh turn is turn 4 (inside the window), so a layer-1 anchor's curated-image directive (night_market) was **never emitted** and turns 5-7 got the anti-repeat "move forward" directive against a never-established scene. Diagnosed per `/diagnose` (per-turn simulation over the real neo-seoul route map, 3 hypotheses, before/after: turn-5 emitted False→True, layers 2+ unchanged). Fix: NEW `ROUTE_STEERING_START_TURN=5` shared by the gate + `fresh_node`; regression test `test_layer1_anchor_image_hint_fires_on_steering_resume_turn`. (2) CBT root→`docs/cbt/` move committed (`ac7f9d1`; the 2 teaser videos ~124MB stay local + gitignored — YouTube is distribution). (3) stale `test_assets.py` skill-exclusion note cleared in STATUS.md + QA-seed box ticked (`fb04d51`). (4) serena config schema sync (`6c92c5b`).
- Verified: `make check` EXIT=0 621 green (new regression test included); route suite 28 green; diagnostic sim re-measured after fix.
- Blockers: push is human-only (private-repo classifier) — main now **ahead 22**.
- Next: human — push + redeploy; live-play checklist (`docs/test/neo_seoul_live_qa.md`). Remaining deferred: glass-library EN glossary (on hold), dev-log KO literals (dev-only).

## 2026-07-02 — Pre-CBT hardening: boss climax + 4 combat/route bugs + EN Korean leaks + refactor
- Status: Completed + locally live-verified (`make check` 620 green; committed `ebc7905`..`5d837ee` (12), **unpushed**).
- Fixed (combat/route): (1) **IX boss climax never fired** — the "Confront IX" route node's combat ran through the ambient pacing gate (`_gate_next_combat`), whose risk-cap (max 4) always downgraded the risk-5 boss and whose cooldown suppressed it; and even after bypassing the gate, ambient combat (encounter-map contact / LLM `start_combat`) coinciding on the boss-entry turn stole precedence, so the parked node never re-fired. Route combat now takes precedence AND bypasses the gate. (2) encounter-map contact left "engaged" when the gate downgraded / a boss overrode it → phantom re-trigger loop; resolve the original contact. (3) `_combat_snapshot` used the neo-seoul-default `options.scenario_id` not `loop.state` → wrong combat data on non-neo-seoul resume. (4) `_roll_loot` `KeyError` on a loot entry missing `item`.
- Fixed (EN Korean leaks, QA finding): code-generated Korean reaching EN players — ending titles/narrations, combat title/objective/fallback, save-slot prefix, codex/lore, validator/parser/choice-impact fallbacks, factory defaults, opening/arc titles (neo-seoul `en.json` glossary +36 / phrases +2, all via `localize_for`); `GET /loops/{id}/scenes` had no localization (added `lang`+`localize_for`, scenario from loop); 2 frontend literals (onboarding status, image placeholder) → `DICTS[getLang()]`; **skill-tree error toasts** localized (`learn_skill` detail via `localize_for`, `LearnSkillRequest.lang`, frontend sends `getLang()`, `ff0da98`). Free LLM prose unchanged (fresh EN loops clean; legacy KO prose not glossary-translatable).
- Refactor: extracted the next-combat decision into `_resolve_next_combat` (+ unit test). Regression tests: boss climax fires under gate + wins coinciding ambient, loot skips malformed, precedence.
- Live-verified (local, no charge): fallback API HTTP scan (begin/choose/combat/skill-error/save/memory/scenes) = **0 Korean**; `/combat/begin ix_confrontation` builds IX+2 adds. The scan surfaced + fixed **4 IX-combat leaks** the 2026-06-30 boss content never got glossaried (weapon `최적화 빔` + 3 encounter-meta fields, `57a89e3`). **AGY browser QA** (`scripts/live-qa/run-agy.sh` probe/fallback, Chrome DevTools) = `PASS_CANDIDATE`, 0 findings, git-invariant — main screen EN render confirmed (shots `outputs/live-qa/20260702-033059-probe/`). Live-QA checklist slimmed 276→47 lines (human-actionable only).
- Verified: `make check` EXIT=0, 620 tests. Two subagents (adversarial bug-hunt + EN Korean-leak audit) drove the findings.
- Follow-ups (deferred): bug#4 curated-image directive unreachable at first act-1 layer (`scenario_context` fresh_node); glass-library has no EN overlay glossary (on hold); dev-log ~32 KO literals (dev-only). Human/live: IX boss route-fire + feel + phantom-loop + natural-ending render (checklist).
- Next: human — push `main` (unpushed) + redeploy so testers get the boss fix + EN cleanup.

## 2026-07-01 — CBT recruitment assets finalized + edited teaser video + itch.io setup guide
- Status: Completed.
- Changed: Moved CBT files from root to `docs/cbt/` (localized English/Korean posts, teasers). Updated final YouTube link (`https://youtu.be/rpWdpMAqfnw`) and Google Form link (`https://docs.google.com/forms/d/e/1FAIpQLSfAbQWTge08B9fHnEJQL0QYMWeoQ6AD-tS6HFSYMJppEkjuww/viewform?usp=dialog`) across all files. Reframed `CBT_RECRUIT_SOLORP.md` to be conversational and targeted at solo RPG/GME players (emphasizing AI Oracle + automated bookkeeping + grid combat). Created `docs/cbt/ITCH.md` detailing Itch.io project page setup.
- Verified: Edited raw 6-min teaser video into a 2.5-min trailer `docs/cbt/Mythos_Teaser_Edited.mp4` using `h264_videotoolbox` hardware encoding. Extracted high-quality UI/Combat preview screenshots. Checked links and format integrity.
- Blockers: None.
- Next: Human/non-blocking: push to origin, post the thread in `#showcase-your-game` on AI Game Dev Org Discord (giving feedback to 2 other games first), and monitor initial playtest submissions.

## 2026-06-30 — IX boss DESIGN (claude lane): real climax fight, data-driven
- Status: Completed (`make check` 611 green, committed; unpushed). Overnight `[auto:claude]` IX boss design lane (plan `docs/plans/2026-06-30-ix-boss-fight.md`). The Neo-Seoul climax was narrative-only (boss route node spawned generic enforcer/mech); now it's a real Administrator IX fight.
- Changed (`resources/neo-seoul/scenario.json`, data-driven, no engine edits): bestiary `administrator_ix` (boss-tier hp 38 / def 13 / armor 2, ranged) + unique weapon `ix_optimizer_beam` (1d10, range 5, armor_pen 1); encounter `ix_confrontation` (IX + sentinel_drone + purge_drone adds, 10×7 arena → procedural hazard-rich terrain); route `combat_encounters.boss` → `["ix_confrontation"]` (single → deterministic resolve). Placeholder sprites at the 6 IX contract paths (cp suppression-mech; codex art lane overwrites).
- Scope decisions: (a) enemy AI consumes only `primary_weapon()` — bestiary `skills` are NOT used mechanically, so IX distinction is via stats/unique weapon/adds/large arena, **not** player-tree skills (adding enemy skills to `combat.skills` would pollute the Codex tree + add inert icon burden). (b) Did **not** add `ix_confrontation` to the Director `start_combat` list — boss fires only at the route boss node, never mid-story. (c) `enforcer_standoff`/`mech_siege` stay declared + balance-tested (mech_siege still in `combat` pool; both Director-reachable).
- Verified: balance tuned empirically via the deterministic greedy sim — `ix_confrontation` party(se_rin+kai)=0.68 / solo=0.00 (FLOOR 0.50 / CEIL 0.95), by far the hardest encounter (all others ~0.98). NEW `test_boss_node_resolves_to_ix_confrontation_with_ix_present` (boss node → ix_confrontation, IX boss-tier + present). `make check` EXIT=0 611.
- Next: codex art lane generates real IX portrait/5 poses/skill icons to overwrite placeholders.

## 2026-06-30 — Post-combat EN fix (redeploy) + CBT recruitment assets + IX boss plan
- Status: deployed (rev `mythos-api-00003-fzb`), `make check` 610 green, committed `649aeea..de95632` (unpushed).
- Changed: **post-combat continue stayed Korean even in EN** — `useCombatRest.continueAfterCombat` sent a hardcoded Korean action + no `lang` on the WS choose, so the LLM regenerated KO + data unlocalized. Now uses localized `sess.postCombatAction` + `lang=getLang()` (`86d3970`). All generation paths now thread lang. Redeployed.
- Added: `CBT_TEASER.md` (2-min teaser shot script, admin link, no-keys-on-screen) + `CBT_RECRUIT_POST.md` (r/Playtesters **Unpaid Playtest** text post, embed video + Google Form). IX boss-fight plan `docs/plans/2026-06-30-ix-boss-fight.md` + NEXT_PLAN 2-lane (`[auto:claude]` design + `[auto:codex]` art, shared sprite-path contract).
- Verified: deployed post-combat-shape choose (EN action + lang=en) → English narration + **0 residual Korean** in served snapshot. Cost: Cloud Run scale-to-zero idle ~$0; stopped leftover local cloud-pointed api/visual-worker.
- Findings (not yet fixed): **IX boss is narrative-only** (no boss enemy/encounter — route boss node spawns generic enforcer/mech) → boss plan added. **Korean on resume/load = persisted pre-fix prose** (free narration isn't re-translatable at serving; only DATA is) → fresh EN loops are clean; old loops keep KO (wipe Neon to reset).
- Next: human — push `main` (FF-merged, ahead of origin) · billing alert + Vertex daily quota · feedback Form · run overnight to consume the IX boss task.

## 2026-06-29 — 🚀 GCP closed beta DEPLOYED LIVE (Cloud Run + Neon + Vertex)
- Status: LIVE + end-to-end verified. URL `https://mythos-api-1004528040791.us-central1.run.app` (revision mythos-api-00002-9wf, us-central1). Agent ran the deploy via gcloud (user ran the IAM/SA/bucket prereq block + Neon signup — safety rules forbid agent IAM/account/billing changes).
- Infra: dedicated SA `mythos-run` (aiplatform.user + cloudtrace.agent), GCS bucket `mythos-assets-…` (objectAdmin), **Neon Postgres 18** (`migrations/001-007` applied via psycopg libpq). Deploy = lean Dockerfile (prebuilt static), `--allow-unauthenticated` + invite-gate, min-instances 0 / max 3, env via `--env-vars-file`.
- Verified LIVE: health/SPA 200 · gate (no-key 401 / key 200) · **real Vertex Gemini EN narration** + Neon persist · EN default + English tab title · admin key uncapped (12/12 200) vs tester capped (11th=429).
- Changed (code, this batch): EN combat-log i18n (K6, `mythos_combat/log_i18n.py` + `CombatState.language`); EN default flip (`getLang`/`resolveInitialLang`/`index.html`); BGM first-gesture auto-on; **admin keys** cap-exempt (`MYTHOS_ADMIN_KEYS`, cyrb53 port verified vs node); browser tab title EN. `make check` 610 green.
- Keys: 8 tester + 1 admin (`admin-43dc07f266c2`, uncapped) in `INVITE_KEY.md` (gitignored). Cost guards live: invite gate + loop cap 10 + scale-to-zero.
- Blockers: agent can't push (private) / can't run IAM·billing·destructive DB TRUNCATE (classifier-blocked) → user does those. Test-data cleanup (Neon TRUNCATE) left to user (optional, harmless).
- Next (human, non-blocking): billing budget alert + Vertex daily quota · feedback Google Form · distribute `?invite=` links → r/playtesters · `git push`.

## 2026-06-29 — EN default flip (global-first) + BGM auto-on
- Status: Completed (`make check` 609 green, Chrome live-verified, committed `05aae47`, unpushed). EN is now end-to-end (UI+narration+combat log via K6), so the product default language flips to English.
- Changed: `resolveInitialLang()` (`i18n/lang.ts`), `getLang()` (`api.ts`), and `index.html` `<html lang>` now default to `en`; `?lang=` + stored choice still take precedence (KO users + toggle unaffected). Playwright E2E pinned to `?lang=ko` (asserts the KO baseline). BGM: enabled-by-default + NEW one-time first-gesture (pointerdown/keydown) autostart in `App.tsx` → BGM turns ON at first interaction on any entry path (autoplay-policy-compliant; still toggleable off).
- Verified: fresh visitor (cleared storage, no `?lang=`) → EN boot/UI, language toggle reads `한국어`, `<html lang=en>`; trusted first click → BGM button `START`→`ON`. `make check` EXIT=0 609.
- Next: K9 full ending screen live verify (AGY live-QA candidate) → deploy (human/infra).

## 2026-06-29 — K6 EN: localize combat log prose (engine-level i18n)
- Status: Completed (`make check` 609 green, API+browser live-verified, committed `d37776b`, unpushed). K6 verification found combat UI fully EN *except* the combat event log — generated as Korean templates in `engine.py`/`narrator.py` (names English via glossary, but grammar/timestamps KO).
- Changed: NEW `mythos_combat/log_i18n.py` (KO/EN templates `clog` + narrator lead pools, same length/lang → seed-stable). Added `language` to (persisted) `CombatState`; threaded `build_encounter` → `CombatService.begin` → both `session.py` begin sites (`options.language`) + `/combat/begin`. Replaced ~40 engine f-strings + narrator leads/flush/start/outcome. Combat RNG unaffected (log text consumes no dice); KO default → behavior-preserving. EN names still localized by the boundary glossary.
- Verified: EN combat API → "Maintenance Drone's Cleaver Blade hits K6Tester for 6.", "Covering noise spreads around Jung Se-rin. (DEF +3)"; KO unchanged ("전투 개시."). `make check` 609 (combat suite 87 green + new `test_combat_log_language`). live-QA §K K6 `[x]`.
- Next: K9 full ending screen is code-clean (data-driven resolver + en.json + i18n banner + combat-outcome prose) but full live-ending unverified (needs terminal playthrough). Then deploy (human/infra).

## 2026-06-29 — CBT UX: stable invite identity + game-style save/load + invite gate
- Status: Completed (`make check` 608 green, Chrome live-verified, committed `daa5438` route-label fix + `fce5874` CBT bundle; unpushed — private repo, user pushes).
- Changed (frontend): **Save/Load modal** (`SaveLoadModal.tsx`) replacing the inline panel — slot cards show scene/character(display_name+archetype)/scenario/date/turn-phase/STA-TEN/combat + **thumbnail**; **client-side paging** 6/page over latest 60; SAVE/LOAD buttons (in-game) + LOAD on Connection Terminal open it. **Option B identity** (`api.ts` `stablePlayerId` cyrb53 from invite key → saves follow the key cross-device, no OAuth). **Invite gate** (`InviteGate.tsx`): boot probe `/auth/verify-invite` → 401 shows key-entry screen, key persists to localStorage (one-time per browser), errors fail-open.
- Changed (backend): capture `display_name`+per-loop `archetype` into `loop.state` at start (`session.py`); expose them + `curated_image` on `SaveSlot` (`options.py`/`save_load.py`); `save-slots` endpoint resolves `thumb_url` (curated static `/resources` first, else signed asset) + clamped `limit` (default 60); NEW `GET /auth/verify-invite` probe.
- Verified: `make check` EXIT=0 **608 tests**, mypy/eslint/tsc/vite clean. Chrome: EN route labels English; LOAD picker + modal render/load; thumbnails load; paging 2 pages (6+3); invite gate blocks keyless / rejects wrong key / accepts valid + remembers on reload. Screenshots in `outputs/`.
- Blockers: agent cannot push (private-repo classifier) → user pushes `feat/en-ko-s0-language-plumbing`.
- Next: K6 combat + K9 ending EN verification (last EN gaps); then deploy (human/infra) — set `MYTHOS_INVITE_KEYS` + per-tester `?invite=` URLs; DEPLOY.md invite-gate note.

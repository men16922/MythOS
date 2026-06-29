# Progress Log

Last updated: 2026-06-29

This file keeps **only the latest incremental summaries** (latest 5 items). The long 2026-06 detailed log (including per-stage route-node session detail) is in
`bin/docs/archive/progress-2026-06.md`, the 2026-05 log in `bin/docs/archive/progress-2026-05.md`.

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

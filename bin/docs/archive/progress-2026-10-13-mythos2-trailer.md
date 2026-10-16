# Progress archive — 2026-10-12/13 (cinematic trailer, preview deploy, playthrough bot, definition of done)

Moved from `docs/PROGRESS_LOG.md` on 2026-10-17 (doc budget).

## 2026-10-13 — Store cut, voices settled, trailer outputs cleaned

- Store cut (`cinematic.py build --cut store`, 53 s): the painted Veo shots as a ~10 s hook (owner: the store video should match the game's art), then real gameplay — `record_trailer.py --scenes store` records a real run dropped into the Haetae boss and the Incinerator elite, each turn planned by the simulator's expert and played through real clicks, pointer parked off the board (no tile tooltips), plus the map; fights cropped in ×1.22 so the board reads on a phone. The photoreal cut now uses the Haetae fight too. Se-rin = shared voice "Ember" (owner pick from 14 directed takes; clicks removed by hand). `make cinematic` builds both.
- Cleaned `outputs/trailer/` 1.9 GB → 1.0 GB (intermediates, rejected Gemini stills, Korean VO, auditions, the superseded painted/Korean cut and the old 40 s trailer). Kept: both finals, Veo shots, stills, VO, score, used recordings. Verified: contact sheets, `make check` green. Not verified: human viewing/listening.

## 2026-10-13 — Cinematic v2: photoreal shots, English narration

- Owner direction: English narration only (IX = ElevenLabs "Adam" deep, picked from an 11-voice audition; Korean TTS dropped), a photoreal live-action look like the 1.x art. `gen_stills.py --engine codex` (Codex image, gpt-image-2) re-shoots the 8 key-art compositions as film stills — Gemini 3 Pro / 3.1 Flash image kept the painterly style and was rejected (`stills_gemini/` kept for reference). `gen_veo.py --style photo` animates them (8 Veo 3.1 calls), `cinematic.py build --style photo` → `outputs/trailer/cinematic/mythos2_cinematic_photo.mp4` (78.5 s, 1080p) + `_web.mp4` (60 MB). English captions primary, `--skip <line>` drops a narration line.
- Verified: contact sheet; Gemini transcription per window — every line transcribed; "HAETAE" was read as "hate" (now "Hae-tae"), the last lines were masked → stronger ducking (music 0.55, sidechain ratio 10). −13.7 LUFS. `make check` green. Not verified: human listening; Veo billing against credits (billing export lags a day).

## 2026-10-13 — Cinematic trailer (Veo + gameplay + IX narration)

- Status: done (first cut), committed; owner listening/viewing pending. `make cinematic-assets` (billed: 8 Vertex Veo 3.1 image-to-video shots from the game's key art with native ambience, `gen_veo.py`; 1080p gameplay via CDP screencast, `record_trailer.py --scale 1.5 --record-only`; 7 Korean IX/Se-rin lines + an 82 s score from ElevenLabs, `cinematic.py audio`) then `make cinematic` (cut only) → `outputs/trailer/cinematic/mythos2_cinematic.mp4` (78.5 s, 1080p, 135 MB master) + `_web.mp4` (56 MB). Ported from the 1.x teaser pipeline. Voices are provisional (first audition candidate: IX Junjin, Se-rin Yooni).
- Verified: frame contact sheet (every 2 s) and waveform; Gemini 2.5 Pro transcription of the final mix — all 7 lines intelligible, no clipping/gaps reported; −13.4 LUFS. The default `make trailer` still builds (regression run). `make check` green. Not verified: human listening; Veo cost (9 calls incl. one fallback).

## 2026-10-13 — Pushed main; preview revision deployed and verified

- `main` pushed by the owner (origin `742e64d`; `1.0` already there). `make deploy-preview` → `mythos-api-00123-qex` at 0 % traffic; `make verify-preview` 5/5 PASS (first real check of the `git-sha` label = HEAD `7e57217`, health, postgres store, Gemini GM, google auth, served bundle = committed). Promotion is the owner's call. Owner promoted it (2026-10-13): 100 % on `00123`, prod `/api/v2/health` ok. The first promote failed — gcloud's default project is another one; `verify_preview.py` now prints `--to-revisions <rev>=100 --project …`.

## 2026-10-13 — Sync pass, plan correction

- Status: done, committed. `NEXT_PLAN.md` no longer asks to install plugin 1.8.0 (installed, `/ship` present). Verified: `make check` green (node 269, Python 253, 7 DB skipped). Unverified: e2e/playthrough (no code changed), `git-sha` label on Cloud Run. Every other open item is owner-side (accounts, listen-tests, push, deploy-preview, harness reseed).

## 2026-10-12 — Unassisted UI run wins the whole game; quick playthrough, verify-preview, definition of done

- Status: done, committed.
- Changed: the bot plays each turn with the simulator's expert (`planGreedyTurn` in `engine/combatSim.ts`, run in-page; the first step is executed through real tile clicks and number keys, then replanned). New `make playthrough-quick` (`--max-nodes 5`, then the shop/safehouse/treasure/final-choice tour). New `make verify-preview` (`scripts/dev/verify_preview.py`, read-only): the no-traffic revision must carry `git-sha` = HEAD, `/api/health` + `/api/v2/health` ok, sign-in mode google, served `app.js` = committed bundle; prints the promote command only when all pass. `make deploy` / `deploy-preview` now stamp the revision with `git-sha=<short>[-dirty]`. `CLAUDE.md` gains a "Definition of done" section (evidence before "done", say what is unverified). `.claude/harness-config.json`: removed the stale `harness_root` pin to plugin 1.4.0 (the overnight runner was resolving through it; now follows the newest install), added `doc_budget_cmd` and `ship.hold_back`.
- Verified: `make check` green (node 269, Python 253, 7 DB skipped). **Unassisted** whole run (`ui_playthrough.py --runs 1 --max-minutes 40 --no-god`): victory (`ending_noble_sacrifice`), 24 map nodes, three acts, 0 console errors, 10 min — earlier the same bot lost at the end of act 1. `make playthrough-quick`: 2 min, OK. `verify_preview.py --url` checked against a local server (flags open auth, passes bundle and health); new `tests/test_verify_preview.py` covers pass / open auth / stale bundle. Not run against Cloud Run (no deploy made): the `git-sha` label path is unverified until the next `make deploy-preview`.
- Blockers: none. Plugin `ship` skill lives in the plugin repo (1.8.0, committed locally there, not pushed or installed); the installed 1.7.0 in this repo has no `/ship` yet.
- Next: next `make deploy-preview` then `make verify-preview`; owner items unchanged (accounts, voice pins, SFX listen, harness reseed). `Makefile` still pins the overnight actor/critic to `claude-sonnet-5` / `claude-fable-5-1`; the plugin's new default is Opus 5.5 for both (owner cost call).

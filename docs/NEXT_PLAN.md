# Next Plan

Last updated: 2026-10-17

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`.

## Priority 0 — ship Mythos 2.0

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md`.

- `[ ]` `[manual]` **SFX listen-test** — AI/measurement pre-review done 2026-10-13 (all 50 cues render, 0 clipping): listen only to the 4 flagged groups in `docs/test/sfx_trailer_prereview.md` via `outputs/sfx-review/index.html`.
- `[ ]` `[manual]` **Trailer review** — pre-review done 2026-10-13 (store-cut boss-title crop fixed and recut; 3 spots to judge in `docs/test/sfx_trailer_prereview.md`) — `outputs/trailer/cinematic/mythos2_cinematic_photo.mp4` (YouTube/SNS, photoreal, 78 s) and `mythos2_cinematic_store.mp4` (Play Store promo, painted hook + real fights, 53 s); English narration (IX = Adam, Se-rin = Ember). Recut free with `make cinematic`. Veo billing (export, 2026-10-13): 136 s = 17 clips, ₩73,916 gross, monthly promotional credits covered ₩30,276 and ran out mid-batch → net ≈ ₩43,640; further Veo calls bill in full.
- `[ ]` `[manual]` **Android release** — follow `docs/play-store.md` "Owner steps": Play Console account ($25; a new personal account needs a 12-tester × 14-day closed test before production — recruit testers now), `MYTHOS_CONTACT_EMAIL` in `.env` + deploy-preview → verify → promote (the `/privacy` and `/account-deletion` pages and in-app account deletion / AI-line reporting ship with it), grant `roles/firebaseauth.admin` to `mythos-run@` (command in the sheet), upload keystore → `VERSION_CODE=1 make android-aab`, paste the prepared listing / Data safety / content-rating answers, upload `outputs/play-store/` graphics (`scripts/android/store_assets.py`).


## AI expansion (researched 2026-10-17)

Done 2026-10-17: Settings "AI 대사 사용"; IX loop memory; chronicle uses typed Improvise actions + outcomes; talking-enemy taunts (5 personas, `mythos_v2/taunt.py` ↔ `content/taunts.ts`); déjà-vu event openings (`profile.eventsSeen`); GM eval set `make gm-eval` (baselines in `outputs/gm-eval/`). Owner call 2026-10-17: only IX remembers loops; companions get a faint déjà vu in the safehouse chat (`loopsTogether`). Rejected: runtime image generation, LLM-made cards/enemies or map direction (critical path, balance, daily comparability).

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after). Watch list of possibly strong/weak cards from the 2026-10-11 audit is in `PROGRESS_LOG.md`; check the dashboard's killers and win rates first.
- `[ ]` Play Games Services (after the Play account): game + daily leaderboard ids, mirror `/api/v2/daily` bests, achievements.
- `[ ]` GM cost guard beyond what exists — owner decision 2026-10-11: no extra guard until `v2_gm_usage` shows real volume (re-measured 2026-10-17 on gemini-3.8-flash: ≈ 63 calls ≈ $0.05 per run at the introductory price, ≈ $0.10 after it doubles in Jan 2027 — IX comms are half the bill). Already in place: per-player 20/min + 400/day (`MYTHOS_V2_GM_PER_*`), concurrency 4 per instance, Cloud Run maxScale 3. The missing piece, if ever needed, is a global daily ceiling.
- `[ ]` Companion arcs are done for all six (3-event flag chains); a further event wave only if players report repetition (each act now rolls from 16 events; scenes with art cost one image call each — see `scripts/v2_assets/ledger.json`).

- `[x]` **1.x port** — executed under the owner's "포팅 계획까지 포함하여 잔여 작업 전부" directive; verdicts for all 22 candidates are in `docs/plans/2026-10-11-port-from-1x.md`. Still open from it: static voice-over — **one listening pass**: open `outputs/voice-auditions/index.html` (all 48 auditions, 8 roles × ko/en; picking one per role builds the `pin.py` command — made 2026-10-17), then pin e.g. `pin.py se_rin=Yooni kai=Minjoon`; I can build the batch generator and playback once the pins exist. The store promo video is `outputs/trailer/cinematic/mythos2_cinematic_store.mp4` (`make cinematic`; the old 40 s `make trailer` cut was removed from outputs 2026-10-13) — only its Play Console upload is waiting on the account.

## Agent operations

- Held-out bank v2 (2.0 tree) ratified and model pins kept, 2026-10-13 (`DECISIONS.md`). Unattended loops on the 2.0 tree need explicit `[auto:*]` seeds here (`overnight-harness:overnight-seed`); none are queued.

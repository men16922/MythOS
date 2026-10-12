# Next Plan

Last updated: 2026-10-11

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`.

## Priority 0 — ship Mythos 2.0

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md`.

- `[ ]` `[manual]` **SFX listen-test** — the impact layers were tuned by offline measurement only (all tests are muted).
- `[ ]` `[manual]` **Trailer review** — `outputs/trailer/cinematic/mythos2_cinematic_photo.mp4` (YouTube/SNS, photoreal, 78 s) and `mythos2_cinematic_store.mp4` (Play Store promo, painted hook + real fights, 53 s); English narration (IX = Adam, Se-rin = Ember). Recut free with `make cinematic`. Check the Veo SKUs in the billing export (credits?).
- `[ ]` `[manual]` **Android release** — Play Console developer account ($25), an upload keystore (owner-held), package id check (`com.projectmythos.signalrun` is permanent once uploaded), register the upload-key and Play app-signing SHA-1s in Firebase (Google sign-in), then an internal-testing AAB. Tester list for Firebase App Distribution.

- `[ ]` `[manual]` Overnight model routing: `Makefile` pins actor `claude-sonnet-5` / critic `claude-fable-5-1`; plugin 1.8.0 defaults both to Opus 5.5 — owner cost call. Plugin 1.8.0 is installed (`/ship` available).

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after). Watch list of possibly strong/weak cards from the 2026-10-11 audit is in `PROGRESS_LOG.md`; check the dashboard's killers and win rates first.
- `[ ]` Play Games Services (after the Play account): game + daily leaderboard ids, mirror `/api/v2/daily` bests, achievements.
- `[ ]` GM cost guard (per-player daily AI-call cap or a cheaper model) if traffic grows — ≈ $0.085 per run on gemini-3.5-flash (measured 2026-10-11).
- `[ ]` Companion arcs are done for all six (3-event flag chains); a further event wave only if players report repetition (each act now rolls from 16 events; scenes with art cost one image call each — see `scripts/v2_assets/ledger.json`).

- `[x]` **1.x port** — executed under the owner's "포팅 계획까지 포함하여 잔여 작업 전부" directive; verdicts for all 22 candidates are in `docs/plans/2026-10-11-port-from-1x.md`. Still open from it: static voice-over — **one listening pass**: `.venv/bin/python scripts/voice-gen/pin.py --list`, listen to `outputs/voice-auditions/ko/<role>/*.mp3` (7 roles × 3 clips, already generated), then pin e.g. `pin.py se_rin=Yooni kai=Minjoon`; I can build the batch generator and playback once the pins exist. The store promo video is `outputs/trailer/cinematic/mythos2_cinematic_store.mp4` (`make cinematic`; the old 40 s `make trailer` cut was removed from outputs 2026-10-13) — only its Play Console upload is waiting on the account.

## Agent operations

- `[ ]` `[manual]` Re-seed the overnight harness against the 2.0 tree: `scripts/overnight/heldout-bank.md` is the owner-ratified frozen v1 and its 3 tasks target 1.x code (branch `1.0`) — a replacement bank needs a recorded owner decision. Until then, run unattended loops only with explicit 2.0 seeds.

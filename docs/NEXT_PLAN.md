# Next Plan

Last updated: 2026-10-11

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`.

## Priority 0 — ship Mythos 2.0

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md`.

- `[ ]` `[manual]` **SFX listen-test** — the impact layers were tuned by offline measurement only (all tests are muted).
- `[ ]` `[manual]` **Android release** — Play Console developer account ($25), an upload keystore (owner-held), package id check (`com.projectmythos.signalrun` is permanent once uploaded), register the upload-key and Play app-signing SHA-1s in Firebase (Google sign-in), then an internal-testing AAB. Tester list for Firebase App Distribution.
- `[ ]` `[manual]` **`git push`** — `main` (2.0) and `1.0` (archive).

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after).
- `[ ]` Play Games Services (after the Play account): game + daily leaderboard ids, mirror `/api/v2/daily` bests, achievements.
- `[ ]` GM cost guard (per-player daily AI-call cap or a cheaper model) if traffic grows — ≈ $0.085 per run on gemini-3.5-flash (measured 2026-10-11).
- `[ ]` Remaining companion arcs: Kai and Lin-yue (Su-ah, Tae-o, Han and Se-rin have flag-chained 3-event arcs) and another event wave only if players report repetition (each act now rolls from 16 events; scenes with art cost one image call each — see `scripts/v2_assets/ledger.json`).

## Agent operations

- `[ ]` `[manual]` Re-seed the overnight harness against the 2.0 tree: `scripts/overnight/heldout-bank.md` is the owner-ratified frozen v1 and its 3 tasks target 1.x code (branch `1.0`) — a replacement bank needs a recorded owner decision. Until then, run unattended loops only with explicit 2.0 seeds.

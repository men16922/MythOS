# Next Plan

Last updated: 2026-10-11

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`.

## Priority 0 — ship Mythos 2.0

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md`.

- `[ ]` `[manual]` **SFX listen-test** — the impact layers were tuned by offline measurement only (all tests are muted).
- `[ ]` `[manual]` **Deploy 2.0** — `make deploy-preview` (no-traffic tag `v2`) then promote, or `make deploy`. Replaces what CBT testers see; the first `/api/v2` request creates `v2_saves` in the production DB.
- `[ ]` **Cloud smoke after deploy** — `/api/health`, `/api/v2/health`, a save round-trip and GM narrate/talk on Vertex through the deployed URL; confirm CORS for the Android origin.
- `[ ]` `[manual]` **Android release** — Play Console developer account, an upload keystore (owner-held), package id check (`com.projectmythos.signalrun` is permanent once uploaded), then an internal-testing AAB. Tester list for Firebase App Distribution.
- `[ ]` `[manual]` **`git push`** — `main` (2.0) and `1.0` (archive).

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after).
- `[ ]` Daily-seed leaderboard (Play Games Services or `/api/v2`), if players want comparison.
- `[ ]` More events per act and a fourth companion arc, if runs start to feel repetitive.

## Agent operations

- `[ ]` Re-seed the overnight harness against the 2.0 tree (the held-out task bank and Dev Graph missions targeted 1.x). Until then, run unattended loops only with explicit 2.0 seeds.

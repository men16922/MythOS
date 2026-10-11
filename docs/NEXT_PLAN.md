# Next Plan

Last updated: 2026-10-11

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`.

## Priority 0 — ship Mythos 2.0

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md`.

- `[ ]` `[manual]` **Firebase Auth** — console → Authentication → Get started → Google → enable; then `make firebase-auth-domains` and `make android-firebase` + rebuild (build prints `native Google sign-in: on`). Until then sign-in shows the "not open yet" note.
- `[ ]` `[manual]` **Daily push** — a push-only service account with `roles/firebasecloudmessaging.admin`, then `PUSH_SA=<that SA> make push-schedule` (19:00 KST; `DRY_RUN=1` previews). See `docs/online.md`.
- `[ ]` `[manual]` **SFX listen-test** — the impact layers were tuned by offline measurement only (all tests are muted).
- `[ ]` `[manual]` **Deploy 2.0** — `make deploy-preview` (no-traffic tag `v2`) then promote, or `make deploy`. Sets `MYTHOS_AUTH=google` + the Firebase web config (needs `.firebase/web-config.json`, `make firebase-web`). Replaces what CBT testers see (invite keys no longer work — testers sign in with Google); the first `/api/v2` request creates the v2 tables in the production DB.
- `[ ]` **Cloud smoke after deploy** — `/api/health`, `/api/v2/health`, a save round-trip and GM narrate/talk on Vertex through the deployed URL; confirm CORS for the Android origin.
- `[ ]` `[manual]` **Android release** — Play Console developer account ($25), an upload keystore (owner-held), package id check (`com.projectmythos.signalrun` is permanent once uploaded), register the upload-key and Play app-signing SHA-1s in Firebase (Google sign-in), then an internal-testing AAB. Tester list for Firebase App Distribution.
- `[ ]` `[manual]` **`git push`** — `main` (2.0) and `1.0` (archive).

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after).
- `[ ]` Play Games Services (after the Play account): game + daily leaderboard ids, mirror `/api/v2/daily` bests, achievements.
- `[ ]` GM cost guard (per-player daily AI-call cap or a cheaper model) if traffic grows — ≈ $0.085 per run on gemini-3.5-flash (measured 2026-10-11).
- `[ ]` More events per act and a fourth companion arc, if runs start to feel repetitive.

## Agent operations

- `[ ]` Re-seed the overnight harness against the 2.0 tree (the held-out task bank and Dev Graph missions targeted 1.x). Until then, run unattended loops only with explicit 2.0 seeds.

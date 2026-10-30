# Progress archive — 2026-10-27

Moved from `docs/PROGRESS_LOG.md` on 2026-10-30 (budget).

## 2026-10-27 — Production: `00154-lom` promoted (Claude Opus 5.5, owner call)

- `gcloud run services update-traffic mythos-api --to-latest` → `00154-lom` (`git-sha=910834b`, Deep Signal DLC R1–R7 + secret-fight fix) at 100 % `LATEST`; rollback `00150-qen`. Checked: `/api/health` 200, served `App2.js`/`CombatScreen.js` hashes = committed bundle, no `src/` changes since `910834b`. Unverified: sign-in and a played run on the production URL after promotion.

## 2026-10-27 — Deep Signal real-UI pass: secret-fight lock fixed (Claude Opus 5.5)

- **Bug (fixed)**: the secret First Connector fight follows the Act 6 boss on the same `combat` screen, so `CombatScreen` kept the won fight's `ending` lock — hand greyed, no input. `GameShell` now keys `CombatScreen` by `encounterId` (fresh state, boss splash and intro). Repro fails without the key, passes with it (turn 2→3, foe 265→250).
- **Real UI (muted, one tab, headless)**: `ui_playthrough.py --secret` (new `--deep`/`--secret` flags) OK in 1559 s — 6 acts, Act 4–6 bosses, secret fight, final choice, ending, 0 console errors. Recruit scenes of Io/Miro/Doyun/Bel/Rem: 3 choices, close, impression stored. Recruit approval line uses `josa`.
- Gates: `make check` green (node 394, Python 338). Music room: 18 track files present; **playback unverified** (tests stay muted). Preview `00154-lom` (`910834b`) deployed, `make verify-preview` 5/5, not promoted; `00153-tuv` predates the fix.

Older entries: `bin/docs/archive/` (newest: `progress-2026-10-26-dlc-r1-r7.md`).

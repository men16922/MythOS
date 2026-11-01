# Progress archive (2026-11-01 budget trim)

## 2026-10-31 — `make url-smoke` + next update plan (Claude, owner: "다음 업데이트 계획")

- **Added** `scripts/dev/url_smoke.py` / `make url-smoke URL=…`: a sandbox fight and a short run through real clicks on any deployed URL, without the dev-only `window.__m2`. On production `00167-yuh`: both PASS, 0 console errors (failed-resource lines are filtered). Anonymous clients send no saves or GM calls under `auth: google` (`net/api.ts` `identityHeaders`; a network capture of the run start saw only `GET /api/v2/config`). Not covered: sound, sign-in.
- **Plan**: `docs/plans/2026-10-31-next-update-plan.md` ("청구서", a cut W1), proposal only; the hold on new content stands until the owner's verdict.
- **Slip**: `2986cc5` reached `main` with `check-doc-budget` red (gate chained with `;`), fixed by `3b3ce54`.

## 2026-10-31 — Baseline re-check at `d59cb0d` (Claude Opus 5.5, /sync follow-up)

- **Verified**: `make check` green (node 458, Python 338); `make playthrough-quick` OK in 122 s (muted, local). Fixed `AGENT_BRIEF.md`: Argon's fix is `6850225`, not the pre-rebase `a4c31d9`.
- **Production** `00167-yuh` (muted headless, anonymous): sandbox fight won (enemies→1hp, turn 5); a click-only run (no dev hook) went setup → intro → event → recruit → directive → map → fight → defeat → Archive. 0 console errors. Unverified: Google sign-in, sound.


# Progress archive (2026-11-01 budget trim)

## 2026-10-31 — `make url-smoke` + next update plan (Claude, owner: "다음 업데이트 계획")

- **Added** `scripts/dev/url_smoke.py` / `make url-smoke URL=…`: a sandbox fight and a short run through real clicks on any deployed URL, without the dev-only `window.__m2`. On production `00167-yuh`: both PASS, 0 console errors (failed-resource lines are filtered). Anonymous clients send no saves or GM calls under `auth: google` (`net/api.ts` `identityHeaders`; a network capture of the run start saw only `GET /api/v2/config`). Not covered: sound, sign-in.
- **Plan**: `docs/plans/2026-10-31-next-update-plan.md` ("청구서", a cut W1), proposal only; the hold on new content stands until the owner's verdict.
- **Slip**: `2986cc5` reached `main` with `check-doc-budget` red (gate chained with `;`), fixed by `3b3ce54`.

## 2026-10-31 — Baseline re-check at `d59cb0d` (Claude Opus 5.5, /sync follow-up)

- **Verified**: `make check` green (node 458, Python 338); `make playthrough-quick` OK in 122 s (muted, local). Fixed `AGENT_BRIEF.md`: Argon's fix is `6850225`, not the pre-rebase `a4c31d9`.
- **Production** `00167-yuh` (muted headless, anonymous): sandbox fight won (enemies→1hp, turn 5); a click-only run (no dev hook) went setup → intro → event → recruit → directive → map → fight → defeat → Archive. 0 console errors. Unverified: Google sign-in, sound.

## 2026-10-31 — Independent DLC 2 proposal (Claude overnight)

- **Changed**: `docs/plans/2026-10-31-dlc2-proposals/claude.md` (Korean, nine required headings, systems/balance/build-cost lens): verified from `v2/engine` and `v2/content` that the ultimate-evaluation bot path (`combatSim.ts:54-64`/`:158-198`) scores zero for draw/energy/movement while the card-evaluation path (`:287`) adds a `2 * Δhand + 2.5 * Δenergy` tempo term for the same resources, that Paradox 10 (`content/paradox.ts:61-65`) duplicates Paradox 4's flat `+1` enemy damage (`engine/combat.ts:168`) under a new name, and that the anomaly mixer's 12 world-anomaly mutators are all pure gain+cost with no curated synergy pairs (`DECISIONS.md` 2026-10-29). Proposed: fix the evaluator asymmetry, de-duplicate Paradox 10, write the "isolate-measure a rule-breaking item" lesson into Done criteria, add mutator synergy-pair metadata, one small reversible "debt" forbidden implant, and DLC 2 《세계:접속 — 청산선 (Settlement Line)》 — a horizontal, no-new-act rule (energy overdraft → a fourth DoT-pattern status that carries into the next fight) as the deliberate opposite of Deep Signal's vertical scale-up. Own seed marked `[x]` in `docs/NEXT_PLAN.md`.
- **Slip**: opened `argon.md` while reading `docs/plans/2026-10-31-dlc2-proposals/BRIEF.md`'s read-first docs before noticing the brief's own independence rule forbids it; the proposal was written fresh against the repo to avoid copying Argon's diagnosis, framing or DLC concept, but the read itself cannot be undone. Lesson recorded in `docs/LESSONS.md`.
- **Verified**: `make check` green. Unverified: owner feel/verdict and the merge across all three proposals.

## 2026-10-31 — Independent DLC 2 proposal (Gemini 4 Argon / agy overnight)

- **Changed**: `docs/plans/2026-10-31-dlc2-proposals/argon.md` (113 lines, Korean, nine required headings): reverse-engineered `v2/engine`, `v2/content`, `branch 1.0`, and 90-run reachability (`starterRuns: 45/90` vs `nonStarterRuns: 5/90` with 6/9 non-starter evolutions at `0/90`, 8/12 duos and 5/11 companion ultimates having effects ignored by `combatSim.ts` `spendGauge`/`evaluate`, and 0 neutral/survive objectives across all 47 Acts 4–6 encounters + 0 CRPG districts in Acts 5–6). Proposed reachability/evaluator fixes, interactive board cores, and DLC 2 《세계:접속 — 역류 (Counter-Signal)》 (parallel 3-act campaign with Lit/Dark grid illumination) starting with an art-free `proto_blackout` sandbox prototype. Own seed marked `[x]` in `docs/NEXT_PLAN.md`.
- **Verified**: `make check` green; `10-diff-scope` and `40-image-identity` clean. Unverified: owner feel/verdict and Claude's merge.

## 2026-10-31 — Independent DLC 2 proposal (Astra / Codex overnight)

- **Changed**: `docs/plans/2026-10-31-dlc2-proposals/astra.md`, a Korean proposal with nine required headings (131 lines): existing protection feedback first, then an art-free civilian damage-redirection prototype and a bounded replacement chapter. Own seed marked `[blocked]` in `NEXT_PLAN.md`; one sandbox lesson recorded; no runtime changes.
- **Verified / Blocked**: read-back, nine headings, five-line summary, under-200-line limit and citation paths checked; lint/types/build and node 458/458 passed. `make check` exited 2: Python ran 338 tests, 12 skipped, 3 errors, all `test_verify_preview` at line 39 (`socket.bind`, `PermissionError: [Errno 1] Operation not permitted`). Isolated discovery reproduced 3/3 errors. `10-diff-scope` passed before the blocker note; final scope/budget checked before the blocked commit.
- **Limits / Next**: proposal only; implementation, fun, balance, tone and art acceptance unverified. Resume by rerunning `make check` in an environment permitting loopback binding, then mark the seed done only on exit 0. Claude's merge and the owner's content verdict remain separate.

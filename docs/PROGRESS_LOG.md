# Progress Log

Last updated: 2026-10-31

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

## 2026-10-31 — `make url-smoke` + next update plan (Claude, owner: "다음 업데이트 계획")

- **Added** `scripts/dev/url_smoke.py` / `make url-smoke URL=…`: a sandbox fight and a short run through real clicks on any deployed URL, without the dev-only `window.__m2`. On production `00167-yuh`: both PASS, 0 console errors (failed-resource lines are filtered). Anonymous clients send no saves or GM calls under `auth: google` (`net/api.ts` `identityHeaders`; a network capture of the run start saw only `GET /api/v2/config`). Not covered: sound, sign-in.
- **Plan**: `docs/plans/2026-10-31-next-update-plan.md` ("청구서", a cut W1), proposal only; the hold on new content stands until the owner's verdict.
- **Slip**: `2986cc5` reached `main` with `check-doc-budget` red (gate chained with `;`), fixed by `3b3ce54`.

## 2026-10-31 — Baseline re-check at `d59cb0d` (Claude Opus 5.5, /sync follow-up)

- **Verified**: `make check` green (node 458, Python 338); `make playthrough-quick` OK in 122 s (muted, local). Fixed `AGENT_BRIEF.md`: Argon's fix is `6850225`, not the pre-rebase `a4c31d9`.
- **Production** `00167-yuh` (muted headless, anonymous): sandbox fight won (enemies→1hp, turn 5); a click-only run (no dev hook) went setup → intro → event → recruit → directive → map → fight → defeat → Archive. 0 console errors. Unverified: Google sign-in, sound.

## 2026-10-31 — Fix `loops: 1` sim companion default & phone portrait ultimate HUD overlap (Gemini 4 Argon)

- **Diagnosed & fixed (`loops: 1` sim drop)**: `newRun` forces `FIRST_COMPANION` (`se_rin`) on `loop === 1` (`profile.loops === 0`), while `loop >= 2` reads `opts.companion`. In the UI (`SetupScreen.tsx`), `compId` defaults to the first unlocked companion (`se_rin`), whereas `simulateRun` left `opts.companion` `undefined` — silently turning any `loops >= 1` profile sim into a solo Act 1 run (3-archetype mixed: `57 → 40 / 150`; 5-archetype: `50 → 42 / 150`). `simulateRun` now defaults `opts.companion === undefined` to `unlockedCompanions(profile, C)[0] ?? null` (`null` still runs solo), restoring `57 → 57 / 150` (hash-identical to `loops: 0`) with a regression test in `runSim.test.ts`.
- **Phone portrait ultimate HUD (`phone.css`)**: when `.m2c-momentum.is-ready` is active, `.is-port .m2c-bottom` now places `mom` (`.m2c-ults` + `.m2c-sigburst` in a single horizontal row) into Row 3 (`'orb mom mom end'`) and keeps `draw`, `piles`, and `items` in Row 2 (`'draw piles items items'`), eliminating the `position: absolute` overlap over the hand cards on both `390×844` and `375×667` (KO + EN across all 5 archetypes).
- **Verified**: `make check` green (node 458, Python 338); `make test-e2e-v2` OK (daily replay verified); muted headless Playwright bounding-box & screenshot checks (`outputs/qa_phone_ults_390x844.png`, `outputs/qa_phone_ults_375x667.png`, 0 console/page errors).

## 2026-10-31 — Production promoted to `00167-yuh` (Claude Opus 5.5, owner: promote)

- `00167-yuh` (`git-sha=7cc9ef5`, F1–F4 + Argon fixes) at 100 % `LATEST` (`--to-latest`, rollback `00160-qiy`). Owner promoted without the hands-on verdict; that check and art approval stay open.
- Verified: `make verify-preview` 5/5 before; production 4/4, served content chunk = committed, 4 new images 200, 0 ERROR log lines on the revision right after. Unverified: a played fight and Google sign-in on the production URL; sound.

## 2026-10-31 — Argon's review of F1–F4: fixes (Claude Opus 5.5, owner: have Argon judge it)

- **Review**: Gemini 4 Argon, read-only, report `outputs/agy/f1-f4-verdict.md`. An agent's verdict, not the owner's feel check. About half checked out: its implant ranking and duo notes describe effects that do not exist in the content, and its `glass_circuit` 40 / 40 predates the retune, so those parts were dropped. Each claim below was confirmed in code or on screen first.
- **Fixed**: a gate closing on a boss lost its payout and on an elite shared one pick, and plain boss implants could appear: the gate is now its own pick of forbidden implants (`noiseChoices`, `takeNoiseImplant`). Both duo lines show. The third ultimate no longer runs off the screen. `overtuned_laser` was identical to `target_laser+`, now adds 3 damage; `flurry` 3 × 2 → 4 × 2. Scramble has a HUD badge, the replica a red mark on the board, the evolution note names its recipe, the codex scrolls to the chosen list. Redrawn: `duo_same_dream`, `duo_overdue_reader`, `duo_warm_circuit`, `duo_burned_ledger`, `noise_gate_record`, `overtuned_laser`, `heart_overload`.
- **Balance** (canonical 3 × 150): the full payout read 207 / 450 = 46.0 %, over the band, so the gate now costs 8 HP (was 6): 202 / 450 = 44.9 %, in band. `hollow_world`: restoring a heal read 59.8 %, so it stays as it was at 53.3 %; Argon's "trap" call does not match the numbers.
- Not changed: weak duos and evolutions Argon named, phone ultimate chips over the hand, Omega's reboot staying a banner, and its "too strong / too weak" calls that rest on feel.

## 2026-10-31 — F3 IX interference + replica, F4 card evolutions + best turn (Claude Opus 5.5, `/goal`, plan defaults)

- **What**: IX bends the game at boss phases (`phases[].glitch`, `engine/effects.ts glitchActive`): card names masked, pushes reversed through the next player turn (HUD badge, previews agree), Omega's fake restart using the 1.0 boot lines. IX's replica of last loop's killer (non-boss, HP ×1.3, damage +1, 80 ₵) at the first elite from Act 2, named in the fight intro and on the unit. 12 card evolutions (`content/evolutions.ts`, card + implant, secret, map note, codex tab). Best turn (damage + kills × 6) on the ending and in the share text. 12 Codex card images, `scripts/v2_assets/gen_evolved_cards.py`.
- **Changed from the plan**: best turn is a text line, not an animated replay. The replica is a single authored reappearance with no hierarchy (Nemesis patent caution, plan §F3); review before any paid release.
- **Balance** (canonical 3 × 150): without F3/F4 187 → with 197 / 450 (43.8 %, band OK). Replica cost measured separately: 41 → 36 / 150 on a `loops: 1` profile. That profile alone reads 54 → 41 / 150 against a fresh one, unrelated to this work and not investigated.
- `9e89e58` reached `main` and a preview with `make check` red (an empty card upgrade; a one-line command chained past the failure); fixed in the next commit, production untouched.
- Gates after the fix: `make check` green (node 457, Python 338); `make playthrough-quick` OK; `make test-e2e-v2` OK; real UI: reverse badge + mask at IX, replica intro + stats, evolution note + deck swap, 0 console errors. All 12 duo cut-ins seen through a real fight; `night_watch` art regenerated twice (face hidden by the band, then an off-tone pose).
- Real UI after the fix: evolved card in a hand; a played card crossing IX's phases (47 → 42 HP, reverse active); Omega's reboot banner through a played card and its animation; final `night_watch` cut-in, 0 console errors.
- Unverified: sound; feel; a real fight and sign-in on the preview or production. Art unapproved: 27 + 12 images. Not promoted.

## 2026-10-31 — F2 duo ultimates: twelve pairs (Claude Opus 5.5, owner: proceed without the F1 verdict)

- **What**: `content/duos.ts`: 12 pairs with a history (every companion in at least one). With both standing and a full gauge the duo joins the options under the key `duo:<id>`; same gauge, once per fight, fired from `pair[0]`. Cut-in with its own illustration (`v2/ult/duo_<id>.webp`, 12 Codex images, `scripts/v2_assets/gen_duo_art.py`, owner art approval pending), both names, one spoken line. Found duos go run → `profile.duos`, Archive codex tab "듀오" (unfound = ???).
- **Changed from the plan**: no 12 new SFX, the pair's two existing ultimate cues play 420 ms apart; no separate first-time cutscene, the line sits under the cut-in and both lines live in the codex (low fatigue).
- **Balance**: standard canonical 3 × 150 187 → 187 / 450; all companions unlocked 317 → 318 / 450; a duo fired in only 7 / 450 bot runs, so the run sim says nothing about their strength. Forced pairs (12 Act 3 fights × 6 seeds, greedy, gauge full at the start, solo ultimates → duos): win rates equal for 11 pairs, +0.01 for `how_to_stand`; largest gains HP lost `red_ink` 3.2 → 1.9, `same_dream` 2.5 → 1.4. No duo dominates; the greedy bot does not pick every duo when a solo option scores the same.
- Gates: `make check` green (node 444, Python 338); `make playthrough-quick` OK (172 s); `make test-e2e-v2` OK; real UI desktop + 390 px: duo button, cut-in, line, gauge spent, `duosFired` kept after the fight, Archive duo tab (1 found, 11 ???), 0 console errors, no overflow.
- Unverified: sound (muted); 11 of the 12 cut-ins seen only on a contact sheet, not in a fight; art and feel need the owner. Not promoted.

## 2026-10-30 — F1 "the run changes": forbidden implants, noise gates, event rotation (Claude Opus 5.5, owner: "fun first", `/goal`)

- **What** (`docs/plans/2026-10-30-next-content-expansion-plan.md` F1): 12 boss-rarity implants that change a rule (`ImplantDef.rules`, `engine/implantRules.ts`); 3 noise gate events (`content/eventsNoise.ts`: −6 HP, this act's mutator for 3 wins, then 2 forbidden implants added to that reward); maps prefer events not seen in the last 2 normal loops (`profile.recentEvents` → `run.staleEvents`, never on a daily). 15 Codex images (0 GCP). HUD chip shows the wins left; option hints now wrap on phones.
- **Tuning from the sim** (start-of-run holder, mixed, 100 runs, base 52): first cut `overload_buffer` 0, `debt_clock` 27, `empty_handed` 26, `corpse_fuel` 29, `echo_wedge` 74 → retuned to 42 / 45 / 37 / 35 / 57; others chain 46, black pact 38, weightless 51, glass 64, pyre 44, hollow 60, wall 47.
- **Balance** (same seeds, before → after): **canonical blocks (`100000·block + i`, 3 × 150) 196 → 187 / 450 = 43.6 → 41.6 %, inside the 35–45 % band**; after raising the cost of Glass Circuit (65.8 → 55.3 % held from turn 1) and Hollow World (59.6 → 53.3 %), measured on the same 450 seeds; an ad-hoc block of seeds 1000–3099 reads higher, 152 → 154 / 300, do not compare it with the band; parts on an earlier tuning: implants only 151, gates only 142; greedy 58 → 56 / 60; greedy P5 56 → 52 / 60; Deep Signal mixed 25 → 22 / 75. The bots do not plan around the new rules, so these bound the content, they do not measure it. Map rolls change for existing seeds, as with any event addition.
- Gates: `make check` green (node 440, Python 338); `make playthrough-quick` OK (199 s); `make test-e2e-v2` OK (daily replay verified); real UI desktop + 390 px: gate hint + HP + mutator chip, noise-paid reward + pick, two full fights holding six rule implants (Hollow World voids on the board), 0 console errors, no horizontal overflow.
- Per-implant table + criteria check: plan §F1. Greedy P5 per implant 31–40 / 40 against base 37 / 40: greedy sits near its ceiling and hid that strength: judge dominance on mixed 450. A gate played to its payout through real fights in the real UI (3 wins → pick → installed → chip gone, 0 console errors), with the gate entered from a forced event screen.
- Gate rolled and taken naturally in 29 / 150 mixed-bot runs; real UI entered through a map node click (node placed by the test).
- Unverified: sound; every rule's feel. **Owner fun check (plan §F1 criterion) is open** and blocks F2–F4. Not promoted.

## 2026-10-30 — Production promoted to `00160-qiy` (Claude Opus 5.5, owner OK)

- Status: achievements (64), bestiary / card codex, anomaly mixer and road recruits are live; production was on `562d220` before this.
- Changed: `make deploy-preview` → `00160-qiy` (`git-sha=5bdd23f`); owner approved; promoted with `--to-latest` (100 % `LATEST`, rollback `00158-roq`). `docs/test/mythos2_fun_check.md` gains Deep Signal + Archive sections (stun, ultimates, 11 cues, road recruits, mixer rules, achievement wording, codex). `STATUS.md` corrected: 64 achievements, stale "`make test-e2e-v2` unverified" removed.
- Verified: `make check` green (node 419, Python 338, 12 DB tests skipped), `make frontend-build` left the tree clean, `make verify-preview` 5/5, `verify_preview.py --url <production>` 4/4 (bundle = committed), 4 road-recruit images 200 on the preview, headless muted 390 px load 0 console errors, 0 ERROR log lines on the revision right after promotion.
- Verified after promotion, at `5bdd23f` on a local server: full Deep Signal run through the real UI (`ui_playthrough.py --deep`, assist mode, muted, headless) OK in 1420 s, victory, ending `ending_noble_sacrifice`, 0 console/page errors.
- Unverified: a played fight and Google sign-in on the production URL; a bot-taken road recruit (the bot picks the first open option = a decline, and its log does not name events, so a natural road-recruit scene is still unconfirmed); all sound, and fun/difficulty (owner).
- Next: owner plays Deep Signal to Act 6 with `docs/test/mythos2_fun_check.md`.

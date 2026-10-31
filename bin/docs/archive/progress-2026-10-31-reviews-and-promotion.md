# Archived progress entries

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


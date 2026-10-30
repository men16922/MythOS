# Progress archive — 2026-10-27

Moved from `docs/PROGRESS_LOG.md` on 2026-10-30 (budget).

## 2026-10-27 — Production: `00154-lom` promoted (Claude Opus 5.5, owner call)

- `gcloud run services update-traffic mythos-api --to-latest` → `00154-lom` (`git-sha=910834b`, Deep Signal DLC R1–R7 + secret-fight fix) at 100 % `LATEST`; rollback `00150-qen`. Checked: `/api/health` 200, served `App2.js`/`CombatScreen.js` hashes = committed bundle, no `src/` changes since `910834b`. Unverified: sign-in and a played run on the production URL after promotion.

## 2026-10-27 — Deep Signal real-UI pass: secret-fight lock fixed (Claude Opus 5.5)

- **Bug (fixed)**: the secret First Connector fight follows the Act 6 boss on the same `combat` screen, so `CombatScreen` kept the won fight's `ending` lock — hand greyed, no input. `GameShell` now keys `CombatScreen` by `encounterId` (fresh state, boss splash and intro). Repro fails without the key, passes with it (turn 2→3, foe 265→250).
- **Real UI (muted, one tab, headless)**: `ui_playthrough.py --secret` (new `--deep`/`--secret` flags) OK in 1559 s — 6 acts, Act 4–6 bosses, secret fight, final choice, ending, 0 console errors. Recruit scenes of Io/Miro/Doyun/Bel/Rem: 3 choices, close, impression stored. Recruit approval line uses `josa`.
- Gates: `make check` green (node 394, Python 338). Music room: 18 track files present; **playback unverified** (tests stay muted). Preview `00154-lom` (`910834b`) deployed, `make verify-preview` 5/5, not promoted; `00153-tuv` predates the fix.

Older entries: `bin/docs/archive/` (newest: `progress-2026-10-26-dlc-r1-r7.md`).

## 2026-10-27 — Stun, wall-bump stuns, companion ultimates, full-screen ult cut-in (Claude Opus 5.5, owner request)

- **Stun** (`stun`, new status, never stacks): cancels an enemy's telegraph on the spot and it sits out the next enemy turn (no move/telegraph; elites/bosses re-telegraph at its end); a stunned party unit cannot move or play cards. `push.stun` stuns the pushed unit when it bumps a wall/cover/unit. Sources: **Concussion Kick** (common, any), **Pinball Slam** (rare, any), Ghost burst "Void Collapse" (+stun on bump), Tae-o / Rem ultimates. Codex art: 2 cards + `status/stun.png` (0 GCP).
- **Companion ultimates** (`CompanionDef.ultimate`, all 11): same Momentum gauge as the Signal Burst — when full, pick the burst or one standing companion's ultimate (once per fight, cast from the companion). `ultimatesReady` / `fireBurst(c, C, companionUid)`; replay records the uid. Sim bot spends the gauge on the best-scoring option.
- **Full-screen cut-in** for every burst/ultimate (flash, letterbox, speed lines, sweep, big portrait; gold = burst, cyan = companion; reduced-motion keeps only the banner). Phone portrait: ultimates float as round portrait chips over the momentum cell; Korean burst names no longer break per syllable (`keep-all`).
- **Sim** (mixed, same seeds; base → new): standard 3 × 150 41.8 → 41.3 %, ghost 3 × 150 44.7 → 48.7 %, Deep Signal 90 runs 25.6 → 23.3 %, greedy P5 90.0 → 89.3 %, basic 0 → 0 %. Pinball Slam as a ghost-only uncommon read +11 pts for ghost, but a no-effect dud card in the same slot read +8 (pool-composition artifact); as an any-pool rare it is neutral.
- Gates: `make check` green (node 400, Python 338); `make playthrough-quick` OK (146 s); sandbox screenshots (desktop + 390 px phone) of chips, both cut-ins and stun icons, 0 console errors. `make test-e2e-v2` **fails at map → combat on HEAD too** (pre-existing: it assumes the first reachable node is a fight). Feel/clarity of stun and the cut-in: **owner verdict pending**. Not deployed.

## 2026-10-28 — Ultimate illustrations + louder cut-in (Claude Opus 5.5, owner request)

- **16 ultimate illustrations** (Codex image, 0 GCP): `v2/ult/<id>.webp` 1280×720 for all 11 companion ultimates and 5 archetype bursts (`scripts/v2_assets/gen_ult_art.py`, refs = portrait + full-body sprite). Manifest group `ART.ults`; `art.test` requires one per companion and archetype.
- **Cut-in**: the illustration slams in on a skewed glowing band (overshoot, Ken Burns drift, an inverted impact frame, collapse-to-a-line exit), colour stripes, a shockwave ring, 8 radial shards, one flash; the name sits on the band's lower edge in a large italic chromatic title. After the cut-in a release shockwave (wave + nova + ring + shake) fires from the caster. 1.4 → 1.6 s. Phone portrait: shorter band higher up. Reduced motion: static band + banner only.
- **Owner pass 1** ("Se-rin / Doyun look out of proportion; bring out character; a bit less flashy"): all 16 regenerated with eye-level natural proportions (no wide-angle foreshortening), each pose built on the character's bond lines (Doyun = an ordinary survivor who "knows how to stand"), one restrained effect; cut-in toned down (fewer shards, fainter lines, no exit flash), band framed on the upper third.
- Gates: `make check` green (node 401, Python 338); sandbox screenshots desktop + 390 px phone (Se-rin / Doyun ultimates, Ghost burst), 0 console errors. Owner: redone art approved. Preview `00156-fuj` (`git-sha=ed5a6cb`) deployed, `make verify-preview` 5/5, `v2/ult/doyun.webp` + `status/stun.png` served 200; **promoted 2026-10-28** (`--to-latest`, 100 %; production health 200, served `CombatScreen.js` = committed; rollback `00154-lom`). Unverified: sign-in and a played fight on the production URL.

## 2026-10-28 — Companion ultimate signature SFX (Claude Opus 5.5, owner request)

- 11 procedural cues `ult_<companion>` in `sfx.ts` (`ULT_SFX` map), one per ultimate, matching its scene (Se-rin undertow surge + dash, Tae-o charge + shield slam, Han keystrokes + lock-on, Su-ah anvil strikes, Kai rail charge + shot, Lin-yue coin shower + register, Io page riffle + glass bells, Miro "shh" + three swishes, Doyun barrier hum + deflections, Bel pen scratch + hiss, Rem clock ticks + slowing hush). Archetype bursts keep their `burst_*` cues. `audio-cues.test` checks every companion has a distinct cue that plays.
- Gates: `make check` green. Sound itself **unheard** (automation stays muted): owner listen check pending. Preview `00158-roq` (`git-sha=562d220`) `make verify-preview` 5/5 → **promoted 2026-10-28** (`--to-latest`, 100 %; production health 200, served `CombatScreen.js` and the cue chunk = committed; rollback `00156-fuj`).

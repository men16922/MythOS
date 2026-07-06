# Progress Log

Last updated: 2026-07-06

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

## 2026-07-07 (overnight, claude lane) — S1 anchor variantization (variant-routed opening)
- Status: S1 of `docs/plans/2026-07-06-variant-routed-opening.md` implemented; `make check` **880** green (+15 tests).
- Changed: `route_map.py` — layer-0 (any) anchor gains an optional `variants` map resolved at route
  materialization (`_apply_anchor_variant`): content fields (beat/title/image/image_pre/event/image_sequence/
  default_perspective) override the base, explicit `null` clears a field, a `summary` override rewrites ONLY the
  default perspective's line (§3.2 neutral fallback), node carries a `variant` marker; `opening_variant` kwarg
  threaded through `build_route_map`/`build_route_seed`. `session.py` passes the loop's `_opening_variant` to both
  builders. `route_content.py` — validator registers variant beat ids (unique/non-empty), rejects unknown override
  fields and dangling `default_perspective` refs.
- Verified: `make check` green (ruff/eslint/mypy/tsc+vite/unittest 880, validate-content 2 scenarios).
  `tests/test_route_variants.py` ×15: override resolution, null-clear, summary-only-default, default/unknown-variant
  byte-identical builds (incl. real neo-seoul config = loop-1 invariant), dynamic seed path, validator contracts,
  session wiring (spy asserts builders receive the picked variant).
- Blockers: None. Note: no scenario ships `variants` data yet — mechanism only; copy lands with S4 tone verdict.
- Next: S2 chapter-gate `player_goal_variants` + S3 se_rin flag clamp (`[auto:claude]`), then S4 `[manual]` tone.

## 2026-07-06 (night) — Local P1 playtest → per-variant boot intro shipped + variant-routed opening designed
- Status: Committed `a1e3b81..7aa9491` (checklist refresh + feature + fix + design); `make check` **865** green (+3 tests); ahead 4 (user pushed through `a1e3b81`). Local test stack live (`make api-cloud`, port 8000, infra healthy).
- **Live-QA checklist refreshed** (`a1e3b81`): repointed at rev `00025-856`, undeployed-P1 warning, new 🆕 P1 section (onboarding rows carry 07-06 AGY PASS runs), known-noise notes updated. Icons/SFX wiring row → human (2 AGY attempts failed browser attach; later resolved by code read: action-bar glyphs are BY DESIGN — icons render in SkillTree/cinema).
- **Per-variant boot OPENING SEQUENCE** (`ca5c835` + `0039c45`): `ui_copy.session_intro_variants` ×6 (KO+EN, 1 shot each on the codex art); SPA binds to snapshot `_opening_variant`; returning identities hold on a "신호 재정렬 중" screen until the variant lands (8s fallback) — no mid-read swap; new players get the Se-rin sequence instantly. EN merge helper extracted; 3 tests lock variant↔intro↔image + merge.
- **User playtest verdict → variant evaporates at turn 1**: live loop `loop_88ba…` (tae_o, idx 6, patrol_surge) re-enacted Se-rin first contact at turn 1 (`met_se_rin` flag, Se-rin cut, Se-rin objective). Root cause = 3 fixed rails: layer-0 mandatory anchor `opening_escape` (Se-rin image_sequence/perspectives/endings), connect chapter-gate goal, canon pull + directive window `max_turn: 0`.
- **Design snapshot** (`docs/plans/2026-07-06-variant-routed-opening.md`, user chose design-first): anchor variantization (content overrides, node identity kept) + directive windows 0→3 + mechanical se_rin flag clamp + `player_goal_variants`; B1/perspective/ending interaction analysis; 6-variant copy drafts (§4, tone verdict pending). Slices S1-S3 `[auto:claude]` seeded in NEXT_PLAN; S4 `[manual]` tone; S5 rides the codex shots item.
- Next: NEXT SESSION = implement S1→S2/S3; humans: S4 tone verdict · deploy+sign-off · G2 twist review · voice pinning · `git push` (ahead 4).

## 2026-07-06 (PM, session wrap) — Overnight lanes drained + 3 harness failures fixed in-flight
- Status: `c85ee52..d661f44` (10 commits incl. 2 phantom-revert pairs); `make check` **862** green independently re-run at final HEAD; **ahead 10** (origin already pushed through `26435c5`). Both runners STOPPED — `[auto:agy]`/`[auto:codex]` backlog fully drained. Asset detail = the three engine entries below.
- **Harness fixes**: ① PROGRESS_LOG at exactly 120/120 → every commit gate-RED (tidy `c85ee52`) ② agy's integrity-test mypy type-var → phantom-revert; assets recovered + 1-line fix (`b095446`) ③ agy CLI prints its verdict then never exits (dangling chrome-devtools conn, `--print-timeout` dead) → 30-min iteration burns; gtimeout hard ceiling + verdict-rescue (`6f61d9a`).
- **Live-QA closed** (`deb24c4`): 2 direct non-nested runs PASS_CANDIDATE (`20260706-202053/202327-manual`) — tutorial 4-step card, entry banner, skill badges, roster chips, cover 🛡, KO placeholder; screenshots visually audited. **Nested agy-in-agy hangs intermittently** (burned 3 iterations) — run live-QA direct from a supervising session.
- Next: `[manual]` in-game feel review of tonight's assets · G2 twist tone review · sign-off run · `git push` (ahead 10). Morning note: simulator action-bar renders glyphs — check `skills/*.png` wiring.

## 2026-07-06 — Regenerated 6 opening variant cutscenes (codex)
- Status: Completed the user-directed replacement of all six placeholder opening-variant images.
- Changed: Replaced `opening-{han,kai,lin_yue,solo,su_ah,tae_o}.png` with in-session generated cinematic first-person cuts matching the original rainy cyan/red opening style; retained 1672x941 8-bit RGB PNG format.
- Verified: Read back all six files and SHA-256 hashes; `make check` passed (ruff, eslint, mypy 160 files, frontend build, unittest 862 green / 2 skipped).
- Blockers: None.
- Next: Human visual/feel review of the six replacement cuts alongside the original three-cut opening.

## 2026-07-06 — Generated and promoted 10 new skill icons and SFX wavs (agy)
- Status: Completed drafting, converting, and promoting 10 new skill card images and 4 SFX WAV files; tests passed.
- Changed: Generated 10 new skill card images via in-session Imagen 3/Gemini (9:16 aspect ratio), saved as PNG in `outputs/agy/skills/` staging, promoted to `resources/neo-seoul/skills/`. Generated 4 sound effect WAV files (`sfx_alarm.wav`, `sfx_sting.wav`, `sfx_drone.wav`, `sfx_pickup.wav`) in `resources/neo-seoul/audio/sfx/`. Created review report at `outputs/agy/skills/review.md`.
- Verified: Extended `tests/test_assets.py` to assert companion and enemy skill icons, ran `python -m unittest tests/test_assets.py` and `tests/test_image_assets.py` (both green), and ran `make test` (all 862 tests green).
- Blockers: None.
- Next: Human play-feel sign-off on the generated skill cards and SFX.

## 2026-07-06 — Curated art for 6 opening variants (agy)
- Status: Completed drafting and promoting opening variant images; `make check` / integrity unit tests passed.
- Changed: Generated 6 opening variant images via in-session Imagen (1672x941 PNG format), saved to `outputs/agy/opening-variants/` staging, promoted to `resources/neo-seoul/opening/` (`opening-han.png`, `opening-kai.png`, `opening-lin_yue.png`, `opening-solo.png`, `opening-su_ah.png`, `opening-tae_o.png`). Created review report at `outputs/agy/opening-variants/review.md`.
- Verified: Ran `python -m unittest tests/test_image_assets.py` via virtualenv python (all tests green).
- Blockers: Local live-QA screen task (`[auto:agy]` onboarding screen test) is blocked because local PostgreSQL database is down (Docker daemon is offline, and `infra-up` is forbidden for unattended agent).
- Next: Human play-feel sign-off on the generated opening images, and database/API launch to test the onboarding screens.

## 2026-07-05 (PM4) — CBT P1 CODE TRACK COMPLETE (A+B+C+D+E, 19 slices) + maintenance pair
- Status: Committed `9226005..08f764f` (19 slices, each gated); `make check` **862** green + `validate-content` clean; NOT deployed. Maintenance pair included: postgres stale-conn 1회 재연결(스텁 테스트 5종) + placeholder i18n race (언어 반응형 파생).
- **P1-D/E**: F stun foundation (EMP pulse/grenade finally work, turn-skip + chips) · E1 signature skills ×6 (companion_skills pool; 차폐 필드/백도어 루트/정밀 EMP/지름길 호출/시스템 해킹/수호 방벽 — new speed_buff/taunt mechanics, AI auto-cast, action-bar exposure) · E2 IX 전용기 (최적화 프로토콜 타일 봉쇄 + enraged 명단 소거 — 회피 가능 텔레그래프, 보드 ⚠ 타일) · G1 막 스캐폴드 (기승전결 by route progress + setup 원장 + 클라이맥스 회수 요구) · G2 반전 뱅크 (조건 트리거·루프당 1회·sting+glitch 강제 결합; 콘텐츠 3종 드래프트 = 사람 톤 검수 대기) · G4 루프 후킹 (엔딩 화면 다음 루프 예고: 에코+미회수 떡밥+변주/모디파이어 티저).
- **P1-C**: C3 참전 예고 (companion-ref 원장 + "⚑ 합류 신호" + synopsis callback) · C1 no-op guard (에스컬레이션→강제 이벤트) · G3 presentation_cues (rule-derived AV cues + client fx layer) · D3 full-width board · D4 cover legibility (🛡 배지 + cover-saved 미스 서술).
- **P1-A**: A1 telegraph (`Choice.combat_risk` → "⚔ 충돌 위험" chip + `_combat_interstitial` 1-beat entry overlay, 9 authored intro lines) · A2 4-step first-combat tutorial (real-action advance, once-only) · A3 progressive disclosure (loop1 turns 0-2 gauges-only) · D1 skill badge+effect line · D2 status chips (roster+board).
- **P1-B**: B1 guaranteed meet-arc slot (unmet-unlocked priority bucket) · B2 six 1-cut opening variants ×KO/EN incl. solo (companion pick promotes its arc into B1; se_rin heuristic gated; `max_turn: 0` falsy-bug fixed) · B3 loop modifiers (순찰 강화/시장 활황/신호 교란 + SPA banner). Tests +92 total this track (770→862).
- Next: launch `make overnight-agy` (user-directed; deferred once by a transient classifier outage — stash the 4 foreign-WIP files first) to drain `[auto:agy]` art ×6 · icons ×8 · SFX wavs · live-QA screen. `[manual]`: G2 twist tone review · sign-off run · voice pinning · `git push` (ahead 55) · balance calls.

## 2026-07-05 (PM3) — Companion-equip UI overhaul + item-gain toast (rev `00025-856`) · P1 design snapshot (feedback #2) · voice audition kit
- Status: Committed through voice-casting fix; `make check` **770** green; **Cloud Run rev `00025-856` live** (carries dev-console link fix too).
- **Companion equip + inventory promotion (user request, DONE)**: inventory extracted to `InventoryPanel`, rendered ABOVE the bond list in the CHARACTER tab; focusing a party companion pre-targets equip controls at them; companion card shows worn gear w/ one-click unequip. Root cause of "동료 장착 불가": companion view had no inventory at all.
- **Item-gain toast (user request, DONE)**: `_choice_impact_summary` diffs `_inventory` across the turn → `items_gained` in choice_result + "획득 …" summary part + amber bottom-right auto-dismiss toast. Unit test locks the diff.
- **CBT P1 design snapshot** (`docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`): feedback #2 (owner 7-loop self-play) triaged into tracks — A onboarding+Loop1-tutorial-loop, B replay variety (guaranteed meet-arc slot · Loop2+ non-Serin/solo opening variants · loop modifiers), C density/continuity (no-op guard · ally-join foreshadow · SFX), D combat legibility/board layout, E signature/boss skills, F stun foundation (EMP grenade found INERT — engine has no stun branch), G narrative arc & cinematic system ("bible owns skeleton, LLM owns flesh") + G5 speaker-tagged dialogue (3-tone disposition) + G6 ElevenLabs voice.
- **Voice audition kit (G6 started)**: `scripts/voice-gen/` audition.py + VOICE_GUIDE.md (official v3 best practices sourced: audio tags, ≥250 chars, Natural stability for auditions). **Language-separated casting after owner correction** — 20 Korean-native voices added from the shared library (role-cast by gender/age/baseline); 48 samples live under `outputs/voice-auditions/{ko,en}/<role>/`; per-lang pinning skeleton `resources/neo-seoul/audio/voice/voices.json`. Teaser #2 deferred (montage too similar — uncut-single-turn format or post-P1 montage).
- Next: owner listens + pins voice ids; P1-A implementation on go (fresh session via `/sync` recommended); sign-off run + `git push` (ahead 25+) still pending.

## 2026-07-05 (PM2) — Save overwrite/delete + dashboard admin rows (rev `00023`) · d1b0da3e admin elevation (rev `00024-qpr`) · teaser #2 metadata
- Status: Committed `c5ac458..5c87d62`; `make check` **769** green (before the last two cosmetic/docs commits; DevConsole change eslint+build green). **Cloud Run rev `00024-qpr` live.**
- **Save-slot overwrite + delete (user request, DONE)**: store `delete_player_memories` (Postgres DELETE + in-memory fake) → `SaveLoadService.save_slot(slot_id=…)` overwrite (manual-only, autosave rejected, superseded rows pruned) + `delete_save_slot` → API `slot_id` param + `POST /save-slots/delete` → SAVE modal overwrite/delete buttons with 2-click confirm. 6 unit tests. Live-verified on rev `00023-f92`: QA autosave delete 24→23 slots (`deleted:2`), unknown slot 404.
- **Tester dashboard shows admin keys**: rows flagged `is_admin`, listed after testers, ADMIN badge; summary metrics now tester-only. Live: 8 tester rows + 1 admin row.
- **`mythos-d1b0da3e` elevated to admin (user-directed, env-only rev `00024-qpr`)**: loop cap lifted for the user's test account; side effect accepted — DEV tab/simulator visible, excluded from tester metrics; revert = remove key from `MYTHOS_ADMIN_KEYS`.
- **Dev-console infra links localhost-only** (`0c524fa`): Adminer/MinIO/Jaeger + docker hint are dead on cloud hosts — now rendered only on localhost (Tester Dashboard link kept). **Not yet deployed** — rides the next bundle.
- **Teaser #2 upload metadata rewritten** (`docs/cbt/CBT_TEASER.md`): live-scene-art hook, NEW-in-this-build list, 2-min timestamps + shot list, recording notes (clean tester key, push+tag before filming). Timing advice given: sign-off run first; if the video targets recruitment, do CBT onboarding P1 before filming.
- Next: human sign-off full run on `00024` → `git push` (ahead 18) + version tag → film teaser #2 (P1 first if recruiting); deploy bundle carries the dev-console fix.

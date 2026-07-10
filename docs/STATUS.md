# Project MythOS Status

Last updated: 2026-07-10

## Current Baseline

Project MythOS is past local-playable MVP into a state where a React SPA + FastAPI API + Streamlit demo coexist. The core runtime is shared through a single `RuntimeSessionService`.

Major implemented axes:

- **Shared runtime/UI**: `RuntimeSessionService` is the single orchestration boundary for FastAPI REST/WS, React/Vite, Streamlit, and CLI.
- **Persistence/infra**: PostgreSQL is authoritative; MinIO/GCS store assets; OTel/Jaeger/Cloud Trace cover observability. Redis was removed 2026-07-04, so images generate synchronously in-request.
- **Narrative**: local development uses Ollama 8B storyteller + 3B parser with repair/fallback; the cloud product uses Vertex Gemini controlled generation. Prompt directives, Story Bible snippets, deterministic session synopsis, shard rollup, and outcome metrics are integrated.
- **Cloud model operations**: rev `00025-856` runs full `gemini-3.5-flash` + prompt diet (~$1.0/loop) + the 07-05 fix/feature batch (GCS presign IAM signBlob, simulator gating, save overwrite/delete, companion-equip UI, item toast). Optional `GEMINI_MODEL_KEYBEAT` routing implemented but **not enabled**.
- **Visuals**: local mflux/FLUX + Redux and cloud Imagen share the provider/storage boundary; curated scene/cutscene/ending art and synchronous generation are active.
- **Gameplay**: deterministic tactical combat, direct party control, companion growth/equipment, enemy intents, skills/items, combat cinema, rewards, boons, market/recovery, and IX boss flow are implemented.
- **Scenario/progression**: Neo-Seoul is the primary long-form scenario; route-node DAG + multi-perspective anchors + session memory, Story Bible, Codex, Run History, achievements, meta progression, save/load, and ending resolver are implemented. Glass Library is parity-ready but held.
- **Localization/CBT**: EN-default/KO bilingual UI+API+prompts, invite-gated stable identity, loop caps, Save/Load UX, and the Cloud Run closed beta are live.
- **Agent operations**: `make check`, content invariants, three-engine overnight lanes, semantic critic, AGY browser QA, and resume-pointer docs workflow are active.

Latest verified baseline:

- `make check` **862 green** + `make validate-content` clean (re-verified 2026-07-06 at `d661f44`).
- **Overnight lanes drained 2026-07-06 PM**: opening variant art ×6 (codex regen `d661f44`; agy draft superseded — user directive: curated key art = codex), skill icons ×10 + SFX ×4 (`b095446`), live-QA ×2 PASS_CANDIDATE (P1-A onboarding/combat screens + KO placeholder). All P1 `[auto:*]` items closed; remaining P1 work is `[manual]` only.
- **CBT P1 CODE TRACK COMPLETE 2026-07-05** (`9226005..08f764f`, 19 slices, not yet deployed): A onboarding (telegraph/tutorial/disclosure) · B replay variety (meet-arc slot/6 opening variants/loop modifiers) · C density (join signal/no-op guard/G3 cues/board/cover) · D+E identity (stun/signatures ×6/IX 전용기+텔레그래프) · E narrative arc (G1 막+setup 원장/G2 반전 뱅크/G4 루프 후킹) + maintenance pair (postgres retry, placeholder i18n).
- Cloud Run rev **`00025-856`**: presign hotfix + simulator gating + save overwrite/delete + dashboard admin rows + companion-equip UI overhaul + item-gain toast + dev-console link fix, live; `mythos-d1b0da3e` admin/cap-exempt (user-directed). Voice audition kit delivered (48 samples: KO natives / EN premades).
- Three AGY objective runs passed save/load restore, route pairing+horizon refresh, choice idempotency, support targeting, loot persistence, and equip/unequip. Remaining gate is human play feel.
- Completed detail is compressed in `docs/COMPLETED_SUMMARY.md` M35-M56; latest increments and exact measurements remain in `docs/PROGRESS_LOG.md` and dated plans.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

Direction remains global-first EN/KO closed beta: Gemini/Vertex is the product path; Ollama/FLUX remains the local development path. Deployment/onboarding/localization history is in `docs/COMPLETED_SUMMARY.md` M50 and M56.

1. **Auto tracks all drained (07-08)** — variant-routed opening S1-S4 (loop branches by variant end-to-end: anchor skin + goals + turn 0-3 directive windows KO/EN) + P1.5 clarity T1-T4a (identity-swap fix, WS responsiveness, fork-mirror contract, plain copy, axis affordances) + variant intro shot 03. `make check` **916** green; 2 AGY QA PASS (`20260708-062258/063004-manual`). Design `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md`.
2. **Mobile-UX day + Landscape Combat DONE 2026-07-08** — P1.5 mobile-first (Track M + T6 concise + T5 board), **Design-System Phase 0/1** (DS0 tokens · DS1a `Surface` · DS1b one `Popover`), **Landscape Combat LC0-6 (complete)**. `make check` **953** green. **Emulator-verified on the CLOUD build (not AGY)**: desktop unchanged + concise off-by-default; mobile portrait readable but combat=long scroll (concise only −10%); **landscape combat now the "board+actions one screen" bar is MET** — LC5 hides tab-nav + shrinks header (`body.combat-active`-scoped), LC6 leads the right column actions-first; verified @844×390 page **1.00× no page-scroll**, board fills full height (canvas ~297px), TARGETS/ACTIONS co-visible with the board. **Design-System DS0-DS3 COMPLETE 2026-07-09** (owner sign-offs): DS2 = all ~30 base `.panel` containers → `<Surface>` (invariant test-locked); **DS3a** compact-density mode (`body.concise-mode .surface` −4px app-wide, toggle COMPACT, 48px taps safe) + **DS3b** fixed-size combat inspector (always HP·Intent·Cover, 96px, no jump) — decision in `DECISIONS.md`. `make check` **956**, all emulator-verified. Still blocked for human: T5c (iso judgment). **Not real-device-tested.** Plans: `docs/plans/2026-07-08-{design-system,ds2-sample-migration}.md`.
3. **Human lane**: S4/T4 copy tone verdict, in-game 2회차 feel run (local `make api-cloud`), G2 twist tone (`twist_bank`), deploy new bundle + sign-off (`docs/test/neo_seoul_live_qa.md`; push done `889f713`, Cloud Run redeploy pending) + Audrey EN retest, voice-id pinning, ally-writeback triage, tear down the still-running local `api-cloud` server (pid was 5031, Vertex-billed if used).
4. **Post-sign-off model experiment**: 2.5-normal/3.5-key-beat hybrid A/B; record keep/rollback verdict.
4. **Maintenance/hold**: WS4 content pipeline plan-only; Glass Library waits for Neo-Seoul satisfaction; teaser #2 deferred (uncut-single-turn or post-P1 montage).

## Open Risks

- **DEPLOYED 2026-07-10 — latest rev `mythos-api-00038-v8d`** (project `project-ec7809f7`; deploy pins `.env` `PROJECT_ID` via `--project`). Live incl. all prior (mobile, DS/LC/opening, Se-rin fix trio #4/#5/#6, ping/legend `d175522`, tae_o/han portrait-flash `6e5f13f`, choice-gated stat voices `51b2264`, companion guardrail `9bfce0d`, combat-spawn root fix `31bdceb`) **+ cutscene present-gate (`10efaeb`) + combat-callback Se-rin leak fix (`0f52e16`)**. **Remaining**: git ahead of origin (re-push, hard-block → user) + real-device mobile pass + live sign-off (companion-appearance clean-loop retest + stat-voice gating/persona feel).
- **Companion appearance in variant loops — THREAD CLOSED 2026-07-10 (full audit).** A companion met/trusted only in a PRIOR loop must re-introduce themselves before appearing; unified on "present this loop = `unlock_flags∩flags`" across every surface: combat spawn (`31bdceb` opening-anchor flag strip), portrait (`6e5f13f` keyword), cutscene (`10efaeb` present-gate — was affection-only), post-combat narration (`0f52e16` dropped hardcoded 세린 example), loop-start party/flags guardrail (`9bfce0d`). Only affection carries (narrative echoes). Story-bible/curated-images audited clean. Owner clean-loop retest (new player/key) pending; in-flight/legacy loops = new loop or 1-time DB cleanup.
- **Mobile UX still emulator-only (2026-07-09)** — the mobile pass (header-hide/floating ⋯, banner, chip, tab rename) + **session #3 narration-first batch** (대본 최우선: CHARACTER chip dropped, ObjectiveStrip one-line collapsible, 46vh narration cap lifted, anchor-image grid blowout + tab-overflow fixed — UNDEPLOYED, `make check` 957) are verified in chrome-devtools @390px but **never on a real phone** (owner's phone couldn't reach the local LAN server). Watch: touch targets, `100dvh` vs URL-bar, notch, real-device font rendering, KO tab labels. Not structurally broken.
- **agy browser attach flaky (new 2026-07-06)**: the live-QA actor intermittently fails to acquire any browser tool and hangs silently — nested-in-agy runs burned 3 iterations; even direct runs failed 21:18+/21:41 after succeeding 20:20/20:23 (suspect Antigravity IDE/browser state). Mitigations landed: gtimeout hard ceiling + verdict-rescue in `run-agy.sh` (`6f61d9a`) so failures now record NEEDS_HUMAN instead of burning 30 min. Practice: run live-QA direct from a supervising session; if attach fails twice, hand the item to human.
- **3.5-flash cost watch (mitigated 2026-07-05)**: prompt diet cut input −25% → ~$1.0/loop full-3.5. The env-only hybrid (~$0.5) is implemented but remains disabled until the planned post-sign-off A/B.
- **WS idle drop (~45s) — MITIGATED 07-08 (T2)**: was the root of the tester "3-click" complaint. Fixed by 20s keepalive ping/pong + optimistic choice pending + one-shot reconnect-resend (`2a27e7b`); AGY QA confirmed single-click advance even with the socket force-closed. Watch only if slow image turns still stall.
- **ally-writeback promotion (open triage)**: `_finish_party_state` promotes any co-fighting AI ally into the permanent party — intended-vs-bug human call pending. (Simulator gating shipped 07-05 closed its main entry path; pre-existing simulator loops still occupy tester caps, e.g. `d1b0da3e` 5/10 — DB cleanup only on request.)
- DB hygiene (low): `narrative_shards` raw rows retained post-rollup; run summaries/save slots/metrics are JSONB memory records — prune/dedicated tables only if size or query load bites.
- Some detailed plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, and `PROGRESS_LOG.md` for current truth.
- Combat image quality varies widely per character. Prefer an action-sheet-based pipeline over independent pose generation.

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `bin/docs/archive/`

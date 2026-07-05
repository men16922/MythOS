# Project MythOS Status

Last updated: 2026-07-05

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

- `make check` **779 green** (+ P1-A regressions: combat telegraph choice flag/interstitial lifecycle, skill effect payload, blip buff serialization) + `make validate-content` clean.
- **CBT P1-A track DONE 2026-07-05** (`9226005..e13bf91`, not yet deployed): combat telegraph (⚔ choice badge + entry interstitial w/ authored hook lines), first-combat 4-step interactive tutorial, first-loop progressive disclosure, skill category badge + expected-effect line, buff/enrage status chips (roster + board).
- Cloud Run rev **`00025-856`**: presign hotfix + simulator gating + save overwrite/delete + dashboard admin rows + companion-equip UI overhaul + item-gain toast + dev-console link fix, live; `mythos-d1b0da3e` admin/cap-exempt (user-directed). Voice audition kit delivered (48 samples: KO natives / EN premades).
- Three AGY objective runs passed save/load restore, route pairing+horizon refresh, choice idempotency, support targeting, loot persistence, and equip/unequip. Remaining gate is human play feel.
- Completed detail is compressed in `docs/COMPLETED_SUMMARY.md` M35-M56; latest increments and exact measurements remain in `docs/PROGRESS_LOG.md` and dated plans.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

Direction remains global-first EN/KO closed beta: Gemini/Vertex is the product path; Ollama/FLUX remains the local development path. Deployment/onboarding/localization history is in `docs/COMPLETED_SUMMARY.md` M50 and M56.

1. **CBT P1 implementation (P1-A DONE 2026-07-05)**: `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md` — next is **P1-B replay variety** (B1 guaranteed meet-arc slot → B2 opening variants → B3 loop modifiers), then C density-continuity / D3-D4 board layout / P1-D signature+boss skills / P1-E narrative arc. AGY live-QA screen of the P1-A UI on a fresh account still pending (tutorial/disclosure are screen-verify targets).
2. **Human lane in parallel**: sign-off full run on rev `00025-856` + Audrey EN retest (`docs/test/neo_seoul_live_qa.md`); voice-id pinning (`outputs/voice-auditions/{ko,en}/` → `voices.json`); `git push` (ahead 37); triage calls (ally-writeback · overload-strike range · pacing knob); deploy bundle now also carries P1-A.
3. **Post-sign-off model experiment**: 2.5-normal/3.5-key-beat hybrid A/B; record keep/rollback verdict.
4. **Maintenance/hold**: WS4 content pipeline plan-only; Glass Library waits for Neo-Seoul satisfaction; teaser #2 deferred (uncut-single-turn or post-P1 montage).

## Open Risks

- **push workflow (ongoing)**: private-repo push is a hard-block by the safety classifier so the agent cannot do it → user pushes directly (men16922's own account). Unpushed commits now include the presign hotfix (source). Cloud Run rev `00021-mxt` (2026-07-05) serves the working tree incl. that fix.
- **3.5-flash cost watch (mitigated 2026-07-05)**: prompt diet cut input −25% → ~$1.0/loop full-3.5. The env-only hybrid (~$0.5) is implemented but remains disabled until the planned post-sign-off A/B.
- **WS idle drop (~45s)**: observed during live repro — the socket died during a long idle wait between frames. Harmless for normal play (frames flow continuously) but could matter for slow image turns; watch during live QA.
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

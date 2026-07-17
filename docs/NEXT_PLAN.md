# Project MythOS Next Plan

Last updated: 2026-07-17

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-0*.md`, individual designs in
`docs/plans/` (completed plans move to `bin/docs/plans/`).

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. **Latest deploy = `mythos-api-00069-gdn` (2026-07-15 evening source rebuild; 100% traffic, env verified 07-17)** — portrait action dock + turn-order strip + key-beat hybrid live, cloud images restored on the directly verified `gemini-2.5-flash-image` after 3.1 returned 404. All agent lanes are drained; open Priority 0 work is owner-side:

- `[x]` **§1 Key-beat hybrid A/B — VERDICT: ROLLBACK 2026-07-17** (owner: normal-turn 2.5 prose quality drop). Full 3.5 restored on `00071-gt9` (`GEMINI_MODEL_KEYBEAT` removed; routing code + observability kept for future retries). Partial-2.5 audit: no viable spot (2 LLM touchpoints only; thinking already 0). → `DECISIONS.md` 2026-07-17. Lane CLOSED.
- `[ ]` `[manual]` **§2 실기기 포트레이트 전투 패스** — 액션 독 도달성 · 38dvh 높이감 · URL바/노치 · 턴 순서 스트립 가독성. (에뮬레이터 PASS, 실기기 미검증 — 기존 standing gap.) 겸사: `00069` 첫 실루프 이미지 생성 성공 + idle 에러 미재현(Neon fix) 확인.
- `[ ]` `[manual]` **§3 Two-style balance playtest** — play-style consequence system ON (`advance_route` axis tally → intent flag @ threshold 2); play two loops in different styles, confirm story/results diverge + balance OK, tune threshold/mapping if needed. **B4 stat-tag** decision rides along (`(민첩)` reads as a check but has 0 effect — make real or restyle).

Closed lanes: CBT Teaser V2 published 2026-07-14 (YouTube; rebuild via `scripts/cbt/build_teaser.py`; scene sources pruned 2026-07-17 — final mp4 + narrations/BGM kept). Combat overhaul arc 07-11..14 fully owner-passed → `COMPLETED_SUMMARY.md` M59-M60.

### Narrative clarity / content follow-ups (mostly `[manual]`)
- `[ ]` remaining clarity items: Su-ah `잔향 가공사` rename (deferred). (2026-07-17: echo in-fiction definition + first-use term gloss SHIPPED — deterministic `termGloss.ts` strip + naming.md echo rule; EN opening-card parity found already done 07-11 `8a9362a`, stale item dropped.) Deploy hygiene: use `make deploy` (pins .env project).
- `[/]` `[manual]` **Full-3.5 live sign-off residuals**: fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn. Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs.
- `[/]` **CBT P1 residuals** (design `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`; P1-A..E + S1-S4 all DONE): `[ ]` `[manual]` S4 카피 톤 검수(anchor/goal + 12 beat prose) · 6 variant intros in-game feel · decisions G2 twist tone(3 `twist_bank`)/in-layer pacing(C2)/overload-strike range(D5) · EN fresh-loop coherence retest.
- `[x]` **Prompt-layer separation COMPLETE 2026-07-17**: Phase 0-4 + node-addressing + Phase 5 few-shot extraction (`directives/story_examples(.en).md` ↔ `STORY_EXAMPLE_DEFAULTS` byte-parity; prompt renders byte-identical today). Authority doc `docs/PROMPT_LAYER.md`.
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: author per-archetype opening variations (directive-layer, `resources/neo-seoul/directives/opening.md` + KO/EN), gated on CBT priorities.
- Image continuity: lever #1 (style preamble + `appearance` ×7) + lever #2 (curated key-art sequences, codex) SHIPPED; cloud model pinned `gemini-2.5-flash-image`. Watch app-path image success; 큐레이션 키아트는 codex 레인 (오너 지시 2026-07-06).
- **Narrative eval bank (harness SHIPPED 2026-07-17)**: `scripts/eval/` (RUBRIC + `narrative_judge.py` claude-CLI judge + `bank_loop.py`; `make eval-narrative`; sample verdict validated end-to-end). Remaining:
  - `[ ]` `[manual]` **bank 2+ real prod loops** during owner QA play (matched keybeat A/B pair ideal) — export via `bank_loop.py` with `DATABASE_URL` pointed at prod, or ask the agent with the loop ids.
  - `[ ]` rubric scores ride along the §1 A/B verdict as supporting data once real loops are banked; later: run `make eval-narrative` on prompt/directive changes as a narrative regression gate.

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43)

- `[x]` **WS4 content pipeline COMPLETE 2026-07-17**: image regen/judge loop live-validated (M47) + authored-content pipeline DESIGNED — `docs/plans/2026-07-17-ws4-authored-content-pipeline.md` (brief → codex gen+wire → judge relay → human adopt; implementation on-demand at the next real content need, all gates/relays already exist).
- `[/]` **WS5 harness hardening**: shutdown digest + iteration-output cap DONE 2026-07-17 (`run.sh` `OVERNIGHT_DIGEST` digest md+mail at exit / `ITER_LOG_MAX_KB` post-classification head+tail cap; fixture-verified). Remaining `[ ]` `[manual]` **Model-B 3-lane demonstration** — arm+observe during a real overnight run (`make overnight-worktrees-setup` + 3 engines; burns real quota, owner-armed).

## Rules

- Before starting work, read `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> this file in order.
- Leave a design snapshot for large work in `docs/plans/YYYY-MM-DD-<topic>.md`.
- After completion, keep only the latest summary in `docs/PROGRESS_LOG.md`; compress completed tracks into `COMPLETED_SUMMARY.md`.
- Record hard-to-reverse choices in `docs/DECISIONS.md`.

### Automation tags (for the overnight loop)

Inline tags (separate axis from `[x]`/`[/]`/`[ ]`/`[~]`) mark unattended-loop consumability (`scripts/overnight/`, `docs/engineering/mythos/LOOP.md`).

- `[auto]` — only locally/deterministically/offline verifiable (`make check`/`make smoke-local`); **must carry a 1-line completion criterion**.
- `[manual]` — human play-feel QA, content/Story-Bible authoring, balance/prompt-feel tuning, etc.; not unattended-verifiable.
- `[blocked]` — Blocker accumulated twice on the same item (runner appends automatically). Remove after human review. Also covers unmet prerequisites.
- **No tag = not an unattended target** (safe default). The runner consumes only `[auto*]` and never promotes untagged items.
- **MythOS live-QA guard (repo-specific, not a tag)** — a commit touching browser-observable UI is auto-screened by AGY (`OVERNIGHT_BROWSER_QA=auto`, stop-on-FAIL); so *objective* UI refactor/codemod/wiring can be `[auto]` (criterion adds "post-commit AGY live-QA not FAIL/NEEDS"), while *subjective* feel stays `[manual]`. Detail `docs/engineering/mythos/LOOP.md` §3.4.1 · `VERIFICATION.md` §4.

**Engine lanes** (design `docs/engineering/mythos/AGENTIC.md`): engine suffix on `[auto]`; each engine consumes only its own lane.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both.
- `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate).
- When claude's quota is exhausted, codex consumes the claude lane instead (runner auto-failover, `run.sh`).

## P1.5 — CBT feedback #3: Clarity & Responsiveness (design `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md`)

T1-T4a + T5/T6 + Track M + T5a/T5b DONE 2026-07-08 → `COMPLETED_SUMMARY.md` M58. Open slices:

- `[ ]` `[manual]` **M4** verify 7 `position:fixed` modals for scroll-lock/clip on phone.
- `[ ]` `[blocked]` **T5c** (LARGE) 2D top-down toggle = second orthogonal render path. Precondition (human): owner confirms isometric still illegible @390px after T5a/b. NOT unattended-consumable — do not build on a guess. Promote to `[auto:claude]` after that judgment.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress behind Priority 0; remaining work is mostly `[manual]` human play feel.

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria (compressed): 5-min goal/risk clarity · choices reveal the value axis · combat = consequence of pursuit/rescue/protection · progression informs the next loop · endings state saved/lost/carried.

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[ ]` `[manual]` IX and route lifecycle live feel: boss fires end-to-end; Night Market→Kai feels causal; no visually locked node is entered.
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel).
- `[ ]` Opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

## Hold — Scenario Expansion / Glass Library

- `[~]` parity + Story Bible done (M38); held until Neo-Seoul satisfaction. `[ ]` main_arcs/endings·reward meta + combat art/skill depth expansion.

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[blocked]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 done (App.tsx 1261→696; 13 hooks + shared `archetypes.ts`; detail `bin/docs/archive/progress-2026-06.md` + git). **slice 14 (`useViewModels`) was committed green (`d7b3b35`) then HUMAN-REVERTED (`4d88b80`) — DO NOT re-attempt verbatim (deliberate revert; 12-field props object = net-negative). `[blocked]` 2026-06-28 (twice-blocked rule): remove the tag after a human names a different clean-boundary slice or closes the track._
- One-time DB cleanups available on request (not scheduled): players wrongly promoted by the old ally-writeback bug (fixed `efa1c8f` 07-09) · simulator-born active loops occupying tester caps (sim admin-gated since 07-05).
- AGY live-QA findings: none open.

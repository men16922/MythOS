# CBT Feedback #3 — Clarity & Responsiveness plan (P1.5)

Status: DESIGN+TRIAGE (2026-07-08). Source: tester session relayed by owner (player "이용재",
local/cloud unconfirmed). Raw quotes + per-item diagnosis in `docs/cbt/CBT_FEEDBACK.md` #3.
Theme: **the game withholds meaning** — choices, axes, jargon, skills, and the board all assume
knowledge the first-time player doesn't have; plus two trust-breaking defects (identity swap,
unresponsive clicks). Complements P1 (feedback #1/#2) which fixed onboarding *sequencing*;
#3 says the *language and feedback loops* are still opaque.

## Tracks (priority order)

### T1 — Identity swap mid-loop (BUG, highest)
Player name flipped 이용재 → 테스터 after picking the 추격 route choice.
- Facts: `create_player` upserts `display_name` (postgres `ON CONFLICT DO UPDATE`), so a simple
  rename-lag is ruled out. Two-player-rows hypothesis: the session started as player A, then a
  mid-play reconnect path (`stablePlayerId() ?? localStorage` in the SPA) resumed **player B's**
  (테스터's) latest active loop — silently switching loop+identity. The tester's triple-click
  streaming complaint (T2) says reconnects DID happen mid-session.
- Fix path `[auto:claude]` after `/diagnose`: reproduce with two identities in one browser
  (localStorage carries B, connect as A) + an induced WS drop; then pin loop identity to the
  session (SPA must resume by **loop_id it was playing**, never by player_id fallback while a
  loop is active) + regression test. Done = repro test red→green, `make check` green.
- Evidence to collect: server logs around the swap (loop_id per /choose), whether header AND
  narrative both flipped.

### T2 — Click-to-stream responsiveness (BUG-adjacent, high)
"선택지를 3번 클릭해야 스트리밍 진행" — reads as a dead socket: known **WS idle drop (~45s)**
finally has user-facing evidence.
- `[auto:claude]` ① WS keepalive ping/pong (client 20s interval) + auto-reconnect with resume
  ② optimistic choice feedback: clicked choice instantly enters a "전송 중" pending state
  (spinner + disabled siblings) regardless of socket state; if the socket is dead, reconnect
  then replay the choice once (server already idempotent). Done = `make check` green + AGY
  live-QA not FAIL/NEEDS; `[manual]` feel: no more multi-click.

### T3 — Narrative↔choice contract (high)
Prose said "왼쪽은 지하철 폐노선, 오른쪽은 린위에의 선착장. 선택해야 해" but the rendered
choices didn't carry those options.
- `[auto:claude]` prompt contract addition (KO/EN): when the narration poses an explicit fork,
  the choices MUST mirror those options verbatim-ish (rule note in `prompts.py` note channel).
- `[auto:codex]` route-destination hint copy pass: every `route:` choice label carries the
  destination's 1-line WHAT-IS-THIS (e.g. 데이터 소각로 → "기억을 태우는 관리망 폐기 시설").
  Descriptions live with route node defs; validator asserts non-empty desc for route targets.
- `[manual]` residual feel (LLM adherence) folds into the next sign-off run.

### T4 — Jargon & value-axis legibility (high)
"시민/관계·상호작용·탐색이 뭘 바꾸는지 모르겠음" + "그들만의 언어 난무".
- `[auto:claude]` ① value-axis chip tooltip/popover: tap → 2줄 설명(이 축이 올리는 게이지/
  관계/엔딩 영향) + first-loop 1회 자동 legend overlay (A3 disclosure와 동일 게이팅).
  ② Codex-term links: known glossary terms in narration render with a subtle underline →
  tap opens the Codex entry snippet (data = existing story_bible/glossary; no new authoring).
- `[auto:codex]` plain-language pass on axis names/descriptions + archetype cards (캐선창):
  each archetype gets "이 선택이 바꾸는 것" 1줄 (스탯 보이스·시작 아이템·플레이 스타일)
  — replace lore-first copy with play-first copy, lore second sentence. KO+EN.
- Done = tooltips/legend render (AGY), copy `[manual]` tone verdict.

### T5 — Combat board viewpoint + skill effects (medium)
"이동 시점이 보기 불편" · "스킬 뭔 효과인지 모르겠음" (D1 badges exist but not landing).
- `[manual]` design decision first: board camera options (zoom-to-active-unit on move? 2D
  top-down toggle? larger tiles?) — needs the owner's play judgment, then slice `[auto:claude]`.
- `[auto:codex]` skill effect-line plain-language pass: replace stat shorthand ("◆2 ◇1 bonus
  DMG 1d6 · pierce 2") with sentence form on the hover/tap detail ("공격력 2 · 사거리 1 —
  명중 시 추가 피해 주사위, 방어 2 무시"), keep chips compact.

### T6 — Information density (medium, design-led)
"UI가 복잡, 정보량 과다" — A3 disclosure covers loop-1 turns 0-2 only.
- `[manual]` design decision: extend progressive disclosure beyond turn 2 (e.g. collapse
  STATUS/OPERATION MAP into summary chips until tapped) or add a 간결 모드 toggle.
  Candidate slices become `[auto:claude]` after the decision. Ties into the god-component
  `[blocked]` track — do not entangle; UI-only, behavior-preserving slices.

## Sequencing

T1 (diagnose→fix) → T2 → T3/T4 code slices (parallelizable lanes) → T4/T5 copy passes (codex)
→ T5/T6 design decisions (human) → follow-up slices. T1/T2 land before the next tester session
— they corrupt trust in every other improvement.

## Verification

- T1: repro regression test + live 2-identity browser check.
- T2: AGY live-QA (induced 60s idle → single click advances), WS probe.
- T3/T4: unit (route-desc validator, glossary-link renderer), AGY render pass, tone `[manual]`.
- All: `make check` green; UI-touching slices auto-screened by AGY per LOOP.md §3.4.1.

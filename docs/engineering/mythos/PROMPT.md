# MythOS 해석 — PROMPT_ENGINEERING

> 바이블 [`../PROMPT_ENGINEERING.md`](../PROMPT_ENGINEERING.md) 의 개념을 **이 repo 구현에 매핑**한다.
> 권위: 서사 설계 `docs/DESIGN.md` · 설계 불변 `harness/CORE_MANDATES.md`.

## 1. 하네스 회차 프롬프트 — `scripts/overnight/PROMPT.*.md`
| 파일 | 엔진 | 특징 |
| --- | --- | --- |
| `PROMPT.md` | claude | Skill(`/sync`·`/checkpoint`) 호출, 표준 절차 |
| `PROMPT.codex.md` | codex | Skill 불가 → `.agents/skills/*/SKILL.md` 절차를 읽어 수행. `§0` 로컬파괴·fabricate 금지 |
| `PROMPT.agy.md` | agy | 이미지 초안 레인. 무샌드박스 → 가드레일+도메인 소유권으로 경계 |
| `PROMPT.review.md` | codex(리뷰어) | 통합 diff 읽기전용 감사, 코드·NEXT_PLAN 미수정, findings 만 |
- 절차 권위는 [`LOOP.md`](LOOP.md)·[`AGENTIC.md`](AGENTIC.md). 가능한 제약은 게이트로 승격(`test_image_assets.py` 가 fabricate 차단).

## 2. 런타임 서사 프롬프트 — `src/mythos_narrative/`
- `prompts.py` — 메시지 빌더. **이원화(dual-model)**: 스토리텔러(`gemma4:latest` 8B 자유 텍스트) → 파서
  (`qwen2.5:3b-instruct` JSON). 스트리밍 경로는 정규식 파서 병행.
- `schemas.py` — `ScenePayload`/`WorldDelta`/`NarrativeContext` + 한계(`MAX_NARRATION_CHARS=2200`,
  `MAX_VISUAL_BRIEF_CHARS=700`, `MAX_CHOICES=4`, 허용 world-delta 키).
- **repair→fallback**: 파싱 실패 시 LLM repair 1회 → 반복 실패 시 결정론 fallback 장면(`CORE_MANDATES §3`).
- **context selection**: 전체 Story Bible/시나리오/shard 미주입 — phase/location/flags 스니펫 + 롤업 `causality_summary` 만.

## 3. 서사 레지스터 (feel)
추상 SF 용어 금지가 아니라 **반복이 문제** + 장면별 레지스터(일반=screenplay action-line, 난해=추상 OK; 메모리
`narrative-register-rule`). 반복 억제는 `build_session_synopsis` 지침으로 강화. 최종 판정은 사람 QA(`docs/test/neo_seoul_live_qa.md`).

## 형제 해석
하네스 [`HARNESS.md`](HARNESS.md) · 루프 [`LOOP.md`](LOOP.md) · 멀티에이전트 [`AGENTIC.md`](AGENTIC.md) · 컨텍스트 [`CONTEXT.md`](CONTEXT.md)

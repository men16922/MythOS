# Mythos 2.0 — Gemini / Antigravity (AGY) Agent Instructions

이 문서는 Gemini·Antigravity(AGY) 에이전트용 **얇은 진입점**이다. 정본은 `CLAUDE.md`, 설계 불변은 `harness/CORE_MANDATES.md`, 현재 맥락은 `harness/CONTEXT_BRIDGE.md`. 상세를 여기 복제하지 않는다.

## What this is
Mythos 2.0(세계:접속 — Signal Run)은 브라우저에서 도는 전술 덱빌딩 로그라이트다(순수 TS 엔진, AI GM은 진행을 막지 않는 보조). 서버는 SPA와 `/api/v2`(저장 + AI GM)만 담당하고, 안드로이드 앱은 Capacitor로 감싼다. 1.x 런타임은 `1.0` 브랜치에 보존돼 있다.

## 공유 진입 경로
1. `harness/CORE_MANDATES.md` · `harness/CONTEXT_BRIDGE.md`
2. 상태 복원: `docs/AGENT_BRIEF.md` → `docs/STATUS.md` → `docs/NEXT_PLAN.md` → `docs/PROGRESS_LOG.md` (`docs/` 전체 읽기 금지)
3. 규칙: `docs/GAMEPLAY.md` · 설계: `docs/plans/2026-10-10-mythos-2.0.md` · 안드로이드: `docs/android.md`

## Key Commands
- `make setup`, `make api`, `make check`, `make test-v2`, `make test-e2e-v2`
- 무인 레인: `make overnight-agy-once` / `make overnight-agy-watch`

## Conventions & AGY Sandbox Boundary
- AGY 엔진은 브라우저 E2E·이미지 생성에 로컬 자원과 네트워크가 필요해 샌드박스 없이 구동된다. 대신 `scripts/overnight/PROMPT.agy.md` 가드레일과 `loop/agy` worktree 격리에 의존한다.
- 브라우저 테스트는 항상 무음(`?mute=1`), 탭은 1개만.
- 코드 탐색은 Serena LSP(Pyright/Vtsls) 우선, 문자열·설정은 `rg`.
- `.env`·키·키스토어·`google-services.json`·생성물은 커밋 금지.

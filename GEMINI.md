# MythOS Local Runtime — Gemini Agent Instructions

이 문서는 Gemini CLI 에이전트용 **얇은 진입점**이다. 상세는 복붙하지 않고 정본을 링크한다(진입점 발산 방지 —
`docs/engineering/CONTEXT_ENGINEERING.md` §5). 정본 가이드는 `CLAUDE.md`, 설계 불변은 `harness/CORE_MANDATES.md`,
현재 작업 맥락은 `harness/CONTEXT_BRIDGE.md`.

## What this is
MythOS 는 로컬 실행 루프형 내러티브 시뮬레이션 엔진(Python 3.11+). AI GM(Ollama)이 장면을 진행하고,
이미지(FLUX/MPS)·전술 전투·진행도가 붙는다. 비즈니스 로직은 `RuntimeSessionService` 하나로 공유한다(UI/API/CLI 에 복제 금지).
아키텍처 상세는 `docs/DESIGN.md`, 모듈 맵은 `AGENTS.md`.

## 공유 진입 경로 (모든 에이전트 공통)
1. 설계 불변: `harness/CORE_MANDATES.md` · 핸드오프: `harness/CONTEXT_BRIDGE.md`
2. 상태 복원(Read Path): `docs/AGENT_BRIEF.md` → `docs/STATUS.md` → `docs/NEXT_PLAN.md` → `docs/PROGRESS_LOG.md`. `docs/` 전체 bulk-read 금지.
3. 아키텍처 상세: `docs/DESIGN.md` · 게임 규칙: `docs/GAMEPLAY.md` (변경 시에만)
4. 에이전트 운영 하네스: `docs/engineering/README.md`(범용 바이블) + `docs/engineering/mythos/`(이 repo 해석)
5. 명령어: `Makefile` 타깃 · docs 인덱스: `docs/README.md`

## Key Commands
- 셋업/검증: `make setup`, `make doctor`, `make check`(ruff+eslint+mypy+tsc/vite-build+unittest), `make test`.
- 실행: `make connect-demo`(CLI fallback), `make streamlit`(데모 UI), `make smoke-local`.
- 인프라(로컬): `make infra-up` / `make db-migrate`. Ollama·FLUX 는 Mac 호스트, Docker 는 인프라용.
- 무인 이미지 레인(agy): `docs/engineering/mythos/AGENTIC.md` + `bin/overnight/PROMPT.agy.md`.

## Conventions
타입 힌트 + dataclass-first 도메인. `snake_case`/`PascalCase`/`UPPER_SNAKE_CASE`. composition·provider 인터페이스 선호.
순수 unit 테스트는 Docker 비의존, DB 테스트는 `MYTHOS_RUN_DB_TESTS=1`. 상세 규약은 `harness/CORE_MANDATES.md` §1·§4.
`.env`/HF 토큰/생성물/`.docker/` 는 커밋 금지.

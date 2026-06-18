# MythOS 해석 — CONTEXT_ENGINEERING

> 바이블 [`../CONTEXT_ENGINEERING.md`](../CONTEXT_ENGINEERING.md) 의 개념을 **이 repo 구현에 매핑**한다.
> 권위: `docs/DOCS_POLICY.md`(Context Budget·Read Path) · `docs/README.md`(인덱스).

## Read Path & 예산
`/sync` 스킬이 자동화: 1. `docs/AGENT_BRIEF.md`(≤60) → 2. `docs/STATUS.md`(≤120) → 3. `docs/NEXT_PLAN.md`(≤120)
→ 4. `docs/PROGRESS_LOG.md` 최상단(≤120). `docs/` 전체 bulk-read 금지. 초과 시 `/tidy-docs` 가 `bin/docs/archive/progress-YYYY-MM.md` 로 분리.

## Knowledge Pyramid → 실제 파일
- L0: `AGENT_BRIEF`/`STATUS`/`NEXT_PLAN` + 진입점(CLAUDE/AGENTS/GEMINI).
- L1: `DESIGN`·`GAMEPLAY`·`DOCS_POLICY`·`harness/CORE_MANDATES`.
- L2: `docs/plans/*`·scenario·story_bible.
- L3: `bin/docs/archive/*`·`scripts/overnight/logs/*`·생성 리포트(기본 컨텍스트 아님).

## 3중 상태 저장 → 실제
git 회차 커밋 · 구조화 ledger `scripts/overnight/logs/status.tsv`(WS3) · 자연어 `STATUS`/`PROGRESS_LOG`/`AGENT_BRIEF`.

## Resume Pointer (연속성)
- `AGENT_BRIEF.md` 최상단 `▶ NEXT SESSION:` 한 줄 = in-repo 플랜(`docs/plans/*`) + 첫 행동.
- 권위 active focus 3문서 일치(AGENT_BRIEF Active Work #1 + STATUS Active Focus + NEXT_PLAN 우선순위).
- `/sync` 가 최우선 echo(`.claude/skills/sync/SKILL.md`). 규칙은 `docs/DOCS_POLICY.md` "Dated Plans".
- **금지**: `~/.claude/plans/*` 스크래치 경로를 권위 포인터로. **회귀 사례(2026-06-14)**: 예약 작업을 서두 노트+스크래치
  경로로만 남겨 `/sync` 가 못 이어받음 → 이 컨벤션으로 수정(`docs/plans/2026-06-14-engineering-plan.md` WS0).

## 진입점 발산 방지
`CLAUDE.md`(canonical 본문) + `AGENTS.md`/`GEMINI.md`(얇은 래퍼, 공유 read-path + `docs/engineering/README` 링크).
공통 본문은 CLAUDE.md 한 곳, 나머지는 링크.

## memory
에이전트 영속 메모리(`~/.claude/.../memory/`)는 코드가 이미 기록하는 것 말고 **비자명한 사용자/피드백/프로젝트 맥락**만.

## 코드 탐색 인덱스 (Quarkify)
바이블 §2(구조 인덱스는 조건부)의 이 repo 구현. `.quarkify/src`(Quarkify가 `src/**/*.py`를 폴더 토폴로지로 분해, gitignore 생성물).
- 운용: `make quarkify-setup`(최초 1회 도구 clone) · `make quarkify`(재생성, 멱등 ~4s) · `make quarkify-check`(비차단 신선도).
- 정책: 대형 패키지·고빈도 심볼은 인덱스 우선(실측 토큰 80~92%↓), 드문 리터럴은 grep(−5% 역효과). **권위는 원본** — 리프는 빈 폴더(위치만).
- 신선도: `make check` 미포함(선택적 가속기). `harness/check-quarkify.sh`가 self-heal/`--check` 제공.
- 권위 정책·근거: `CLAUDE.md` "## Quarkify" · `harness/CORE_MANDATES.md §5` · `docs/plans/2026-06-18-quarkify-poc.md`.

## 형제 해석
하네스 [`HARNESS.md`](HARNESS.md) · 루프 [`LOOP.md`](LOOP.md) · 멀티에이전트 [`AGENTIC.md`](AGENTIC.md) · 프롬프트 [`PROMPT.md`](PROMPT.md)

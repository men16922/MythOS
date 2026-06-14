# MythOS 해석 — HARNESS_ENGINEERING

> 바이블 [`../HARNESS_ENGINEERING.md`](../HARNESS_ENGINEERING.md) 의 개념을 **이 repo 구현에 매핑**한다.
> 설계 불변 권위: `harness/CORE_MANDATES.md`. 원시 리서치: `bin/docs/archive/HARNESS_RESEARCH.md`·`bin/docs/archive/AI_REARCH.md`.

## 성숙도 자가진단: **L2→L3**
- L1 ✅ CLAUDE/AGENTS/GEMINI.md · `make check` · worktree/branch · `docs/plans/`.
- L2 ✅ `make check` 게이트 · codex 독립 리뷰어 · overnight 회차 커밋 · `/checkpoint`.
- L3 🟡 3엔진·worktree·생성자≠리뷰어 ✅ / **gardener 자동화·구조화 ledger 미완**.
- **L3 갭 = 다음 투자처**: ① 구조화 ledger(`bin/overnight/logs/status.tsv`, WS3) ② entropy gardener
  (현재 `/tidy-docs` 는 docs 한정·수동 → 코드/arch drift 스캔으로 확장).

## Feedback Ladder 사례
1회=codex `logs/review-latest.md` finding · 2회=`CORE_MANDATES §5`·메모리 `narrative-register-rule` ·
3회+=QA seed→invariant 테스트(`tests/test_route_integrity.py`·`test_content_integrity.py`) · hard gate=`overnight-settings.json` deny·`make check` 차단.

## Verification Layers → 단일 `make check` 매핑
| 바이블 층 | MythOS |
| --- | --- |
| L1 파일 변경 | (전용 hook 없음) ruff `F`+conflict 는 `make check` 가 잡음 |
| L2 턴 종료 | ruff + eslint + `mypy src tests` + tsc/vite-build |
| L3 완료 전 | unittest(+`test_*_integrity`) — `make smoke`/`test-db`/`test-e2e` 는 opt-in |
| L4 리뷰 | codex 읽기전용(`make overnight-review` → `logs/review-latest.md`) |
| L5 PR/머지 | `.github/workflows/ci.yml` + 사람 QA(`docs/test/*`) |
> 이 repo 는 L1-L3 을 **단일 `make check`** 로 묶는다(darwin/Make). PowerShell gate 분리는 안 한다.

## Tier 경계 → 실제 구현
- Tier 1/2: `overnight-settings.json`(claude allow) / codex `workspace-write`.
- Tier 3 차단: claude deny(push·net·파괴 make·rm-rf·Web·MCP) / codex `network_access=false` + sandbox / agy 무샌드박스→프롬프트 가드레일+worktree.
- 남는 격차: codex/agy 워크스페이스 내 로컬 파괴는 샌드박스가 못 막아 `PROMPT.*.md §0` 금지로만 차단(폭발 반경 ≤1회차).

## Progressive Deletability 사례
`NEXT_PLAN` 의 `[blocked]` 항목 선행 조건 · "전 시나리오 route_map 전환 시 `_map` 제거" 등. 새 룰엔 제거 조건을 단다.

## 형제 해석
루프 [`LOOP.md`](LOOP.md) · 멀티에이전트 [`AGENTIC.md`](AGENTIC.md) · 컨텍스트 [`CONTEXT.md`](CONTEXT.md) · 프롬프트 [`PROMPT.md`](PROMPT.md)

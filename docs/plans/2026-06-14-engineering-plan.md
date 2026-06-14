# Plan: 엔지니어링 문서 정의 + docs 컨텍스트 최적화 + 모니터링 대시보드 (+ 콘텐츠 파이프라인 계획)

## Context
이번 세션에 3엔진 병렬 하네스(claude/codex/agy)·skills git추적·리뷰어가 안착했으나, 관련 지식이 79개 md에 흩어져 있고
HARNESS/LOOP/AGENTIC/CONTEXT/PROMPT "engineering" 개념이 명시 정의돼 있지 않다. 또 per-agent 진입점
(CLAUDE.md/AGENTS.md/GEMINI.md)이 컨텍스트 최적화돼 있지 않고, 모니터링은 단순 `overnight-status`뿐이다.
목표: **5개 엔지니어링 개념을 현 repo 기준으로 정의 + docs를 claude/codex/gemini가 최소 컨텍스트로 읽도록 재편 +
로깅 강화 + tmux 에이전트 대시보드**. 콘텐츠 이미지 파이프라인은 **계획만**.

**실행 판단(사용자 요청대로): 이번 턴은 PLAN ONLY** — context 71%(286k 여유) + 4개 워크스트림(문서 저작/repo-wide
md 재편/툴링/계획)은 한 세션에 안전히 안 들어간다. 다음 세션에 WS1→WS2→WS3 순 실행, WS4는 계속 계획.

확정된 구조 결정: **engineering/ 디렉터리**(단일 hub 아님), **tmux 멀티페인 + 집계 트리** 대시보드.

## WS1 — `docs/engineering/` 5개 엔지니어링 개념 정의
신설 `docs/engineering/`:
- `README.md` — 허브: 5개 1~2줄 정의 + 링크 + read-order.
- `HARNESS_ENGINEERING.md`(신규, ~40줄) — 에이전트 안전 운영 scaffolding: 권한 경계(overnight-settings/codex sandbox/agy),
  게이트(`make check`), `notify.sh`, `run.sh`. **권위**: `harness/CORE_MANDATES.md` 링크(중복 금지, 정의+매핑+링크).
- `LOOP_ENGINEERING.md` — 기존 `docs/LOOP_ENGINEERING.md`(206줄) **이동**(자율 루프 운영 권위 유지).
- `AGENTIC_ENGINEERING.md` — 기존 `docs/MULTI_AGENT.md`(92줄) **이동**(3엔진/역할/레인/worktree/머지/생성자≠리뷰어 권위).
- `CONTEXT_ENGINEERING.md`(신규, ~40줄) — 컨텍스트 예산·read-path·`/sync`·memory·per-agent 진입점. **권위**: `docs/DOCS_POLICY.md` 링크.
- `PROMPT_ENGINEERING.md`(신규, ~40줄) — `bin/overnight/PROMPT.*.md`(엔진별 회차 프롬프트)·`src/mythos_narrative/prompts.py`·
  서사 레지스터 규칙(memory `narrative-register-rule`)·repair/fallback. 정의+매핑+링크.
- 원칙: 신규 3종(HARNESS/CONTEXT/PROMPT)은 **얇게**(정의+현 repo 구현 매핑+권위 링크), 운영 상세는 권위 문서에만.

## WS2 — md 재편 / 컨텍스트 최적화
- **원시 연구 아카이브**: `docs/research/AI_REARCH.md`(237, 원본 ChatGPT) → `bin/docs/archive/`. 정제본 `AI_TEAM_BLUEPRINT.md`는
  `docs/engineering/`로 이동(또는 research 유지) — AGENTIC와 링크.
- **per-agent 진입점 슬림화 + 공유 read-path**: `CLAUDE.md`(현재 5.7k tok)·`AGENTS.md`·`GEMINI.md`를 **얇은 래퍼**로
  통일 — (what-this-is 요약 + commands + 공유 read-path `AGENT_BRIEF→STATUS→NEXT_PLAN` + `docs/engineering/README` 링크 +
  on-demand 목록). 3파일 발산 방지: 공통 본문은 한 곳(예: `docs/engineering/README` 또는 CLAUDE.md)에 두고 나머지는 링크.
- **인덱스/정책 갱신**: `docs/README.md`(인덱스)·`docs/DOCS_POLICY.md`(read-path)를 engineering/ 구조로 갱신.
- 무브로 깨질 참조는 `rg`로 일괄 갱신(LOOP_ENGINEERING/MULTI_AGENT 경로 변경 다수).

## WS3 — Makefile + 로깅 + tmux 대시보드 (에이전트 모니터링)
- **구조화 로깅**: `run.sh`가 회차마다 머신리더블 status 추가(`bin/overnight/logs/status.tsv`): `ts engine branch iter outcome head dur`.
  (human `runner.log` 병행 유지.)
- **집계 트리** `bin/overnight/status.sh`: 각 엔진 worktree의 process(pgrep)+runner.log 마지막 outcome+STOP/DONE+git HEAD/branch를
  읽어 트리 출력:
  ```
  Orchestrator: claude (main)
  ├─ claude  [running]  loop/claude  iter3  abc123  승률밴드
  ├─ codex   [success]  loop/codex   iter1  def456
  └─ agy     [stopped]  loop/agy     STOP: ...
  ```
  상태 색상/범례(running/success/failed/stopped/idle).
- **tmux 대시보드** `bin/overnight/dashboard.sh` + `make overnight-dashboard`: tmux 세션 — 상단 페인 `watch -n2 status.sh`(트리),
  하단 페인 분할로 엔진별 `tail -f runner.log`. tmux 없으면 status.sh 폴백 안내.
- `make`: `overnight-dashboard` 신설, `overnight-status`는 `status.sh` 호출로 강화. `.PHONY` 갱신.

## WS4 (계획만) — agy 이미지 → codex 검토 → 콘텐츠 추가 파이프라인
흐름: agy가 초안 생성(`outputs/agy/`) → **codex가 적합도 검토**(review.sh 확장 또는 content-review) → "promote" 판정 →
codex가 **다음 콘텐츠 추가 플랜을 NEXT_PLAN에 항목으로 추가**(`[auto:codex]`/`[manual]`) → 해당 작업 시기에 codex가
**스타일 맞춰 최종 이미지 생성**(in-session Imagen, 엄격 카드 템플릿)해서 콘텐츠 반영. 훅: review verdict "promote",
NEXT_PLAN 콘텐츠 레인, codex 콘텐츠 프롬프트. **이번엔 문서화만**(impl 다음 기회).

## Critical files
- 신규: `docs/engineering/{README,HARNESS_ENGINEERING,AGENTIC_ENGINEERING,CONTEXT_ENGINEERING,PROMPT_ENGINEERING}.md`
  (LOOP/AGENTIC는 기존 LOOP_ENGINEERING/MULTI_AGENT 이동분), `bin/overnight/{status.sh,dashboard.sh}`.
- 수정: `bin/overnight/run.sh`(status.tsv emit), `Makefile`(dashboard/status), `CLAUDE.md`/`AGENTS.md`/`GEMINI.md`(슬림화),
  `docs/README.md`·`docs/DOCS_POLICY.md`(인덱스/read-path), repo-wide ref 갱신.
- 아카이브: `docs/research/AI_REARCH.md` → `bin/docs/archive/`.

## 검증 (다음 세션)
- WS1/2: `rg`로 깨진 링크 0, README/DOCS_POLICY read-path 정합, 진입점 라인/토큰 축소 확인.
- WS3: worktree 가동 중 `make overnight-status` 트리 렌더 + `make overnight-dashboard` tmux 페인 + `--once`로 status.tsv 기록 확인.
- WS4: 해당 없음(계획).

## 순서 / 리스크
1) WS1+WS2(문서·저위험·컨텍스트 이득 큼) → 2) WS3(툴링) → WS4 계획 유지.
- 리스크: LOOP/MULTI 이동 = 참조 다수 → rg codemod 필수. tmux 의존(status.sh는 비-tmux 동작). 진입점 3파일 동기화 부담 → 공유 본문+링크로 최소화.

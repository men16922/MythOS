# Progress Log

최종 갱신: 2026-06-14

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

## 2026-06-14 — 3엔진 병렬 Loop Engineering + BGM OFF 수정

- Status: claude·codex·agy 3엔진 병렬 무인 루프 토대 구축 + 실패 메일 + failover + BGM 버그 수정. 6 phase 완료.
- Changed:
  - **BGM OFF 버그**: `useAudio.ts` — stale closure(WS onmessage)가 매 턴 음악 재생 → `bgmEnabledRef` 단일 진실원 게이트로 수정.
  - **agy 엔진**: `run.sh` 3엔진 case(`ENGINE=claude|codex|agy`), `PROMPT.agy.md`(이미지 초안 레인, 무샌드박스+가드레일), `make overnight-agy*`. agy --print 헤드리스 실측.
  - **병렬 격리**: `worktrees.sh`(loop/{claude,codex,agy} worktree + .claude/.agents symlink), 레인 태그(`[auto:claude|codex|agy]`, 각 PROMPT 자기 레인만), `merge-loops.sh`/`make overnight-merge`(통합+게이트, push 안 함), `docs/MULTI_AGENT.md`.
  - **이미지 무결성 게이트**: `tests/test_image_assets.py`(유효/비어있지않음/치수/용량 — fabricate 차단, make check 포함, 317 tests).
  - **실패 메일**: `notify.sh`(SMTP→Mail.app), run.sh 가 실패 클래스(연속 실패/all-blocked)에서만 발송.
  - **failover**: claude 한도 시 codex 가 claude 레인 대신 소비(1회 자동 전환).
- Verified: `make check` rc=0(317). worktree 3개 생성+symlink+merge 실측. agy/codex 헤드리스 실측. notify Mail.app 실발송 확인.
- Blockers: agy 무샌드박스(경계=프롬프트+worktree). 누락 스킬아이콘 6종은 `[auto:agy]` 초안 task 로 대기.
- Next: `make overnight-worktrees` 후 3엔진 병렬 실가동(사용자 판단). 아침 `make overnight-merge`+검수.

## 2026-06-14 — 조우 무결성 invariant 추가 ([auto], QA seed #4)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #4(조우 무결성) 박제. green.
- Changed: `tests/test_content_integrity.py`에 `ContentEncounterIntegrityTest` 2건 추가. route map 두 빌더(full+dynamic) ×24 seed의 모든 combat node type이 비어있지 않은 `route_map.combat_encounters` 풀에 매핑되고, 선택된 encounter/pool 항목이 `combat.encounters`에 실재하는지 검증. 모든 encounter enemy가 bestiary id를 resolve하고 `idle/attack/guard/skill/hit` combat action sheet 파일을 실제 리소스 경로에서 찾는지도 검증.
- Verified: `tests.test_content_integrity` 6 tests OK. `make check` EXIT=0 — ruff All passed + eslint + mypy Success(111 files) + frontend build + 316 tests OK(skipped 2).
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 2종(조우 승률 밴드·진행도 경제).

## 2026-06-14 — overnight 루프 Codex 엔진 추가

- Status: Claude 전용이던 무인 루프를 Codex(`codex exec`)에서도 동일 LOOP로 돌 수 있게 함. setup 완료·실측 검증·커밋.
- Changed:
  - `bin/overnight/run.sh`: `ENGINE`(claude|codex) 분기 — LOOP 제어 로직 단일 소스 유지, 호출 줄/프롬프트/권한 경계만 분기. claude 경로 불변. codex는 `</dev/null` 필수(stdin freeze 방지).
  - `bin/overnight/PROMPT.codex.md` 신설: claude PROMPT와 동일 절차, 단 Skill 호출 불가 → `.agents/skills/*/SKILL.md` 절차를 읽어 수행.
  - `Makefile`: `overnight-codex`/`-watch`/`-once`(ENGINE=codex 위임). stop/logs/status/clean 공용.
  - `AGENTS.md`: Codex 자동 로드 대상에 CORE_MANDATES·sync/checkpoint·루프 포인터 추가. `docs/LOOP_ENGINEERING.md` §3.1/§3.6/§4/§6 갱신.
  - 안전 경계: 전역 `~/.codex/config.toml`(danger-full-access/YOLO)을 회차마다 CLI로 덮어씀 — `--sandbox workspace-write` + `network_access=false` + `approval_policy=never`.
- Verified: **`codex exec`로 직접 실측** — 전역 YOLO에도 회차 내 `curl`이 exit 6(DNS 차단)으로 실패(네트워크 봉쇄 확정). stdin freeze 버그 발견·수정(`</dev/null`), rc=0 성공 경로 확인. `bash -n`·`make -n overnight-codex*` 통과. 최종 상태 `make check` rc=0(skipped 2). 작업 중 **Claude overnight 회차가 이 변경을 "동시 작성자"로 정확히 감지해 대신 커밋하지 않고 graceful STOP** — 동시작성 안전 동작 실증(이번 커밋 후 STOP 제거·재개 가능).
- Blockers: 워크스페이스 내 로컬 파괴(`rm -rf`/`git reset --hard`)는 샌드박스가 못 막음 → `PROMPT.codex.md §0` 명시 금지로만 차단(회차당 커밋 = 폭발 반경 ≤1회차).
- Next: clean 트리에서 `make overnight-codex-once`로 첫 회차 체감 확인.

## 2026-06-14 — 플래그 참조 무결성 invariant 신설 ([auto], QA seed #3)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #3(플래그 참조 무결성) 박제. green.
- Changed: `tests/test_content_integrity.py` 신설(4 invariant). neo-seoul 소비 flag(route node
  `gate`·perspective `when`·`playability.route_branches[].trigger_flags`·story_bible `flags_any`)가
  recognized producer로 모두 생산되는지 검증 — (1) gate flag는 authored `effect.flags` 또는 엔진
  온보딩(`met_se_rin`/`refused_se_rin`)으로 생산 가능(하드 도달성), (2) route_branch
  `story_bible_entry` 전부 실재 bible id로 resolve, (3) **미생산 flag 0**: 모든 소비 flag가
  authored effect ∪ 엔진 ∪ `NARRATIVE_DRIVEN_FLAGS`(Director가 `world_delta`로 emit하는 가치축/서사
  상태 flag 12종, 명시 등록)에 속함(신규 orphan=dead branch면 ratchet fail), (4) 레지스트리 무부패(등록
  flag는 모두 실소비 + authored effect와 비중복). 코드 변경 없음(테스트만). **발견**: seed가 든 "choice
  `requires`"는 실제론 스킬 id prereq(flag 아님), chapter_gates는 산문 요약 → 둘 다 구조적 flag 소비자
  아니라 스캔 제외(테스트 docstring에 명시).
- Verified: `make check` EXIT=0 — ruff All passed + eslint + mypy Success(111 files) + frontend build +
  314 tests OK(skipped 2, 310→314). 위반 0 → 기계적 수정/Blocker 불요.
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 4종(스킬·아이콘/조우 무결성·승률 밴드·진행도 경제).

## 2026-06-14 — 엔딩 도달성 invariant 추가 ([auto], QA seed #2)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #2(엔딩 도달성 invariant) 박제. green.
- Changed: `tests/test_route_integrity.py`에 2건 추가(`build_route_map` full + `build_route_seed`
  dynamic ×24 seed) — (1) `scenario.endings`의 모든 엔딩 id가 route perspective `ending_influence`로
  도달 가능: 그 엔딩을 미는 노드가 start→boss 가시 경로 위에 ≥1개 존재(boss뿐 아니라 전 경로에서 누적 가능),
  (2) 참조 무결성: 모든 `ending_influence` 문자열이 실재 엔딩 id를 가리킴(오타/dangling push 0).
  헬퍼 `_influence_nodes`로 노드별 영향 수집. 코드 변경 없음(테스트만). 현재 neo-seoul 4 엔딩 전부 충족.
- Verified: `make check` EXIT=0 — ruff All passed + eslint + mypy Success(110 files) + frontend build +
  310 tests OK(skipped 2, 308→310). 위반 0 → 기계적 수정/Blocker 불요.
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 5종(플래그/스킬·아이콘/조우 무결성·승률 밴드·진행도 경제).

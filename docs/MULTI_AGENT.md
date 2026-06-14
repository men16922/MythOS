# MULTI_AGENT — 3엔진 병렬 Loop Engineering (Project MythOS)
최종 갱신: 2026-06-14

> claude·codex·agy 세 헤드리스 엔진이 **각자 worktree+브랜치에서 동시에** 무인 루프를 돌고,
> claude 가 오케스트레이션(레인 배정 + 통합 머지)한다. 코드 근거: `bin/overnight/{run.sh,PROMPT*.md,
> worktrees.sh,merge-loops.sh}`, `docs/LOOP_ENGINEERING.md`, `docs/NEXT_PLAN.md`.

## 0. 핵심 원리 — 충돌을 "구조"로 막는다
동시 작성 충돌은 의지가 아니라 **격리**로 막는다. 세 축이 겹치지 않게 한다:
1. **worktree 격리** — 엔진마다 다른 작업 트리 + 브랜치(`loop/{claude,codex,agy}`) → 같은 파일을 동시에 못 만진다.
2. **레인 분리** — `NEXT_PLAN` 작업에 엔진 접미사 태그 → 같은 항목을 둘이 집지 않는다.
3. **도메인 분할** — 엔진별 디렉터리 소유권 → 머지 충돌이 사실상 없다.
그 위에 기존 **동시 작성자 감지 STOP**(run.sh)이 최후 안전망으로 남는다.

## 1. 엔진 · 레인 · 도메인 · 게이트
| 엔진 | 레인 태그 | 소유 도메인(이 디렉터리만) | 샌드박스 | 게이트 | 브랜치 |
| --- | --- | --- | --- | --- | --- |
| **claude** | `[auto]` / `[auto:claude]` | `src/`, `tests/`, `harness/`, `bin/overnight/`, 복잡 리팩터·invariant·오케스트레이션 | `overnight-settings.json`(deny push/net/파괴) | `make check` | `loop/claude` |
| **codex** | `[auto:codex]` | Builder: `docs/`/scenario/story_bible 결정론 리팩터·검증·대화 스크립트. **+ Reviewer(Auditor)**: 통합 diff 읽기전용 감사 | `codex exec` workspace-write + no-net + `.git` writable | `make check`(빌드) / 읽기전용(리뷰) | `loop/codex` |
| **agy** | `[auto:agy]` | `resources/<scn>/{characters,characters/combat,concept,enemies,enemies/combat,opening,scenes}` 이미지 초안 + 간단 검증 | 없음(호스트 FLUX/MPS/네트워크 필요) → 프롬프트 가드레일 + 브랜치 격리 | **무결성 게이트**(자산 실존/치수/네이밍; make check 로 코드 무파손) | `loop/agy`(리뷰) |

- **codex = claude failover**: claude 회차가 `limit` 이면 러너가 codex 로 claude 레인을 대신 소비(Phase 6, `run.sh`).
- **agy 산출물은 리뷰 대상**: 이미지의 미적 "적합도"는 무인이 판단 못 한다 → `loop/agy` 에 쌓고 **사람이 아침에 검수**.
  자동 게이트는 무결성(있다/규격 맞다)만 본다. 누락 자산을 placeholder 로 **fabricate 금지**(PROMPT.agy.md §0).

## 1.5 생성자 ≠ 리뷰어 (Claude → Codex → Claude)
AI_REARCH 의 핵심 원리 적용: 만든 사람과 검수하는 사람을 분리해 자기확증 편향을 줄인다.
- claude/agy 가 자기 레인에서 **생성**(빌드/초안) → `overnight-merge` 로 `loop/integration` 통합.
- **codex 가 통합 diff 를 읽기전용 감사**(`make overnight-review` → `bin/overnight/review.sh` +
  `PROMPT.review.md`): 버그/엣지/테스트누락/단순화/성능을 채점해 `logs/review-latest.md` 1개만 쓰고
  **제안 후속작업**(레인 태그 포함)을 적는다. **코드·NEXT_PLAN 미수정**.
- 오케스트레이터(claude/사람)가 findings 를 `NEXT_PLAN` 에 반영 → 다음 회차에 claude 가 **수정**. 루프 완성.
- 이미지(agy)도 동일 정신: agy 가 in-session Imagen 으로 초안 + 적합도 리뷰(`outputs/combat-sprite-compare/*-review.md`),
  최종 미적 합격은 사람이 판단.

## 2. 왜 콘텐츠/이미지는 claude 코드 루프와 게이트가 다른가
이미지 생성은 호스트 FLUX/MPS + 네트워크가 필요하고 **비결정론**(같은 프롬프트도 매번 다름)이라 `make check`
로 박제할 수 없다. story_bible/대화 저작도 "느낌" 판단이라 무인 검증 불가다. 그래서:
- **Tier 1(결정론 코드)**: claude(+failover codex) → `make check` green → 자동 커밋. 안전.
- **Tier 2(콘텐츠/이미지)**: codex(결정론 리팩터/검증) + agy(이미지 초안) → **무결성 게이트**로만 자동 커밋,
  미적/서사 품질은 사람 검수. 자동 생성물은 main 직행이 아니라 리뷰 브랜치(`loop/{codex,agy}`)에 쌓인다.

## 2.7 운영 모델 선택 — worktree 게이트의 현실(실증 2026-06-14)
3엔진 병렬 실증서 확인된 **핵심 제약**: worktree 는 `.venv`/`node_modules` 가 없다(gitignore). 이를 메인에서
symlink 하면 **게이트가 깨진다** — (a) `.venv` symlink → editable install 이 메인 src 로 resolve → 코드변경
**false green**, (b) `node_modules` symlink → tsc/vite 가 공유 `.tmp` 에 써서 **EPERM**. 따라서:
- **모델 A — 코드 레인은 메인 체크아웃에서 순차(권장 기본).** claude/codex 의 `[auto*]` 코드 작업은 메인에서
  레인 태그 순서대로 `--once` 반복(동시작성자 STOP 이 안전망). 게이트가 faithful, 환경 중복 0. 단 "동시"는 아님.
- **모델 B — 진짜 worktree 병렬(코드 레인 포함).** `make overnight-worktrees-setup` 으로 worktree 마다 자체
  venv+node_modules 를 1회 provision(네트워크 필요, 사람이 루프 밖에서). 그러면 자체 editable install 이 그
  worktree src 를 가리켜 faithful. 비용: 디스크/시간.
- **이미지/문서 레인(agy, codex-docs)** 은 자체 환경 없이도 worktree 에서 가능(실증: agy 가 worktree 에서
  스킬 아이콘 6종 생성·커밋 성공). 코드 게이트가 필요 없기 때문.
→ **권장**: agy(이미지)는 worktree, claude/codex(코드)는 모델 A(메인 순차) 또는 B(provision 후 worktree).

## 3. 운영 (make 타깃)
```sh
# 1) worktree 격리 준비. .claude/.agents 만 symlink(.venv/node_modules 는 symlink 안 함 — 게이트 깨짐).
make overnight-worktrees          # 생성/갱신(+.claude/.agents symlink)
make overnight-worktrees-setup    # (모델 B) 코드 레인용 per-worktree venv+node_modules — 네트워크 1회
make overnight-worktrees-status   # 현황 + symlink 점검
make overnight-worktrees-down     # 제거(브랜치는 보존)

# 2) 각 엔진을 자기 worktree 에서 가동(별도 터미널/백그라운드 → 진짜 병렬)
(cd ../MythOS-loop-claude && make overnight-watch)              # claude 레인
(cd ../MythOS-loop-codex  && make overnight-codex-watch)        # codex 레인
(cd ../MythOS-loop-agy    && make overnight-agy-watch)          # agy 레인

# 3) 아침: claude 가 통합 + codex 가 리뷰 + 사람 검수
make overnight-merge              # loop/* → loop/integration + make check 재실행(push 안 함)
make overnight-review             # codex 가 main...loop/integration diff 읽기전용 감사 → logs/review-latest.md
# review findings 를 NEXT_PLAN 에 반영(다음 회차 claude 가 수정) → loop/integration 검수
# (특히 agy 이미지 미적 적합도) → 이상 없으면 main 머지/push.
```
- 각 worktree 는 자기 `bin/overnight/logs|STOP|DONE`(gitignore)를 가져 서로 간섭하지 않는다.
- 커밋은 각자 자기 브랜치(`loop/<eng>`)에 로컬만. **어느 엔진도 push 안 한다**(사람이 통합 후).

## 4. 한계 / 주의
- **agy 무샌드박스**: agy 는 호스트에서 무제한 실행된다. 경계는 `PROMPT.agy.md` 가드레일 + worktree/브랜치 격리뿐.
  파괴적 동작이 걱정되면 agy 레인은 사람이 더 자주 검수하거나 `agy --sandbox`(터미널 제한) 실험 후 채택.
- **레인 배정은 사람/claude 책임**: `[auto:codex]`/`[auto:agy]` 태그가 없으면 그 엔진은 즉시 `drained` 종료한다.
  배정 = `NEXT_PLAN` 태깅. claude 오케스트레이터가 작업을 도메인에 맞는 레인으로 태깅한다.
- **도메인 침범 금지**: 각 PROMPT §0/§3 이 소유 도메인 밖 수정을 금지한다. 침범 시 머지 충돌 + STOP 으로 드러난다.

## 5. 관련 문서
- 루프 하네스: `docs/LOOP_ENGINEERING.md` · 백로그/레인 태그: `docs/NEXT_PLAN.md`
- 설계 불변: `harness/CORE_MANDATES.md` · 이미지 표준: `docs/IMAGE_POLICY.md`

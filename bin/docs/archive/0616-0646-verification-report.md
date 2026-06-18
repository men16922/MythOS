# 자체 검증 보고 — 0616-0646 overnight 런

> 대상: `c41c72d7c..8d2fc77` (overnight 시드 A~O, 15 커밋, branch=main, ahead origin/main 23)
> 검수 체크리스트: `docs/test/history/0616-0646-overnight-review-checklist.md`
> 검증 일시: 2026-06-16 / 검증자: Claude (수동 diff 정독 + 표적 테스트 + 고장주입 3종)
> **결론: PASS — 15 커밋 전부 머지 가능 품질. feature 3종 로직 정합 확인, 가드 true-green 실증. 게임 깨짐/Blocker 신규 0.**

---

## 1. 무엇을 어떻게 검증했나

| 검증 방법 | 적용 대상 | 결과 |
|---|---|---|
| **게이트 재실측** `make check` | 전체 HEAD | EXIT=0 — ruff/eslint·mypy(116 files)·tsc+vite build·**417 tests** OK(skip 2) |
| **표적 테스트** 7개 모듈 verbose | 시드 관련 전부 | **195 tests OK** (route_runtime/runtime_session/progression/content_integrity/assets/api/scenario_directives) |
| **diff 정독** | feature 3종(L/M/N) + migration 006 | 로직 정합 확인(아래 §2) |
| **고장주입 3종** | L 더블카운트·N 누적·A 무결성 | **3/3 RED 확인** = 가드 true-green(아래 §3) |

`make check`/표적 테스트가 green인 것은 **허위 green일 수 있으므로**, 핵심 주장(L의 replay 더블카운트 방지, N의 크로스루프 누적, A의 dangling 탐지)에 대해 실제 버그를 주입해 테스트가 빨개지는지로 가드의 실효성을 직접 실증했다.

---

## 2. feature 3종 로직 정합 (diff 정독 결과)

### ⚠ L — `e5d589f` route relationship 누적 → **정합**
- `advance_route`는 매턴 visited 경로 **전체를 replay**한다. relationship을 persisted state에 `+=` 하면 매 replay마다 같은 델타가 재가산(더블카운트)된다.
- 구현은 ending tally와 **동형**으로 처리: route 기여를 `rel_tally`로 매턴 fresh 재계산 → `route_map["relationship_tally"]`에 저장 → `_reconcile_relationships(current, prev_route_tally, new_route_tally)`가 **이전 route tally 차감 + 새 route tally 가산**으로 state에 반영.
- 효과: replay 멱등(매 replay net = route tally 1회분만) + **비-route 기여(choice 델타) 보존**. 0 잔액 prune, 음수 델타 지원, 비정상 값 `try/except` skip.
- 첫 호출 시 `route_map.get("relationship_tally")`=None → 차감 skip, 가산만 → 정확.

### ⚠ M — `016668c` session choice relationship 누적 → **정합**
- `Choice.effect: dict|None` 필드 신설(Director 생성 choice는 None). `_choice_relationship`이 선택된 choice의 `effect.relationship`만 추출.
- 핵심은 **순서**: `_commit_scene`이 `fold_relationship`으로 choice 델타를 `state["relationships"]`에 fold한 **직후** `advance_route` 호출. route의 `_reconcile_relationships`는 route tally 차분만 조정하므로 fold된 choice 기여를 보존 → route+choice가 더블카운트 없이 합산.
- 누락 케이스 가드: free-text action/unknown choice/effect 없는 choice → `{}` 반환(no-op).

### ⚠ N — `bb4b0c1` progression 크로스-루프 이월 → **정합 (double-count-safe 확인)**
- 가장 미묘한 지점은 **루프 간 더블카운트**. 검증: `apply_meta_progression_to_state`(progression.py:360)가 누적 relationships를 **`state["meta_progression"]`에만** 기록하고 **live `state["relationships"]`에는 절대 seed하지 않음**을 직접 확인.
- 따라서 새 루프는 live relationships를 **빈 채로 시작**(이번 런 route+choice 델타만 채움) → archive 시 `_run_summary_memory_from_archive`가 `loop.state["relationships"]`(이번 런분만) 추출 → `_merge_relationships`가 previous 누적에 1회만 가산. **insight 패턴과 정확히 동형, 재가산 없음.**
- `_merge_relationships`/`_relationship_tally`: 비정상 값 coerce·0 prune으로 route_runtime의 표준형과 일치.

### migration `006_progression_relationships.sql` → **안전**
- `ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS relationships JSONB NOT NULL DEFAULT '{}'::jsonb`.
- `IF NOT EXISTS` = 재적용 멱등. `DEFAULT '{}'` = 기존 행에 안전한 백필(NOT NULL 위반 없음). postgres_store `_PROGRESSION_DICT_COLS=("skill_ranks","relationships")`로 dehydrate/hydrate 기본값 정합.
- ⚠ **단, `make check`는 DB를 띄우지 않으므로 migration 실제 적용은 미실측**(코드/SQL 정독 기반 판단). 머지 전 `make db-migrate` 1회 권장.

---

## 3. 고장주입 — 가드 true-green 실증 (3/3)

| # | 주입한 버그 | 빨개진 테스트 | 진단 메시지 |
|---|---|---|---|
| **L** | `_reconcile_relationships`에서 이전 route tally 차감 제거(naive 재가산) | `test_replay_does_not_double_count`, `test_non_route_contribution_preserved` (2건) | 기대 `{kai:5, se_rin:1}` 불일치 |
| **N** | `_merge_relationships`에서 이번 런분을 `*2` 가산(compounding) | `RelationshipCarryOver` 4건 (accrues/cumulative/round-trip/prune) | 누적값 불일치 |
| **A** | neo-seoul scenario에 `effect.relationship["__ghost_companion__"]` 주입 | `test_every_relationship_key_resolves_to_ally_or_declared_subject` | `["neo-seoul:'__ghost_companion__'"] != []` + "a typo silently accrues affection for a ghost companion" |

세 주입 모두 **정확히 그 버그를 잡는 테스트만 빨개졌고**, A는 사람이 읽을 수 있는 진단 메시지까지 출력했다. 주입 후 전부 `git checkout`으로 복원 — 작업 트리 clean(`git diff` 빈 출력) 확인.

---

## 4. 커밋별 품질 요약 (15/15)

**feature 3종 (검수 최우선):**
- L `e5d589f` · M `016668c` · N `bb4b0c1` — ✅ 로직 정합 + 가드 true-green(L/N 고장주입 확인, M 순서 정독 확인).

**test-add 7종 (허위 green 점검):**
- A `222b8d5`(relationship 타깃) — ✅ 고장주입 RED 확인, `lin_yue` 비전투 동료 `relationship_subjects` 선언은 npc_agenda allowlist 패턴과 일관.
- B `2cd397c`(effect 키 closure) · E `2971a71`(ending 참조) · F `32566d3`(route node-type) · G `0c085eb`(이미지 ref) · H `8a83545`(perspective when) · O `8d2fc77`(serializer 계약) — ✅ 전부 표적 테스트 green, 각 커밋 메시지의 고장주입 기록(CAUGHT) 보유. G의 "스킬 아이콘 제외"는 의도적(별도 `[blocked]` 73 관장, dead-asset 은폐 아님).

**refactor 3종 (동작 불변 점검):**
- C `259d68e`(fallback) · I `008f3a6`(naming) · J `a960a30`(stat-voice) · K `807744f`(encounter) — ✅ 전부 **byte-parity 테스트** 보유(loaded == DEFAULT 상수), generic 기본값으로 glass-library 회귀0, 선택/임계 로직 STAY.
- D `20c39a9`(node/beat 파싱) — ✅ `NodeBeatAddressingTest` 4건 green, 기존 opening beat 동작 불변(`test_neo_seoul_opening_beats_have_no_node_address`).

---

## 5. 한계 / 사람이 더 봐야 할 것

- **migration 006 DB 미실측**: `make check`는 무-DB. 머지 전 `make db-migrate`로 실제 적용 1회 확인 권장(SQL 정독 상 안전).
- **호감도 게임 feel은 미검증**: 본 보고는 *런타임 정합*만 다룬다. `effect.relationship` 델타가 실제 플레이에서 컷씬 언락/서사에 의미 있게 작용하는지는 `[manual]` 사람 플레이 QA 영역(프론트 게이지 UI도 아직 미구현 `[manual]`).
- **end-to-end choice.effect 배선**: M의 `Choice.effect`가 저작 데이터→`scene.choices[].effect`까지 실제로 흐르는지는 `test_runtime_session.py`(+170줄)가 단위로 커버하나, 라이브 LLM 경로 통합은 사람 QA에서 확인 권장.

## 7. 라이브 QA — 런타임 직접 구동 (호감도 누적 end-to-end)

Docker 미가동(Postgres↓)이라 CLI 경로는 불가. 호감도 누적은 **결정론 로직**(route/choice/progression, LLM·DB 비의존)이므로, **실 neo-seoul scenario 데이터를 실제 함수(`advance_route`·`fold_relationship`·`evaluate_meta_progression`·`apply_meta_progression_to_state`)에 통과**시킨 in-process 드라이버로 4개 시나리오를 직접 구동했다(PROGRESS_LOG의 in-process 드라이버 패턴).

| QA | 시나리오 | 관찰 결과 | 판정 |
|---|---|---|---|
| **1** | 신뢰 루트 turn 2→4→6→8 advance | `{se_rin:1}` → `{se_rin:1, lin_yue:1}` → … → `{se_rin:2, lin_yue:1}` | ✅ authored effect가 실제 state에 누적(dead-data 아님). 실 데이터에서 `lin_yue`도 turn 4에 누적됨 발견 |
| **2** | 같은 경로 반복 advance(turn 2×3, 12×2) | `se_rin` 값 변동 없음(=1, 이후 2) | ✅ replay 멱등, 더블카운트 0 |
| **3** | route `{se_rin:1}` + choice fold `{kai:2, se_rin:1}` → 재advance | `{se_rin:2, kai:2, lin_yue:1}` | ✅ route reconcile 후 choice 기여(kai) 보존, se_rin 합산 |
| **4** | 루프1 `{se_rin:3,kai:1}` archive → meta → 루프2 `{se_rin:2,kai:-1}` | 다음 루프 live state `relationships`=**None**(미seed), meta 누적 `{se_rin:5}`(kai 1-1=0 prune), grant `relationship:se_rin:+3` | ✅ 루프 간 재가산 없음 + 정확한 누적 |

**4/4 PASS.** 특히 QA4가 §2의 N double-count-safe 판단을 *실 데이터로 재확인* — 다음 루프 live `state["relationships"]`가 비어서 시작하므로(meta_progression에만 누적) archive 시 재추출해도 compounding 없음. 실 scenario 신뢰 루트가 `se_rin`+`lin_yue` 양쪽을 누적하고 grant 노트까지 정상 생성됨을 라이브로 확인.

> 한계: 이 드라이버는 핵심 함수를 실 데이터로 구동하지만 **풀스택(FastAPI/WS/프론트 게이지) 경로는 아님** — 그 부분 + 게임 feel은 `[manual]` 사람 플레이 QA 잔여.

## 6. push 권고

15 커밋 전부 정합·green·가드 실증 통과 → **push 가능**(사람 직접; 러너/에이전트 push 금지). 머지 전 `make db-migrate` 1회만 추가 확인. 미통과 커밋 없음 → revert 대상 없음.

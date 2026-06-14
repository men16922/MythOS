# Progress Log

최종 갱신: 2026-06-14

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

## 2026-06-15 — item.kind enum closure invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` item.kind enum closure 박제. green.
- Changed: `tests/test_content_integrity.py`에 `ItemKindEnumIntegrityTest` 1건 추가 — 모든 `combat.items[].kind`가 게임이 실제 인식하는 집합 {`consumable`,`equipment`,`key`,`data`,`material`}에 속함을 검증. 인식 집합 근거: 프론트 `CharacterPanel.tsx`의 `KIND_LABELS`/카테고리 매핑 + 런타임 `session.py`의 consumable 사용 게이트(`kind != "consumable"`이면 전투 사용 불가). 미지 kind는 generic "item" 버킷으로 흘러 사용/착용 불가 → 오타 가드. 무기 `kind`(melee/ranged)는 `combat.weapons` 별도 네임스페이스라 스코프 제외(주석 명시).
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 342 tests OK(skipped 2, +1). 측정 기준선: items 11종(nanopatch/stim_shard/access_key/data_fragment/drone_scrap/signal_blade/mesh_vest/emp_grenade/heavy_exosuit/stealth_cloak/overload_stim) 전부 인식 kind, 미지 kind 0.
- Blockers: 없음.
- Next: 잔여 QA seed — story_bible 메타 무결성·FastAPI on_event 현대화·dotenv type:ignore 중앙화·npc_agenda 주체 무결성(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — encounter 수치 경계 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` encounter 수치 경계 박제. green.
- Changed: `tests/test_content_integrity.py`에 `EncounterBoundsIntegrityTest` 3건 추가 — 모든 `combat.encounters[*]`의 ① `enemies[].count`가 정수 ≥1(0/음수=빈 측 스폰→의도치 않은 즉시 walkover), ② `weight`가 양수 수치(비양수=가중 추첨서 도달 불가하거나 추첨 손상), ③ `arena.{width,height}`가 양수(0/음수=합법 타일 없는 퇴화 보드)를 검증. bestiary 참조는 기존 `ContentEncounterIntegrityTest`가 커버하므로 수치만 가드. bool은 int 서브클래스라 명시 제외.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 341 tests OK(skipped 2, +3). 측정 기준선: 조우 8종 전부 count≥1·weight>0·arena dims>0, 위반 0.
- Blockers: 없음.
- Next: 잔여 QA seed — item.kind enum closure·story_bible 메타 무결성·FastAPI on_event 현대화 등(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — loot_table↔items 참조 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` loot_table 참조 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `LootTableIntegrityTest` 2건 추가 — 모든 `combat.loot_tables[*][].item`이 `combat.items`에 실재(dangling drop=인벤토리에 못 들어오는 보상) + 각 roll의 `weight`가 양수 수치(0=뽑힐 수 없는 엔트리, 음수=가중 추첨 손상). 기존 `_as_records`/`_record_id` 헬퍼로 item id 집합 정규화.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 338 tests OK(skipped 2, +2). 측정 기준선: loot_tables 3종(drone_scrap/enforcer_core/data_cache), dangling item 0·비양수 weight 0.
- Blockers: 없음.
- Next: 잔여 QA seed — encounter 수치 경계·item.kind enum closure·story_bible 메타 무결성 등(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 아키타입 집합 정합 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` 아키타입 집합 정합 박제. green.
- Changed: `tests/test_progression.py`에 `NeoSeoulArchetypeConsistencyTest` 3건 추가 — 실제 `neo-seoul` 데이터로 ① `archetype_base_skills`·`archetype_loadout`의 아키타입 키 집합 동일(한쪽에만 있는 아키타입 0), ② 각 아키타입 base 스킬이 `combat.skills`에 실재, ③ 각 아키타입 loadout 무기가 `combat.weapons`에 실재를 검증. dict/list 풀 모두 `_pool_ids`로 정규화.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 336 tests OK(skipped 2, +3). 측정 기준선: 아키타입 3종 base↔loadout 일치·dangling 스킬 0·dangling 무기 0.
- Blockers: 없음.
- Next: 잔여 QA seed — agy 아이콘 재생성 후 스킬/아이콘 PNG 무결성(`[blocked]` 선행). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 스킬 데이터 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` 스킬 데이터 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `SkillDataIntegrityTest` 6건 추가 — 모든 `combat.skills[]`가 필수 필드(`id`/`name`/`cost`/`effect`) 보유, `cooldown`/`range`/`cost.focus`가 존재 시 음수 아님, `archetype_base_skills`·`allies[].skills`·`skill.requires`의 모든 스킬 참조가 `combat.skills`에 실재, `skill.epiphany` 해금이 실재 `combat.epiphanies` 키 참조를 검증. dict/list 풀 모두 `_as_records`로 정규화(기존 헬퍼 재사용).
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 333 tests OK(skipped 2, +6). 측정 기준선: 결손 필드 0·음수 0·dangling 스킬 참조 0·dangling epiphany 0(`patch_protocol` cost는 `item` 키라 focus 검사는 존재 시에만).
- Blockers: 없음.
- Next: 잔여 QA seed — 아키타입 집합 정합(`[auto:claude]`), agy 아이콘 재생성 후 스킬/아이콘 PNG 무결성. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 무기/장비 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` 무기/장비 참조 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `WeaponEquipmentIntegrityTest` 4건 추가 — `archetype_loadout`·`allies[].weapons`·`bestiary[].weapons`의 모든 무기 참조가 `combat.weapons`에 실재, `kind:equipment` 아이템의 `slot`∈{weapon,armor}, `stats` 키⊆ Combatant 스탯 집합을 검증. 스탯 집합은 `mythos_combat.factory._DEFAULT_STATS`(equip 보너스 머지 대상)를 단일 진실원으로 import해 하드코딩 회피. dict/list 풀 형태 모두 정규화(`_as_records`).
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 327 tests OK(skipped 2, +4). 측정 기준선: dangling 무기 0·invalid slot 0·unknown stat 0.
- Blockers: 없음.
- Next: 잔여 QA seed — 스킬 데이터 무결성·아키타입 집합 정합(`[auto:claude]`), agy 아이콘 재생성. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 진행도 경제 invariant ([auto:codex], QA seed)
- Status: overnight QA seed `[auto:codex]` 진행도 경제 invariant 박제. green.
- Changed: `tests/test_progression.py`에 `NeoSeoulProgressionEconomyTest` 3건 추가 — 실제 `neo-seoul` 스킬 데이터의 learn/rankup 비용 tier 단조성, tier 0 아키타입 기본 접근성, 보수적 통찰 수입(첫 런/2런) 내 tier별 도달 가능성을 검증.
- Verified: `tests.test_progression` 17 tests OK. `make check` EXIT=0 — ruff/eslint/mypy/frontend build + 323 tests OK(skipped 2).
- Blockers: 없음.
- Next: 잔여 QA seed는 agy 스킬 아이콘 재생성 및 선행 해제 후 스킬/아이콘 무결성 invariant.

## 2026-06-14 — 조우 승률 밴드 invariant ([auto:claude], QA seed)

- Status: overnight QA seed `[auto:claude]` 조우 밸런스 invariant 박제(대화형, 첫 회차 안전성 위해). green.
- Changed: `tests/test_encounter_balance.py` 신설(3 tests). 고정 시드 그리디 시뮬(기본공격=보수적 하한)로
  **양면 가드** — ① 대표 파티(player+se_rin+kai, `controllable=True`) 승률 ≥0.50(불가능 가드), ② 솔로 ≤0.95(공짜
  가드) + 결정론 검증. **단일 55~98% 밴드는 실측 불성립**(skill-less 그리디+가변 파티 → 0.00~1.00)이라 양면 설계로 전환.
  리뷰 findings 2건(동료 `controllable=True`·100% 천장 실효화) 반영.
- Verified: `make check` EXIT=0(320 tests, +3). mypy/ruff clean. 측정 기준선: party 0.96~1.00, solo 0.00~0.79.
- Blockers: 없음.
- Next: 잔여 QA seed — 진행도 경제(`[auto:codex]`)·agy 아이콘 재생성. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — Engineering 문서 바이블↔해석 정립 + /sync 연속성 수정 + 로깅/대시보드 + skills 정합

- Status: 엔지니어링 정비 트랙 WS0~WS3 + skills 최적화 완료(WS4 콘텐츠 파이프라인은 plan-only). `HARNESS_RESEARCH` 개념 흡수.
- Changed:
  - **WS0 연속성 버그**: 지난 plan-only 세션이 `/sync` 로 안 이어진 근본원인 규명 — 예약 작업을 NEXT_PLAN 서두 노트 +
    repo 밖 스크래치 경로(`~/.claude/plans/*`)로만 남겨 권위 active focus 가 아니었음. 수정: **Resume Pointer 컨벤션** 신설
    (`AGENT_BRIEF` 최상단 `▶ NEXT SESSION` + 3진입문서 일치 + in-repo 경로 강제), sync/checkpoint SKILL·DOCS_POLICY 명문화.
  - **WS1/2 바이블→해석**: `docs/engineering/` 신설 — 범용 바이블 5종(`{HARNESS,LOOP,AGENTIC,CONTEXT,PROMPT}_ENGINEERING.md`,
    portable) + `mythos/` 해석 5종(이 repo 매핑). `docs/{LOOP_ENGINEERING,MULTI_AGENT}.md`→`mythos/{LOOP,AGENTIC}.md` 이동.
    원시 리서치(`AI_REARCH`·`HARNESS_RESEARCH`)→`bin/docs/archive/`. 진입점 슬림화(GEMINI 76→28줄, 공유 read-path). 참조 codemod.
  - **WS3 로깅/대시보드**: `run.sh` 회차 머신리더블 원장(`logs/status.tsv`), `status.sh`(lane 집계 트리),
    `dashboard.sh`+`make overnight-dashboard`(tmux 멀티페인, watch 없는 macOS 용 shell 루프), `overnight-status` 강화.
  - **skills 정합**: sync·checkpoint·tidy-docs·overnight-report 갱신(Resume Pointer·바이블↔해석·경로) + 4개 에이전트 dir 미러 동기화.
- Verified: `make check` EXIT=0(317 tests OK, skipped 2). 깨진 md 링크 0(engineering 트리 + 외부 참조). `status.sh` idle/running 렌더 실측. shell `bash -n` 통과.
- Blockers: 없음.
- Next: WS4(agy→codex 콘텐츠 이미지 파이프라인)은 plan-only. 실제 최우선은 Neo-Seoul 사람 QA([manual]) + 잔여 [auto] QA seed.

## 2026-06-14 — Model B 3엔진 병렬 실증 + 자체 이미지·리뷰어 + skills 사고·복구·git추적

- Status: 3엔진(claude/codex/agy) 병렬 루프를 worktree 격리로 end-to-end 실증 + 후속 하드닝. skills 손실 사고 복구.
- Changed:
  - **자체 이미지**: agy/codex 가 FLUX 대신 in-session Imagen/Gemini 로 생성 → `outputs/agy/<주제>/` 스테이징 후 resources/ cp(`PROMPT.agy.md`).
  - **하이브리드 codex 리뷰어**(생성자≠리뷰어, AI_REARCH): `review.sh`/`PROMPT.review.md`/`make overnight-review` → `logs/review-latest.md`. `docs/research/AI_TEAM_BLUEPRINT.md` 신설.
  - **Model B(worktree 병렬)**: 코드 레인 게이트는 worktree 자체 env 필요 → `make overnight-worktrees-setup`(per-worktree venv `.[dev,web]`+node_modules). symlink(.venv/node_modules) 금지(false green/EPERM). codex worktree commit = writable_roots 에 git common dir.
  - **공유 문서 충돌 완화**: `PROGRESS_LOG.md merge=union`(.gitattributes) + 엔진은 NEXT_PLAN 자기 레인 한 줄만/STATUS는 오케스트레이터.
  - **skills 사고·복구**: skills 가 gitignore+symlink 라 머지 checkout churn 이 메인 skills 삭제 → 트랜스크립트에서 4종 전량 복구 → **git 추적 전환**(`.claude/.agents/.codex/.gemini` 4곳, `<dir>/*`+`!<dir>/skills/`), worktree symlink 제거.
- Verified: 병렬 3엔진 각 worktree 자체 env 로 `make check` green 커밋(claude 승률밴드/agy 아이콘/codex). codex 리뷰어가 실제 [high] 버그(symlink 추적) 적발. notify Mail.app 실발송. `agy --print`/`codex exec` 헤드리스 실측. tidy 후 진입점 60/101/120/72.
- Blockers: agy 아이콘 1차 **미적 반려**(`outputs/agy/skills/VERDICT.md`, 엄격 템플릿 재생성 필요). 승률밴드 codex 리뷰 findings 2건(`review-latest.md`). main `ahead 27` 미푸시(분류기 차단, 사용자 직접).
- Next: (실제 최우선) Neo-Seoul 사람 플레이 QA. 자동 잔여: 진행도 경제(`[auto:codex]`)·승률밴드 재측정·아이콘 재생성.

## 2026-06-14 — 3엔진 병렬 Loop Engineering + BGM OFF 수정

- Status: claude·codex·agy 3엔진 병렬 무인 루프 토대 구축 + 실패 메일 + failover + BGM 버그 수정. 6 phase 완료.
- Changed:
  - **BGM OFF 버그**: `useAudio.ts` — stale closure(WS onmessage)가 매 턴 음악 재생 → `bgmEnabledRef` 단일 진실원 게이트로 수정.
  - **agy 엔진**: `run.sh` 3엔진 case(`ENGINE=claude|codex|agy`), `PROMPT.agy.md`(이미지 초안 레인, 무샌드박스+가드레일), `make overnight-agy*`. agy --print 헤드리스 실측.
  - **병렬 격리**: `worktrees.sh`(loop/{claude,codex,agy} worktree + .claude/.agents symlink), 레인 태그(`[auto:claude|codex|agy]`, 각 PROMPT 자기 레인만), `merge-loops.sh`/`make overnight-merge`(통합+게이트, push 안 함), `docs/engineering/mythos/AGENTIC.md`.
  - **이미지 무결성 게이트**: `tests/test_image_assets.py`(유효/비어있지않음/치수/용량 — fabricate 차단, make check 포함, 317 tests).
  - **실패 메일**: `notify.sh`(SMTP→Mail.app), run.sh 가 실패 클래스(연속 실패/all-blocked)에서만 발송.
  - **failover**: claude 한도 시 codex 가 claude 레인 대신 소비(1회 자동 전환).
- Verified: `make check` rc=0(317). worktree 3개 생성+symlink+merge 실측. agy/codex 헤드리스 실측. notify Mail.app 실발송 확인.
- Blockers: agy 무샌드박스(경계=프롬프트+worktree). 누락 스킬아이콘 6종은 `[auto:agy]` 초안 task 로 대기.
- Next: `make overnight-worktrees` 후 3엔진 병렬 실가동(사용자 판단). 아침 `make overnight-merge`+검수.

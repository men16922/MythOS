# Progress Log

최종 갱신: 2026-06-07

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는
`bin/docs/archive/progress-2026-05.md`를 본다.

## 2026-06-07 — Combat Polish: 모션 다양화 + reduced-motion 접근성

- Status: [x] Priority 1 후속 polish 완료(저위험, 자족적).
- Changed:
  - `combatAnim.ts`: defense/support 스킬이 동료에게 부여될 때(target≠source) 시전자→동료 이동 펄스 + 동료 위치 실드 링, melee `burst` 태그에 외향 충격파 링 추가.
  - `App.tsx`: `prefersReducedMotion()` 시 타자기 즉시 플러시, 진입 켄번/글리치 시네마틱 스킵.
  - `index.css`: 전역 `@media (prefers-reduced-motion: reduce)` — ambient 루프 애니메이션(켄번 팬/글리치/블링크) 무력화 + 트랜지션 축소(전투 보드/시네마는 기존 JS 게이팅 유지).
- Verified: `make frontend-lint`/`make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린. `make test` 영향 없음(223/2 skipped 유지).

## 2026-06-07 — Scenario Expansion: 데이터 주도 진행도 + glass-library 패리티

- Status: [x] 진행도 grant를 scenario.json 데이터 주도로 전환(시나리오 비종속), glass-library를 progression/presentation 패리티로 보강. 공유 캐시 오염 버그 수정.
- Changed:
  - `progression.py`: `evaluate_meta_progression`이 `archetypes[].unlock`·`combat.skills[].epiphany`(+`combat.epiphanies` 매핑)에서 아키타입/스킬 해금을 **데이터 주도**로 도출. 깨달음은 **해금만**(자동 습득 제거) → Phase 2 통찰 습득과 일관. `_condition_met` 헬퍼, `_DEFAULT_EPIPHANY_CONDITIONS`. 하드코딩 neo-seoul grant 제거(시나리오 교차 오염 버그 수정). 호출부(`ProgressionService`/`session.py`)가 scenario 전달.
  - `scenario.py`: `ScenarioConfig.unlock`/`unlock_hint`(Phase 3) 외 — neo-seoul/glass `combat.epiphanies` 추가.
  - `neo-seoul/scenario.json`: `combat.epiphanies` 추가.
  - `glass-library/scenario.json`: 아키타입 `base_skills`/`unlock`/`unlock_hint`, `combat.archetype_base_skills`, `combat.epiphanies`, 스킬 `tier`/`epiphany`/`requires`/insight 비용, `ui_copy`(signal/boot/intro/session_intro) 추가.
  - `mythos_combat/engine.py`: `CombatEngine`가 lru_cached scenario의 skills dict를 **복사**해 보관(테스트의 `engine.skills_pool[...]` 변형이 캐시를 오염시키던 버그 수정).
- Verified: `make test` 223 tests / 2 skipped(+1 신규, 1 재작성), `make frontend-lint`/`make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린. neo-seoul/glass 진행도 시나리오 스코프 분리 확인.

## 2026-06-07 — Controllable Party Allies (파티 조작 2단계)

- Status: [x] 파티원 직접 조작 / 비파티 동맹 AI 유지. 전투 턴 루프를 player-only stop에서 controllable-actor stop으로 일반화.
- Changed:
  - `mythos_combat/models.py`: `Combatant.controllable` + `is_controllable` 프로퍼티, `CombatState.active_actor()`/`living_controllables()`.
  - `mythos_combat/engine.py`: `_run_opening`/`_run_until_controllable`가 임의의 조작 가능 유닛에서 정지. `take_player_turn`·`available_actions`가 `active_actor` 기준으로 동작(도주는 PLAYER만, 파티원은 거부). `_check_outcome` 패배 판정 = 조작 가능 유닛 전멸. 라운드 upkeep 헬퍼 통합(`_tick_round_upkeep`). `available_actions`에 `active_actor_id/name`/`is_player` 노출.
  - `mythos_combat/factory.py`: `build_ally_combatant(controllable=...)`.
  - `mythos_runtime/combat_service.py`: `_build_allies`가 `_party.members` 소속만 `controllable=True`, flag 해금 동맹은 AI 유지.
  - 프론트: `types.ts` `CombatAvailableActions`에 active actor 필드, `CombatControls`가 현재 차례(플레이어/동료) 표시 + 파티원 턴엔 도주 버튼 숨김, `index.css` `.active-actor`.
- Verified: `make test` 222 tests / 2 skipped(+3 신규: 파티원 입력 대기, 파티원 도주 불가, AI 동맹 자동 진행), 단일 플레이어 회귀 무손상, `make frontend-lint`/`make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린.

## 2026-06-07 — Progression Skills / Archetypes Phase 3 (깨달음 연출 + 시나리오 해금)

- Status: [x] 시나리오 간 해금 게이팅 + 깨달음(새 해금 스킬) 알림 배너 구현.
- Changed:
  - `scenario.py`: `ScenarioConfig`에 `unlock`/`unlock_hint` 필드 + 로더.
  - `progression.py`: `scenario_unlock_met`(tutorial_completed / runs_completed 조건; unlock 없으면 항상 해금) 추가.
  - `glass-library/scenario.json`: `unlock={"tutorial_completed": true}` + 힌트(Neo-Seoul 튜토리얼 완료 시 해금).
  - `app.py` `/scenarios`: 시나리오별 `unlocked`/`unlock_hint` 계산(플레이어 메타 기준), 메모리 조회 1회로 통합.
  - 프론트: `types.ts`(`ScenarioInfo.unlocked/unlock_hint`, `RunSummary.unlocks_granted/scenario_id`), `OnboardingPanel`(잠긴 시나리오 옵션 disabled + 🔒 힌트 + start 게이팅), `App.tsx`(기본 선택을 첫 해금 시나리오로, 깨달음 배너 = 최근 런 `unlocks_granted`에서 신규 스킬 추출, localStorage 1회 dismiss), `viewModels.ts`(`buildEpiphanyNotice`), `index.css`(`.epiphany-banner`/`.ob-scenario-lock`).
- Verified: `make test` 219 tests / 2 skipped(+5 신규), `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린.

## 2026-06-07 — Progression Skills / Archetypes Phase 2 (통찰 투자)

- Status: [x] 통찰 포인트 적립 규칙, learn/rank-up API, Codex 습득/강화 버튼, tier 선행 게이팅 구현.
- Changed:
  - `progression.py`: 통찰 적립(`_insight_accrual` = run+2/clue+1/win+1)을 `evaluate_meta_progression`에 배선하고 grants에 `insight_points:+N` 기록. `build_skill_tree`(노드별 status/rank/max_rank/learn·rankup cost/requires/requires_met/action/can_afford), `learn_or_rank_skill`(해금·선행·잔액·최대랭크 검증 후 통찰 소비, ValueError로 사유 반환), `base_skills_for_archetype` 헬퍼 추가. `ProgressionService.skill_tree/learn_skill` 메서드로 메타 진행 영속화.
  - `scenario.json`: combat 스킬에 `insight_cost`/`rankup_cost`/`max_rank`/`requires`(tier1 선행 노드) 메타 추가.
  - `session.py`: `skill_tree`/`learn_skill` 서비스 메서드(플레이어 아키타입 기준).
  - `app.py`: `GET /api/v1/players/{id}/skills`(트리 상태) + `POST /api/v1/players/{id}/skills/learn`(통찰 소비, 잘못된 액션 시 400) 엔드포인트, `LearnSkillRequest`.
  - 프론트: `types.ts` `SkillTreeNode`/`SkillTreeResponse`, `api.ts` `apiGetSkillTree`/`apiLearnSkill`(detail 메시지 surfacing), `App.tsx` skillTree/learning/error 상태 + `loadSkillTree`/`handleLearnSkill`(codex 탭 진입 시 로드), `CodexPanel.tsx` 통찰 잔액 + 습득/강화 버튼 + 선행/잔액 비활성 + 에러 표시, `index.css` `.skill-tree-action`/`.skill-tree-error`.
- Verified: `make test` 214 tests / 2 skipped(+9 신규), `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린.

## 2026-06-07 — Progression Skills / Archetypes Phase 1

- Status: [x] 아키타입 해금 게이트, 전투 스킬 base+learned 필터, Codex read-only Skill 트리 구현.
- Changed:
  - `progression.py`: `unlocked_archetypes`/`unlocked_skills`/`learned_skills`/`skill_ranks`/`insight_points`/`epiphanies_seen` 메타 진행 버킷 추가. Ghost 기본 해금, 첫 런/단서/전투승리 조건으로 아키타입·스킬 자동 grant.
  - `scenario.json`: 아키타입별 `base_skills`, unlock 조건/힌트, combat `archetype_base_skills`, 스킬 tier/epiphany/unlock_hint 메타 추가.
  - `/api/v1/scenarios`: `player_id` 쿼리 기준 메타 진행도를 반영해 아키타입 `unlocked` 상태와 스킬 목록을 내려줌.
  - `OnboardingPanel`: 잠긴 아키타입 disabled 표시, 기본 스킬/해금 힌트 노출.
  - `CombatService`: 시나리오 전체 스킬 대신 선택 아키타입 기본 스킬 + learned 스킬만 플레이어 액션으로 노출.
  - `CodexPanel`: snapshot/scenario 기반 read-only Skill 트리 추가(상태, 랭크, 역할, tier, cost/range/cooldown/tags/hint).
- Verified: `make test` 205 tests / 2 skipped, `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py`.

## 2026-06-07 — BGM Retry + Combat SFX Impact Polish

- Status: [x] BGM 무음 회귀 방지, MusicGen 기반 전투 효과음 타격감 강화, play-checklist 완료 처리.
- Changed:
  - `HeaderBar.tsx`/`App.tsx`/`index.css`: 최상단 우측 persistent BGM START/ON/OFF 토글 추가. 사용자 제스처로 오디오를 unlock하고 localStorage에 on/off 선호를 유지.
  - `BootIntro` enter 흐름: 메인 화면 진입 클릭에서 `bgm_main.wav`를 즉시 재생해 시작 전 메인 BGM 무음 문제를 해소. 세션 종료 후 메인으로 돌아올 때도 BGM ON 상태면 main BGM으로 복귀.
  - `App.tsx`: BGM 경로 정규화/재시도 로직 개선. 파일 로드 실패나 autoplay 차단 뒤 같은 BGM 경로가 재생 재시도를 막지 않도록 `currentBgmSrc`를 복구하고, 기존 재생 중인 곡만 early-return. 전투 시뮬레이터 직행도 `bgm_combat_normal.wav`를 명시적으로 재생.
  - `App.tsx`: CombatCinema cue 볼륨을 상향하고 SFX volume clamp 추가.
  - `scripts/generate_sfx_resources.py`: `combat-impact` 모드 추가. `facebook/musicgen-small`로 attack/defend/move/glitch를 짧고 강한 one-shot 프롬프트로 재생성하고 transient/sub punch 후처리 적용. `skills-only` 스킬 SFX도 동일 방향으로 프롬프트 강화.
  - `tests/playwright/test_e2e_play_checklist.py`: mock BGM을 실제 wav 리소스 경로로 교체하고, request 이벤트 기반으로 exploration/combat BGM 및 skill/impact SFX 요청 검증.
  - `docs/NEXT_PLAN.md`/`docs/play-checklist.md`: Priority 1 전투 연출을 현재 플레이 기준 완료 처리, 다음 신규 기능 우선순위를 Progression Skills / Archetypes로 정리.
- Verified: MusicGen WAV 재생성 완료(32kHz, one-shot), `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` (`bgm_main.wav` 메인 진입/복귀 요청 포함).

## 2026-06-07 — Combat Skill SFX + Combat Result Image

- Status: [x] 전투 시네마 오버레이 스킬별 MusicGen SFX cue와 전투 종료 결과 이미지 패널 구현.
- Changed:
  - `CombatCinema.tsx`: enter/windup/impact/exit cue 콜백 추가, 스킬 카드 전용 SFX가 읽히도록 windup 타임라인 소폭 확장.
  - `App.tsx`: CombatCinema cue를 스킬별 `audio/sfx/skills/<skill_id>.wav`와 impact/defend/move 공용 SFX에 연결. 오버레이 이후 보드 애니메이션은 승패 종료음만 재생해 타격음 중복을 줄임.
  - `scripts/generate_sfx_resources.py`: `skills-only` 모드 추가, `facebook/musicgen-small`로 `signal_step/overload_strike/packet_shot/covering_noise/patch_protocol` 전용 SFX 5종 생성.
  - `StoryPanel.tsx`/`index.css`: 전투 종료 시 `combat_images` 기반 합성 결과 이미지 패널 표시. 승리/도주/패배 copy와 기존 `계속`/`메인 화면으로` 액션 유지.
  - Playwright E2E: CombatCinema phase sampling을 오디오 cue 타이밍에 맞게 안정화하고 `skills/packet_shot.wav`/`sfx_attack.wav` 요청 검증 추가.
- Verified: `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py`.

## 2026-06-07 — Repo 정리 + session.py 모듈화/책임분리

- Status: [x] 정크 제거, historical 문서/스크립트 bin/ 이관, md 참조 정합화, session god-object 분해.
- Changed:
  - 정크 제거: `.playwright-mcp/`(70), `.antigravitycli`, `report.md` 스텁 + `.gitignore` 보강.
  - `bin/` 보관소 신설: `docs/archive`, 완료된 `docs/plans`(2026-05-31·06-03), `docs/feedback`를 이관하고 current docs 참조 경로 갱신. 활성 plan(2026-06-06/07)은 `docs/`에 유지. (`scratch/`는 재사용 에셋 파이프라인 도구라 root에 유지.)
  - 문서 재정비: `reference.md`를 evergreen 레퍼런스만 추려 `docs/REFERENCES.md`로 축약(gap/action/roadmap은 STATUS/NEXT_PLAN이 추적하므로 제거). `ADULT_VISUAL_POLICY.md`를 성인향 정책 내용 제거 + 이미지 파이프라인 실무 가이드로 재작성하고 `docs/IMAGE_POLICY.md`로 개명(289→90줄).
  - md 최적화: CLAUDE/GEMINI의 `harness/CORE_MANDATES·CONTEXT_BRIDGE` 경로 명시, GEMINI `session.py` 경로/React SPA 반영, AGENTS git-history 문구 교체, CONTEXT_BRIDGE 테스트 수·핸드오버 갱신.
  - `session.py` 1878→1349줄(-28%): `narrative_rollup.py`(장기기억 롤업 10함수)·`loop_scoring.py`(초기점수/톤/archive shard)·`combat_session_helpers.py`(전투 요약/요청/브리프 6함수)·`constants.py`(공유 상수) 추출. private 헬퍼는 session에서 re-export해 import 경로/테스트 호환 유지. 동작 변경 없음.
  - `engine.py`(1210)는 강결합 단일 상태기계라 분리 시 가독성 손해 → 유지. App.tsx/CombatCinema는 E2E 민감 단일 컴포넌트라 live QA 동반 점진 분리 권장(미착수).
- Verified: `make test` 203 / 2 skipped, `make frontend-build`/`make frontend-lint` clean, `tests/playwright/test_e2e_play_checklist.py` 그린(refactored 서버 기동 포함).

## 2026-06-07 — Phase 4: Combat Skill Icon Action Bar

- Status: [x] `CombatControls` 스킬 아이콘 액션바 구현 + frontend lint 부채 정리.
- Changed:
  - `CombatControls.tsx`: 스킬을 아이콘 타일로 렌더(`/resources/<scenario>/skills/<id>.png`), name/role/tags/cost/range/cooldown 기반 data-driven. cost(◆focus/▣item)·range 배지, cooldown 오버레이, FOCUS 부족 시 비활성, role별 색상, hover/tooltip. 아이콘 로드 실패 시 role 글리프 fallback. 기본 행동(공격/방어/대기/도주)에 글리프 추가. 스킬명 텍스트 유지로 E2E `:has-text` 셀렉터 호환.
  - `StoryPanel.tsx`: 두 `CombatControls` 렌더에 `scenarioId` 전달.
  - `index.css`: `.cc-skill*` 아이콘 바 스타일(role 색상 변수, 배지, CD 오버레이).
  - `types.ts`: `CombatLogDetail`에 `target_id/skill_id/skill` 추가.
  - `combatEffects.ts`: 위 타입 추가로 `as any` 캐스트 3곳 제거.
  - `CombatCinema.tsx`: skillName 변경 시 imgError 리셋을 setState-in-effect → render-time 조정 패턴으로 교체(lint 경고 해소).
- Verified: `make frontend-lint` clean, `make frontend-build` clean, `tests/playwright/test_e2e_play_checklist.py` 전체 그린(스킬 아이콘 PNG 200 로드 확인).
- Next: Phase 2 연출 polish(live QA), Phase 3 모션 다양화 + reduced-motion.

## 2026-06-07 — Skill Animation Registry · Skill Icons · Drone Combat Art (working tree)

- Status: [/] 작업 트리 반영, 미커밋. combat 연출/아트 배치 작업의 추가 증분.
- Changed:
  - `src/mythos_ui/src/combatAnim.ts` 신규: `LOCAL_SKILL_REGISTRY`(role/tags) + `getSkillFx()` role/tags 기반 스킬 이펙트 프로파일. `combatEffects.ts`가 이를 import해 스킬 컷인/커넥터에 사용.
  - `CombatCinema.tsx`가 `/resources/<scenario>/skills/<skill_id>.png` 스킬 아이콘 컷인 표시. `resources/neo-seoul/skills/` 아이콘 5종(`signal_step`/`overload_strike`/`packet_shot`/`covering_noise`/`patch_protocol`) 추가.
  - 드론 적 2종(`maintenance-drone`, `sentinel-drone`) 전투 action sheet 생성/분할(`enemies/combat/`) + `scenario.json` `combat_images` 배선. combat-art 적이 2종→4종.
- Verified: `make test` 203 tests / 2 skipped OK, combat sprite 35개 `RGBA + 512x768`, skill icon 5종, `make frontend-build` clean.
- Next: action art 위치/스케일/가독성 polish, role/tags 모션 다양화, `CombatControls` 아이콘 액션바. 작업 트리 미커밋 → 커밋/PR 정리.

## 2026-06-07 — Combat Cinema UI Overhaul & Standalone Utility Skill Support

- Status: [x] 전투 일반 행동의 시그널 미니 카드화, 가드 시 중복 텍스트 제거, 자가 대상 2포스터 구조 최적화, 마지막 일격 시의 애니메이션 소멸 방지, 신호 도약 등 단독 유틸 스킬의 오버레이 연출 구현 완료.
- Changed:
  - `CombatCinema.tsx`에 일반 행동(`ATTACK` / `DEFEND` / `EVADE`) 시 텍스트 배너 대신 심플한 카드 형태의 **액션 시그널 카드**가 중앙에 노출되도록 구현.
  - 가드(`isDefend`) 시 우측 대미지 팝업을 숨겨 `DEFEND` 시그널 카드와 중복으로 표출되는 텍스트를 제거.
  - 시전자와 대상이 동일한 액션(자가 엄호 노이즈, 자가 가드, 자가 힐 등) 시 우측 캐릭터 카드를 가리고 좌측 캐릭터와 중앙 카드만 균형있게 정렬하는 **대칭형 2포스터 구조** 적용.
  - `App.tsx`에서 타격/가드 로그가 발생하지 않는 독립 유틸리티/이동 스킬(신호 도약 `signal_step`, 패치 프로토콜 `patch_protocol`) 시전 시에도 `CombatCinema` 스킬 컷인 연출이 정상 작동하도록 로그 파싱 및 큐잉 로직 개선.
  - 마지막 일격 시 캔버스 보드 언마운트로 `canvasRef.current`가 `null`이 되더라도 오버레이 연출이 끊김 없이 재생된 뒤 다음 스토리로 전환되도록 캔버스 null-check 가드 조건 완화.
  - `test_e2e_play_checklist.py` E2E 테스트가 CombatCinema 애니메이션 오버레이 닫힘(`state="detached"`)을 기다린 뒤 캔버스 드로잉을 체크하도록 대기 타이밍 동기화.
  - `play-checklist.md` 체크리스트에 캔버스 드로잉의 오버레이 가려짐 특성 문서화 및 수동 QA 심미성 검증 항목을 신규 연출 스펙 기준으로 최신화.
- Verified: `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` (전체 테스트 100% 그린 패스).

## 2026-06-07 — Combat Portrait Pipeline

- Status: [x] party 3인 + humanoid enemy 2종 CombatCinema 전신 포즈 파이프라인 검증 및 문서화.
- Changed:
  - `se-rin-idle`을 배경/오토바이 없는 전신 전투 스프라이트로 교체.
  - `se-rin-attack/guard/skill/hit`을 동일 action sheet 기반 후보로 교체해 얼굴/의상/스케일 일관성 개선.
  - `player-noise`와 `kai`의 전신 idle 및 `attack/guard/skill/hit` 세트를 동일 action sheet 방식으로 생성/분할/실사용 교체.
  - `enforcer-unit`과 `glitch-wraith`의 전신 idle 및 `attack/guard/skill/hit` 세트를 동일 action sheet 방식으로 생성/분할/실사용 교체.
  - `scratch/normalize_combat_pose_sheet.py` 추가: RGBA action sheet를 pose별 512x768 PNG로 분할/정규화하고 preview sheet 생성.
  - `docs/plans/2026-06-07-combat-portrait-pipeline.md` 추가/최신화: idle -> action sheet -> chroma-key 제거 -> 분할 -> `combat_images` 연결 절차, chroma-key 선택, 검수/폐기 기준 정리.
  - `outputs/combat-sprite-compare/gemini/`의 Se-rin 외부 모델 후보는 canonical이 아니라 비교/보류 자료로 분류.
- Verified: `python -m json.tool resources/neo-seoul/scenario.json`, enemy combat PNG 10개 `RGBA + 512x768` 확인, `.venv/bin/python -m unittest tests.test_combat_service`, `make frontend-build`, `make frontend-lint`.
- Next: 전투 시네마 스케일/타이밍/가독성 polish 또는 `combatAnim.ts` role/tags animation registry.

## 2026-06-06 — 문서 컨텍스트 압축

- Status: [x] 토큰 컨텍스트 최적화를 위해 current docs를 요약형으로 정리.
- Changed:
  - 장문 `PROGRESS_LOG.md`를 `bin/docs/archive/progress-2026-06.md`로 이동.
  - 장문 `DESIGN.md`를 `bin/docs/archive/DESIGN_FULL_2026-06-06.md`로 이동하고, current `DESIGN.md`는 현재 아키텍처 요약본으로 축소.
  - `AGENT_BRIEF.md`, `STATUS.md`, `NEXT_PLAN.md`, `docs/README.md`를 중복 제거 중심으로 압축.
- Verified: 문서 파일 크기/참조 확인.
- Next: 새 작업 완료 시 이 파일에는 최신 3-5개 항목만 남기고 상세는 archive로 이동.

## 2026-06-06 — Combat Action Pose Assets

- Status: [x] 전투 지도 기본 표시는 기존 섬네일 portrait를 유지하고, 공격/스킬/피격 프레임에만 전투 pose 이미지를 쓰도록 배선.
- Changed:
  - `scratch/build_combat_pose_assets.py`로 Neo-Seoul player/allies/enemies 7종 × 4 pose RGBA 자산 생성.
  - `Combatant.combat_images` -> `render_radar` -> React `CombatBlip.combat_images` 직렬화.
  - `combatCanvas.ts`는 평상시 원형 섬네일을 렌더하고, `combatEffects.ts`가 공격/스킬/피격 타이밍에 `attack`/`skill`/`hit` pose를 지정한 프레임에서만 전신 action art를 표시.
- Verified: JSON validation, `make frontend-build`, `make frontend-lint`, `make python-typecheck`, `make test`, `make test-e2e`.
- Next: 이 항목은 이후 Combat Portrait Pipeline으로 대체됨.

## 2026-06-06 — Current Baseline

- Status: [x] React SPA, FastAPI API, Streamlit 데모, 전술 전투, Story Bible, Run History, Meta Progression, Save/Load, Playwright E2E, Redux visual worker 검증까지 완료된 baseline.
- Verified: 최근 기준 `make test` 202 tests / 2 skipped, Python typecheck, frontend lint/build, `make test-e2e` 통과로 기록됨.
- Active Next:
  - 전투 연출 개편 Phase 1+ — 캐릭터 전투 아트/스프라이트/스킬 애니메이션.
  - 진행도 해금 Phase 1 — 아키타입 게이트, base/learned 스킬 필터, Codex Skill 탭.
  - 파티 조작 2단계 — 파티원 직접 조작, 비파티 동맹은 AI 유지.
  - `glass-library` 시나리오 확장.

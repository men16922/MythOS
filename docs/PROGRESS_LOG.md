# Progress Log

최종 갱신: 2026-06-07

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는
`bin/docs/archive/progress-2026-05.md`를 본다.

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
  - `bin/scratch/normalize_combat_pose_sheet.py` 추가: RGBA action sheet를 pose별 512x768 PNG로 분할/정규화하고 preview sheet 생성.
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
  - `bin/scratch/build_combat_pose_assets.py`로 Neo-Seoul player/allies/enemies 7종 × 4 pose RGBA 자산 생성.
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

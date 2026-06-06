# 전투 연출 개편 — 다키스트 던전식 캐릭터 아트 + 스킬 애니메이션

작성일: 2026-06-06
상태: 설계 확정(구현 대기)

## 배경 / 문제

현 전투 컷인(`CombatCinema.tsx`)은 무기 타입 SVG 홀로그램이 부딪히는 추상 연출이라 몰입감이 낮다.
사용자 피드백: "단순 무기가 왔다갔다 충돌하는 식. 실제 캐릭터 이미지가 있었으면. 스킬마다 다른
애니메이션. 다키스트 던전처럼. 캐릭터 자리에 있던 아이콘은 액션 버튼으로 활용."

목표: **캐릭터 아트가 주인공이고, 스킬마다 고유 애니메이션이 터지며, 액션은 아이콘 버튼으로
직관화된** 전투. 단, 기존 전술 그리드 엔진(이동/사거리/엄폐/고저차/드래그)은 보존한다.

## 확정 결정 (사용자)

1. **화면 구조**: 기존 그리드 위에 캐릭터 아트 스프라이트 + 보드 내 스킬 애니메이션. (엔진 무변경)
2. **캐릭터 아트**: 지금 전투포즈 아트를 mflux/Redux로 생성.
3. **스킬 애니메이션**: `role`+`tags` 기반 데이터 구동(스킬 추가 시 자동 적용).

## 재사용 가능한 기존 자산 (조사 완료)

- `/resources/<scenario>/...` 정적 라우트가 모든 PNG 서빙(`mythos_api/app.py:527`).
- `combatCanvas.ts:120 drawBlipPortrait` + `imageCache`가 이미 `/resources/<sid>/<portrait>`로 캐릭터
  이미지를 원형 클립 렌더. 로스터(`CombatRoster.tsx:27`)도 동일.
- `CombatBlip.portrait`에 상대경로 전달됨(`narrator.render_radar`). allies=`characters/se-rin.png`,
  enemies(bestiary)=`enemies/enforcer-unit.png` 등 **모든 전투원이 portrait 경로 보유**.
- 스킬 정의가 애니메이션 구동에 충분: `role`(mobility/damage/defense/healing) + `tags`
  (melee/burst/ranged/support/evasion/movement/heal). 단 현재 `available.skills`는 `{id,cooldown}`만 직렬화.
- 액션 UI는 `CombatControls.tsx`에 텍스트 버튼(공격/방어/대기/도주 + 스킬)으로 존재.
- 컷인의 SVG 홀로그램(`detectWeaponType`/`renderHologram`: blade/ranged/tech/pulse)은 아이콘 버튼으로 전용 가능.
- mflux Redux(strength 0.9, portrait 레퍼런스) 얼굴 일관성 파이프라인 검증 완료(`visual_service`/worker).

## 단계별 계획 (단계별 PR)

### Phase 0 — 백엔드 스킬 메타 노출 (소규모)
- `engine.py available_actions`의 `skills` 직렬화에 `role`/`tags`/`name`/`cost`/`range` 추가
  (스킬 정의 pool에서 조회). 프론트가 하드코딩 `SKILL_NAMES` 대신 실데이터로 아이콘/애니메이션 매핑.
- 프론트 `types.ts CombatSkillInfo`에 `role?/tags?/name?/cost?` 추가.
- 검증: `test_api`/`test_combat*`에 skill meta 필드 단언 추가.

### Phase 1 — 전투 캐릭터 아트 생성
- 대상: player(Ghost=player-noise), 세린, 카이 / 적: maintenance_drone, sentinel_drone,
  enforcer_unit, glitch_wraith.
- 전투포즈/사이드뷰 적합 프롬프트 작성. 캐릭터 일관성은 기존 portrait를 Redux 레퍼런스로 사용.
- 산출물: `resources/neo-seoul/characters/combat/<name>.png`, `resources/neo-seoul/enemies/combat/<name>.png`
  (투명 배경 또는 어두운 배경, 일관 화각). 생성 스크립트/메모는 `scratch/`.
- 배선: scenario combat 엔트리/ bestiary에 `combat_image`(없으면 `combat/<name>.png` 컨벤션) →
  blip에 `combat_portrait` 추가 직렬화. 프론트는 combat art 우선, 없으면 기존 portrait 폴백.

### Phase 2 — 보드에 캐릭터 스프라이트
- `combatCanvas.ts`: 원형 portrait blip → 셀 앵커 기준 **서있는 캐릭터 스프라이트**(스케일/방향/바닥
  그림자) 렌더. HP 바·인텐트·선택 링·진영 색 테두리 유지. `imageCache` 로더 재사용. 플레이어 폴백 유지.
- reduced-motion/`?fallback=1`에서도 정적 스프라이트는 그려지도록.

### Phase 3 — 스킬 애니메이션 레지스트리 (role+tags 구동)
- 신규 `src/mythos_ui/src/combatAnim.ts`: `role`/`tags` → 연출 프로파일.
  - melee/burst → 돌진 + 슬래시 호 + 임팩트 플래시
  - ranged → 머즐 플래시 + 트레이서 + 탄착
  - mobility/movement → 잔상 블링크
  - healing/heal → 회복 오라 + 상승 파티클 + 힐 숫자(녹색)
  - defense/support/evasion → 실드 전개 링
- `combatEffects.ts` 애니메이터가 캐스트 스킬의 role/tags(로그 detail 또는 dispatched action)로
  프로파일을 골라 스프라이트 위에 연출. SFX 임팩트 동기 유지.
- 컷인 처리: 보드 연출이 충분해지면 풀스크린 컷인은 **치명타/처치/궁극기 등 특별 순간**으로 강등
  하거나 제거(별도 결정). 현 `CombatCinema`의 모션 키프레임/슬래시 배너는 재활용 가능.

### Phase 4 — 아이콘 액션바
- 컷인 SVG 홀로그램을 공유 모듈 `src/mythos_ui/src/combatIcons.tsx`로 분리
  (blade/ranged/tech/pulse + shield/heal/blink 추가).
- `CombatControls.tsx`: 공격/방어/대기/도주/스킬을 **아이콘 버튼 + 이름 툴팁 + 비용/쿨다운 배지**로.
  공격=무기타입 아이콘, 방어=실드, 스킬=role/tags 아이콘. 키보드/접근성 라벨 유지.

### Phase 5 — 폴리시 & 검증
- reduced-motion/fallback 경로, 드래그 이동 게이팅과 애니메이션 상호작용 점검.
- `make frontend-build`·`frontend-lint`·`python-typecheck`·`make test`·`make test-e2e`(전투 경로).
- 라이브 플레이 QA: 스프라이트 렌더, 스킬별 애니메이션 분기, 아이콘 액션바, 생성 아트 일관성.

## 리스크 / 메모

- **엔진 무변경**이 원칙. 그리드/이동/엄폐/고저차/드래그는 그대로. 연출·UI·직렬화 계층만 변경.
- 아트 생성은 로컬 FLUX/MPS 필요(쿨드 ~17s/장, Redux). 생성 품질/일관성은 반복 필요할 수 있음.
- 풀스크린 컷인(현 미커밋 작업)과 보드 연출의 역할 중복 → Phase 3에서 컷인 범위 재정의.
- 캐릭터 스프라이트가 그리드 셀을 가릴 수 있음 → 스케일/투명도/겹침 정렬(Y-sort) 주의.
- 직전 수정으로 백엔드 스냅샷에 `log`+지형이 이미 실림(이 계획의 Phase 0/3 데이터 기반).

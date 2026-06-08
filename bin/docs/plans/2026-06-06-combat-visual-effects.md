# 전투 이펙트 개선 (시각적) — 설계안

작성일: 2026-06-06
상태: Phase 1 완료, Phase 2+ 후속
관련 트랙: `docs/NEXT_PLAN.md` §"다음 구현", `docs/plans/2026-06-06-party-controllable-allies.md`

## 목표

초기 문제는 전술 전투 보드가 스냅샷당 1회 정적 리드로우만 하며, 이동/피격/사망/스킬 피드백이 부족하다는 점이었다. Phase 1에서 snapshot diff 기반 rAF 애니메이션, 이동/데미지/힐/사망/스킬 커넥터, SFX 임팩트 동기화가 구현됐다. 이 문서는 남은 Phase 2+ 후속 설계의 근거로 유지한다.

## 현재 상태 (코드 기준)

- `src/mythos_ui/src/combatCanvas.ts`: `drawCombatCanvas`가 1회 정적 draw. rAF 애니메이션 루프 없음 → 이동 순간이동, HP 바 즉시 점프, 임팩트/플래시/데미지 숫자/사망/스킬 연출 없음.
- `src/mythos_ui/src/App.tsx`: `playSfx`가 **액션 디스패치 시점**에 울림(`sfx_attack/defend/move/victory/defeat`) — 시각적 임팩트 프레임과 미동기. 캔버스는 `finalizedSnapshot` 변경 시 `useEffect`로 redraw.
- **API `CombatState`는 결과 상태만 반환**(`radar.blips` 위치/hp/alive/defending, `outcome`, `available`). 순서 있는 전투 이벤트 로그 없음. `response.prose`는 서사 텍스트.
- 스킬 정의(`resources/<scenario>/scenario.json` `combat.skills`)는 `role`(mobility/damage/defense/healing)과 `tags`(melee/ranged/movement/burst/support/evasion/heal), `range`, `effect`를 갖는다 — **역할 기반 이펙트 매핑의 키로 사용 가능**.

## 핵심 결정

**클라이언트 스냅샷 diff → 이벤트 역산 → 애니메이션 큐 → rAF 렌더 루프.** MVP는 백엔드 무변경.

- blip `id`가 안정적이라 **이동/데미지/힐/사망/디펜드는 명확히 역산**된다.
- **"누가 누구를 쳤는가(공격 주체-대상 연결)"와 스킬 종류는 추론 영역** → Phase 1은 합리적 추론(같은 틱의 hp 감소 대상 + 가해 가능 유닛)으로 처리하고, 정밀화는 Phase 3 백엔드 이벤트 로그로 넘긴다.
- **스킬 이펙트는 액션 디스패치 시점의 `action.skill_id` → scenario 스킬 `role`/`tags`로 결정**(클라이언트가 이미 보유한 정보). 따라서 스킬 연출은 추론이 아니라 정확하다.

## 아키텍처

1. **rAF 렌더 루프 전환** — `combatCanvas`를 1회 draw에서 `CombatScene` 컨트롤러로. 소유: 현재 렌더 상태(보간된 위치/hp), 목표 상태, 활성 이펙트 리스트, 애니메이션 클럭. 이펙트가 비면 루프 정지(유휴 시 CPU 0).
2. **`combatDiff.ts` (신규, 순수함수)** — prev/next `CombatState` → 이벤트 리스트:
   - `move{id, from, to}`
   - `damage{id, amount, fromRatio, toRatio}` / `heal{id, amount}`
   - `death{id}` (alive true→false)
   - `defendOn/defendOff{id}`
   - `intentChange`(적 인텐트 갱신)
3. **스킬 컨텍스트 주입** — `handleCombatAction`이 디스패치한 `action`(type, skill_id, target_id, x/y)을 diff 결과와 함께 큐에 전달. diff가 만든 익명 `damage/heal/move` 이벤트에 **스킬 메타(role/tags)를 부착**해 정확한 스킬 연출로 승격.
4. **이펙트 프리미티브** — 이벤트 → 연출 매핑:
   - move → 위치 트윈(ease-out ~250ms, 포트레이트 슬라이드)
   - damage → 대상 흔들림 + 적색 플래시 + 떠오르는 `-N` 숫자 + HP 바 트윈
   - heal → 녹색 글로우 + `+N` 숫자
   - basic attack(추론) → 가해자 lunge(근접) 또는 트레이서 라인(원거리) + 대상 임팩트 스파크 + 짧은 hit-stop
   - death → 채도↓ 페이드 + 소형 파티클
   - defend → 실드 아크 셰머 펄스
   - 현재 턴 → 펄스 링
5. **이펙트 시퀀싱** — 한 응답에 플레이어 행동 + 적/동료 자동턴 델타가 한꺼번에 옴 → **~150ms 간격 스태거 타임라인**(총 ~1.2s 캡)으로 "연속 사건"처럼 재생. 입력은 기존 `isBusy`로 게이팅(이펙트 재생 동안 잠금).
6. **SFX 동기화** — `playSfx`를 디스패치 시점 → **이펙트 임팩트 프레임**으로 이동. 스킬 role별 sfx 키 추가(예: `sfx_skill_damage`/`sfx_skill_heal`/`sfx_skill_buff`/`sfx_skill_move`), 피격/사망 sfx 추가. 자산 부재 시 기존 fallback 로직 유지.

## 스킬 이펙트 설계 (role/tags 기반 일반화)

스킬별로 하드코딩하지 않고 `role`+`tags`로 **캐스트 큐 / 연결(travel) / 임팩트** 3요소를 조립한다. 새 시나리오가 같은 스키마로 스킬을 추가하면 합리적 기본 연출을 자동 획득한다.

| role | 캐스트 큐(caster) | 연결(travel) | 임팩트(target/area) | 예시 스킬 |
|---|---|---|---|---|
| `damage` + `ranged` | 무기 머즐 플래시 | 캐스터→타깃 **트레이서/패킷 라인** | 적색 임팩트 스파크 + 데미지 숫자 | `packet_shot` 패킷 사격 |
| `damage` + `melee`/`burst` | 글로우 충전 | **lunge**(전진 후 복귀) | 강한 임팩트 + 충격파 링(armor_pen 시 균열 글리프) | `overload_strike` 과부하 일격 |
| `healing`/`heal` | 녹색 캐스트 글로우 | 부드러운 호(arc) | 대상 **힐 오라** + `+N` + HP 바 회복 트윈 | `patch_protocol` 패치 프로토콜 |
| `defense`/`support` | 정적(static) 셰머 | (없음/근거리 확산) | 대상 **실드/노이즈 필드** 지속 셰머(`duration`만큼) | `covering_noise` 엄호 노이즈 |
| `mobility`/`movement` | 잔상 점멸 | **대시 트레일/블링크** | 도착 칸 잔광 | `signal_step` 신호 도약 |

- `cost.item`(예: `patch_protocol`) 소모 시 작은 아이템 소진 글리프를 캐스트 큐에 덧붙인다.
- `cooldown` 진입 스킬은 컨트롤 버튼에 쿨다운 표시(이펙트와 별개, CombatControls 연동 — 선택).
- `range`로 트레이서/lunge 길이 스케일.

## 단계(Phasing)

- **Phase 1 — 완료**: rAF 루프, `combatDiff`, 이동 트윈, 데미지/힐 플래시·숫자, HP 트윈, role 기반 스킬 임팩트(트레이서/lunge 포함), SFX 동기화. 백엔드 무변경.
- **Phase 2 — 후속**: 기본 공격 lunge/슬래시 정밀화, 임팩트 스파크/파티클, 사망 디졸브, hit-stop, 선택적 스크린 셰이크, 스킬 캐스트 큐 고도화.
- **Phase 3 — 선택**: `CombatService`가 순서 있는 이벤트(가해자→대상, crit/miss/multi-hit, 정확한 데미지) 방출 → 추론 제거, crit/miss/연타 분기 연출.

## 검증 / 리스크

- **E2E 안전(최우선 리스크)**: `prefers-reduced-motion` 및 `?fallback=1`/테스트 모드에서 **즉시 스냅(instant) 경로** — 최종 상태가 동기적으로 settle돼 `make test-e2e`가 깨지지 않게 한다. `tests/playwright/test_e2e_play_checklist.py`의 전투 단계는 애니메이션 완료가 아니라 최종 스냅샷/배너를 기다리도록 유지.
- **`combatDiff` 단위 테스트**(순수함수): 이동/데미지/힐/사망/디펜드 역산, 동시 다중 델타, ratio→amount 매핑.
- **diff 추론 한계**: 동일 진영 다수 유닛 동시 이동/스왑 시 "공격 주체" 오귀속 가능 → id 키 매칭으로 이동/데미지 자체는 명확, 주체-대상 연결만 추론(Phase 3에서 정밀화). 스킬 연출은 디스패치 메타로 정확.
- **퍼포먼스**: 8×6 보드, DPR 스케일, rAF 60fps — 부담 적음. 유휴 시 루프 정지로 상시 비용 0.
- **수동 QA**: 전투 연출 Live QA 완료. 별도 수동 QA 문서는 폐기했으며, 현재 플레이 만족도 기준은 `docs/scenarios/01-neo-seoul-connect.md` §5.5와 `docs/NEXT_PLAN.md` 체크리스트를 따른다.
- **파티 조작 2단계와의 순서**: VFX diff는 진영 무관(blip id 키)이라 독립적. 단 Phase 2 폴리시는 파티 조작이 액션 디스패치 흐름을 재편할 수 있어 그 **이후** 권장(이중작업 방지). Phase 1은 선행 가능.

## 신규/변경 파일(예상)

- 신규: `src/mythos_ui/src/combatDiff.ts`(순수 diff), `src/mythos_ui/src/combatEffects.ts`(이펙트 프리미티브/타임라인), 관련 테스트.
- 변경: `combatCanvas.ts`(rAF 루프 + 보간 렌더), `App.tsx`(디스패치 메타 전달, SFX 임팩트 동기, 이펙트 큐 구동), `types.ts`(이벤트/이펙트 타입), 필요 시 `CombatControls.tsx`(쿨다운 표시).
- 자산: role별 스킬 SFX(`resources/<scenario>/audio/sfx/`), 선택적 스파크/파티클 스프라이트(코드 드로잉으로 대체 가능).

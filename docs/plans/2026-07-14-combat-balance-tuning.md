# 전투 밸런스 튜닝 제안 (오너 GO/NO-GO 자료)

작성: 2026-07-14 세션 #19. NEXT_PLAN "밸런스 튜닝" `[manual]` 항목의 사전 분석.
아래 수치는 전부 코드/scenario.json에서 추출한 당시 값 — **판정·구현 완료, 하단 판정 기록 참조**.

## 판정 기록 (오너, 2026-07-14) — 구현 완료

- **① B안 채택**: cap 상태별 분리 — burn·기절 `HARD_CC_TURNS_CAP=3`, 유틸 6 유지 (`engine.py`).
- **② 연속 기절 지속 반감 채택**: 보스(`ai:"boss"`)가 기절로 턴을 잃으면 `stun_guard` 발동 →
  다음 기절 지속 **내림 반감** (1턴 기절은 저항 = 보스는 기절 사이에 반드시 1행동 보장;
  제안서의 "최소 1" 문구는 1턴 기절 순환 락을 못 막아 내림 처리로 구현 — 로그 `stun_resisted`).
  비보스는 내성 없음. guard는 비기절 턴 완료 시 해제.
- **③ 냉각 freeze 1→2 채택** (`scenario.json`).
- **⑤ 슬램/스플래시 현행 유지** · **③tracker 산성 현행 유지** · **⑥ 2-티어 slice 4는 보류**(①② 체감 후).
- 소스락: `tests/test_combat_skill_feedback.py` `BalanceTuning20260714Test` (+기존 락 3건 신규 수치로 갱신).

## 현재 값 요약 (코드 기준)

| 노브 | 현재 값 | 위치 |
|---|---|---|
| 상태이상 누적 cap | 6턴 (기절 포함, 지속 누적·강도 고정) | `engine.py` `STATUS_EFFECT_TURNS_CAP` |
| burn(화상) | 매 턴 1d4 (평균 2.5), **방어구 무시** | `_tick_status_effects` |
| corrode(부식) | armor -2 | `_effective_armor` |
| acid(산성) | 피격자 판정에 armor pen +2 | `models.py` `acid_pen` |
| freeze(냉동) | 이동만 불가 (행동 가능) | `_movement_frozen` |
| shock(감전) | 집중 재생 + 쿨다운 진행 동결 | upkeep |
| hacked(침투) | 다음 턴 가장 가까운 동료 공격 | `_hacked_turn` |
| 슬램 | 1d4 (평균 2.5), 방어구 무시 | `SLAM_DAMAGE_DICE` |
| AoE 스플래시 | 본피해의 절반 (min 1) | `damage//2` (세션 #13 하향 유지) |
| EMP 스플래시 zap | 1d4 | stun splash |

**부여자 → 대상 빈도** (전부 **명중 시 100%** 부여):
- 적→파티: tracker_spider `acid:2+corrode:2`/타 (1d4) · purge_drone `burn:2`/타 (1d6) · enforcer `shock:1`/타 (1d6)
- 파티→적: emp_pulse 기절1+1d4 (◆3 cd3 r2) · system_hack(한) 기절1+1d4 (◆2 cd3 r4) · precision_emp(수아) shock2+1d4 (◆3 cd3 r4) · 소이 수류탄 1d4+burn2 (r4 반경1) · 냉각 수류탄 1d4+freeze1 · EMP 수류탄 기절+zap (반경1)
- 슬램 운반: magnetic_repulse/pull (◆2 cd2, 밀당 2칸)

**적 내구** (참고): purge 10/0 · tracker·maint 12/0 · sentinel 14/0 · wraith 18/0 · shock_trooper 20/2 · enforcer 24/4 · mech 36/5 · IX 38/2

## 관찰 → 제안 (판정 필요 순)

### 1. burn cap 6 = 기대 15 방무 피해 — 소형 적 전멸 수준 ★판정 우선
- capped burn 하나가 평균 15: purge(10)·tracker(12)·sentinel(14)는 **화상만으로 확정 사망**, 방어구도 무시라 mech(36/5)에게도 최고 효율 딜.
- 역방향이 더 아픔: purge_drone 2타 = burn 4턴(평균 10) — 파티원 HP 13 기준 치명. 소각 드론 2기 인카운터(purge_incineration)는 사실상 DoT 레이스.
- **제안 A(보수)**: cap 6 유지, burn만 틱 1d4→1d3 (기대 9 @cap).
- **제안 B(구조)**: cap을 상태별 분리 — burn/기절 cap 3, 유틸(corrode/acid/freeze/shock) cap 6.
- 판정: 소형 적이 DoT에 녹는 게 의도인가 / 파티가 받는 burn 압박이 재미인가.

### 2. 기절 순환으로 보스 무력화 가능 ★판정 우선
- 기절원 2개(emp_pulse cd3 + 한 system_hack cd3)만으로 3턴 주기 중 2턴 기절 → EMP 수류탄 곁들이면 **IX(38hp) 완전 락 가능**. cap 6는 순환엔 무의미(재부여로 충분).
- **제안**: 보스(ix 등 `boss` 태그)만 기절 내성 — 연속 기절 시 지속 반감 or 1회 후 1턴 면역. 일반 적 상대 기절 콤보는 현행 유지(재미 요소).
- 판정: 보스전 기절 락을 전략으로 인정할지, 내성으로 막을지.

### 3. tracker_spider 상태이상 압박 — 명중 100% × 2기 스폰
- 스파이더 2기가 번갈아 때리면 acid+corrode 상시 유지(각 2턴 부여, cap까지 누적). 오늘 렌더 QA에서도 R2에 Tester 13→2hp + acid/corrode.
- 단 tracker_ambush는 "FOCUS 관리를 배우는" 티칭 인카운터 명시라 **의도로 보임**. 건드린다면 첫 명중만 부여(2회째부터 지속 +1) 정도.
- 판정: 현행 유지 권장. 튜토리얼 직후 체감만 확인.

### 4. 냉각 수류탄이 소이 대비 하위호환
- 동일 코스트/희귀도/1d4인데 rider가 freeze1(이동만 1턴) vs burn2(기대 5 방무딜). freeze는 행동을 안 막아 원거리 적에겐 무효과.
- **제안**: freeze 1→2턴 (근접 적 카이팅 정체성 강화, 딜은 그대로 소이 우위 유지).
- 판정: 가벼움 — 제안대로면 코드 1줄(scenario.json).

### 5. 슬램 1d4 · 스플래시 절반 — 현행 유지 권장
- 슬램: 지형 의존 + ◆2/cd2 대가로 평균 2.5 방무 — 중장갑(armor4-5) 상대 포지셔닝 보상으로 적정.
- 스플래시 절반은 세션 #13 "스킬 언밸런스" 하향의 결과 — 되돌릴 근거 없음.

### 6. 2-티어 slice 4: 턴 순서 스트립 GO/NO-GO
- 수치 아닌 UI 판정. GO 근거: 기절/속도 조작 가치가 보이게 됨(위 1·2번 판정과 연동), 이니셔티브 정보는 이미 엔진에 있음. NO-GO 근거: 보드 상단 밀도 증가(모바일), 텔레그래프·인텐트와 정보 중복.
- 권고: 1·2번 튜닝 방향 확정 후에 판단 (기절 밸런스가 바뀌면 스트립 가치도 바뀜).

## 판정 후 실행 메모

- 수치 변경은 전부 1-파일 수준: cap/틱/슬램 = `engine.py` 상수, 수류탄/부여 턴수 = `scenario.json`. 각 변경에 인바리언트 테스트 1개 동반(`tests/test_combat_engine.py` 패턴).
- 판정 전 실플레이 확인 경로: `make api` → 시뮬 test_kit — ①purge_incineration에서 burn 압박 체감 ②ix_confrontation에서 기절 순환 시도 ③냉각 수류탄 실사용.

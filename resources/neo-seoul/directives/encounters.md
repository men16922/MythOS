# Neo-Seoul Encounter Directives
#
# 이동 중 조우(Travel) 및 리소스 임계점 위기 조우(Emergency) 지침 prose. scenario_context가
# 플레이어 액션의 travel 키워드 감지와 stability/tension 임계 판정(게이팅 로직은 코드에 STAY)을
# 거친 뒤, 아래 prose 템플릿을 채워(decay_pct/stability/tension/player_action) narrative notes에 주입한다.
#
# 이 prose는 본래 모든 시나리오가 공유하던 generic 기본값이라, 코드에도 DEFAULT_ENCOUNTERS
# 앵커가 남아 있다(encounters.md를 두지 않은 시나리오는 그 기본값을 받는다 — glass-library 회귀0).
# 추출 무손실은 byte-parity 테스트가 보증한다
# (scenario_context.DEFAULT_ENCOUNTERS == load_scenario_directives("neo-seoul").encounters).
# prose는 여기서만 튜닝한다.

travel_header: === TRAVEL ENCOUNTER (이동 중 조우 이벤트) ===
emergency_header: === EMERGENCY ENCOUNTERS (리소스 임계점 위기 상황) ===

## travel_template
---
지침: 플레이어가 구역을 이동하거나 여행(Travel)하는 액션('{player_action}')을 선언했습니다. 현재 시공간 붕괴도({decay_pct}%) 및 은신 안정도({stability}/100), 관리망 추적도({tension}/100)를 고려하여, 이동 도중에 돌발적으로 마주하는 글리치 이상 현상, 경비 순찰대 조우, 또는 주변 환경 붕괴 등의 중간 조우(Travel Interception) 이벤트를 묘사하고, 이를 돌파하거나 회피하기 위한 선택지(예: 연산 해킹으로 경보 우회, 은밀히 우회로 찾기 등)를 1개 이상 생성하십시오.

## emergency_low_stability
---
경고: 현재 [은신 안정도]가 매우 위험한 수준(현재: {stability}/100)입니다. 연결 붕괴 직전의 글리치 물리 현상, 시공간 왜곡, 또는 강제 접속 차단 전파가 엄습해 오는 위기 상황(Emergency)을 서사하고, 플레이어에게 안정성을 회복하기 위한 대가가 큰 응급 선택지를 강제하십시오.

## emergency_high_tension
---
경고: 현재 [관리망 추적도]가 극히 높은 수준(현재: {tension}/100)입니다. 관리망 집행부대(Enforcers)의 직접적인 추적선 포위, 드론 추격, 혹은 Administrator IX의 직접 정정 통고 등 포위망이 좁혀오는 상황을 서사하십시오. 다음에 오는 선택지는 회피하거나 돌파하기 위해 무거운 대가(stats 판정 또는 stability 소모)를 요구해야 합니다.

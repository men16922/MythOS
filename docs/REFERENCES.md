# Design References

Project MythOS 디자인에 참고하는 게임들과 적용 포인트. 상세 구현 현황/할 일은
`STATUS.md`/`NEXT_PLAN.md`를 본다(이 문서는 evergreen 레퍼런스만 유지).

## 우선 참고 순서

1. **Citizen Sleeper** — 생존 압박과 선택 경제
2. **Roadwarden** — 텍스트 RPG의 장소감과 장기 세션 UX
3. **Disco Elysium** — 판정·실패·내면 독백의 문학적 처리
4. **Slay the Princess** — 루프와 기억이 세계를 바꾸는 감각
5. **Shadowrun: Dragonfall/Hong Kong** — 동료 서사 + 턴제 전술 전투
6. **Wildermyth** — 플레이 기록이 캠페인 신화가 되는 구조

## 레퍼런스별 적용 포인트

### 스토리 / 내러티브
- **Citizen Sleeper** — `stability`/`tension`을 단순 수치가 아니라 "무엇을 포기하게 만드는 압력"으로 느끼게 한다.
- **Disco Elysium** — 판정 결과를 성공/실패 로그가 아니라 정체성·기억·세계 반응으로 서술한다.
- **Slay the Princess** — Echo/Loop를 "재시작"이 아니라 "세계가 플레이어를 다르게 기억하는 장치"로 보이게 한다.

### 세계관 몰입
- **Roadwarden** — 장면마다 "어디 있고, 무엇이 부족하며, 어떤 위험이 다가오는지"를 명확히 보여준다.
- **Sunless Sea/Skies** — 탐험 자체가 세계관을 읽는 행위가 되게 한다(작전 지도, 접촉 신호, 붕괴 압력).
- **Caves of Qud** — Story Bible snippet을 설정 설명이 아니라 "오래 존재해온 세계" 감각으로 쓴다.

### 게임플레이 루프
- **I Was a Teenage Exocolonist** — Meta Progression/Run History가 다음 루프의 선택지·시작 조건·정체성에 영향을 준다.
- **80 Days** — 40-60턴 세션에서 "이번 루프의 여정"이 경로/장소/시간으로 남게 한다.
- **AI Dungeon** — 자유도는 강하나 일관성이 흔들림 → MythOS는 Story Bible/Ending Resolver/상태 검증으로 통제된 AI GM을 지향.

### RPG / 전투
- **Shadowrun** — 전투가 서사를 끊는 모드가 아니라 동료·세력·단서·대가를 드러내는 장면이 되게 한다.
- **Wildermyth** — 동료 참전·Run History를 기록 보관을 넘어 캠페인 신화로 만든다.
- **Into the Breach** — 전술 UI는 "무엇이 위험하고 어떤 선택이 의미 있는지"가 즉시 보이게 한다(적 인텐트 가시화).

## 핵심 설계 원칙 (레퍼런스 종합)

- **내러티브**: AI GM의 자유도보다 "기억되는 결과"가 중요하다.
- **몰입감**: 장소·시간·위험·관계가 매 장면에서 작동해야 한다.
- **게임플레이**: 선택지는 문장이 아니라 실제 자원/관계/엔딩 압력과 연결돼야 한다.
- **RPG**: 스탯·동료는 수치보다 정체성과 행동 가능성을 바꾸는 장치여야 한다.
- **메타 진행**: Run History는 로그가 아니라 다음 접속의 세계를 바꾸는 캠페인 기억이어야 한다.

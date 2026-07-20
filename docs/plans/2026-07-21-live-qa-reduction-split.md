# Live-QA 16-item reduction split — ratification proposal (2026-07-21)

Evidence base: Harness V2 release-bundle evidence 3/3 (07-19 local · `00077-8g9` · `00078-rs9`),
seven fail-closed objective assertions, 0 observed false accepts across all calibrations,
7.8 min unattended collection, 4-bundle human-review surface.

## Operational meaning of each tier

- **AUTO** — a fail-closed assertion closes the item. Runs on every release calibration;
  missing/uncertain evidence becomes `needs_human`, never a silent pass. Humans stop testing
  these proactively; the report's attention list is the only touchpoint.
- **MONITORED** — objective signals exist (browser-objective runs, semantic verifiers, server
  logs, regression locks) but no single closing assertion. Humans stop *proactively* testing;
  the item stays on the checklist as "record only if something feels wrong during normal play,"
  and report attention flags escalate.
- **HUMAN** — pure feel/judgment. Remains actively played and signed off by the owner.

## Proposed split (16 checkboxes)

### AUTO — 5 checkboxes, closed by 7 assertions (+§2 chip note already auto)

| Checklist item | Closing assertion(s) |
|---|---|
| §3 이미지 도착률 | `image_arrival` |
| §4 동료 실제 합류 | `companion_join` + `party_distribution` |
| §5 동료 컷신 1회/복귀 | `cutscene_cardinality_return` |
| §6 선택지 도착 | `choice_arrival` |
| §6 용어 첫 등장 주석 | `first_use_gloss` |

(§2 갈림길 가치축 칩 정합은 2026-07-20에 이미 `route_axis_chip`으로 자동 전환되어
체크박스에서 빠져 있음 — 어서션 기준으로는 auto 6번째.)

### MONITORED — 8 checkboxes (passive: 이상할 때만 기록)

| Checklist item | Objective signal watched |
|---|---|
| §1 작전지도 드래그 | pan CSS/pointer 로직 regression-lock + browser QA 조작 경로 |
| §1 스크롤 체감 | bottom-stick 억제 소스락 + browser QA 스크롤 프로브 |
| §3 연속 턴 얼굴 유지 | image-identity verifier (등록됨) + 에셋 레코드 감사 |
| §4 다인 파티 밸런스 | 전투 시뮬 메트릭(적 행동 수·라운드 수) + gameplay verifier |
| §5 페이스 | 턴 레이턴시/구간 시간 서버 메트릭 |
| §5 전투→보상→이야기 복귀 | 전환 시퀀스 objective 이벤트(browser QA) + 상태 검증 |
| §5 시장·아이템 | 경제 카운트(드랍/장착) 로그 + 시뮬 검증 |
| §6 서사 연결 | semantic/domain verifier (만나기 전 이름·안전경로 전투 등 플래그) |

### HUMAN — 3 checkboxes (active play, owner sign-off)

| Checklist item | Why human |
|---|---|
| §2 두 스타일 dull/sensitive 판정 | 성향 반영의 둔함/예민함은 순수 체감 |
| §5 엔딩 납득 | 이야기로 납득되는가는 판단 불가 항목 |
| §5 총평(기억나는 장면 3개) | 정의상 인간 기억/감상 |

## Result vs target

Target was 6 auto / 8 monitored / 2 human. Honest mapping lands **5(+1 chip) auto / 8
monitored / 3 human**: 총평 and 엔딩 납득 cannot be truthfully demoted to monitored.
Human-load effect: 16 actively-played items → **3** (81% reduction in active surface);
the 8 monitored items require no proactive play, only passive notes + report attention.

## On ratification

1. Checklist (`docs/test/neo_seoul_live_qa.md`) restructures into 지금도 직접 확인(3) /
   이상할 때만 기록(8) sections; auto items drop off with a one-line pointer.
2. NEXT_PLAN/STATUS flip the formal count from 0/16 to the ratified split.
3. Release calibrations keep running the full 7-assertion contract per deploy.

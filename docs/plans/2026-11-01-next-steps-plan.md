# 배포 후 잔여 작업과 다음 계획

작성일: 2026-11-01 · 작성: Claude · 오너 요청: 잔여 작업과 다음 계획 수립, 리버스 엔지니어링할 게임 제안

운영은 `00171-yuj`(`de62fd1`), 되돌릴 버전은 `00169-fih`다. 단계는 위에서부터 진행한다. 진행 상황은 `docs/NEXT_PLAN.md`가 기준이다.

## 1단계: 운영 안정화 (Claude, 지금)

| # | 일 | 끝난 기준 |
| --- | --- | --- |
| 1 | 운영 스모크 시간 초과 원인 규명. 첫 전투 뒤 1번 멈췄고 재현 전이다 | 멈춘 화면을 기록한다. 게임 결함이면 `00169-fih`로 되돌린 뒤 고친다. 스크립트 문제면 고치고 운영 스모크를 통과시킨다 |

## 2단계: 측정 보정과 밸런스 (Claude, 오너 판정 없이 진행)

순서가 중요하다. 지금 봇은 장비를 자동으로 끼기만 하고 훈련을 쓰지 않아서, 사람이 할 때의 승률보다 낮게 나올 수 있다. 봇을 먼저 고치고 나서 수치를 조정한다.

| # | 일 | 끝난 기준 |
| --- | --- | --- |
| 2 | 봇이 성장 포인트로 훈련하고 장비를 인물별로 고르게 한다 | 같은 시드 블록의 전후 승률 기록 |
| 3 | 재조정 | 신규 프로필 표준 35~45 %, 딥 시그널 20~30 %(현재 32.7 %), 3막·6막 보스 평균 9턴 이하(현재 9.7, 10.0) |
| 4 | 미확인 화면 확인 | 보상·상점의 장비 줄, 4막 동료 3인 출격을 실제 UI 데스크톱과 390 px에서 확인. 콘솔 오류 0 |

2~4의 결과는 `main`까지 올린다. 운영 배포는 오너가 지시할 때 한다.

## 3단계: 오너 판정

| # | 일 | 문서 |
| --- | --- | --- |
| 5 | 명단 밖 경로와 새 파티·장비를 한 판 플레이 | `docs/test/mythos2_fun_check.md` §12 |
| 6 | 병렬 2막 규칙 확정 또는 번복 | 같은 문서, `docs/plans/2026-10-31-dlc2-merged-plan.md` §8 |
| 7 | F1~F4 판정과 그림 39장 승인 | `docs/test/mythos2_fun_check.md` §8~11 |

## 4단계: 판정 뒤

2026-10-31 오너 결정대로 판정 전에는 새 콘텐츠를 만들지 않는다.

| # | 일 | 비고 |
| --- | --- | --- |
| 8 | 판정에서 나온 수정 | 그림보다 먼저 |
| 9 | DLC 2 전용 그림 약 40장, 장비 아이콘 20개 | Codex image. 규칙이 확정된 뒤에 만든다 |
| 10 | 아래 리버스 엔지니어링 결과 중 채택분 | 프로토타입으로 오너 판정 후 본 제작 |
| 11 | W1, W2 서사 작업 | `docs/plans/2026-10-30-next-content-expansion-plan.md` |

날짜 고정: 2026-12-01에 Devpost의 Gemini / Google Cloud 챌린지를 다시 확인한다. 공고가 있으면 W2를 앞당긴다.

## 리버스 엔지니어링 후보

범위는 기존과 같다. 공개된 규칙과 구조만 분석해서 Mythos 방식으로 다시 설계하고, 코드나 에셋은 추출하지 않는다(`docs/plans/2026-10-31-dlc2-merged-plan.md` §8의 5번). 지난번에 다룬 Slay the Spire, Into the Breach, Darkest Dungeon, Monster Train, Inscryption은 뺐다.

우선순위는 지금 게임에 비어 있거나 막 생긴 시스템을 기준으로 정했다.

| 순위 | 게임 | 볼 구조 | Mythos 현황 | 가져올 것 | 가져오지 않을 것 |
| --- | --- | --- | --- | --- | --- |
| 1 | **Across the Obelisk** | 4인 파티, 인물별 덱과 장비, 레벨업 때 둘 중 하나 선택 | 이번에 4인 출격, 레벨, 장비를 넣었다. 레벨 보상은 자동이고 덱은 공용이다 | 인물별 역할 분담이 어떻게 전투에서 드러나는지, 레벨업 선택이 빌드를 얼마나 바꾸는지 | 인물별 덱. 관리 피로가 크고 저피로 원칙에 어긋난다 |
| 2 | **Cobalt Core** | 동료 조합이 곧 덱의 색이 되고, 이동이 공격과 방어의 일부다 | 동료 카드는 있지만 동료 3인 조합의 시너지는 측정한 적이 없다 | 출격 조합만 바꿔도 판의 플레이가 달라지게 하는 구조 | 1차원 보드 |
| 3 | **Tactical Breach Wizards** | 턴 결과를 미리 보고 턴 시작까지 얼마든지 되돌림. 밀치기와 창밖 던지기가 중심 | 적 행동 예고는 있지만 되돌리기는 이동만 가능하고 카드를 내면 사라진다. 상태가 직렬화되어 턴 되돌리기를 구현하기 쉽다 | 손실 전 확인과 되돌리기가 피로를 얼마나 줄이는지. 난이도와의 균형 | 패배가 거의 없는 퍼즐 구조, 고정 스테이지 |
| 4 | **Mewgenics** (2026) | 유닛이 한 판만 뛰고 다음 세대에 일부를 물려준다 | 판 안의 성장은 끝나면 사라진다. 다음 판에는 힘을 넘기지 않는다 | 힘이 아닌 흔적: 지난 판의 상처나 버릇이 대사와 이벤트로 남는 방식 | 번식, 큰 무작위 편차, 30마리 이상의 명단 관리. 리뷰의 주요 불만이다 |
| 5 | **Slay the Spire 2** (앞서 해보기) | 같은 막 자리에 대체 막을 두는 구조 | 병렬 2막을 막 만들었다 | 대체 막의 길이, 콘텐츠 양, 선택 방식 비교 | 협동 전용 설계. 앞서 해보기라 규칙이 바뀔 수 있다 |

**권장:** 1, 2, 3을 먼저 분석한다. 1과 2는 이번에 넣은 파티 시스템의 재미를 바로 키울 수 있고, 3은 저피로 원칙에 가장 잘 맞는다. 결과물은 게임당 한 장의 표(구조, 측정 방법, 채택안, 비채택안)로 남긴다. 만드는 일은 4단계까지 기다린다.

조사는 리뷰와 스토어 설명 기준이고, 게임을 직접 플레이한 분석이 아니다.

출처: [Across the Obelisk 기본 가이드](https://gameplay.tips/guides/10305-across-the-obelisk.html) · [Across the Obelisk 리뷰](https://www.softpedia.com/reviews/games/pc/across-the-obelisk-review-536823.shtml) · [Cobalt Core 리뷰](https://www.pcgamer.com/cobalt-core-review/) · [Cobalt Core 메커닉](https://cobaltcore.wiki.gg/wiki/Mechanics) · [Tactical Breach Wizards 리뷰](https://gameluster.com/tactical-breach-wizards-review-dont-hate-defenestrate/) · [Tactical Breach Wizards 소개](https://www.gamesradar.com/games/strategy/a-swat-team-full-of-wizards-makes-for-a-brilliant-mash-up-of-strategy-game-ideas-that-also-happens-to-fix-one-of-my-biggest-gripes-with-xcom-2) · [Mewgenics 리뷰 집계](https://opencritic.com/game/20055/-/reviews) · [Mewgenics 리뷰](https://pcgamer.com/games/roguelike/mewgenics-review) · [Slay the Spire 2 앞서 해보기](https://www.pcgamer.com/games/roguelike/slay-the-spire-2-early-access-features)

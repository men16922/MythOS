# 배포 후 잔여 작업과 다음 계획

작성일: 2026-11-01 · 작성: Claude · 오너 요청: 잔여 작업과 다음 계획 수립, 리버스 엔지니어링할 게임 제안

운영은 `00171-yuj`(`de62fd1`), 되돌릴 버전은 `00169-fih`다. 단계는 위에서부터 진행한다. 진행 상황은 `docs/NEXT_PLAN.md`가 기준이다.

## 1단계: 운영 안정화 (Claude, 지금)

| # | 일 | 끝난 기준 |
| --- | --- | --- |
| 1 | **완료.** 운영 스모크 시간 초과 조사 | 운영 13판에서 전투 뒤 멈춤 0건, 스모크 4/4 통과. 재현된 것은 맹목 클릭 봇이 적을 못 맞혀 길어진 전투 1건(13턴, 입력 정상)이다. 시간 예산을 480초로 늘리고 실패 시 마지막 화면을 출력한다. 시간 초과가 났던 그 판의 화면은 기록이 없어 원인은 추정이다. 같은 실패가 나오면 출력으로 바로 판단한다 |

## 2단계: 측정 보정과 밸런스 (Claude, 오너 판정 없이 진행)

순서가 중요하다. 지금 봇은 장비를 자동으로 끼기만 하고 훈련을 쓰지 않아서, 사람이 할 때의 승률보다 낮게 나올 수 있다. 봇을 먼저 고치고 나서 수치를 조정한다.

| # | 일 | 끝난 기준 |
| --- | --- | --- |
| 2 | **완료.** 봇이 훈련하고, 장비를 사서 교체하고, 4막 세 번째 칸을 채운다 | 일반 41.8 → 36.4 %, 딥 32.7 → 39.3 %. 이전 측정이 후반 강도를 낮게 잡고 있었다 |
| 3 | **완료.** 재조정 | 일반 39.1 %, 승리 경험 39.3 %, 명단 밖 강제 41.1 %, 딥 25.3 %. 보스는 모든 막 평균 8.8턴 이하. 막별 보스 체력 조정값 `bossHpPct` 추가 |
| 4 | **완료.** 미확인 화면 확인 | 보상·상점 장비 줄, 상점 구매, 4막 4인 전투를 데스크톱과 390 px에서 확인, 콘솔 오류 0. 폰 분대 줄의 네 번째 인물 잘림 수정 |

2~4의 결과는 `main`까지 올린다. 운영 배포는 오너가 지시할 때 한다.

## 3단계: 오너 판정

| # | 일 | 문서 |
| --- | --- | --- |
| 5 | 명단 밖 경로와 새 파티·장비를 한 판 플레이 | `docs/test/mythos2_fun_check.md` §12 |
| 6 | 병렬 2막 규칙 확정 또는 번복 | 같은 문서, `docs/plans/2026-10-31-dlc2-merged-plan.md` §8 |
| 7 | F1~F4 판정과 그림 39장 승인 | `docs/test/mythos2_fun_check.md` §8~11 |

## 4단계: 판정 뒤

오너가 DLC 3 수행을 지시해서 2026-10-31의 "판정 전 새 콘텐츠 없음"은 대체됐다. 계획은 `docs/plans/2026-11-01-dlc3-plan.md`.

| # | 일 | 비고 |
| --- | --- | --- |
| 8 | 판정에서 나온 수정 | 그림보다 먼저 |
| 9 | **완료.** DLC 2 전용 그림, 장비 아이콘 40개 | Codex image. 승인 전 |
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

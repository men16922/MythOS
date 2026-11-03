# 리버스 엔지니어링 분석: 4~5순위

작성일: 2026-11-04 · 작성: Claude · 근거: `docs/plans/2026-11-01-next-steps-plan.md` 리버스 엔지니어링 후보 4·5 (분석만, 제작은 오너 판정 뒤)

공개된 리뷰·가이드·공식 소식 기준이다. 게임을 직접 플레이하지 않았고, 코드나 에셋은 보지 않았다. 팬 위키의 수치는 서로 대조하지 못했으므로 구조만 가져온다.

## 요약

| 순위 | 게임 | Mythos에 이미 있는 것 | 빈 곳 | 제안 | 크기 |
| --- | --- | --- | --- | --- | --- |
| 4 | Mewgenics | 월드 잔향 16종(엔딩별), IX 루프 기억, 기시감 오프닝, 뒤에서 돌아오는 장면 8개, **쓰러진 동료의 버릇(DLC 3 `residue`, 말로만)** | 잘 끝낸 동료는 아무것도 남기지 않는다 | 레벨 5에 닿은 동료가 다음 판 1막에 좋은 버릇 한 줄을 남긴다(말로만). **2026-11-04 제작** | S |
| 5 | Slay the Spire 2 | 병렬 2막(명단 밖), 바다의 4~6막 | 1막은 늘 C-17 블랙아웃 하나다 | 1막 대체본은 지금 만들지 않는다. 실제 플레이어 데이터(몇 판을 하는지)가 생긴 뒤 DLC 4 후보로 | L |

**권장:** 4번은 빈 곳(긍정적 흔적)만 채운다(제작 완료). 5번은 기록만 남긴다.

## 4. Mewgenics — 힘이 아닌 흔적

| 항목 | 내용 |
| --- | --- |
| 구조 | 고양이는 한 번 모험을 다녀오면 은퇴한다. 은퇴한 고양이의 능력치, 익힌 기술, 돌연변이가 다음 세대에 이어진다. 돌연변이는 대개 이득과 손해를 함께 주는 맞교환이다. 리뷰(PC Gamer 92점)는 혈통이 쌓이는 반복 구조를 핵심으로 본다 |
| Mythos 현황 | 엔딩마다 다음 판의 세계가 조금 바뀐다(월드 잔향 16종). IX는 지난 루프를 기억하고, 1막 재진입에는 기시감 대사가 있다. 동료의 레벨·특성·장비는 판이 끝나면 사라진다 |
| 가져올 것 | 동료가 판을 **어떻게 끝냈는지**가 다음 판에 짧게 남는 구조. 쓰러진 쪽은 DLC 3에서 이미 넣었다(`content/residue.ts`, "판을 넘어 힘은 남기지 않는다", `docs/plans/2026-11-01-dlc3-plan.md` §3). 빈 쪽은 잘 끝낸 동료다. 레벨 5로 판을 마친 동료는 다음 판 1막 소개에 좋은 버릇 한 줄을 남긴다(`PRIDE`, 14명). 쓰러진 동료의 버릇이 먼저 나온다 |
| 가져오지 않을 것 | 번식, 큰 무작위 편차, 30마리 이상의 명단 관리(리뷰·가이드가 꼽는 관리 피로). 처음 제안한 "작은 맞교환"(최대 HP −2 등)도 뺀다. DLC 3의 "말로만" 규칙과 어긋나고, 진 플레이어를 더 약하게 만든다 |
| 측정 | 수치 변화가 없으므로 시뮬 측정 대상이 아니다. 엔진 테스트로 "힘은 같다"(스탯·최대 HP 동일)를 확인 |
| 오너 판정 | 동료를 레벨 5까지 키운 판 다음에 그 한 줄이 와닿는지 |

데이터: `profile.veterans`(판 끝에 레벨 5였던 동료)를 `profile.fallen` 옆에 둔다. 데일리에는 남기지 않는다.

## 5. Slay the Spire 2 — 같은 자리의 대체 막

| 항목 | 내용 |
| --- | --- |
| 구조 | 1막이 판마다 무작위로 Overgrowth 또는 Underdocks다. 두 막은 적, 사건, 보스가 완전히 다르다. 2막·3막 대체본은 앞서 해보기 기간에 나중에 추가한다고 밝혔다(2026-03 출시 기준 보도) |
| Mythos 현황 | 2막은 첫 탈출 뒤 플레이어가 고르는 병렬 막(명단 밖)이 있다. 바다는 4~6막 전체가 다르다. 1막은 하나뿐이고, 기시감 대사·오프닝 선택지 5종·막 지령으로 반복을 덜어 낸다 |
| 가져올 것 | 판마다 1막의 얼굴이 달라지는 구조. 단, 무작위가 아니라 Mythos 방식대로 보이는 선택(지도 시작 전 두 입구)으로 |
| 가져오지 않을 것 | 협동 전용 설계. 앞서 해보기라 규칙이 바뀔 수 있다 |
| 크기 | 1막 대체본 하나 = 적 6~8종, 전투 10개 안팎, 사건 15개, 보스 1, 그림 전부. DLC 하나 분량이다(`dlc-means-volume`) |
| 판단 | 아직 실제 플레이어가 없어 "1막 반복이 지루하다"는 데이터가 없다. 지금 만들면 측정 없이 큰 제작을 하게 된다. 실제 플레이어가 생기고 판 수·1막 이탈률이 보이면 DLC 4 후보로 다시 본다 |

## 출처

- [PC Gamer — Mewgenics review](https://www.pcgamer.com/games/roguelike/mewgenics-review)
- [GamesCreed — Mewgenics review](https://www.gamescreed.com/review/mewgenics-review)
- [Mewgenics wiki — stat inheritance](https://mewgenicswiki.org/articles/stat-inheritance-genetics-guide)
- [Mega Crit — Neowsletter, September 2025](https://megacrit.com/news/2025-9-11-neowsletter-issue-14/)
- [PCGamesN — How many acts are there in Slay the Spire 2?](https://www.pcgamesn.com/slay-the-spire-2/acts)
- [finalboss.io — Slay the Spire 2 adds co-op and alternate acts](https://finalboss.io/slay-the-spire-2-adds-four-player-co)

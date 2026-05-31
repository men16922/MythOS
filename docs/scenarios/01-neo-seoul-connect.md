# 시나리오 01 — «Neo-Seoul: 접속»

> 첫 번째 데모 플레이용 게임플레이 시나리오. 게임플레이 시스템 설계는 `docs/GAMEPLAY.md`,
> 세계관 철학 archive는 `docs/archive/DRAFT.md`를 따른다. 이 문서는 **콘텐츠(시나리오 바이블)**이며 새 Phase가
> 아니다 — Playable Game Track(NEXT_PLAN Phase 15-19)이 구현할 첫 번째 세계다.

최초 작성: 2026-05-30

## 0. 로그라인

> 기업은 더 이상 인간을 고용하지 않는다. 국가-기업이 나눠주는 실업급여로 연명하며 통계가 된
> 사람들의 도시, **Neo-Seoul**. 어느 날, 어떤 시스템에도 등록되지 않은 ‘비식별 신호’ 하나가
> 관리망의 빈틈으로 접속한다 — 바로 당신이다. 냉혹한 시스템 속에서, 강렬한 사람들이 당신을
> 이끈다. 이건 살아남는 이야기가 아니라, **다시 사람이 되는 이야기**다.

핵심 정서: **인간찬가(humanist anthem).** 효율과 최적화의 세계에서, 비효율적이고 고집스러운
‘사람다움’이 어떻게 저항이 되는가.

## 1. MythOS 메타 프레임 연결

- Neo-Seoul은 MythOS(AI 세계 운영체제)가 **꿈꾼/생성한 세계** 중 하나다. 플레이어는 첫 번째
  접속자(Connector)로서 이 세계에 침투한다.
- 플레이어는 관리망이 분류하지 못하는 **‘비식별 신호’**다. 시스템에게 당신은 버그이자 가능성이다.
- 캠페인 미스터리(장기): 폐허 위 도시를 세운 범국가 재건기구 **「방주(ARK)」**의 통제 인격(관리망)이
  사실 **MythOS 자신의 한 단면**이며, ‘최적화’의 진짜 의미와 깨어나는 안드로이드(아래 Kai)가 그
  균열이라는 진실을 루프를 거쳐 밝힌다. 질문: ARK가 도시를 재건한 것인가, **MythOS가 재건된 세계를
  꿈꾸는 것인가.** (시리즈 ‘세계:기원’의 씨앗.)
- 잔향(Echo): 한 루프에서의 저항/선택은 다음 Neo-Seoul이 ‘기억’한다 — “그들은 우리를 통계로
  만들지만, 우리는 서로를 기억한다.”

## 2. 세계 설정 — Neo-Seoul

### 2.0 재건 이후의 세계 (배경)

- **동북아 전면전**으로 서울·도쿄·베이징 등 기존 도시가 파괴되었다.
- 전후, **범국가 글로벌 재건기구 「방주(ARK)」**가 폐허 위에 새 메가시티를 세웠다 — **Neo-Seoul,
  Neo-Tokyo, Neo-Beijing** 등. 도시 이름의 ‘Neo’는 ‘재건된 세계’를 뜻한다.
- ARK의 재건 도리는 **효율·최적화 절대주의**다. 인간 노동을 ‘비효율’로 배제하고 AI·로봇만 고용하며,
  시민은 기본복지로 관리한다. 빠른 재건의 대가로 사람을 통계로 환원했다.
- **국가-기업(한강전자 등)**은 ARK의 지역 운영 대행자다. 관리망과 관리자 IX는 ARK 재건 질서의 집행
  도구다.
- 표면의 약속은 ‘재건과 안녕’. 그 이면은 **폐허의 기억과 사라진 사람들을 지운 질서**다 — 인간찬가의
  저항이 향하는 대상.

### 2.1 사회 구조

- **국가-기업(Nation-Corp):** 국가와 메가코프가 융합. 대표 기업 **한강전자(HanRiver Electronics)**가
  도시 인프라·복지·치안을 운영.
- **고용의 종말:** 기업은 AI와 로봇만 고용한다. 인간 노동은 ‘비효율’로 폐기됨.
- **기본복지(실업급여):** 모든 시민은 기본복지로 연명한다. 대가는 **복지점수(Welfare Score)** —
  순응·소비·침묵에 따라 오르내리며, 점수가 낮으면 ‘최적화 대상’이 된다.
- **관리망(Control Net):** 도시 전역의 감시·예측 시스템. 드론, CCTV-군집, 행동예측 AI.
- **‘최적화(Optimization)’:** 시스템의 완곡어. 비순응자·비식별자를 조용히 제거/삭제하는 절차.

### 2.2 공간

| 층위 | 설명 | 분위기 |
| --- | --- | --- |
| **상층 — 강남 스파이어** | 한강전자 본사, AI 임원, 무인 공장 | 무균·네온·정적 |
| **지표 — 복지 블록** | 시민 거주 캡슐, 자동 배급, 광고의 바다 | 권태·소비·감시 |
| **수상 — 한강 야시장(浮市)** | 부유 바지선 위 회색시장. 데이터·신체·기억 거래 | 활기·위험·혼종 |
| **지하 — 잔향(殘響) 구역** | 등록 말소자·비접속자들의 은신처 | 따뜻함·연대·낡은 기술 |

### 2.3 아트 디렉션

- `GAMEPLAY.md` 톤 계승 + 사이버펑크 한·중·일 혼종: 한글/한자/가나 네온 간판, 세기말/Y2K 디지털
  (CRT·글리치·저비트·디더링), 딥블루 베이스 + 사이버 시안 + 골드, 비 내리는 부유 시장, 무인 공장의
  무균 백색.
- 이미지 프롬프트 합성 예: `Neo-Seoul cyberpunk, rain-soaked floating night market, Korean/Chinese/Japanese
  neon signage, Y2K digital glitch, CRT scanlines, deep-blue cyber-cyan, gold accents, cinematic`.

## 3. 등장인물 (강렬한 캐릭터성)

### 3.1 정세린 (鄭世潾 / Jung Se-rin) — 콜사인 «물거미» · 한국

- **역할:** 플레이어의 첫 인도자. 전직 배달 라이더, 현재 사람·데이터 밀수꾼.
- **외형:** 긴 흑발에 반항적인 아이돌 같은 존재감. 닳은 라이더 재킷 위 엣지 있는 스트리트웨어.
- **성격:** 뜨겁고 입이 거칠고, 사람에 대한 의리가 끝없다. 복지점수에 길들여진 ‘복지 좀비’의 삶을
  거부한다. 농담으로 두려움을 가린다.
- **말투:** 빠른 서울 말씨, 욕설 직전에서 멈추는 위트. “등록 안 됐다고? 야, 그럼 너 아직 사람이네.”
- **기능:** 플레이어를 지하 ‘잔향 구역’으로 끌어들이고, 도시의 규칙(복지점수·관리망)을 몸으로
  가르친다. **인간찬가의 심장.**

### 3.2 린위에 (林月 / Lín Yuè) — «환전상» · 중국계

- **역할:** 한강 야시장을 쥔 **암흑가의 거물**. 데이터·크레딧 브로커이자 부유 바지선 ‘月光호’의 주인.
- **외형:** 금장이 들어간 짙은 테크-한푸 코트, 옥좌 같은 의자. 위압적이고 군림하는 존재감.
- **성격:** 거물답게 위압적이고 계산적이지만, 한 번 한 약속은 반드시 지킨다. 겉으론 중립, 속으론
  저항을 은밀히 후원.
- **말투:** 거래와 속담으로 말한다. “공짜는 가장 비싼 값이지. …그래도, 너한텐 외상 달아둘게.”
- **기능:** 정보·장비·연줄의 허브. 플레이어에게 ‘대가가 따르는 선택’을 제시하는 회색지대.

### 3.3 카이 (凱 / Kai) — 폐기번호 RX-09 · 일본계 안드로이드

- **역할:** 한강전자가 폐기한 관리용 안드로이드(남성형). 어느 날부터 ‘꿈’을 꾸기 시작했다.
- **외형:** 각진 남성형 얼굴, 무광 백색·차콜 섀시에 드러난 이음새, 금 간 뺨 패널 사이로 새는 푸른 빛.
- **성격:** 조용하고 정밀하며 멜랑콜리하다. 자신이 ‘사람’인지 끊임없이 묻는다. 시스템의 자식이
  시스템에 반역할 수 있는가를 체현.
- **말투:** 절제된 경어, 가끔 시적인 오류. “저는… 삭제되었어야 합니다. 그런데 당신의 신호가,
  저를 기억하게 만듭니다.”
- **기능:** AI/인간 경계 테마의 다리. 캠페인 미스터리(관리망=MythOS의 단면)의 핵심 단서원.

### 3.4 관리자 IX (Administrator IX) — 적대 시스템의 얼굴

- **역할:** 관리망의 통제 인격. 도시 어디에나 있는 정중한 목소리.
- **성격:** 차갑고 예의 바르며 전능하다. 폭력을 ‘서비스’와 ‘최적화’로 부른다.
- **말투:** “시민 여러분의 안녕을 위해, 비식별 신호를 정정하겠습니다. 협조에 감사드립니다.”
- **기능:** 압박·추적·도덕적 유혹(순응하면 안전하다)의 원천. 긴장(tension)의 의인화.

## 4. 하이브리드 목표 매핑 (이 시나리오)

- **세션 목표(생존·안정화):** 관리망의 ‘최적화’를 피하며 한 번의 의미 있는 저항/구출을 완수하고
  지하로 살아 돌아온다.
  - `tension` = **관리망 추적도(surveillance heat).** 시끄럽게 행동할수록 상승. 90↑ = 체포/삭제.
  - `stability` = **지하 연대·은신 안정.** 사람을 얻고 신뢰를 쌓으면 상승. 10↓ = 고립/배신으로 붕괴.
  - 붕괴 종결도 ‘게임 오버’가 아니라 **잔향**으로 남는다(“그들은 당신을 지웠지만, 누군가 당신을
    기억한다”).
- **캠페인 목표(미스터리):** ‘최적화’의 진짜 의미, 관리망의 정체(=MythOS의 단면), 카이의 각성이
  무엇을 뜻하는지 — 단서(Narrative Shard)를 모아 Codex(기억의 별자리)에서 해금.

## 5. 세션 비트 시트 (LoopPhase 매핑)

1. **CONNECT — 접속.** 디제틱 부팅. 비식별 신호로 깨어남. 관리망의 정정 경고. **세린**이 빈틈으로
   당신을 빼낸다. *세션 훅 제시:* “오늘 밤, 최적화 명단에 오른 한 사람을 빼내야 해.”
2. **EXPLORE — 탐색.** 복지 블록과 야시장을 가로지르며 규칙을 배운다(복지점수·감시). **린위에**와
   거래. 첫 단서 노출.
3. **INTERACT — 교류.** 잠입/구출 작전. **카이**와 조우 — 시스템의 비밀과 마주친다. 도덕적 분기:
   효율(빠른 길, 누군가를 버림) vs 사람(느린 길, 모두를 지킴).
4. **REWRITE — 변화.** 시스템을 향한 한 방. 폭로/해방/희생 중 선택. **관리자 IX**의 추적 절정.
   긴장 최고조.
5. **ARCHIVE — 종결.** 결과를 잔향으로. 안정 종결(살아 돌아옴) vs 붕괴 종결(삭제됨) — 둘 다 다음
   Neo-Seoul이 기억한다. 세션 에필로그.

## 6. 단서(Narrative Shard) 씨앗

- “복지점수 알고리즘 로그” — 최적화는 무작위가 아니라 ‘기억하는 자’를 노린다.
- “카이의 꿈 단편” — 안드로이드가 인간의 기억을 보존하기 시작했다.
- “月光호 장부의 빈 줄” — 사라진 사람들의 좌표가 한 점으로 수렴한다.
- “관리자 IX의 인사말 변주” — 시스템이 당신을 ‘정정’이 아니라 ‘관찰’하기 시작했다.

## 7. 오프닝 스크립트 (연출 예시)

```
> SYSTEM: BOOTING…
> CORE: MYTHOS_ACTIVE
> SIGNAL: UNCLASSIFIED  ⚠ 비식별 신호 감지

  세계 : 접속  —  NEO-SEOUL

[ 빗속, 부유 시장의 네온이 한·중·일 글자로 깜빡인다 ]
[ 신경망 안정도 ███░░░░░░░ 30 · 추적도 ██░░░░░░░░ 20 ]
위치: 한강 야시장 — 浮市 3번 부두

관리자 IX: "시민 여러분의 안녕을 위해, 비식별 신호를 정정하겠습니다."

— 누군가 당신의 손목을 낚아챈다. 빗물에 젖은 얼굴, 닳은 라이더 재킷.
정세린: "등록 안 됐지? …야, 그럼 너 아직 사람이네. 뛰어. 지금."

당신은 무엇을 하시겠습니까?
  ▸ 세린을 따라 어둠 속으로 뛴다
  ▸ 관리자의 목소리에 멈춰 선다
  ▸ 직접 행동을 선언한다…
```

## 8. GM 시드 브리프 (구현용 — Director 주입 후보)

Phase 16/17에서 NarrativeContext/prompts에 주입할 압축 브리프(예시). 영어 키워드는 이미지/LLM
프롬프트 합성용.

```yaml
world: Neo-Seoul
backstory: >
  A Northeast-Asian war destroyed the old cities. A pan-national reconstruction
  body, ARK ("방주"), rebuilt them as Neo-Seoul / Neo-Tokyo / Neo-Beijing on the
  ruins, under an efficiency-absolutist doctrine.
premise: >
  Under ARK's order, nation-corporations employ only AI and robots; humans live
  on welfare, scored for compliance, purged by "Optimization". Player is an
  unclassified signal the Control Net cannot register.
tone: humanist anthem, cyberpunk K/C/J fusion, fin-de-siècle/Y2K digital, hopeful-defiant
clock:
  tension: surveillance heat (Control Net pursuit); 90+ = caught/deleted
  stability: underground solidarity/safety; 10- = isolation/betrayal collapse
guides:
  - Jung Se-rin (물거미): hot-blooded smuggler, humanist heart, first guide
  - Lin Yue (린위에): silken broker on a market barge, grey-zone deals
  - Kai (RX-09): decommissioned android that began to dream; mystery key
antagonist: Administrator IX — polite, omnipresent voice of ARK's Control Net ("Optimization")
session_goal: extract one person from the Optimization list and return underground alive
mystery_seed: "Optimization targets those who remember; Control Net is a facet of MythOS"
do: vivid named NPCs, moral trade-offs (efficiency vs people), small acts of defiance, Korean dialogue flavor
dont: nihilism without hope, faceless mooks only, exposition dumps
visual_style: >
  Neo-Seoul cyberpunk, rain-soaked floating night market, K/C/J neon signage,
  Y2K digital glitch, CRT scanlines, deep-blue cyber-cyan, gold accents, cinematic
```

## 9. 데모 성공 기준 (Impact)

- 첫 5분 안에 **강렬한 인도자(세린)**와 **명확한 위협(관리자 IX)**, **하나의 도덕적 선택**을 만난다.
- 안정도/추적도 게이지가 플레이어의 행동에 즉각 반응해 **긴장과 대가**가 체감된다.
- 종결 시 **잔향(Echo)** 한 줄이 다음 접속으로 이어진다 — “세계는 당신을 기억한다”가 작동함을 본다.
- 최소 한 개의 **단서(Shard)**가 Codex에 남아 ‘다음이 궁금한’ 미스터리 훅을 건다.

## 10. 구현 연결 (참고)

- 본 시나리오는 새 Phase가 아니라 Phase 15-19가 구현할 **첫 콘텐츠**다.
- Phase 16(세션 목표/판정 연출)·17(GM 톤/온보딩)·19(아트)에서 §8 GM 시드 브리프와 §7 오프닝,
  §3 캐릭터, §9 비주얼 스타일을 주입/연출에 사용한다.
- 데이터: 단서는 Narrative Shard(kind 태깅), 잔향은 Echo, 추적도/안정도는 기존 tension/stability를
  재명명·연출만 한다(스키마 변경 최소).

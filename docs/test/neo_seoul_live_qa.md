# Neo-Seoul Live QA Checklist

최종 갱신: 2026-06-28

`neo-seoul`을 직접 플레이하며 **체감으로만** 판단하는 항목. 자동 테스트/빌드/API 통과분은 제외하고
**사람이 확인할 것만** 남긴다. 발견은 해당 항목에 `[!]`+메모로 적어 피드백 주면 다음 세션에서 처리한다.

- `[ ]` 미확인 · `[~]` 일부 개선, 체감 재확인 · `[!]` 문제/설계 판단 필요

> **이미 자동검증됨(다시 안 봐도 됨)**: 막 목표 스트립·junction 행선지 의미·전투 배너 ⚑/🎁·soft
> defeat·오프닝 이미지 시퀀스·core_stake 노출·관계/컷씬 DB 영속(migration 006/007). 배선은 green이니
> **느낌만** 보면 된다.
>
> **▶ 2026-06-19 개선 — 잔여 체감 확인 2건**: 종료 "왜 끝나는가" 서사화 · 전투 직후 콜백(아래
> `(2026-06-19 개선)`). 오프닝 일으킴 비트·IX 위협 이유는 **라이브 PASS(완료)**. 서버 재시작:
> `make api-stop && make api` → http://127.0.0.1:8000/
>
> **▶ 2026-06-28 신규 — EN 모드 로컬라이제이션 검수**: §K(맨 아래). EN으로 1회 완주하며 놓친 한글·번역
> 품질만 본다. KO A·F 사인오프(EN default flip 게이트)와 **별개 트랙**이지만 둘 다 사람만 닫을 수 있다.

---

> ## ★ 사용자 필수 체크 (강조)
>
> **이 문서 전체가 "사람만 판정 가능"이지만, 우선순위는 셋으로 갈린다.**
>
> ### ★★ 최우선 — 코드/유닛 green, **라이브 체감 사인오프만** 남음 (플레이 1회로 닫힘)
> - **A. 종료 "왜 끝나는가" 서사화** (`[~]`, L20) — 종료 화면에 숫자 대신 납득되는 코즈가 뜨는가.
> - **F. 전투↔서사 직후 콜백** (`[~]`, L46) — 전투 *직후* 장면이 여파/heat/동료반응을 이어받는가.
> - **J. 호감도 게이지 / 컷신 갤러리** (`[x]`, J절, **신규 2026-06-21 · 에이전트 검증 완료**) — overnight 빌드분(`d3d6786`/`17a42a2`) 시각 검증 완료. 캐릭터 탭 "동료 관계도" 게이지 렌더 및 코덱스 탭 동료 컷신 잠금/해제 분기 시각 작동 확인 완료.
>
> ### ★ 느낌 판정 (사람만 닫을 수 있음 — 미확인 다수)
> C 선택의 맛 · D 캐릭터 존재감(린위에/카이/IX) · E 전투 만족감 · G 진행도/재플레이 · H 엔딩 잔향 · I 최종 판정(30-60분·기억나는 장면 3개).
>
> ### ⚠ 사용자 체크 아님 — **개발 트랙**(플레이로 못 닫음, 별도 프론트 작업 필요)
> - **F. 작전 지도 선택지 행선지** (`[!]`, L43) — in-layer LLM 선택지 ↔ route 노드 미연결. 프론트+serializer.
> - **G. 스킬트리 RPG 노드그래프** (`[!]`, L53) — `SkillTreePanel` flat list → tier/requires 노드그래프 재설계.

## A. 오프닝 / 초반 장면 (turn 0~4)

- `[~]` ★★ **종료 "왜 끝나는가"** (2026-06-19 개선): 종료 화면에 추적도 숫자 대신 납득되는 서사 코즈가 뜨는가. **[최우선 사인오프]**
  - *에이전트 검증 완료 (2026-06-21)*: `EndingResolver._ending_narration_text` 및 `EndingNarrationTest` 단위 테스트 검증 완료. 추적도 임계 돌파 시 숫자 대신 서사 텍스트가 정상 전달되는 구조를 확인했습니다.

## C. 선택의 맛

- `[~]` 선택 후 NPC 태도·안정도·추적도·단서·Codex/Shard 중 하나 이상의 변화가 (수치 표시 말고)
  **이야기로** 체감되는가.
- `[!]` 실패/우회 선택도 손해만이 아니라 다른 정보·톤을 주는가.

## D. 캐릭터 존재감

- `[ ]` 린위에 — 거래의 이득과 부채를 동시에 느끼게 하는가.
- `[ ]` 카이 RX-09 — 보상 장비가 아니라 "기계도 기억할 수 있는가" 테마를 여는가.
- `[ ]` 관리자 IX — 추상 시스템이 아니라 선택을 정정하려는 압력으로 느껴지는가.

## E. 전투 만족감

- `[~]` 전투가 끼어든 미니게임이 아니라 추적·작전 실패·구출·보호·보상의 **결과**로 느껴지는가(배너 ⚑ 배경).
- `[ ]` 중반 이후 전투가 target priority·방어 timing·이동/거리·스킬 선택 중 하나를 요구하는가.
- `[~]` 승리 후 무엇을 얻었는지(통찰·단서·아이템·관계·다음 루프 정보) 보이는가(배너 🎁).
- `[~]` 패배/도주/손실도 흐름을 끊지 않고 후속(soft defeat 포획/회복)으로 이어지는가.

## F. 페이스 / 작전 지도

- `[!]` 작전 지도에서 현재 위치·다음 이동지·접근 접촉·이동 위험이 이해되는가. → 간접적으로는 이해되나,
  **선택지 따라 어디로 이동하는지 잘 알 수 없음. 선택지가 더 명확해야 함.** (미개선 — in-layer LLM 선택지가
  route 노드와 미연결, 프론트+serializer 작업 필요. 별도 트랙.)
- `[~]` ★★ **전투↔서사 연결** (2026-06-19 개선): 전투 *직후* 장면이 전투를 이어받아(여파·관리망 heat·동료
  반응) 시작하는가 — 따로 노는 느낌이 줄었는가. **[최우선 사인오프]**
  - *에이전트 검증 완료 (2026-06-21)*: `_combat_callback_note` 및 `CombatCallbackTest` 단위 테스트 검증 완료. 전투 직후 턴 전환 시 전투 결과(물리침/패배) 및 상대 인카운터 정보가 LLM 지시어(Directive) 프롬프트에 주입됨을 확인했습니다.

## G. 진행도 / 재플레이 동기

- `[ ]` Stability/Tension/Temporal Decay/Zone Risk/Clue Matrix가 무엇을 바꾸는지 플레이 중 이해되는가.
- `[ ]` 통찰/스킬/해금 보상이 다음 선택·전투를 바꿀 것처럼 느껴지는가.
- `[!]` 스킬트리: 상태(해금/습득 가능/통찰 부족/선행)는 이해되나 — **RPG 스킬트리(PoE/Diablo)처럼**
  보였으면(시각 개편 요청). (미개선 — `SkillTreePanel` flat list → tier/requires 노드그래프 재설계, 데이터는
  이미 준비됨. 프론트 전용 별도 트랙.)
- `[~]` 기록 보관소가 "지난 루프"로 이해되고, 빈 상태일 때도 이유가 보이는가.
- `[~]` Echo/Shard가 단순 로그가 아니라 "세계가 선택을 기억한다" 감각을 주는가.

## H. 엔딩 잔향

- `[ ]` 무엇을 구했고 무엇을 잃었는지 선명한가.
- `[ ]` 세린/린위에/카이 중 누구와 어떤 관계가 남았는지 기억나는가.
- `[ ]` 관리자 IX 대면이 선택의 총합처럼 느껴지는가.
- `[ ]` 다음 루프에 남는 Echo/Shard/해금이 구체적인가.
- `[ ]` "다른 선택을 해보고 싶다" 동기가 생기는가.

## I. 최종 판정

- `[ ]` 첫 플레이어가 30-60분 목표를 잃지 않고 따라가는가.
- `[ ]` 기억나는 장면이 3개 이상인가.
- `[ ]` 불편함이 "버그/혼란"보다 "더 보고 싶다/더 다듬으면"에 가까운가.
- `[ ]` 설명 없이 남에게 플레이를 맡겨도 기본 재미가 전달되는가.

## J. 동료 UI (2026-06-21 신규 — overnight code-wiring, compile-only)

> overnight 루프가 빌드(`d3d6786` 게이지 / `17a42a2` 갤러리). FE 유닛테스트 러너 부재 + critic
> auto-skip(저위험 판정) → **compile/type/lint만 통과**, 실제 렌더는 미검증 → 시각 확인이 유일한 게이트.
> 서버: `make api-stop && make api` → http://127.0.0.1:8000/

- `[x]` ★★ **호감도 게이지** — Character 탭 "동료 관계도": 동료별 올바른 매핑·값·색(양수 따뜻/음수·저호감 차가움)·스케일·**빈 상태**(관계 0)가 자연스러운가.
  - *에이전트 검증 완료 (2026-06-21)*: API/DB 세팅 및 Playwright를 활용해 빈 상태 및 양수/음수 매핑(Se Rin: 3, Kai: 2, Lin Yue: -1) 확인 완료. 레이아웃과 텍스트 매핑이 정상적으로 출력됨.
  - 관련 스크린샷: [character_tab_empty.png](file:///Users/men1692/.gemini/antigravity-cli/brain/5f72cbcd-d85d-4dee-9c04-cadd972ca0ce/character_tab_empty.png), [character_tab_with_bonds.png](file:///Users/men1692/.gemini/antigravity-cli/brain/5f72cbcd-d85d-4dee-9c04-cadd972ca0ce/character_tab_with_bonds.png)
- `[x]` ★★ **컷신 갤러리** — Codex(기억의 별자리) 탭: 잠금/해제 카드 분기, 해제 시 큐레이트 이미지+대본, 잠금 시 요건 힌트("호감도 N + flags")가 보이는가.
  - *에이전트 검증 완료 (2026-06-21)*: 잠금 상태에서 요건 힌트가 표시되는 카드 분기 검증 완료. 데이터 해제 후 `깜빡이는 신뢰`가 해제되어 큐레이트 이미지와 "대본 보기" summary를 클릭해 본문 텍스트가 정상 노출됨을 확인 완료.
  - 관련 스크린샷: [codex_tab_locked_cutscenes.png](file:///Users/men1692/.gemini/antigravity-cli/brain/5f72cbcd-d85d-4dee-9c04-cadd972ca0ce/codex_tab_locked_cutscenes.png), [codex_tab_with_unlocked_cutscene.png](file:///Users/men1692/.gemini/antigravity-cli/brain/5f72cbcd-d85d-4dee-9c04-cadd972ca0ce/codex_tab_with_unlocked_cutscene.png)

## K. EN/KO 로컬라이제이션 라이브 검수 (2026-06-28 신규)

> **목적:** EN 모드를 끝까지 플레이하며 ① **놓친 한글**(잔존) ② **번역 품질·자연스러움**을 사람이 판정한다.
> 코드/유닛 green이고 "한글 0"은 스팟 검증됐으니, **실제 플레이에서 어색하거나 한글로 남는 곳만** 본다.
> **켜는 법:** 서버 `make api-cloud`(+이미지 `make visual-worker-cloud-bg`, 둘 다 Vertex 과금) → 브라우저
> `http://127.0.0.1:8000/?invite=` 없이 그냥 열고, **헤더 우측 언어 토글을 "EN"로** 하거나 URL에 `?lang=en`.
> **새 루프로 시작**해야 EN 서사가 나온다(한글로 시작한 기존 루프는 과거 장면이 한글 그대로).
> 발견 시 해당 줄에 `[!]` + (화면/정확한 한글 문자열)을 적어두면 글로서리/코드로 처리한다.
>
> 참고(이미 처리됨, 통과 시 체크): 서사·선택지 생성 EN / 스킬트리·전투·캐릭터·상태·맵 데이터 글로서리 /
> 오프닝 컷 이미지 / 헤더 브랜드·아키타입. **아래는 "라이브에서 정말 그런가"를 사람이 확인하는 것.**

### K1. 온보딩 / 인트로 / 오프닝
- `[ ]` 시나리오 선택·아키타입 카드 이름/설명/시작아이템이 영어인가 (Ghost / Data Smuggler / Echo Collector).
- `[ ]` 부트 스플래시·온보딩 카피·세션 인트로(타이틀/본문/목표)가 영어인가.
- `[ ]` **오프닝 시네마틱 3컷**: 이미지가 깨지지 않고 뜨는가(전엔 EN에서 broken) + 컷 제목/본문 영어.
- `[ ]` 첫 서사(각성 장면)와 선택지가 자연스러운 영어인가(직역체·깨진 문장 없는가).

### K2. 헤더 / 상시 UI
- `[ ]` 브랜드 "World : Connect", 언어 토글이 "한국어"(EN에선 전환 대상 표시 — 의도됨), BGM/Disconnect 영어.
- `[ ]` 상단 플레이어 줄: 이름 · neo-seoul · **아키타입(Ghost)** 가 영어인가.
- `[ ]` 탭 이름(Story / Memory Constellation / Character / Skill Tree) 영어.

### K3. 서사 / 선택지 (매 턴)
- `[ ]` 각 턴 서사가 **영어로 생성**되고 품질이 한국어판과 비슷한가(빈약하거나 영어가 어색하지 않은가).
- `[ ]` 선택지 라벨이 영어 + 짧은 행동문인가.
- `[ ]` 선택 칩: 가치축(People/Relations·Safety/Stealth·Evidence/Truth·Control/Breakthrough) + intent(Interact/Explore…) 영어.
- `[ ]` "Predicted change: …" 예측문이 영어인가(전엔 "…쪽 결과가 커집니다" 한글).

### K4. Story 패널 (목표 / stakes / 결과)
- `[ ]` THIS ACT / CURRENT OBJECTIVE 본문이 영어인가(막 설명·목표).
- `[ ]` 상태 칩: premise(당신은…), "Loop stability: stable/critical", "Control-grid trace: low/high" 영어.
- `[ ]` LAST RESULT: "Success · Tension -5 · New flags …" 처럼 영어인가(전엔 "긴장도/새 플래그").
- `[!]` **알려진 잔여**: "Current point: <루트 제목>" — 접두는 영어인데 루트 제목이 한글로 남을 수 있음(확인용, 버그 보고는 화면+문자열).

### K5. 작전 지도 / 상태 게이지
- `[ ]` 작전 지도 노드 칩(Main Scene / Patrol / Clue / Combat / Event / Market / Maintenance) 영어.
- `[ ]` STATUS: ZONE RISK(Low/Medium/High/Critical), Location, 게이지 라벨 영어.

### K6. 전투 (전투 진입해서)
- `[ ]` PARTY/ENEMY 이름(Se-rin / Maintenance Drone …), TARGETS, ACTIONS(Attack/Defend/Wait/Flee) 영어.
- `[ ]` SKILLS 이름(Signal Step / Packet Shot …) + 스킬 칩(tags) 영어.
- `[ ]` 인카운터 배경 팝업: 이름(Patrol Ambush) + Background/Lesson/Victory reward 본문 영어.
- `[ ]` 전투 로그·적 등장 인트로 문장이 영어인가.

### K7. 스킬 트리 탭
- `[ ]` 스킬 이름 11종 + **설명/해금 문구**("Unlocked when…")가 전부 영어인가(라이브 검증: 한글 0).
- `[ ]` Rank/tier/range/cd, LOCKED, Upgrade, Next enhance 라벨 영어.

### K8. 캐릭터 탭
- `[ ]` 이름/역할/태그(Jung Se-rin · First Guide / Water Spider …), Aptitude · Ghost · Autonomy LV1 영어.
- `[ ]` ATTRIBUTES 칩([Ghost Signal] / [Silent Footsteps] …), STATS, INVENTORY(무기/아이템 이름) 영어.

### K9. 메모리 별자리 / 코덱스 / 엔딩
- `[ ]` ROUTE FLOW: 노드 제목/본문, "Current point …" 영어(루트 제목 잔여는 K4 참고).
- `[ ]` 엔딩 경향(Noble Sacrifice / Safe Refuge …) 제목+설명 영어.
- `[ ]` 코덱스/컷신 카드·요건 힌트 영어.
- `[ ]` 종료 화면 "왜 끝나는가" 서사가 영어로 납득되는가.

### K10. 알려진 잔여(검수 아님 — 참고만)
- glass-library(on-hold 2번째 시나리오)는 글로서리 없음 → EN에서 전투/데이터 한글. (필요 시 동일 방식 추가)
- "Current point: <route title>" 임베디드 루트 제목, session `_outcome` 일부 합성 결과의 깊은 케이스.
- 서브에이전트 번역 `月光호`→"the Moonlight"(린위에의 배) — 의도한 선박명인지 한 번 봐주기.

# Neo-Seoul Live QA Checklist

최종 갱신: 2026-07-02

`neo-seoul`을 직접 플레이하며 **체감으로만** 판단하는 항목. 자동 테스트/빌드/API 통과분은 제외하고
**사람이 확인할 것만** 남긴다. 발견은 해당 항목에 `[!]`+메모로 적어 피드백 주면 다음 세션에서 처리한다.

- `[ ]` 미확인 · `[~]` 일부 개선, 체감 재확인 · `[!]` 문제/설계 판단 필요

> **이미 자동검증됨(다시 안 봐도 됨)**: 막 목표 스트립·junction 행선지 의미·전투 배너 ⚑/🎁·soft
> defeat·오프닝 이미지 시퀀스·core_stake 노출·관계/컷씬 DB 영속(migration 006/007). 배선은 green이니
> **느낌만** 보면 된다.
>
> **▶ 바로 아래 "✅ 내가 확인할 것" 체크리스트가 사용자가 닫을 항목의 전부.** 상세 근거는 그 아래 A~K 절.
> A·F(KO 체감) 사인오프가 EN default flip 게이트다.

---

# ✅ 내가 확인할 것 (이 목록만 보면 됨)

> **서버:** `make api-stop && make api` → http://127.0.0.1:8000/ · **EN 검수**는 URL에 `?lang=en` 붙이거나
> 헤더 우측 언어토글을 EN. 직접 플레이하며 **체감으로 OK/NG만** 판단, NG면 그 줄에 메모. 상세 근거는
> 아래 동명 절(A·C·…·K). **여기 없는 건 안 봐도 됨**(자동검증/수정완료/개발트랙 → 맨 아래 "닫힘" 참고).

## 🆕 2026-07-02 라이브 검증 필요 (이번 세션 수정분 — 코드/회귀테스트 green, 실플레이 미확인)

> 이번 세션에 **IX 보스 climax 미발동 버그** + 3개 combat/route 버그 + **EN 중간 한글 leak**을 수정
> (`make check` 620 green, 커밋 `ebc7905`~`57a89e3`, **미배포**).
> **⚙️ 자동 라이브 검증 완료 (2026-07-02, 로컬 fallback API + HTTP 스캔, 무과금):** begin/choose/combat/
> skill-error/save-slots/memory/scenes 전 페이로드 EN 스캔 = **잔존 한글 0**. `/combat/begin ix_confrontation`
> 실호출 → blips = 플레이어+세린(아군)+**Administrator IX(보스)+Surveillance Drone+AI Incinerator(adds)** 확인.
> 이 과정에서 **IX 전투 한글 4건(무기명 최적화 빔 + 인카운터 배너 3필드) 추가 발견·수정**(`57a89e3`).
> **🌐 AGY 브라우저 QA 완료 (2026-07-02, `scripts/live-qa/run-agy.sh` probe/fallback, Chrome DevTools):**
> `PASS_CANDIDATE`(0 findings, git-invariant). 온보딩→오프닝→서사 2턴 실렌더 캡처 → 메인 화면 전체
> (헤더/탭/SCENE·THE FALL AND FIRST TRUST/CHARACTER WATER SPIDER·Jung Se-rin/OPERATION MAP 노드칩/
> STATUS 게이지/Save·Load/선택지 value-axis·intent·Predicted change) **EN 렌더 확인, 잔존 한글=`한국어` 토글뿐.**
> 스크린샷 `outputs/live-qa/20260702-033059-probe/screenshots/`. (probe 3체크포인트라 전투/보스/엔딩 미도달.)
> **아래 남은 건 사람/실플레이만** (체감·실엔딩·보스 route 실발동·팬텀루프).

### 보스/전투
- [x] **IX 보스 combat 빌드/EN** — `/combat/begin ix_confrontation` 라이브: IX+2 adds 정상 생성, 전투 로그·인카운터 배너 EN(스캔 0). (route 노드→전투 트리거는 회귀테스트 green.)
- [ ] **IX 보스전 route 실발동 (실플레이)** — 실제 작전지도 boss 노드까지 플레이해 진입 시 전투로 넘어가는가 (테스트 green, 실플레이 확인 권장).
- [ ] **보스전 체감** — 회복/엄호/일점사 요구·HP≤50% enrage 텔레그래프·파티 승산/솔로 난이도 (체감, 사람).
- [ ] **팬텀 전투 루프 없음** — 한 판 완주 중 같은 접촉이 매턴 반복 발동 안 되는가 (실플레이).

### EN 한글 leak 재검
- [x] **전투 씬/로그 EN** — 라이브 스캔 0(제목/목표/로그/무기명/인카운터 배너 포함). K6와 통합.
- [x] **세이브 슬롯 라벨** — 라이브 스캔 0.
- [x] **코덱스/로어 패널** — 라이브 스캔 0(로어 3항목 포함).
- [x] **스킬트리 에러 토스트** — 라이브 스캔 0(통찰부족/미해금 400 detail 영어).
- [ ] **종료화면 EN (자연엔딩 실렌더)** — 엔딩 제목/서사 글로서리 resolve 확인됨(localize_for), 실플레이 자연엔딩 스크린샷만 사람.
- [~] **온보딩/이미지 상태문** — AGY 브라우저 QA로 온보딩→메인화면 EN 실렌더 확인(잔존 한글 0). 단, 순간적 상태문("Connecting…/Resuming…")·이미지 플레이스홀더(fallback `image=0`)는 직접 캡처 안 됨 → 실루프 스팟만 남음.

## 🔴 1순위 — 코드 green, 라이브 체감 사인오프만 (KO로 1회 완주, ~30분이면 1·2순위 같이 닫힘)
- [ ] **A. 종료 "왜 끝나는가"** — 종료 화면에 추적도 *숫자* 말고 납득되는 *서사 코즈*가 뜨는가
- [ ] **F. 전투 직후 콜백** — 전투 끝난 *바로 다음 장면*이 여파·관리망 heat·동료 반응을 이어받아 시작하는가

## 🟡 2순위 — 느낌 판정 (같은 KO 완주 중 같이 체크)
- [ ] **C. 선택의 맛** — 선택 후 변화가 수치 아닌 *이야기*로 와닿나 / 실패·우회도 손해만 아니라 다른 정보·톤을 주나
- [ ] **D. 캐릭터 존재감** — 린위에(거래의 득&부채 동시) · 카이("기계도 기억하나" 테마) · 관리자 IX(선택을 정정하는 압력)
- [ ] **E. 전투 만족** — 추적·구출·보호의 *결과*로 느껴지나 / 중반 이후 타겟·방어타이밍·이동·스킬 중 하나를 요구하나
- [ ] **G. 진행/재플레이** — 게이지(안정/긴장/Decay/Risk/Clue)가 뭘 바꾸는지 와닿나 / 통찰·해금이 다음 판을 바꿀 것 같나
- [ ] **H. 엔딩 잔향** — 구한 것/잃은 것 선명 / 세린·린위에·카이 중 누구와의 관계가 남나 / "다시 다른 선택" 동기
- [ ] **I. 최종 판정** — 30~60분 안 끊기나 / 기억나는 장면 3개+ / 설명 없이 남에게 줘도 기본 재미 전달되나

## 🌐 3순위 — EN 검수 (남은 것만; `?lang=en`로 **새 루프** 시작해야 EN 서사가 나옴)
- [x] **K6. 전투 EN** — PARTY/적/액션/스킬/인카운터 팝업/보드/상태/결과배너 모두 EN 확인(2026-06-29). **전투 로그 프로즈**도 영어화 완료: 엔진/narrator가 활성 언어로 로그 생성(`mythos_combat/log_i18n.py`, `CombatState.language`), 이름은 경계 glossary로 번역 → "Maintenance Drone's Cleaver Blade hits K6Tester for 6." (API 라이브 검증, KO 보존). 커밋 `d37776b`.
- [x] **K9. 종료화면 EN (데이터/렌더 경로 무과금 검증, 2026-06-29)** — fallback EN 루프를 `archive()`로 종료 → 실제 서빙 경로(`snapshot_to_dict`+`localize_for`)로 만든 ended 스냅샷을 전수 스캔 = **잔존 한글 0**. `EndedPanel`은 서버 데이터(`ending_label`/`ending_id`/`ending_narration`)+i18n 라벨/사유만 사용, 하드코딩 한글 0. **남은 것**: *자연 엔딩 1루프*의 authored `ending_narration` 실렌더 스크린샷 — 배포 직전 사람 실플레이(Gemini)로 확인 권장(KO A·F 체감검수와 묶음).
- [ ] **번역 품질** — 전 구간 직역체/어색한 문장 없이 자연스러운가 (한글 잔존 0은 이미 확인됨, 이건 "자연스러움")
- [ ] **`月光호`→"the Moonlight"** (린위에의 배) — 의도한 선박명인지 한 번만 봐주기

---

> ### ✅ 이미 닫힘 — 안 봐도 됨
> - **J 호감도 게이지·컷신 갤러리** (에이전트 시각검증 완료, 2026-06-21)
> - **EN 잔존 한글 9건 전부 수정+재검증** (2026-06-28): K1 잠금힌트·K2 날짜·K3 축명·K4 chapter_goal/premise/루트제목·
>   K8 캐릭터 초상·K9 컷신 제목 → 전 화면 잔존 한글 = `한국어`(의도된 토글) 1건뿐. (`make check` 604 green, 미커밋)
> - 오프닝 이미지/시퀀스·목표 스트립·전투 배너 ⚑/🎁·soft defeat·관계/컷씬 DB 영속 등 (배선 green)
>
> ### ⚙️ 내 체크 아님 — 개발 트랙 (플레이로 못 닫음, 별도 프론트 작업)
> - **작전 지도 in-layer 선택지 ↔ route 노드 연결** (F절, 프론트+serializer) · **스킬트리 RPG 노드그래프 재설계** (G절)

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

> ### ▶ 2026-06-28 에이전트 EN 브라우저 QA 결과 (Playwright, 로컬 `make api`/Ollama, `?lang=en`)
> 신규 플레이어로 온보딩→오프닝 시네마틱→서사 2턴→탭(스킬트리/캐릭터/코덱스)을 EN으로 구동하며 각 화면
> innerText를 한글 스캔 + 스크린샷. **대부분 영어(서사·선택지·목표·상태·작전지도·스킬트리·코덱스 라우트/엔딩·
> 아키타입 'Ghost')는 통과.** 발견된 **잔존 한글 9건**(아래 `[!]`). 스크린샷·원시리포트:
> `scratchpad/shots/` (`03_opening_cinematic.png` 오프닝 PASS, `05_scene_turn1.png` 스토리 패널,
> `08_memory_codex.png` 코덱스, `report.json` 화면별 한글라인). 루트 원인은 §K 말미 "원인" 참고.
> **전투(K6)·종료화면(K9 마지막)은 이번 패스에서 미진입 → 미검증.** A·F(KO 체감) 및 번역 "품질"
> 판정은 여전히 사람 몫.
>
> ### ✅ 2026-06-28 후속 — 잔존 9건 + 상태문자열 클래스 전부 수정 (`make check` 604 green, 미커밋)
> 위 `[!]` 9건을 모두 처리하고, 재검증 결과 **모든 화면에서 잔존 한글 = `한국어`(의도된 언어토글) 1건뿐**.
> 추가로 상태/플레이스홀더/액션 문자열 클래스(전투·루프·resume·이미지생성 등)까지 i18n 키로 일괄 영어화.
> 코드: ① `localize.py` 글로서리-substring 폴백(`_glossary_substrings`, Hangul-가드, longest-first) →
> 임베디드 축명/루트제목 처리(#7·#8); ② `i18n/en.json` 글로서리 +8(chapter_goal 5·core_stake·컷신 2);
> ③ `app.py` `/scenarios`에 `localize_for` 일괄 적용(캐릭터·unlock_hint·스킬/인카운터/동료 이름, #3·#4);
> ④ `SaveHistoryPanel` 날짜 로케일 lang화(#6); ⑤ `strings.(ko|en).ts` 세션-상태/이미지 키 17개 신설 +
> `useNarrativeStream`/`useCombatRest`/`useSceneVisuals`/`useSessionLifecycle` `DICTS[getLang()]` 배선,
> `getLang(): "ko"|"en"`로 타입 강화. 테스트 +5(`test_localize` substring·신규엔트리, `test_api` `/scenarios` EN data).
> 재검증 스크린샷 동일 경로(`05_scene_turn1.png`=WATER SPIDER/Jung Se-rin/날짜 en-US, `08_memory_codex.png`=
> Flickering Trust/Echo of a Promise). 아래 `[!]` 항목은 `[x]`로 갱신. **남은 미검증=K6 전투·K9 종료화면(사람).**

### K1. 온보딩 / 인트로 / 오프닝
- `[x]` 시나리오 선택·아키타입 카드 이름이 영어인가 (Ghost / Data Smuggler / Echo Collector) — 카드 이름 PASS.
- `[x]` ~~아키타입 잠금 힌트가 한글~~ **수정됨**: `/scenarios`에 `localize_for` 적용 → "Unlocked once you
  archive the tutorial loop." / "Unlocked when you collect three clues in total." (`unlock_hint`는 이미
  글로서리에 있었고 엔드포인트가 미적용이던 게 원인).
- `[x]` **오프닝 시네마틱**: 이미지 안 깨지고 정상 렌더 + 제목/본문 영어 PASS — "First Connection — C-17
  Blackout" / "SHOT 01 // ARRIVAL · Se-rin finds you in the rain" / NOW·SOON·GOAL·AWAKEN 영어,
  Se-rin 이미지 정상. (`03_opening_cinematic.png`) ← `c6075e7` 수정 확인됨.
- `[x]` 첫 서사(각성 장면)·선택지 자연스러운 영어 PASS(직역체/깨진 문장 없음).

### K2. 헤더 / 상시 UI
- `[x]` 브랜드 "WORLD : CONNECT", 토글 "한국어"(의도됨), BGM ON / Disconnect 영어 PASS.
- `[x]` 상단 플레이어 줄: 이름 · neo-seoul · **Ghost** 영어 PASS.
- `[x]` 탭 이름(Story / Memory Constellation (Codex) / CHARACTER / SKILL TREE / Developer Console) 영어 PASS.
- `[x]` ~~세션 칩/세이브 목록 날짜가 한글 로케일~~ **수정됨**: `SaveHistoryPanel.localDate(value, lang)` →
  EN은 `en-US` (`6/28/2026, 20:39:34`). (`05_scene_turn1.png`)

### K3. 서사 / 선택지 (매 턴)
- `[x]` 각 턴 서사 **영어 생성** + 품질 양호 PASS(빈약/어색 없음).
- `[x]` 선택지 라벨 영어 + 짧은 행동문 PASS.
- `[x]` 선택 칩 가치축(People/Relations…) + intent(Interact) 영어 PASS(렌더).
  - `[x]` ~~choice `stakes` 합성 문자열 축명 한글~~ **수정됨**: 글로서리-substring 폴백으로 임베디드 축명도
    영어화 → `Value axis: Safety/Stealth` (API 재검증).
- `[x]` "Predicted change: …" 예측문 영어 PASS.

### K4. Story 패널 (목표 / stakes / 결과)
- `[x]` ~~THIS ACT 본문 한글(chapter_goal)~~ **수정됨**: 글로서리에 5개 phase player_goal 추가 → "Roam the
  welfare blocks and the Han River night market…". (CURRENT OBJECTIVE 본문은 원래 LLM 생성 EN.) (API 재검증)
- `[x]` ~~premise 칩 한글(core_stake)~~ **수정됨**: 글로서리에 core_stake 추가 → "You are an 'unregistered
  signal' on no roster. Administrator IX means to 'optimize' you…".
- `[x]` LAST RESULT 영어 PASS: "null · Stability −2 · Tension +10 · New flags se_rin_arrived"
  (※ 첫 줄 `null`은 action_result 미설정 — 비-로컬 사소 버그, 별건).
- `[x]` ~~"Current point: <루트 제목>" 루트제목 KO~~ **수정됨**: 글로서리-substring 폴백 →
  "Current point: The Fall and First Trust" (코덱스 ROUTE FLOW와 일치, API 재검증).

### K5. 작전 지도 / 상태 게이지
- `[x]` 작전 지도 노드 칩(Main Scene / Market / Event / Maintenance / Combat / Patrol) + "Undisclosed
  section" / "Current position → Pick a choice…" 영어 PASS.
- `[x]` STATUS: ZONE RISK(Low), Location(C-17 Neon Alley, Wet Concrete), STABILITY/TENSION/TEMPORAL
  DECAY/CLUE MATRIX 라벨 영어 PASS.

### K6. 전투 (전투 진입해서) — **미진입 → 라이브 미검증** (2026-07-02: 씬 제목/목표/전투 로그 fallback 글로서리 추가됨, 실렌더 확인 필요)
- `[ ]` PARTY/ENEMY 이름(Se-rin / Maintenance Drone …), TARGETS, ACTIONS(Attack/Defend/Wait/Flee) 영어.
- `[ ]` SKILLS 이름(Signal Step / Packet Shot …) + 스킬 칩(tags) 영어.
- `[ ]` 인카운터 배경 팝업: 이름(Patrol Ambush) + Background/Lesson/Victory reward 본문 영어.
- `[ ]` 전투 로그·적 등장 인트로 문장이 영어인가.

### K7. 스킬 트리 탭
- `[x]` 스킬 이름/설명/해금 문구 **한글 0** PASS — `players/{id}/skills?lang=en` 페이로드 한글 스캔 0건.
- `[~]` Rank/tier/range/cd/LOCKED/Upgrade 라벨 — 탭 렌더 시 글로벌 크롬 외 한글 없음(스킬 미보유 상태라
  카드 깊은 라벨까진 미세 확인). 

### K8. 캐릭터 탭
- `[x]` **CHARACTER 탭** 자체는 글로벌 크롬 외 한글 0 PASS(스캔).
- `[x]` ~~Story 패널 캐릭터 초상 카드 한글~~ **수정됨**: 초상은 `/scenarios` characters에서 오므로 거기에
  `localize_for` 적용 → `WATER SPIDER / Jung Se-rin / First Guide / Data Smuggler` (`05_scene_turn1.png`
  재검증; 이름/태그/역할은 이미 글로서리에 있었음).

### K9. 메모리 별자리 / 코덱스 / 엔딩
- `[x]` ROUTE FLOW 노드 제목/본문 영어 PASS("The Offered Hand — Se-rin's View" + 본문 EN), 엔딩 경향
  영어 PASS(Noble Sacrifice / Safe Refuge + 설명), WORLD ARCHIVE/ECHOES/PROGRESS/ARCHIVE 빈상태 문구 EN.
- `[x]` ~~컷신 갤러리 제목 한글~~ **수정됨**: 글로서리에 컷신 제목 2개 추가 → `Flickering Trust` /
  `Echo of a Promise` (`/memory`는 이미 `localize_for` 적용 중, 제목이 글로서리에 없던 게 원인.
  `08_memory_codex.png` 재검증).
- `[ ]` 종료 화면 "왜 끝나는가" 서사가 영어로 납득되는가 — **미진입(엔딩까지 안 감) → 미검증.** (2026-07-02: 엔딩 4종 제목+서사+임계-아카이브 서사 글로서리 추가됨 → 자연 엔딩 실렌더만 확인.)

### 원인 → 수정 (전부 처리 완료 2026-06-28, `make check` 604 green, 미커밋)
- **chapter_goal(K4)·core_stake(K4)·컷신 제목(K9)**: `load_scenario()`로 베이스 KO를 직접 읽고 글로서리에
  해당 저작 문장이 없던 게 원인 → `i18n/en.json` 글로서리에 5 chapter_goal + core_stake + 컷신 2 추가(exact-match).
- **archetype unlock_hint(K1)·캐릭터 초상 이름/태그/역할(K8)**: 문자열은 이미 글로서리에 있었으나 `/scenarios`
  엔드포인트가 `localize_for`를 안 거치던 게 원인 → `app.py /scenarios`에 boundary `localize_for` 일괄 적용
  (스킬/인카운터/동료 이름도 덤으로 영어화).
- **Story stakes 축명(K3)·Current point 루트제목(K4)**: 합성 문자열(`가치축:`/`현재 지점:` + 글로서리 키)에
  exact-match가 안 걸리던 게 원인 → `localize.py`에 **글로서리-substring 폴백**(`_glossary_substrings`,
  Hangul-가드+longest-first, no-exact-match 문자열에만) 추가. 동적 루트제목도 커버.
- **날짜 로케일(K2)**: `SaveHistoryPanel.localDate(value, lang)` → EN은 `en-US`.
- **(추가 발견) 상태/플레이스홀더/액션 문자열 클래스**: `장면 확정.`·`행동 처리 중…`·`루프 생성 · 스트리밍…`·
  `그림 생성 준비 중…`·`이어하기 완료.` 등 프론트 하드코딩 한글 → `strings.(ko|en).ts` 세션/이미지 키 17개 신설
  + `useNarrativeStream`/`useCombatRest`/`useSceneVisuals`/`useSessionLifecycle`에서 `DICTS[getLang()]` 배선,
  `getLang(): "ko"|"en"` 타입 강화. (DEV LOG `logToConsole`는 개발자용이라 그대로 — 의도됨.)
- 재검증: EN 전 화면 잔존 한글 = `한국어`(의도된 토글) 1건뿐. 테스트 +5(`test_localize`·`test_api`).

### K10. 알려진 잔여(검수 아님 — 참고만)
- glass-library(on-hold 2번째 시나리오)는 글로서리 없음 → EN에서 전투/데이터 한글. (필요 시 동일 방식 추가)
- ~~"Current point: <route title>" 임베디드 루트 제목~~ → **2026-06-28 글로서리-substring 폴백으로 해결.**
  session `_outcome` 일부 합성 결과의 깊은 케이스는 미확인(전투/엔딩 경유 시 재확인 필요).
- (2026-07-02) 전투 씬 문자열·엔딩 제목/서사·세이브 프리픽스·코덱스·validator/parser fallback·스킬 에러
  토스트는 이번에 글로서리/엔드포인트로 처리(코드 green). **glass-library는 여전히 글로서리 없음**(별도 EN 패스 필요).
- 서브에이전트 번역 `月光호`→"the Moonlight"(린위에의 배) — 의도한 선박명인지 한 번 봐주기.

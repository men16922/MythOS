# 엄폐(cover) 포즈 스프라이트 재생성 브리프 — 캐릭터별 개성 필수

1차 생성분(4d5b3be)은 오너가 **7장 전부 리젝**: 사실상 **같은 "웅크린 병사+육각 실드" 템플릿**이고
정체성이 뒤섞임(se-rin=플레이어 디자인 남성, kai=인간 남성(로봇이어야 함), lin-yue=카이의 로봇 바디,
tae-o=여성, su-ah=시그니처 마젠타 소실, han/player-noise=개성 없는 동일 템플릿).

## 재생성 대상 (7장 전부, 같은 경로에 덮어쓰기)

`resources/neo-seoul/characters/combat/<char>-cover.png` · RGBA **512×768** · **투명 배경** ·
각 캐릭터의 기존 5포즈 세트(-idle/-attack/-guard/-skill/-hit)와 **동일 렌더링 스타일**.

### 공통 규칙 (전 캐릭터)
- **생성 전에 그 캐릭터의 `-guard.png`와 `-idle.png`를 반드시 열어 보고, 이미지 생성 호출에 레퍼런스로 첨부**할 것.
- 포즈는 "낮게 웅크려 엄폐물/실드 뒤에 몸을 숨긴" 자세이되, **아래 캐릭터별 개성을 포즈·소품·실루엣에 반영**할 것. 7장이 같은 자세면 실패다.
- 실드의 **색과 형태는 그 캐릭터의 guard 스프라이트와 동일 계열**이어야 한다 (아래 명시).

### 캐릭터별 정체성 앵커

| char | 정본 외형 (scenario.json appearance) | 실드 | 개성 포즈 지시 |
|---|---|---|---|
| **se-rin** | young Korean woman mid-20s, **long straight black hair** with blunt bangs, sharp dark eyes, deep red lips, black leather jacket. **마스크 없음, 여성** | 청록/백색(시안) 홀로그램 | 긴 머리가 흘러내린 채 한쪽 무릎을 꿇고 SMG를 낮게 든 채 실드 가장자리 너머를 쏘아보는 — 민첩한 요원의 긴장감 |
| **kai** | **sleek white-and-silver humanoid android**, smooth pale faceplate, glowing eyes, slender graceful frame, exposed joint seams. **인간 아님 — 피부/머리카락 금지** | 청록(시안) 홀로그램 | 기계 관절이 접힌 우아하고 기하학적인 크라우치 — 사람과 다른, 정밀 기계의 정적 |
| **lin-yue** | elegant East-Asian woman, black hair in an **ornate updo with gold hairpins**, deep red lips, **ornate dark-teal robe embroidered with glowing gold circuitry**, jeweled rings. **병사 아님 — 소총 금지** | **금색(gold/amber)** 회로 문양 | 로브 자락이 바닥에 우아하게 퍼진 채 한쪽 무릎을 낮춘 자세, 반지 낀 손에서 금색 실드를 펼쳐 몸을 가리는 — 전투 중에도 기품 |
| **su-ah** | young East-Asian woman, black hair in a **loose messy bun**, **thin-rimmed glasses**, red lips, black techwear jacket with **glowing purple accents**, small earrings | **마젠타/보라** 홀로그램 | 몸을 작게 말고 앉아 한 손은 전개된 실드에, 다른 손은 장비/데이터패드 조작 — 전투원이라기보다 엔지니어의 엄폐 |
| **tae-o** | weathered East-Asian **man in his 40s**, short spiky black hair, **prominent scar on right cheek**, stubble, stern eyes, black tactical jacket + strapped combat vest. **남성, 중년, 다부진 체격** | **주황/적색** 홀로그램 | 큰 소총을 가슴에 붙이고 실드에 어깨를 단단히 붙인 저중심 자세 — 베테랑의 안정감 |
| **han** | young East-Asian man early 20s, **tousled messy black hair**, sharp intense eyes, clean-shaven, black **high-collar techwear jacket with cabling and a data harness** | 청록(시안) 홀로그램 | 한쪽 무릎만 낮춘 채 하네스의 케이블/휴대 장비를 쥐고 실드 모서리 너머로 고개만 내민 — 기민한 해커의 정찰 자세 |
| **player-noise** | (정본 = 기존 5포즈 세트) 짧은 검은 머리 청년, **하관을 덮는 페이스 마스크**, 초록 네온 회로가 흐르는 **롱코트** | **초록** 육각 홀로그램 | 코트 자락이 바닥에 깔리도록 깊게 앉아 소총을 낮춰 들고 실드 너머 정면을 응시 — 주인공다운 결의 |

### 작업 절차 (전량 폐기 금지 — 2026-07-12 1차 재생성이 1장 FAIL로 7장 전부를 버렸다)
1. 후보는 **반드시 `outputs/cover-pose-regen/`에 먼저 저장**한다 (FAIL이어도 삭제 금지 — 사람 검수 증거).
2. 셀프체크 **PASS인 장은 즉시 `resources/.../<char>-cover.png`로 승격**한다. FAIL인 장만 재생성한다 (장당 최대 2회 시도).
3. 재시도 후에도 FAIL로 남는 장은 그 장만 Blocker로 기록하고, **PASS 승격분은 정상 커밋**한다.

### 승격 전 셀프체크 (각 장마다 기록, FAIL이면 그 장만 재생성)
1. 성별/종족(인간·안드로이드)이 guard 스프라이트와 일치하는가?
2. 머리 모양·마스크 유무·안경·흉터 등 식별 특징이 일치하는가?
3. 실드 색이 위 표와 일치하는가?
4. 소품(무기 유무·종류)이 캐릭터에 맞는가? (lin-yue 소총 금지)
5. 포즈가 다른 캐릭터의 cover와 구별되는 개성을 갖는가? (**7장이 서로 같은 자세면 전체 실패**)

체크 결과는 `outputs/cover-pose-regen/review.md`에 7장×5항 표로 남길 것.

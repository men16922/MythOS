# Codex 작업 브리프 — 오프닝 인트로 카드 한국어 문장 다듬기

## 목표
`resources/neo-seoul/scenario.json`의 `ui_copy.session_intro_variants` 안 **오프닝 인트로 카드
문구(`title`/`body`/`rules`/`objective`)를 자연스러운 문학적 한국어로 다듬는다.** 현재 문구가
번역체·텔레그래프(단편+대시)처럼 읽혀 가독성/몰입을 해친다는 owner 피드백.

## 대상 변형 7종
`session_intro_variants`의 키: `se_rin`(기본격)·`han`·`kai`·`lin_yue`·`su_ah`·`tae_o`·`solo`.
각 변형마다 `title`, `body`, `rules`(3개), `objective`가 있음.

## 반드시 지킬 것
1. **손대는 필드**: `body`, `rules`, `objective`(만). 필요하면 `title`도 자연스럽게(선택).
2. **손대지 말 것**: `cinematic_shots`(샷 캡션 — 이미 자연스러움, 톤 기준으로 삼을 것)·`kicker`·
   `image`·`continue_button`·JSON 구조(각 변형 `rules`는 3개 유지).
3. **문체 규칙**:
   - "지금 —/곧 —/목표 —" 같은 **라벨+대시 텔레그래프 제거**, 완결된 자연스러운 문장으로.
   - 번역체·명사 나열·과도한 대시(—) 지양. 한국어로 소리 내어 읽어 어색하지 않게.
   - **톤 기준 = 같은 변형의 `cinematic_shots[].body`** (예: "고철과 폐가구의 선 너머, 커다란
     실루엣이 크고 느린 동작으로 순찰 반대편을 가리킨다. 아이 하나가 옷자락 뒤에서 당신을 훔쳐본다.")
     — 이 정도의 완결성·감각 묘사·자연스러움.
   - 세계관/사실은 각 변형의 디렉티브 `resources/neo-seoul/directives/opening_<variant>.md`를
     참고(장소·인물·필수 사건). 사실을 바꾸지 말고 **표현만** 자연화.
   - `rules` 3개는 여전히 "지금/곧/목표"(현재 위치 → 곧 일어날 일 → 해야 할 행동)의 정보 순서를
     암묵적으로 유지하되, 라벨 없이 문장으로.
4. **분량**: 카드가 짧게 읽혀야 하므로 `body` 1~2문장, 각 `rule` 1문장, `objective` 1문장 이내.

## tae_o는 샘플이 이미 커밋됨 (d5d4a64) — owner가 "아직 약간 애매"
현재 tae_o(참고용, 더 다듬어도 됨):
- body: "C-17에서 다시 눈을 뜬다. 지난 루프엔 없던 것이 앞을 가로막고 있다 — 관리망에 밀려난
  사람들이 폐자재를 쌓아 스스로 세운 바리케이드다."
- rules: ["복지 블록 초입, 주민 바리케이드 앞에서 다시 깨어난다.", "바리케이드 너머의 커다란
  실루엣이 수신호로 안전한 길을 알려 온다.", "순찰과 반대편으로, 들키지 않게 조용히 움직인다."]
7종 전부 같은 톤으로 일관되게(대시 남발 없이 더 매끄럽게) 다듬을 것.

## 완료 기준
- `python -c "import json; json.load(open('resources/neo-seoul/scenario.json'))"` OK
- `make validate-content` clean
- (구조 변경 없으니 `make check`도 green이어야 함)
- owner 톤 리뷰용이므로 7종 before→after를 한눈에 볼 수 있게 요약도 남길 것.

## 참고 파일
- 대상: `resources/neo-seoul/scenario.json` (`session_intro_variants`)
- 톤/사실 기준: `resources/neo-seoul/directives/opening_*.md`, 같은 카드의 `cinematic_shots`
- 문체 규칙(레지스터): 메모리 "narrative-register-rule" — 일반 장면=screenplay action-line이되
  **여기선 카드가 완결 문장으로 자연스러워야** 함(텔레그래프 금지).

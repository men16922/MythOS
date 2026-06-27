# EN/KO 로컬라이제이션 계획 (2026-06-27)

상태: 활성 설계(active) · 우선순위: **글로벌(영어) 우선** — `NEXT_PLAN.md` "Post-local ①" 트랙의 상세 설계.
선행조건: neo-seoul live-QA A·F 사인오프(`docs/test/neo_seoul_live_qa.md`). 후속: GCP 클로즈베타
(`docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`).

## 0. 결정 (확정)

- **영어 default, EN/KO 토글** — 공개 얼굴은 영어. 한국어는 dev/QA·국내 커뮤니티용으로 **병존 유지**.
- **풀 바이링궐(저작물 EN/KO 병존)** — directives/story_bible/fallbacks/scenario 산문을 양쪽 유지(유지비 2배 수용).
  단발 번역이 아니라 **상시 규칙**: 콘텐츠 추가 시 양쪽 채움.
- **착수 순서 = golden-path 우선** — 끝 상태는 풀 EN/KO지만, 영상 분량(오프닝~첫 전투~종료 1회 경로)을 먼저
  영어로 통하게 해 데모/녹화를 앞당긴다. 전체 백필은 그 뒤.
- **생성은 네이티브 영어** — KO를 영어로 후번역하지 않고, LLM이 처음부터 영어로 생성(언어 스위치).

## 1. 표면 맵 (2026-06-27 매핑, 4층 + 모델)

| 층 | 핵심 위치 | 분량 | seam | 난이도 |
|---|---|---|---|---|
| **A. 서사 생성 언어** | `prompts.py:23-33`(DEFAULT_SYSTEM_PROMPT)·`201-249`(STORY_SYSTEM_PROMPT)·`36-75`(JSON_CONTRACT 한국어 주석); `schemas.py:158`(`NarrativeContext.system_prompt`); `director.py:112-134` | ~500자 | ✓ `system_prompt` 필드 옆 `language` 추가 | **작음** |
| **B. 저작 콘텐츠** | `resources/neo-seoul/directives/*.md`(214줄: opening/fallback/naming/stat_voices/encounters)·`scenario.json`(1562줄 중 산문 ~800)·`story_bible/bible.json`(403줄)·`fallbacks.py:24-68` | ~15,000자 | ✓ 로더가 `*.{lang}.md` 분기 | **큼** |
| **C. UI 크롬** | `App.tsx`·`GameAside.tsx`·`StoryPanel.tsx`·`OnboardingPanel.tsx` + 6개. i18n 프레임워크 **없음**, 하드코딩 | ~150-200 문자열 | ✗ 없음(신설) | **중간** |
| **D. 고정 텍스트** | `codex.py:17-39`(NEO_SEOUL_LORE)·`directives/companions/se_rin.md`·`scenario.json` cinematic_shots | ~1,500자 | ◑ codex=dict화 / 컷씬=EN 변형 | **작음~중간** |
| **모델** | `.env.example:12-17`·`DECISIONS.md:99-114` — gemma4:latest는 **한국어 산문 품질**로 선택 | — | — | eval만 |

## 2. 아키텍처 (언어 스레딩 + 파일 규약)

### 2.1 언어 전파 경로 (A층)
`lang`을 런타임 끝→끝으로 흘린다: **API 요청/세션** → `RuntimeSessionService` → `NarrativeDirector` →
`NarrativeContext.language`(신규, default `"ko"`이지만 앱 기본은 `"en"`) → `prompts._system_prompt()`가
`language`로 EN/KO system prompt 쌍 + `JSON_CONTRACT` 변형 선택. 파서(qwen2.5:3b)는 구조만 — 언어 무관.
- 신규: `NarrativeContext.language: str` (`schemas.py:158` 옆).
- `prompts.py`: `STORY_SYSTEM_PROMPT_EN`/`_KO`, `JSON_CONTRACT_EN`/`_KO`, `DEFAULT_SYSTEM_PROMPT_EN`/`_KO` 쌍 +
  `_system_prompt(context)`가 `context.language`로 분기.
- 세션/엔진/API에 `language` 파라미터 추가(영속: 루프 state 또는 player profile에 `language` 저장 → resume 시 유지).

### 2.2 저작물 파일 규약 (B·D층) — **권고: 사이드카 분리**
- **directives**: `opening.md` → `opening.en.md` / `opening.ko.md`. `scenario_directives.load_scenario_directives()`
  (lru_cached)가 `language` 인자로 `*.{lang}.md` 우선 로드, 없으면 `.ko.md` fallback. 캐시 키에 `language` 포함.
- **scenario.json / bible.json**: 구조(전투 스탯·flags·route·이미지 경로)와 산문이 섞여 있어 **통째 복제는 비권장**.
  - **권고안**: 산문만 분리한 사이드카 로케일 파일 `resources/neo-seoul/i18n/{en,ko}.json`(논리 키→문자열).
    `scenario.json`은 구조 + 키 유지, 로더가 `language`로 산문을 머지. 구조 중복 0, 유지 지점 명확.
  - **대안**: 산문 필드에 `name`/`name_en` 인라인 접미사. 구현 빠르나 1562줄에 접미사 산재 → 유지성 악화.
  - → **확정: SIDECAR 채택** (2026-06-27 워크플로 judge, 인라인 기각). 상세·근거·리스크는 §7.2.
- **fallbacks.py**: `DEFAULT_FALLBACK` → `DEFAULT_FALLBACK_BY_LANG["en"|"ko"]`. director + parser-repair 공용이라
  단일 출처 유지.
- **codex.py**: `NEO_SEOUL_LORE` → `NEO_SEOUL_LORE_BY_LANG["en"|"ko"]`.
- **companions/se_rin.md** 등 컷씬: `*.en.md`/`*.ko.md`.

### 2.3 UI i18n (C층) — **권고: 경량 자체 구현**
- 프레임워크(i18next) 대신 `src/i18n/strings.{en,ko}.ts`(키→문자열) + 작은 `useLang()` 훅 + `t(key)` 헬퍼.
  번들 오버헤드 0, ~200 문자열 규모엔 충분. 앱 부트스트랩에서 localStorage/URL param/브라우저 lang으로 init.
- 하드코딩 문자열을 `t("...")`로 치환(기계적, 80+ 파일 터치). golden-path 화면 먼저.
- 서버가 생성한 서사 텍스트는 i18n 대상 **아님**(LLM이 이미 언어 맞춰 생성) — UI 크롬만 대상.

### 2.4 모델 (eval)
gemma4:latest는 한국어 산문으로 선택됨. 영어 산문 품질 head-to-head 필요(같은 장면 프롬프트로 EN 생성 비교).
- 토글 메커니즘은 모델과 무관 — EN 품질 미달 시 `OLLAMA_MODEL_STORY_EN` 같은 **언어별 모델 선택**만 추가.
- 후보: gemma4:latest(그대로)·qwen3:8b·hermes3:8b·gpt-oss 등 로컬 보유분으로 비교.

## 3. 슬라이스 (MVP-first → 백필)

- `[x]` **S0 언어 배관(A 토대)** — **완료(2026-06-27, make check green/526 tests)**: `NarrativeContext.language` 추가 + `RuntimeOptions.language` → 세션 2개 호출부 → `build_runtime_narrative_context` → context 전파 + `prompts._story_system_prompt(context)` seam(하드코딩 STORY_SYSTEM_PROMPT 제거, §7.1 보정). 행동 보존 위해 **default `ko`**(S1에서 EN 콘텐츠와 함께 `en`으로 플립). 테스트 `tests/test_language_plumbing.py`(6). **잔여(S1로 이월)**: API/UI 언어 선택 + 루프/플레이어 state 영속.
- `[ ]` **S1 영어 생성(A)**: EN system prompt + `JSON_CONTRACT_EN` + `DEFAULT_FALLBACK_BY_LANG["en"]`.
  완료기준: 영어 모드 fallback/스모크가 영어 산출(narrative-smoke-fallback 영어), `make check` green.
- `[ ]` **S2 golden-path 저작물 EN(B)**: `opening.en.md`·`fallback.en.md` + 로더 lang 분기 + (구조 분기 결정 후)
  scenario/bible golden-path 산문 EN. 완료기준: 오프닝~첫 전투~종료 경로가 영어 저작물로 통함.
- `[ ]` **S3 UI i18n 스캐폴드 + golden-path 화면(C)**: `strings.{en,ko}.ts` + `t()` + golden-path 컴포넌트 치환.
  완료기준: 온보딩~플레이~종료 화면 UI 영어, `make frontend-build` green.
- `[ ]` **→ 여기서 영어 플레이 가능 (GCP 클로즈베타 착수 지점 — `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`; 녹화는 모집 티저 보조)**
- `[ ]` **S4 전체 백필(B·C·D)**: 나머지 directives/scenario/bible/codex/컷씬 EN + 남은 UI 문자열 전부.
  완료기준: 파리티 게이트(아래) green.
- `[ ]` **S5 모델 eval + 불변식**: EN 산문 head-to-head 기록(DECISIONS) + 파리티 테스트 락인.

## 4. 테스트 / 불변식 (`[auto]` 후보)

- **로케일 파리티 게이트**: 모든 `*.ko.md`에 대응 `*.en.md` 존재 + `i18n/en.json`·`ko.json` 키 집합 일치 +
  `strings.en.ts`·`strings.ko.ts` 키 일치. 누락 시 red. (content-integrity 계열, `tests/test_content_integrity.py` 확장)
- **언어 전파 단위테스트**: `language="en"` → director가 EN system prompt 선택(프롬프트 문자열 assert).
- **스모크**: `narrative-smoke-fallback`을 lang 파라미터화(영어 fallback 경로).

## 5. DECISIONS에 기록할 항목 (착수 시)

- 영어-우선 + 풀 바이링궐 제품 방향(되돌리기 비용 큼).
- scenario/bible 로컬라이제이션 구조(사이드카 i18n.json vs 인라인 접미사) — §2.2 사인오프 결과.
- (해당 시) 언어별 스토리텔러 모델 분기.

## 6. 교차 참조
- 상위 우선순위: `docs/NEXT_PLAN.md` "Post-local — 글로벌(영어) 우선".
- 피드백 전략(후속): `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md` (GCP 클로즈베타 + r/playtesters).
- 프롬프트 레이어 구조: `docs/PROMPT_LAYER.md`(directives 외부화 규약).
- 모델 결정 근거: `docs/DECISIONS.md:99-114`, `.env.example:12-17`.

## 7. 검증 결과 / 결정 락 (2026-06-27 워크플로)

4층 + 모델을 코드/리소스 대조로 검증하고 구조 분기를 확정한다. 원맵 §1 표면 맵의 **좌표는 정확하나 분량/난이도가 전반적으로 과소추정**되었음을 보정한다.

### 7.1 검증된 진짜 표면 (보정)

| 층 | 원맵 추정 | 검증 실측 | 보정 난이도 |
|---|---|---|---|
| **A. 서사 생성** | ~500자, seam "깨끗", 작음 | seam 불완전: dual-model 경로 STORY_SYSTEM_PROMPT가 `prompts.py:254/264`에서 하드코딩 주입(context 미참조). `OPENING_FIRST_SCENE_INSTRUCTION`(86-97) 한국어 누락 | **작음→중간** |
| **B. 저작 콘텐츠** | ~15,000자, 시나리오 1종 | **40,000자+** (양언어 ~80KB). **시나리오 2종**(neo-seoul + glass-library). 로더 `*.{lang}.md` 분기 0% 구현 | 분기 자체 작음~중간 / **백필 큼~매우 큼** |
| **C. UI 크롬** | ~10파일 / 150-200문자열, 중간 | **32파일 / 476줄**. **hooks/*.ts 통째 누락**(useAudio·useCombatCinema·useGameSocket·useSceneVisuals). 범위=`**/*.{tsx,ts}` | **큼 (LARGE-PLUS)** |
| **D. 고정 텍스트** | ~1,500자, 작음~중간 | **8,500자+** (5-6배). fallbacks.py·combat/narrator.py·combat/engine.py(40+ 로그)·factory.py 누락 | **중간→큼** |
| **모델** | gemma4 EN eval 필요 | eval 완료(아래 §7.4) | 결정 락 |

### 7.2 구조 분기 결정 락 — **SIDECAR 확정** (§2.2 사인오프)

- scenario.json / bible.json = **순수 구조 + 안정 논리키**로 단일 소싱. 모든 플레이어향 문자열은 `resources/<scenario>/i18n/{en,ko}/<section>.json`(섹션 샤딩)으로 분리.
- 로더가 `json.load` 직후·`ScenarioConfig`/`StoryBible` 빌드 전에 활성 언어를 머지. `lang`은 **ContextVar(default `en`)**로 스레딩 → 30개 `load_scenario` + 1개 `load_story_bible` 호출부 무수정. `lru_cache` 키를 `(scenario_id, lang)`로 확장 + `maxsize` 상향.
- 인라인 접미사(런너업)는 머지충돌 최악 + 미등록 prose 필드가 번역·파리티 양쪽 silent 회피 구멍 → **기각**.
- 그래프트: 추출 매니페스트(=prose 경로 레지스트리)로 coverage/orphan 가드 구동, EN 부재 시 KO 그레이스풀 폴백 + **CI hard-fail 파리티**, 언어 종속 구조(autonomy keywords)는 별도 재귀 leaf 가드.

### 7.3 directives / fallbacks / codex 규약 (§2.2 유지)
- directives·컷씬: `*.en.md` / `*.ko.md`, 로더 `language` 인자 분기(미구현 → 신설), 캐시 키 lang 포함.
- `fallbacks.py` `DEFAULT_FALLBACK_BY_LANG`, `codex.py` `NEO_SEOUL_LORE_BY_LANG`, `scenario_context.py` 코드 폴백(NAMING_RULE/STAT_VOICES/ENCOUNTERS)·`parser.py:219-226` 사운드 폴백도 양언어화(directives와 동기화).

### 7.4 모델 결정 락
- **default = gemma4:latest** (KO/글로벌, 플래그 불요, EN 산문도 수용 가능하나 120-160단어 미준수·220토큰 truncation).
- **EN 전용 = qwen3:8b + `think:false`(/no_think) 강제**. 일관성·완결성·단어예산 우위. ⚠️ **통합 게이트**: provider가 `think:false` 미설정 시 qwen3가 빈 response로 **silent fail**.
- 메커니즘: `OLLAMA_MODEL_STORY_EN` 언어별 모델 선택 추가(토글 무관). DECISIONS에 head-to-head 기록.
- **⚠ 범위**: §7.4의 gemma4/qwen3 결정은 **로컬 dev/QA 한정**. 클라우드 클로즈베타·제품 서사는 **Gemini provider(Vertex controlled generation, 3b 파서 제거)**로 서비스 — 로컬 LLM은 dev 환경일 뿐(제품 정체성 아님). `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`·`GCP_PLAN.md`·`CAREER_STRATEGY.md` §5.

### 7.5 보정에 따른 신규 작업 (체크리스트)

- [ ] **A**: `STORY_SYSTEM_PROMPT` 메시지빌더(`prompts.py:254/264`)를 `context.language` 참조하도록 리팩터 + `OPENING_FIRST_SCENE_INSTRUCTION` 언어 변형.
- [ ] **B**: glass-library 시나리오(scenario.json 114줄 + bible 58줄)도 i18n sidecar + 양언어 백필 — 시나리오 2종 모두.
- [x] **B/선행리스크**: 조인키 ID 마이그레이션 — **완료(2026-06-27, make check green)**. archetypes/characters에 안정 `id` + combat 딕셔너리 id 재키잉 + `resolve_archetype_id`/`_ARCHETYPE_ALIASES`(레거시 이름 read-time 정규화, DB 마이그레이션 불요) + 클라이언트 id 전송 + `tests/test_archetype_id_migration.py`.
- [ ] **B**: `autonomy_config.keywords`(거부/보호/해독/변조)는 언어 종속 로직 → 언어별 키워드 테이블(엄격 1:1 파리티에서 제외).
- [ ] **B**: id 없는 prose 배열(ui_copy.signal_lines/boot_lines/intro_lines, cinematic_shots, node_types.titles)은 로더에서 해소 + orphan/coverage 가드 CI 필수(BootIntro/IntroPanel로 흐름).
- [ ] **C**: 추출 범위를 `src/mythos_ui/src/**/*.{tsx,ts}`(hooks 포함)로 확장. 정규식/enum에 섞인 한국어(오디오·스킬 패턴)는 언어별 테이블로 분리.
- [ ] **D**: combat 패키지(narrator.py·engine.py 40+ 로그·factory.py 폴백) + fallbacks.py + scenario_context/parser 폴백 양언어화.
- [ ] **테스트**: 파리티 게이트를 키셋 일치 + gap/orphan + no-empty + CI hard-fail로 격상(`tests/test_content_integrity.py` 확장).

### 7.6 분량 재합산
코드 seam(A/D 경로) 중간 · 저작물 백필(B 양언어 ~80KB) 매우 큼 · UI(C 32파일/476줄) 큼. **golden-path-first 슬라이싱은 유효** — 데모/녹화를 전체 백필 전에 가능케 함.

### 7.7 Open risks (착수 전 인지)
- **조인키 ID 마이그레이션은 실질 리팩터** — 한국어 display명이 전투 조인키로 쓰여 EN-default가 display를 바꾸면 전투가 깨짐. 안정 ID + 조인부 재배선 + 전투 테스트 fallout 예산을 벌크 추출 **전에** 착수.
- **id 없는 prose 배열의 인덱스/자연키 주소**는 배열 reorder 시 번역 silent 오정렬 → orphan/coverage 가드가 CI에서 load-bearing.
- **추출 매니페스트 false-positive** — concept_map 키·character_map 이미지 경로는 prose 아님(머신 식별자/경로 비번역). 미분류 string triage assertion 필요.
- **qwen3 think:false 미설정 silent fail** — provider 레벨 강제 + 빈 response 감지 가드 없으면 EN 생성 조용히 깨짐.
- **로더 신규 실패모드 정책**(키 누락/빈값: hard-fail vs cross-lang fallback) + `(scenario_id, lang)` 캐시 cardinality → maxsize/ContextVar 미적용 시 30개 호출부 편집 필요.
- **한국어 저작 ergonomics 퇴행** — prose가 제자리에서 안 읽힘(프로젝트 한국어-저작 규칙과 충돌). 섹션 샤딩 + 머지 뷰 도구로 완화.
- **scenario_context.py 코드 폴백이 directives 미러** — 양언어화 시 두 출처 동기화 부담(단일 출처화 검토).
- **전체 백필 분량이 원맵의 ~3-5배** → golden-path 이후 S4 백필 일정 재산정(단일 스프린트 과소계획 위험).

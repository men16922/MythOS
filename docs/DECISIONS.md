# Decision Log

이 문서는 되돌리기 어렵거나 이후 구현 방향에 영향을 주는 결정을 기록한다. 최신 항목을 위에 추가한다.

## 2026-06-16 — Prompt Layer 분리 (코드↔프롬프트, scenario별 `directives/*.md`)

Decision: 서사 파이프라인의 **authored 지시문 prose**(오프닝 비트·fallback 장면·naming/stat/encounter·컷씬)를 범용 엔진 코드에서 분리해 **`resources/<scenario>/directives/*.md`(Markdown)** 로 둔다. 로더 `scenario_directives.py`는 `story_bible.py` 패턴(sibling 파일 + `lru_cache`)을 미러. 코드에는 **불변 로직만 STAY**(게이팅·`session_synopsis` 전량 채널·`MAX_PROMPT_NOTES` 트렁케이션·route 어셈블리·shot 해석). 블록은 **노드-주소 지정**(`turn=`/`node=`/`beat=`)으로 오프닝·앵커·컷씬 잠금을 균일 적용.

Reason: 지시문 1줄 튜닝에 로직 코드(`scenario_context.py`)를 헤집어야 했고, neo-seoul prose가 generic 엔진에 하드코딩돼 검색·시나리오 이식·8B 잠금 확장이 모두 막혀 있었다. 긴 한국어 prose는 JSON보다 Markdown이 편집/검색에 유리(사용자 결정). scenario.json은 구조 데이터 전용으로 유지(prose 미혼입).

Impact: `scenario_context.py`가 제네릭 어셈블러가 됨(neo-seoul 리터럴 0 지향). director/parser fallback은 `fallbacks.py` 단일 소스 + `NarrativeContext.fallback_scene` override. 신규 시나리오는 `directives/` 폴더만 추가하면 됨(없으면 graceful empty). 동료 호감도 컷씬은 이 인프라(노드-주소 지정 directive 노드) 위에 얹힌다. 진행: Phase 0-2 완료, 3-5 잔여. 설계 `docs/PROMPT_LAYER.md`.

## 2026-06-14 — Engineering 문서 바이블↔해석 구조 + Resume Pointer 연속성

Decision: ① 에이전트 운영 하네스 지식을 `docs/engineering/` 5개 개념으로 정의하되 **바이블↔해석 2층**으로 나눈다 —
범용 바이블(`{HARNESS,LOOP,AGENTIC,CONTEXT,PROMPT}_ENGINEERING.md`, repo 무관·portable) + `mythos/` 해석(이 repo 매핑).
옛 `docs/{LOOP_ENGINEERING,MULTI_AGENT}.md`→`mythos/{LOOP,AGENTIC}.md` 이동. ② 사용자 리서치(`HARNESS_RESEARCH`·`AI_REARCH`)는
**개념만 흡수**(원시는 `bin/docs/archive/`). ③ **Resume Pointer 컨벤션**: 세션 plan-only/미완 시 `AGENT_BRIEF` 최상단
`▶ NEXT SESSION` 한 줄(in-repo 플랜 경로 + 첫 행동) + 권위 active focus 3진입문서 일치. 플랜은 repo 안에만(`~/.claude/plans/*` 금지).
④ overnight 구조화 로깅 `logs/status.tsv` + `make overnight-dashboard`(tmux).

Reason: 지식이 79개 md 에 흩어져 HARNESS/LOOP/AGENTIC/CONTEXT/PROMPT 개념이 미정의였고, 진입점 3종이 발산했다.
바이블↔해석은 개념을 다른 프로젝트로 가져가게(portable) 하면서 repo 매핑을 분리한다. Resume Pointer 는 지난 plan-only
세션이 `/sync` 로 안 이어진 회귀(서두 노트 + 스크래치 경로 → 권위 focus 아님)를 구조적으로 막는다.

Impact: 운영 권위는 `docs/engineering/mythos/*`(루프=`mythos/LOOP.md`, 멀티에이전트=`mythos/AGENTIC.md`), 개념은 바이블.
연속성 규칙은 `DOCS_POLICY.md` "Dated Plans" + sync/checkpoint SKILL 에 명문화. 새 룰엔 제거 조건을 단다(Progressive Deletability).

## 2026-06-14 — skills git 추적 전환 + 3엔진 병렬 Model B

Decision: ① 에이전트 skills(sync/checkpoint/tidy-docs/overnight-report)를 **git 추적**으로 전환 —
`.claude/.agents/.codex/.gemini` 4곳에 복제, `.gitignore`는 `<dir>/*` + `!<dir>/skills/`. 더는 gitignore+symlink
하지 않는다. ② 3엔진(claude/codex/agy) 병렬은 **worktree 격리(Model B)**: 코드 레인은 worktree 자체
venv+node_modules(`make overnight-worktrees-setup`), 이미지/문서 레인은 자체 env 불요. 코드 레인을 메인 순차로 돌리는 Model A 도 대안.

Reason: skills 가 gitignore+symlink 였던 탓에 worktree symlink 가 추적 커밋되고 머지 checkout churn 이 메인
skills 를 삭제(데이터 손실 → 트랜스크립트 복구). 추적하면 모든 worktree 가 checkout 으로 자연 보유 + 영구 복구.
`.venv`/`node_modules` symlink 는 editable false-green/EPERM 으로 게이트를 깨므로 per-worktree env 가 정답.

Impact: **skills 재-ignore 금지**(메모리 `skills-are-git-tracked`). worktree 는 skills symlink 안 함
(`worktrees.sh` LINK_DIRS=""). 운영/검증 권위 `docs/engineering/mythos/AGENTIC.md`, 블루프린트 `docs/research/AI_TEAM_BLUEPRINT.md`.

## 2026-06-11

### 스토리텔러 모델 26B → 8B(gemma4:latest) 전환 (이 머신: 48GB)

Decision: 기본 스토리텔러(`OLLAMA_MODEL_STORY`)를 `gemma4:26b`에서 **`gemma4:latest`(8B, 9.6GB)**로
되돌린다(`.env`/`.env.example`). 파서는 `qwen2.5:3b-instruct` 유지.

Reason: 이 개발 머신은 물리 RAM이 **48GB**다(이전 문서의 "64GB Mac Pro" 가정은 오류 — `hw.memsize`로
확정). 26B(18GB) + KV + 매 턴 FLUX 이미지(수 GB) + macOS/Chrome/Docker가 48GB를 초과해 스왑이 포화
(`free_swap≈0`)되고, 26B 가중치가 페이지아웃→페이지인되며 TTFT가 13초에서 **40~127초**로 폭발했다.
동일 장면 프롬프트 head-to-head 결과 **8B의 한국어 사이버-신화 산문 품질이 26B와 경쟁력 있고**(오히려
더 상세한 경우도), **warm TTFT는 26초→9~10초**, 9.6GB라 RAM에 상주해 FLUX와도 공존한다. 또한 라이브
스트리밍 경로는 스토리 모델 출력을 **정규식(`parse_story_text`)으로 파싱**하므로, 26B를 택했던 원래 이유
(JSON 문법 붕괴 방지)는 스토리 모델에 더는 해당하지 않는다.

Impact: 48GB에서 스왑/thrashing 없이 텍스트가 빨라지고 이미지와 공존 가능. 위 2026-06-10 항목들의
"TTFT 11.1초/15초 내", "OLLAMA_MAX_LOADED_MODELS=2로 26B+8B 동시 상주" 권고는 **이 머신에선 무효**
(64GB+ 머신에서만 26B 권장). 되돌리려면 `OLLAMA_MODEL_STORY=gemma4:26b`.

### 후속 턴 prefill 캐시 + 세션 시놉시스 전용화 + 장면/선택지 품질

Decision: STORY 프롬프트의 `STATIC CONTEXT`를 player 신원만으로 축소(타임스탬프 제거)하고 매 턴 누적되는
`narrative_shards`·`world_memories`를 동적 하단으로 이동. 세션 시놉시스(직전 장면 원문+반복금지)를
`NarrativeContext.session_synopsis` 전용 필드로 분리해 truncation 없이 전량 주입. 스토리 `num_predict`
512→2048, 선택지 "2-3개 강제", route 현재-노드 안내를 `turn_index>=1`부터 주입.

Reason: (1) shards/world_memories가 STATIC에 있어 매 턴 prefix 캐시가 깨져 후속 턴이 30초+였다. (2) 세션
시놉시스가 `novelty_notes[-8]` truncation에 드롭돼 직전 장면/반복금지 지침이 모델에 안 닿아 반복이 발생했다.
(3) num_predict 512가 [SCENE] 뒤 [CHOICES]를 잘라 선택지 1개로 보였다. (4) route 안내가 turn>=3부터라
mandatory layer-0 앵커(neo-seoul "추락과 첫 신뢰"=세린 첫 신뢰)가 오프닝 직후 누락됐다.

Impact: 후속 턴 prefix 캐시 유지(정적 프리픽스 byte-동일 검증), 연속성/반복 억제 작동, 장면 2-3문단·선택지
2-3개, 세린 조우가 턴 1부터 서술. `make test` 285 green.

## 2026-06-10

### Prefix KV 캐싱 고도화 — memories/novelty_notes 동적 영역 이동

Decision: 26B 스토리텔러 모델용 프롬프트 생성 시, 매 턴 내용이 갱신되거나 밀려나며 무효화(Invalidate)를 일으켰던 `memories`(최근 4개 장면)와 `novelty_notes`(롤링 시놉시스 등 다이렉티브)를 상단 `STATIC CONTEXT`에서 맨 하단의 `DYNAMIC CURRENT TURN STATE`로 재배치한다.

Reason: Ollama의 Prefix Caching은 프롬프트의 접두사(Prefix)가 완벽히 일치해야만 캐시를 재사용(Prefill 스킵)할 수 있다. 이전 구조에서는 매 턴 갱신되는 `memories`가 STATIC 영역 중간에 섞여 있어, 1턴마다 Prefix 캐시가 완전히 무효화되어 매번 1.2만 토큰을 처음부터 다시 prefill(Prompt evaluation)하는 30초 대의 큰 지연이 있었다. 이를 완벽하게 동적 영역(하단)으로 격리함으로써 상단 고정 영역의 Prefix 캐시 히트율을 100%로 유도한다.

Impact: 2턴 이후부터 Warm 상태의 Ollama Prefill 연산이 대부분 스킵되어, 첫 토큰 지연 시간(TTFT)이 26.0초에서 11.1초로 약 60% 단축되었고 실시간 플레이 중 텍스트 스트리밍 응답성이 크게 극대화되었다.

### 이원화(Dual-Model) 오케스트레이션 최적화 — VRAM 스왑 방지 및 Ollama 병렬 적재 권장

Decision: 26B 스토리텔러와 8B 파서 모델을 병용하는 이원화 서사 모드에서 백그라운드 웜업(Warm-up) 스레드를 제거하여 순차 실행으로 복원하고, 파서의 `response_format`을 `json_schema`에서 `json_object`로 변경하여 문법 제약(Grammar Masking) 오버헤드를 제거한다. 64GB 이상 Mac Pro 환경에서 2개 모델 동시 상주를 위해 Ollama 기동 시 환경변수 `OLLAMA_MAX_LOADED_MODELS=2` 및 `OLLAMA_NUM_PARALLEL=2`를 설정할 것을 강력 권장한다.

Reason: Ollama의 기본 동시 모델 적재 제한(`OLLAMA_MAX_LOADED_MODELS=1`) 상태에서는 백그라운드로 파서를 사전 로드하려고 할 때 26B와 8B 모델이 VRAM 내에서 수차례 번갈아 가며 언로드/로드(VRAM Swapping Thrashing)되어 전체 지연 시간이 80초 이상으로 증폭되는 병목이 발견되었다. 또한 `json_schema`는 문법 규칙을 매 토큰마다 실시간 검증하느라 8B 추론 시간을 수십 초로 늘렸다. 웜업 스레드를 걷어내고 `json_object`를 도입하여 오버헤드를 지우는 한편, 환경변수를 통해 두 모델을 VRAM에 동시 상주시키면 모델 스왑 코스트가 0초가 되어 26B 생성 및 8B 파싱 전체 과정이 15초 이내로 기적같이 단축된다.

Impact: `director.py`에서 `_warm_up_parser_async`를 걷어냈고 파서는 `json_object` 모드로 전환하여 API 안전성을 보장한다. 사용자는 `ollama serve` 기동 시 혹은 launchd 설정에 해당 환경변수를 주입해야 100% 최적화 성능을 누릴 수 있다.

### 동적 작전 지도(route map) — seed 결정론 재현성 포기

Decision: 작전 지도를 "루프 시작 시 전체 DAG를 seed 결정론으로 완성"하던 모델에서, **backbone seed +
진행 중 동적 성장** 모델로 전환한다(`route_map.mode == "dynamic"`). 시작 시에는 anchor 골격과 앞
`horizon`(기본 2) 레이어만 깔고(`build_route_seed`), 플레이어가 전진하면 `route_growth.extend_route`가
다음 레이어를 **LLM 제안(`world_delta.route_nodes`, 타입 제약+자유 서술) + authored pool 폴백**으로
채운다. 그 결과 **같은 seed라도 rerun 시 동일 노드를 보장하지 않는다**(기존 `route_map.py`의 결정론
철학을 dynamic 모드에서 폐기). legacy 정적 모드(`build_route_map`)는 mode 미지정 시나리오용으로 유지.

Reason: 2026-06-10 사람 플레이 QA에서 "선택해도 스토리가 안 바뀐다 / 어느 루트로 가는지 모르겠다 /
무의미한 텍스트가 흘러간다"는 피드백이 나왔다. 전체가 미리 정해진 정적 지도는 선택의 결과 체감과
재플레이 동기를 약화시킨다. 사용자 요구는 "앞 2막만 보이고, 선택에 따라 지도가 자라며, 주요 장면은
분기로 반드시 도달 가능"한 살아있는 지도다. 이를 위해선 동적 생성이 필수이고, 그 대가로 seed 재현성을
포기한다(루프형 게임이라 rerun 동일성보다 선택 다양성이 가치가 크다).

Impact: 동적 노드는 `loop.state["_route_map"]`에 영속되어 **같은 세션 내에선 안정**(저장/복원 시 동일).
anchor 도달 보장은 `extend_route`의 reachability guard(`_reachable_from` 재사용)가 매 성장마다 강제 —
mandatory anchor(오프닝/보스, sole-layer 구조로 필수 통과)와 gate anchor(분기, ≥1 경로 도달)가 끊기지
않는다. UI(`GameAside`)는 현재 기준 앞 2레이어만 노출하고 그 너머는 fog(⋯)로 가린다. 정적 시나리오
(glass-library 등)는 mode 미지정으로 회귀 없음. 관련 구현: `route_map.build_route_seed`,
`route_growth.extend_route`, `schemas.WorldDelta.route_nodes`, `session.py` seed/extend 배선.

## 2026-06-09

### Progression/Inventory를 JSONB-on-row에서 전용 테이블로 분리

Decision: 진행도(해금)·인벤토리를 `player_memories`/`loops.state` JSONB에서 전용 테이블로 이전한다
(migration 005). `player_progression`은 `(player_id, scenario_id)` PK 단일 mutable row(upsert),
`loop_inventory`는 `(loop_id, item_id)` PK. 인벤토리/장비 보유는 **loop 단위**(루프형 로그라이크 —
영속되는 건 Echo와 해금만), 해금은 **player+scenario 단위**.

Reason: 기존 패턴의 실질 병목은 JSONB 자체가 아니라 **append-then-scan-latest**(갱신마다 메모리 row를
쌓고 "현재 상태"를 얻으려 전체 스캔·정렬)와 내용 가로 쿼리 불가였다. 진행도는 자주 갱신·조회되는
current state라 단일 row upsert가 정합성·확장성에서 우월하다. 인벤토리는 dict/문자열 혼재로 표시 버그가
났던 만큼 정규화가 필요했다.

Impact: progression 읽기/쓰기는 `load_progression`/`persist_progression` 헬퍼로 캡슐화(전환기
player_memories 폴백 유지). 인벤토리는 `PostgresMythOSStore.save_loop/get_loop` 경계에서 투명하게
dehydrate/hydrate하므로 CombatService/progression/loop engine은 무변경. 인메모리 테스트 스토어는 ABC
기본구현(in-memory)으로 동작. 향후 run summaries/save slots/narrative metrics도 동일 기준으로 테이블화
후보. 설계·단계: `bin/docs/plans/2026-06-09-progression-inventory-equipment-datamodel.md`.

## 2026-06-07

### Use Action Sheets As The Combat Pose Source Of Truth

Decision: 전투 시네마 캐릭터 에셋은 모델 이름보다 **검증된 action sheet 결과**를 기준으로 승격한다.
표준 포즈는 `idle/attack/guard/skill/hit`이며, `attack/guard/skill/hit`은 가능하면 한 캔버스 action
sheet에서 함께 생성해 얼굴, 의상, 체형, 조명, 스케일을 고정한다. 2026-06-07 기준 canonical party
3인(`Se-rin`, `player-noise`, `Kai`)은 Codex 내장 imagegen action sheet + chroma-key 제거 + 분할/정규화
결과다.

Reason: pose별 독립 생성은 Se-rin에서도 얼굴, 카메라, 의상, 액션 설득력이 흔들렸다. 반대로 같은
프롬프트/같은 캔버스의 action sheet는 시네마에서 필요한 0.5~1초 포즈 판독성, VFX, 캐릭터 일관성을
동시에 만족했다. Gemini/Imagen 3 같은 외부 모델은 후보로 평가할 수 있지만, 현재 repo에는 재현 가능한
GCP API 실행 경로와 검증 산출물이 없다. 따라서 운영 지침은 특정 외부 모델을 강제하지 않고, 캐릭터별
검수 시트가 통과한 산출물만 `resources/.../combat/`로 승격하는 방식으로 둔다.

Impact: `bin/docs/plans/2026-06-07-combat-portrait-pipeline.md`가 전투 포즈 제작의 운영 권위가 된다. 모델은
캐릭터 단위로 섞지 않는 것이 원칙이지만, VFX/림라이트 같은 **얼굴·체형을 바꾸지 않는 후처리 오버레이**는
별도 후보로 허용한다. 외부 모델을 도입할 경우에도 먼저 `outputs/combat-sprite-compare/` 아래 검수 시트와
재현 명령을 남긴 뒤 실사용 경로로 승격한다.

## 2026-06-06

### Use mflux Redux For Character Face Consistency

Decision: 캐릭터 얼굴 일관성은 mflux **Redux**(레퍼런스 이미지 조건부 생성, strength 0.9, 캐릭터 portrait 레퍼런스)로 처리한다. 캐릭터 감지는 한국어 내러티브 키워드(`scenario.characters[].keywords`)로 하고, diffusers IP-Adapter 경로는 fallback 메타데이터(`use_ip_adapter`)로만 남긴다.

Reason: 기본 백엔드 mflux는 IP-Adapter를 지원하지 않아 img2img(구도까지 상속)만 가능했고, 게다가 캐릭터 감지를 영어 visual_brief로만 해 실제로는 거의 미탐지 → 매 장면 다른 얼굴이 나왔다. Redux는 빠른 온디바이스 경로를 유지하면서 구도를 상속하지 않고 인물/스타일을 주입한다. diffusers IP-Adapter는 MPS에서 느리고 메모리 부담이 커 기본 경로로 부적합.

Impact: 워커가 txt2img(Flux1)와 Redux(Flux1Redux) 두 모델을 동시 적재할 수 있어 메모리 모니터가 필요하다(필요 시 오프닝도 Redux로 통합해 단일 모델화). Redux는 IP-Adapter만큼 얼굴을 핀포인트 고정하진 않으며 FLUX-schnell 4스텝 한계가 있다. 얼굴 정밀도 최우선이면 diffusers IP-Adapter로 전환하는 옵션이 남아 있다.

### Reuse Streamlit Player Image Preset (512×512) On The Web/WS Path

Decision: WS(begin/choose) 이미지 생성 기본을 1024×1024에서 **512×512 / 4 step**으로 낮춰 Streamlit 플레이어 프리셋과 맞춘다.

Reason: 1024는 워밍 후에도 ~70–100초로 측정돼 체감 지연이 컸다. 512는 워밍 ~7.5초로 ~10배 빠르고 비동기라 텍스트/플레이를 막지 않는다.

Impact: PoC/React 장면 이미지 품질은 약간 낮아지지만 플레이 흐름이 크게 개선된다. 메시지로 width/height/steps override는 여전히 가능.

## 2026-06-04

### Differentiate Companion AI Behaviors (Shadowrun Style)

Decision: implement character-specific tactical behaviors for story companions in the combat loop. Jung Se-rin (`se_rin`) acts as a ranged supporter prioritizing player shielding (using `covering_noise` dynamically on target), while Kai (`kai`) charges in as a melee defender taking aggro (using `overload_strike` on target closest to the player).

Reason: previously, companion units relied on standard NPC behaviors which didn't reflect their character arcs or mechanical roles (e.g. Kai is supposed to be a defender, Se-rin a supporter). Having dedicated tactical profiles deepens the combat layer and gives companions mechanical weight.

Impact: the `_ally_turn` method in the combat engine now checks unit IDs to dispatch tailored actions. Additionally, the `_execute_npc_skill` logic was corrected so that defensive buffs (`defense_bonus`) are applied to the target parameter (such as the player) instead of being hardcoded to the caster.

### Dynamic Stat-Based Inner Monologue Prompts (Disco Elysium Style)

Decision: analyze the player's profile stats dynamically to detect the highest and lowest traits, and inject explicit guidelines for these traits as distinct inner voices into the AI GM's `novelty_notes`.

Reason: to enhance character immersion and make the 5 core stats feel like actual aspects of the player's consciousness rather than static numbers, echoing the inner-thought mechanic of Disco Elysium.

Impact: `build_runtime_narrative_context` evaluates player stats and appends guidelines detailing how the highest stat should suggest logical/instinctual choices in parentheses (e.g. `(Intelligence: ...)`) and the lowest stat should occasionally prompt hesitation or misjudgments.

### Overnight 무인 루프 하네스 도입 + 커밋 게이트 `make check` (2026-06-14)

Decision: 타 repo의 overnight LOOP 엔지니어링을 MythOS에 이식한다 — `scripts/overnight/{run.sh,PROMPT.md,overnight-settings.json}` + `/overnight-report` 스킬 + NEXT_PLAN `[auto]/[manual]/[blocked]` 태깅 + `make overnight*` 운영 타깃. 커밋 게이트는 `make check`(ruff+eslint+mypy+tsc/vite-build+unittest), 무인 권한은 `--settings overnight-settings.json`(git push·네트워크·파괴 make·Web/MCP deny)로 interactive 설정과 격리한다.

Reason: 게임이라 백로그 대부분이 무인 검증 불가(플레이 feel)지만 콘텐츠/밸런스 무결성·타입·hygiene 같은 결정론적 슬라이스는 헤드리스로 안전하게 수행 가능하다. 게이트를 `make check`로 올리기 위해 `mypy src tests` 부채를 0화(0/109)했다.

Impact: 러너는 `[auto]` 태그만 소비하고 회차마다 게이트 통과 시 로컬 커밋한다. `--once` 실검증으로 헤드리스 체인·잔여물 복구를 실증(REPO_ROOT 폴백 버그 발견→자동 `[recovered]` 복구). 설계/운영은 `docs/engineering/mythos/LOOP.md`, 완료 요약은 COMPLETED_SUMMARY M42.

### Overnight 하네스 `bin/overnight/` → `scripts/overnight/` 이동 (2026-06-14)

Decision: 무인 overnight 루프 하네스를 `bin/overnight/`에서 `scripts/overnight/`로 옮긴다. Makefile 28개 타깃·러너 내부 경로·`.gitignore`·docs/skills 참조를 일괄 갱신. 월별 동결 아카이브(`bin/docs/archive/progress-2026-06.md`)의 역사적 경로 언급만 원본 보존.

Reason: 이 repo에서 `bin/`은 **parked/aspirational/archived 보관소**(`bin/docs/archive/*`, `DRAFT.md`)로 규정돼 "쓰레기통"으로 읽힌다. 그런데 `bin/overnight/`는 Makefile에 정식 배선된 **활성 자동화 하네스**라 의미 충돌 — 비활성으로 오해해 청소 대상이 될 위험이 있었다. Unix 관례대로 실행 스크립트는 `scripts/`에 둔다.

Impact: `make overnight*`·러너·worktree/merge/review 동작 불변(경로만 변경). 런타임 산출물 gitignore는 `scripts/overnight/{logs,STOP,DONE}`로 이동. `make check` green 유지.

## 2026-05 이전

2026-05-30/31 결정은 `bin/docs/archive/decisions-2026-05.md`로 분리 보관.

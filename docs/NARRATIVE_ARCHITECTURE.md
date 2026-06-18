# Narrative / Story-Bible Architecture

최종 갱신: 2026-06-19

`neo-seoul` 같은 시나리오의 **서사가 어떻게 구성·생성되는지**를 데이터(저작) → 프롬프트 조립 → LLM 생성 →
파싱 → 상태/루트/메모리 → 영속의 end-to-end로 설명한다. 시스템 전반은 `DESIGN.md`, 프롬프트 레이어 분리
근거는 `PROMPT_LAYER.md`, 운영 개념은 `docs/engineering/mythos/{PROMPT,CONTEXT,LOOP}.md`를 본다(여긴 그
지도다 — 중복 대신 포인터).

## 0. 한눈에 (per-turn 흐름)

```mermaid
flowchart LR
  subgraph 저작[저작 콘텐츠 · resources/<scn>/]
    SJ[scenario.json] ; BJ[story_bible/bible.json] ; DR[directives/*.md]
  end
  SJ & BJ & DR --> CTX
  CTX[scenario_context.build_runtime_narrative_context<br/>→ NarrativeContext<br/>novelty_notes(절단) + session_synopsis(풀)]
  MEM[session_memory<br/>_beats + 롤링 시놉시스] --> CTX
  RT[route_runtime.advance_route<br/>perspective/flag/relationship/ending] --> CTX
  CTX --> PR[prompts.build_*_messages]
  PR --> DIR[director: 이원화<br/>스토리 8B → 파서 3B]
  DIR --> PA[parser.parse_scene_payload<br/>repair → fallback]
  PA --> SE[Scene + ScenePayload + WorldDelta]
  SE --> SS[session.RuntimeSessionService<br/>world_delta 적용·record_beat·advance_route·persist]
  SS -->|다음 턴| CTX
```

핵심: **두 컨텍스트 채널** — `novelty_notes`(최신 `MAX_PROMPT_NOTES=8`만, 초과분 절단) vs
`session_synopsis`(**풀렌더, 비절단** — 오프닝 비트·전투 콜백·세션 메모리처럼 반드시 닿아야 하는 것).

## 1. 저작 콘텐츠 (데이터 레이어 · `resources/<scenario>/`)

| 파일 | 로더 (lru_cached) | 내용 |
|---|---|---|
| `scenario.json` | `scenario.py:load_scenario` → `ScenarioConfig` | `brief`(WORLD/PREMISE/TONE), `archetypes`, `characters`, `combat`(skills/encounters/items/bestiary), `endings`(condition), `playability`(core_stake/golden_path/choice_axes/route_branches), `session_design`(chapter_gates: phase/turn_range/gate/player_goal), `route_map`, `ui_copy`(session_intro.cinematic_shots), `autonomy_config`, `starting_location` |
| `story_bible/bible.json` | `story_bible.py:load_story_bible` → `StoryBible` | `StoryBibleEntry`: `kind`·`title`·`summary`·`content`·`when{phase,turn_min/max,flags_any/all,locations_any}`·`priority`·`token_budget`·`tags` |
| `directives/*.md` (프롬프트 레이어) | `scenario_directives.py:load_scenario_directives` → `ScenarioDirectives` | `opening.md`(5비트 스크립트 turn 0-4), `naming.md`(고유명사 규칙), `stat_voices.md`(Disco Elysium식 min/max 내적독백), `encounters.md`(여행/긴급 템플릿), `companions/<name>.md`(컷씬 directive) |

- **directives 포맷**: `## BLOCK_ID (key=val) / meta / --- / body`(프레이스홀더 `{archetype}{player_action}{shot_title}{shot_body}`). 파서 `parse_directives_markdown`(순수 함수), 접근 `directives.opening_beat(turn)`. 폴더 없으면 빈 `ScenarioDirectives`(graceful).
- **왜 분리**: 코드(=어떻게)와 저작 지시문(=무엇을)을 갈라, 시나리오 튜닝 시 `.md`만 고치게 한다(`PROMPT_LAYER.md`).

## 2. 프롬프트 조립 (per-turn · `scenario_context.py`)

`build_runtime_narrative_context(player, loop, scenario, turn_index, …) → NarrativeContext`가 매 턴 위 데이터를
합쳐 GM용 노트를 만든다. 조립 순서(요지):

1. base 노트: `SCENARIO_BRIEF`·`LANGUAGE_RULE`·`CINEMATIC_CLARITY_RULE`(+ directives.naming_rule).
2. stat-voice 내적독백(최저/최고 스탯 voice).
3. **오프닝 비트**(turn ≤ `opening_max_turn`): `directives.opening_beat(turn)` 본문에 cinematic_shot 채워
   `session_synopsis`(풀렌더)로 — 절단 방지.
4. story-bible 선별: `select_story_bible_entries`(`when` 매치 점수 × priority, `token_budget=1600`/`max_entries=3`)
   → `story_bible_notes` → `novelty_notes`(절단 가능).
5. **세션 메모리**: `build_session_synopsis(loop.state)` → 풀렌더.
6. **전투 직후 콜백**: `_combat_callback_note`(전투 다음 1턴, 여파·heat·동료 반응 참조) → 풀렌더.
7. 루트 노트(turn ≥ 5): `_route_director_notes`/`_route_junction_notes`.
8. 과거 루프 echo + causality 요약 + 조우(여행/긴급) 노트 → `novelty_notes`.

## 3. 서사 파이프라인 (`mythos_narrative`) — 이원화(dual-model)

- **provider** `OllamaJSONProvider`: `generate_story`(스토리 모델 `OLLAMA_MODEL_STORY`=gemma4:latest 8B, 자유
  텍스트) → `generate_json`(파서 `OLLAMA_MODEL_PARSER`=qwen2.5:3b, 구조화 JSON). 단일 모델이면 `generate`.
- **`director.py` `NarrativeDirector`**: `generate_first_scene`/`generate_next_scene`(→ dual or legacy),
  `stream_*`(스트리밍, TTFT 최적화), `fallback_scene`(결정론 canned), `summarize_loop`(루프 종료 2-3문장 요약).
- **`prompts.py`**: `build_{first,next}_scene_messages`/`build_*_story_messages`/`build_repair_messages` →
  `[{system}, {user}]`. system = `DEFAULT_SYSTEM_PROMPT`; user = `JSON_CONTRACT` 예시 → brief → **session_synopsis(풀)**
  → novelty_notes(8) → `OPENING_FIRST_SCENE_INSTRUCTION`(turn 0) → 상태 요약. `MAX_PROMPT_NOTES=8`.
- **`parser.py`**: `parse_scene_payload`(구조·한도 검증: `MAX_NARRATION_CHARS`/`MAX_VISUAL_BRIEF_CHARS`/`MAX_CHOICES`)
  → 실패 시 LLM **repair** 1회 → 재실패 시 **fallback**. outcome 추적(success/provider_repair/local_repair/fallback).
- **`schemas.py`**: `ScenePayload`(title/location/narration/visual_brief/choices/objective/action_result/scene_type),
  `WorldDelta`(stability/tension/flags/clues/start_combat/grant_items/hp/route_nodes), `NarrativeContext`.

## 4. 루트/구조 레이어 (절차 생성 DAG)

- **`route_map.py` `build_route_map(config, seed)`**: `scenario.route_map`(mode/node_types/layers)를 결정적
  layered DAG로(`Dice(seed:route)`). **anchor**(사전저작 비트, 큐레이트 이미지 보유) + **dynamic 노드**(pool에서
  샘플, 이미지 없음→FLUX). 각 anchor는 **perspective** 다중(같은 비트의 여러 시점, flag 매치로 선택).
- **`route_runtime.py` `advance_route(state, turn_index, seed, turns_per_layer=4)`**: 턴 기반 walk
  (`target_layer = turn//4`). 매턴 visited 전 경로 **replay** → flag/ending/relationship tally를 from-scratch
  재계산(멱등). relationship은 직전 route tally 차감+신규 가산으로 reconcile(더블카운트 방지).
- **`route_growth.py` `extend_route`**: 레이어 끝에서 다음 레이어 시드(anchors + dynamic).

## 5. 세션 메모리 (연속성 · RAG 아님)

`session_memory.py`: `record_beat`(매 장면 후 `_beats` 원장에 compact 비트 append, `MAX_BEATS=40`; 직전 N장면
verbatim `_recent_narration` 유지) + `build_session_synopsis`(원장→prose recap + 직전 장면 verbatim) →
`session_synopsis` 풀렌더 채널. **벡터 검색(RAG)이 아니라** 결정론 원장+롤링 시놉시스로 반복/드리프트를 막는다.

## 6. 오케스트레이션 (`session.py` `RuntimeSessionService`)

CLI/Streamlit/FastAPI 공통 경계. `start_loop`/`choose`/`archive`가 store+director+engine을 배선. per-turn:
context 빌드 → `director.generate_next_scene` → `parse_scene_payload`(repair/fallback) → `world_delta` 상태 반영 →
`record_beat` → `advance_route` → 한 트랜잭션 persist → `RuntimeSnapshot` 반환. 종료 시 `summarize_loop` +
`_ending_narration_text`(종료 서사) + 메타 진행/관계/컷씬 이월.

## 7. 더 볼 곳

- 시스템 전반·스키마·시퀀스: `DESIGN.md` · 게임 규칙: `GAMEPLAY.md`
- 프롬프트 레이어 분리·directives 포맷: `PROMPT_LAYER.md`
- 운영 개념(컨텍스트/루프/프롬프트 엔지니어링): `docs/engineering/mythos/{CONTEXT,LOOP,PROMPT}.md`
- 권위 스키마(DB): `migrations/001_init.sql`

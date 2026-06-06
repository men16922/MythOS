# Story Bible, Run History, Meta Progression, Save/Load Plan

작성일: 2026-05-31

## Goal

Project MythOS를 “즉흥 장면 생성 데모”에서 “시나리오 바이블을 가진 로그라이크/CRPG 세션 게임”으로 확장한다.

핵심 목표:

- 영화/소설/게임북처럼 별도 작성된 세계관, 설정, 스토리, 타임라인, 이벤트를 LLM GM이 필요할 때 참고한다.
- 샘플용 신규 게임 스토리를 하나 작성해 멀티 시나리오 구조를 검증한다.
- 매 세션 엔딩마다 플레이 기록을 요약 저장하고, 메뉴에서 런 히스토리로 조회한다.
- 로그라이크식 메타 진행도와 특전 해금을 추가한다.
- 플레이어가 이해하기 쉬운 명시적 세이브/로드 시스템을 제공한다.

## Existing Foundation

이미 있는 기반:

- `resources/neo-seoul/scenario.json`: 기계가 읽는 시나리오 데이터, combat pool, arcs, NPC agendas, endings, system prompt.
- `docs/scenarios/01-neo-seoul-connect.md`: 사람이 읽는 시나리오 바이블 성격의 문서.
- `RuntimeSessionService.resume(loop_id)`: loop 기반 재개.
- `RuntimeSessionService.archive(loop_id)`: 루프 종료, Echo, `loop_archive` WorldMemory, NarrativeShard 생성.
- `memory_overview`: player-scoped Echo, shard, world archive, rollup 조회.
- `PlayerProfile.traits`: 아키타입, 스탯, 특성 저장.

부족한 점:

- LLM에 전달할 “필요한 바이블 조각 선택” 레이어가 없다.
- archive 기록은 내부 memory에 가깝고, 플레이어용 run history로 정리되지 않았다.
- 메타 진행도/해금 규칙이 별도 도메인으로 분리되어 있지 않다.
- save/load는 기술적으로 resume이지만, 플레이어가 슬롯/체크포인트로 인식하는 UX가 없다.

## Architecture Direction

### 1. Story Bible

권장 구조:

```text
resources/<scenario_id>/
  scenario.json
  story_bible/
    bible.json
    act_01.md
    act_02.md
    timeline.md
    factions.md
    characters.md
    endings.md
docs/scenarios/
  02-glass-library.md
```

`bible.json`은 LLM 주입용 인덱스다.

예상 스키마:

```json
{
  "id": "glass-library",
  "title": "세계 : 접속 - 유리성의 사서",
  "premise": "...",
  "tags": ["mystery", "library", "memory"],
  "entries": [
    {
      "id": "act1_entry_gate",
      "kind": "act",
      "title": "입구: 깨진 목록실",
      "summary": "...",
      "content": "...",
      "when": {
        "phase": ["connect", "explore"],
        "flags_any": ["entered_library"],
        "locations_any": ["catalog-hall"]
      },
      "priority": 10,
      "token_budget": 600
    }
  ]
}
```

원칙:

- 전체 바이블을 매번 프롬프트에 넣지 않는다.
- 현재 phase, location, flags, NPC state, clues, ending pressure에 맞는 조각만 고른다.
- LLM은 스크립트를 그대로 복붙하는 작가가 아니라, 해당 페이지를 참고하는 GM으로 취급한다.

### 2. Story Bible Runtime Injection

신규 모듈 후보:

- `src/mythos_runtime/story_bible.py`
  - `StoryBible`
  - `StoryBibleEntry`
  - `load_story_bible(scenario_id)`
  - `select_story_bible_entries(loop, scene, context, budget)`

주입 지점:

- `build_runtime_narrative_context(...)`
- `NarrativeContext.notes`

프롬프트 형태:

```text
STORY_BIBLE_SNIPPETS:
- [act1_entry_gate] ...
- [npc_se_rin_secret] ...
Use these as canon constraints and inspiration. Do not dump them verbatim unless the scene calls for an in-world script fragment.
```

테스트:

- 현재 phase/location/flag에 맞는 entry만 선택된다.
- token budget 초과 시 priority 낮은 entry가 제외된다.
- bible 없는 scenario는 기존 동작을 유지한다.

### 3. Sample Game Story

샘플 시나리오:

```text
세계 : 접속 - 유리성의 사서
```

요약:

- 플레이어는 붕괴 중인 기억 도서관 “유리성”에 접속한다.
- 목표는 “첫 번째 접속 기록”을 찾는 것.
- 도서관의 사서 AI, 잊힌 독자, 검열자 세력이 서로 다른 진실을 숨긴다.
- 3막 구조와 4개 엔딩을 가진다.

초기 산출물:

- `docs/scenarios/02-glass-library.md`
- `resources/glass-library/scenario.json`
- `resources/glass-library/story_bible/bible.json`
- 필요 시 최소 combat pool과 NPC portraits placeholder.

범위 조절:

- 첫 구현은 텍스트/LLM 주입 중심으로 하고, 이미지/전투는 Neo-Seoul 수준까지 한 번에 확장하지 않는다.

### 4. Run History

세션 종료 시 플레이어용 요약을 저장한다.

후보 모델:

```python
RunSummary(
    run_id: str,
    player_id: str,
    loop_id: str,
    scenario_id: str,
    started_at: datetime,
    ended_at: datetime,
    ending_id: str | None,
    ending_label: str,
    final_title: str,
    final_location: str,
    phase: str,
    stability: int,
    tension: int,
    turns: int,
    combats_won: int,
    combats_lost: int,
    clues_collected: list[str],
    allies_met: list[str],
    unlocks_granted: list[str],
    summary_text: str,
    metadata: dict[str, Any],
)
```

저장 전략:

- 단기: `WorldMemory(kind="run_summary")` 또는 `PlayerMemory(kind="run_summary")`로 구현해 migration 없이 시작.
- 중기: 조회/필터가 늘어나면 `run_summaries` 테이블로 분리.

생성 지점:

- `RuntimeSessionService.archive`
- combat defeat permadeath로 loop가 ended 되는 지점
- future ending condition 처리 지점

Player View:

- 메인 메뉴에 `기록 보관소`
- 목록: 날짜, 시나리오, 엔딩, 안정도, 긴장도, 턴 수, 해금 수
- 상세: 세션 요약문, 주요 선택/전투/단서/해금

### 5. Meta Progression And Unlocks

후보 모델:

```json
{
  "player_id": "player_1",
  "scenario_id": "neo-seoul",
  "runs_completed": 5,
  "endings_seen": ["collapse", "humanity"],
  "unlocked_traits": ["memory_weaver"],
  "unlocked_allies": ["se_rin"],
  "unlocked_starting_items": ["old_access_key"],
  "codex_unlocks": ["origin_fragment_01"]
}
```

해금 규칙 예:

- 첫 엔딩 도달: 새 아키타입 해금.
- 특정 NPC 생존 엔딩: 해당 NPC를 시작 동료 후보로 해금.
- 단서 3개 수집: 새 시작 위치 해금.
- 붕괴 엔딩 3회: `시스템 글리치` 특성 해금.
- 전투 승리 5회: 시작 아이템 해금.

신규 모듈 후보:

- `src/mythos_runtime/progression_store.py` 또는 `src/mythos_runtime/meta_progression.py`
  - `evaluate_unlocks(run_summary, previous_progress)`
  - `apply_unlocks(player, unlocks)`

저장 전략:

- 단기: `PlayerMemory(kind="meta_progression")`.
- 중기: `player_progress` 테이블.

### 6. Save/Load

현재 `loop_id` resume은 기술적 로드다. 플레이어용 UX로 명시화한다.

MVP:

- 메인 메뉴에 `LOAD` 추가.
- active loop 목록을 저장 슬롯처럼 표시.
- 각 항목에 시나리오, 장면 제목, phase, 저장 시각, 안정도/긴장도 표시.
- 선택 시 `RuntimeSessionService.resume(loop_id)`.

다음 단계:

- `Save Slot` 개념 추가.
- `save_slots` 테이블 또는 `PlayerMemory(kind="save_slot")`로 시작.
- 슬롯 필드:
  - `slot_id`
  - `player_id`
  - `loop_id`
  - `scenario_id`
  - `label`
  - `scene_title`
  - `phase`
  - `saved_at`
  - `asset_id`
  - `metadata`

정책:

- 장면 시작/선택 후 autosave.
- 전투 중 저장은 현재 `_combat` state를 포함하되, UI에서는 “전투 중”으로 표시.
- ended loop는 load 대상이 아니라 run history 대상.

## Implementation Phases

### Phase A. Planning And Docs

- `[x]` 이 계획 문서 작성.
- `[x]` `NEXT_PLAN.md`, `STATUS.md`, `AGENT_BRIEF.md`에 제품화 트랙 반영.
- `[x]` `GAMEPLAY.md`에 Story Bible / Run History / Save Load 섹션 추가.

### Phase B. Story Bible MVP

- `[x]` `story_bible.py` loader/selector 추가.
- `[x]` Neo-Seoul용 최소 `story_bible/bible.json` 작성.
- `[x]` `build_runtime_narrative_context`에 selected snippets 주입.
- `[x]` selector unit tests.

### Phase C. Sample Scenario

- `[x]` `docs/scenarios/02-glass-library.md` 작성.
- `[x]` `resources/glass-library/scenario.json` 최소 작성.
- `[x]` `resources/glass-library/story_bible/bible.json` 작성.
- `[x]` unit test로 로딩 확인.

### Phase D. Run History MVP

- `[x]` `RunSummary` 생성 함수 추가.
- `[x]` archive/permadeath 경로에서 저장.
- `[x]` 명시적 ending condition 경로 초도 통합 및 `ending_id`/`ending_label` 저장 확장.
- `[x]` ending condition evaluator 안전화 및 시나리오별 조건 보강.
- `[x]` `memory_overview` 및 별도 service로 run summaries 조회.
- `[x]` Player View `기록 보관소` 메뉴 추가.
- `[x]` unit tests.

### Phase E. Meta Progression MVP

- `[x]` unlock rule data 정의.
- `[x]` run summary 기반 unlock 평가.
- `[x]` PlayerMemory에 meta progression 저장.
- `[x]` 새 루프 시작 시 unlocked traits/items/allies를 PlayerProfile traits 및 초기 state/inventory에 반영.
- `[x]` unit tests.

### Phase F. Save/Load UX

- `[x]` 메인 메뉴에 active loop `LOAD` 목록 정리.
- `[x]` save slot metadata 생성/갱신.
- `[x]` 명시적 `SAVE` 버튼 또는 autosave 표기.
- `[x]` ended loop는 기록 보관소로 이동하도록 구분.
- `[x]` Streamlit smoke regression.
- `[!]` Browser screenshot regression은 in-app Browser `iab` 세션 미사용으로 미검증.

## Verification

기본 검증:

- `make test`
- `make typecheck`
- 변경 파일 `ruff`

런타임 변경 검증:

- `make smoke-local`
- Streamlit Player View:
  - 새 게임 시작
  - Story Bible snippet 반영 확인
  - 엔딩/archive 후 기록 보관소 조회
  - LOAD로 active loop 재개

DB/저장소 변경 시:

- `make test-db`
- `make smoke`

## Open Questions

- RunSummary를 단기적으로 `WorldMemory`에 둘지, 바로 별도 테이블로 갈지.
- Story Bible content를 JSON에 다 넣을지, md 파일을 인덱싱해 참조할지.
- Save Slot을 loop snapshot 복제로 볼지, loop_id bookmark로 볼지.
- 해금 특전이 새 루프 시작 선택지만 바꿀지, 실제 전투/서사 스탯에도 보너스를 줄지.

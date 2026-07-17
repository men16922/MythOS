# Prompt Layer — 서사 프롬프트 아키텍처

최종 갱신: 2026-06-16

> MythOS 서사 파이프라인에서 **코드 레이어(불변 로직)** ↔ **프롬프트 레이어(authored 지시문)** 의
> 분리를 정의한다. "지시문 한 줄 튜닝 = 해당 `directives/*.md` 한 파일만 수정." 진행 리팩토링은
> `docs/plans/`(승인 plan: prompt-layer 분리) 참조. 데이터 계약은 `DESIGN.md`/`migrations/`.

---

## 1. scenario.json — 시나리오 구조 데이터

`resources/<scenario>/scenario.json` 한 파일이 시나리오의 **구조 데이터 전체**다.

```
scenario.json → load_scenario() [lru_cached, src/mythos_runtime/scenario.py] → ScenarioConfig(frozen)
              → 약 9개 서브시스템이 소비
```

| 필드 | 주 소비처 | 역할 |
|---|---|---|
| `system_prompt`, `brief` | scenario_context | LLM 세계관/전제 |
| `archetypes` | progression, scenario_context | 직업·스탯·해금(`unlock`) |
| `combat`(skills/encounters/items/bestiary/epiphanies) | combat engine/service, progression | 전투 전부 |
| `route_map`(node_types/layers/anchors/pool) | route_map.py→DAG, route_runtime.py→진행 | 작전 지도 |
| `endings`, `autonomy_config` | ending_resolver | 결말 분기 판정 |
| `main_arcs`/`side_arcs`/`npc_agendas` | scenario_context | 서사 노트 주입(현재 prose 힌트) |
| `ui_copy.session_intro.cinematic_shots` | scenario_context(오프닝), Streamlit | 인트로 3컷 |
| `characters`/`character_map`/`concept_map` | visual_service | img2img 레퍼런스 |
| `playability.core_stake` | serializers | UI 위험 스트립 |

별도 파일: `resources/<scenario>/story_bible/bible.json` (`story_bible.py`, lru_cached, 장면별 주입).
`resources/<scenario>/directives/*.md` (`scenario_directives.py` — 아래 §3, 프롬프트 레이어).
이미지: `resources/<scenario>/{scenes,opening,characters,enemies,concept,skills}/`.

## 2. scenario_context.py — 매 턴 프롬프트 어셈블러

`build_runtime_narrative_context()`가 scenario + 루프 상태 + 메모리를 모아 **GM 지시문(notes)**을 만들어
`NarrativeContext`로 반환. 두 출력 채널:
- `novelty_notes` — `MAX_PROMPT_NOTES=8`로 **마지막 8개만** 프롬프트에 들어감(truncated).
- `session_synopsis` — **전량 렌더**(절대 안 잘림). 연속성·anti-repeat·오프닝 지시 같은 필수 지시문은 여기.

> 과거 버그: 오프닝 지시를 `novelty_notes`에 넣어 story_bible 노트에 밀려 잘려나가 모델에 도달 못 함
> → `session_synopsis`로 이동해 해결(2026-06-16). 이게 프롬프트 레이어 분리의 직접 동기.

## 3. 코드 레이어 ↔ 프롬프트 레이어

**원칙**: 불변(invariant) 로직은 코드 STAY. 동적(authored) 지시문 prose는 `directives/*.md`로 MOVE.

| 블록 | 위치 | 판정 |
|---|---|---|
| 게이팅(turn≤4/phase/turn≥5 route), 채널 라우팅, `MAX_PROMPT_NOTES` 트렁케이션 | scenario_context | **STAY** (불변 로직) |
| JSON 계약, 언어=한국어 규칙, `_story_context_prompt` 템플릿 | prompts.py | **STAY** |
| `_route_director_notes`/`_route_junction_notes`/`_scenario_structure_notes` | scenario_context | **STAY** (데이터주도 어셈블리) |
| side-anchor beat 잠금 prose(location/event/forbidden) | scenario_context | **MOVE 완료** → `directives/side_arcs.md` + `.en.md` |
| stat-voice min/max 선택 로직, encounter 임계값(`stability<30`/`tension>70`) | scenario_context | **STAY** (로직만; prose는 MOVE) |
| ONBOARDING 오프닝 비트 5종 prose | scenario_context | **MOVE** → `directives/opening.md` |
| `NEO_SEOUL_NAMING_RULE`(고유명사/말투) | scenario_context | **MOVE** → `directives/naming.md` |
| stat-voice 독백 prose | scenario_context | **MOVE** → `directives/stat_voices.md` |
| travel/emergency 조우 prose | scenario_context | **MOVE** → `directives/encounters.md` |
| `_fallback_payload` neo-seoul prose (parser.py와 중복) | director.py/parser.py | **MOVE** → `directives/fallback.md` (+ 공유 코드 기본값) |
| system prompt few-shot 예시(neo-seoul) | prompts.py | **MOVE 완료 (Phase 5, 2026-07-17)** → `directives/story_examples.md` + `.en.md` (scaffolding·포맷 계약은 STAY; 코드 기본값 = `STORY_EXAMPLE_DEFAULTS` byte-parity 앵커, `tests/test_story_example_directives.py`) |

### directives/*.md 포맷

블록 = `## <ID> (key=val)` 헤더 → `key: value` 메타 → `---` → 자유 prose 본문. 로더는
`src/mythos_runtime/scenario_directives.py`(`load_scenario_directives`, lru_cached, `story_bible.py` 미러).
파서 `parse_directives_markdown()`는 순수 함수(테스트 `tests/test_scenario_directives.py`). 플레이스홀더
`{archetype}/{player_action}/{shot_title}/…`는 `fill_placeholders()`로 KeyError-tolerant 치환.

```markdown
## ONBOARDING_SCENE2 (turn=1, shot=0)
location_lock: 야외, 비 내리는 C-17 네온 골목
mandatory_event: 정세린의 첫 등장
forbidden: 발광 물체/정체불명 신호, 지하/실내 이동, 전투
flags:
start_combat:
---
★ 이 장면의 필수 사건은 '정세린의 첫 등장'입니다. ... 저작 컷 — '{shot_title}'. {shot_body}
```

폴더가 없으면 빈 `ScenarioDirectives` → 호출부는 기존 하드코딩 동작으로 graceful fallback
(glass-library는 directives 폴더 없음 = 현행 동일).

## 4. 장면 결정 모델 (8B 비결정성과 잠금)

**1차 축 — 턴→레이어**(시나리오 순서, `route_runtime.py`): `target_layer = turn_index // turns_per_layer(=4)`.
사전저작 DAG(`scenario.route_map`)를 순서대로 통과(layer 0 오프닝 → 1 야시장 → … → 5 IX 대면).

**2차 축 — 노드 스크립트 강도**:

| 노드 | 저작 수준 | 8B 자유도 | 신뢰도 |
|---|---|---|---|
| 오프닝(layer 0) | 턴별 hard 스크립트(directive 잠금) | 최소 | 높음 |
| Anchor 노드 | 준-스크립트(저작 `perspectives` + 큐레이트 이미지) | 중간 | 중간 |
| Dynamic 노드(pool) | 자유 생성(node_type 힌트만, FLUX 이미지) | 최대 | 낮음 |

**함의**: 8B 드리프트/짧은생성/fallback은 **dynamic 노드**에서 재발한다. 잠금 모델 = 주요 장면
(오프닝 + 메인 anchor + 사이드 anchor)을 directive로 **명시 매핑/잠금**(location_lock/mandatory_event/
forbidden), dynamic은 **의도적 창발**에 맡긴다. Side anchor는 `directives/side_arcs*.md`의 `beat=` 주소로
KO/EN 9개 잠금 봉투가 구현됐다. 명시적 `route:<node>` 선택은 durable commit 전에 context-only preview를
사용해 선택한 노드의 title/image/flags/directive가 첫 생성 장면에 도달하며, 잠금은 잘리지 않는
`session_synopsis` 채널로 주입된다.

3-트랙 라우팅 결합: 메인 anchor(결정론 척추·분기-게이트) + 사이드 anchor(병렬·동료, route 노드 승격
+ producer/entry effect + beat directive 완료) + dynamic fill(절차; full/growth 공통 비복원 layer type sampling과
제목 중복 invariant 완료). 상세는 `docs/plans/`.

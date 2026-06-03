# Project MythOS Status

최종 갱신: 2026-06-03

## Current State

Project MythOS 로컬 플레이어블 MVP는 구현 완료 상태다. Streamlit 플레이어/개발자 뷰, Neo-Seoul 시나리오, Codex/단서 해금, 인과율/다중 엔딩 구조, mflux 기반 비동기 이미지 생성, BGM/SFX, 전술 전투 루프, 단일 iframe 전투 UI, 동료 참전, 도주 후 contact 유지, Run History MVP, Meta Progression MVP, Save/Load UX MVP, Ending Resolver, Developer 인과율 모니터가 동작한다. 주력 콘텐츠는 Neo-Seoul 01이며, 1회 1시간/40-60턴 소설형 세션을 목표로 6막 구조와 Story Bible depth를 보강했다.

핵심 런타임:

- `RuntimeSessionService`: CLI/Streamlit 공통 orchestration.
- PostgreSQL: player, loop, scene, memory, asset metadata.
- MinIO: 생성 이미지 기본 저장소.
- Redis: visual job queue/worker heartbeat.
- Ollama: AI GM narrative generation.
- mflux/FLUX: Apple Silicon 이미지 생성 백엔드.

## Latest Verified Baseline

- `make test` (148 tests, 2 skipped)
- `make typecheck`
- `make smoke-local`
- Streamlit headless boot 200 OK
- Browser Streamlit 전투 iframe 렌더 확인: 보드/로스터/컨트롤/로그가 단일 iframe 안에 표시되고 흰 입력 박스가 노출되지 않음.
- Service-level ally spawn check: `_party.members=[se_rin]`에서 ally radar/portrait/HP 반영 확인.
- Targeted combat follow-up tests: 도주 결과는 contact를 `alerted`+cooldown 상태로 유지하고 보상을 적용하지 않음.
- Combat balance tests: focus 비용 2 중심 조정, 방어 집중 회복 턴, `stim_shard` 회복량 조정 검증.
- Story Bible MVP tests: Neo-Seoul/Glass Library `story_bible/bible.json` 로딩, phase/flag/location 기반 snippet 선택, `NarrativeContext` 주입 확인.
- Neo-Seoul depth tests: 6막 long-form session design, 15개 이상 Story Bible snippet, final confrontation/pacing contract 확인.
- Run History tests: archive/permadeath 시 `run_summary` 저장, service 조회, Player View 기록 보관소 렌더 경로 확인.
- Meta Progression tests: run summary 기반 unlock 평가, `PlayerMemory(kind="meta_progression")` 저장, 새 루프 시작 시 unlocked starting item/state 반영.
- Save/Load tests: active save slot 목록, ended loop load 차단, player resume 최신 active slot 선택 확인.
- Ending Resolver tests: scenario ending condition 평가, `RunSummary.ending_id`/`ending_label` 저장 경로 확인.
- Player View hotfix tests: 선택 플레이어가 없어도 `새 게임 시작`이 player 생성 후 시작되고, `"null"` combat request sentinel은 전투 요청으로 처리하지 않음.
- Opening cinematic renderer: Streamlit markdown 파서 대신 self-contained iframe 렌더 경로로 raw HTML 노출 방지.
- Streamlit boot check: `http://localhost:8501` 200 OK.

## Active Focus

다음 우선순위는 **실 플레이 중 이미지 생성 레이턴시 계측 및 최적화(P1)와 IP-Adapter 캐릭터 비주얼 일관성(P2) 도입**이다.

목표:

- 영화/소설/게임북처럼 별도 작성된 시나리오 바이블을 LLM GM이 필요한 순간에 참고한다.
- 샘플용 신규 게임 스토리 `세계 : 접속 - 유리성의 사서`를 작성해 멀티 시나리오 구조를 검증했다.
- 세션 archive/permadeath마다 플레이어의 진행을 요약 저장하고, Player View 메뉴에서 런 히스토리로 조회한다.
- 로그라이크식 메타 진행도와 특전 해금을 추가했다.
- active loop/save slot 기반 명시적 세이브/로드 UX를 제공한다.
- scenario ending condition을 평가해 archive/permadeath run summary에 `ending_id`/`ending_label`을 저장한다.
- 필요 시 동료 AI/HP carry-over 밸런스를 추가 조정한다.

## Completed Tracks

상세 이력은 `docs/COMPLETED_SUMMARY.md`, `docs/archive/progress-2026-05.md`, `docs/plans/`를 본다.

- M0-M10 로컬 런타임 vertical slice.
- Phase 11 Streamlit demo polish.
- Phase 12 narrative memory/novelty depth.
- Phase 13 Redis async visual jobs + mflux performance.
- Phase 14 DX: ruff, mypy, quality commands.
- Phase 15-19 playable single-player track.
- Phase 21-26 RPG stats, autonomy, novel-grade narrative.
- Causality/scenario v2 track.
- Roguelike/CRPG tactical combat base.
- 전투 스킬/아이템 실행, 주요 전투 UI 버그 수정, 단일 iframe 전투 UI 재구성, 동료/파티 참전, 도주 후 contact 유지.
- Story Bible MVP와 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서`.
- Neo-Seoul 01 long-form depth pass: 1시간 세션 구조, 6막 arc, 장면 밀도 원칙, 관계/단서/클라이맥스 Story Bible 확장.
- Run History MVP: `RunSummary` DTO, `WorldMemory(kind="run_summary")` 저장, archive/permadeath 저장 경로, Player View/Developer Memory 기록 보관소 조회.
- Meta Progression MVP: run summary 기반 trait/ally/starting item/codex unlock 평가, `PlayerMemory(kind="meta_progression")` 저장, 새 루프 초기 state와 starting inventory 반영.
- Save/Load UX MVP: active loop 기반 `SaveSlot` DTO, `PlayerMemory(kind="save_slot")` autosave metadata, Player View LOAD slot 선택, 명시적 `SAVE` 버튼, ended loop load 차단.
- Ending Resolver 초도 통합: `EndingResolver` 조건 평가, archive/permadeath `ending_id`/`ending_label` 저장, run summary 반영.
- Developer 인과율 모니터: active flags, metric score, ending condition matching 상태 노출.
- Player View hotfixes: START no-player auto-create, `"null"` combat request guard, opening cinematic iframe renderer.

## Open Risks

- `narrative_shards`는 limit query로 소비량만 제한하고 별도 장기 압축은 아직 없다.
- Ollama output은 repair/fallback path를 탈 수 있으므로 provider 품질 메트릭 추적이 계속 필요하다.
- IP-Adapter는 아직 실배선 전이라 캐릭터 얼굴-ID 고정은 img2img 레퍼런스 기반이다.
- 동료 AI는 현재 기본 NPC 공격 로직을 사용한다. 동료 스킬 자동 사용/전술 성향 고도화는 아직 없다.
- 추가 전투 밸런스는 실제 플레이 로그 기반으로 재조정할 수 있다.
- Story Bible은 전체 문서를 프롬프트에 넣으면 토큰 낭비가 크므로, phase/location/flags 기반 snippet 선택 레이어가 필요하다.
- RunSummary는 현재 `WorldMemory(kind="run_summary")` JSONB로 저장한다. 조회/필터가 늘어나면 별도 테이블 migration이 필요하다.
- MetaProgression은 현재 `PlayerMemory(kind="meta_progression")`, SaveSlot은 `PlayerMemory(kind="save_slot")` JSONB로 저장한다. 조회/필터가 늘어나면 별도 테이블 migration이 필요하다.
- EndingResolver 조건식은 현재 제한된 namespace의 expression 평가 경로다. operator whitelist/AST 기반 evaluator로 안전성을 높이는 보강이 필요하다.

## Source Of Truth

- 에이전트 진입점: `docs/AGENT_BRIEF.md`
- 다음 계획: `docs/NEXT_PLAN.md`
- 최신 로그: `docs/PROGRESS_LOG.md`
- 상세 archive: `docs/archive/progress-2026-05.md`
- 결정 기록: `docs/DECISIONS.md`
- 제품화 계획: `docs/plans/2026-05-31-story-bible-save-load.md`

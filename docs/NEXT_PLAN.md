# Project MythOS Next Plan

작성일: 2026-05-30
최종 갱신: 2026-06-03

이 문서는 앞으로 할 일만 유지하는 rolling plan이다. 완료된 phase 상세는 `docs/COMPLETED_SUMMARY.md`, `docs/archive/progress-2026-05.md`, `docs/plans/`를 본다.

## Planning Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md`, `docs/STATUS.md`, 이 문서를 읽는다.
- 큰 작업을 시작하면 `docs/plans/YYYY-MM-DD-<topic>.md`에 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`는 짧게, 상세 이력은 필요 시 archive로 분리한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

## Immediate Priority

### 1. 전투화면 단일 iframe 재구성 (flicker/흰박스 근본 해결) — `[x]` 완료

목표: 전투 표현 계층 전체를 자기완결형 iframe 하나로 모아 전투 중 Streamlit rerun을 없앤다.
현재 구조(Streamlit 위젯 + per-action rerun + `st.iframe` remount)에서 **깜박임과 스킬창 흰 박스가
남아있고**, 이번 세션의 부분 수정(select/blank rerun, label collapsed)으로도 근본 해결이 안 됐다.

권위 계획: **`docs/plans/2026-05-31-combat-single-iframe.md`** (Option A: 로컬 JSON 엔드포인트 + 단일 iframe).

작업 요약:

- `[x]` `src/mythos_runtime/combat_server.py`(신규): 127.0.0.1 백그라운드 HTTP + 순수 핸들러
  `combat_action_response` / `combat_state_response`(요청별 store, 이미지 비활성 옵션).
- `[x]` `streamlit_app.py`: `_render_combat_arena_fragment`를 iframe 1회 마운트 + 종료-신호 처리로 단순화,
  `_build_combat_app_html`(보드+로스터+컨트롤+로그+결과를 클라이언트 렌더, fetch로 턴 처리) 신규,
  per-action `_dispatch`/`st.rerun(scope="fragment")` 제거.
- `[x]` `tests/test_combat_server.py`(신규): `test_session_combat._InMemoryStore` 패턴으로 핸들러 검증.
- `[x]` 엔진/`CombatService`/스키마 무변경 → 기존 전투 테스트 회귀 없음 확인, 브라우저 렌더 회귀.

### 2. 동료/파티 참전 — `[x]` 완료

목표: 정세린/카이 같은 시나리오 동료를 조건부 ally combatant로 전투에 투입한다.

작업:

- `[x]` `_party.members` 저장/로드 구조와 narrative unlock 조건 확인.
- `[x]` `scenario.json["combat"]["allies"]`를 `CombatService.begin` / factory / encounter 경로에 연결.
- `[x]` ally 스탯, weapon, skills, portrait를 combatant로 변환.
- `[x]` ally 턴 순서, AI/자동 행동, HP carry-over 정책 결정(기본 NPC AI, HP는 `_party.members`에 저장).
- `[x]` Streamlit roster/tactical board/result panel에 ally 표시(radar faction/portrait 경유).
- `[x]` unit tests + `make test`; runtime 경로 변경 검증으로 `make smoke-local`.

완료 기준:

- unlock된 동료가 전투 시작 시 아군 roster와 보드에 등장한다.
- 전투 결과에 ally 생존/피해 상태가 반영된다.
- 동료가 없는 기존 전투 흐름은 회귀하지 않는다.

### 3. 전투 후속 선택 — `[x]` 완료

- `[x]` 도주 성공 시 contact를 defeated가 아니라 roaming/alerted로 유지.
- `[x]` focus 재생량과 skill cost 밸런스 재검토. 주요 스킬 focus 비용을 2로 조정하고, 방어를 집중 회복 턴으로 강화.
- `[x]` custom component 기반 drag/drop tactical board 재검토. 현 단일 iframe 보드가 안정적으로 동작하므로 필수 작업은 없음. 드래그앤드롭은 후속 UI 고도화 선택지로만 유지.

### 4. Story Bible / Run History / Save Load — `[~]` 엔딩 보강 진행 중

권위 계획: **`docs/plans/2026-05-31-story-bible-save-load.md`**

목표: 영화/소설/게임북처럼 별도 작성된 시나리오 바이블을 LLM GM이 필요한 순간에 참고하고, 세션 종료 기록·메타 해금·명시적 세이브/로드를 플레이어 메뉴로 제품화한다.

작업:

- `[x]` `story_bible.py` loader/selector 추가. 현재 phase/location/flags/NPC 상태에 맞는 바이블 조각만 `NarrativeContext`에 주입.
- `[x]` Neo-Seoul 최소 story bible 작성 및 기존 `scenario.json`/`docs/scenarios/01-neo-seoul-connect.md`와 연결.
- `[x]` 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성(`docs/scenarios/02-glass-library.md`, `resources/glass-library/`).
- `[x]` Neo-Seoul 01을 주력 1시간 세션으로 심화. 6막/40-60턴 구조, 장면 밀도 원칙, 관계/단서/클라이맥스 Story Bible snippet 확장.
- `[x]` archive/permadeath 시 `RunSummary` 생성 및 `WorldMemory(kind="run_summary")` 저장.
- `[x]` Player View `기록 보관소` 메뉴에서 런 히스토리 목록/상세 조회.
- `[x]` run summary 기반 meta progression/unlock 평가 및 `PlayerMemory(kind="meta_progression")` 저장.
- `[x]` 새 루프 시작 시 unlocked starting item과 meta progression state 반영.
- `[x]` 명시적 엔딩 조건 경로 추가: `EndingResolver` 모듈을 도입하고 `loop.state` 기반 조건식 평가를 통해 `RunSummary.ending_id`/`ending_label` 저장 확장. (P0)
- `[x]` P0 엔딩 리졸버 조건식 안전화: `eval` 기반 조건식을 AST/whitelist evaluator로 교체하거나 명시 DSL로 제한.
- `[x]` P0 Neo-Seoul/Glass Library ending condition 점검: 실제 `loop.state.flags`, clue count, stability/tension/autonomy와 조건식이 맞는지 검증.
- `[x]` P0 Player View 엔딩 표시 검증: 최종 화면/기록 보관소/메타 진행도에서 ending label이 일관되게 보이는지 확인.
- `[x]` 메인 메뉴 `LOAD`를 active loop/save slot UX로 정리하고, ended loop는 기록 보관소로 분리.
- `[x]` autosave metadata와 명시적 `SAVE` 버튼 추가.

완료 기준:

- LLM이 전체 바이블이 아니라 관련 story bible snippets만 참고한다.
- 세션 엔딩 후 플레이어가 해당 런의 요약 기록을 메뉴에서 조회할 수 있다.
- 해금된 특전이 다음 루프 시작 또는 초기 state에 반영된다.
- active loop를 명시적으로 load할 수 있고, ended loop는 save가 아니라 history로 보인다.

### 5. 시각/서사 후속 선택

- `[x]` 인과율/엔딩 디버그 모니터 초도 노출: Developer 뷰에서 active flags, metric score, ending condition matching 상태 확인.
- `[x]` 인과율 예약 이벤트, NPC 위치/아젠다 노출 고도화: Developer 뷰나 Codex에 NPC 아젠다 스탯 진행도와 예약 이벤트 타임라인을 시각화. (P1)
- `[x]` 실 플레이 중 이미지 per-step latency 계측: `visual_service` 내 생성 단계 시간 측정, OTel 스팬/로그 연동 및 steps 프리셋 최적화. (P1)
- `[x]` IP-Adapter/pose reference 실배선: Apple Silicon MPS 환경에서 FLUX 이미지 생성 시 캐릭터 일관성을 확보하기 위해 캐릭터 레퍼런스 이미지 경로 및 가중치 주입. (P2)

### 6. 제품화 후속 선택

- `[x]` Streamlit 이후 Web UI 경계 설계: FastAPI 등으로 HTTP/WebSocket API 구축 및 Next.js/Vite 기반 프론트엔드로의 디커플링 아키텍처 설계. (P3)
- `[x]` 원격 visual worker/storage/cloud 확장 설계: 분산 Redis Queue 비주얼 워커와 MinIO/S3 오브젝트 스토리지 통합 설계. (P3)
- `[~]` P3 Web UI 실구현 — **slice 1·2·3 완료**: `mythos_api` FastAPI `/api/v1` REST 어댑터 + WebSocket 토큰 스트리밍 + S3 presigned URL 자산 전달, optional `web` extra, `python -m mythos_api`. `tests/test_api.py`(14) 통과. 남은 slice:
  - `[x]` slice 2: WebSocket 토큰 스트리밍 `/api/v1/loops/stream` (설계 §2.2). begin/choose 이벤트를 `stream_start_loop`/`stream_choose`에 매핑, `iterate_in_threadpool` 브리지, token/snapshot/error 프레임.
  - `[x]` slice 3: S3 presigned URL 자산 전달 (설계 §5.2). 분산 visual worker(`visual_worker.py`, Redis BRPOP+heartbeat)는 기존 구현됨. `MinIOStorageAdapter.presigned_url` + `POST /api/v1/assets/resolve`로 논리 s3:// URI를 만료시간 있는 HTTPS URL로 가상화.
  - `[x]` visual_status WS 합류: WS begin/choose에 `with_image`/`visual_async` 전달, snapshot 후 `_emit_visual_status`가 씬 이미지 라이프사이클을 `visual_status`(pending→processing→succeeded+presigned url/failed) 프레임으로 스트리밍. 동기는 즉시 terminal, 비동기는 store 폴링. PoC는 "이미지" 토글로 표시.
  - `[~]` slice 4: 프론트엔드. **옵션 B(경량 PoC 레퍼런스 클라이언트) 완료** — `src/mythos_api/static/{index.html,app.js}` vanilla JS가 connect→WS begin→토큰 스트림→choose→이미지(visual_status)→combat blip을 한 화면으로 실증, FastAPI가 `/`에 직접 서빙. 결정/스펙은 `docs/plans/2026-06-03-frontend-slice4.md`.
    - `[x]` PoC UI/UX 개선(Streamlit UX 언어 참고, 빌드리스). 방안: `docs/plans/2026-06-03-poc-ux-improvement.md`. **Phase 1·2·3 + 전투 플레이어블 완료** — 녹청 터미널 팔레트·2단 레이아웃·command-card 선택지·HUD 게이지·이미지 프레임(P1); 전투 캔버스 반응형/라벨/HP/사거리 링·타입라이터(P2); 반응형/접이식 로그(P3); **전투 조작 컨트롤**(표적/공격/스킬/방어/도주·보드 클릭 이동·`combat/action` 루프·종료 배너). 브라우저 육안은 사용자 확인.
    - `[~]` PoC→Streamlit 패리티 로드맵(`docs/plans/2026-06-03-poc-parity-roadmap.md`): **S1 온보딩/세션 완료**(scenarios API·시나리오/아키타입 선택·이어하기·엔딩 배너). 남은 `[ ]` S2 Codex/기억 · `[ ]` S3 Save/Load·기록 · `[ ]` S4 전투 심화 · `[ ]` S5 오디오/시네마틱 · `[ ]` S6 Developer(선택). S3~S4에서 옵션 A 전환 재평가.
    - `[ ]` 옵션 A(별도 트랙): Next.js/Vite SPA + PixiJS Canvas 전술 보드 (설계 §3, §4). Node 툴체인·CI Node job 신설.
- `[x]` CI 도입: `.github/workflows/ci.yml` (Python 3.11 setup/lint/typecheck/test).

### 7. 레퍼런스 기반 내러티브 & 전술 피드백 반영 (Backlog)

[reference_feedback_list.md](file:///Users/men1692/.gemini/antigravity-cli/brain/b647f336-dc52-4ac3-b66b-2f71d3bef114/reference_feedback_list.md) 분석에 기반하여 차기 버전에서 대응할 백로그 항목들입니다.

- `[ ]` **자원 제약형 선택지 (Citizen Sleeper)**: `stability` / `tension` 임계값 도달 시 강제 불이익 선택지 락 또는 자원 소모형 액션 프레임워크 구축.
- `[ ]` **스탯 기반 내면 독백 분화 (Disco Elysium)**: 최고 스탯 성향에 대응하는 내면 지문을 AI GM이 생성할 수 있도록 Prompt/Context 주입기 구현.
- `[ ]` **루프 내러티브 잔향 (Slay the Princess)**: `RunSummary` 핵심 결정을 다음 루프의 `NarrativeContext`로 연계하여 NPC 반응 분화.
- `[ ]` **적 인텐트 가시화 (Into the Breach)**: `CombatService` 및 전술 보드 렌더러에 적의 다음 턴 행동 의도(Intent) 표시.
- `[ ]` **동료 전술 성향 다각화 (Shadowrun)**: `ally` 캐릭터성(서포터, 스트라이커 등)에 맞춘 커스텀 AI 전략 및 스킬 자동 가동.


## Completed Baseline

- 로컬 인프라: PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer.
- Core domain, memory store, Narrative Director, Loop Engine, Visual Service.
- Streamlit playable demo와 개발자/플레이어 뷰 분리.
- Neo-Seoul scenario/assets, Codex, autonomy/RPG stats, causality/endings.
- Redis async visual job, mflux 4-bit/8-bit performance path.
- Roguelike/CRPG 전술 전투, 작전 지도 접촉, 스킬/아이템 실행.

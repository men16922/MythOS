# Project MythOS Next Plan

작성일: 2026-05-30
최종 갱신: 2026-06-06

이 문서는 앞으로 할 일만 유지하는 rolling plan이다. 완료된 phase 상세는 `docs/COMPLETED_SUMMARY.md`, `docs/archive/progress-2026-05.md`, `docs/plans/`를 본다.

## Planning Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md`, `docs/STATUS.md`, 이 문서를 읽는다.
- 큰 작업을 시작하면 `docs/plans/YYYY-MM-DD-<topic>.md`에 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`는 짧게, 상세 이력은 필요 시 archive로 분리한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

## Immediate Priority

### 1. 서사 메모리 장기 압축 레이어 구현 (Narrative Shards Memory Rollup) — `[x]` 완료

목표: 턴 경과에 따라 비대해지는 서사 기록(`narrative_shards`)을 LLM 요약을 통해 장기 압축 및 롤업 처리하여, 컨텍스트 한계(Ollama 토큰 한계) 예방 및 장기 세션 안정성 확보.

작업:
- `[x]` 롤업 트리거 임계값 설정: 50턴 이상, shard 40개 이상, 누적 12,000자 이상.
- `[x]` `RuntimeSessionService` 내 요약 핸들러 추가 및 `PlayerMemory(kind="causality_summary")` 구조 영속화.
- `[x]` 요약 데이터(causality summary)를 `NarrativeContext`에 주입하고, 최신 raw shard만 컨텍스트에 남겨 토큰 사용량 최적화.

### 2. AI GM 서사 품질 모니터링 영속화 및 대시보드화 — `[x]` 완료

목표: Ollama JSON 스키마 파싱 실패율, degraded response, retry 횟수 등의 OTel 품질 메트릭을 DB에 영속화하고 개발자 뷰에서 가시화.

작업:
- `[x]` `narrative_metrics`를 `WorldMemory(kind="narrative_metrics")`로 집계/영속 저장.
- `[x]` 기존 `/api/v1/memory` 응답에 `narrative_metrics`를 포함하고 React SPA 개발자 콘솔(Dev Tab)에 품질 지표(Outcome Ratio) 카드 배치.

### 다음 수행/검증 필요 (2026-06-06 QA 후속) — ★ 활성

세션 2 UX·비주얼·전투 배치와 후속 E2E/Redux/worker cleanup/dev-up/Dev 탭 UI 개선 작업은 커밋 정리까지 완료됐다. 수동 QA까지 전부 통과했고, 다음 우선순위는 파티 조작 2단계와 glass-library 확장이다.

정리/릴리즈:
- `[x]` **누적 변경분 커밋 정리**: 세션 2 UX·비주얼·전투 배치, E2E 게이트 복구, Redux worker 실검증/cleanup, Dev 인프라 링크/`make dev-up`, `.codex/.mcp.json`, QA UI fix까지 기능 단위 커밋 완료.
- `[x]` **수동 QA 실행**: `docs/play-checklist.md` 기준 실제 React/API/worker/Ollama 경로 검증 완료. 기본 접속, 이어하기, 서사 기록/행동 기록, 텍스트 스트리밍, 이미지 생성 속도, Dev 탭 2열 균형 레이아웃, 전투 드래그&드롭, 패배→메인, CHARACTER 포트레이트 분기, 오프닝 연속성까지 전 항목 통과.

라이브 검증(인프라 가동 필요 — `make infra-up` + visual worker + Ollama):
- `[x]` **Redux 얼굴 일관성 실 파이프라인**: 세린 캐릭터 장면을 worker queue로 처리해 Redux(strength 0.9, portrait 레퍼런스) metadata가 기록되고 MinIO `s3://mythos-assets/...` 저장 및 presigned PNG GET 200 확인.
- `[/]` **워커 메모리/종료 모니터**: Redux 단독 512×512/4-step job은 성공(모델 로드 포함 17.3s, provider 17.1s). worker 종료 cleanup은 heartbeat owner token 유지, SIGTERM/KeyboardInterrupt lock release, Postgres pool 명시 close로 보강했고 빈 queue worker SIGTERM 검증 통과. txt2img(Flux1)+Redux(Flux1Redux) 동시 적재 스왑/멈춤 재발 여부는 아직 장기 플레이로 추가 확인 필요.
- `[x]` **visual-work 자동 삭제** 실 워커 경로 동작 확인(업로드 후 `outputs/visual-work/<loop>/<scene>.png` 및 빈 loop dir 제거), **512 이미지 속도** 라이브 재측정(Redux cold 17.3s).
- `[x]` **오프닝 연속성** 라이브 LLM 재확인 완료(turn 0~2가 비 오는 C-17/세린으로 이어지고 변전소로 리셋되지 않음).

자동/회귀:
- `[x]` **`make test-e2e` 재실행**: 부트 인트로/세션 시네마틱 dismiss 단계와 fallback/no-image E2E URL 모드를 반영한 `run_playwright_test.py`로 통과 확인. 실패 시 non-zero exit와 `outputs/e2e_failure.png` 진단 스크린샷을 남기도록 보강.

수동 QA(`docs/play-checklist.md` 신규 항목):
- `[x]` 기본 접속/부트 오프닝, 이어하기, 서사 기록 오버레이/직전 1개 인라인, 장면별 "내 행동" 표시, 텍스트 스트리밍 속도, 이미지 생성 속도.
- `[x]` Dev 탭 UI: 로컬 인프라 콘솔 세로 배치 확인, 개발자 콘솔 동일 폭 2열 카드 레이아웃 재확인 완료.
- `[x]` 전투 드래그&드롭, 전투 패배→메인 화면 버튼, CHARACTER 포트레이트 분기(대화상대 등장), 오프닝 연속성 라이브 LLM 재확인 완료.

다음 구현 (우선순위 순):
- `[~]` **전투 연출 개편: 다키스트 던전식 캐릭터 아트 + 스킬 애니메이션 (★ 활성)** — `docs/plans/2026-06-06-combat-darkest-dungeon-presentation.md`. 추상 무기 컷인 → 캐릭터 아트 주인공 + role/tags 구동 스킬 애니메이션 + 아이콘 액션바. **그리드 엔진 무변경**(연출·UI·직렬화 계층만). 화면구조(그리드 위 스프라이트)·아트(생성)·애니메이션(role+tags) 방향 사용자 확정.
  - `[x]` 선행: **전투 빈 화면 수정 + log/지형 직렬화 배선** — 전투 스냅샷에 `log`/`elevations`/`covers`/`hazards` 추가(`serialize_combat_log`·`CombatTurnResult`·`session`), 프론트 `combat.log` 가드 + `CombatCinema` `useEffect` deps 버그 차단. build/lint/typecheck/`make test`(202) 통과.
  - `[x]` Phase 0: 백엔드 스킬 메타 노출 — `engine._skill_action_info()`로 `available.skills`에 `role/tags/name/cost/range` 직렬화, `types.ts CombatSkillInfo` 확장. 런타임 확인 + 테스트 통과.
  - `[ ]` Phase 1: 전투포즈 캐릭터 아트 생성(mflux Redux, portrait=레퍼런스) → `characters/combat/`·`enemies/combat/`, blip `combat_portrait` 직렬화 + portrait 폴백. **FLUX/MPS 환경 필요.**
  - `[ ]` Phase 2: 보드 원형 blip → 서있는 캐릭터 스프라이트(`combatCanvas.ts`, Y-sort/그림자). reduced-motion 정적 경로 유지.
  - `[ ]` Phase 3: role+tags 구동 스킬 애니메이션 레지스트리(`combatAnim.ts`) — 슬래시/사격/블링크/힐/실드. 컷인은 치명타/처치 등 특별 순간으로 강등/대체.
  - `[ ]` Phase 4: SVG 아이콘 → 액션 버튼(`combatIcons.tsx` + `CombatControls` 아이콘+툴팁+비용/CD 배지).
  - `[ ]` Phase 5: reduced-motion/E2E/빌드·린트·타입·테스트 + 라이브 QA.
- `[ ]` **전투 이펙트 개선 (시각적)** — `docs/plans/2026-06-06-combat-visual-effects.md`. 클라이언트 스냅샷 diff → rAF 애니메이션 큐로 이동/공격/피격/사망/**스킬(role·tags 기반)** 연출 + SFX 임팩트 동기. 백엔드 무변경(Phase 1), instant/reduced-motion 경로로 E2E 보호. **승인 게이트 없음 — 선행 착수 가능.**
  - `[x]` Phase 1: rAF 루프 + `combatDiff`(prev→next 순수 diff) + 이동/데미지/힐 트윈 + 데미지 숫자/임팩트 플래시 + HP 바 드레인 + 사망 페이드 + 스킬 캐스트 커넥터 + SFX 임팩트 동기. **가해자 추론**으로 적/동료 공격도 lunge/트레이서(라이브 컨펌). 라이브 점검용 **전투 시뮬레이터**(온보딩 화면) 추가. instant/reduced-motion 경로로 E2E 보호. `make frontend-build`·lint·mypy·`make test-e2e`(스크래치+전투 체크리스트)·`test_api`(25) 통과.
  - `[ ]` Phase 1 후속(선택): JS 테스트 러너(vitest) 도입 후 `combatDiff` 단위 테스트, 라이브 플레이 시각 QA.
  - `[ ]` Phase 2: 공격 lunge/슬래시·임팩트 파티클·사망 디졸브·hit-stop·스크린 셰이크(파티 조작 2단계 이후 권장).
  - `[ ]` Phase 3(선택): 백엔드 전투 이벤트 로그(crit/miss/multi-hit 정밀 연출).
- `[ ]` **진행도 해금: 아키타입·스킬·Codex Skill 트리** — `docs/plans/2026-06-06-progression-skills-archetypes.md`. **확정 모델: 하이브리드**(깨달음 이벤트가 스킬 해금 → 통찰 포인트로 Codex 트리에서 습득/강화). Ghost만 시작·나머지 아키타입 진행도 해금, Ghost+세린 오프닝=첫 튜토리얼→이후 시나리오 개방, 캐릭터 맞춤 기본 스킬→이벤트 획득. 기존 `meta_progression` 버킷 확장.
  - `[ ]` Phase 1: 아키타입 해금 게이트 + base/learned 스킬 필터(`combat_service`) + Codex Skill 탭(효과 표시·이벤트 해금만).
  - `[ ]` Phase 2: 통찰 포인트 + 스킬트리 투자(습득/강화 엔드포인트, 선행 노드 게이팅).
  - `[ ]` Phase 3: 깨달음 서사 연출 + 시나리오 간 진행 개방 UX.
- `[ ]` **파티 조작 2단계** 구현: `docs/plans/2026-06-06-party-controllable-allies.md`(파티원=플레이어 조작 / 우호적 비파티=AI 동맹). 전투 엔진·UI 리팩터 — 설계 승인 시 단계별 PR.
- `[ ]` `glass-library` Story Bible/시나리오 스크립트 확장 및 멀티 시나리오 회귀 플레이.

### 소스 품질 체크 — `[x]` 완료

작업:
- `[x]` `make lint`, `make typecheck` 기준 Python 코드 품질 확인.
- `[x]` Narrative Shards Memory Rollup 경계값 리팩토링: `retention=0`에서도 오래된 shard 전체가 정상 롤업되도록 split helper 추가.
- `[x]` Narrative Outcome Metrics 응답 shape 안정화: 4개 outcome key를 항상 포함하도록 count/ratio 정규화.

### 3. 전투화면 단일 iframe 재구성 (flicker/흰박스 근본 해결) — `[x]` 완료

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
- `[x]` P3 Web UI 실구현 — **완료**: `mythos_api` FastAPI `/api/v1` REST 어댑터 + WebSocket 토큰 스트리밍 + S3 presigned URL 자산 전달, optional `web` extra, `python -m mythos_api`. `tests/test_api.py` 통과.
  - `[x]` slice 2: WebSocket 토큰 스트리밍 `/api/v1/loops/stream` (설계 §2.2). begin/choose 이벤트를 `stream_start_loop`/`stream_choose`에 매핑, `iterate_in_threadpool` 브리지, token/snapshot/error 프레임.
  - `[x]` slice 3: S3 presigned URL 자산 전달 (설계 §5.2). 분산 visual worker(`visual_worker.py`, Redis BRPOP+heartbeat)는 기존 구현됨. `MinIOStorageAdapter.presigned_url` + `POST /api/v1/assets/resolve`로 논리 s3:// URI를 만료시간 있는 HTTPS URL로 가상화.
  - `[x]` visual_status WS 합류: WS begin/choose에 `with_image`/`visual_async` 전달, snapshot 후 `_emit_visual_status`가 씬 이미지 라이프사이클을 `visual_status`(pending→processing→succeeded+presigned url/failed) 프레임으로 스트리밍. 동기는 즉시 terminal, 비동기는 store 폴링. PoC는 "이미지" 토글로 표시.
  - `[x]` slice 4: 프론트엔드. **Vite + React + TypeScript SPA 완료** — `src/mythos_ui` 리소스가 `connect`→WS begin→토큰 스트림→choose→이미지(visual_status)→전투 캔버스 조작/이동/행동 루프/로스터/로그/결과→Codex 탭(단서/로어/인벤토리/캐릭터/잔향)➔저장/로드 슬롯·기록 보관소➔Developer 인과율 모니터 뷰까지 전체 구현.
    - `[x]` PoC UI/UX 개선(Streamlit UX 언어 참고, 빌드리스). 방안: `docs/plans/2026-06-03-poc-ux-improvement.md`. **Phase 1·2·3 + 전투 플레이어블 완료**.
    - `[x]` PoC→Streamlit 패리티 로드맵(`docs/plans/2026-06-03-poc-parity-roadmap.md`): **S1~S6 전체 완료** (S1 온보딩/세션, S2 Codex/기억, S3 Save/Load·기록, S4 전투 심화, S5 오디오/시네마틱, S6 Developer 인과율 모니터).
    - `[x]` 옵션 A: Vite + React + TS SPA 전술 보드, Codex, Dev 뷰 통합 렌더러로 전환 완료.
- `[x]` CI 도입: `.github/workflows/ci.yml` (Python 3.11 setup/lint/typecheck/test).
- `[x]` Playwright E2E 브라우저 테스트 자동화: `scratch/run_playwright_test.py` 스크립트 작성 및 `make test-e2e` 단축 명령어 통합 완료.

### 7. 게임플레이 깊이 — 레퍼런스 기반 내러티브 & 전술 (★ 활성 우선순위)

**현재 우선 트랙이다.** 공유 계층(엔진/내러티브/전투)을 깊게 만드는 작업이라 Streamlit(현 플레이 레이어)과 API 버전에 동시 반영된다. UI 표면은 이미 풍부하므로, 플레이 깊이를 높이는 데 집중한다. (두 프론트 차이: `docs/STREAMLIT_VS_API.md`)

우선순위:

- `[x]` **P1 — 루프 내러티브 잔향 (Slay the Princess)**: `RunSummary` 핵심 결정을 다음 루프의 `NarrativeContext`로 연계하여 NPC 반응/씬 분화. 루프형 게임 정체성의 핵심. 백엔드(narrative/runtime) 중심, 양쪽 프론트 자동 반영.
- `[x]` **P2 — 자원 제약형 선택지 (Citizen Sleeper)**: `stability`/`tension` 임계값 도달 시 강제 불이익 선택지 락 또는 자원 소모형 액션 프레임워크. 스테이크/긴장 부여.
- `[x]` **P3 — 적 인텐트 가시화 (Into the Breach)**: `CombatService`가 적의 다음 턴 의도(Intent)를 노출하고, 전투 보드(Streamlit iframe + API radar)에 렌더. 전술 깊이.
- `[x]` **P4 — 스탯 기반 내면 독백 분화 (Disco Elysium)**: 최고 스탯 성향에 대응하는 내면 지문을 AI GM이 생성하도록 Prompt/Context 주입.
- `[x]` **P4 — 동료 전술 성향 다각화 (Shadowrun)**: `ally` 캐릭터성(서포터/스트라이커)에 맞춘 커스텀 AI 전략·스킬 자동 가동. (동료 자동 힐/회피는 이미 구현됨 — 성향 분화가 후속.)
- `[x]` **Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days)**: 시간(턴) 경과 게이지(Temporal Decay Tracker), 구역 위험도 및 단서 수집 게이지 Streamlit 및 PoC 웹 UI 렌더링, 이동 중 조우(Travel Encounters) 및 리소스 임계점 위기 상황(Emergency Encounters) 연계 완료.

> §6 PoC→Streamlit 패리티(S2~)는 **보류**(필요 시 기회적). 순수 단일 프론트 UI 폴리시는 회수가 낮으므로 깊이 작업 이후로 미룬다.


## Completed Baseline

- 로컬 인프라: PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer.
- Core domain, memory store, Narrative Director, Loop Engine, Visual Service.
- Streamlit playable demo와 개발자/플레이어 뷰 분리.
- Neo-Seoul scenario/assets, Codex, autonomy/RPG stats, causality/endings.
- Redis async visual job, mflux 4-bit/8-bit performance path.
- Roguelike/CRPG 전술 전투, 작전 지도 접촉, 스킬/아이템 실행.

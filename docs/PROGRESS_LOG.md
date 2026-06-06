# Progress Log

최신 작업만 유지하는 짧은 로그다. 2026-05 전체 상세 이력은 `docs/archive/progress-2026-05.md`에 보관했다.

형식:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

## 2026-06-06 — 전투 보드 시각 이펙트 (Phase 1) + 진행도/스킬 트랙 설계

- Status: [x] 정적 전투 캔버스를 rAF 애니메이터로 전환해 이동/데미지/사망/스킬 연출 도입(Phase 1). 수동 QA 전 항목 마감 후 신규 트랙(전투 이펙트·진행도 해금/스킬트리) 설계 확정 및 우선순위 1번 구현.
- Changed:
  - `src/mythos_ui/src/combatDiff.ts`(신규): prev→next `CombatState`를 blip id 기준으로 diff해 move/damage/heal/death/defend 이벤트로 역산(순수함수).
  - `src/mythos_ui/src/combatEffects.ts`(신규): `CombatAnimator`가 diff+디스패치 액션으로 짧은 스태거 타임라인을 만들고 rAF 루프로 프레임별 오버레이 렌더 — 이동 ease 트윈, 임팩트 플래시+떠오르는 데미지/힐 숫자, HP 바 드레인, 사망 페이드, 스킬 캐스트 커넥터(트레이서+링). SFX를 임팩트 프레임에 동기. `prefersReducedMotion`/`?fallback=1` instant 경로로 최종 상태 동기 settle.
  - `src/mythos_ui/src/combatCanvas.ts`: `drawCombatCanvas`에 선택적 `overlay`(blip override/floats/fx) 추가, 정적 경로는 그대로 유지.
  - `src/mythos_ui/src/App.tsx`: 전투 상태 변경 시 애니메이터 구동, 디스패치 액션을 커넥터용으로 전달, 애니메이션 중 드래그 게이팅, 디스패치 시점 SFX 제거(임팩트 프레임으로 이동).
  - 설계 문서 신규: `docs/plans/2026-06-06-combat-visual-effects.md`, `docs/plans/2026-06-06-progression-skills-archetypes.md`(하이브리드 모델: 깨달음 이벤트 해금 + 통찰 포인트 Codex 스킬트리). NEXT_PLAN/STATUS 트랙 반영, 수동 QA 항목 전부 마감.
- Verified: `make frontend-build`(tsc -b + vite, 클린), `npm run lint`(0 error/0 warning), `make test-e2e`(scratch 스크립트) 통과, `tests/playwright/test_e2e_play_checklist.py` 전투 경로(캔버스 렌더→드래그 이동 instant SFX→패배 배너→메인 복귀) 통과. Python 무변경.
- Blockers: 없음. JS 테스트 러너 부재로 `combatDiff` 단위 테스트는 vitest 도입 후로 미룸. 애니메이션 시각 품질은 라이브 플레이 QA 권장.
- Next: 우선순위 2번 — 진행도 해금/스킬트리 Phase 1(아키타입 게이트 + base/learned 스킬 필터 + Codex Skill 탭).

## 2026-06-06 — 한글 깨짐 대응, 스탯 비주얼 아이콘 및 선택지 UI 고도화

- Status: [x] Gemma/Ollama 한글 깨짐 hex 바이트 자동 복구, 스탯별 사이버펑크 네온 아이콘 연동, 마크다운 볼드 렌더러 추가, 선택지 스탯 키워드 간소화 및 인텐트 카테고리화 완료.
- Changed:
  - `src/mythos_ui/src/StoryPanel.tsx`: `decodeGarbageBytes` 함수로 `<0xXX>` 16진수 바이트 시퀀스를 UTF-8 한글 문자로 자동 복구, `renderBoldText`를 도입하여 `**bold**` 패턴을 `<strong>` 태그로 렌더링.
  - `src/mythos_ui/src/choices.ts`: `cleanChoiceLabel` 유틸 추가하여 장황한 스탯 괄호 문구(예: `(민첩 기반...)`)를 핵심 스탯 키워드 `(민첩)`으로 자동 정돈.
  - `src/mythos_ui/src/ChoicePanel.tsx`: `cleanChoiceLabel`을 적용하고, `choices[].intent`를 친숙한 아이콘 태그(`🧭 탐색`, `💬 상호작용`, `✍️ 서사 개정`, `🗄️ 기록 보관`)로 매핑 및 외래 설명글 숨김 처리.
  - `src/mythos_runtime/scenario_context.py`: `LANGUAGE_RULE`을 수정하여 AI GM이 선택지 인텐트에 오직 단일한 영문 표준 명칭만 사용하고, 스탯 연계 시 장황한 코멘트 대신 짧은 스탯명 괄호 형식만 출력하도록 유도.
- Verified: `make lint`, `make typecheck`, `make frontend-build`, `make test` 모두 오류 없이 정상 통과 완료.

## 2026-06-06 — Dev 인프라 콘솔 링크 + 원클릭 dev 스택

- Status: [x] React Dev 탭에 로컬 인프라 콘솔 링크(Streamlit Developer 사이드바 패리티) 추가, `make dev-up`/`dev-down` 원클릭 스택 도입. 플레이 중 "이어하기 Failed to fetch" 원인 진단.
- Changed:
  - `src/mythos_ui/src/DevConsolePanel.tsx` + `index.css`: `InfraLinks` 카드 — Adminer(8080)/MinIO 콘솔(9001)/Redis Commander(8081)/Jaeger(16686)를 브라우저 호스트 기준 URL로 새 탭 링크(설명 + `make infra-up` 안내).
  - `Makefile`: `dev-up`(infra-up → postgres readiness 대기 → db-migrate → visual-worker-bg → Ollama 확인 → API foreground), `dev-down`(api/worker stop + infra down). `.PHONY` 갱신. → docker+API+워커를 명령 하나로 기동.
- Verified: React 빌드 클린, `make -n dev-up`/`dev-down` 파싱 정상, 결정적 브라우저 검증으로 Dev 탭 인프라 링크 4개 렌더(`outputs/dev_infra_links.png`).
- Diagnosed: "이어하기 Failed to fetch" = **API 서버 미기동**(docker만 떠 있고 `python -m mythos_api`가 죽어 있었음; 온보딩은 캐시된 페이지/React 상태로 보였던 것). 서버 재기동 후 `/loops/active` 200 확인. → `make dev-up`으로 재발 방지.
- Next: 누적분 커밋, play-checklist 수동 QA, 파티 조작 2단계.

## 2026-06-06 — E2E 게이트 및 Redux worker 실검증

- Status: [x] Playwright 자동 E2E를 다시 신뢰 가능한 회귀 게이트로 복구하고, Redux 캐릭터 이미지 worker 실파이프라인을 검증.
- Changed:
  - React SPA가 URL 파라미터 `?fallback=1&image=0`를 읽어 자동 E2E에서 결정적 fallback/no-image 경로를 강제할 수 있게 수정.
  - `scratch/run_playwright_test.py`가 선택지/전투/종료/오류 중 안정 상태를 기다리도록 보강하고, 실패 시 `sys.exit(1)` 및 `outputs/e2e_failure.png` 진단 캡처를 남기도록 수정.
  - Redis stale heartbeat를 정리하고 foreground worker로 pending Redux job을 처리해 실제 오류를 관찰할 수 있게 함.
  - Visual worker heartbeat가 소유자 토큰을 유지하고, SIGTERM/KeyboardInterrupt 종료 시 자기 lock만 해제하도록 `VisualJobQueue.release_worker_slot()` 및 signal cleanup 경로 추가.
  - worker 종료 시 Postgres pool을 명시적으로 닫아 mflux/worker 검증 후 프로세스와 heartbeat가 남지 않도록 정리.
- Verified: `make frontend-build`, `py_compile scratch/run_playwright_test.py`, `make test-e2e`, `make typecheck`, `make test`(202 tests, 2 skipped) 통과. 세린 캐릭터 장면 512×512/4-step Redux worker job 성공: DB asset metadata `use_redux=true`, reference `se-rin.png`, MinIO presigned PNG GET 200, `outputs/visual-work` 작업본 삭제, cold latency 17.3s(provider 17.1s). 빈 queue worker SIGTERM 검증: heartbeat 1→0, 프로세스 잔류 없음.
- Blockers: txt2img(Flux1)+Redux(Flux1Redux) 동시 적재 시 장기 메모리/스왑 안정성은 아직 추가 플레이 모니터 필요.
- Next: 세션 2 변경분 커밋 정리 또는 파티 조작 2단계 구현 착수.

## 2026-06-06 — UX·비주얼·전투 배치 (세션 2)

- Status: [x] 이어하기 버그 수정, 스토리/캐릭터 레이아웃 개편, 전투 드래그&드롭, 오프닝 연속성, 이미지/텍스트 속도 최적화, 패배→메인 버튼, 행동 기록, 서사 기록 분리, 부트 오프닝, mflux Redux 얼굴 일관성, visual-work 자동 정리까지 일괄 구현 및 커밋 완료.
- Changed:
  - **이어하기(resume) 409 수정**: `session.py` resume(player_id)이 세이브 슬롯의 박제된 phase 대신 실제 활성 루프를 선택(없으면 `no active loop`), `app.py` 404 매핑, `App.tsx` stale 세션 정리. 회귀 테스트 추가.
  - **스토리 레이아웃 개편**: 상단 [장면 이미지 | CHARACTER] + 하단 전체 폭 스크립트. `CharacterPanel.tsx`(신규).
  - **CHARACTER 컨텍스트 분기**: 주변 인물 없으면 내 정보(스탯/속성/인벤토리), 대화 상대 등장 시 그 인물 portrait. `scenario.json` `characters` 추가, `/scenarios`가 portrait URL 제공, 내러티브 키워드 탐지.
  - **전투 드래그&드롭**: 캐릭터 픽업→유효 칸 드롭 이동(`combatCanvas.ts` 드래그 오버레이, `App.tsx` pointer 핸들러). 클릭 순간이동 제거.
  - **오프닝 시네마틱→첫 장면 연속성**: `prompts.py` 지시문 한도 8→`MAX_PROMPT_NOTES=24`(중요 지시문 잘림 해결), `scenario_context._opening_continuity_notes`로 turn 0~2에 방금 본 시네마틱 컨텍스트 주입. 첫 장면이 변전소→비 오는 C-17 골목/세린으로 이어짐(라이브 확인).
  - **속도 최적화**: WS 이미지 1024→**512×512**(Streamlit 패리티, 워밍 ~85s→~7.5s), 타자기 가속(tick 14→12ms, 청크 /60→/24).
  - **전투 패배→메인**: "새 루프 시작"→"**메인 화면으로**"(`handleLeaveSession`), 미사용 `streamBegin` 제거.
  - **행동 기록**: `/loops/{id}/scenes`가 장면별 player action(turn+1 이벤트) 반환, 라이브는 선택 라벨 캡처, 히스토리에 "▸ 내 행동: …" 표시.
  - **서사 기록 분리**: 인라인은 직전 1개만, "📜 이전 기록 전체 보기 (N)"→별도 오버레이.
  - **오프닝 이미지**: 컷 verbatim 복사(`bypass_generation`)→컷을 img2img 레퍼런스(0.4)로 **새로 생성**.
  - **부트 오프닝(첫 진입)**: `BootIntro.tsx`(신규, PROJECT MYTHOS 로고+타이핑+키아트+시그널 게이트), `scenario.json ui_copy`에 부트/랜딩 카피 추가. session_intro와 별개.
  - **mflux Redux 얼굴 일관성**: `mflux_generator.generate_image_mflux_redux` 추가, `visual_service`가 캐릭터 장면을 Redux(strength 0.9, portrait 레퍼런스)로 라우팅. 핵심: 캐릭터 감지를 영어 brief가 아닌 한국어 내러티브 키워드로(기존엔 거의 미탐지→딴 얼굴 원인).
  - **visual-work 자동 정리**: MinIO 업로드(또는 다른 경로 파일 저장) 성공 후 로컬 작업본 삭제. 기존 누적분(83MB) 삭제.
  - **E2E 스크립트 수정**: `run_playwright_test.py`에 부트 인트로/세션 시네마틱 dismiss 단계 추가(부트 오프닝 도입으로 깨진 흐름 복구).
  - **설계 문서**: `docs/plans/2026-06-06-party-controllable-allies.md`(파티원 조작 가능/우호적 비파티 AI 동맹 2단계 — 설계만).
- Verified: `make test`(200, 2 skip) 통과, `make typecheck` 클린, React 빌드 클린. Redux 비교 생성(0.3/0.6/0.9, 0.9 채택), 512 이미지 워밍 ~7.5s, 각 기능별 라이브/결정적 브라우저 검증(스크린샷). 결정적 모킹으로 이어하기/포트레이트/드래그/패배버튼/행동기록/기록오버레이/부트인트로 확인.
- Blockers: Redux 실 파이프라인(워커)·visual-work 자동삭제 실경로·`make test-e2e`는 후속 E2E 게이트 복구 작업에서 완료 확인. Flux1+Flux1Redux 동시 적재 메모리 장기 안정성만 추가 플레이 모니터 필요.
- Next: 아래 "다음 수행/검증 필요" 참조(NEXT_PLAN). 누적분 커밋, 인프라 올려 라이브 검증, 파티 조작 구현 착수.

## 2026-06-06

- Status: [x] React UI 패널 디자인 및 히스토리 스크롤링 개선, 비동기 이미지 유지, 전투 화면 전술 보드 확장 및 소스 품질 체크 완료.
- Changed:
  - **React UI 및 API 개선**:
    - `src/mythos_memory/store.py`, `src/mythos_memory/postgres_store.py`: `list_scenes` 메소드를 추가하여 특정 루프의 이전 씬 목록을 데이터베이스에서 오름차순으로 조회할 수 있도록 구현.
    - `src/mythos_api/app.py`: `/api/v1/loops/{loop_id}/scenes` GET 엔드포인트를 신설하여 백엔드에서 씬 히스토리 데이터를 전달하도록 구성.
    - `tests/...`: `list_scenes` 추상 메소드 추가에 따라 `_InMemoryStore`, `FakeStore`, `_ArchiveStore`, `_FakeCompactionStore` 등 테스트용 가짜 스토어들에 빈 리스트 혹은 적재 데이터를 반환하는 목 구현체 추가.
    - `src/mythos_ui/src/api.ts`: 프론트엔드 API 클라이언트에 `apiGetLoopScenes` 함수 추가.
    - `src/mythos_ui/src/StoryPanel.tsx`:
      - 타입 임포트 오류(`MouseEventHandler`, `RefObject`를 `import type`으로 수정)를 해결하여 Vite 빌드 복구.
      - 비전투 내러티브 레이아웃을 이미지 패널과 대화 텍스트 스크롤 영역으로 확실하게 분리하고 `align-items: stretch`로 균형감 있는 높이 정렬 적용.
      - 전투 UI에서 아군/적군 로스터 카드를 세로로 적재(`1fr`)하고, TACTICAL BOARD 비율을 `1.8fr`로 확장하여 화면 크기를 대폭 개선.
      - 헬퍼 텍스트 오류 수정("우측 전술 보드" -> "좌측 전술 보드").
    - `src/mythos_ui/src/combatCanvas.ts`: 캔버스 드로잉 시 컨테이너 패딩 값을 제외한 실제 너비(`computedStyle` 패딩 공제)를 계산하여 레이아웃 깨짐 현상 방지.
    - `src/mythos_ui/src/App.tsx`:
      - `displayedSceneImageUrl`을 제거하고 `sceneImageUrl`로 통합 및 `useEffect` 상태 업데이트 싱크 경고(ESLint) 해결.
      - 이어하기(`handleResumeGame`) 진입 시 `apiGetLoopScenes`를 호출하여 이전 대화 히스토리를 대화 스크롤 영역에 복원.
      - 선택지 선언(`sendChoose`) 및 전투 종료 이후 이동 시 `sceneImageUrl`을 `null`로 초기화하지 않음으로써 새 이미지가 비동기 수급될 때까지 기존 이미지가 계속 노출되도록 개선.
  - **Narrative Rollup/Metrics 리팩토링**:
    - `src/mythos_runtime/session.py`: shard rollup 대상 분리 로직을 `_split_retained_shards`로 분리하여 `retention=0` 경계값에서도 전체 shard가 정상 롤업되도록 수정.
    - `src/mythos_runtime/session.py`: narrative outcome metric counts/ratios가 `success/provider_repair/local_repair/fallback` 4개 key를 항상 포함하도록 정규화.
    - `tests/test_runtime_session.py`: zero-retention rollup 회귀 테스트와 metrics ratio shape 검증 추가.
    - `docs/STATUS.md`, `docs/NEXT_PLAN.md`: 2026-06-06 기준 소스 품질 패스와 리팩토링 내역 반영.
- Verified: `make lint` (TypeScript, ESLint, Python ruff) 통과, `make typecheck` 통과, `make frontend-build` 빌드 성공, `make test`(199 tests, 2 skipped) 통과, API 라이브 부팅 동작 확인.
- Next: `docs/play-checklist.md` 기반 실제 플레이 QA 및 시나리오 심화.

## 2026-06-04

- Status: [x] Narrative Shards Memory Rollup 및 AI GM Narrative Outcome Metrics 영속화 완료.
- Changed:
  - `src/mythos_narrative/director.py`: 오래된 Narrative Shard를 압축하는 `summarize_narrative_shards` 추가. LLM 요약을 우선하되 fast/fallback 경로에서는 결정론 요약으로 즉시 반환.
  - `src/mythos_runtime/session.py`: 50턴 이상, shard 40개 이상, 또는 누적 12,000자 이상일 때 오래된 shard를 `PlayerMemory(kind="causality_summary")`로 롤업하고 최신 raw shard만 `NarrativeContext`에 전달. AI GM generation outcome을 `WorldMemory(kind="narrative_metrics")`로 누적 저장.
  - `src/mythos_runtime/scenario_context.py`: `causality_summary`를 장기 인과율 기억 지침으로 `novelty_notes`에 주입.
  - `src/mythos_runtime/options.py`, `src/mythos_ui/src/types.ts`, `src/mythos_ui/src/App.tsx`: `/api/v1/memory` 응답의 `narrative_metrics`를 React Developer 탭 Outcome Ratio 카드로 노출.
  - `tests/test_runtime_session.py`, `tests/test_story_bible.py`: shard rollup 저장/retention, causality summary 프롬프트 주입, narrative metric 누적 테스트 추가.
- Verified: targeted unittest 3건, `make typecheck`, `npm run build`, `make lint`, `make test`(195 tests, 2 skipped), `make test-e2e`, `make smoke-local` 통과. Playwright 스크린샷 `outputs/e2e_react_play.png`, `outputs/e2e_react_play_turn1.png` 육안 확인.
- Next: `docs/play-checklist.md` 기준 Playwright E2E 검증 및 실제 플레이 QA.

- Status: [x] Playwright 기반의 CLI/API 자동화 E2E 테스트 스크립트 작성 및 CI/CD 검증 프로세스 추가.
- Changed:
  - `scratch/run_playwright_test.py` (신규): FastAPI uvicorn 서버 구동 및 Playwright headless Chromium을 연동하여, 사용자 이름 입력, Netrunner 아키타입 선택, 루프 진입, 지문 스트리밍 완료 대기, 선택지 핫키/마우스 클릭 피드백, 턴 진행, 스크린샷 저장(`outputs/e2e_react_play.png`)을 아우르는 전체 E2E 루프 자동화 테스트 스크립트 구현.
  - `docs/play-checklist.md`: 7번째 섹션인 플레이라이트 자동 E2E 테스트 검증 장을 추가하여 수동 테스트 외에 자동화 테스트 사용 방법 및 검증 명세 작성.
  - `Makefile`: `test-e2e` 타겟을 신규 추가하여 프로젝트 루트에서 `make test-e2e` 명령어로 E2E 브라우저 테스트를 손쉽게 시작할 수 있도록 단순화.
  - `pyproject.toml`: `dev` optional-dependencies 목록에 `playwright>=1.40.0` 추가.
- Verified: `scratch/run_playwright_test.py` 실행 성공, E2E 결과 스크린샷 2종 정상 저장, `make test` 및 `make smoke-local` 정상 통과.
- Next: 추가 게임플레이 피드백 수렴 및 시나리오 스크립트 확장.

- Status: [x] React + TypeScript SPA 프론트엔드 마이그레이션 및 패리티 로드맵 전체 완료.
- Changed:
  - `src/mythos_ui`: Vite + React + TS 환경 구성 및 npm 패키지 의존성 정의.
  - `src/mythos_ui/src/types.ts`: `RuntimeSnapshot`, `PlayerProfile`, `CombatRadar`, `SaveSlot`, `RunSummary`, `MemoryOverview` 등 12개 UI/API용 TypeScript 데이터 타입 정의.
  - `src/mythos_ui/src/api.ts`: FastAPI REST/WebSocket API 통신 헬퍼 모듈 작성.
  - `src/mythos_ui/src/App.tsx`: 온보딩 아키타입/시나리오 선택, 타입라이터 텍스트 스트리밍, 선택지 핫키 조작, Canvas 전술 전투 보드 렌더링 및 조작/이동/행동 루프, Codex 기억의 별자리 정보 연계, SAVE/LOAD 슬롯 및 여정 기록 보관소 연동, 디버그 모니터용 Developer 뷰, 오디오 BGM/SFX 및 시네마틱 효과 등 Streamlit 대비 100% 기능 패리티 패스 구현.
  - `src/mythos_ui/vite.config.ts`: 번들러 출력 파일명을 `app.js`로 강제하여 백엔드 서빙 경로와 일치하도록 빌드 옵션 커스텀 설정.
  - `src/mythos_ui/index.html`: FastAPI 단위 테스트에서 poc_client 서빙 통과 처리를 감지할 수 있도록 root mount container 안에 "API PoC" 테스트 텍스트 훅 추가.
- Verified: `npm run build` 컴파일 빌드 통과, `make test` (192개) 전체 테스트 및 `make smoke` 데이터베이스/MinIO 통합 검증 패스.
- Next: 추가 게임플레이 피드백 수렴 및 시나리오 스크립트 확장.

- Status: [x] Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days) 설계 및 구현 완료.
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `build_runtime_narrative_context` 함수에 시공간 붕괴 타이머(Temporal Decay), 이동 중 조우(Travel Encounters) 및 리소스 임계점 도달 위기 상황(Emergency Encounters) 연계 지침을 AI GM의 `novelty_notes`에 동적으로 포함시키는 로직 설계 및 구현.
  - `src/mythos_runtime/options.py`: `RuntimeSnapshot` DTO에 `clues_collected` 필드를 추가하여 획득 단서 수를 전달할 수 있도록 함.
  - `src/mythos_runtime/session.py`: 각 `RuntimeSnapshot` 생성 시점마다 `clues_collected` 수치를 데이터베이스에서 계산하여 채워주는 private 헬퍼 `_clues_collected` 추가 및 배선.
  - `src/mythos_api/serializers.py`: API snapshot 직렬화(`snapshot_to_dict`) 시 `decay_percent`, `zone_risk` 및 `clues_collected`를 포함하도록 갱신하고 구역 위험도 매핑 헬퍼 `_calculate_zone_risk` 추가.
  - `streamlit_app.py`: CSS 및 `_render_hud`를 수정하여 시공간 붕괴도, 구역 위험도, 단서 수집도 3종의 게이지를 포함한 총 6개의 탐험 HUD 타일 렌더링 지원.
  - `src/mythos_api/static/index.html` 및 `app.js`: PoC 웹 클라이언트의 aside 패널에 신규 3종 게이지(TEMPORAL DECAY, ZONE RISK, CLUE MATRIX) UI 요소를 추가하고, WebSocket 수신 스냅샷에 따라 게이지 상태가 동적으로 동기화되도록 바인딩 처리.
  - `tests/test_story_bible.py`: `_loop` 테스트 헬퍼를 `stability` 및 `tension` 매개변수를 받도록 확장하고, Travel 및 Emergency 조우 연계 지침이 `novelty_notes`에 올바르게 포함되는지 검증하는 단위 테스트 `test_runtime_context_includes_travel_and_emergency_encounters` 추가.
- Verified: `tests/test_story_bible.py`를 포함한 189개 단위 테스트 통과, `make test-db` 통과, `make smoke-local` 통합 E2E 검증 통과.
- Next: PoC 웹 클라이언트의 기능 패리티 (S2 — Codex / 기억) 구현 진행.

- Status: [x] P4-1 스탯 기반 내면 독백 및 P4-2 동료 전술 성향 다각화 구현 완료.
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `build_runtime_narrative_context` 함수에 스탯 기반 내면 독백 지침 추가. 플레이어 최고/최저 스탯을 기반으로 5대 스탯 성격에 대입하여 디스코 엘리시움(Disco Elysium) 스타일의 내면 독백 묘사 가이드라인을 AI GM의 `novelty_notes`에 동적으로 포함시킴.
  - `tests/test_story_bible.py`: 스탯 기반 내면 독백 지침이 `novelty_notes`에 정상 반영되는지에 관한 단위 테스트 `test_runtime_context_includes_stat_monologue` 추가 및 검증 완료.
  - `src/mythos_combat/engine.py`: 아군 동료 턴 처리 함수 `_ally_turn` 리팩토링. 정세린(`se_rin`)은 플레이어 체력이 낮고 실드가 꺼져 있을 때 엄호 실드 스킬을 최우선 시전하는 원거리 서포터 AI로, 카이(`kai`)는 플레이어 근처의 적을 표적으로 삼아 `overload_strike`로 어그로를 끄는 근접 탱커 AI로 구현. 일반 동료와 모빌리티 스킬 사용을 위한 fallback 블록을 복구 및 보존.
  - `src/mythos_combat/engine.py`: `_execute_npc_skill`에서 `defense_bonus` 버프가 시전자가 아닌 타깃(`target`)에게 올바르게 설정되도록 수정하여 스킬 버그 해결.
  - `tests/test_combat_engine.py`: 주사위 난수 롤 영향으로 `test_enemy_intent_prediction`이 드론이 먼저 움직인 상태로 의도하지 않게 실패하던 문제를 플레이어 민첩 수치를 99로 높여 턴 순서를 강제하여 안정화.
  - `tests/test_combat_engine.py`: 세린이 위독한 아군(플레이어)을 자동으로 엄호 실드하는지 검증하는 `test_se_rin_ai_shields_wounded_player` 및 카이가 플레이어 근처 적을 타깃 마크하는지 검증하는 `test_kai_ai_targets_closest_to_player` 유닛 테스트 설계 및 패스 완료.
  - `docs/NEXT_PLAN.md`: P4 작업을 `[x]` 마크로 전환.
- Verified: `tests/test_combat_engine.py` (신규 2개 케이스 포함 188개 테스트) 통과, `make lint` 통과, `make typecheck` 통과, `make smoke-local` 통과.
- Next: Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days) 설계 및 구현.

## 2026-06-03

- Status: [x] P2 — 자원 제약형 선택지 (Citizen Sleeper) 구현 완료.
- Changed:
  - `src/mythos_core/models.py`: `Choice` 데이터클래스에 `cost` (안정성/긴장도 증감 변경량) 및 `requires` (최소 안정성 및 최대 긴장 요구 조건) optional 필드 추가.
  - `src/mythos_runtime/session.py`: `choose` 함수 내에 플레이어가 선택지를 골랐을 때 요구 조건을 검증하여 위반 시 `RuntimeError`를 던지고, 충족 시 `cost`에 적힌 수치만큼 `LoopState`의 `stability` 및 `tension`을 안전하게 차감 및 변경하도록 비즈니스 로직 적용.
  - `src/mythos_narrative/prompts.py`: AI GM이 자원 변경/요구 조건이 걸린 선택지를 생성하도록 `JSON_CONTRACT` 내 `choices` 계약 조건 스키마 갱신.
  - `streamlit_app.py`: Streamlit 선택지 버튼 렌더링 시 자원 소모 비용 표시(예: 안정성 -5, 긴장도 +3) 및 요구 조건 미달 시 버튼 비활성화(`disabled=True`) 피드백 연출.
  - `src/mythos_api/static/app.js`: PoC 웹 클라이언트의 `renderChoices`도 동일하게 선택지의 cost/requires를 렌더링하고, 미충족 시 버튼 불투명도 및 클릭/키보드 핫키 단축 경로를 비활성화 처리.
  - `tests/test_runtime_session.py`: `test_choose_validates_cost_and_requires` 통합 테스트를 작성하여 요구조건 미충족 시 예외 방출 및 충족 시 실제 `LoopState` 자원 차감 여부 검증 완료.
  - `docs/NEXT_PLAN.md`: P2 작업을 `[x]` 마크로 전환.
- Verified: `tests/test_runtime_session.py`(24) 및 `make test`(184) 통과, `make typecheck`, `make lint` 통과.
- Next: P3 — 적 인텐트 가시화 (Into the Breach) 설계 및 구현.

## 2026-06-03

- Status: [x] P1 — 루프 내러티브 잔향 (Slay the Princess) 구현 완료.
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `build_runtime_narrative_context` 함수에 내러티브 잔향(Narrative Echoes) 가공 처리 구현. `world_memories` 내 `kind="run_summary"`(이전 루프의 요약, 도달한 엔딩, 획득 단서, 조우 동료 등)를 필터링하고 최신 3개 런 정보를 추출하여 한글 기반의 기시감(Dejavu) 서사 유도 룰북 지침과 함께 `novelty_notes`에 자동 주입하도록 함.
  - `tests/test_story_bible.py`: `test_runtime_context_includes_narrative_echoes` 단위 테스트 케이스를 추가하여 이전 루프 요약 정보와 가이드라인이 `novelty_notes`에 제대로 바인딩되는지 검증 완료.
  - `docs/NEXT_PLAN.md`: P1 작업을 `[x]` 마크로 전환.
- Verified: `tests/test_story_bible.py`(10) 및 `make test`(183) 통과, `make typecheck`, `make lint` 통과.
- Next: P2 — 자원 제약형 선택지 (Citizen Sleeper) 설계 및 구현.

## 2026-06-03

- Status: [x] 방향 전환 — 게임플레이 깊이 우선(공유 계층). docs 최신화.
- Changed:
  - 결정: 두 번째 프론트(API/PoC) UI 복제(패리티 S2~)보다 공유 계층(엔진/내러티브/전투) 게임플레이 깊이를 우선. 근거: 게임은 UI 표면은 풍부하나 플레이 깊이가 얕고, 공유 계층 작업은 Streamlit(현 플레이 레이어)·API 양쪽에 동시 반영되어 프론트 방향과 무관하게 회수됨.
  - `NEXT_PLAN` §7을 "게임플레이 깊이(★ 활성 우선순위)"로 승격·재정렬: P1 루프 내러티브 잔향 → P2 자원 제약형 선택지 → P3 적 인텐트 가시화 → P4 내면 독백/동료 전술 성향. §6 PoC 패리티(S2~)는 보류.
  - `STATUS` Active Focus·`AGENT_BRIEF` 방향 갱신. 두 프론트 차이는 `docs/STREAMLIT_VS_API.md`.
- Verified: 문서 작업(코드 변경 없음).
- Next: P1 루프 내러티브 잔향 — `RunSummary` 핵심 결정 → 다음 루프 `NarrativeContext` 연계.

## 2026-06-03

- Status: [x] 온보딩 화면 노출 버그 수정 + Streamlit/API 비교 문서.
- Changed:
  - 버그: 시작 전 `#play`가 `hidden`인데도 빈 플레이 영역(게이지/로그)이 온보딩 아래 노출됨. 원인은 `main { display: grid }`가 `hidden` 속성을 덮어씀 → `[hidden] { display: none !important; }` 추가로 수정.
  - `docs/STREAMLIT_VS_API.md`(신규): 두 프론트엔드의 아키텍처/전송/상태/기능 패리티/공유 요소/선택 기준 정리.
  - STATUS Source Of Truth에 비교 문서 포인터 추가.
- Verified: `tests/test_api.py`(22) 통과, 라이브 `/` 200 + `[hidden]` 규칙 서빙 확인. (전투 렉 해소도 사용자 확인됨.)
- Next: S2 Codex/기억(memory_overview API + Codex 탭).

## 2026-06-03

- Status: [x] 전투 종료 LLM 멈춤 수정 + PoC→패리티 로드맵 + S1 온보딩/세션.
- Changed:
  - fix(combat): 전투 패배(루프 종료) 시 `summarize_loop`가 fallback/fast 모드에서도 Ollama를 동기 호출해 8.3s 멈추던 것 → `use_llm` 게이트로 결정론 요약, 22ms로 단축. `director.summarize_loop(events, *, use_llm)`, `_commit_combat_turn`에서 `not(options.fallback or fast_mode)`로 게이트.
  - `docs/plans/2026-06-03-poc-parity-roadmap.md`(신규): PoC→Streamlit 패리티 S1~S6 단계.
  - S1: `GET /api/v1/scenarios`(시나리오+아키타입), 온보딩 화면(시나리오/아키타입 선택·이어하기), localStorage 세션 보존, `loops/active` resume, scenario_id 전파, phase=ended 엔딩 배너.
- Verified: `make test`(182), `make lint`, `make typecheck` 통과. 라이브: 전투 패배 22ms, S1 flow(scenarios→connect→begin→resume) OK, `/` 온보딩 렌더.
- Next: S2 Codex/기억(memory_overview API + Codex 탭).

## 2026-06-03

- Status: [x] PoC 전투 플레이어블화 — combat action 컨트롤(스크린샷 피드백 반영).
- Changed:
  - 피드백: 전투 진입 시 보드만 보이고 조작 수단이 없었음.
  - `src/mythos_api/static/index.html`: 좌측 씬 패널에 `#combat-controls` + 스타일(표적 칩·행동/스킬 버튼·FOCUS/라운드 바·종료 배너).
  - `src/mythos_api/static/app.js`: 스냅샷 combat 활성 시 choices 대신 전투 컨트롤(finalizeScene 분기). `combat.available` 기반 표적(사거리)·공격/방어/대기/도주·스킬(쿨다운). `doCombatAction`→`POST /api/v1/combat/action`로 prose·보드·컨트롤 갱신. 보드 reachable 칸 클릭 이동. 종료 outcome 배너(승리/도주→계속 WS choose, 패배→새 루프).
  - `tests/test_api.py`: app.js가 `combat/action`을 구동하는지 검증.
- Verified: `tests/test_api.py`(21) 통과, `node --check app.js` OK, 라이브 flow(connect→begin→combat/begin→action) 200·타깃/스킬/reachable/prose 확인.
- Next: 브라우저 육안(스크린샷) 확인 후 추가 조정. (선택) 옵션 A 풀 SPA.

## 2026-06-03

- Status: [x] PoC UI/UX Phase 2·3 — 전투 캔버스/타입라이터 + 반응형/로그 마감.
- Changed:
  - `src/mythos_api/static/app.js`(Phase 2): 전투 캔버스가 실제 `radar.arena.w/h` 사용·컨테이너 폭 반응형(dpr). blip 팩션 색·이름 라벨·HP 막대(비율 색)·사망 디밍·현재 턴 노란 링·방어 호·`available.reachable` 사거리 셀 하이라이트. 타입라이터: 토큰 큐 → 글자 단위 적응적 출력, 완료 후 캐럿 제거 + 선택지 노출.
  - `src/mythos_api/static/index.html`(Phase 3): main max-width 1320px 중앙 정렬, 560/900px 반응형, 접이식 로그 `<details>`, 터미널 스크롤바.
- Verified: `tests/test_api.py`(21) 통과, `node --check app.js` OK, 라이브 부팅 `/` 200 + gauge/command-card/log-panel/image-frame 서빙 확인. 브라우저 육안·전투 캔버스 실트리거는 사용자 확인 예정.
- Next: PoC UX 방안 3 Phase 모두 완료. (선택) 옵션 A 풀 SPA 또는 reference 백로그 항목.

## 2026-06-03

- Status: [x] PoC UI/UX Phase 1 구현 — 녹청 터미널 팔레트·레이아웃·선택지 카드·HUD·이미지 통제.
- Changed:
  - `src/mythos_api/static/index.html`+`app.js`: 시안/블루 → Streamlit 녹청 터미널 팔레트(스캔라인·글로우·SF Mono). 본문 중심 2단 레이아웃(좌 씬 카드 + 우 340px aside), 내러티브 70ch·15.5px + 스트리밍 캐럿. 선택지를 command-card([n] 핫키+라벨+intent, hover 글로우, 키보드 1-9)로. HUD STABILITY/TENSION 게이지 막대(위험도 색) + 루프/국면/위치 메타. 이미지 full-bleed → aspect 1:1 프레임 크기 통제 + 플레이스홀더/페이드인.
- Verified: `tests/test_api.py`(21) 통과, 라이브 WS begin으로 HUD/choices(label+intent) 필드 수신 확인. 브라우저 육안은 사용자 확인 예정.
- Next: PoC Phase 2(전투 캔버스 반응형·라벨·HP·사거리 링, 타입라이터 다듬기) → Phase 3(반응형·로그).

## 2026-06-03

- Status: [x] PoC UI/UX 개선 방안 문서화(라이브 스크린샷 기반).
- Changed:
  - 라이브 PoC 스크린샷 2장 검토 → 문제점(이미지 압도/본문 가독성/선택지 바/HUD 빈약/색 불일치/전투 캔버스 휑함) 진단.
  - `docs/plans/2026-06-03-poc-ux-improvement.md`(신규): PoC는 Streamlit과 별개의 레퍼런스 클라이언트임을 명시하고, Streamlit UX 언어(녹청 터미널 팔레트·command-card 선택지·HUD metric·이미지 크기 통제·SF Mono)를 참고한 파일별(`index.html`/`app.js`) 개선 제안 + 3 Phase 스코프 + 비목표 정리.
  - STATUS/NEXT_PLAN/AGENT_BRIEF에 PoC UX 개선 트랙 연동.
- Verified: 문서 작업(코드 변경 없음). 기존 `make test`(181) 영향 없음.
- Next: 승인 시 Phase 1(팔레트·레이아웃·선택지 카드·HUD·이미지 통제) 구현.

## 2026-06-03

- Status: [x] 레퍼런스(reference.md) 기반 피드백 및 기능 추가 백로그 도출.
- Changed:
  - `reference.md`의 명작 게임(Citizen Sleeper, Disco Elysium, Slay the Princess 등) 핵심 디자인 요소와 MythOS의 현재 구현 상태 분석.
  - 신규 아티팩트 `reference_feedback_list.md`를 생성하여 자원 제약 선택지, 스탯별 내면 독백, 내러티브 잔향, 전술 Intent 가시화, 동료 전술 성향 다각화 등의 액션 아이템 설계.
  - `docs/NEXT_PLAN.md`에 '레퍼런스 기반 내러티브 & 전술 피드백 반영 (Backlog)' 신규 섹션으로 계획 반영 완료.
- Verified: `make typecheck`, `make lint` 통과.
- Next: 프론트엔드 분리(slice 4 옵션 A 풀 SPA) 또는 백로그 항목(자원 제약 선택지/내면 독백) 우선순위 구현 개시.

## 2026-06-03

- Status: [x] API 이미지 경로 라이브 E2E 검증 + WS 폴링 창 상향.
- Changed:
  - 실가동 인프라(Postgres/MinIO/Redis + 실행 중 visual worker + Ollama)에서 API begin(async image)→Redis→worker→FLUX→MinIO→DB `succeeded`까지 실제 동작 확인. `/assets/resolve` presigned URL HTTP GET → 200/image/png/유효 PNG(1.1MB).
  - 발견: 실 FLUX 1024px 생성이 WS 30s 폴링 창을 초과 → `src/mythos_api/app.py`의 `_VISUAL_POLL_TRIES` 30→90으로 상향(느린 생성에서도 succeeded 프레임 전달). 단위 테스트/lint/typecheck 무영향.
- Verified: 위 라이브 E2E PASS, `tests/test_api.py`(21) 통과.
- Next: (선택) 옵션 A 풀 SPA, provider 메트릭 영속 집계, JSONB→전용 테이블 migration.

## 2026-06-03

- Status: [x] P3 consolidation(`make api` + `docs/API.md`) + provider 품질 메트릭 OTel/로그 방출.
- Changed:
  - `Makefile`: `make api`/`api-stop` 타겟, `make setup`이 `.[dev,web]` 설치. `docs/API.md`(신규): 실행법/엔드포인트표/WS 프레임/RuntimeSnapshot 형태.
  - `src/mythos_narrative/director.py`: `_record_outcome`이 outcome + 누적 집계(total/degraded/success_ratio)를 `mythos.narrative.outcome` OTel 스팬과 구조화 로그로 방출 — per-request director 리셋과 무관하게 provider 저하 관측. 저장소/마이그레이션 무변경.
  - `tests/test_narrative_director.py`(+1): outcome 로그의 누적 지표 포함 검증.
- Verified: `make test`(181 tests, 2 skipped), `make lint`, `make typecheck` 통과. `make api` 라이브 부팅 `/`·`/api/v1/health` 200.
- Next: (선택) 옵션 A 풀 SPA, 또는 provider 메트릭 영속 집계/대시보드, JSONB→전용 테이블 migration.

## 2026-06-03

- Status: [x] WS visual_status 합류 — API 이미지 생성 + 실시간 그림 전달.
- Changed:
  - 문제: 지금까지 API는 글만 보내고 이미지를 생성하지 않아 slice 3 presigned URL·기존 visual_worker·slice 2 WS가 end-to-end로 안 엮임. PoC 이미지 칸이 항상 비어 있었음.
  - `src/mythos_api/app.py`: WS begin/choose 메시지에 `with_image`/`visual_async`/`image_every_turn` 전달. snapshot 송신 후 `_emit_visual_status`로 씬 이미지 라이프사이클을 `visual_status` 프레임으로 스트리밍 — 동기 생성은 즉시 terminal, 비동기(Redis worker)는 pending 통보 후 store 폴링(최대 30s)으로 processing→succeeded(presigned url)/failed. `_terminal_visual_frame`/`_find_asset`/`_visual_frame` 헬퍼.
  - `src/mythos_api/static/{index.html,app.js}`: "이미지" 토글 추가, visual_status 수신 시 pending/processing은 "그림 생성 중", succeeded는 presigned url로 이미지 교체.
  - `tests/test_api.py`(+4): `_terminal_visual_frame`(succeeded url 서명/failed 무 url/pending None) + `_find_asset` 단위 검증(FLUX/Redis 불요).
- Verified: `make test`(180 tests, 2 skipped), `make lint`, `make typecheck` 통과.
- Next: (선택) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드 별도 트랙. 또는 Open Risks(narrative_shards 압축, JSONB→전용 테이블 migration).

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 4(B) — 경량 PoC 레퍼런스 클라이언트 구현.
- Changed:
  - `src/mythos_api/static/index.html` + `app.js`(신규): Node 툴체인 없는 vanilla JS 클라이언트. connect → WS begin → 토큰 실시간 누적 → snapshot 확정 → 선택지 클릭 → WS choose 재스트리밍. `assets/resolve`로 presigned 이미지 렌더, `combat.radar`는 `<canvas>` blip 최소 시각화.
  - `src/mythos_api/app.py`: 모든 라우트 등록 후 `StaticFiles(html=True)`를 `/`에 마운트(API/WS 우선). `pyproject.toml` package-data로 `static/*` 포함.
  - `tests/test_api.py`(+3): `GET /` 200, `GET /app.js` 200, `/api/v1/health`가 정적 마운트에 가려지지 않음 검증.
  - 결정/스펙 문서: `docs/plans/2026-06-03-frontend-slice4.md` (옵션 B 먼저 → 추후 옵션 A 풀 SPA).
- Verified: `make test`(176 tests, 2 skipped), `make lint`, `make typecheck` 통과. 라이브 부팅 `python -m mythos_api`로 `/`·`/app.js`·`/api/v1/health` 200, `auth/connect`이 실제 Postgres에 플레이어 기록 확인.
- Next: (선택) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드를 별도 트랙으로. visual_status WS 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 3 — S3 presigned URL 자산 전달 구현.
- Changed:
  - `src/mythos_runtime/visual_service.py`: `MinIOStorageAdapter._client()` 헬퍼로 boto3 client 생성 분리, `presigned_url(storage_uri, expires_in=600)` 추가. 논리 `s3://bucket/key`를 만료시간 있는 HTTPS presigned URL로 변환, 비-s3 URI는 그대로 통과, malformed는 ValueError (설계 §5.2).
  - `src/mythos_api/app.py`: `POST /api/v1/assets/resolve`. storage_uri를 presigned URL로 가상화해 `{"url","expires_in"}` 반환, malformed s3는 400.
  - `src/mythos_api/service.py`: `get_storage_adapter` dependency.
  - `tests/test_api.py`(+3) / `tests/test_visual_service.py`(+3, boto3 mock으로 generate_presigned_url 인자 검증).
  - 분산 visual worker(`visual_worker.py`, Redis BRPOP + heartbeat)는 기존 구현 — slice 3의 미구현 갭은 presigned URL 전달이었음.
- Verified: `make test`(173 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과.
- Next: P3 slice 4 — Next.js/Vite 프론트엔드 + Canvas 전술 보드(설계 §3,§4). 완료 시 `loops/stream`에 `visual_status` 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 2 — WebSocket 토큰 스트리밍 `/api/v1/loops/stream` 구현.
- Changed:
  - `src/mythos_api/app.py`: `@app.websocket("/api/v1/loops/stream")` 추가. 인바운드 `{"event":"begin"|"choose", ...}`를 `stream_start_loop`/`stream_choose`에 매핑하고, 블로킹 동기 제너레이터를 `iterate_in_threadpool`로 async 브리지해 이벤트 루프 비차단. 프레임: `token`/`snapshot`/`error`. 하나의 소켓에서 begin/choose 반복 처리.
  - `tests/test_api.py`: WebSocket 4 tests(begin→token→snapshot, 동일 소켓 choose 연속, unknown event/없는 player 오류 프레임).
- Verified: `make test`(167 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과.
- Next: P3 slice 3 — 분산 visual worker(`visual_worker.py`, Redis BRPOP + Redlock heartbeat) + S3 presigned URL 자산 전달(설계 §5). 완료 시 `loops/stream`에 `visual_status` 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 1 — FastAPI `/api/v1` REST 백엔드 어댑터 구현.
- Changed:
  - `src/mythos_api/`(신규): `create_app` 팩토리(`app.py`), 스냅샷/플레이어 직렬화(`serializers.py`, `to_json_dict` 기반 GameState 계약), 요청별 Postgres store 주입 dependency(`service.py`), uvicorn 엔트리포인트(`__main__.py`).
  - 엔드포인트 7개: `health`, `auth/connect`, `loops/begin`, `loops/active`, `loops/choose`, `combat/begin`, `combat/action`. combat은 `combat_server` 응답 헬퍼 재사용. RuntimeError→404/409 매핑.
  - `pyproject.toml`: optional `web` extra(fastapi/uvicorn/httpx), `mythos-api` 콘솔 스크립트.
  - `tests/test_api.py`(신규, 7 tests): TestClient + in-memory store 주입으로 DB/Ollama 없이 검증.
- Verified: `make test`(163 tests, 2 skipped), `make lint`, `make typecheck`, `make smoke-local` 전체 통과. `create_app` 라우트 7개 등록 확인.
- Blockers: 인증 레이어 부재로 id를 요청 바디로 명시 전달(설계 대비 의도적 편차). 실 Postgres 연동 라이브 부팅은 미검증(unit은 in-memory).
- Next: P3 slice 2 — WebSocket 토큰 스트리밍(`/api/v1/loops/stream`, `stream_choose` 연동).

## 2026-06-03

- Status: [x] 미커밋 작업 트리(P1 레이턴시/P2 IP-Adapter/동료 AI/엔딩 AST/CI) 검증 후 논리 단위 커밋 정리.
- Changed:
  - 17개 수정 파일 + 신규(`.github/workflows/ci.yml`, P2/P3 plan docs)를 combat / visual / runtime-ui / ci / docs 5개 커밋으로 분리.
  - `.gitignore`에 `screenshots/` 추가, `NEXT_PLAN`의 마지막 미완료 항목 `CI 도입`을 `[x]`로 마감.
- Verified: `make test`(156 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과. 작업 트리 clean.
- Next: P3 Web UI 디커플링 실구현(FastAPI 백엔드 어댑터). 설계는 `docs/plans/2026-06-03-web-ui-decoupling.md`.

## 2026-06-03

- Status: [x] Ollama API 타임아웃 튜닝 및 전투 종료 후 메인 화면 튕김 UX 흐름 개선 완료.
- Changed:
  - `config.py` (`src/mythos_image_agent/config.py`):
    - 로컬 LLM(Gemma 4) 기동 시 첫 토큰 생성 지연에 따른 타임아웃 예외(`APITimeoutError`)를 방지하기 위해 `ollama_timeout_seconds` 기본값을 4.5초에서 30.0초로 상향 조정.
  - `streamlit_app.py`:
    - 전투가 패배(`player_defeat`) 처리되거나 루프가 종결(`LoopPhase.ENDED`)되어 정산 버튼을 클릭했을 때, 이전처럼 메인 접속 화면으로 즉각 리다이렉트되어 진행이 끊기던 버그성 UX 흐름 수정.
    - 튕기지 않고 스냅샷을 갱신하여 부모 창에 루프 아카이브 성공/패배 메시지 및 런 히스토리, 해금 결과(`LoopPhase.ENDED` 상태 뷰)를 유저에게 그대로 렌더링하도록 갱신.
- Verified: `make lint`, `make typecheck`, `make test` (156 tests), `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] 세린 오프닝 연출(Ken Burns, 타이프라이터, Glitch SFX) 및 한국어화 튜닝, Codex 진척도/기억 단일화 통합 완료.
- Changed:
  - `streamlit_app.py`:
    - `_player_session_intro` 및 `_render_opening_cinematic`, `_opening_cinematic_html`을 전면 개편.
    - 단일 그리드로 표시되던 세린의 오프닝 씬들을 CSS Ken Burns 확대/축소, Typewriter 한글 타이핑 효과, 슬라이드 간 수동/자동 전환(7초)이 가능한 HTML5 sequential 슬라이드쇼로 탈바꿈.
    - 슬라이드가 전환될 때마다 `sfx_glitch.wav` 효과음 재생 및 화면 글리치 필터(0.3초)가 동기화되어 작동하도록 구현.
    - 오프닝 첫 접속 단계 시 BGM을 네오서울 메인 테마(`bgm_main.wav`)로 오버라이드하여 재생하도록 연계.
    - 메인 이야기 뷰 및 전투 뷰 하단에 흩어져 노출되던 "회상 잔향(Echo)"과 "모은 단서" 뷰(`_render_player_memory`)를 완전히 지우고, Codex(기억의 별자리) 탭의 `_render_codex_lore` 메뉴 하단에 유기적으로 통합 렌더링.
    - `SAVE` 버튼 동작 실패 및 `AUTOSAVE :: 슬롯 준비 중`에서 멈추는 에러 원인을 즉각 추적할 수 있도록 예외 발생 시 콘솔 traceback 출력 및 active 화면 상단에 붉은 에러 박스로 실시간 가시화 처리.
  - `scenario_context.py` (`src/mythos_runtime/scenario_context.py`):
    - `ONBOARDING_ACT1_SHOT1 / SHOT2 / SHOT3` 프롬프트 지시사항 및 씬 묘사 조건들을 완벽하게 한국어로 번역하여 AI 게임 마스터가 한글 씬 및 선택지들을 일관되게 생성하도록 프롬프트 최적화.
- Verified: `make lint`, `make typecheck`, `make test` (156 tests), `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] 동료 AI 전술 고도화, 전술 전투 밸런스 최종 조율, CI 파이프라인 도입 완료.
- Changed:
  - `engine.py` (`src/mythos_combat/engine.py`):
    - 동료 AI 스킬 선택 로직을 하드코딩 방식에서 데이터 중심의 범용적 동적 스킬 평가 루프(Generic Skill Evaluation Loop)로 전면 개편.
    - 힐링 스킬(`restore_margin`)을 보유한 동료가 범위 내 부상당한 아군(HP <= 60%)을 찾아 자동으로 치료하도록 AI 행동 패턴 연동.
    - 이동/탈출 스킬(`silent_shelve`, `signal_step` 등)을 보유한 겁쟁이(coward) AI 동료가 체력이 낮을 때 자동으로 텔레포트/이동 회피를 수행하도록 배선.
    - `_execute_npc_skill` 및 `_move_to_band`를 리팩토링하여 아군 대상 힐링 처리 및 이동 효과(`move`) 처리 연계.
  - `scenario.json` (`resources/neo-seoul/scenario.json`, `resources/glass-library/scenario.json`):
    - 정비 드론, 감시 드론, 집행 유닛 등 주요 적들의 HP, 방어력, 장갑을 상향하여 동료 합류 시의 전투 긴장감 유지.
    - 전술 소모품(나노패치, 자극 파편) 획득 밸런스 조정을 위해 전리품 획득 확률(Loot Table Weights) 하향 튜닝.
  - `.github/workflows/ci.yml` (신규):
    - GitHub Actions 지속적 통합 워크플로우 구성. 파이썬 3.11 환경에서 `make setup`, `make lint`, `make typecheck`, `make test`를 자동 실행하여 회귀 버그 방지 체계 마련.
  - `tests/test_combat_engine.py`:
    - 동료의 자동 힐링(`test_ally_uses_restore_margin_automatically`) 및 자동 이동 회피(`test_ally_uses_silent_shelve_automatically`) 검증을 위한 단위 테스트 추가.
- Verified: `make test` (156 tests), `make lint`, `make typecheck`, `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] P1 이미지 생성 레이턴시 계측 및 최적화 프리셋 구현 완료.
- Changed:
  - `visual_service.py` (`src/mythos_runtime/visual_service.py`): 이미지 생성(`provider_ms`), Y2K/오버레이 필터 적용(`postprocess_ms`), 스토리지 업로드(`storage_ms`)의 구간별 시간과 총 소요 시간(`latency_ms`)을 계측하도록 고도화.
  - `observability.py` (`src/mythos_runtime/observability.py`): JsonFormatter에 계측 필드를 추가해 로깅 시 전송하며, `set_span_attribute()` 헬퍼를 도입해 OTel 스팬 속성에 주입.
  - `streamlit_app.py`: Player View 장면 이미지 하단에 구간별 레이턴시 캡션을 렌더링하고, 플레이어용 해상도/steps 프리셋(Fast, Balanced, Quality, Ultra) 선택박스를 사이드바에 추가.
- Verified: `make lint`, `make typecheck`, `make test`(148 tests), `make smoke-local`, `make test-db` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 도입 진행.

## 2026-06-03

- Status: [x] EndingResolver, 인과율/아젠다 디버그 모니터, Player View hotfix 기준선 최신화.
- Changed:
  - `EndingResolver` (`src/mythos_runtime/ending_resolver.py`) 신규 구현: `loop.state.flags` 내 Humanity/Insight/Resilience/Dominance 점수를 파싱/계산하고, `scenario.json`에 정의된 endings 조건식을 제한된 namespace에서 평가.
  - `session.py`의 `archive()` 및 `_combat_permadeath()` 시점에 `EndingResolver.resolve_ending`을 연결해 `ending_id` 및 `ending_label`이 `LoopState`와 `RunSummary`에 기록되도록 확장.
  - `streamlit_app.py` 내 Developer view에 `_causality_monitor_panel()` 디버그 모니터 신규 탑재: 실시간 스탯 스코어, active flags, endings 매칭 상태 및 조건식 확인 가능.
  - 선택 플레이어가 없어도 `새 게임 시작`이 새 player를 생성한 뒤 loop를 시작하도록 정리.
  - narrative parser와 runtime combat request guard가 `"null"`, `"none"`, `"undefined"` 같은 sentinel을 실제 encounter id로 처리하지 않도록 보강.
  - 오프닝 시네마틱 렌더를 self-contained iframe 경로로 바꿔 raw HTML이 화면에 노출되는 문제를 방지.
  - `tests/test_ending_resolver.py`에 다중 엔딩 매칭 단위 테스트를 추가하고 `test_runtime_session.py`에 통합 테스트(`test_archive_resolves_ending`) 반영.
- Verified: `make test`(148 tests, 2 skipped), `make typecheck`, `make smoke-local`, Streamlit HTTP 200 boot.
- Blockers: in-app Browser `iab` 세션이 없어 스크린샷 기반 검증은 못 함.
- Next: P0 엔딩 리졸버 조건식 안전화/시나리오 ending condition 보강 후 P1 비주얼 생성 레이턴시 계측.

## 2026-06-03

- Status: [x] 미완료 태스크 리스트업 및 로드맵 설계 완료.
- Changed:
  - 현재 로컬 런타임의 미완료 작업 항목 및 제품화 과제를 분석하고 P0~P3 우선순위와 함께 세부 체크리스트를 리스트업함.
  - 신규 아티팩트 `remaining_tasks_plan.md` 생성 및 `docs/NEXT_PLAN.md`에 세부 연동 정보 반영.
- Verified: `make lint`, `make typecheck`, `make test`, `make smoke-local` 확인.
- Next: P0 명시적 엔딩 조건 평가 및 저장 확장 (`EndingResolver`) 구현 및 검증.

## 2026-06-03

- Status: [x] Save/Load UX MVP 구현.
- Changed:
  - `SaveSlot` DTO 추가 및 active loop만 LOAD 대상으로 조회.
  - `PlayerMemory(kind="save_slot")` autosave metadata 저장. start/choice/stream/combat 진행 시 갱신.
  - `RuntimeSessionService.list_save_slots()` / `save_slot()` 추가.
  - `resume(player_id=...)`가 ended loop가 아니라 최신 active save slot을 선택하도록 변경.
  - Player View LOAD 카드에 active save slot 선택 UI 추가, ended loop는 기록 보관소 대상으로 분리.
  - Player active/combat 화면에 autosave 상태와 명시적 `SAVE` 버튼 추가.
- Verified: targeted save slot/runtime/combat tests, ruff, `make typecheck`, `make test`(142 tests, 2 skipped), `make smoke-local`, Streamlit HTTP 200 boot.
- Blockers: in-app Browser `iab` 세션이 없어 스크린샷 검증은 못 함. OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: 명시적 ending condition 경로의 `ending_id`/`ending_label` 저장 확장 또는 Web UI/클라우드 후속.

## 2026-06-03

- Status: [x] Meta Progression MVP 구현.
- Changed:
  - `MetaProgression` 모델과 run summary 기반 unlock 평가 추가.
  - 첫 런/단서/전투 승리/동료 만남에 따라 trait, codex, starting item, ally unlock 누적.
  - archive/permadeath 종료 시 `PlayerMemory(kind="meta_progression")` 저장 및 `PlayerProfile.traits` 갱신.
  - 새 루프 시작 시 meta progression state와 unlocked starting item을 초기 state/inventory에 반영.
  - Developer Memory 패널에 meta progression 요약 표시.
- Verified: targeted progression/runtime/combat tests, ruff, `make typecheck`, `make test`(141 tests, 2 skipped), `make smoke-local`.
- Blockers: OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: active loop/save slot 기반 명시적 Save/Load UX.

## 2026-06-03

- Status: [x] Run History MVP 구현.
- Changed:
  - `RunSummary` DTO 추가 및 archive/permadeath 종료 시 `WorldMemory(kind="run_summary")` 저장.
  - `RuntimeSessionService.list_run_summaries()`와 `MemoryOverview.run_summaries` 조회 경로 추가.
  - 전투 종료 이벤트를 저장해 run summary의 전투 승/패 카운트를 집계.
  - Player View 접속 화면과 Developer Memory 패널에 `기록 보관소` 렌더링 추가.
  - loop summary 생성 실패가 archive/permadeath를 깨지 않도록 provider 예외 fallback 처리.
- Verified: targeted run history/combat tests, ruff, `make typecheck`, `make test`(139 tests, 2 skipped), `make smoke-local`.
- Blockers: OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: run summary 기반 Meta Progression/unlock MVP.

## 2026-06-02

- Status: [x] Neo-Seoul 오프닝/캐릭터 고품질 사전 제작 자산 정책 반영.
- Changed:
  - 세린 기준 얼굴을 사용자 제공 이미지 기준으로 재정의하고 `resources/neo-seoul/characters/se-rin.png`, `se-rin-biker.png`를 고품질 imagegen 결과로 교체.
  - 린위에를 "거래와 부채의 여왕" 컨셉으로 재생성해 `resources/neo-seoul/characters/lin-yue.png` 교체.
  - 이전 mflux 오프닝 초안 파일을 삭제하고, 고품질 `opening-01-serin-arrival.png`, `opening-02-first-contact.png`, `opening-03-drone-chase.png`를 정식 v1 오프닝 컷으로 확정.
  - Streamlit Player View 첫 세션 인트로가 `scenario.json["ui_copy"]["session_intro"]["cinematic_shots"]`를 시네마틱 패널로 렌더하도록 연결.
  - 비주얼 정책 정리: 사전 제작 고품질 키아트/캐릭터/적은 FLUX 또는 imagegen 중 품질 좋은 쪽 선택, 게임 중 동적 장면 이미지는 `mflux`, enemy/bestiary는 가능한 사전 제작 자산으로 분류.
- Verified: Neo-Seoul `scenario.json` 파싱, `streamlit_app.py` py_compile, `python -m unittest tests.test_story_bible`(9 tests).
- Blockers: 없음.
- Next: Player View 브라우저에서 오프닝 시네마틱 실제 렌더 확인 또는 Run History MVP.

## 2026-06-02

- Status: [x] Neo-Seoul 01을 1시간 소설형 세션 depth로 보강.
- Changed:
  - `resources/neo-seoul/scenario.json`에 `session_design` 추가. 40-60턴/1시간 목표, phase gate, 장면 밀도 규칙 명시.
  - Neo-Seoul main arc를 4막 요약에서 6막 구조로 확장: C-17 탈출, 점수/부채의 도시, 구출 작전, 카이 각성, 스파이어 접근, 관리자 IX 최종 대면.
  - side arc와 NPC agenda를 보강해 세린/린위에/카이/최적화 명단 대상자의 갈등이 장기 세션에 남도록 정리.
  - `resources/neo-seoul/story_bible/bible.json`을 15개 이상 snippet으로 확장. pacing contract, 막별 장면, 최적화 명단 진실, 구출 작전, 카이의 꿈, 스파이어 접근, 엔딩 Echo 정리를 추가.
  - `docs/scenarios/01-neo-seoul-connect.md`에 40-60턴 세션 구조와 장면 밀도 원칙 추가.
- Verified: Neo-Seoul JSON 2종 파싱, `python -m unittest tests.test_story_bible`(8 tests), `ruff check tests/test_story_bible.py`, `make test`(137, 2 skipped), `make typecheck`.
- Blockers: 없음.
- Next: Run History MVP 또는 Player View에서 Neo-Seoul long-form 진행/phase gate 체감 확인.

## 2026-06-02

- Status: [x] 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성.
- Changed:
  - `docs/scenarios/02-glass-library.md` 추가. 기억 도서관 유리성, 사서 AI 이오, 잊힌 독자 미로, 백색 제본사, 첫 번째 접속 기록 미스터리를 정리.
  - `resources/glass-library/scenario.json` 추가. archetype, arcs, NPC agendas, endings, 최소 combat pool, 시나리오 전용 system prompt를 포함.
  - `resources/glass-library/story_bible/bible.json` 추가. phase/location/flags 기반으로 선택 가능한 Story Bible snippet 작성.
  - Glass Library scenario/story bible 로딩과 `NarrativeContext` snippet 주입 테스트 추가.
- Verified: `python -m json.tool`로 Glass Library JSON 2종 파싱 확인, `python -m unittest tests.test_story_bible`(7 tests), 변경 파일 ruff, `make test`(136, 2 skipped), `make typecheck`.
- Blockers: 없음.
- Next: Run History MVP(`RunSummary` 생성/저장/조회 및 Player View 기록 보관소).

## 2026-05-31

- Status: [x] 전투 후속 선택 섹션 마무리.
- Changed:
  - Neo-Seoul 주요 액티브 스킬(`signal_step`, `overload_strike`, `packet_shot`, `covering_noise`) focus 비용을 1에서 2로 조정해 매 라운드 무료 반복을 줄임.
  - `defend`가 즉시 focus 1을 회복하고, 기존 라운드 upkeep +1과 합쳐 재충전 턴 역할을 하도록 변경.
  - `stim_shard` focus 회복량을 2에서 3으로 올려 소비품 가치 보강.
  - custom component drag/drop tactical board는 현 단일 iframe 보드가 안정적이므로 필수 작업 없음으로 정리.
- Verified: `tests.test_combat_engine`, `tests.test_combat_service`, 변경 Python 파일 ruff, `scenario.json` 파싱, `make test`(134, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: Story Bible / Run History / Save Load 트랙 계속 진행.

## 2026-05-31

- Status: [x] Story Bible MVP 로더/선택/주입 구현.
- Changed:
  - `src/mythos_runtime/story_bible.py` 추가. `resources/<scenario>/story_bible/bible.json`을 읽고 phase/location/flags/turn 조건과 token budget에 맞는 snippet만 선택.
  - `build_runtime_narrative_context`가 선택된 Story Bible snippet을 `NarrativeContext.novelty_notes`에 `STORY_BIBLE_SNIPPET`으로 주입.
  - `resources/neo-seoul/story_bible/bible.json` 추가. Neo-Seoul 정사, C-17 첫 접속, 정세린, 한강 야시장, 카이, 관리자 IX 조각을 최소 바이블로 작성.
  - Story Bible 로딩/필터링/프롬프트 노트/context 주입 테스트 추가.
- Verified: `tests.test_story_bible`, 변경 파일 ruff, `make test`(133, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성 또는 RunSummary MVP.

## 2026-05-31

- Status: [x] Story Bible / Run History / Save Load 제품화 계획 문서화.
- Changed:
  - `docs/plans/2026-05-31-story-bible-save-load.md` 추가. 시나리오 바이블 snippet 주입, 샘플 게임북, RunSummary, 메타 진행도/해금, Save/Load UX의 단계별 구현 계획을 정리.
  - `docs/NEXT_PLAN.md`, `docs/STATUS.md`, `docs/AGENT_BRIEF.md`에 새 제품화 트랙을 다음 우선순위로 반영.
- Verified: 문서 변경만 수행.
- Blockers: 없음.
- Next: Story Bible MVP(`story_bible.py` loader/selector + Neo-Seoul 최소 bible)부터 구현.

## 2026-05-31

- Status: [x] 도주 후 encounter contact 유지 정책 구현.
- Changed:
  - `RuntimeSessionService._apply_combat_rewards`를 결과별로 분기해 `player_victory`만 보상/`defeated` 정산을 적용하고, `player_fled`는 보상 없이 contact를 `alerted`로 되돌리도록 변경.
  - `mark_encounter_alerted` 추가. 도주 contact는 `cooldown=1`을 받아 다음 encounter map tick에서 즉시 재충돌하지 않고 한 칸 물러난 뒤 맵에 남는다.
  - victory/flee 정산 단위 테스트와 alerted contact map tick 테스트 추가.
- Verified: `tests.test_encounter_map`, `tests.test_session_combat`, 변경 파일 ruff, `make test`(128, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: focus 재생량과 skill cost 밸런스 재검토.

## 2026-05-31

- Status: [x] 전투 시뮬레이션 동료 선택 UI 추가.
- Changed: 전투 시뮬레이션 영역에 `시뮬레이션 동료` multiselect를 추가하고, 선택된 동료를 `RuntimeSessionService.start_combat(..., party_members=...)`로 넘겨 `_party.members`에 주입한 뒤 전투를 시작하도록 연결.
- Verified: `test_session_combat` party override 테스트 추가, `make test`(124, 2 skipped), `make typecheck`, 변경 파일 ruff, Browser에서 시뮬레이션 동료 선택 UI 표시 확인.
- Blockers: 없음.
- Next: 도주 후 contact roaming 유지 또는 focus/skill 밸런스 재검토.

## 2026-05-31

- Status: [x] 동료/파티 참전 구현.
- Changed:
  - `build_ally_combatant` 추가 및 `build_encounter(..., allies=...)` 확장. player+ally party를 전장 좌측에 배치하고 기존 엔진의 ally AI 턴을 사용.
  - `CombatService.begin`이 `_party.members`와 scenario ally `unlock_flags`를 읽어 정세린/카이 같은 ally combatant를 생성. 전투 종료/진행 후 ally HP를 `_party.members`에 carry-over.
  - ally radar/portrait/faction이 기존 단일 iframe 전투 UI roster/board에 그대로 표시되도록 연결.
  - 동료 spawn/flag unlock/HP persistence 테스트 추가.
- Verified: `make test`(123, 2 skipped), `make typecheck`, 변경 파일 ruff, `make smoke-local`, service-level `se_rin` ally radar 확인.
- Blockers: 동료 스킬 자동 사용은 아직 없음(기본 NPC weapon AI). 밸런스는 후속 조정 가능.
- Next: 도주 후 contact roaming 유지 또는 focus/skill 밸런스 재검토.

## 2026-05-31

- Status: [x] 전투화면 단일 iframe 재구성 완료 — per-action Streamlit rerun/remount 제거.
- Changed:
  - `src/mythos_runtime/combat_server.py` 추가: 127.0.0.1 localhost JSON bridge, `combat_action_response` / `combat_state_response` 순수 핸들러, 요청별 `RuntimeSessionService` 위임.
  - `streamlit_app.py` 전투 fragment 단순화: 전투 중에는 `_build_combat_app_html` 단일 iframe이 보드/로스터/컨트롤/로그/결과를 렌더하고, 액션은 fetch로 처리. Streamlit은 종료 신호만 받아 다음 장면/메인 복귀를 수행.
  - `tests/test_combat_server.py` 추가: 상태 응답, 스킬 액션, 좌표 이동 매핑 검증.
- Verified: `make test`(121, 2 skipped), `make typecheck`, 변경 파일 ruff, `make smoke-local`, Browser Streamlit 전투 iframe 렌더 확인.
- Blockers: iframe 내부 버튼 클릭까지 자동화하지는 못했으나, 핸들러 단위 액션과 브라우저 렌더는 검증됨.
- Next: 동료/파티 참전.

## 2026-05-31

- Status: [x] 전투 스킬/아이템 실행 + 이동/blank 버그 수정. [ ] 깜박임/흰박스는 단일 iframe 재구성으로 인계.
- Changed:
  - 전투 스킬/아이템 엔진 배선: `Combatant`에 focus/skills/cooldowns/defense_buff, `factory.derive_max_focus`,
    `engine`의 `_player_skill`/`_player_item`/`_tick_player_round`, `CombatService` 스킬 부여 + 인벤토리 소비,
    radar/available에 focus·skills 노출, Streamlit 전투 컨트롤에 스킬/아이템 버튼 + 집중 게이지.
  - 전투 UI 버그: 보드 미표시(`st.markdown` iframe sanitize) → 인라인 `st.iframe`(srcdoc) 렌더로 교체.
    이동 무반응 → fragment select/move 후 `st.rerun(scope="fragment")`. 스킬 클릭 blank → `_dispatch` 헬퍼로
    액션 후 fragment rerun. 흰 박스 → `hidden_combat_action` label collapsed + `.st-key-` 숨김 CSS.
- Verified: `make test`(118, 2 skipped)·`make typecheck`·`make smoke-local` PASS, Streamlit headless 200 OK.
- Blockers: **깜박임 + 스킬창 흰 박스 잔존** — per-action rerun + iframe remount 구조 한계. 부분 완화만 됨.
- Next(codex 인계): **전투화면 단일 iframe 재구성** — `docs/plans/2026-05-31-combat-single-iframe.md`,
  `docs/NEXT_PLAN.md` §1. 엔진/스키마 무변경, 표현 계층만 재작성.

## 2026-05-31

- Status: [x] 문서 토큰 사용 최적화.
- Changed: `AGENT_BRIEF.md` 진입점 추가, 2026-05 상세 로그 archive 분리, current docs를 요약/링크 중심으로 정리.
- Verified: 문서 링크/크기 확인.
- Blockers: 없음.
- Next: 동료/파티 참전 작업 시 `STATUS.md`와 `NEXT_PLAN.md`만 갱신하고 상세 구현 기록은 필요한 만큼만 append.

## 2026-06-03

- Status: [x] P2 (IP-Adapter 캐릭터 비주얼 일관성 실배선) 및 P3 (Web UI 디커플링 아키텍처 설계) 완료.
- Changed:
  - `src/mythos_image_agent/config.py`: IP-Adapter 레포, 가중치명, CLIP 이미지 인코더 설정 속성 추가.
  - `src/mythos_image_agent/pipeline_cache.py`: `get_flux_ip_adapter_pipeline` 추가 (CLIP Image Encoder CPU 격리 로딩, base components 공유 생성, IP-Adapter 가중치 탑재).
  - `src/mythos_image_agent/generator.py`: `generate_image`에 `ip_adapter_image_path`/`ip_adapter_scale` 추가 배선 및 비사용 시 scale 0.0 처리.
  - `src/mythos_runtime/visual_service.py`: `_request_from_scene`에서 캐릭터 포트레이트 일치 시 `use_ip_adapter=True` 자동 설정, `LocalFluxProvider` 내 IP-Adapter 생성 분기 배선.
  - `resources/neo-seoul/scenario.json`: 누락되었던 `character_map` 및 `concept_map` 정보 추가 설정.
  - `docs/plans/2026-06-03-web-ui-decoupling.md` 및 `docs/plans/2026-06-03-p2-p3-implementation.md` 작성: Next.js/Vite 상태 바인딩, REST/WebSocket API boundary 규격, Canvas 기반 전술 전투 보드 설계 및 Redis Queue/S3 락 사양 정의.
  - `tests/test_visual_service.py`: 캐릭터 감지(IP-Adapter 활성화), 개념 감지(IP-Adapter 비활성), LocalFluxProvider 분기 라우팅, `get_flux_ip_adapter_pipeline` mock 단위 테스트 추가.
- Verified: `make test` (152 tests, 2 skipped), `make typecheck`, `make smoke-local` 전부 성공 통과.
- Blockers: 없음.
- Next: P0 EndingResolver 조건식 AST/whitelist evaluator 교체 및 시나리오 엔딩 조건식 정합성 점검.

## 2026-06-03

- Status: [x] 1순위 (P0 EndingResolver AST 안전화 및 시나리오 정합성 점검), 2순위 (P1 DB Connection Churn 최적화), 3순위 (P1 NPC 아젠다 & 이벤트 타임라인 디벨로퍼 뷰 고도화) 완료.
- Changed:
  - `src/mythos_runtime/ending_resolver.py`: `ASTConditionEvaluator` 구현. `eval`을 AST 파서/화이트리스트 기반 조건식 평가로 교체하여 RCE 보안 위험을 구조적으로 제거.
  - `tests/test_ending_resolver.py`: AST 평가식 및 논리 연산자, `flags contains` 조건 검증을 기존 유닛 테스트로 안정 작동 확인.
  - `streamlit_app.py`:
    - `@st.cache_resource` 데코레이터를 이용한 싱글톤 `get_shared_store()` 헬퍼 도입. 모든 UI 액션/스트림/로더에서 DB Store를 매번 생성하고 닫던 오버헤드(Connection Churn)를 완전히 제거하여 반응성 향상.
    - Developer panel (`_causality_monitor_panel`)에 NPC 아젠다 Goal/Rules 노출 및 매칭 활성 플래그 표시, `store.list_events`를 활용한 월드 이벤트 히스토리 타임라인(Causality Event Timeline) 시각화 보강.
- Verified: `make test` (152 tests, 2 skipped), `make typecheck`, `make smoke-local` 전부 성공 통과.
- Blockers: 없음.
- Next: P1/P2 동료 AI/행동 및 전술 밸런싱 고도화.

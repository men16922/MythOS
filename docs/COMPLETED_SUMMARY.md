# Completed Summary

최종 갱신: 2026-06-07

이 문서는 완료된 milestone의 압축 요약이다. 세부 작업 로그와 검증 기록은 `bin/docs/archive/IMPLEMENTATION_M0_M10.md`, `bin/docs/archive/progress-2026-05.md`, `bin/docs/archive/progress-2026-06.md`를 참고한다. 최신 짧은 로그만 `PROGRESS_LOG.md`에 남긴다.

## MVP Milestones

| ID | Milestone | Result |
| --- | --- | --- |
| M0 | Repo baseline cleanup | 기획/설계 문서와 smoke 산출물 정리, 기존 image agent 유지 |
| M1 | Local Docker infra | PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer 구성 |
| M2 | Database schema | 핵심 runtime table과 raw SQL migration baseline 구현 |
| M3 | Core domain models | Player, Loop, Scene, Event, Echo, Memory, Asset dataclass 모델 구현 |
| M4 | Store layer | `psycopg` 기반 PostgreSQL CRUD, transaction, integration tests 구현 |
| M5 | Narrative Director | Ollama JSON scene, repair path, deterministic fallback scene 구현 |
| M6 | Loop Engine | phase transition, validation, Echo activation, archive guard 구현 |
| M7 | Visual Service integration | FLUX local adapter, filesystem/MinIO storage, asset metadata 저장 구현 |
| M8 | CLI vertical slice | player 생성부터 bin/docs/archive/Echo/next loop까지 CLI 플레이 구현 |
| M9 | Observability and QA | structured logging, OTel span skeleton, smoke aggregation 구현 |
| M10 | Streamlit playable demo | 브라우저에서 player 생성, loop 진행, archive, Echo carry-over, 이미지/Ollama 확인 |

## Post-MVP Milestones

| ID | Milestone | Result |
| --- | --- | --- |
| M11 | Streamlit Polish | saved player/loop selector, loop resume UX, active/archived 표시, asset/Echo layout 정리 |

## Playable Game Track (Phase 15-19)

| ID | Milestone | Result |
| --- | --- | --- |
| M15 | Player UI 분리 | '플레이어 뷰'와 '개발자 뷰' 분리, 몰입형 게임 UI 구현 |
| M16 | 목표 & 판정 시스템 | 세션 목표 HUD, 플레이어 행동에 대한 성공/부분성공/실패 판정 및 연출 구현 |
| M17 | 시나리오 & GM 톤 | «Neo-Seoul» 세계관/GM 브리프 주입, 접속자 소질(Archetype) 및 부팅 온보딩 구현 |
| M18 | 미스터리 & Codex | Narrative Shard 단서 태깅, Lore 해금 임계치 로직, '기억의 별자리' Codex UI 구현 |
| M19 | 아트 연출 통합 | Y2K/CRT 후처리, 디제틱 HUD 오버레이, 캐릭터/컨셉 기반 img2img 정체성 스티어링 구현 |

## Infrastructure & DX Improvements

| ID | Milestone | Result |
| --- | --- | --- |
| M13 | Async Visual Jobs | Redis 기반 비동기 이미지 잡, 워커 heartbeat, pending/processing/succeeded 상태, MinIO presigned 표시 구현 |
| M13.5 | mflux Visual Backend | Apple MLX `mflux` 기본 전환, 4-bit 양자화, 단일 워커 락, img2img 4-step 프리셋으로 이미지 지연과 메모리 경합 완화 |
| M13.6 | Redux Worker Pipeline & Cleanup | mflux Redux 캐릭터 identity steering을 worker→MinIO 실경로로 검증하고, heartbeat owner token 유지/lock release/Postgres pool close로 worker 종료 잔류 방지 |
| M14 | Developer Experience | Ruff(Lint/Format), Mypy(Type Check) 도입, Makefile 명령어 정비 및 전역 타입 에러 해결 |
| M14.5 | Local Dev Stack UX | `make dev-up`/`dev-down` 원클릭 스택과 React Dev 탭 인프라 콘솔 링크(Adminer/MinIO/Redis/Jaeger) 추가 |
| M20 | Configuration Decoupling | 하드코딩된 시나리오 설정을 `scenario.json`으로 분리, MinIO를 기본 이미지 저장소로 지정 |

## RPG & Narrative Quality Track (Phase 21-26)

| ID | Milestone | Result |
| --- | --- | --- |
| M21 | RPG 데이터 구조화 | 5대 핵심 스탯, 자율성 레벨, 소질별 초기값, 단서 기반 레벨업 로직 구현 |
| M22 | RPG 기반 판정 | AI GM이 스탯을 근거로 성공/부분 성공/실패를 판정하고 결과를 장면 텍스트와 HUD에 반영 |
| M23 | 진행도 기반 세계 진화 | 자율성 레벨에 따른 NPC 반응, 시점/문체 변화, 이미지 글리치 강도 조절 구현 |
| M24 | 인터랙션 고도화 | 자율성 상태 UI, 신호 제약 경고, 각성 연출, Codex 플레이어 정보 강화 |
| M25-M26 | 노벨급 서사 엔진 | 오감 묘사, NPC 페르소나, 스테이징, 라벨 제거, AI 주도 페이즈 전환, 루프 요약 저장 구현 |

## Scenario v2 & Causality Track

| ID | Milestone | Result |
| --- | --- | --- |
| M27 | Gear World Causality | NPC 아젠다, 위치/선택 기반 인과율, 나비효과, 미래 이벤트 예약 지침을 GM 컨텍스트에 통합 |
| M28 | Multi-Ending Matrix | Humanity, Dominance, Resilience, Insight 지표 기반 다중 결말 구조 정의 |
| M29 | Scenario v2 | `scenario.json`을 메인/사이드 아크, NPC 아젠다, 엔딩, 시네마틱 훅, 동적 `system_prompt` 구조로 확장 |

## Roguelike/CRPG Combat Track

| ID | Milestone | Result |
| --- | --- | --- |
| M30 | Combat Engine | 결정적 다이스, initiative, 위치 이동, 사거리, 명중/피해/치명타, 적 AI, 승패 판정 구현 |
| M31 | Combat Runtime | `CombatService`, `RuntimeSessionService.start_combat`, `combat_action`, combat scene 영속, 퍼머데스/Echo 처리 구현 |
| M32 | Encounter Map | `world_delta.spawn_encounters`, 작전 지도 접촉 배치/이동/충돌 전투 트리거, contact resolved 처리 구현 |
| M33 | Tactical UI | 장면 이미지 옆 tactical board, party/enemy roster, 적/주인공 portrait, board 직접 이동, 공격/방어/도주 명령 구현 |
| M34 | Combat Result | 전투 종료 결과 패널, combat summary, 다음 장면 진행, 패배 후 메인 복귀 흐름 구현 |

## Gameplay Depth Track (Roadmap P1~P4)

| ID | Milestone | Result |
| --- | --- | --- |
| P1 | 루프 내러티브 잔향 | 이전 루프의 주요 분기점(`run_summary`)을 Narrative Context에 기시감 가이드라인과 함께 자동 주입 |
| P2 | 자원 제약형 선택지 | `stability`/`tension` 조건 위반 시 선택 비활성화 및 선택에 따른 자원 소모 경제 구축 |
| P3 | 적 인텐트 가시화 | 적 유닛의 다음 턴 행동 의도(이동/공격/도주)를 미리 시뮬레이션 및 보드 가시화 |
| P4-1 | 스탯 기반 내면 독백 | 최고/최저 스탯의 성격에 대입하여 디스코 엘리시움 풍의 내적 독백 가이드라인을 프롬프트에 주입 |
| P4-2 | 동료 전술 성향 다각화 | 정세린(원거리 지원/실드), 카이(도발/탱커) 성향별 AI 결정 트리 구현 및 실드 적용 대상 버그 수정 |
| P4-3 | 외부 이미지 모델 후보 평가 | Se-rin 대상 Gemini/Imagen 후보를 비교 자료로 생성·검토하고, canonical 승격 기준을 action sheet 검수 방식으로 정리 |
| P4-4 | Combat action pose pipeline | Se-rin/player-noise/Kai와 humanoid enemy 2종(enforcer-unit/glitch-wraith)에 `idle/attack/guard/skill/hit` 전신 combat assets 적용 |

## Web UI Decoupling Track

| ID | Milestone | Result |
| --- | --- | --- |
| S1-S6 | Web UI Parity & React SPA | FastAPI REST/WS 백엔드 어댑터 구축, WebSocket 토큰 스트리밍, MinIO presigned URL, React + TypeScript SPA 독립형 프론트엔드(온보딩, 6종 게이지 HUD, 타입라이터, 전투 Canvas 렌더러, Codex 기억의 별자리, Save/Load, Dev 모니터) 100% 기능 패리티 완료 |
| E2E | Playwright 자동 E2E 테스트 | uvicorn 백그라운드 서버 기동 및 Playwright headless Chromium을 통한 가상 플레이어 자동 온보딩, 스트리밍 대기, 턴 진행, 화면 스냅샷 수집, 실패 non-zero exit/진단 캡처, 리소스 자동 회수 파이프라인(`make test-e2e`) 구축 |

## Long-Session Stability Track

| ID | Milestone | Result |
| --- | --- | --- |
| L1 | Narrative Shards Memory Rollup | 오래된 `narrative_shards`를 `PlayerMemory(kind="causality_summary")`로 압축하고, 최신 raw shard만 Narrative Context에 전달하여 장기 세션 토큰 압박 완화 |
| L2 | Narrative Outcome Metrics | AI GM generation outcome(`success/provider_repair/local_repair/fallback`)을 `WorldMemory(kind="narrative_metrics")`에 누적 저장하고 React Developer 탭 Outcome Ratio 카드로 표시 |
| L3 | Rollup/Metrics Quality Pass | shard retention 경계값과 narrative metric response shape를 회귀 테스트로 고정 |

## MVP Verification Summary

검증 완료:

- Unit tests: `make test`
- PostgreSQL integration: `make test-db`
- Local smoke: `make smoke-local`
- Full smoke with DB/MinIO: `make smoke`
- CLI demo: `make connect-demo`
- Streamlit demo: `make streamlit`
- Browser text play: player 생성, loop 시작, 3턴 이상 진행, archive, Echo carry-over.
- Browser visual play: filesystem preview, MinIO `s3://mythos-assets/...png` URI.
- Browser narrative play: fallback off 상태에서 Ollama scene 생성.
- Streamlit polish regression: saved player 선택, saved loop resume, archive, next loop Echo carry-over.
- Automated browser E2E: `make test-e2e` (Playwright headless Chromium 온보딩/턴이동 성공 검증, outputs PNG 스냅샷 보관)
- Current lightweight verification: `make lint`, `make typecheck`, `make test` (203 tests, 2 skipped), `make test-e2e`.

## Completed Architecture Baseline

- Docker는 local infra만 담당한다.
- Ollama와 FLUX worker는 Mac host에서 실행한다.
- PostgreSQL이 authoritative runtime state다.
- Streamlit과 CLI는 `RuntimeSessionService`를 공유한다.
- `st.session_state`는 view state만 저장한다.
- 이미지 생성은 플레이어 뷰에서 핵심 비트 중심으로 자동 생성되며, 기본 저장소는 MinIO다.
- 이미지 생성 기본 백엔드는 Apple MLX `mflux`이고, diffusers FLUX 경로는 폴백으로 유지한다.
- 전투 판정은 `mythos_combat` 엔진이 권위이며, LLM은 인카운터 배치/서사 연결을 지시하고 결과 판정 자체는 하지 않는다.

## Archive Reference

M0-M10의 상세 체크리스트, work log, verification log는 `bin/docs/archive/IMPLEMENTATION_M0_M10.md`에 보존한다.

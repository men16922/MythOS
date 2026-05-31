# Completed Summary

최종 갱신: 2026-05-31

이 문서는 완료된 milestone의 압축 요약이다. 세부 작업 로그와 검증 기록은 `archive/IMPLEMENTATION_M0_M10.md`와 `PROGRESS_LOG.md`를 참고한다.

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
| M8 | CLI vertical slice | player 생성부터 archive/Echo/next loop까지 CLI 플레이 구현 |
| M9 | Observability and QA | structured logging, OTel span skeleton, smoke aggregation 구현 |
| M10 | Streamlit playable demo | 브라우저에서 player 생성, loop 진행, archive, Echo carry-over, 이미지/Ollama 확인 |

## Post-MVP Milestones

| ID | Milestone | Result |
| --- | --- | --- |
| M11 | Streamlit Demo Polish | saved player/loop selector, loop resume UX, active/archived 표시, asset/Echo layout 정리 |

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
| M14 | Developer Experience | Ruff(Lint/Format), Mypy(Type Check) 도입, Makefile 명령어 정비 및 전역 타입 에러 해결 |
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
- Current lightweight verification: `make lint`, `make typecheck`, `make test` (69 tests, 2 skipped).

## Completed Architecture Baseline

- Docker는 local infra만 담당한다.
- Ollama와 FLUX worker는 Mac host에서 실행한다.
- PostgreSQL이 authoritative runtime state다.
- Streamlit과 CLI는 `RuntimeSessionService`를 공유한다.
- `st.session_state`는 view state만 저장한다.
- 이미지 생성은 플레이어 뷰에서 핵심 비트 중심으로 자동 생성되며, 기본 저장소는 MinIO다.
- 이미지 생성 기본 백엔드는 Apple MLX `mflux`이고, diffusers FLUX 경로는 폴백으로 유지한다.

## Archive Reference

M0-M10의 상세 체크리스트, work log, verification log는 `docs/archive/IMPLEMENTATION_M0_M10.md`에 보존한다.

# Completed Summary

최종 갱신: 2026-05-30

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
| M14 | Developer Experience | Ruff(Lint/Format), Mypy(Type Check) 도입, Makefile 명령어 정비 및 전역 타입 에러 해결 |
| M20 | Configuration Decoupling | 하드코딩된 시나리오 설정을 `scenario.json`으로 분리, MinIO를 기본 이미지 저장소로 지정 |

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

## Completed Architecture Baseline

- Docker는 local infra만 담당한다.
- Ollama와 FLUX worker는 Mac host에서 실행한다.
- PostgreSQL이 authoritative runtime state다.
- Streamlit과 CLI는 `RuntimeSessionService`를 공유한다.
- `st.session_state`는 view state만 저장한다.
- 이미지 생성은 기본 disabled이며, 명시적으로 켠 경우에만 FLUX를 호출한다.

## Archive Reference

M0-M10의 상세 체크리스트, work log, verification log는 `docs/archive/IMPLEMENTATION_M0_M10.md`에 보존한다.

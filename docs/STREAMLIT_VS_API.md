# Streamlit 버전 vs API(웹) 버전 비교

최종 갱신: 2026-06-03

Project MythOS는 현재 **두 개의 프론트엔드**가 같은 런타임(`RuntimeSessionService`)을 공유한다. 이 문서는 둘의 차이와 역할을 정리한다.

## 한 줄 요약

- **Streamlit**(`streamlit_app.py`): 지금까지의 **주력 플레이 UI**. 기능이 가장 완전하다.
- **API + PoC**(`src/mythos_api/`): Streamlit을 대체할 **디커플드 웹 아키텍처(P3)**. 백엔드는 완성, 프론트는 아직 패리티 진행 중(`docs/plans/2026-06-03-poc-parity-roadmap.md`).

> 둘 다 **동일한 게임 로직**을 쓴다. 차이는 전적으로 **표현/전달 계층**에 있다 — 게임 규칙·엔진·저장소는 공유된다.

## 아키텍처

| | Streamlit | API + 웹 클라이언트 |
| :-- | :-- | :-- |
| 구조 | 모놀리식(서버=UI 한 프로세스) | 디커플드(FastAPI 백엔드 ↔ 브라우저 클라이언트) |
| 진입 | `make streamlit` (`streamlit_app.py`) | `make api` (`python -m mythos_api`) |
| 렌더링 | 서버사이드 rerun, 위젯 재실행 | 클라이언트 렌더(vanilla JS), 서버는 JSON만 |
| 전송 | Streamlit 세션(전체 rerun) + 전투용 localhost iframe JSON 브리지 | REST(`/api/v1`) + WebSocket 스트리밍 |
| 상태 | `st.session_state` (서버 메모리) | 클라이언트 state + 요청별 서버 store |
| 서사 스트리밍 | 토큰을 화면에 직접 기록 | WS `token` 프레임 → 클라이언트 누적(타입라이터) |
| 이미지 | `st.image`(동기/비동기 + presets) | 비동기 워커 → `visual_status` WS 프레임 → presigned URL |
| 배포 | 단일 프로세스 로컬 | 백엔드/프론트 분리 가능, 워커·스토리지 수평 확장 여지 |
| 멀티 클라이언트 | 사실상 단일 | API라 다중 클라이언트/원격 가능 |

## 기능 패리티 (2026-06-03)

| 기능 | Streamlit | API/웹 |
| :-- | :-- | :-- |
| 내러티브 + 선택지 + 토큰 스트리밍 | ✅ | ✅ |
| 씬 이미지(비동기) | ✅ (presets) | ✅ |
| HUD | ✅ (풀 RPG 스탯/autonomy) | ⚠️ stability/tension |
| 전투 (조작) | ✅ (드래그 보드·로스터·SFX·콘솔로그·미니맵) | ✅ 조작 가능(표적/공격/스킬/이동·HP/사거리)·기본 캔버스 |
| 온보딩(시나리오·아키타입 선택) | ✅ | ✅ (S1) |
| 이어하기 / 엔딩 화면 | ✅ | ✅ (S1, 기본형) |
| Codex(단서·로어·인벤·캐릭터 도시에) | ✅ | ❌ (S2) |
| 회상 잔향(Echoes) | ✅ | ❌ (S2) |
| Save/Load 슬롯·기록 보관소·메타 해금 | ✅ | ❌ (S3) |
| 전투 심화(로스터·콘솔로그·인텐트·미니맵·보드확대) | ✅ | ❌ (S4) |
| 오디오(BGM/SFX)·오프닝 시네마틱 | ✅ | ❌ (S5) |
| Developer 뷰(인과율·NPC 아젠다·시뮬레이터) | ✅ | ❌ (S6, 선택) |

범례: ✅ 구현 · ⚠️ 부분 · ❌ 미구현(괄호=패리티 로드맵 단계)

## 공유되는 것 (차이 아님)

- 게임 엔진/규칙: `mythos_core` / `mythos_loop` / `mythos_combat` / `mythos_narrative`.
- 오케스트레이션: `RuntimeSessionService` (create_player/start_loop/choose/resume/archive/combat).
- 저장소: PostgreSQL, MinIO, Redis, Ollama, FLUX, OTel.
- 따라서 **밸런스·시나리오·엔진 수정은 양쪽에 동시 반영**된다.

## API만의 강점 / 한계

강점: 프론트 자유도(임의 UI/모바일/원격), 다중 클라이언트, 명확한 계약(테스트 용이), 워커/스토리지 수평 확장.

한계(현재): 클라이언트 기능이 Streamlit 대비 미완(S2~S5), 인증 레이어 없음(식별자 요청 바디 전달), 빌드리스 vanilla라 상태 많은 화면은 유지비 증가(S3~S4에서 옵션 A=Next.js 전환 재평가).

## 언제 무엇을 쓰나

- **지금 실제로 플레이/데모**: Streamlit(`make streamlit`).
- **웹/원격/통합·API 계약 확인**: API + PoC(`make api`, `http://127.0.0.1:8000`). 엔드포인트는 `docs/API.md`.
- **장기 방향**: API 디커플드 아키텍처로 수렴. PoC를 패리티까지 키우거나(빌드리스), 옵션 A로 풀 SPA 전환.

## 참고

- API 사용/엔드포인트: `docs/API.md`
- 백엔드 설계: `docs/plans/2026-06-03-web-ui-decoupling.md`
- 프론트 결정/UX: `docs/plans/2026-06-03-frontend-slice4.md`, `docs/plans/2026-06-03-poc-ux-improvement.md`
- 패리티 로드맵: `docs/plans/2026-06-03-poc-parity-roadmap.md`

# PoC → Streamlit 패리티 로드맵

작성일: 2026-06-03
상태: 완료 (React SPA 마이그레이션 및 패리티 완료)
대상: `src/mythos_api/` (FastAPI 어댑터 + `static/` vanilla 클라이언트)

PoC 웹 클라이언트를 현재 `streamlit_app.py` 수준의 플레이어 경험까지 끌어올리기 위한 단계 계획. 각 단계는 보통 **API 엔드포인트 추가 + 클라이언트 UI** 두 겹이다(PoC는 빌드리스 vanilla 유지).

## 현재 격차 요약

`docs/plans/2026-06-03-poc-ux-improvement.md`의 UX 개선(팔레트·레이아웃·HUD·전투 조작)은 완료. 남은 것은 기능 표면:

| 기능 | Streamlit | PoC |
| :-- | :-- | :-- |
| 내러티브/선택지/스트리밍/이미지/전투 조작/HUD | ✅ | ✅ |
| 온보딩(아키타입·시나리오 선택)·LOAD·엔딩 화면 | ✅ | ❌ → **S1** |
| Codex(단서·로어·인벤·캐릭터 도시에)·회상 잔향 | ✅ | ❌ → **S2** |
| Save/Load 슬롯·기록 보관소·메타 해금 | ✅ | ❌ → **S3** |
| 전투 심화(로스터·콘솔 로그·적 인텐트·미니맵·보드 확대) | ✅ | ❌ → **S4** |
| 오디오(BGM/SFX)·오프닝 시네마틱 | ✅ | ❌ → **S5** |
| Developer 뷰(인과율·아젠다·시뮬레이터) | ✅ | ❌ → **S6(선택)** |

## 단계

### S1 — 온보딩 / 세션  `[in progress]`
- API: `GET /api/v1/scenarios` (시나리오 목록 + 아키타입: name/attributes/stats/starting_item).
- 클라이언트: 시작 화면(시나리오 선택 + 아키타입 카드), connect에 archetype·begin에 scenario_id 전달. localStorage로 player_id 보존 → "이어하기"(`GET /loops/active`). 엔딩(phase=ended) 화면.

### S2 — Codex / 기억
- API: `GET /api/v1/memory?player_id=` (memory_overview: 단서/로어/인벤/회상 잔향). 캐릭터 도시에는 scenario.characters + 씬 등장 인물.
- 클라이언트: Codex 탭(단서·로어·인벤토리·캐릭터), 회상 잔향 패널.

### S3 — Save/Load · 기록
- API: `GET /api/v1/save-slots?player_id=`, `POST /api/v1/save-slots` (명시 SAVE), `GET /api/v1/runs?player_id=` (run summaries).
- 클라이언트: 세이브 슬롯 목록/로드, 오토세이브 상태, 명시 SAVE 버튼, 기록 보관소, 메타 해금 표시.
- **재평가 지점**: 상태 화면이 늘어나는 시점 → 옵션 A(Next.js) 전환 검토.

### S4 — 전투 심화
- 대부분 기존 데이터(radar/available)로 가능. 로스터 패널, 콘솔 로그(prose 이력), 적 인텐트(엔진 노출 필요 시 추가), 보드 확대(전투 시 본문 영역으로), 미니맵.

### S5 — 오디오 / 시네마틱
- API: 오디오 자산 서빙(BGM/SFX presigned 또는 static). snapshot.bgm_path는 이미 존재.
- 클라이언트: BGM 루프/SFX, 오프닝 시네마틱(Ken Burns·타이프라이터·glitch).

### S6 — Developer 뷰 (선택)
- 인과율 모니터, NPC 아젠다 타임라인, 전투 시뮬레이터, 자산 브라우저. 플레이어 패리티엔 불필요.

## 규모/순서

- 플레이어 패리티(S1~S5): 약 5 증분. S3~S4에서 옵션 A 전환 재평가.
- 완전 패리티(+S6): 6 증분.
- 비목표: 게임 로직/백엔드 게임플레이 변경(순수 프레젠테이션 + 읽기 API). 빌드리스 유지(옵션 A 결정 전까지).

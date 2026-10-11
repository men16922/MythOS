# Mythos 2.0 — 세계:접속 "Signal Run"

정전과 감시의 도시 네오서울. 관리자 AI **IX**의 첨탑을 향해 세 개의 막을 돌파하는 1인용 **전술 덱빌딩 로그라이트**다.

- **전투**: 적이 다음에 칠 칸을 미리 보여 주는 7×5 보드(Into the Breach 방식). 피하고, 막고, 밀어서 적끼리 치게 하고, 붕괴 구역에 빠뜨린다. 불길·전기 바닥이 지형을 바꾼다.
- **빌드**: 카드 덱(Slay the Spire 방식) + 임플란트 + 동료 6명(전투 패시브·전용 카드).
- **루프**: 한 판 약 30분. 쓰러지면 모은 에코로 아카이브에서 해금하고 다시 접속한다. 매일 모두가 같은 런을 하는 **오늘의 시드**.
- **AI GM**: 사건 내레이션, 은신처 동료 대화, 전투 중 IX 통신. 미리 쓴 글이 먼저 나오고 AI는 진행을 막지 않는다.

웹(Cloud Run)과 안드로이드 앱(Capacitor)으로 배포한다. 이전 1.x(AI 내레이션 루프 TRPG)는 **`1.0` 브랜치**에 보존돼 있다.

## 시작하기

```bash
make setup                 # Python venv + npm 의존성
make api                   # http://127.0.0.1:8000  (포트가 쓰이고 있으면 MYTHOS_API_PORT=8010 make api)
```

- 로컬 AI GM은 Ollama(`OLLAMA_MODEL_STORY`)를 쓴다. 없으면 미리 쓴 문장으로 대신한다.
- 저장은 브라우저에 즉시, 서버(Postgres 또는 메모리)에 이어서 동기화된다. Postgres까지 띄우려면 `make dev-up`.
- 개발 화면(HMR): `cd src/mythos_ui && npx vite` → `http://127.0.0.1:5173` (API는 로컬 서버로 프록시).
- 안드로이드: `docs/android.md`.

## 검사

```bash
make check          # 전체 게이트 (lint · 타입 · 엔진/콘텐츠 테스트 · Python 테스트 · 문서 예산)
make test-v2        # 엔진/콘텐츠 테스트 (node --test)
make test-e2e-v2    # 헤드리스 브라우저 스모크 (항상 무음; make frontend-build 먼저)
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/mythos_ui/src/v2/engine` | 순수 TS 게임 엔진 (시드 RNG, JSON 상태, 리듀서, 봇·시뮬레이터) |
| `src/mythos_ui/src/v2/content` | 카드·적·조우·사건·동료·엔딩 등 게임 데이터 |
| `src/mythos_ui/src/v2/ui` | 화면, 전투 보드·연출, 사운드 |
| `src/mythos_ui/android` | 안드로이드 앱 (Capacitor) |
| `src/mythos_api` | 웹 서버 (SPA, `/resources`, CORS) |
| `src/mythos_v2` | `/api/v2` — 저장 + AI GM (내레이션, 자유 행동, 동료 대화, IX 통신) |
| `resources/neo-seoul` | 그림·음악 (`scripts/v2_assets`로 재생성) |

## 문서

먼저 `docs/AGENT_BRIEF.md` → `docs/STATUS.md` → `docs/NEXT_PLAN.md`. 규칙은 `docs/GAMEPLAY.md`, 설계 계약은 `docs/plans/2026-10-10-mythos-2.0.md`. 문서 운영 원칙은 `docs/README.md`와 `docs/DOCS_POLICY.md`.

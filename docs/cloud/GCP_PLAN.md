# GCP 배포 초안 (GCP_PLAN.md)

작성일: 2026-06-21 · 상태: 초안(draft) · 성격: 아이디어 스케치 (구현 착수 전)

로컬 MVP 런타임(`docs/STATUS.md` 참조)을 Google Cloud에 올릴 때의 형태·비용·전환 작업을 정리한
간결 초안. 단가는 모두 **대략적 ballpark**이며 GCP/Gemini 가격은 자주 바뀌므로 실제 산정 전
현재 가격표 확인 필수.

> **실배포 절차(gcloud 명령 시퀀스)·구체 비용 예상·비용 캡 레버는 `DEPLOY.md` 런북 참조.**
> 이 문서(GCP_PLAN)는 설계·매핑, DEPLOY.md는 실행 런북.

## 1. 핵심 통찰

- 로컬에서 무겁던 두 덩어리(**Ollama 서사 LLM + FLUX MPS 이미지**)가 클라우드에선 **API 호출로 대체**된다 → GPU/MPS 서버 불필요.
- 코드의 추상화(`MythOSStore` ABC / `JSONProvider` / `VisualProvider` + `StorageAdapter`) 덕에 실질 신규 작업은 **어댑터 3개 + 컨테이너화**.
- 진짜 비용 드라이버는 **서사 LLM이 아니라 ① 이미지 생성 ② 항상 켜진 DB**.

## 2. 컴포넌트 매핑

| 현재(로컬) | GCP 대응 | 코드 변경 |
|---|---|---|
| FastAPI `/api/v1` (REST/WS) | **Cloud Run** (컨테이너, scale-to-zero, WS 지원) | 컨테이너화 |
| React+TS SPA (Vite) | **Vercel**(권장 대안) / Firebase Hosting / GCS+CDN | 빌드 산출물 배포 |
| PostgreSQL | **Cloud SQL** / AlloyDB (또는 외부 Neon) | `DATABASE_URL` 교체 |
| MinIO (boto3/S3) | **Cloud Storage (GCS)** | `StorageAdapter` 신규 1개 |
| Redis 비주얼 큐 | **Memorystore** / Cloud Tasks / 인프로세스 | 소규모면 제거 |
| **Ollama 서사** | **Gemini API** (Vertex AI / AI Studio) | `JSONProvider` 신규 (`GeminiJSONProvider`) |
| **FLUX(MPS) 이미지** | **Imagen / Gemini 이미지** (Vertex AI) | `VisualProvider` 신규 (`VertexImageProvider`) |
| OTel/Jaeger | **Cloud Trace** | exporter 교체 |

신규 작업 요약: **`GeminiJSONProvider`, GCS `StorageAdapter`, Vertex `VisualProvider`** 3개 +
컨테이너화. `RuntimeSessionService`/엔진/스토어 코어는 무변경.

### 2.1 프론트 호스팅 — Vercel 하이브리드 (권장)

프론트는 Vercel로 빼는 게 GCS+CDN보다 낫지만, **백엔드는 Vercel에 못 올린다** — 서버리스 함수가
persistent **WebSocket을 미지원**(서사 토큰 스트리밍 `useGameSocket`/`useTypewriter`가 WS 의존) +
백그라운드 워커(Redis 비주얼 큐) 부재가 결정타.

| 부분 | Vercel 적합 | 이유 |
|---|---|---|
| React SPA (Vite) | ✅ 최적 | 정적 빌드 호스팅 = 본업 |
| FastAPI REST | △ 가능·비권장 | persistent 서버 아님, 실행시간 제한 |
| **WebSocket 스트리밍** | ❌ 불가 | 서버리스 함수 WS 미지원 ← 결정타 |
| 이미지 워커/Redis 큐 | ❌ 불가 | 상시 백그라운드 프로세스 없음 |

**권장 하이브리드:** 프론트 **Vercel** + 백엔드(REST+WS) **Cloud Run**(또는 Render/Railway/Fly) +
DB **Neon**(Vercel과 1급 통합) + 이미지 **GCS / Cloudflare R2**.

> 백엔드까지 Vercel로 가려면 **WS→SSE/HTTP 스트리밍 전환** + 이미지 동기화/외부 큐(Cloud Tasks·QStash)
> 리팩터가 필요. Python on Vercel은 성숙도 낮음 → 현 단계엔 **백엔드는 컨테이너, 프론트만 Vercel**이 가성비 최선.

## 3. 비용 — 사용량 비례 (플레이할 때만)

| 항목 | 단가(대략) | 한 플레이(≈30턴) |
|---|---|---|
| 서사 LLM (Gemini Flash) | 턴당 ~$0.001~0.002 | **< $0.05** (사실상 무시 가능) |
| 이미지 생성 (Imagen/Gemini) | 장당 ~$0.02~0.04 | $0.2~0.8 (10~20장) ← **변동비 핵심** |

> 절감: 앵커 큐레이션 이미지(`scenes/*.png`)를 GCS에 사전 적재 + 동적 생성 최소화.
> 이미 `_curated_anchor_image()` 가드가 앵커에서 생성을 스킵하므로 그대로 비용 절감으로 이어짐.

## 4. 비용 — 고정비 (놀고 있어도 과금)

| 항목 | 월 대략 | 비고 |
|---|---|---|
| Cloud SQL Postgres | $25~50 | **항상 켜짐 = idle 비용 주범** |
| Cloud Run | ~$0 | scale-to-zero, 무료 티어 내 |
| Cloud Storage | ~$0~1 | 이미지 수 GB 기준 |
| Memorystore Redis | $35~50 | 항상 켜짐 → **소규모면 제거 권장** |

## 5. 데이터 스토어 선택지

`MythOSStore` ABC가 교체 seam. 도메인이 키/aggregate 기반이라 NoSQL도 적합하지만, migration 005에서
일부러 관계형 정규화(쿼리 가능성)한 점이 NoSQL 전환의 마찰.

| 선택지 | 과금 | 전환 노동 | 적합 상황 |
|---|---|---|---|
| **Cloud SQL** | 항상 과금 | `DATABASE_URL`만 | "전부 GCP 한 울타리" |
| **Neon (외부 서버리스 PG)** | idle ~$0 | `DATABASE_URL`만 | "코드 0수정 + 놀 때 0원" ← 비용 최적 |
| **Firestore** (GCP의 DynamoDB 대응) | pay-per-request, scale-to-zero | `dynamo_store.py` 격 신규 + 싱글테이블/액세스패턴 설계 | "관계형 쿼리 영영 불필요" 확신 시 |
| Bigtable | 노드 상시 | 큼 | 대용량 wide-column (이 규모엔 과함) |

> AWS↔GCP 대응: DynamoDB → **Firestore(Native)** / Keyspaces → Bigtable / RDS → Cloud SQL.

## 6. 시나리오별 총합 (대략)

| 시나리오 | 고정비/월 | 변동비 | 합계 감각 |
|---|---|---|---|
| 개인/데모 (Neon + Redis 제거) | ~$0~15 | 플레이당 $0.2~0.8 | **월 몇 달러** |
| GCP 정석 (Cloud SQL + Memorystore) | ~$60~100 | + 사용량 | 월 수십~백 달러 |

## 7. 권장 결론

1. **고정비 절감 최우선** — Cloud SQL 대신 Neon, Redis 제거 → "안 놀 때 $0"에 수렴.
2. **이미지가 변동비 핵심** — 앵커 큐레이션 + Imagen 호출 빈도 관리.
3. **서사는 Gemini Flash로 충분** — Pro는 핵심 장면만.
4. NoSQL(Firestore) 전환은 "관계형 쿼리 불필요" 확신이 설 때가 손익분기. 단순 비용만이면 서버리스 PG가 노동 0으로 같은 이득.

## 8. 다음 단계 (착수 시)

- `[x]` `GeminiJSONProvider` (`mythos_narrative.gemini_provider.VertexGeminiJSONProvider`, controlled generation, `MYTHOS_NARRATIVE_PROVIDER` factory, `stream`) — 2026-06-28, gate-verified.
- `[x]` GCS `StorageAdapter` (`visual_service.GCSStorageAdapter`, `google-cloud-storage`, `gs://` + v4 signed URL, `MYTHOS_STORAGE_BACKEND=gcs`) — 2026-06-28.
- `[x]` `VertexImageProvider` (`visual_service.VertexImageProvider`, Imagen via google-genai, `MYTHOS_VISUAL_PROVIDER=vertex`) — 2026-06-28.
- `[x]` Cloud Run 컨테이너화 + WS 검증 — 2026-06-28. `Dockerfile`(python:3.11-slim, **lean** = torch/diffusers/mflux/streamlit 제외, `requirements-cloud.txt` + `pip install --no-deps -e .`) + `.dockerignore` + `make cloud-image`/`cloud-run-local`. 로컬 검증: 287MB 이미지, DB 없이 부팅, `/`(SPA) 200 · `/api/v1/health` 200 · WS `/api/v1/loops/stream` 101 핸드셰이크 OK. API 저장 서명경로 `get_storage_adapter()`가 `MYTHOS_STORAGE_BACKEND`로 env 구동(gcs|minio). 실제 `gcloud run deploy`는 human/infra.
- `[x]` **이미지 쓰기경로 GCS 배선** — 2026-06-28. NEW `storage_adapter_for(kind)` (gcs|minio|filesystem) 팩토리를 `visual_orchestration.py`/`visual_worker.py` 양쪽에 적용; `default_storage_adapter()`가 이를 위임. `RuntimeOptions.image_storage` 기본값이 `MYTHOS_STORAGE_BACKEND`(default minio)에서 옴 → **단일 env 변수가 읽기/서명 + 쓰기(sync+worker) 저장소를 일괄 구동**. 로컬 동작 불변(unset→minio).
- `[ ]` DB 결정 (Neon vs Cloud SQL vs Firestore) 후 연결 검증 (human/infra-gated)
- `[x]` `[manual]` 실제 Vertex 프로젝트 live-test (Gemini 서사 + Imagen) — 2026-06-28 ADC로 검증: Gemini 3/3 success ~5s, Imagen 1024² ~6.9s.

> 주의: 현 cloud 스택 기술은 `bin/docs/archive/DRAFT.md` 기준 **aspirational**. 본 문서는 그 구체화 초안.

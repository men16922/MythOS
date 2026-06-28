# MythOS GCP 클로즈베타 배포 런북 (DEPLOY.md)

작성일: 2026-06-28 · 성격: **실배포 절차 + 비용** 운영 런북. 전략은 `CLOSED_BETA_FEEDBACK_STRATEGY.md`,
기술 설계는 `GCP_PLAN.md`. 이 문서는 *어떻게 올리는가*와 *얼마 드는가*를 다룬다.

> 전제: provider/adapter/container 코드는 모두 완료·검증됨(`gemini_provider.py`, `visual_service`
> Vertex/GCS, `Dockerfile` lean 287MB, `make check` 588 green; Vertex live 검증 Gemini 3/3·Imagen 1024²).
> 남은 건 **GCP 리소스 프로비저닝**(human/infra)뿐. 가격은 2026-06 검색 기준 **근사치** → 착수 시 현재가 재확인.

## 0. 배포 후 아키텍처

| 컴포넌트 | GCP | 비고 |
|---|---|---|
| FastAPI 백엔드(REST+WS) | **Cloud Run** (lean 컨테이너, scale-to-zero) | `Dockerfile` |
| React SPA | 컨테이너 동봉(`/` 정적 mount) | 별도 호스팅 불필요(초기) |
| 서사 LLM | **Vertex Gemini** (`gemini-2.5-flash`, controlled gen, thinking off) | `MYTHOS_NARRATIVE_PROVIDER=gemini` |
| 이미지 | **Vertex Imagen** (`imagen-3.0-generate-002`) | `MYTHOS_VISUAL_PROVIDER=vertex` |
| 에셋 저장 | **GCS** (`gs://` + v4 signed URL) | `MYTHOS_STORAGE_BACKEND=gcs` |
| DB | **Neon**(권장) 또는 Cloud SQL | `DATABASE_URL` |
| 인증 | Cloud Run 서비스계정 ADC(키파일 불필요) | `GOOGLE_GENAI_USE_VERTEXAI=TRUE` |

## 1. 사전 준비 (1회)

```bash
PROJECT_ID=project-ec7809f7-0fb5-45d4-b6d        # .env 와 동일
REGION=us-central1
gcloud config set project $PROJECT_ID

# 필요한 API 활성화
gcloud services enable run.googleapis.com aiplatform.googleapis.com \
  storage.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Cloud Run 런타임 서비스계정 (전용 SA 권장)
gcloud iam service-accounts create mythos-run --display-name "MythOS Cloud Run"
SA=mythos-run@$PROJECT_ID.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member serviceAccount:$SA --role roles/aiplatform.user        # Vertex(Gemini+Imagen)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member serviceAccount:$SA --role roles/cloudtrace.agent       # Cloud Trace(관측성)
```

## 2. GCS 에셋 버킷

```bash
BUCKET=mythos-assets-$PROJECT_ID
gcloud storage buckets create gs://$BUCKET --location $REGION --uniform-bucket-level-access
# 런타임 SA 에 객체 읽기/쓰기(서명용)만 부여 — 공개 X (앱이 v4 signed URL 발급)
gcloud storage buckets add-iam-policy-binding gs://$BUCKET \
  --member serviceAccount:$SA --role roles/storage.objectAdmin
```

## 3. DB

- **Neon(권장, 비용 최적):** neon.tech 에서 PG 생성 → 연결 문자열을 `DATABASE_URL` 로. idle 시 ~$0.
- **Cloud SQL(올-GCP):** `gcloud sql instances create` + Cloud SQL Auth Proxy / 커넥터. 상시 과금($25~50/월).
- 어느 쪽이든 **마이그레이션 적용**: `migrations/*.sql`(001~007)을 대상 DB에 1회 실행.

## 4. Cloud Run 배포

```bash
# Dockerfile 로 Cloud Build → Cloud Run (소스 빌드, Artifact Registry 수동 푸시 불필요)
gcloud run deploy mythos-api \
  --source . --region $REGION --service-account $SA \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 3 \         # 비용캡: idle=0, 동시 폭주 상한
  --concurrency 20 --cpu 1 --memory 1Gi \
  --set-env-vars "MYTHOS_NARRATIVE_PROVIDER=gemini,MYTHOS_VISUAL_PROVIDER=vertex,MYTHOS_STORAGE_BACKEND=gcs,GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_LOCATION=$REGION,MODEL=gemini-2.5-flash,IMAGEN_MODEL=imagen-3.0-generate-002,GEMINI_THINKING_BUDGET=0,GCS_BUCKET_ASSETS=$BUCKET,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,MYTHOS_TRACE_BACKEND=gcp" \
  --set-env-vars "DATABASE_URL=<neon-or-cloudsql-url>" \
  --set-env-vars "MYTHOS_INVITE_KEYS=<key1,key2,...>"    # 초대키 게이팅(설정 시 /api/v1/* 보호)
```

- `$PORT` 는 Cloud Run 이 주입 → `Dockerfile` CMD 가 `MYTHOS_API_PORT` 로 매핑(코드 무수정).
- ADC: Cloud Run 은 SA 자격으로 자동 인증 → 키파일/`GEMINI_API_KEY` 불필요.
- **이미지 비동기 워커**: 클로즈베타는 Redis/워커 없이 가는 게 단순(비용↓). 그러면 이미지가 **요청 내 동기 생성**
  (`image_sync_fallback`)으로 떨어짐 — 턴당 ~7s 추가. 원하면 별도 워커(2nd Cloud Run/Cloud Tasks)는 follow-up.

## 5. 배포 검증

```bash
URL=$(gcloud run services describe mythos-api --region $REGION --format 'value(status.url)')
curl -s $URL/api/v1/health           # {"status":"ok"}
curl -so /dev/null -w '%{http_code}\n' $URL/    # 200 (SPA)
# WS: wss://.../api/v1/loops/stream 핸드셰이크 → 한 루프 끝까지 1회 플레이(서사+이미지+종료) 수동 확인
```

## 6. 비용 예상 (2026-06 근사 · 착수 시 현재가 재확인)

단가(검색 기준): **Gemini 2.5 Flash** $0.30/1M in, $2.50/1M out · **Imagen 3** $0.04/img(std), $0.02(fast) ·
Cloud Run scale-to-zero ≈ idle $0 · Cloud Trace 월 2.5M span 무료.

**한 루프(≈30턴) 변동비:**

| 항목 | 산식 | 한 루프 |
|---|---|---|
| 서사(Gemini Flash) | 30턴 × (~4k in×$0.3/M + ~0.6k out×$2.5/M) ≈ 턴당 ~$0.003 | **~$0.10** |
| 이미지(Imagen 3 std) | 앵커 큐레이션 제외 후 ~5–15장 × $0.04 | **~$0.2–0.6** ← 변동비 핵심 |
| **루프 합** | | **~$0.3–0.7** (이미지 지배) |

> imagen **Fast**($0.02) + **Flash-Lite**($0.10/$0.40) 로 바꾸면 루프당 ~$0.15–0.35 로 절반.

**클로즈베타 1라운드(테스터 10명 × 2루프 = 20루프):** 변동비 **~$6–15** (이미지 우세). Fast 적용 시 ~$4–10.

**월 고정비:**

| 구성 | 월 |
|---|---|
| Cloud Run(min=0) + GCS(수 GB) + Cloud Trace | **~$0–3** |
| DB = Neon(서버리스) | **~$0** (idle 0) |
| DB = Cloud SQL(상시) | +$25–50 |
| Memorystore Redis(쓰면) | +$35–50 → **베타는 제거 권장** |

**감각:** Neon + Redis 미사용 → **라운드당 ~$10–20, 월 고정 거의 $0.** Cloud SQL+Redis면 월 +$60–100.

## 7. 비용 캡 레버 (배포 전 체크)

- [ ] **결제 예산 알림**: `gcloud billing budgets create` 로 월 상한 + 50/90/100% 알림.
- [ ] **Cloud Run**: `--min-instances 0`(idle 0) · `--max-instances` 작게 · `--concurrency` 조정 · CPU/메모리 최소.
- [ ] **이미지**: 앵커 큐레이션 유지(이미 `_curated_anchor_image` 가드) · `IMAGEN_MODEL=imagen-3.0-fast-generate-001` 고려 · 턴당 동적생성 최소화.
- [ ] **모델 다운시프트**: 단순 장면은 `MODEL=gemini-2.5-flash-lite`($0.10/$0.40).
- [ ] **Vertex 쿼터**: 콘솔에서 일일 요청 상한 설정(폭주 방지).
- [ ] **접근 게이팅**: `MYTHOS_INVITE_KEYS=key1,key2` 설정 → 테스터에게 `https://앱?invite=key1` 링크 배포(코드 완료, §9).
- [ ] **테스터당 루프 캡**: (코드 미구현 — §9).

## 8. 운영 / 정리

```bash
gcloud run services logs read mythos-api --region $REGION       # 구조화 JSON 로그
gcloud run services update-traffic mythos-api --to-revisions <PREV>=100   # 롤백
gcloud run services delete mythos-api --region $REGION          # teardown
gcloud storage rm -r gs://$BUCKET                               # 버킷 정리
```

## 9. 미구현 — 배포 전/직후 필요한 §3 코드 (아직 없음)

CLOSED_BETA §3 최소기능 중 **코드가 아직 없는** 것(전부 자율 구현 가능, 다음 후보):
- **테스터당 루프/이미지 캡** — 비용 상한.
- **피드백 캡처** — 종료 화면 설문 링크(§5 질문) + Discord 안내. (run-history/metrics 영속은 이미 있음)

> ✅ **초대키 게이팅 구현 완료**(2026-06-28): `MYTHOS_INVITE_KEYS`(콤마구분) 설정 시 `/api/v1/*`(─`/health`)에
> 키 요구 — REST `X-Invite-Key` 헤더/`?invite=`, WS `?invite=`. 미설정 시 완전 개방(로컬/테스트 불변). SPA가
> URL `?invite=`를 읽어 localStorage 보관 후 자동 전송. 실서버(uvicorn) 검증: no-key 401/WS reject, key 200/connect.
> ✅ **Cloud Trace exporter 구현 완료**: `MYTHOS_TRACE_BACKEND=gcp|none|otlp`(`[gcp]` extra + SA `roles/cloudtrace.agent`).

> 비고: 위 2개가 빠져도 *기능상* 한 루프 플레이는 가능하나, **비용/접근 안전장치 없이는 공개 배포 금지**.
> 초대키 게이팅(코드 완료)은 `MYTHOS_INVITE_KEYS` 설정 + 결제 예산 알림(§7)이 배포 전 필수.

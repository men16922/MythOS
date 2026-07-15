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
| 이미지 | **Vertex Gemini Image** (`gemini-2.5-flash-image`, 큐레이트 초상 레퍼런스) | `MYTHOS_VISUAL_PROVIDER=vertex` |
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

> **재배포(env-보존)는 `make deploy`** — `.env`의 `PROJECT_ID`를 `--project`로 **항상 명시**한다.
> ambient `gcloud config` 프로젝트에 의존하지 말 것(한 번 다른 프로젝트로 드리프트해 엉뚱한 곳에
> stray 서비스가 배포된 적 있음, 2026-07-09). `make deploy`는 `--set-env-vars` 없이 `--source .`만
> 올려 기존 리비전 env(MODEL/DATABASE_URL/초대키)를 보존한다. 최초 생성/환경 변경 시에만 아래 전체 명령.

```bash
# Dockerfile 로 Cloud Build → Cloud Run (소스 빌드, Artifact Registry 수동 푸시 불필요)
gcloud run deploy mythos-api \
  --source . --region $REGION --service-account $SA \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 3 \         # 비용캡: idle=0, 동시 폭주 상한
  --concurrency 20 --cpu 1 --memory 1Gi \
  --set-env-vars "MYTHOS_NARRATIVE_PROVIDER=gemini,MYTHOS_VISUAL_PROVIDER=vertex,MYTHOS_STORAGE_BACKEND=gcs,GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_LOCATION=$REGION,MODEL=gemini-2.5-flash,IMAGEN_MODEL=gemini-2.5-flash-image,GEMINI_THINKING_BUDGET=0,GCS_BUCKET_ASSETS=$BUCKET,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,MYTHOS_TRACE_BACKEND=gcp" \
  --set-env-vars "DATABASE_URL=<neon-or-cloudsql-url>" \
  --set-env-vars "MYTHOS_INVITE_KEYS=<key1,key2,...>" \   # 초대키 게이팅(설정 시 /api/v1/* 보호)
  --set-env-vars "MYTHOS_MAX_LOOPS_PER_PLAYER=10"        # 테스터당 루프 캡(베타 채택값; ~5–7.5h/인, ~$3–7/인)
```

- `$PORT` 는 Cloud Run 이 주입 → `Dockerfile` CMD 가 `MYTHOS_API_PORT` 로 매핑(코드 무수정).
- ADC: Cloud Run 은 SA 자격으로 자동 인증 → 키파일/`GEMINI_API_KEY` 불필요.
- **이미지 생성**: **요청 내 동기 생성** 단일 경로 (Redis 큐/워커는 2026-07-04 전면 제거) — 이미지 턴당 ~7s 추가.
  비동기가 필요해지면 Cloud Tasks/2nd Cloud Run이 follow-up 후보.

## 5. 배포 검증

### 5a. 배포 전 — 로컬 실전 검증 (gcloud 전에 권장)

> **빠른 길(컨테이너 없이, 호스트에서):** `make api-cloud` (서사=Vertex Gemini, 이미지=Vertex Imagen ~7s
> **요청 내 동기 생성** — Redis 워커는 2026-07-04 전면 제거, 로컬/클라우드 모두 동기 단일 경로). 저장은 로컬 minio.
> ADC + `.env`의 Google Cloud 설정 필요. ⚠️ Vertex 호출은 GCP 과금. 평소 `make api`는 완전 로컬(Ollama, 무료).
> 아래는 **컨테이너 자체** 검증:


실배포되는 lean 컨테이너를 클라우드 provider(Gemini/Imagen via ADC) + 로컬 Postgres로 띄워 검증. **검증됨 2026-06-28**:
컨테이너 부팅 OK, 실서사 1턴(VertexGemini, ~6.2s, outcome=success), DB 영속, in-container Imagen 1024² PNG OK.

```bash
gcloud auth application-default login          # ADC (1회)
make infra-up && make db-migrate               # 로컬 Postgres
make cloud-image                               # lean 이미지 빌드
PROJECT=$(grep ^PROJECT_ID= .env | cut -d= -f2)
docker run --rm -p 8096:8080 -e PORT=8080 \
  -e MYTHOS_NARRATIVE_PROVIDER=gemini -e MYTHOS_VISUAL_PROVIDER=vertex -e MYTHOS_STORAGE_BACKEND=filesystem \
  -e GOOGLE_GENAI_USE_VERTEXAI=TRUE -e GOOGLE_CLOUD_PROJECT=$PROJECT -e GOOGLE_CLOUD_LOCATION=us-central1 \
  -e MODEL=gemini-2.5-flash -e IMAGEN_MODEL=gemini-2.5-flash-image -e GEMINI_THINKING_BUDGET=0 \
  -e MYTHOS_TRACE_BACKEND=none \                # ★ 미설정 시 OTLP가 localhost:4318로 재시도 스팸
  -e DATABASE_URL=postgresql://mythos:mythos@host.docker.internal:5432/mythos \
  -e GOOGLE_APPLICATION_CREDENTIALS=/root/.config/gcloud/application_default_credentials.json \
  -v "$HOME/.config/gcloud:/root/.config/gcloud:ro" \
  mythos-api:local
# 그다음 connect→WS begin 으로 실루프 1턴 확인(서사 토큰+snapshot). 오프닝 0~4턴 이미지는 큐레이션 앵커라
# Imagen 미호출이 정상(이후 동적 장면에서 호출). Imagen 단독 확인: docker exec ... VertexImageProvider.
```

> ⚠️ **배포 시 `MYTHOS_TRACE_BACKEND=gcp` 필수**(또는 `none`). 미설정 → 컨테이너가 OTLP를 localhost:4318로
> 내보내려다 "Connection refused" 재시도 로그를 반복 출력(기능엔 무해하나 로그 오염·CPU 낭비). §4 명령에 포함됨.

### 5b. 배포 후

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

**루프 캡 ↔ 1인당 플레이 시간/비용** (`MYTHOS_MAX_LOOPS_PER_PLAYER`; 1루프 ≈ 30턴 ≈ 30–60분 ≈ $0.3–0.7):

| 캡 | 플레이/인 | AI비/인 | 비고 |
|---|---|---|---|
| 2 | ~1–2h | ~$0.6–1.4 | Echo→다음 루프(메타루프) 최소 체험 |
| 3 | ~1.5–3h | ~$0.9–2.1 | 핵심 루프 + 캐리오버 충분히 체감 |
| 5 | ~2.5–5h | ~$1.5–3.5 | 깊은 검수용 |
| **10 (베타 채택)** | ~5–7.5h | ~$3–7 | 여유롭게 반복·심화 플레이 (10명 ⇒ 전체 ~$30–70, Fast 시 절반) |

> 캡 = *새 루프 시작* 횟수(이어하기 무제한·무카운트) = 플레이스루 개수. 한 루프를 비정상적으로 길게 끌면(턴 多) 비용이 루프 추정치를 넘음(턴/이미지 비례). 위 표는 정상 플레이 기준. **단일 전역 값**(테스터별 차등 아님). env이므로 운영 중 `gcloud run services update --update-env-vars MYTHOS_MAX_LOOPS_PER_PLAYER=N`로 무중단 변경(새 revision) 가능 — **자동/예산연동 동적조정은 아님**.

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
- [ ] **테스터당 루프 캡**: `MYTHOS_MAX_LOOPS_PER_PLAYER=N` (코드 완료, §9). 변동비 테스터별 상한.

## 8. 운영 / 정리

```bash
gcloud run services logs read mythos-api --region $REGION       # 구조화 JSON 로그
gcloud run services update-traffic mythos-api --to-revisions <PREV>=100   # 롤백
gcloud run services delete mythos-api --region $REGION          # teardown
gcloud storage rm -r gs://$BUCKET                               # 버킷 정리
```

## 9. 미구현 — 배포 전/직후 필요한 §3 코드 (아직 없음)

CLOSED_BETA §3 최소기능 중 **코드가 아직 없는** 것:
- **피드백 캡처** — 종료 화면 설문 링크(§5 질문) + Discord 안내. (run-history/metrics 영속은 이미 있음)
  > 메커니즘은 자율 구현 가능하나, 실제 **설문 URL(Google Form)·질문·UX는 사람이 제작/결정**해야 의미가 있음.

> ✅ **초대키 게이팅 구현 완료**(2026-06-28): `MYTHOS_INVITE_KEYS`(콤마구분) 설정 시 `/api/v1/*`(─`/health`)에
> 키 요구 — REST `X-Invite-Key` 헤더/`?invite=`, WS `?invite=`. 미설정 시 완전 개방(로컬/테스트 불변). SPA가
> URL `?invite=`를 읽어 localStorage 보관 후 자동 전송. 실서버(uvicorn) 검증: no-key 401/WS reject, key 200/connect.
>
> ✅ **초대키 게이트 화면 추가**(2026-06-29): 키 없이 접속하면 부팅 시 `GET /api/v1/auth/verify-invite` 프로브
> → 401이면 **"Closed Beta Access" 키 입력 화면**(`InviteGate.tsx`) 표시(깨진 앱 대신). 유효키 입력→localStorage 저장
> →이후 자동 통과(브라우저당 1회). `?invite=KEY` URL로 들어오면 입력 없이 즉시 통과. 게이팅 OFF면 프로브 200→바로 진입.
> **테스터 배포**: 각자에게 `https://<앱>/?invite=<고유키>` 링크 1개 배포 → 클릭 한 번으로 입장(+세이브가 그 키로 기기 이동, Option B).
> ✅ **테스터당 루프 캡 구현 완료**(2026-06-28): `MYTHOS_MAX_LOOPS_PER_PLAYER`(int, default 0=무제한) — 초과 시 새 루프
> begin이 REST 429 / WS error frame. resume은 영향 없음. 변동비(루프당 ~$0.3–0.7)의 테스터별 상한.
> ✅ **Cloud Trace exporter 구현 완료**: `MYTHOS_TRACE_BACKEND=gcp|none|otlp`(`[gcp]` extra + SA `roles/cloudtrace.agent`).

> 비고: 위 2개가 빠져도 *기능상* 한 루프 플레이는 가능하나, **비용/접근 안전장치 없이는 공개 배포 금지**.
> 초대키 게이팅(코드 완료)은 `MYTHOS_INVITE_KEYS` 설정 + 결제 예산 알림(§7)이 배포 전 필수.

---

## 10. 배포 전 최종 체크리스트 (한 장)

> 변수: `PROJECT_ID=project-ec7809f7-0fb5-45d4-b6d` · `REGION=us-central1` · `SA=mythos-run@$PROJECT_ID.iam.gserviceaccount.com` · `BUCKET=mythos-assets-$PROJECT_ID`. 자율 코드는 전부 완료 — 아래는 **사람/인프라 작업**.

**A. 코드 (완료 — 확인만)**
- [x] EN end-to-end(서사+전투로그 K6+종료 K9) · EN 기본 언어 · BGM 자동 ON
- [x] 초대키 게이트(`MYTHOS_INVITE_KEYS`)+게이트 화면 · 루프 캡(`MYTHOS_MAX_LOOPS_PER_PLAYER`) · Cloud Trace · GCS/Imagen/Gemini 어댑터 · lean 컨테이너
- [ ] `make check` green 최종 확인 + **브랜치 push**(`feat/en-ko-s0-language-plumbing` → 머지)

**B. GCP 1회 셋업 (§1–3)**
- [ ] `gcloud config set project` + API 활성화(run/aiplatform/storage/cloudbuild/artifactregistry)
- [ ] 런타임 SA 생성 + `roles/aiplatform.user` + `roles/cloudtrace.agent`
- [ ] GCS 버킷 생성 + SA `roles/storage.objectAdmin`(공개 X)
- [ ] DB: **Neon**(권장, idle≈$0) 생성 → `DATABASE_URL` 확보 → `migrations/001~007` 1회 적용

**C. 배포 (§4)** — `gcloud run deploy mythos-api --source .` 에 env:
- [ ] `--min-instances 0 --max-instances 3 --concurrency 20 --cpu 1 --memory 1Gi`
- [ ] provider/모델 env(§4 그대로) + `DATABASE_URL` + `MYTHOS_TRACE_BACKEND=gcp`
- [ ] **`MYTHOS_INVITE_KEYS=<테스터별 고유키 콤마구분>`**
- [ ] **`MYTHOS_MAX_LOOPS_PER_PLAYER=10`** (1인 ~5–7.5h / ~$3–7)

**D. 비용 안전장치 (§7)**
- [ ] **결제 예산 알림**: `gcloud billing budgets create`(월 상한 + 50/90/100%) — *알림이지 자동중지 아님*
- [ ] **Vertex 일일 요청 쿼터**(콘솔) — 하루 폭주 차단(사실상 일일 AI비 상한)
- [ ] (선택) Imagen `imagen-3.0-fast-generate-001` / 단순장면 `gemini-2.5-flash-lite` 로 변동비 절반

**E. 사람 산출물**
- [ ] 피드백 **Google Form** URL+질문 제작(CLOSED_BETA §5) → 종료화면/안내에 노출
- [ ] 테스터별 **`https://<앱>/?invite=<고유키>`** 링크 배포(키 1개=신원=세이브 기기이동)

**F. 배포 후 검증 (§5b)**
- [ ] `/api/v1/health` 200 · `/`(SPA) 200 · `/api/v1/scenarios` 200
- [ ] 게이트: 무키 401/게이트화면, 유효키 진입 · EN 기본(새 방문자) · BGM 첫클릭 ON
- [ ] WS 핸드셰이크 → **한 루프 끝까지 1회 실플레이**(서사+이미지+**K9 자연 엔딩 화면 EN**) 수동 확인
- [ ] 루프 캡: 같은 키로 11번째 begin → 429/error (카운트는 DB 영속 → 기기 바꿔도 누적)

**G. 운영 주의**
- [ ] **DB 유지**(비우면 루프 카운트·세이브 리셋) · 모니터링(Cloud Trace/로그)

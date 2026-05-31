# Project MythOS Design Document

작성일: 2026-05-29

이 문서는 `docs/archive/DRAFT.md`의 Project MythOS / 세계:접속 기획을 바탕으로 한 시스템 설계 문서다. 목표는 로컬 환경에서 플레이 가능한 MythOS 루프 프로토타입을 만들되, 나중에 Web UI와 클라우드 환경으로 확장 가능한 경계면을 먼저 잡는 것이다. 현재 구현 상태는 `docs/STATUS.md`, 다음 계획은 `docs/NEXT_PLAN.md`, M0-M10 상세 archive는 `docs/archive/IMPLEMENTATION_M0_M10.md`를 기준으로 한다.

설계 원칙, 리스크 대응, Mermaid 다이어그램, 하드웨어/기술 스택 근거는 이 문서 하단의 부록(§17–§20)에 통합되어 있다. SQL 스키마의 권위 있는 출처는 `migrations/001_init.sql`이며, §7에 표기된 테이블 정의는 설계 의도를 보여주는 참고용이다.

## 1. 목표

Project MythOS는 AI가 운영하는 루프 기반 서사 시뮬레이션이다. 플레이어는 “접속자”이며, 매 루프마다 세계는 재편성되지만 이전 선택의 Echo는 다음 루프에 잔향으로 남는다.

1차 구현 목표:
- 로컬에서 MythOS 루프를 실행한다.
- LLM은 Ollama로 서빙한다.
- 로컬 인프라 리소스는 Docker Compose로 구성한다.
- 이미지 생성은 현재 구현된 FLUX.1-schnell MPS 파이프라인을 사용한다.
- 플레이어, 루프, 이벤트, 메모리, 이미지 asset metadata를 영속화한다.
- CLI vertical slice를 먼저 완성하고, 이후 Web UI로 확장한다.

## 2. 비목표

1차 설계에서 제외한다:
- 멀티플레이어.
- 외부 결제/계정 시스템.
- 클라우드 배포 자동화.
- 실시간 3D 렌더링.
- 완전한 모바일 앱.
- 고가용성 운영 설계.

## 3. 로컬 실행 원칙

### 3.1 Docker로 구성할 리소스

Docker Compose는 상태 저장 인프라와 개발 보조 도구를 담당한다.

- PostgreSQL: 플레이어, 루프, 이벤트, 메모리, asset metadata 저장.
- MinIO: 생성 이미지와 세션 산출물 저장을 위한 S3-compatible object storage. (`minio-init` 컨테이너가 부팅 시 버킷을 자동 생성한다.)
- Redis: job queue, transient lock, generation status cache용으로 스택에 포함되어 있으나, 현재 런타임은 동기 경로라 아직 사용하지 않는다 (`NEXT_PLAN.md` 참고).
- OpenTelemetry Collector: 런타임 trace 수집 경계. host OTLP 포트(4317/4318)를 소유하고 trace를 내부 `jaeger:4317`로 전달한다.
- Jaeger: 로컬 trace 확인.
- Adminer: 로컬 DB 확인용.

### 3.2 Docker 밖에서 실행할 리소스

Ollama와 FLUX worker는 Mac 호스트에서 실행한다.

이유:
- Ollama는 Apple Silicon에서 Metal 가속을 직접 쓰는 네이티브 실행이 가장 단순하고 안정적이다.
- Docker Desktop Linux VM 내부에서는 PyTorch MPS를 일반적으로 직접 사용할 수 없다.
- 현재 검증된 FLUX 파이프라인은 Python host process + MPS 조합이다.

따라서 Docker container에서 Ollama를 호출해야 하는 경우 endpoint는 아래를 사용한다.

```text
http://host.docker.internal:11434/v1
```

호스트에서 직접 실행하는 CLI와 Python worker는 기존처럼 아래를 사용한다.

```text
http://localhost:11434/v1
```

## 4. 전체 아키텍처

```plaintext
[User]
  |
  v
[CLI / Future Web UI]
  |
  v
[MythOS Runtime]
  |-- Session Manager
  |-- Loop Engine
  |-- Narrative Director
  |-- Myth Protocol Validator
  |-- Memory Service
  |-- Visual Service
  |
  +--> [Ollama LLM on host]
  +--> [FLUX Worker on host: Diffusers + MPS]
  |
  +--> [PostgreSQL in Docker]
  +--> [MinIO in Docker]
  +--> [Redis in Docker]
  +--> [OpenTelemetry Collector in Docker]
```

## 5. 컴포넌트 설계

### 5.1 CLI / Future Web UI

역할:
- 플레이어 생성.
- 루프 시작.
- 플레이어 입력 수집.
- 현재 장면, 선택지, 상태 출력.
- 이미지 경로 또는 URL 표시.
- 세션 resume/archive 명령 제공.

CLI 명령 (구현됨):

```bash
python -m mythos_runtime.connect_cli new-player "첫 번째 접속자" --player-id <player_id>
python -m mythos_runtime.connect_cli connect --player-id <player_id> [--fallback] [--with-image]
python -m mythos_runtime.connect_cli choose --loop-id <loop_id> (--choice-id <id> | --action "...")
python -m mythos_runtime.connect_cli resume (--loop-id <loop_id> | --player-id <player_id>)
python -m mythos_runtime.connect_cli archive --loop-id <loop_id>
```

`--fallback`는 Ollama 없이 결정적 fallback 장면을 쓴다. `--with-image`(+ `--filesystem-image`, `--image-width/height/steps`)로 대표 이미지를 생성한다. resume/archive/choose는 session id가 아니라 `loop_id`를 키로 쓴다. 같은 orchestration을 Streamlit UI(`streamlit_app.py`)와 공유한다.

### 5.2 MythOS Runtime

런타임은 여러 서비스를 조율하는 application layer다. LLM, DB, 이미지 생성 구현 세부사항을 직접 알지 않고 provider interface를 통해 호출한다.

책임:
- player/session lifecycle 관리.
- loop state load/save.
- player action을 event로 기록.
- Narrative Director 호출.
- Validator 호출.
- Memory Service 갱신.
- Visual Service job 생성.

### 5.3 Loop Engine

Loop Engine은 `connect -> explore -> interact -> rewrite -> archive -> ended` 상태 전이를 관리한다.

책임:
- loop seed 생성.
- phase transition 제어.
- stability/tension 상태 업데이트.
- 선택 결과를 state delta로 반영.
- 종료 조건 판단.
- archive 단계 트리거.

Loop Engine은 LLM이 생성한 결과를 그대로 신뢰하지 않는다. LLM 출력은 항상 Validator를 거친 뒤 state에 반영한다.

### 5.4 Narrative Director

Narrative Director는 Ollama LLM을 호출해 장면과 선택지를 생성한다.

입력:
- canonical world context.
- current loop state.
- active echoes.
- recent event log.
- player action.
- validator feedback.

출력:

```json
{
  "scene": {
    "title": "Ossuary of Whispers",
    "location": "data-layer-01",
    "narration": "...",
    "choices": [
      {
        "choice_id": "choice_...",
        "label": "Approach the signal",
        "intent": "explore"
      }
    ],
    "visual_brief": "..."
  },
  "world_delta": {
    "stability": -5,
    "tension": 8,
    "flags": ["signal_detected"]
  },
  "end_condition": null
}
```

Narrative Director는 JSON-only 응답을 목표로 한다. 실패 시 repair prompt를 한 번 수행하고, 그래도 실패하면 fallback scene을 사용한다.

### 5.5 Myth Protocol Validator

Validator는 LLM output과 runtime state update를 검증한다.

검증 규칙:
- phase는 허용된 순서로만 이동한다.
- stability와 tension은 0-100 범위를 유지한다.
- ended loop에는 event를 추가할 수 없다.
- scene choices는 1-4개다.
- Echo는 원본 loop id와 source event id를 가져야 한다.
- world_delta는 허용된 key만 포함한다.
- narration은 저장 가능한 길이를 넘지 않는다.
- visual_brief는 이미지 생성 prompt 길이 제한을 넘지 않는다.

검증 결과:

```python
ValidationResult:
  ok: bool
  errors: list[ValidationError]
  repaired_payload: dict | None
```

### 5.6 Memory Service

Memory Service는 세션 종료 또는 중요한 사건 발생 시 메모리를 갱신한다.

메모리 계층:
- PlayerMemory: 개인 경험, 관계, 해금 정보, Echo.
- WorldMemory: 전체 세계 통계, 반복 패턴, 불안정성 marker.
- NarrativeShard: 감정적/상징적 장면의 파편.

초기에는 PostgreSQL JSONB를 사용한다. 이후 graph DB 또는 vector DB가 필요해지면 store interface 뒤에서 교체한다.

### 5.7 Visual Service

Visual Service는 현재 `mythos_image_agent`를 감싸는 runtime service다.

책임:
- scene visual_brief를 FLUX prompt로 변환.
- 이미지 생성 job 생성.
- FLUX worker 호출.
- output image를 MinIO 또는 로컬 파일로 저장.
- asset metadata를 PostgreSQL에 저장.
- 이미지 생성 실패 시 텍스트 루프는 계속 진행하도록 degraded mode 제공.

현재 검증된 생성 경로:
- Ollama prompt expansion.
- Diffusers `FluxPipeline`.
- `black-forest-labs/FLUX.1-schnell`.
- `torch_dtype=torch.bfloat16`.
- Apple Silicon MPS.

### 5.8 Audio Service

Audio Service는 게임의 서사적 분위기에 맞춘 배경음악(BGM)을 관리하고 생성하는 런타임 서비스다.

책임:
- 루프 상태(`Stability`, `Tension`)를 분석하여 적절한 BGM 테마 선택.
- 로컬 AI 모델(MusicGen)을 사용한 고품질 음원 생성.
- 자동 재생 및 심리스한 사운드 전환 제어.

구성 요소:
- **AudioProvider (Protocol)**: 오디오 소스 획득 인터페이스.
- **StaticAudioProvider**: 사전에 생성된 테마곡 파일들을 상태값에 따라 매핑.
- **scripts/gen_bgm_single.py**: Meta MusicGen Medium 모델을 활용해 MPS 가속으로 4분 분량의 고품질 WAV 음원을 생성하는 도구.

BGM 매핑 로직:
- `bgm_unstable`: Stability < 30 (글리치, 불안정)
- `bgm_tense`: Tension > 70 (긴박, 추격)
- `bgm_calm`: Default (사이버펑크 앰비언트)
- `bgm_main`: 접속 화면 전용 (시네마틱 테마)

## 6. Docker Compose 리소스 설계


```bash
python agent.py "세계:접속 첫 장면" --steps 1 --width 512 --height 512
```

기본 생성 설정:

```text
steps=4
width=1024
height=1024
guidance_scale=0.0
```

## 6. Docker Compose 리소스 설계

초기 Compose 파일명:

```text
docker-compose.local.yml
```

서비스 목록:

| Service | Image | Port | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:16` | `5432` | primary relational/event/memory store |
| `adminer` | `adminer` | `8080` | DB inspection |
| `minio` | `minio/minio` | `9000`, `9001` | local S3-compatible asset store |
| `minio-init` | `minio/mc` | - | one-shot 버킷 부트스트랩 후 종료 |
| `redis` | `redis:7` | `6379` | queues, locks, transient state (현재 미사용) |
| `otel-collector` | `otel/opentelemetry-collector-contrib` | `4317`, `4318` | telemetry ingest → `jaeger:4317`로 전달 |
| `jaeger` | `jaegertracing/all-in-one` | `16686` | local trace UI (OTLP 수신은 내부 전용) |

권장 volume:

```text
.docker/postgres
.docker/minio
.docker/redis
```

권장 bucket:

```text
mythos-assets
mythos-session-exports
```

권장 local env:

```env
DATABASE_URL=postgresql://mythos:mythos@localhost:5432/mythos
REDIS_URL=redis://localhost:6379/0
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=mythos
S3_SECRET_KEY=mythos-local-secret
S3_BUCKET_ASSETS=mythos-assets
S3_BUCKET_EXPORTS=mythos-session-exports
OLLAMA_BASE_URL=http://localhost:11434/v1
```

containerized app에서 Ollama를 호출할 경우:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

## 7. 데이터 저장 설계

### 7.1 PostgreSQL 테이블

권위 있는 스키마 출처는 `migrations/001_init.sql`이며, 아래 정의는 설계 의도를 보여주는 참고용이다. 실제 migration이 추가로 두는 것:
- `loops.stability`/`loops.tension`에 `CHECK (… >= 0 AND … <= 100)` 제약.
- `scenes`에 `UNIQUE (loop_id, turn_index)` (turn별 upsert 대상).
- 루프의 `active_echoes`는 별도 컬럼이 아니라 `loops.state` JSONB 안의 `_active_echoes` 키로 직렬화된다.

#### players

```sql
CREATE TABLE players (
  player_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  traits JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

#### loops

```sql
CREATE TABLE loops (
  loop_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  seed TEXT NOT NULL,
  phase TEXT NOT NULL,
  location_id TEXT NOT NULL,
  stability INT NOT NULL,
  tension INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  state JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

#### scenes

```sql
CREATE TABLE scenes (
  scene_id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  turn_index INT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  narration TEXT NOT NULL,
  choices JSONB NOT NULL,
  visual_brief TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
```

#### events

```sql
CREATE TABLE events (
  event_id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  turn_index INT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT,
  state_delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);
```

#### player_memories

```sql
CREATE TABLE player_memories (
  memory_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

#### world_memories

```sql
CREATE TABLE world_memories (
  memory_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

#### narrative_shards

```sql
CREATE TABLE narrative_shards (
  shard_id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  player_id TEXT NOT NULL REFERENCES players(player_id),
  symbol TEXT NOT NULL,
  emotional_tone TEXT NOT NULL,
  text TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL
);
```

#### assets

```sql
CREATE TABLE assets (
  asset_id TEXT PRIMARY KEY,
  scene_id TEXT REFERENCES scenes(scene_id),
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  seed INT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  steps INT NOT NULL,
  storage_uri TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);
```

### 7.2 Indexes

```sql
CREATE INDEX idx_loops_player_id ON loops(player_id);
CREATE INDEX idx_events_loop_turn ON events(loop_id, turn_index);
CREATE INDEX idx_scenes_loop_turn ON scenes(loop_id, turn_index);
CREATE INDEX idx_player_memories_player_kind ON player_memories(player_id, kind);
CREATE INDEX idx_assets_loop_id ON assets(loop_id);
```

## 8. Object Storage 설계

구현된 key/경로:

```text
# MinIO (MinIOStorageAdapter)
images/{player_id}/{loop_id}/{scene_id}.png

# Local filesystem (FilesystemStorageAdapter)
outputs/images/{player_id}/{loop_id}/{scene_id}.png
```

Asset metadata는 DB(`assets` 테이블)에 저장하고, 파일 자체는 MinIO 또는 local filesystem에 저장한다. DB에는 binary image를 넣지 않는다.

아직 미구현 (설계 의도로 남겨둠, `NEXT_PLAN.md` 참고):

```text
images/{player_id}/{loop_id}/{scene_id}.metadata.json   # 사이드카 metadata 파일 (DB에만 저장 중)
exports/{player_id}/{loop_id}/session.json              # 세션 export
exports/{player_id}/{loop_id}/archive.md                # archive 리포트
```

`mythos-session-exports` 버킷은 부트스트랩되지만 아직 export 경로가 채우지 않는다.

## 9. Provider Interface

아래는 설계 의도이며, 실제 시그니처는 코드를 기준으로 한다.

### 9.1 LLM Provider (`mythos_narrative.director`)

```python
class JSONProvider(Protocol):
    def generate(self, messages: list[dict[str, str]]) -> str:
        ...
```

기본 구현 `OllamaJSONProvider`:
- base URL: `OLLAMA_BASE_URL`, default model: `OLLAMA_MODEL` (OpenAI-compatible chat completions, `temperature=0.4`).
- 원시 문자열을 반환하고, `mythos_narrative.parser`가 JSON으로 파싱·repair한다.

### 9.2 Visual Provider (`mythos_runtime.visual_service`)

```python
class VisualProvider(Protocol):
    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        ...
```

기본 구현 `LocalFluxProvider` → `mythos_image_agent.generator.generate_image`.
- provider name: `flux_local_mps`, model id: `black-forest-labs/FLUX.1-schnell`.
- 저장은 별도 `StorageAdapter` Protocol(`FilesystemStorageAdapter` / `MinIOStorageAdapter`)이 담당해 생성과 저장을 분리한다.

### 9.3 Store Interface (`mythos_memory.store`)

`MythOSStore`는 ABC이며 player/loop/scene/event/player·world memory/asset CRUD와 `transaction()` 컨텍스트 매니저를 정의한다. 주요 메서드:

```python
class MythOSStore(ABC):
    def create_player(self, profile: PlayerProfile) -> None: ...
    def get_player(self, player_id: str) -> PlayerProfile | None: ...
    def save_loop(self, loop: LoopState) -> None: ...
    def get_loop(self, loop_id: str) -> LoopState | None: ...
    def list_loops(self, player_id: str) -> list[LoopState]: ...
    def append_event(self, event: WorldEvent) -> None: ...
    def save_scene(self, scene: Scene) -> None: ...
    def get_latest_scene(self, loop_id: str) -> Scene | None: ...
    def save_player_memory(self, memory: PlayerMemory) -> None: ...
    def save_asset(self, asset: AssetRecord) -> None: ...
    def list_assets(self, loop_id: str) -> list[AssetRecord]: ...
    # ... 전체 목록은 store.py 참고
```

유일한 구현은 `PostgresMythOSStore`(psycopg)다. JSON/SQLite file store는 도입하지 않았다.

## 10. 런타임 시퀀스

### 10.1 Start Loop

```plaintext
User -> CLI: connect
CLI -> Runtime: start_loop(player_id)
Runtime -> Store: load player memory
Runtime -> LoopEngine: create seed and initial state
Runtime -> NarrativeDirector: generate first scene
Runtime -> Validator: validate scene and delta
Runtime -> Store: save loop, scene, events
Runtime -> VisualService: enqueue/generate scene image
VisualService -> FLUX Worker: generate image
VisualService -> MinIO: upload image
VisualService -> Store: save asset metadata
Runtime -> CLI: render scene
```

### 10.2 Player Action

```plaintext
User -> CLI: choose/action
CLI -> Runtime: apply_action(loop_id, action)
Runtime -> Store: append player event
Runtime -> NarrativeDirector: generate next scene
Runtime -> Validator: validate output
Runtime -> LoopEngine: apply state delta
Runtime -> Store: save scene and updated loop
Runtime -> CLI: render next scene
```

### 10.3 Archive Loop

```plaintext
LoopEngine -> Runtime: end condition met
Runtime -> MemoryService: extract echoes and shards
MemoryService -> Store: write player/world memories
Runtime -> Store: mark loop ended
Runtime -> ObjectStorage: export session archive
Runtime -> CLI: render archive summary
```

## 11. Configuration

권위 있는 출처는 `.env.example`이다. 아래는 핵심 키 요약이며, 런타임 로그 레벨은 `MYTHOS_LOG_LEVEL`(기본 `INFO`, 테스트는 `ERROR`)로 제어한다.

```env
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=gemma4:latest

IMAGE_MODEL_ID=black-forest-labs/FLUX.1-schnell
OUTPUT_DIR=outputs
PYTORCH_ENABLE_MPS_FALLBACK=1

DATABASE_URL=postgresql://mythos:mythos@localhost:5432/mythos
REDIS_URL=redis://localhost:6379/0

S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=mythos
S3_SECRET_KEY=mythos-local-secret
S3_BUCKET_ASSETS=mythos-assets
S3_BUCKET_EXPORTS=mythos-session-exports

OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
MYTHOS_ENV=local
```

## 12. Error Handling

### LLM failure

처리:
1. JSON parse 실패 시 repair prompt 1회.
2. repair 실패 시 fallback scene 사용.
3. 실패 내역을 `events`와 telemetry에 기록.

### Validator failure

처리:
1. 자동 수정 가능한 값은 clamp 또는 sanitize.
2. 의미가 바뀌는 오류는 LLM repair 요청.
3. 반복 실패 시 fallback scene.

### Image generation failure

처리:
1. asset status를 `failed`로 기록.
2. 텍스트 루프는 계속 진행.
3. CLI에는 이미지 생성 실패를 짧게 표시.
4. retry 명령을 별도로 제공.

### Store failure

처리:
1. DB write 실패 시 transaction rollback.
2. event append 실패 시 loop state 갱신 금지.
3. archive export 실패는 재시도 가능 상태로 남김.

## 13. Observability

`mythos_runtime.observability`가 stderr로 JSON 로그를 내보내고, OpenTelemetry가 있으면 OTLP HTTP로 trace를 export한다 (`OTEL_EXPORTER_OTLP_ENDPOINT`, service name `mythos-local`). OTel 패키지가 없으면 trace는 조용히 비활성화되고 로깅은 계속 동작한다.

구현된 structured-log 필드 (`JsonFormatter`): `ts`, `level`, `logger`, `message`, `player_id`, `loop_id`, `scene_id`, `event_id`, `asset_id`, `provider`, `model_id`, `latency_ms`, `status`. (`session_id`/`token_count_estimate`/`error_code` 등은 설계상 후보였으나 현재는 미수집.)

구현된 trace span (`timed`/`span` 사용):
- `mythos.session.connect`, `mythos.session.choose`
- `mythos.narrative.generate`, `mythos.narrative.repair`
- `mythos.visual.generate`

## 14. Security and Privacy

로컬 프로토타입 기준:
- `.env`는 git에 포함하지 않는다.
- Hugging Face token은 `.env` 또는 local HF login에만 둔다.
- 생성 이미지와 session export는 local filesystem 또는 local MinIO에 저장한다.
- 외부 API 호출은 명시적으로 provider를 변경하기 전까지 사용하지 않는다.
- player id는 사람이 읽을 수 없는 stable id를 사용한다.

## 15. 개발 순서

아래 순서는 모두 완료되었다 (M0–M10). 압축 요약은 `COMPLETED_SUMMARY.md`, 실제 상세 archive는 `archive/IMPLEMENTATION_M0_M10.md`를 참고한다.

1. `docker-compose.local.yml` 작성.
2. `.env.example`에 DB/Redis/MinIO/Otel 설정 추가.
3. `make infra-up`, `make infra-down`, `make infra-logs` 추가.
4. PostgreSQL migration 초안 작성.
5. `src/mythos_core` 모델 작성.
6. PostgreSQL store interface 작성.
7. CLI `connect` skeleton 작성.
8. Ollama Narrative Director JSON output 구현.
9. Validator 1차 구현.
10. Visual Service가 기존 FLUX generator를 호출하도록 연결.
11. 3턴 CLI loop smoke test.
12. (추가 완료) `RuntimeSessionService` 분리 + Streamlit playable demo.

## 16. Acceptance Criteria

설계 기준 1차 완료 조건 — 전부 충족됨:
- `docker compose -f docker-compose.local.yml up -d`로 로컬 인프라가 올라온다.
- `make doctor`가 통과한다.
- 플레이어를 생성할 수 있다.
- 루프를 시작할 수 있다.
- 첫 장면과 선택지가 저장된다.
- 플레이어 선택이 event로 저장된다.
- 최소 3턴 진행 가능하다.
- 루프 종료 후 Echo가 저장되고 다음 루프에 반영된다. (NarrativeShard 테이블은 스키마에만 존재, 런타임 미연결 — `NEXT_PLAN.md` 참고.)
- 대표 장면 이미지가 생성되고 asset metadata가 저장된다.
- 모든 상태는 재실행 후에도 복원 가능하다.

이 설계의 핵심은 MythOS의 서사 실험을 LLM 출력 하나에 맡기지 않고, 상태 모델, 이벤트 로그, 검증 규칙, 메모리 계층 위에서 운영하는 것이다. Ollama와 FLUX는 교체 가능한 provider이며, Docker 리소스는 로컬에서 클라우드형 운영 경계를 미리 연습하기 위한 기반이다.

## 17. 설계 원칙

1. **Local-first.** 초기 버전은 외부 상용 API 없이 Ollama와 FLUX 로컬 실행을 기본값으로 둔다.
2. **Narrative-state first.** LLM 출력보다 명시적인 상태 모델, 이벤트 로그, 검증 규칙을 우선한다. LLM 출력은 항상 Validator를 거친 뒤에만 state에 반영한다.
3. **Loop reproducibility.** 같은 player id, memory snapshot, seed로 동일 루프를 재현할 수 있어야 한다.
4. **Asset traceability.** 생성된 이미지는 prompt, seed, model id, loop id, scene id와 연결되어야 한다.
5. **Replaceable AI providers.** Ollama/FLUX를 기본으로 하되 GPT, Claude, Bedrock, SDXL, Titan 등으로 교체 가능한 경계면(§9 Provider Interface)을 둔다.
6. **Small vertical slices.** 전체 세계를 한 번에 만들지 않고, 접속-탐색-선택-종결-기억의 얇은 루프를 먼저 완성한다.

## 18. 리스크와 대응

### LLM 출력 불안정
- 리스크: 서사 JSON이 깨지거나 장면이 과도하게 길어질 수 있음.
- 대응: schema-first prompt, JSON repair 1회, Validator, fallback scene.

### FLUX 메모리 사용량
- 리스크: 48GB 통합 메모리에서도 LLM과 FLUX 동시 사용 시 swap이 발생할 수 있음.
- 대응: 이미지 생성을 명시적 단계로 분리, smoke/test는 512px 이하, pipe cache 전략 검토, 필요 시 Ollama 모델 크기 조정.

### 세계관 일관성 붕괴
- 리스크: 루프가 반복될수록 AI가 설정을 잊거나 모순을 만든다.
- 대응: canonical world bible 작성, memory digest와 active Echo만 prompt에 주입, Validator로 금지 규칙 관리.

### Scope creep
- 리스크: Web, 3D, cloud, multiplayer가 너무 일찍 섞인다.
- 대응: CLI/Streamlit vertical slice 완료 전 무거운 Web/cloud 확장 금지, MVP 완료 기준을 루프 1회 + 이미지 1장으로 제한.

## 19. 다이어그램

GitHub/Markdown/Mermaid 지원 뷰어에서 바로 렌더링된다. 별도 MCP는 필요하지 않다.

### 19.1 Local Architecture

```mermaid
flowchart TB
    user[User / Player]
    cli[CLI<br/>Future Web UI]

    subgraph runtime[MythOS Runtime]
        session[Session Manager]
        loop[Loop Engine]
        director[Narrative Director]
        validator[Myth Protocol Validator]
        memory[Memory Service]
        visual[Visual Service]
    end

    subgraph host[Mac Host Native Services]
        ollama[Ollama LLM<br/>OpenAI-compatible API<br/>Metal acceleration]
        flux[FLUX Worker<br/>Diffusers + PyTorch MPS]
    end

    subgraph docker[Docker Compose Local Infra]
        postgres[(PostgreSQL<br/>state + memory + metadata)]
        minio[(MinIO<br/>image + session assets)]
        redis[(Redis<br/>queue + locks)]
        otel[OpenTelemetry Collector]
        jaeger[Jaeger UI]
        adminer[Adminer]
    end

    user --> cli
    cli --> session
    session --> loop
    loop --> director
    director --> ollama
    director --> validator
    validator --> loop
    loop --> memory
    memory --> postgres
    loop --> postgres
    visual --> flux
    visual --> minio
    visual --> postgres
    runtime --> redis
    runtime --> otel
    otel --> jaeger
    adminer --> postgres
```

### 19.2 Host and Docker Boundary

```mermaid
flowchart LR
    subgraph mac[Mac Host]
        cli[Python CLI / Runtime]
        ollama[Ollama<br/>localhost:11434]
        flux[FLUX.1 schnell<br/>MPS]
        hf[Hugging Face Cache]
    end

    subgraph compose[Docker Compose]
        pg[(PostgreSQL<br/>localhost:5432)]
        minio[(MinIO<br/>localhost:9000/9001)]
        redis[(Redis<br/>localhost:6379)]
        otel[OTel<br/>localhost:4317/4318]
    end

    cli -->|http://localhost:11434/v1| ollama
    cli --> flux
    flux --> hf
    cli --> pg
    cli --> minio
    cli --> redis
    cli --> otel

    compose -. container to host .->|http://host.docker.internal:11434/v1| ollama
```

### 19.3 Start Loop Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant CLI
    participant Runtime
    participant Store as PostgreSQL Store
    participant Loop as Loop Engine
    participant Director as Narrative Director
    participant Ollama
    participant Validator
    participant Visual as Visual Service
    participant Flux as FLUX Worker
    participant MinIO

    Player->>CLI: connect(player_id)
    CLI->>Runtime: start_loop(player_id)
    Runtime->>Store: load player + memory
    Store-->>Runtime: profile, memories, echoes
    Runtime->>Loop: create seed + initial state
    Loop-->>Runtime: LoopState
    Runtime->>Director: generate first scene context
    Director->>Ollama: chat completion JSON request
    Ollama-->>Director: scene JSON
    Director-->>Runtime: scene + world_delta
    Runtime->>Validator: validate scene + delta
    Validator-->>Runtime: ok / repaired payload
    Runtime->>Store: save loop, scene, initial events
    Runtime->>Visual: generate scene image
    Visual->>Flux: prompt + seed + dimensions
    Flux-->>Visual: image file
    Visual->>MinIO: put image + metadata
    Visual->>Store: save asset metadata
    Runtime-->>CLI: scene, choices, asset uri
    CLI-->>Player: render first scene
```

### 19.4 Player Action Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant CLI
    participant Runtime
    participant Store
    participant Director
    participant Ollama
    participant Validator
    participant Loop

    Player->>CLI: choose/action
    CLI->>Runtime: apply_action(loop_id, action)
    Runtime->>Store: append player event
    Runtime->>Store: load loop + recent events + active echoes
    Runtime->>Director: generate next scene
    Director->>Ollama: structured JSON request
    Ollama-->>Director: next scene + delta
    Director-->>Runtime: candidate payload
    Runtime->>Validator: validate candidate payload
    Validator-->>Runtime: ok / repair needed
    Runtime->>Loop: apply validated delta
    Loop-->>Runtime: updated LoopState
    Runtime->>Store: save scene + updated loop
    Runtime-->>CLI: next scene
    CLI-->>Player: render narration + choices
```

### 19.5 Archive and Memory Flow

```mermaid
flowchart TD
    ended[Loop End Condition Met]
    events[Event Log]
    extract[Memory Extraction]
    playerMemory[(Player Memory)]
    worldMemory[(World Memory)]
    shard[(Narrative Shard)]
    echo[Echo]
    archive[Session Archive]
    nextSeed[Next Loop Seed]

    ended --> events
    events --> extract
    extract --> echo
    extract --> shard
    extract --> worldMemory
    echo --> playerMemory
    shard --> playerMemory
    playerMemory --> nextSeed
    worldMemory --> nextSeed
    events --> archive
    shard --> archive
```

### 19.6 Data Model ERD

```mermaid
erDiagram
    PLAYERS ||--o{ LOOPS : starts
    PLAYERS ||--o{ PLAYER_MEMORIES : owns
    PLAYERS ||--o{ NARRATIVE_SHARDS : experiences
    LOOPS ||--o{ SCENES : contains
    LOOPS ||--o{ EVENTS : records
    LOOPS ||--o{ ASSETS : produces
    LOOPS ||--o{ NARRATIVE_SHARDS : creates
    SCENES ||--o{ ASSETS : visualized_by

    PLAYERS {
        text player_id PK
        text display_name
        timestamptz created_at
        timestamptz updated_at
        jsonb traits
    }

    LOOPS {
        text loop_id PK
        text player_id FK
        text seed
        text phase
        text location_id
        int stability
        int tension
        timestamptz started_at
        timestamptz ended_at
        jsonb state
    }

    SCENES {
        text scene_id PK
        text loop_id FK
        int turn_index
        text title
        text location
        text narration
        jsonb choices
        text visual_brief
        timestamptz created_at
    }

    EVENTS {
        text event_id PK
        text loop_id FK
        int turn_index
        text actor
        text action
        text result
        jsonb state_delta
        timestamptz created_at
    }

    PLAYER_MEMORIES {
        text memory_id PK
        text player_id FK
        text kind
        jsonb content
        double weight
        timestamptz created_at
        timestamptz updated_at
    }

    WORLD_MEMORIES {
        text memory_id PK
        text world_id
        text kind
        jsonb content
        double weight
        timestamptz created_at
        timestamptz updated_at
    }

    NARRATIVE_SHARDS {
        text shard_id PK
        text loop_id FK
        text player_id FK
        text symbol
        text emotional_tone
        text text
        double weight
        timestamptz created_at
    }

    ASSETS {
        text asset_id PK
        text scene_id FK
        text loop_id FK
        text provider
        text model_id
        text prompt
        int seed
        int width
        int height
        int steps
        text storage_uri
        jsonb metadata
        timestamptz created_at
    }
```

### 19.7 Component Dependencies

```mermaid
flowchart BT
    imageAgent[mythos_image_agent]
    core[mythos_core]
    memory[mythos_memory]
    narrative[mythos_narrative]
    loop[mythos_loop]
    runtime[mythos_runtime]
    cli[connect_cli]

    memory --> core
    narrative --> core
    loop --> core
    loop --> narrative
    loop --> memory
    runtime --> core
    runtime --> memory
    runtime --> narrative
    runtime --> loop
    runtime --> imageAgent
    cli --> runtime
```

## 20. 부록: 하드웨어 및 기술 스택 근거

대상 장비는 **Apple M4 Max (통합 메모리 48GB)** 로, 로컬에서 비용 0원·외부 유출 0%의 이미지 생성 + 서사 파이프라인을 돌리는 것을 전제로 한다. 48GB 통합 메모리는 LLM과 이미지 모델을 동시에 띄우기에 충분하다.

| 역할 | 모델 / 기술 | 대략 메모리 | 특징 |
| --- | --- | --- | --- |
| 뇌 (LLM) | Gemma 4 (Ollama, OpenAI-compatible) | ~16GB | 프롬프트 확장·서사 JSON 생성. ROUGH 권장값은 `gemma4:26b`, 현재 장비 기본값은 `gemma4:latest`. |
| 손 (Image) | FLUX.1-schnell (Diffusers) | ~24GB | Apache 2.0. 4 step만에 고품질, 이미지 내 문자 표현력 우수. |
| 가속기 | PyTorch MPS (Metal) | - | Apple Silicon GPU 활용. `bfloat16` 사용. |

메모리 예산: 약 16GB(LLM) + 24GB(Image) = 40GB. macOS 기본 점유를 빼면 48GB 안에서 단일 워크스테이션으로 동작한다.

### macOS 운영 팁

- **MPS OOM (`RuntimeError: MPS backend out of memory`)**: 다른 큰 앱을 먼저 종료한다. 마지막 수단으로만 `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0`을 설정한다 (MPS 메모리 가드레일 해제 → swap 급증 가능).
- **세션 종료 후 메모리 미반환**: 필요 시 `sudo purge`로 공유 메모리를 강제 회수한다.
- **생성 기본값**: `steps=4`, `1024x1024`, `guidance_scale=0.0`. 개발 smoke는 `steps=1`, `512x512` 이하.

> 참고: 실제 동작 코드는 `agent.py`와 `src/mythos_image_agent/`(2단계 파이프라인), `src/mythos_runtime/visual_service.py`(런타임 통합)에 있다. 과거 ROUGH 초안의 단일 스크립트 예제는 이 구현으로 대체되었다.

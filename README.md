# Project MythOS Local Runtime

Project MythOS / 세계:접속의 로컬 MVP 런타임입니다.

현재 로컬 MVP 이후 React + FastAPI 플레이 경로까지 구현된 상태입니다. FastAPI-served React SPA, Streamlit 브라우저 데모, CLI 모두에서 플레이어 생성, 루프 시작, 선택, free-form action, resume, archive/Echo 저장, 다음 루프 Echo 반영, 선택적 FLUX 이미지 생성, PostgreSQL/MinIO 저장, Redis visual worker, structured log/Jaeger trace까지 로컬에서 동작합니다.

기존 로컬 이미지 생성 에이전트도 유지됩니다. Ollama의 로컬 LLM이 한글 아이디어를 FLUX용 영어 프롬프트로 확장하고, 기본 이미지 백엔드인 mflux/FLUX.1-schnell이 Apple Silicon에서 이미지를 생성합니다. 캐릭터 장면은 mflux Redux 레퍼런스 이미지 경로로 라우팅해 얼굴 일관성을 보강합니다.

## Project Docs

- `docs/AGENT_BRIEF.md`: 에이전트용 압축 문맥과 읽기 순서.
- `docs/PROJECT_OVERVIEW.md`: **Project MythOS 핵심 소개 & 기획/기술 구조 요약** (입문 추천).
- `docs/DESIGN.md`: 시스템 설계 — 컴포넌트, 런타임 시퀀스, PostgreSQL 스키마, 설계 원칙·리스크·Mermaid 다이어그램·하드웨어 스택 근거(부록 §17–§20) 통합.
- `docs/GAMEPLAY.md`: 게임플레이/TRPG 기획 — 스탯, 특성, 자율성 진행도, 튜토리얼 맵 및 전술 전투 설계.
- `docs/README.md`: 전체 문서 구조와 업데이트 흐름 가이드.
- `docs/DOCS_POLICY.md`: 날짜별 계획, 증분 로그, archive/delete 정책.
- `docs/STATUS.md`: 현재 구현 상태와 active focus.
- `docs/NEXT_PLAN.md`: 로컬 MVP 이후 rolling plan.
- `docs/plans/`: 날짜별 계획 스냅샷.
- `docs/archive/`: 구 기획 초안(`DRAFT.md`), 구 스탯 상세서, 구 아키텍처 맵 및 과거 구현 이력 보관소.
- `harness/`: AI 에이전트 자율 연동용 하네스 맥락 및 코어 제약 공유 폴더 (`CONTEXT_BRIDGE.md`, `CORE_MANDATES.md`).

## Prerequisites

- Apple Silicon Mac with MPS support
- Python 3.11+
- Ollama
- Hugging Face account/token with access to `black-forest-labs/FLUX.1-schnell`
- 디스크 여유 공간 최소 35GB 이상

## Setup

```bash
cp .env.example .env
make setup
make infra-up
make db-migrate
```

FLUX.1 schnell은 Hugging Face gated repo라 최초 다운로드 전에 접근 승인이 필요합니다. Hugging Face에서 `black-forest-labs/FLUX.1-schnell` 모델 접근 약관을 수락하거나 접근 요청을 승인받은 뒤 `.env`에 read token을 넣거나 CLI로 로그인하세요.

```bash
# option A: .env
HF_TOKEN=hf_your_read_token

# option B: local Hugging Face login
source .venv/bin/activate
hf auth login

# or
make hf-login
```

Ollama 모델은 별도 터미널에서 준비합니다. 현재 `.env` 기본값은 이 장비에 설치되어 있는 `gemma4:latest`입니다.

```bash
ollama pull gemma4
ollama run gemma4
```

`docs/DESIGN.md` §20의 권장값인 `gemma4:26b`를 쓰려면 해당 모델을 설치한 뒤 `.env`의 `OLLAMA_MODEL`을 `gemma4:26b`로 바꾸면 됩니다.

## Check

```bash
make doctor
make smoke
make test-e2e
```

`doctor`는 Python 버전, MPS 사용 가능 여부, 필수 패키지 설치 여부, Ollama 연결 여부를 확인합니다. FLUX 가중치는 로드하지 않습니다.
기본 이미지 모델이 gated repo라 `HF_TOKEN`이 없거나 모델 접근 승인이 안 되어 있으면 이 단계에서 실패합니다.

`make smoke`는 compileall, unit tests, fallback narrative smoke, visual fake PNG smoke, DB integration test, MinIO upload smoke를 실행합니다.
`make test-e2e`는 FastAPI + React SPA를 임시 서버로 띄우고 `?fallback=1&image=0` 결정적 경로에서 Playwright headless Chromium 회귀 테스트를 실행합니다. 실패 시 non-zero exit와 `outputs/e2e_failure.png`를 남깁니다.

## Play The React Web App

권장 로컬 플레이 경로입니다. Docker 인프라, DB migration, background visual worker, FastAPI 서버를 한 번에 준비합니다. Ollama는 Mac host에서 별도로 실행되어야 합니다.

```bash
ollama serve
make dev-up
```

브라우저에서 `http://localhost:8000`을 엽니다. API는 같은 서버의 `/api/v1` 아래에서 REST/WebSocket을 제공합니다. Dev 탭에는 로컬 인프라 콘솔 링크가 있습니다.

- Adminer: `http://localhost:8080`
- MinIO Console: `http://localhost:9001`
- Redis Commander: `http://localhost:8081`
- Jaeger: `http://localhost:16686`

정리:

```bash
make dev-down
```

## Play The Streamlit Demo

로컬 인프라와 migration을 먼저 준비한 뒤 Streamlit 앱을 실행합니다.

```bash
make infra-up
make db-migrate
make streamlit
```

브라우저에서 `http://localhost:8501`을 엽니다. 기본 설정은 빠른 텍스트 플레이를 위해 fallback narrative on, image generation off입니다. Sidebar에서 다음 옵션을 바꿀 수 있습니다.

- `Fallback narrative`: 끄면 Ollama Narrative Director를 사용합니다.
- `Generate image`: 켜면 현재 scene visual brief로 FLUX 이미지를 생성합니다.
- `Image storage`: `filesystem`은 로컬 preview, `minio`는 `s3://mythos-assets/...` URI를 표시합니다.

검증된 플레이 흐름:

1. Player ID와 display name 입력 후 `Create / Update Player`.
2. `New Loop`으로 접속 시작.
3. Choice 버튼 또는 `Free action`으로 3턴 이상 진행.
4. `Archive Loop`으로 Echo 저장.
5. 다시 `New Loop`을 눌러 Echo carry-over 확인.

## Play The Local CLI

빠른 fallback demo:

```bash
make connect-demo
```

직접 실행:

```bash
python -m mythos_runtime.connect_cli new-player "첫 번째 접속자" --player-id player_001
python -m mythos_runtime.connect_cli connect --player-id player_001 --fallback
python -m mythos_runtime.connect_cli choose --loop-id <loop_id> --choice-id <choice_id> --fallback
python -m mythos_runtime.connect_cli resume --loop-id <loop_id>
python -m mythos_runtime.connect_cli archive --loop-id <loop_id>
```

Ollama를 쓰는 실제 Narrative Director 경로:

```bash
python -m mythos_runtime.connect_cli connect --player-id player_001
```

대표 이미지를 함께 생성하려면:

```bash
python -m mythos_runtime.connect_cli connect \
  --player-id player_001 \
  --fallback \
  --with-image \
  --filesystem-image \
  --image-width 128 \
  --image-height 128 \
  --image-steps 1
```

MinIO에 저장하려면 `--filesystem-image`를 빼면 됩니다. 기본 이미지 크기는 1024x1024, 4 steps입니다.

## Local Infra

```bash
make infra-up
make infra-ps
make db-migrate
make db-shell
```

서비스:

- PostgreSQL: `localhost:5432`
- Adminer: `http://localhost:8080`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Redis: `localhost:6379`
- Redis Commander: `http://localhost:8081`
- Jaeger: `http://localhost:16686`
- OTLP HTTP: `http://localhost:4318`

중지:

```bash
make infra-down
```

데이터까지 삭제:

```bash
make infra-reset
```

## Runtime Smoke Commands

```bash
make narrative-smoke-fallback
make narrative-smoke
make visual-smoke
make visual-smoke-minio-db
make visual-smoke-flux-tiny
```

`visual-smoke-flux-tiny`는 실제 FLUX.1-schnell을 128x128, 1 step으로 호출합니다.

## Image Backend (mflux / Redux / diffusers)

이미지 생성 백엔드는 `.env`의 `IMAGE_BACKEND`로 선택합니다.

- `mflux` (기본, 권장) — Apple MLX 네이티브 + 양자화. 같은 `FLUX.1-schnell` 가중치로
  diffusers/MPS 대비 약 20배 빠르고(512x512/4step warm ≈ 8초), 메모리도 적게 씁니다
  (8-bit ≈ 12GB, 4-bit ≈ 7GB). `MFLUX_QUANTIZE`로 8 또는 4 선택.
- `mflux Redux` — 캐릭터 장면에서 레퍼런스 portrait(`resources/neo-seoul/characters/...`)를 사용해 인물 일관성을 보강합니다. Redux worker 실경로는 Redis job → MinIO asset → presigned URL까지 검증되어 있습니다.
- `diffusers` — PyTorch/MPS 폴백.

```bash
# .env
IMAGE_BACKEND=mflux
MFLUX_QUANTIZE=8     # 더 가볍게: 4
```

### mflux 단독 테스트 (가장 빠른 확인)

```bash
.venv/bin/python - <<'PY'
import time
from pathlib import Path
from mythos_image_agent.mflux_generator import generate_image_mflux

prompt = "neon night market in Neo-Seoul, blackout zone edge, cyber-mythic, cinematic"
t = time.time()
generate_image_mflux(prompt, Path("outputs/mflux-test.png"), seed=42, steps=4, width=512, height=512, quantize=8)
print(f"done in {time.time()-t:.1f}s -> outputs/mflux-test.png")

# Redux(캐릭터 정체성 스티어링): 레퍼런스 이미지 + strength
from mythos_image_agent.mflux_generator import generate_image_mflux_redux

generate_image_mflux_redux(
    "Se-rin in a neon blackout alley, cinematic",
    Path("outputs/mflux-redux.png"),
    seed=42, steps=4, width=512, height=512, quantize=8,
    reference_path="resources/neo-seoul/characters/se-rin.png", redux_strength=0.9,
)
print("redux -> outputs/mflux-redux.png")
PY
```

첫 실행은 양자화 로드(~10초)가 1회 포함되고, 이후 생성은 한 자릿수 초입니다. 가중치는 기존
Hugging Face 캐시를 재사용합니다(`FLUX.1-schnell`은 gated repo라 `HF_TOKEN`/로그인 필요).

### 런타임 경로로 테스트 (React/Streamlit/워커)

```bash
make visual-smoke-flux-tiny   # 기본 백엔드(mflux)로 실제 생성 1장
make visual-worker            # 비동기 워커(자동 기동도 됨) — 로그: make visual-worker-logs
make dev-up                   # React/API 플레이 경로 + worker + infra
make streamlit                # Streamlit 플레이어 뷰에서 핵심 장면 전환 시 자동 생성, MinIO 저장
```

## Playwright MCP

프로젝트 로컬 MCP 설정은 `.codex/.mcp.json`에 있습니다. Codex에서 Playwright MCP를 붙여 브라우저 조작 도구로 사용할 수 있고, 재현 가능한 회귀 검증은 여전히 `make test-e2e`가 기준입니다.

## Generate

```bash
source .venv/bin/activate
python agent.py "안개 낀 신화적 데이터 신전 앞에 서 있는 첫 번째 접속자"
```

프롬프트 확장 없이 바로 FLUX에 전달하려면:

```bash
python agent.py "cinematic mythic data temple, lone explorer, neon sigils" --no-enhance
```

Ollama 프롬프트 확장만 확인하려면:

```bash
python agent.py "세계:접속 키아트" --expand-only
```

출력 파일을 지정하려면:

```bash
python agent.py "세계:접속 키아트" --output outputs/connect-key-art.png
```

최초 실행 시 Hugging Face에서 FLUX 모델 가중치를 다운로드하므로 시간이 오래 걸릴 수 있습니다.

## Useful Options

```bash
python agent.py --help
```

- `--steps`: 기본값 `4`. FLUX.1 schnell 권장값입니다.
- `--seed`: 기본값 `42`.
- `--width`, `--height`: 기본값 `1024`.
- `--model-id`: Diffusers 모델 ID override.
- `--ollama-model`: Ollama 모델명 override.
- `--no-enhance`: Ollama 프롬프트 확장 단계 생략.
- `--expand-only`: FLUX를 로드하지 않고 확장 프롬프트만 출력.

## Memory Notes

메모리가 부족하면 `.env`에서 아래 값을 켠 뒤 새 터미널에서 다시 실행할 수 있습니다.

```bash
PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
```

이 옵션은 PyTorch MPS 메모리 제한을 해제하므로 시스템 swap이 크게 늘 수 있습니다. 먼저 다른 큰 앱과 모델 서버를 정리한 뒤 사용하는 편이 안전합니다.

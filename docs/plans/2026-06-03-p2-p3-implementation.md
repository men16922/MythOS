# P2/P3 Implementation & Design Plan

작성일: 2026-06-03
상태: 완료 (IP-Adapter 실배선 및 React SPA 구현 완료)

이 문서는 IP-Adapter 기반 캐릭터 일관성 실배선(P2)의 구현 계획과 Streamlit 이후 Web UI 및 클라우드 비주얼 워커 디커플링 아키텍처 설계(P3)의 설계 사양을 정의한다.

---

## 1. P2: IP-Adapter 캐릭터 비주얼 일관성 실배선 계획

### 1.1 목표
Apple Silicon MPS 및 PyTorch/Diffusers 환경에서 FLUX.1-schnell 생성 시, 캐릭터 포트레이트(`se-rin.png`, `kai.png` 등)를 레퍼런스로 활용하여 얼굴/의상 등의 ID 일관성을 유지한다. 기존의 단순 img2img(구도와 레이아웃 전체가 뭉개지거나 고정되는 한계)를 극복하기 위해 IP-Adapter 컨디셔닝을 이용한다.

### 1.2 상세 설계
1. **Config 확장 (`src/mythos_image_agent/config.py`)**:
   - `ip_adapter_repo` (기본값: `XLabs-AI/flux-ip-adapter`)
   - `ip_adapter_weight_name` (기본값: `ip_adapter.safetensors`)
   - `ip_adapter_image_encoder` (기본값: `openai/clip-vit-large-patch14`)

2. **Pipeline 캐싱 확장 (`src/mythos_image_agent/pipeline_cache.py`)**:
   - `get_flux_ip_adapter_pipeline(model_id, config)` 함수 추가.
   - 기존 txt2img `FluxPipeline`에서 이미 로드된 component(`transformer`, `vae`, `text_encoder` 등)를 공유하여 메모리 중복 탑재 방지.
   - `transformers.CLIPVisionModelWithProjection`을 로드하여 `image_encoder`로 주입.
   - **OOM 방지**: `image_encoder`를 `"cpu"` 장치에 할당하여 MPS VRAM 압박 최소화.
   - `pipe.load_ip_adapter(...)` 호출로 IP-Adapter 가중치를 로드하고 캐시 키 `(model_id, "ip_adapter")`에 등록.
   - `pipe.enable_model_cpu_offload()` 자동 호출 (선택 사항, VRAM 최적화용).

3. **Generator 연동 (`src/mythos_image_agent/generator.py`)**:
   - `generate_image` 함수에 `ip_adapter_image_path` 및 `ip_adapter_scale` 매개변수 추가.
   - `ip_adapter_image_path`가 주어지면 `get_flux_ip_adapter_pipeline`으로 파이프라인을 얻고, `ip_adapter_image`를 로드/전처리하여 파이프라인 호출에 전달.
   - IP-Adapter 가중치가 공유된 트랜스포머의 어텐션 프로세서를 변조하므로, IP-Adapter를 사용하지 않는 순수 txt2img 호출 시에는 `pipe.set_ip_adapter_scale(0.0)`을 통해 어댑터의 영향을 비활성화한다.

4. **VisualService 연동 (`src/mythos_runtime/visual_service.py`)**:
   - `_request_from_scene`에서 감지된 태그가 `scenario.character_map`에 존재할 경우, `use_ip_adapter = True`와 함께 reference_image 경로를 metadata에 삽입.
   - `LocalFluxProvider.generate`에서 `use_ip_adapter` 플래그를 검사하여 `generate_image` 호출에 `ip_adapter_image_path`로 전달.

5. **단위 테스트 작성 (`tests/test_visual_service.py`)**:
   - `diffusers` 및 `transformers` 라이브러리의 로딩 및 `load_ip_adapter` 호출이 올바르게 설계되었는지 검증하는 Mock 단위 테스트 작성.

---

## 2. P3: Web UI & 클라우드 분산 비주얼 아키텍처 설계 계획

- Streamlit UI의 근본적 극복을 위한 FastAPI + REST/WebSockets + Next.js/Vite 기반 디커플링 API 설계.
- 분산 Redis Queue 비주얼 워커와 MinIO/S3 오브젝트 스토리지 통합 스케일아웃 설계.
- 이에 대한 상세 아키텍처 사양 문서를 `docs/plans/2026-06-03-web-ui-decoupling.md`에 작성하고 본 계획을 연계함.

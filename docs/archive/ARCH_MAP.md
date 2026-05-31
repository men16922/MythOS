# MythOS Architecture Map

에이전트가 프로젝트 구조와 데이터 흐름을 빠르게 이해하기 위한 지도다.

## 🗺 시스템 데이터 흐름
1. **Input**: `Streamlit UI` -> `RuntimeSessionService` -> `NarrativeDirector` (Ollama)
2. **Logic**: `Director` 생성 JSON -> `Validator` 검증 -> `LoopEngine` 상태 반영 -> `PostgreSQL` 저장
3. **Asset**: `VisualService` (FLUX) & `AudioService` (MusicGen) -> `MinIO` & `Local Resource`
4. **Output**: `RuntimeSnapshot` -> `Streamlit UI` (Image, Audio, Text 렌더링)

## 📂 핵심 디렉토리 맵
- `src/mythos_core`: 순수 도메인 모델 및 유틸리티.
- `src/mythos_narrative`: LLM 프롬프트 엔지니어링 및 JSON 파서.
- `src/mythos_loop`: 게임의 심장부(상태 머신 및 유효성 검사).
- `src/mythos_runtime`: 오케스트레이션 레이어 (Session, Visual, Audio 서비스 통합).
- `src/mythos_image_agent`: 로컬 FLUX 워커 및 이미지 후처리 로직.
- `resources/neo-seoul`: 시나리오 설정(`scenario.json`) 및 정적 자산(캐릭터, 오디오).
- `scripts/`: 로컬 리소스 생성 및 진단 툴킷.

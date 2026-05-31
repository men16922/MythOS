# Project MythOS: Core Engineering Mandates

이 문서는 모든 AI 에이전트(Gemini, Claude, Cursor 등)가 준수해야 할 최상위 설계 및 엔지니어링 표준이다.

## 1. 기술 스택 원칙
- **Language**: Python 3.11+ (Strict Typing 필수)
- **Local-First**: 모든 모델 추론(LLM, Image, Audio)은 Apple Silicon MPS 가속 기반의 로컬 실행을 원칙으로 한다.
- **Async Workflow**: 무거운 생성 작업은 Redis 기반 비동기 워커로 처리하며, UI(Streamlit)를 차단하지 않는다.

## 2. 데이터 및 저장소
- **RDBMS**: PostgreSQL (JSONB를 활용한 유연한 상태 저장)
- **Object Storage**: MinIO (S3-compatible) - 이미지 및 대용량 에셋 관리.
- **Cache/Queue**: Redis - 비동기 잡 및 실시간 상태 락 관리.

## 3. 코드 작성 규칙
- **Pattern**: Composition over Inheritance. 기능별 Service/Provider 인터페이스(Protocol) 분리.
- **Error Handling**: 생성 실패 시 서사적 Fallback 경로를 반드시 확보한다.
- **Validation**: LLM 생성 데이터는 항상 `Myth Protocol Validator`를 거쳐야 한다.

## 4. 에이전트 협업 수칙
- 작업 완료 후 반드시 `CONTEXT_BRIDGE.md`에 다음 단계와 미결 사항을 기록한다.
- 새로운 전역 규칙은 각 에이전트 전용 문서(`GEMINI.md` 등)가 아닌 이 문서(`CORE_MANDATES.md`)에 업데이트한다.

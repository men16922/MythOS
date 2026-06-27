# 커리어 전략 — MythOS를 Google Cloud 이직 레버리지로 (CAREER_STRATEGY.md)

작성일: 2026-06-26 · 상태: 활성 계획(active) · 성격: 개인 커리어 전략 (구현 트랙 연동)

이 문서는 MythOS(로컬 MVP)와 overnight 멀티엔진 하네스를 **커리어 자산**으로 전환하는 계획이다.
기술 전환의 구체안은 `docs/cloud/GCP_PLAN.md`(GCP 배포 초안)에 있고, 이 문서는 *왜·어디로·어떻게 노출*을 다룬다.

## 0. 목표 (확정)

- **1차: Google Cloud 이직** (이상적). 안 되더라도 **GDE/공개 평판** 구축.
- **제외: XPRIZE "Build with Gemini"** — 90일 내 실제 매출 사업 + 5개 임팩트 카테고리(게임 없음)를 요구하는
  *수익 사업* 대회라 위 목표와 미스매치. (`Gemini Live Agent Challenge`는 만료.)

## 1. 핵심 통찰

- **자산이 둘**: ① MythOS 게임(AI 내러티브 RPG + LLM과 분리된 결정론적 전투) ② **overnight 멀티엔진 하네스**
  (claude/codex/agy 자율 코딩 루프 + 검증 tier + 자동 브라우저 QA). 커뮤니티 흡인력·차별성은 **② 하네스가 더 강함**.
- **Vertex가 주인공**: 채용하는 쪽이 Google이므로 비용 최적화보다 *"전부 Vertex로 돌아간다"*는 서사가 우선.
  서사는 **엔지니어링(구조화 출력·에이전트 오케스트레이션·관측성)을 앞세우고, 게임은 래퍼**로.

## 2. 들어갈 문 (역할 우선순위)

| 역할 | 적합성 | 근거 |
|---|---|---|
| Developer Advocate / DevRel (AI) | ★ 최적 | "Vertex로 실물 만들고 공개 설명" = 곧 직무 |
| Customer Engineer — AI/ML Specialist | ★ 높음 | Vertex 전문성 + 하네스=엔터프라이즈 에이전트 관심사 |
| GDE (Google Developer Expert) | 온램프 | 고용 아님. 공개 콘텐츠+GDG 발표+기여 경로가 아래 계획과 겹침 |
| 표준 SWE | 가능 | 프로젝트는 신호·레퍼럴 미끼. 면접 바는 별도 통과 필요 |

## 3. Vertex 킬러 데모 포인트 (기존 코드 약점을 정조준)

- **Controlled Generation(구조화 출력)** ← 1순위. 현재 JSON 강제용 **3b 파서 모델 + repair fallback**(`director.py`)을
  Vertex `responseSchema`가 **스키마 유효 JSON 네이티브 보장**으로 대체 → 파서 모델 제거.
  *"로컬에선 2nd 모델이 필요했는데 Vertex에선 사라졌다"* = 측정 가능한 before/after, 블로그 1순위.
- **Context Caching** — story bible/system prompt 프리픽스 캐싱(코드 이미 prefix-cache 인지, NEXT_PLAN Phase 5). 비용·지연 절감.
- **Imagen on Vertex** — `VertexImageProvider` + `_curated_anchor_image()` 가드 = 비용 통제 서사.
- **Cloud Run(WS) + Cloud Trace** — OTel exporter만 교체 = 거의 공짜 관측성 마이그레이션.

> 코드 seam은 검증됨: `JSONProvider`(`director.py:36`) / `VisualProvider`·`StorageAdapter`(`visual_service.py:54/59`) /
> `MythOSStore` ABC(`store.py:24`). 코어 무변경, 어댑터 3개 + 컨테이너화 (`GCP_PLAN.md` §2·§8).

## 4. 평판 엔진 (GDE·이직 공통 보상)

- **블로그 시리즈** "Building an AI-run RPG on Vertex AI" — 구조화 출력 / Imagen / context caching / LLM↔결정론 전투 분리.
- **Show HN — 하네스** ("자는 동안 멀티엔진이 코드 치고 자기검증") — 희소 차별점, r/LocalLLaMA 동시 타격.
- **GDG Seoul 발표** — GDE 온램프 + Google DevRel 발견 경로. 콜드 지원보다 **레퍼럴** 우선.
- **공개 플레이 링크 + 3분 데모** — 모든 대화의 토대(비협상).

## 5. 시퀀스 (마감 압박 없음, 모멘텀 기준)

1. `[ ]` **Wedge**: Vertex `VertexGeminiJSONProvider`(controlled generation) — Ollama 공존 provider. 로컬 서비스 계정으로 실측.
2. `[ ]` **배포**: GCS `StorageAdapter` → `VertexImageProvider` → Cloud Run 컨테이너화(+WS 검증) → 공개 링크.
3. `[ ]` **공개**: before/after 블로그 1편 → 하네스 Show HN → GDG 발표 제안.
4. `[ ]` **병행**: 표준 면접 준비(DSA + 시스템디자인 — 프로젝트가 시스템디자인 소재).

## 6. 다음 행동 (즉시)

- 본 문서 = A(방향 못 박기) 완료.
- 다음 = **B**: `VertexGeminiJSONProvider` 스캐폴드 — 배포·블로그·면접 소재의 공통 토대.

> 참고: 모델 ID·가격·Vertex API 세부는 자주 바뀜 → 착수 시 현재 문서 확인. (작성자 지식 컷오프 2026-01.)

# 2026-05-30 Playable Single-Player (TRPG) Plan

상태: `[/]` 진행 중 — Phase 15(Player/Developer UI 분리) 완료, Phase 16 예정

이 문서는 “개발자 데모”인 현재 런타임을 **실제 1인용 TRPG 게임**으로 만드는 작업의 날짜별 계획
스냅샷이다. 권위 있는 게임플레이 설계는 `docs/GAMEPLAY.md`, 최신 rolling plan은 `docs/NEXT_PLAN.md`.

## Confirmed Direction (사용자 결정 2026-05-30)

- 게임플레이 프레임: **TRPG, AI가 게임마스터(GM).**
- 핵심 목표: **하이브리드 — 세션=생존·안정화, 캠페인=미스터리 해명.**
- 루프 길이: **길고 서사적.**
- 플레이어 UI: **하이브리드 연출** (접속/붕괴/해금=디제틱 터미널, 평소=깔끔한 서사 뷰).
- 아트 디렉션: **세기말/Y2K 디지털** (CRT·글리치·저비트·딥블루/시안/골드).
- 이미지 생성: **핵심 비트에서 필요 시** 대표 이미지 생성(동기·선택적, Phase 13 결정과 일치).

## Gap Analysis (현재 → 게임)

있음: 루프 상태기계, 선택지+자유행동, stability/tension, Echo carry-over, World/Shard memory + rollup,
NoveltyController, Visual Service(FLUX), Streamlit 데모, QA metric.

부족(게임화 대상): 목표/스테이크 프레이밍, 행동 판정 피드백, 접속자 캐릭터, 미스터리/Codex 진행,
온보딩/연출, 세기말 아트 톤, **플레이어/개발자 UI 분리**.

## Phasing (NEXT_PLAN Phase 15-19)

1. **Phase 15 — Player UI 분리 (먼저):** Streamlit Player/Developer 뷰, 플레이어 HUD/레이아웃, raw
   메트릭 숨김. 이후 게임화의 그릇.
2. **Phase 16 — 세션 목표 & 판정 연출:** 세션 훅/목표, world_delta→결과 read, 생존 클럭/막 구조 연출.
3. **Phase 17 — 접속자 생성 & GM 톤:** 페르소나/소질, GM 프롬프트(세기말 톤), 부팅 온보딩.
4. **Phase 18 — 미스터리/Codex:** 단서 태깅, lore 해금, Codex/별자리 뷰.
5. **Phase 19 — 아트 연출 통합:** 핵심 비트 이미지 트리거, Y2K 스타일 합성, 디제틱 오버레이.

## Out Of Scope (현 단계)

- Next.js/Three.js 프런트 전환(장기 비전).
- 멀티플레이/온라인 World Memory 동기화.
- 본격 다이스 룰 엔진.
- 클라우드 provider 이전.

## First Step 제안

Phase 15(Player/Developer 뷰 분리)부터. 게임화 작업이 들어갈 화면 골격을 먼저 만들고, 이후
목표/판정/캐릭터/Codex/아트를 그 위에 얹는다.

## Verification 기준 (각 phase 공통)

- `make test` / `make test-db` / `make smoke-local` 회귀.
- 브라우저 Streamlit에서 Player 뷰 플레이 + Developer 뷰 디버그 확인.

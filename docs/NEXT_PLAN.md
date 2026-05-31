# Project MythOS Next Plan

작성일: 2026-05-30

로컬 MVP(M0-M10)는 완료되었다. 다음 단계는 Streamlit 데모를 반복 사용 가능한 제품형 데모로 다듬고, 루프 간 서사 품질을 높이는 데 집중한다.

## Planning Rules

- 현재 상태는 `docs/STATUS.md`에서 관리한다.
- 문서 운영 정책은 `docs/DOCS_POLICY.md`를 따른다.
- 큰 작업을 시작할 때는 `docs/plans/YYYY-MM-DD-<topic>.md`에 날짜별 계획 스냅샷을 남긴다.
- 완료된 milestone 요약은 `docs/COMPLETED_SUMMARY.md`에 남긴다.
- 날짜별 증분 작업은 `docs/PROGRESS_LOG.md`에 append-only로 기록한다.
- 아키텍처/infra/provider 결정은 `docs/DECISIONS.md`에 기록한다.
- M0-M10 상세 구현 기록은 `docs/archive/IMPLEMENTATION_M0_M10.md` archive를 참조한다.

## Current Baseline

완료된 기준선:

- Docker 기반 로컬 인프라: PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer.
- PostgreSQL schema/migration 및 store layer.
- Core domain model, Narrative Director, Loop Engine, Visual Service.
- CLI vertical slice.
- Streamlit playable demo.
- Echo 저장 및 다음 루프 carry-over.
- filesystem/MinIO 이미지 저장.
- Ollama narrative mode.

검증 기준:

- `make test`
- `make test-db`
- `make smoke-local`
- `make connect-demo`
- `make streamlit`

## Immediate Follow-up

- `[ ]` 브라우저에서 Player View 스트리밍 회귀 확인: 새 게임 시작, 선택지, 자유 행동에서 본문 창이 고정되고 로딩 텍스트는 별도 패널에만 표시되는지 확인한다.

## Phase 11. Streamlit Demo Polish

목표: 현재 “작동하는 데모”를 “계속 사용하기 편한 데모”로 만든다.

작업:

- `[x]` DB의 player 목록 조회 기능 추가.
- `[x]` Streamlit sidebar 또는 player panel에서 player 선택 UI 제공.
- `[x]` player id 직접 입력은 advanced/manual path로 유지.
- `[x]` loop 목록 조회 기능 추가.
- `[x]` 최신 loop resume UX 개선.
- `[x]` archived/active loop 상태 구분 표시.
- `[x]` scene, choices, Echo, asset 영역 layout 정리.
- `[x]` 이미지 생성 중 running 상태를 더 명확히 표시.
- `[~]` Streamlit 전용 smoke script 추가 여부 결정 → UI가 더 안정된 뒤 도입.

완료 기준:

- `[x]` 브라우저에서 player를 목록에서 선택할 수 있다.
- `[x]` 기존 loop를 선택해 resume할 수 있다.
- `[x]` active/archived loop가 화면에서 구분된다.
- `[x]` `make test`, `make test-db`, `make smoke-local`가 통과한다.

## Phase 12. Narrative Runtime Depth

목표: 루프 간 반복을 줄이고, Echo 외 기억을 실제 서사 입력으로 사용한다.

작업:

- `[x]` Variation Engine / Novelty Controller 설계.
- `[x]` 최근 scene title, location, choice pattern 기반 반복 감지.
- `[x]` `world_memories`를 runtime에서 생성/저장.
- `[x]` `narrative_shards`를 runtime에서 생성/저장.
- `[x]` 다음 루프 `NarrativeContext`에 world memory와 shard 반영.
- `[x]` Echo 외 World Memory 통계 기반 stability/tension 보정.
- `[x]` Ollama provider path memory reflection smoke.
- `[x]` Streamlit basic regression.

완료 기준:

- 같은 player의 새 loop가 이전 loop와 다른 scene premise를 받는다.
- `world_memories`와 `narrative_shards`가 DB에 기록된다.
- fallback/Ollama 양쪽 경로에서 memory 반영이 테스트된다.

## Phase 13. Visual Job Architecture

목표: 동기 이미지 생성으로 인한 UI blocking을 줄일지 판단하고, 필요하면 비동기 구조를 도입한다.

진입 결정(2026-05-30): 최초엔 **동기 유지·보류**였으나, 파이프라인 캐싱 후 사용자 요청으로
**Phase 13 진입(Redis async)** 으로 전환했다. 측정법은 `docs/plans/2026-05-30-visual-job.md`,
결정 요약은 `docs/DECISIONS.md`.

작업:

- `[x]` 현재 동기 FLUX 생성 UX의 병목 측정 방법 정의 (기존 latency 로그/trace 활용).
- `[x]` FLUX 파이프라인 프로세스당 1회 로드 캐싱(`pipeline_cache.py`)으로 재로딩 병목 제거.
- `[x]` async visual job model 설계 — `VisualJobQueue`(Redis list + worker heartbeat),
  `AssetRecord.status`(pending/processing/succeeded/failed), `asset_id` 공유 upsert.
- `[x]` worker process entrypoint 추가 — `python -m mythos_runtime.visual_worker`
  (`make visual-worker`).
- `[x]` Streamlit에서 pending/processing asset "생성 중…" + 새로고침 표시. 워커 부재 시
  동기 폴백.
- `[x]` 운영성 보강 — 워커 자동 기동(별도 터미널 불필요, redis-py 8.x BRPOP 크래시 수정),
  핵심비트 생성(`_is_key_beat`)+in-flight 가드, MinIO 기본 저장 + `s3://` presigned 표시,
  Redis 뷰어(`redis-commander` 8081, `make redis-shell`).
- `[ ]` (선택) 이미지 단일 속도(40s/step) — 메모리 vs MPS fallback 진단 또는 경량 모델 도입.

완료 기준:

- `[x]` 이미지 생성 중 텍스트 플레이가 막히는지 판단 근거가 문서화된다.
- `[x]` queue/worker round-trip이 통과한다 (`tests/test_visual_queue.py`, 라이브 Redis +
  Postgres end-to-end 수동 확인).

## Phase 12.5. Post-Phase-12 Follow-ups

목표: Phase 12 산출물의 가시성과 품질 관측을 보강한다.

작업:

- `[x]` provider repair/fallback QA 지표 (`NarrativeMetrics`).
- `[x]` Streamlit world/shard memory 노출 (`memory_overview` + Memory 패널).
- `[x]` archive memory 장기 요약 정책 설계 (`docs/plans/2026-05-30-memory-summary.md`).
- `[x]` memory summary rollup 구현 (설계의 Implementation Steps).

완료 기준:

- `[x]` provider 경로 outcome이 분류·로깅되고 smoke에 노출된다.
- `[x]` Streamlit에서 cross-loop memory 상태를 볼 수 있다.
- `[x]` archive 시 오래된 world memory가 rollup으로 압축되고 active 목록에서 제외된다.
- `[x]` `make test`(54), `make test-db`, `make smoke-local`가 통과한다.

## Playable Game Track (Phase 15-19)

목표: “개발자 데모”를 **실제 1인용 TRPG 게임**으로 만든다. AI가 게임마스터(GM). 권위 있는 설계는
`docs/GAMEPLAY.md`, 계획 스냅샷은 `docs/plans/2026-05-30-playable-single-player.md`, 결정은
`docs/DECISIONS.md`.

확정 방향: 하이브리드 목표(세션=생존·안정화 / 캠페인=미스터리), 긴 서사 세션, 하이브리드 연출,
세기말/Y2K 디지털 아트, 핵심 비트 이미지 생성.

첫 데모 콘텐츠: **«Neo-Seoul: 접속»** — `docs/scenarios/01-neo-seoul-connect.md`,
비주얼 리소스 `resources/neo-seoul/`(`scripts/gen_neo_seoul_art.py`). Phase 16/17/19에서 이 시나리오의
GM 시드 브리프·캐릭터·아트를 주입/연출한다.

### Phase 15. Player UI 분리 (먼저) — `[x]` 핵심 완료

- `[x]` Streamlit View 모드 토글(플레이어 / 개발자, 사이드바 radio).
- `[x]` Player 뷰: 장면 이미지 → 제목/위치 → HUD(단계·안정도·긴장도 게이지) → 내레이션 →
  선택지 버튼 → “행동 선언” 입력, 회상/Codex(기억의 별자리) 패널, 종결 시 에필로그+새 세션.
- `[x]` Developer 뷰: 기존 대시보드(player/loop/memory 패널 + play 패널 + 전체 옵션/infra 링크) 유지.
- `[x]` Player 뷰에서 loop_id/scene_id/flags/metric/infra/이미지 파라미터 등 개발 chrome 숨김.
- `[~]` 세션 목표/단서 수 HUD는 Phase 16/18에서 데이터가 생긴 뒤 연결(현재는 단계·게이지·Codex).
- 검증: `make test`(54)/`compileall` PASS; Streamlit headless 부팅 200 OK; `AppTest`로 양쪽 뷰 무예외
  실행 + 플레이어 create→connect→장면 렌더 흐름 확인. 브라우저 수동 회귀는 후속 권장.

### Phase 16. 세션 목표 & 행동 판정 연출 — `[x]` 완료

- `[x]` 세션 훅/목표 제시(`ScenePayload`/런타임 파생).
- `[x]` `world_delta` → 결과 read(성공/부분/실패) 분류·표시.
- `[x]` 생존 클럭/막(act) 구조 연출, 좋은 종결 vs 붕괴 종결 구분.

### Phase 17. 접속자 생성 & GM 톤 — `[x]` 완료

- `[x]` 접속자 페르소나/소질(Archetype) `traits` 저장.
- `[x]` «Neo-Seoul» GM 시드 브리프(`NEO_SEOUL_GM_BRIEF`) 주입.
- `[x]` 부팅 온보딩 시퀀스 및 NPC 등장 지침 연출.

### Phase 18. 미스터리 / Codex — `[x]` 완료

- `[x]` Narrative Shard ‘단서’ 태깅, lore 해금 임계치.
- `[x]` Codex / ‘기억의 별자리’ 플레이어 뷰(단서·해금·통계).

### Phase 19. 아트 연출 통합 — `[x]` 완료

- `[x]` 핵심 비트 이미지 트리거(접속/전환/클라이맥스/해금).
- `[x]` `visual_brief`에 Y2K 디지털 스타일 합성.
- `[x]` 디제틱 터미널 오버레이(부팅/글리치/`세계 : 접속`).

## Phase 14. Developer Experience — `[x]` 완료

목표: 반복 개발 시 품질 확인 비용을 낮춘다.

작업:

- `[x]` lint/format 도구 결정 (ruff, mypy).
- `[x]` Makefile에 lint/format/typecheck target 추가.
- `[x]` Mypy 타입 에러 전면 해결 및 Ruff 포맷팅 적용.
- `[ ]` CI 도입 가능성 검토.
- `[ ]` Decision Log가 커지면 `docs/ARCHITECTURE_DECISIONS.md`로 분리.
- `[ ]` 정적 다이어그램이 필요하면 Mermaid render/export workflow 추가.

완료 기준:

- `[x]` 신규 PR 또는 작업 단위에서 실행할 표준 check command가 정해진다.
- 문서/결정/검증 로그의 위치가 명확하다.

## RPG & Novel-Grade Narrative Track (Phase 21-26)

목표: 게임플레이에 수치적 깊이를 더하고, 서사 품질을 노벨 게임 수준으로 비약적으로 향상시킨다. 
세부 계획: `docs/feedback/0530-1.md`

### Phase 21. RPG 데이터 구조화 — `[x]` 완료
- `[x]` `PlayerProfile.traits` 내 5대 핵심 스탯 및 자율성 레벨 저장.
- `[x]` 시나리오(`scenario.json`)에 따른 초기 스탯 부여 및 단서 기반 레벨업 로직.

### Phase 22-26. RPG 판정·자율성·서사 품질 고도화 — `[x]` 완료
- `[x]` **RPG 기반 판정**: AI GM이 스탯(1-10)을 근거로 성공/부분 성공/실패를 판정하고 텍스트에 반영.
- `[x]` **NPC 화법**: 캐릭터별 고유 말투 및 페르소나 강화.
- `[x]` **작가적 지문**: 오감 묘사(Show, Don't Tell), 비유적 서술, 지문/대사 라벨 제거.
- `[x]` **스테이징**: 장면 타입(정적/동적/절정), 시네마틱 SFX/카메라 워킹 지침 반영.
- `[x]` **자율성 가드레일**: 저레벨 시 과격한 명령의 제약/거부 연출, 고스탯 시 우회 가능성 반영.
- `[x]` **진행도 기반 세계 진화**: 자율성 레벨에 따른 NPC 반응, 시점/문체, 이미지 글리치 강도 변화.

## Phase 27+. Causality & Scenario v2 Track — `[x]` 기반 완료, 후속 선택

목표: Neo-Seoul을 정적인 무대가 아니라 NPC 아젠다와 플레이어 선택이 맞물리는 인과율 기반 세계로 확장한다.
설계 스냅샷: `docs/plans/2026-05-31-causality-system-design.md`

- `[x]` `scenario.json` v2 대개편: 메인/사이드 아크, NPC 아젠다, 엔딩 매트릭스, 시네마틱 훅 정의.
- `[x]` `ScenarioConfig` v2 로딩: `main_arcs`, `side_arcs`, `npc_agendas`, `endings`, `system_prompt` 지원.
- `[x]` 시스템 프롬프트 동적 주입: 시나리오별 GM 지침을 코드 하드코딩에서 분리.
- `[x]` Gear World 인과율 지침: 나비효과, 미래 이벤트 예약, NPC 위치/아젠다 추적을 GM 컨텍스트에 반영.
- `[x]` 다중 엔딩 매트릭스: Humanity, Dominance, Resilience, Insight 지표 기반 결말 방향 정의.
- `[ ]` (선택) 인과율 예약 이벤트를 UI/디버그 패널에서 명시적으로 추적.
- `[ ]` (선택) NPC 아젠다/위치 상태를 미니맵 또는 Codex에 노출.

## Visual Performance Follow-up — `[x]` 핵심 완료, 후속 선택

- `[x]` Apple MLX `mflux` 백엔드를 기본 이미지 생성 경로로 전환.
- `[x]` 4-bit 양자화와 단일 워커 락으로 메모리 경합 및 중복 FLUX 로드 완화.
- `[x]` 플레이어 프리셋을 512x512 / 4 step으로 조정해 img2img 유효 스텝 0 문제 수정.
- `[ ]` (선택) IP-Adapter 실배선으로 캐릭터 얼굴-ID 고정 강화.
- `[ ]` (선택) 실 플레이 중 per-step latency를 추가 계측하고 size/steps 프리셋 튜닝.

## Priority Recommendation

로컬 MVP, Playable Game Track, RPG/서사 고도화, 인과율 기반 시나리오 v2, mflux 이미지 성능 개선이 모두 완료되었습니다.
다음 목표는 IP-Adapter 통합을 통한 시각적 정체성 강화(선택), 인과율/NPC 아젠다의 UI 가시화, 또는 클라우드 확장을 위한 Web UI 설계입니다.

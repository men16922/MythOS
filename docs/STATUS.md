# Project MythOS Status

최종 갱신: 2026-05-30

## Current State

로컬 MVP(M0-M10)는 완료되었다.

완료된 기능:

- Docker 기반 로컬 인프라: PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer.
- PostgreSQL schema/migration 및 store layer.
- Core domain model.
- Narrative Director: fallback scene, Ollama JSON scene, repair path.
- Loop Engine and Validator.
- Visual Service: disabled mode, filesystem, MinIO, FLUX.1-schnell MPS.
- CLI vertical slice.
- Streamlit playable demo.
- Echo 저장 및 다음 loop carry-over.
- Structured logging and Jaeger trace skeleton.

## Latest Verified Baseline

검증 완료:

- `make test` (48 tests, 2 skipped)
- `make test-db`
- `make smoke-local`
- `make connect-demo`
- `make streamlit`
- Service-level `memory_overview` DB check.
- Browser Streamlit text play flow.
- Browser Streamlit filesystem image preview.
- Browser Streamlit MinIO image URI.
- Browser Streamlit Ollama narrative mode.

## Active Focus

Phase 12: Narrative Runtime Depth는 완료되었고, post-Phase-12 follow-up 4건도 처리했다.

Phase 12 진행됨:

- `NarrativeContext`가 world memory, narrative shard, novelty notes를 받는다.
- `archive()`가 Echo 외에 `world_memories`와 `narrative_shards`를 저장한다.
- `NoveltyController`가 최근 scene title/location 기반 notes를 만들고 다음 loop/scene prompt에 전달한다.
- fallback path에서 novelty context가 반복 회피 title/narration으로 반영된다.
- Ollama provider path가 JSON object response format과 parser unwrap repair를 사용한다.
- Service-level Ollama memory smoke에서 archived shard/novelty context를 가진 새 loop가 non-fallback scene을 생성했다.
- `NoveltyController`가 최근 choice intent pattern을 요약해 prompt notes에 반영한다.
- 새 loop 초기 stability/tension이 해당 player의 archive world memory 통계로 보정된다.
- archive 시 같은 loop의 world memory와 narrative shard가 중복 저장되지 않는다.

Post-Phase-12 follow-up 완료:

1. `[x]` provider repair/fallback QA 지표 — `NarrativeMetrics`가 generation을 success/provider_repair/local_repair/fallback로 분류하고 로그/smoke에 노출.
2. `[x]` Streamlit world/shard memory 노출 — `memory_overview()` + Streamlit Memory 패널(world archives, shards, novelty, start adjustment).
3. `[x]` Phase 13 Visual Job 진입 조건 결정 — 당시 동기 유지로 결정했으나 **이후 진입함**(아래 "Phase 13 진행됨" 참조), 진입 기준/측정법은 `docs/plans/2026-05-30-visual-job.md`, 결정은 `DECISIONS.md`.
4. `[x]` archive memory 장기 요약 정책 설계 — retention window + 통계 rollup, `docs/plans/2026-05-30-memory-summary.md`.

Memory summary rollup 구현 완료:

- `[x]` archive 시 player별 활성 `loop_archive`가 `ARCHIVE_RETENTION=20`을 넘으면 오래된 것을 `archive_rollup`(avg stability/tension + phase/tone/symbol histogram + window)로 압축하고, 흡수된 레코드는 `archive_compacted`로 표시한다.
- `[x]` `_initial_loop_scores`가 rollup 추세를 loop_count 가중으로 blend한다.
- `[x]` `memory_overview`와 Streamlit Memory 패널이 "Long-term summary"를 노출한다.

다음 트랙: **Playable Game Track (Phase 15-19)** — “개발자 데모”를 실제 1인용 TRPG 게임으로.
권위 설계는 `docs/GAMEPLAY.md`, 계획은 `docs/plans/2026-05-30-playable-single-player.md`.

확정 방향(2026-05-30): TRPG·AI=GM, 하이브리드 목표(세션 생존+캠페인 미스터리), 긴 서사,
하이브리드 연출, 세기말/Y2K 디지털 아트, 핵심 비트 이미지 생성.

진행:

- `[x]` Phase 15 Player UI 분리 — Streamlit 사이드바 `화면` 토글로 플레이어/개발자 뷰 분리.
  플레이어 뷰는 디제틱 접속 화면 + 장면 이미지/HUD(단계·안정도·긴장도 게이지)/선택지/행동 선언/
  회상/Codex, 개발 chrome 숨김. AppTest로 양쪽 뷰 무예외 + connect 흐름 검증.
- `[x]` 첫 시나리오 «Neo-Seoul» 작성 — `docs/scenarios/01-neo-seoul-connect.md`
  (ARK 재건 배경, 캐릭터 세린/린위에/카이/관리자 IX, GM 시드 브리프).
- `[x]` 시나리오 비주얼 리소스 `resources/neo-seoul/` — 컨셉 4 + 캐릭터 5(se-rin,
  se-rin-biker, lin-yue, kai, administrator-ix) FLUX 생성·임팩트 리파인 확정.
- `[x]` img2img 정체성 스티어링 기능 — `src/mythos_image_agent/img2img.py` +
  `scripts/img2img.py`(IP-Adapter는 후속 훅).

Phase 16 진행됨:

- `ScenePayload`와 `Scene` 모델에 `objective`(목표) 및 `action_result`(행동 결과) 필드 추가.
- PostgreSQL `scenes` 테이블에 해당 컬럼 추가 및 store layer 반영.
- GM 프롬프트(`prompts.py`)에 목표 제시 및 행동 결과 판정(성공/부분 성공/실패) 지침 추가.
- Streamlit Player/Developer 뷰에 현재 목표와 마지막 행동 결과 HUD 연출.
- fallback/Ollama 양쪽 경로에서 필드 연출 및 영속성 검증.

Phase 17 진행됨:

- `RuntimeSessionService.create_player`에 접속자 소질(archetype) `traits` 저장 기능 추가.
- `src/mythos_runtime/session.py`에 «Neo-Seoul» GM 시드 브리프(`NEO_SEOUL_GM_BRIEF`) 정의 및 `NarrativeContext` 주입.
- 첫 장면(turn 0)에 대한 부팅 온보딩 및 정세린(NPC) 등장 지침(novelty notes) 자동 주입.
- Streamlit Player/Developer 뷰의 접속자 생성 UI에 소질(Archetype) 선택 드롭다운 추가.

Phase 18 진행됨:

- `NarrativeShard` 모델 및 DB 테이블에 `kind`(일반/단서), `metadata` 필드 추가.
- `src/mythos_narrative/codex.py`에 Codex 시스템 구현: 특정 태그의 단서가 일정 수(threshold) 모이면 세계관 설정(Lore) 해금.
- «Neo-Seoul» 시나리오를 위한 초기 Lore 시드(최적화 정책, 카이의 꿈, 관리망의 정체) 정의.
- `LoopEngine`이 LLM의 `world_delta.clues`를 해석하여 단서 파편을 자동 생성하도록 확장.
- Streamlit Player 뷰에 'Codex (기억의 별자리)' 탭 추가: 수집된 단서 및 해금된 설정 시각화.

Phase 19 진행됨:

- `src/mythos_image_agent/postprocess.py` 구현: Y2K/CRT 스타일 후처리(스캔라인, 색수차, 글로우) 및 디제틱 HUD 오버레이 기능 추가.
- `VisualService`에 `img2img` 통합: 서사 브리프에서 캐릭터(정세린, 카이 등)나 장소(야시장, 스파이어) 키워드 감지 시 `resources/neo-seoul/`의 레퍼런스 이미지를 기반으로 정체성 고정 생성.
- 시각적 일관성 확보: 캐릭터 생성 시 strength 0.6, 환경 생성 시 strength 0.45를 적용하여 원형 유지와 프롬프트 충실도 균형 확보.
- `make visual-smoke`를 통해 전체 시각 연출 파이프라인 검증 완료.

Phase 14 진행됨 (DX 개선):

- `pyproject.toml`에 `ruff`, `mypy` 개발 의존성 추가.
- `Makefile`에 `lint`, `format`, `typecheck` 명령어 추가.
- 전역 코드 포맷팅 및 Linting 적용 (Ruff).
- `mypy`를 통한 엄격한 정적 타입 검사 도입 및 모든 에러 해결 (`tests/` 포함).
- `make smoke` 성공: 코드 품질 도구 도입 후 기존 로직 정상 동작 확인.

시스템 고도화 완료:

- **시나리오 설정 동적 로드**: 하드코딩된 GM 브리프 및 캐릭터 맵을 `scenario.json`으로 분리. `ScenarioConfig` 로더를 통해 다중 세계관 확장 기반 마련.
- **MinIO 기본 저장소 전환**: 생성된 이미지의 기본 저장소를 로컬 파일시스템에서 MinIO(S3)로 변경하여 클라우드 확장성 확보.
- **UI 동적화**: Streamlit에서 시나리오 설정에 기반한 소질(Archetype) 및 캐릭터 정보를 실시간 로드.

Phase 13 진행됨 (이미지 성능 + 비동기 visual job):

- **파이프라인 캐싱**: `src/mythos_image_agent/pipeline_cache.py`가 FLUX를 프로세스당 1회만
  로드(img2img는 컴포넌트 재사용). 매 장면 ~24GB 재로딩 병목 제거.
- **Redis 비동기 잡**: `VisualJobQueue`(list 큐 + worker heartbeat), `mythos_runtime.visual_worker`
  (`make visual-worker[-bg]`), `AssetRecord.status`(pending→processing→succeeded/failed)를
  `asset_id` 공유 upsert. `RuntimeOptions.visual_async`. 워커 부재 시 동기 폴백.
- **워커 자동 기동**: Streamlit 플레이어 뷰가 워커 부재 시 detached로 1회 spawn(별도 터미널 불필요).
  redis-py 8.x BRPOP socket-timeout 크래시 수정.
- **핵심비트 생성**: `_is_key_beat`로 매 턴이 아닌 핵심 장면에만 생성, in-flight 잡 enqueue 생략.
  `RuntimeOptions.image_every_turn`로 강제 가능.
- **MinIO 기본 + 표시**: 플레이어 뷰 `image_storage="minio"`, Streamlit이 `s3://`를 presigned URL로 표시.
- **Redis 뷰어**: `redis-commander`(http://localhost:8081), `make redis-shell`.
- 검증: `make lint`/`typecheck`(50)/`test`(62) PASS, 워커 무크래시·heartbeat, MinIO presign 왕복.

동적 타일 맵(Map) 완료:

- `src/mythos_core/mapgrid.py` — 자유 텍스트 `scene.location`을 정수 격자에 결정적으로 배치
  (첫 위치 0,0 · 인접 빈칸 · 나선 폴백 · 재방문 좌표 유지 · 키워드 kind 분류). `loop.state["_map"]` 영속.
- `LoopEngine`이 매 장면 `update_map` 호출. Streamlit 플레이어 뷰 dossier에 미니맵(현재칸
  하이라이트)+좌표 캡션, 상태줄 `LOC // … [x, y]`. 검증: `test`(68, +6 mapgrid)·엔진 end-to-end.

Phase 21 진행됨 (RPG 데이터 구조화):

- `docs/DESIGN_SYSTEM_STATS.md` 설계 확정: 5대 핵심 스탯 및 자율성 레벨(LV 1~5) 정의.
- `resources/neo-seoul/scenario.json` 업데이트: 소질별 초기 스탯 및 **레벨업 필요한 단서 수(clues_required)** 설정 추가.
- `RuntimeSessionService.archive` 고도화: 루프 종료 시 수집된 단서 개수를 기반으로 **자율성 레벨 자동 상승** 로직 구현.
- PostgreSQL `scenes` 테이블 `scene_type` 컬럼 추가 및 마이그레이션 완료.

Phase 24 진행됨 (인터랙션 고도화):

- Streamlit UI에 자율성 상태 연동: 레벨별 명칭 및 **'접속자 심리 상태(Keywords)'** 텍스트 힌트 제공 (캐릭터 행동 범위 암시).
- 시스템 제약(Guardrails) 시각화: 낮은 자율성 레벨에서 과격 단어 입력 시 '신호 제약 경고' 및 감쇄 연출 적용.
- **각성 연출**: 루프 종료 시 자율성 레벨이 일정 수준(LV 3+) 이상일 경우 축하 효과(balloons) 및 각성 메시지 출력.
- Codex 플레이어 정보 강화: 5대 핵심 스탯 및 보유 속성 시각화.

서사 엔진 고도화 완료 (Phase 22, 25, 26 기반):

- **RPG 기반 판정**: AI GM이 플레이어의 스탯(1~10)을 직접적인 근거로 성공/실패를 판정하고, 텍스트 내에서 스탯 수치를 언급하도록 강화.
- **작가적 GM 지침**: 노벨류 작법(지문/대사 분리), 오감 묘사 강제, 메타포 활용 지침 주입. 불필요한 라벨(지문:, 대사:) 제거.
- **서사 완급 조절**: `LoopEngine`의 강제 페이즈 전환 로직을 제거하고, AI GM이 `requested_next_phase`를 통해 직접 전환 시점을 결정하도록 변경하여 더 길고 밀도 있는 서사 구현 가능.
- **루프 요약 기능**: 루프 종료 시 전체 사건을 시적으로 요약하여 `WorldMemory`에 저장, 다음 루프의 서사 연속성 확보.
- **스탯-자율성 시너지**: 높은 지능/카리스마 스탯 보유 시 낮은 자율성 레벨의 제약을 논리적/감정적으로 우회하는 서사 생성 지침 추가.

Phase 23 진행됨 (진행도 기반 세계 진화):

- **서사적 진화**: 자율성 레벨에 따른 NPC 반응 로직 구현. 저레벨 시 플레이어를 단순 노이즈로 취급하다가, 고레벨 도달 시 세계의 촉매로 인식하며 경외/공포를 느끼는 서사 유도.
- **시각적 글리치 심화**: 플레이어의 자율성 레벨이 상승함에 따라 이미지의 Y2K/CRT 효과(색수차, 스캔라인, 글로우) 강도가 자동으로 강해지는 가변 처리 시스템 구축.
- **시점 및 문체 변화**: 진행도에 따라 객관적 관찰자 시점에서 플레이어의 주관적 의지를 강조하는 문체로 자연스럽게 전환되도록 GM 지침 강화.

바로 다음 (수행 예정 작업):

1. `[ ]` (선택) **IP-Adapter 실배선** — 캐릭터 얼굴-ID를 장면 전반에 강하게 고정(가중치 다운로드 필요).

## Open Risks

- FLUX 파이프라인은 프로세스당 1회만 로드(`pipeline_cache.py`)하므로 첫 장면 이후 전환은
  추론 시간만 든다. 장면 전환 시 이미지가 자동 생성된다(플레이어 뷰 기본 ON).
- 이미지 생성은 **Redis 비동기 잡**(Phase 13). 플레이어 뷰는 워커를 자동 기동하므로 별도
  터미널이 필요 없고(수동: `make visual-worker[-bg]`), 워커 부재 시 동기 폴백한다. FLUX 비용이
  커서 **핵심비트에서만 생성**(`_is_key_beat`)하고, 같은 loop in-flight 잡이 있으면 enqueue를
  생략한다. 저장은 **MinIO 기본**, Streamlit은 `s3://`를 presigned URL로 표시하며 pending엔
  "생성 중…"+새로고침을 보인다. Redis 뷰어는 http://localhost:8081(redis-commander).
- **이미지 속도 — 해결(mflux 기본 전환)**: 근인은 ① 중복 워커(각 FLUX 24GB)·② diffusers-MPS의
  비효율 + bf16 24GB로 인한 swap이었다. ①은 워커 단일 인스턴스 락으로, ②는 **Apple MLX(`mflux`)
  +8bit 양자화**를 기본 백엔드로 전환해 해결(`IMAGE_BACKEND=mflux`, diffusers는 폴백). 실측
  512×512/4step warm **7.9s(≈1.9s/step)** vs diffusers 40s/step(~20배), gemma 공존 시 swap 없음.
  img2img 정체성 스티어링도 mflux로 동작. (남은 점: 실 워커 브라우저 회귀, 필요 시 4-bit.)
- `world_memories`는 retention window + `archive_rollup` 통계 압축으로 무한 증가를 막는다. `narrative_shards`는 아직 limit 쿼리로만 소비를 제한하고 별도 압축은 없다.
- Ollama output은 여전히 repair path를 탈 수 있으므로, provider 품질 메트릭을 별도로 추적할 필요가 있다.

## Source Of Truth

- 다음 계획: `docs/NEXT_PLAN.md`
- 증분 로그: `docs/PROGRESS_LOG.md`
- 완료 요약: `docs/COMPLETED_SUMMARY.md`
- 결정 기록: `docs/DECISIONS.md`

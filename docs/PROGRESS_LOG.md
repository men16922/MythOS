# Progress Log

이 문서는 증분 작업 로그다. 최신 항목을 위에 추가한다.

형식:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

## 2026-05-31

- Status: [x] 이미지 진단 — async 정상(턴 비차단), 느림은 메모리경합 + img2img 1-step 버그.
- Changed:
  - **진단**: 워커 로그상 턴은 enqueue 즉시 종료(비차단 OK). 이미지 per-step이 6~13s로 느렸던
    건 swap(~17GB) 메모리 경합 때문(mflux 인스턴스 중복 + gemma + 기타). 워커 1개·단일 mflux로
    재측정 시 **4-bit 512/4step = 8.4s(2.1s/step)** 정상 회복.
  - **img2img 1-step 버그**: 플레이어 프리셋 steps=1이면 mflux img2img 유효 스텝이 0이 되어
    레퍼런스를 거의 그대로 반환(`latency 253ms`, `0it`). 프리셋을 **512×512 / 4 step**으로 상향
    (schnell 권장값, img2img도 실제 스텝 수행).
  - `.env` `MFLUX_QUANTIZE` 8→**4**(~7GB, gemma와 공존 시 메모리 여유 → swap 회피, 속도 동일).
  - 워커 4-bit 단일 인스턴스로 재기동.
- Verified: `lint`/`test`(69) PASS; 단일 mflux+gemma 4-bit 2.1s/step 측정; 워커 heartbeat alive.
- Blockers: 브라우저 등 외부 앱이 메모리를 점유하면 다시 swap→감속 가능. 동시 모델은 worker
  하나로 제한됨(락). 더 줄이려면 narrative 모델 경량화.
- Next: (선택) 플레이 중 실측 per-step 재확인, 필요 시 size/steps 추가 튜닝.

## 2026-05-31

- Status: [x] 서사 완급 조절 및 루프 요약 기능 구현.
- Changed:
  - `LoopEngine`: 매 턴 강제로 페이즈를 전환하던 로직을 제거하고, AI GM이 `requested_next_phase` 필드를 통해 직접 전환 시점을 결정하도록 변경.
  - `NarrativeDirector`: 루프 종료 시 전체 사건을 시적으로 요약하는 `summarize_loop` 메서드 추가.
  - `RuntimeSessionService`: `archive` 단계에서 생성된 요약을 `WorldMemory` (kind="loop_summary")로 저장하여 다음 루프의 연속성 강화.
  - `prompts.py`: "지문:", "대사:" 라벨 사용 금지 지침 추가 및 깊이 있는 장면 묘사(Pacing) 지침 강화.
  - `ScenePayload` & `parser.py`: `requested_next_phase` 필드 지원 추가.
- Verified: `make lint` && `make typecheck` PASS; `make smoke-local`로 페이즈 유지 확인.

## 2026-05-31

- Status: [x] 상세 로그 가시화 — Streamlit에서 mythos 구조적 로그가 묻히던 문제 수정.
- Changed:
  - `observability.configure_logging`이 루트 대신 **`mythos` 전용 로거**에 JSON 핸들러를
    붙이고 레벨 설정 + `propagate=False`. 기존엔 Streamlit이 루트 핸들러를 선점하면
    `if root.handlers: return`으로 우리 INFO 로그가 루트(WARNING)에 묻혔음 → 이제 호스트와
    무관하게 항상 출력(중복 없음).
  - `make streamlit`이 `MYTHOS_LOG_LEVEL`(기본 INFO, =DEBUG 가능)을 전달하고 로그 안내 출력.
    `make visual-worker-logs`(=`tail -f outputs/visual-worker.log`) 추가 — 이미지 생성 로그는
    자동 기동 워커 프로세스에 있으므로 이 타깃으로 실시간 확인.
  - Streamlit `use_container_width=True`(16곳)를 `width="stretch"`로 교체(1.58 deprecation
    경고 제거 → 로그 노이즈 정리).
- Verified: `lint`/`typecheck`(53)/`test`(69) PASS; 루트 WARNING 선점 시뮬레이션에서 INFO
  JSON 로그가 stderr에 1회 출력, `MYTHOS_LOG_LEVEL=ERROR`에서 INFO 억제·ERROR 출력 확인.
- Next: (선택) httpx 등 외부 로거 노이즈 조정, 플레이 중 in-UI 로그 패널.

## 2026-05-31

- Status: [x] 이미지 백엔드 mflux(MLX) 추가 + 기본 전환 — 장당 ~20배 가속.
- Changed:
  - `src/mythos_image_agent/mflux_generator.py` 신설: Apple MLX(`mflux`)로 FLUX.1-schnell
    생성. 프로세스당 1회 로드 캐시, 4/8-bit 양자화, `image_path`+`image_strength`로 img2img
    정체성 스티어링까지 동일 백엔드 지원.
  - `visual_service.py`에 `MfluxProvider` + `default_visual_provider()` 셀렉터 추가
    (`IMAGE_BACKEND` 환경변수). `VisualService` 기본 provider가 셀렉터를 사용.
  - `AgentConfig.image_backend`(기본 **mflux**)·`mflux_quantize`(기본 8) 추가, `.env.example`
    문서화, `pyproject`에 `mflux>=0.17.0`. diffusers 경로는 `IMAGE_BACKEND=diffusers`로 폴백 유지.
  - 지연 import 유지(mlx/mflux는 생성 시점에만 로드).
- Verified: `lint`/`typecheck`(53)/`test`(69) PASS; **실측 벤치(512×512/4step)**:
  mflux 8-bit warm **7.9s(≈1.9s/step)** vs diffusers **40s/step** → ~20배. img2img(se-rin
  레퍼런스)도 유효 PNG 생성. gemma11 공존 상태에서 swap 없이 동작.
- Blockers: 첫 생성은 양자화 로드(~10s) 1회 포함. mflux 가중치는 기존 HF 캐시 재사용.
- Next: 실 워커에서 mflux end-to-end 회귀(브라우저), 필요 시 4-bit로 추가 경량화.

## 2026-05-31

- Status: [x] 이미지 속도 근인 발견·수정 — 중복 워커 방지(단일 인스턴스 Redis 락).
- Changed: 진단 중 visual_worker가 **2개** 떠 있는 것을 발견(각각 FLUX ~24GB 로드 →
  48GB 초과 → swap 17GB → 40s/step의 직접 원인). 정리만으로 swap 17.2GB→8.9GB.
  - `VisualJobQueue.acquire_worker_slot()` 추가: heartbeat 키를 `SET NX EX`로 단일 인스턴스
    락으로 사용. worker는 시작 시 락 획득 실패하면 즉시 종료.
  - `HEARTBEAT_TTL_SECONDS` 60→180s(긴 FLUX 잡이 락 TTL을 넘겨 만료되지 않도록) +
    잡 처리 직후 `beat()`로 락 재확인.
- Verified: `lint`/`typecheck`(52)/`test`(69) PASS; 실 Redis로 worker A 획득=True,
  worker B=False(두 번째 종료) 확인.
- Blockers: 단일 워커·warm 상태라도 gemma11+FLUX24가 48GB에서 공존하면 여전히 빡빡.
  장당 속도의 본질적 해결은 **MLX(mflux)+양자화** 백엔드 전환(네이티브 Metal, 6~12GB)이 후보.
- Next: (제안) mflux 기반 VisualProvider를 플래그로 추가(diffusers는 폴백 유지).

## 2026-05-31

- Status: [x] 텍스트 생성 속도 개선(스키마 강제 출력 + 로컬복구 우선) + streamlit 단일 인스턴스.
- Changed:
  - `OllamaJSONProvider`가 `response_format`을 `json_object` → **`json_schema`**(`SCENE_JSON_SCHEMA`,
    schemas.py 신규)로 변경. 모델이 ScenePayload 모양에 grammar-constrained되어 첫 응답이 바로
    파싱됨 → 12초짜리 repair 왕복 제거. 구버전 호환 위해 실패 시 `json_object`로 폴백.
  - `NarrativeDirector._generate_classified` 재배열: 파싱 실패 시 **결정적 로컬 복구를 먼저**
    시도하고, 안 되면 그때만 provider repair 호출(낭비되는 두 번째 LLM 콜 최소화).
  - `Makefile`: `make streamlit`이 기존 인스턴스를 pkill 후 **8501 고정**으로 1개만 기동
    (더 이상 8502로 중복 안 뜸). `make streamlit-stop` 추가.
- Verified: `make lint`/`typecheck`(52)/`test`(69, director 테스트 갱신+1) PASS;
  `make narrative-smoke`(실 Ollama)에서 **outcome=success, repair 0회, latency ~15s**
  (이전 20s 생성 + 12s repair = ~32s에서 단축). 스키마 출력 8.6s 단발 probe도 확인.
- Blockers: 단일 생성 ~15s는 gemma4(11GB)×긴 한국어 내레이션×메모리경합의 바닥값.
  더 줄이려면 경량/소형 모델 또는 출력 길이 축소(서사 품질 트레이드오프) 필요.
- Next: (선택) 소형 narrative 모델 옵션, 출력 길이 튜닝, 토큰 스트리밍(체감 지연 감소).

## 2026-05-30

- Status: [x] 동적 타일 맵(Map) 기능 — 현재 좌표 + 주변 미니맵 UI.
- Changed:
  - `src/mythos_core/mapgrid.py` 신설: 자유 텍스트 `scene.location`을 정수 격자 타일로
    점진 배치. 첫 위치 (0,0), 새 위치는 직전 위치의 빈 인접칸에 결정적(이름 해시 시드)으로
    배치, 인접칸이 차면 나선 탐색. 재방문은 좌표 유지·visits 증가. 키워드 기반 kind 분류
    (market/spire/edge/blackout/data/refuge/node). 맵은 `loop.state["_map"]`에 저장(자동 영속).
  - `LoopEngine.apply_scene_payload`가 매 장면마다 `update_map` 호출(fallback/Ollama·CLI·
    Streamlit 공통).
  - Streamlit 플레이어 뷰: dossier 컬럼에 `_render_minimap`(북쪽 위, 현재칸 하이라이트) +
    좌표/탐사수 캡션. 기존 `LOC // …` 상태줄에 `[x, y]` 좌표 병기.
- Verified: `make lint`/`typecheck`(52)/`test`(68, +6 mapgrid) PASS; 엔진 end-to-end로
  경계(0,0)→야시장(1,1, 재방문 visits=2)→데이터코어(1,2) 배치·kind·current·order 확인.
  기존 `_map` 없는 loop는 미니맵 미표시로 graceful.
- Blockers: 위치 배치가 서사상 방향과 무관(이름 해시 기반). 방향 의미를 주려면 GM이
  world_delta에 방향/이동 힌트를 내도록 스키마 확장 필요(후속).
- Next: (선택) GM 이동 방향 힌트, Codex 전체 지도 뷰, 타일 클릭 상호작용.

## 2026-05-30

- Status: [x] Phase 24: 인터랙션 고도화 및 자율성 UI 구현 완료.
- Changed:
  - Streamlit UI에 자율성 레벨(LV 1-5) 연동 및 레벨별 의지 키워드 추천 버튼 추가.
  - 낮은 자율성 레벨에서 과격 행동 선언 시 '시스템 제약' 경고 연출 적용.
  - Codex 내 '내 정보' 섹션에 5대 스탯 및 속성(Attributes) 시각화 반영.
  - `scenario.json`에 자율성 설정(상태명, 키워드) 추가 및 동적 로드 연동.
- Verified: make lint && make typecheck PASS; UI 상의 키워드 입력 및 스탯 표시 확인.

## 2026-05-30

- Status: [x] Phase 23: 진행도 기반 세계 진화 및 시각적 글리치 심화 구현 완료.
- Changed:
  - `prompts.py`: 자율성 레벨에 따른 NPC 태도 변화(노이즈 → 촉매) 및 서사 시점 전환 지침 주입.
  - `postprocess.py`: `intensity` 파라미터를 추가하여 Y2K 효과의 강도를 가변적으로 조절 가능하도록 개선.
  - `visual_service.py`: 플레이어의 자율성 레벨을 기반으로 이미지 글리치 강도를 자동으로 스케일링 (LV 1: 0.5 ~ LV 5: 2.5).
- Verified: make lint && make typecheck PASS; 자율성 레벨 수동 조정 후 이미지 생성 시 효과 강도 변화 확인.

## 2026-05-30

- Status: [x] Phase 24: 인터랙션 고도화 및 자율성 연동 로직 완성.
- Changed:
  - `RuntimeSessionService.archive`: 단서(Clue) 수집량에 따른 **자율성 레벨 자동 상승** 로직 구현.
  - `streamlit_app.py`: 의지 키워드 버튼을 **역할극 가이드(Mental State Hint)** 텍스트로 변경 및 각성 시각 효과(Balloons) 추가.
  - `prompts.py`: 스탯 수치(1~10) 언급 강제 및 스탯을 활용한 자율성 제약 우회(Synergy) 지침 추가.
- Verified: make lint && make typecheck PASS; Loop 종료 후 단서 수에 따른 레벨업 및 UI 연출 확인.

## 2026-05-30

- Status: [x] RPG 스탯 시스템 및 노벨급 서사 엔진 고도화 구현 완료.
- Changed:
  - 5대 핵심 스탯(Strength, Intelligence, Charisma, Agility, Perception) 1~10 스케일 도입.
  - 소질(Archetype)별 초기 스탯 및 세계관 속성(ARK 링크, 인간찬가 등) 정의 및 `scenario.json` 적용.
  - `RuntimeSessionService.create_player` 시 스탯/자율성 레벨 자동 초기화 로직 구현.
  - `prompts.py` 전면 개편: 지문/대사 분리, 오감 묘사, 자율성 가드레일(주저함) 지침 주입.
  - `Scene` 모델 및 DB에 `scene_type` 추가 (마이그레이션 004).
- Verified: make lint && make typecheck PASS; DB 마이그레이션 및 새 접속자 생성 테스트 완료.

## 2026-05-30

- Status: [x] RPG 시스템 및 노벨급 서사 고도화 개선안(docs/feedback/0530-1.md) 확정.
- Changed:
  - 3대 핵심 스탯(신호/해석/공명) 및 자율성 레벨(LV 1-5) 설계.
  - 오감 묘사, NPC 화법, 영화적 스테이징 등 텍스트 품질 강화 전략 수립.
  - 자율성 기반 심리적 가드레일(행동 제약 연출) 메커니즘 설계.
- Verified: docs/feedback/0530-1.md 생성 및 NEXT_PLAN 반영.
- Next: Phase 21 RPG 데이터 구조화 착수.

## 2026-05-30

- Status: [x] 시나리오 설정 동적 로드 구현.
- Changed:
  - resources/neo-seoul/scenario.json 신설.
  - src/mythos_runtime/scenario.py (ScenarioConfig) 추가.
  - session.py 및 visual_service.py에서 하드코딩된 브리프 및 캐릭터 맵 제거 및 동적 로드로 전환.
  - Streamlit UI에서 시나리오 설정에 기반한 소질(Archetype) 목록 동적 렌더링.
- Verified: make lint && make typecheck PASS; streamlit 앱에서 동적 로드 확인.

## 2026-05-30

- Status: [x] Phase 14: DX (Developer Experience) 개선 완료.
  - ruff 적용 (포맷팅 및 Linting 전면 수정).
  - mypy 도입 및 정적 타입 에러 전면 해결.
  - Makefile 명령어 (lint, format, typecheck) 추가.
- Verified: make smoke PASS.

## 2026-05-30

- Status: [x] Phase 19: 아트 연출 통합 완료.
  - Y2K/CRT 후처리 및 디제틱 HUD 오버레이 (Pillow 기반) 구현.
  - VisualService에 img2img 통합 (캐릭터/컨셉 이미지 기반 정체성 스티어링).
  - 시각적 일관성 검증 (make visual-smoke).
- Verified: make visual-smoke PASS.

## 2026-05-30

- Status: [x] Phase 18: 미스터리 & Codex 시스템 구현 완료.
  - NarrativeShard 모델 및 DB 테이블 확장 (kind, metadata).
  - CodexService 구현 및 초기 Lore 시드 정의.
  - LoopEngine 단서 파편 자동 추출 로직 통합.
  - Streamlit UI 'Codex (기억의 별자리)' 탭 신설.
- Verified: make test-db PASS; Codex UI 확인.

## 2026-05-30

- Status: [x] Phase 17: 접속자 생성 & GM 톤 구현 완료.
  - Neo-Seoul GM 시드 브리프 정의 및 NarrativeContext 주입.
  - Player Archetype (Ghost, Smuggler, Collector) 및 Traits 시스템 확장.
  - 부팅 온보딩 시퀀스 및 NPC(세린) 등장 지침 자동화.
  - Streamlit 접속자 생성 UI 개선 (소질 선택 추가).
- Verified: make smoke-local PASS.

## 2026-05-30

- Status: [x] Phase 16: 세션 목표 & 행동 판정 연출 구현 완료.
  - Scene/ScenePayload 모델 확장 (objective, action_result).
  - DB Migration (002_add_scene_fields.sql) 및 Store 반영.
  - Narrative Director & Parser & Prompts 업데이트.
  - Streamlit UI (Player/Developer) HUD 연출 추가.
- Verified: make test-db PASS.

## 2026-05-30

- Status: [x] Phase 13: 이미지 성능 개선 및 비동기 Visual Job 구현 완료.
- Changed:
  - FLUX 파이프라인 캐싱 (`pipeline_cache.py`) 도입으로 로딩 병목 제거.
  - Redis 기반 비동기 잡 큐 (`VisualJobQueue`) 및 워커 (`visual_worker.py`) 구현.
  - Streamlit에서 워커 자동 기동 및 MinIO presigned URL 표시 연동.
  - 핵심 비트 생성 로직 (`_is_key_beat`) 적용으로 비용 최적화.
- Verified: make visual-smoke PASS, Redis/MinIO 연동 확인.

## 2026-05-30

- Status: `[x]` canonical Se-rin set to img2img refuge version; next tasks recorded.
- Changed: adopted `se-rin.png` = `variants/se-rin-img2img-refuge.png` (final-a re-rendered
  via img2img, strength 0.55) per preference; final-a preserved in `variants/` for
  revert. Updated `resources/neo-seoul/README.md`. Recorded the concrete next-task
  list in `STATUS.md` (바로 다음): Phase 16 session goals/action-resolution, Phase 17
  연결자/GM tone with the «Neo-Seoul» GM seed brief, Phase 18 mystery/Codex, Phase 19
  art integration, optional IP-Adapter wiring, and the Phase 13/14 background track.
- Verified: file swap confirmed on disk; docs reviewed for consistency.
- Blockers: none.
- Next: begin Phase 16.

## 2026-05-30

- Status: `[x]` img2img identity-steering feature added; remaining characters refined.
- Changed: added `src/mythos_image_agent/img2img.py` (`generate_image_img2img` via
  `FluxImg2ImgPipeline`, MPS + gated-repo handling, `strength` to trade scene-change
  vs identity retention) and `scripts/img2img.py` CLI; documented usage + the
  IP-Adapter follow-up in `resources/neo-seoul/README.md`. Refined the remaining
  Neo-Seoul characters to Se-rin's impact bar (`scripts/gen_char_refine.py`, 2
  candidates each) and adopted: `lin-yue.png`=v2-a (throne kingpin, seed 412),
  `kai.png`=v2-b (male android, blue eyes, seed 423), `administrator-ix.png`=v2-a
  (looming control structure, seed 432). Updated README seeds.
- Verified: diffusers 0.38.0 exposes FluxImg2ImgPipeline + load_ip_adapter (checked);
  `compileall`/import of the img2img module PASS; refine batch (exit 0, 6 PNGs)
  visually reviewed and selected; img2img demo
  (`variants/se-rin-img2img-refuge.png`, se-rin.png ref, strength 0.55) PASS —
  identity clearly retained across a re-rendered scene. (First demo run silently
  no-op'd due to a persisted shell cwd breaking `.venv/bin/python`; re-ran with
  absolute paths.)
- Blockers: none. True large-scene face-ID lock would need IP-Adapter weights (hook
  present, not wired).
- Next: Phase 16 with the «Neo-Seoul» GM seed brief, optionally wiring IP-Adapter.

## 2026-05-30

- Status: `[x]` Se-rin lead character art finalized (higher impact).
- Changed: iterated Se-rin (early-game lead) toward a more rebellious/cyberpunk/
  mysterious/biker look across several FLUX passes (`scripts/gen_se_rin_variants.py`,
  `gen_se_rin_v2.py`, `gen_se_rin_final.py`; candidates kept in
  `resources/neo-seoul/characters/variants/`). Adopted `se-rin.png` = final-a
  (no-helmet front portrait, seed 341) and `se-rin-biker.png` = biker-b (single-
  motorcycle scene shot, seed 332; fixed the earlier doubled-bike artifact). Updated
  the resources README character table + seeds.
- Verified: FLUX batches completed (exit 0); candidates visually reviewed; canonical
  assets present under `resources/neo-seoul/characters/`. Note: pipeline is
  text-to-image only, so faces were steered by prompt, not pixel-blended from
  references (true face-consistency would need img2img/IP-Adapter, not wired).
- Blockers: none.
- Next: Phase 16, injecting the «Neo-Seoul» GM seed brief.

## 2026-05-30

- Status: `[x]` «Neo-Seoul» worldbuilding + art revised per feedback.
- Changed: added §2.0 reconstruction backstory — a Northeast-Asian war destroyed the
  old cities, and a pan-national body ARK ("방주") rebuilt them as Neo-Seoul/Neo-Tokyo/
  Neo-Beijing under efficiency-absolutism (nation-corps are ARK's regional agents,
  Control Net/Administrator IX its enforcers); wove ARK into the MythOS meta-frame and
  GM seed brief. Redesigned characters: Se-rin = long-haired rebellious idol vibe,
  Lin-yue = underworld kingpin, Kai = male android. Emphasized Korean Hangul signage
  across all prompts and front-loaded key tokens to dodge CLIP's 77-token truncation.
  Added an 8th concept image `concept/04-reconstruction.png`. Updated scenario bible,
  `resources/neo-seoul/README.md`, and `scripts/gen_neo_seoul_art.py` (new seeds
  211/212/213 for the redesigned characters, 91 for reconstruction).
- Verified: FLUX batch completed (exit 0), 8 PNGs saved; visually reviewed se-rin,
  lin-yue, kai, reconstruction, night-market — revisions all landed (male Kai, idol
  Se-rin, kingpin Lin-yue, ruins-and-rebuild concept). Hangul signage is now Korean-
  forward but not perfectly legible (diffusion text limitation, as expected).
- Blockers: none. Legible Hangul would need typographic post-compositing if required.
- Next: Phase 16, injecting the «Neo-Seoul» GM seed brief.

## 2026-05-30

- Status: `[x]` first gameplay scenario «Neo-Seoul» written + concept/character art
  generated via FLUX.
- Changed: added `docs/scenarios/01-neo-seoul-connect.md` (scenario bible — logline,
  MythOS meta-frame, Neo-Seoul setting, 4 강렬 characters 세린/린위에/카이/관리자 IX,
  hybrid-goal mapping, LoopPhase beat sheet, Shard seeds, opening script, and a GM
  seed brief for Director injection); added `scripts/gen_neo_seoul_art.py` (loads
  FLUX once, renders 7 assets) and `resources/neo-seoul/` (README + 3 concept + 4
  character images). Linked the scenario/resources from `docs/README.md` map,
  `GAMEPLAY.md` §12.5, and `NEXT_PLAN.md`. Scenario is content for Phase 15-19, not
  a new phase.
- Verified: `make doctor` PASS (MPS, FLUX gated access, Ollama). Art batch completed
  (exit 0) — 7 PNGs (1024², 4 steps, ~1.2-1.7MB each) saved under
  `resources/neo-seoul/`; visually reviewed night-market, se-rin, kai, administrator-ix
  — all on-theme. (Harmless CLIP 77-token truncation warning; FLUX T5 carries the prompt.)
- Blockers: none.
- Next: Phase 16, using the «Neo-Seoul» GM seed brief.

## 2026-05-30

- Status: `[x]` Phase 15 Player/Developer UI split implemented (Streamlit).
- Changed: added a sidebar `화면` toggle (플레이어/개발자); split `main()` into
  `_developer_view` (existing dashboard) and `_player_view`; added a minimal player
  sidebar (`AI 게임마스터`, `장면 이미지 생성`) and an immersive player flow —
  diegetic connect screen (boot caption, 접속자 선택/생성, 세계에 접속/이어하기),
  active screen with scene image, Korean act-label HUD + stability/tension gauges,
  narration, choice buttons, `행동 선언` free input, 회상(Echoes) and 기억의
  별자리(Codex) panels, and a 종결 epilogue with new-session start. Player view hides
  loop/scene ids, raw deltas, QA metrics, rollup internals, infra links, and image
  params. Cleared the player free-action field via pending widget state.
- Verified: `.venv/bin/python -m compileall` PASS; `make test` PASS (54 tests, 2
  skipped); Streamlit headless boot returns HTTP 200 with no import error;
  `streamlit.testing.v1.AppTest` runs both views with no exception and completes a
  player create→connect→scene-render flow (HUD + header rendered).
- Blockers: none. Browser manual click-through still recommended.
- Next: Phase 16 (session objective + action-result read + survival-clock/act
  presentation).

## 2026-05-30

- Status: `[/]` playable single-player (TRPG) direction set; game design doc + plan
  written (no gameplay code yet).
- Changed: confirmed direction with user — TRPG with AI as Game Master, hybrid goal
  (session survival/stabilization + cross-loop mystery), long narrative sessions,
  hybrid presentation, fin-de-siècle/Y2K digital art, key-beat image generation,
  and a required Streamlit player-view / developer-debug-view split. Added
  `docs/GAMEPLAY.md` (authoritative gameplay design), `docs/plans/2026-05-30-playable-single-player.md`
  (plan snapshot + gap analysis), NEXT_PLAN Playable Game Track (Phase 15-19),
  a `DECISIONS.md` entry, and a `docs/README.md` doc-map row.
- Verified: docs only — reviewed for role separation and links; mapped existing
  systems (Director=GM, free action, world_delta, stability/tension, Echo/Shard/
  rollup) onto TRPG concepts to keep scope as framing/UX over new engines.
- Blockers: none.
- Next: implement Phase 15 (Streamlit Player/Developer view split) as the shell
  for all later game-ification.

## 2026-05-30

- Status: `[x]` archive memory rollup implemented (retention window + statistical
  compaction).
- Changed: added `ARCHIVE_RETENTION=20`, `_player_rollup`, `_archives_to_compact`,
  `_merge_archive_rollup`, and `_compact_player_archives` to `session.py`; archive
  now compacts a player's oldest `loop_archive` world memories beyond the window
  into a single `archive_rollup` (avg stability/tension + phase/tone/symbol
  histograms + window), marking absorbed records `archive_compacted` via
  memory_id upsert; `_initial_loop_scores` blends the rollup trend (weighted by
  loop_count) into the next loop's start scores; `memory_overview` and the
  Streamlit Memory panel surface a "Long-term summary".
- Verified: `.venv/bin/python -m compileall PASS; make test PASS with 54 tests
  and 2 skipped; make test-db PASS; make smoke-local PASS; Postgres e2e check
  PASS — with retention=2, 4 archives compacted to loop_archive=2,
  archive_compacted=2, archive_rollup=1 (loop_count 2, avg 70/22.5, populated
  histograms), and active world archives correctly excluded the compacted rows.
- Blockers: none.
- Next: monitor visual latency vs Phase 13 entry criteria, or begin Phase 14
  Developer Experience (lint/format/CI).

## 2026-05-30

- Status: `[x]` post-Phase-12 follow-ups complete (provider QA metric, Streamlit
  memory visibility, Phase 13 entry decision, memory summary policy).
- Changed: added `NarrativeMetrics` to `NarrativeDirector`, classifying each
  provider generation as success/provider_repair/local_repair/fallback, logging a
  `narrative outcome` line (new `outcome` log field) and surfacing ratios in
  `mythos_narrative.smoke`; added `RuntimeSessionService.memory_overview()` plus a
  Streamlit Memory panel showing world archives, narrative shards, novelty
  guidance, and the latest start adjustment; wrote
  `docs/plans/2026-05-30-visual-job.md` (defer async, entry criteria, measurement
  via existing `mythos.visual.generate` latency) and
  `docs/plans/2026-05-30-memory-summary.md` (retention window + statistical
  rollup), and recorded both decisions in `DECISIONS.md`.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 48 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with `memory_overview`
  returning 1 world archive, 1 shard, 4 novelty notes, and a populated start
  adjustment. Ollama-path metric not exercised (Ollama offline this session);
  unit tests cover all four outcomes.
- Blockers: none.
- Next: implement memory summary rollups (per `docs/plans/2026-05-30-memory-summary.md`)
  or monitor visual latency against the Phase 13 entry criteria.

## 2026-05-30

- Status: `[x]` archive memory dedup complete.
- Changed: made archive persistence idempotent for non-Echo memories; runtime now
  skips saving `loop_archive` world memory or narrative shard when the same
  loop/player archive record already exists.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 43 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with repeated archive
  preserving world memory `1 -> 1` and narrative shard `1 -> 1`.
- Blockers: none.
- Next: archive memory long-term summary policy or Streamlit memory visibility.

## 2026-05-30

- Status: `[x]` Phase 12 Narrative Runtime Depth implementation complete.
- Changed: added player-scoped world memory based initial loop score adjustment;
  new loops now derive conservative stability/tension deltas from recent archived
  `world_memories`, and store adjustment details in loop state for debugging.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 41 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with stressed archive
  producing next loop `stability=57`, `tension=35`, and adjustment reasons.
- Blockers: none.
- Next: archive memory dedup/summary policy, Streamlit memory visibility, or
  Phase 13 visual job architecture.

## 2026-05-30

- Status: `[~]` Phase 12 choice intent novelty complete.
- Changed: added `recent_choice_patterns` to `NoveltySignal`; summarized recent
  scene choice intents into compact frequency patterns; added novelty notes that
  ask the director to avoid repeating recent choice intent structures.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 37 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level check confirmed `archivex1, rewritex1`
  and `explorex1, interactx1` patterns in novelty notes.
- Blockers: none.
- Next: design World Memory based stability/tension adjustments.

## 2026-05-30

- Status: `[~]` Phase 12 Ollama memory path stabilized.
- Changed: requested JSON object responses from Ollama; strengthened the
  Narrative Director prompt against envelope wrapping; added parser normalization
  for model outputs that place the scene under `contract.scene`; added local
  repair for common LLM variants; added novelty guard for provider payloads that
  repeat a recent title.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 36 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; `make narrative-smoke` PASS through Ollama;
  service-level Ollama memory smoke PASS with one archived shard and a new
  non-fallback scene titled `The Echoing Core`.
- Blockers: none.
- Next: decide whether to add choice intent patterns to the novelty signal.

## 2026-05-30

- Status: `[~]` Phase 12 Narrative Runtime Depth in progress.
- Changed: added `NoveltyController`; extended `NarrativeContext` and narrative
  prompt payload with world memories, narrative shards, and novelty notes; added
  PostgreSQL `narrative_shards` CRUD; wired runtime start/choose/archive to read
  and write non-Echo memory; made fallback scenes reflect novelty context.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 32 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with one archived world
  memory, one narrative shard, and a novelty-adjusted next fallback scene title;
  Browser Streamlit basic regression PASS. `make narrative-smoke` reached Ollama
  but fell back after validation/repair failure, so provider-level memory
  reflection remains open.
- Blockers: none.
- Next: improve Ollama JSON quality, then rerun memory reflection smoke.

## 2026-05-30

- Status: `[x]` Phase 11 Streamlit Demo Polish complete.
- Changed: added `list_players()` to the store interface and PostgreSQL store;
  added DB-backed saved player selector, saved loop selector, manual player/loop
  expanders, selected loop resume flow, runtime action spinner, and separated
  visual asset/Echo rendering to Streamlit.
- Verified: `.venv/bin/python -m compileall agent.py streamlit_app.py src tests`
  PASS; `make test` PASS; `make test-db` PASS; `make smoke-local` PASS;
  browser PASS for saved player selection, saved loop resume, archive, and next
  loop Echo carry-over.
- Blockers: none.
- Next: Phase 12 Narrative Runtime Depth.

## 2026-05-30

- Status: `[x]` docs management split complete.
- Changed: added `docs/README.md`, `docs/DOCS_POLICY.md`, `docs/STATUS.md`,
  `docs/COMPLETED_SUMMARY.md`, `docs/PROGRESS_LOG.md`, `docs/DECISIONS.md`,
  `docs/plans/2026-05-30-post-mvp.md`, and `docs/archive/README.md`; updated
  README doc index; moved `IMPLEMENTATION.md` to
  `docs/archive/IMPLEMENTATION_M0_M10.md`.
- Verified: documentation files reviewed for role separation, dated planning,
  retire/delete policy, and link consistency.
- Blockers: none.
- Next: use `STATUS.md` + `NEXT_PLAN.md` before starting Phase 11 work.

## 2026-05-30

- Status: `[x]` M10 Streamlit playable demo complete.
- Changed: added `RuntimeSessionService`; refactored CLI to share service layer;
  added `streamlit_app.py`; added Streamlit dependency and `make streamlit`;
  fixed Streamlit widget state sync after browser testing.
- Verified: `make test` PASS; `make test-db` PASS; `make smoke-local` PASS;
  `make connect-demo` PASS; browser flow PASS for player creation, loop start,
  3 turns, archive, Echo display, next loop Echo carry-over, free-form action,
  filesystem image preview, MinIO image URI, and Ollama narrative mode.
- Blockers: in-app browser `iab` was unavailable, so browser verification used
  Playwright MCP.
- Next: Phase 11 Streamlit Demo Polish.

## 2026-05-30

- Status: `[x]` post-MVP documentation and test-noise cleanup complete.
- Changed: updated README runtime usage; documented infra, CLI, smoke commands,
  image options, and Streamlit demo usage; quieted test log output.
- Verified: `make test` PASS; `make smoke-local` PASS.
- Blockers: none.
- Next: split future plan/progress docs to avoid overloading a single tracker.

## 2026-05-30

- Status: `[x]` M9 Observability and QA complete.
- Changed: added JSON logging, optional OTLP HTTP trace export, span context
  manager, timed helper, and smoke aggregation targets.
- Verified: `make smoke` PASS; Jaeger service and MythOS spans visible.
- Blockers: none.
- Next: Streamlit playable demo.

## 2026-05-30

- Status: `[x]` M0-M8 local runtime vertical slice complete.
- Changed: implemented local infra, schema, core models, PostgreSQL store,
  Narrative Director, Loop Engine, Visual Service, and CLI vertical slice.
- Verified: unit tests, DB tests, narrative smoke, visual smoke, CLI demo, and
  tiny FLUX image generation all passed during milestone work.
- Blockers: none.
- Next: observability, QA, and browser demo.

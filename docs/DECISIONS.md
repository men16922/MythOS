# Decision Log

이 문서는 되돌리기 어렵거나 이후 구현 방향에 영향을 주는 결정을 기록한다. 최신 항목을 위에 추가한다.

## 2026-06-07

### Use Action Sheets As The Combat Pose Source Of Truth

Decision: 전투 시네마 캐릭터 에셋은 모델 이름보다 **검증된 action sheet 결과**를 기준으로 승격한다.
표준 포즈는 `idle/attack/guard/skill/hit`이며, `attack/guard/skill/hit`은 가능하면 한 캔버스 action
sheet에서 함께 생성해 얼굴, 의상, 체형, 조명, 스케일을 고정한다. 2026-06-07 기준 canonical party
3인(`Se-rin`, `player-noise`, `Kai`)은 Codex 내장 imagegen action sheet + chroma-key 제거 + 분할/정규화
결과다.

Reason: pose별 독립 생성은 Se-rin에서도 얼굴, 카메라, 의상, 액션 설득력이 흔들렸다. 반대로 같은
프롬프트/같은 캔버스의 action sheet는 시네마에서 필요한 0.5~1초 포즈 판독성, VFX, 캐릭터 일관성을
동시에 만족했다. Gemini/Imagen 3 같은 외부 모델은 후보로 평가할 수 있지만, 현재 repo에는 재현 가능한
GCP API 실행 경로와 검증 산출물이 없다. 따라서 운영 지침은 특정 외부 모델을 강제하지 않고, 캐릭터별
검수 시트가 통과한 산출물만 `resources/.../combat/`로 승격하는 방식으로 둔다.

Impact: `docs/plans/2026-06-07-combat-portrait-pipeline.md`가 전투 포즈 제작의 운영 권위가 된다. 모델은
캐릭터 단위로 섞지 않는 것이 원칙이지만, VFX/림라이트 같은 **얼굴·체형을 바꾸지 않는 후처리 오버레이**는
별도 후보로 허용한다. 외부 모델을 도입할 경우에도 먼저 `outputs/combat-sprite-compare/` 아래 검수 시트와
재현 명령을 남긴 뒤 실사용 경로로 승격한다.

## 2026-06-06

### Use mflux Redux For Character Face Consistency

Decision: 캐릭터 얼굴 일관성은 mflux **Redux**(레퍼런스 이미지 조건부 생성, strength 0.9, 캐릭터 portrait 레퍼런스)로 처리한다. 캐릭터 감지는 한국어 내러티브 키워드(`scenario.characters[].keywords`)로 하고, diffusers IP-Adapter 경로는 fallback 메타데이터(`use_ip_adapter`)로만 남긴다.

Reason: 기본 백엔드 mflux는 IP-Adapter를 지원하지 않아 img2img(구도까지 상속)만 가능했고, 게다가 캐릭터 감지를 영어 visual_brief로만 해 실제로는 거의 미탐지 → 매 장면 다른 얼굴이 나왔다. Redux는 빠른 온디바이스 경로를 유지하면서 구도를 상속하지 않고 인물/스타일을 주입한다. diffusers IP-Adapter는 MPS에서 느리고 메모리 부담이 커 기본 경로로 부적합.

Impact: 워커가 txt2img(Flux1)와 Redux(Flux1Redux) 두 모델을 동시 적재할 수 있어 메모리 모니터가 필요하다(필요 시 오프닝도 Redux로 통합해 단일 모델화). Redux는 IP-Adapter만큼 얼굴을 핀포인트 고정하진 않으며 FLUX-schnell 4스텝 한계가 있다. 얼굴 정밀도 최우선이면 diffusers IP-Adapter로 전환하는 옵션이 남아 있다.

### Reuse Streamlit Player Image Preset (512×512) On The Web/WS Path

Decision: WS(begin/choose) 이미지 생성 기본을 1024×1024에서 **512×512 / 4 step**으로 낮춰 Streamlit 플레이어 프리셋과 맞춘다.

Reason: 1024는 워밍 후에도 ~70–100초로 측정돼 체감 지연이 컸다. 512는 워밍 ~7.5초로 ~10배 빠르고 비동기라 텍스트/플레이를 막지 않는다.

Impact: PoC/React 장면 이미지 품질은 약간 낮아지지만 플레이 흐름이 크게 개선된다. 메시지로 width/height/steps override는 여전히 가능.

## 2026-06-04

### Differentiate Companion AI Behaviors (Shadowrun Style)

Decision: implement character-specific tactical behaviors for story companions in the combat loop. Jung Se-rin (`se_rin`) acts as a ranged supporter prioritizing player shielding (using `covering_noise` dynamically on target), while Kai (`kai`) charges in as a melee defender taking aggro (using `overload_strike` on target closest to the player).

Reason: previously, companion units relied on standard NPC behaviors which didn't reflect their character arcs or mechanical roles (e.g. Kai is supposed to be a defender, Se-rin a supporter). Having dedicated tactical profiles deepens the combat layer and gives companions mechanical weight.

Impact: the `_ally_turn` method in the combat engine now checks unit IDs to dispatch tailored actions. Additionally, the `_execute_npc_skill` logic was corrected so that defensive buffs (`defense_bonus`) are applied to the target parameter (such as the player) instead of being hardcoded to the caster.

### Dynamic Stat-Based Inner Monologue Prompts (Disco Elysium Style)

Decision: analyze the player's profile stats dynamically to detect the highest and lowest traits, and inject explicit guidelines for these traits as distinct inner voices into the AI GM's `novelty_notes`.

Reason: to enhance character immersion and make the 5 core stats feel like actual aspects of the player's consciousness rather than static numbers, echoing the inner-thought mechanic of Disco Elysium.

Impact: `build_runtime_narrative_context` evaluates player stats and appends guidelines detailing how the highest stat should suggest logical/instinctual choices in parentheses (e.g. `(Intelligence: ...)`) and the lowest stat should occasionally prompt hesitation or misjudgments.

## 2026-05-31

### Use A Local JSON Bridge For Combat UI Actions

Decision: move active combat presentation into one self-contained iframe and route
per-turn actions through a localhost-only JSON bridge
(`src/mythos_runtime/combat_server.py`) instead of Streamlit widgets and per-action
fragment reruns.

Reason: Streamlit reruns remounted the tactical board iframe on every move/attack,
causing visible flicker and leaking the hidden action input as a white box. Keeping the
combat UI mounted and updating it with fetch responses removes the remount path while
leaving `CombatService`, the deterministic engine, and persistence schemas unchanged.

Impact: combat actions now cross a 127.0.0.1 HTTP boundary inside the local Streamlit
process. The bridge is demo-local, request-scoped, and covered by handler tests.
Future combat UI work should extend the iframe payload/API rather than reintroducing
per-action Streamlit controls.

### Move Scenario-Specific GM Instructions Into `scenario.json`

Decision: store scenario-specific GM instructions in `resources/neo-seoul/scenario.json`
as `system_prompt`, and pass that prompt through `ScenarioConfig`, `RuntimeSessionService`,
and `NarrativeDirector` instead of keeping one hardcoded global system prompt in
`prompts.py`.

Reason: Neo-Seoul is now a full scenario with its own arcs, NPC agendas, ending matrix,
and prose rules. Keeping those instructions in code made new scenarios expensive and
encouraged runtime-specific prompt edits in shared narrative modules. Scenario-owned
prompts keep content, tone, and rule variants close to the scenario data.

Impact: `prompts.py` remains responsible for reusable prompt assembly, while the
scenario file owns world-specific GM policy. Tests and smoke paths must construct or load
a scenario config when they expect scenario-specific behavior.

### Adopt Scenario v2 Gear World Causality

Decision: upgrade Neo-Seoul scenario data and GM context around a "Gear World" model:
main arcs, side arcs, hidden NPC agendas, location/action causality, butterfly-effect
flags, and a four-axis ending matrix (Humanity, Dominance, Resilience, Insight).

Reason: the playable target moved from a short demo loop to a 40-60 turn single-player
TRPG session. Static scene prompts are not enough for long-form play; the world needs
stateful pressures that continue moving around the player and make choices accumulate
toward distinct endings.

Impact: `scenario.json` is now the center of scenario design. `ScenarioConfig` must stay
schema-tolerant for future worlds, and developer/debug views should eventually expose
causality state, pending effects, and NPC agenda movement if deeper QA is needed.

### Use `mflux` As The Default Local Image Backend

Decision: make Apple MLX `mflux` the default image backend with quantization support,
while keeping the diffusers FLUX path as an explicit fallback.

Reason: diffusers on MPS caused high memory pressure and slow per-step latency when
coexisting with Ollama. `mflux` with 4-bit or 8-bit quantization keeps the local Apple
Silicon path viable for playable sessions, especially when paired with a single worker
lock to prevent duplicate model loads.

Impact: default visual generation expects `IMAGE_BACKEND=mflux`; diffusers remains
available via configuration. Performance QA should focus on worker singleton behavior,
quantization level, image size/steps, and gemma/Ollama coexistence.

## 2026-05-30

### Enter Phase 13: Cache FLUX Pipeline + Redis Async Visual Jobs

Decision: reverse the earlier "defer async" stance and enter Phase 13. Two changes:
(1) cache the FLUX pipeline per process (`mythos_image_agent/pipeline_cache.py`) so the
~24GB model loads once instead of on every scene; (2) add a Redis-backed async path —
`VisualJobQueue` (list + worker heartbeat), a `mythos_runtime.visual_worker` process,
and `AssetRecord.status` (pending/processing/succeeded/failed) sharing one asset row via
a pre-minted `asset_id`. Player view auto-generates images on scene transition and uses
async when a live worker is present, falling back to synchronous generation otherwise.

Reason: the prior decision assumed images were opt-in and rarely on. The product moved to
auto-generating a representative image on every scene transition, which makes the
per-call model reload (the real bottleneck, not inference) and synchronous UI blocking
both unacceptable. Pipeline caching removes the reload cost; the async worker removes the
remaining UI block while keeping the model warm in a long-running process.

Impact: supersedes "Defer Async Visual Jobs" below. No schema migration (status lives in
`assets.metadata`). New dependency `redis>=5.0.0`. New `make visual-worker`. The async path
is safe-by-default: it only enqueues when a worker heartbeat exists, else generates
synchronously, so images always appear even with no worker/Redis. Round-trip covered by
`tests/test_visual_queue.py` plus a live Redis+Postgres end-to-end check.

### Frame Gameplay As Single-Player TRPG With AI Game Master

Decision: the game's playable form is a 1-player loop-based TRPG where the AI
Narrative Director acts as Game Master. Goal structure is hybrid (per-session
survival/stabilization + cross-loop mystery), sessions are long and narrative,
player UI uses hybrid presentation (diegetic terminal for connect/collapse/unlock
moments, clean narrative view otherwise), art direction is fin-de-siècle / Y2K
digital, and representative images are generated at key beats when appropriate.

Reason: the existing systems already map cleanly onto TRPG concepts (Director=GM,
free action=action declaration, world_delta=GM adjudication, stability/tension=
survival clock, Echo/Shard/WorldMemory=campaign memory), so game-ification is
mostly framing/UX/goals over a working runtime rather than new engines. User
confirmed direction on 2026-05-30.

Impact: authoritative gameplay design lives in `docs/GAMEPLAY.md`; implementation
phasing (Phase 15-19) is in `docs/NEXT_PLAN.md` and
`docs/plans/2026-05-30-playable-single-player.md`. Streamlit must split into a
player view and a developer/GM debug view, both calling the shared
`RuntimeSessionService`. Schema-heavy changes are avoided in favor of JSON
state/memory layers.

### Defer Async Visual Jobs Until Latency Justifies It

Decision: keep image generation synchronous for now; do not introduce the Redis
queue + worker async path yet.

Reason: images are opt-in (`with_image`, default off) and only block the single
turn that requests them, so the text-play critical path is unaffected. FLUX
latency is already observable via the `mythos.visual.generate` `latency_ms`
log/trace, so the Phase 13 entry criteria can be monitored without new
infrastructure.

Impact: Phase 13 async work starts only when measured FLUX p50 latency blocks
interactive play AND a continuous `with_image` play flow is actually needed. The
async design sketch and entry criteria live in
`docs/plans/2026-05-30-visual-job.md`. Redis stays provisioned but unused by the
runtime until then.

### Compress Old Archive Memory With Statistical Rollups

Decision: bound `world_memories` / `narrative_shards` growth with a per-player
retention window plus a statistical `archive_rollup` record, instead of hard
deleting old memories.

Reason: runtime already consumes only recent memory (last ~8-20 records), so old
rows add storage and noise without value. A rollup preserves long-term trend
(avg stability/tension, tone/symbol histograms) while keeping active queries
small. Records leave the active set via a status flag rather than deletion, so
nothing is lost.

Impact: default active window N=20; rollups merge by weighted (loop_count)
average; `_initial_loop_scores` will blend rollup trend with the recent window.
Full design and implementation steps are in
`docs/plans/2026-05-30-memory-summary.md`. LLM-based natural-language
summarization is out of scope for this stage.

### Split Documentation By Role

Decision: future docs updates will be split across `STATUS.md`, `NEXT_PLAN.md`,
`PROGRESS_LOG.md`, `COMPLETED_SUMMARY.md`, `DECISIONS.md`, and dated plans under
`docs/plans/`.

Reason: `IMPLEMENTATION.md` had accumulated roadmap, detailed checklists,
verification logs, decisions, and backlog in one file. The split keeps current
status short, preserves historical detail, and makes incremental updates easier.

Impact: the old `IMPLEMENTATION.md` was moved to
`docs/archive/IMPLEMENTATION_M0_M10.md` as the M0-M10 detailed archive. New work
should update the split docs instead of appending everything to a single tracker.
Obsolete documents should be summarized into the appropriate current doc before
being archived or deleted.

## 2026-05-30

### Keep Streamlit As MVP Demo Layer

Decision: use Streamlit for the local playable demo and keep CLI support.

Reason: Streamlit gives a fast local browser demo without introducing a frontend
build stack. CLI remains useful for smoke and scripted flows.

Impact: Streamlit and CLI share `RuntimeSessionService`; game orchestration
should not be duplicated in UI code.

## 2026-05-30

### Use RuntimeSessionService As Orchestration Boundary

Decision: move player/loop/choice/archive orchestration into
`RuntimeSessionService`.

Reason: CLI and Streamlit need the same runtime behavior. A shared service avoids
forked logic and keeps PostgreSQL as the authoritative state.

Impact: future UI surfaces should call the service layer instead of reimplementing
loop flow.

## 2026-05-30

### Use psycopg For Store Layer

Decision: implement PostgreSQL persistence with `psycopg`.

Reason: direct SQL matches the raw SQL migration approach and keeps behavior
explicit for the MVP.

Impact: SQLAlchemy/Alembic can be introduced later if schema churn grows.

## 2026-05-30

### Start Migrations With Raw SQL And Makefile

Decision: use raw SQL files in `migrations/` and Makefile targets for migration
apply/reset.

Reason: minimal dependency surface and clear local operations for the MVP.

Impact: migrations are idempotent where practical; complex migration history may
require Alembic later.

## 2026-05-30

### Host Ollama And FLUX On Mac Host

Decision: run Ollama and FLUX on the Mac host, not Docker.

Reason: Apple Silicon Metal/MPS acceleration is host-native and already available
locally.

Impact: Docker Compose is only for PostgreSQL, MinIO, Redis, OTel, Jaeger, and
Adminer.

## 2026-05-30

### Use Docker Compose MinIO Init Container

Decision: create MinIO buckets through a compose `minio-init` container.

Reason: keeps the local infra stack self-contained.

Impact: no separate host bootstrap script is required for bucket creation.

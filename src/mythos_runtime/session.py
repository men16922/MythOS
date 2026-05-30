from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any

from mythos_core import (
    AssetRecord,
    Echo,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldMemory,
    create_loop_seed,
    new_loop_id,
    new_memory_id,
    new_player_id,
    new_shard_id,
)
from mythos_core.clock import utc_now
from mythos_core.models import to_json_dict
from mythos_loop import LoopEngine, create_player_event, create_world_event
from mythos_memory import MythOSStore
from mythos_narrative import NarrativeContext, NarrativeDirector
from mythos_narrative.codex import CodexService, LoreEntry
from mythos_narrative.variation import NoveltyController
from mythos_runtime.observability import get_logger, span
from mythos_runtime.scenario import load_scenario
from mythos_runtime.visual_queue import VisualJobQueue
from mythos_runtime.visual_service import (
    FilesystemStorageAdapter,
    MinIOStorageAdapter,
    VisualGenerationResult,
    VisualService,
)

MYTHOS_WORLD_ID = "mythos-local"

# Per-player active `loop_archive` world memories kept verbatim; older ones are
# absorbed into a statistical `archive_rollup`. See
# docs/plans/2026-05-30-memory-summary.md.
ARCHIVE_RETENTION = 20


@dataclass(frozen=True)
class RuntimeOptions:
    fallback: bool = False
    with_image: bool = False
    image_storage: str = "minio"
    image_width: int = 1024
    image_height: int = 1024
    image_steps: int = 4
    scenario_id: str = "neo-seoul"
    # When True, enqueue image generation to Redis (non-blocking) if a live worker
    # is present; otherwise fall back to synchronous generation.
    visual_async: bool = False
    # When False (default), only generate images on key beats; True forces every turn.
    image_every_turn: bool = False


@dataclass(frozen=True)
class RuntimeSnapshot:
    player: PlayerProfile
    loop: LoopState
    scene: Scene
    assets: list[AssetRecord]
    image_result: VisualGenerationResult | None = None
    echo: Echo | None = None


@dataclass(frozen=True)
class MemoryOverview:
    """Read-only view of a player's cross-loop memory, for UI/QA surfaces."""

    world_archives: list[WorldMemory]
    narrative_shards: list[NarrativeShard]
    novelty_notes: list[str]
    latest_adjustment: dict | None = None
    rollup: dict | None = None
    unlocked_lore: list[LoreEntry] = field(default_factory=list)


class RuntimeSessionService:
    def __init__(
        self,
        store: MythOSStore,
        director: NarrativeDirector | None = None,
        engine: LoopEngine | None = None,
        novelty: NoveltyController | None = None,
        codex: CodexService | None = None,
    ) -> None:
        self.store = store
        self.director = director or NarrativeDirector()
        self.engine = engine or LoopEngine()
        self.novelty = novelty or NoveltyController()
        self.codex = codex or CodexService()
        self.logger = get_logger("mythos.session")

    def create_player(
        self,
        display_name: str,
        player_id: str | None = None,
        traits: dict[str, Any] | None = None,
        scenario_id: str = "neo-seoul",
    ) -> PlayerProfile:
        now = utc_now()
        actual_traits = traits or {}

        # Initialize RPG Stats if archetype is provided
        archetype_name = actual_traits.get("archetype")
        if archetype_name:
            try:
                scenario = load_scenario(scenario_id)
                for arch in scenario.archetypes:
                    if arch.get("name") == archetype_name:
                        actual_traits["stats"] = arch.get("stats", {})
                        actual_traits["attributes"] = arch.get("attributes", [])
                        actual_traits["autonomy_level"] = 1
                        actual_traits["unlocked_traits"] = []
                        break
            except Exception:
                pass  # Fallback to minimal traits if scenario load fails

        player = PlayerProfile(
            player_id=player_id or new_player_id(),
            display_name=display_name,
            created_at=now,
            updated_at=now,
            traits=actual_traits,
        )
        self.store.create_player(player)
        self.logger.info(
            "player saved",
            extra={"player_id": player.player_id, "status": "succeeded"},
        )
        return player

    def start_loop(self, player_id: str, options: RuntimeOptions | None = None) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        player = self._require_player(player_id)
        memories = self.store.list_player_memories(player.player_id)
        loops = self.store.list_loops(player.player_id)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        narrative_shards = self.store.list_narrative_shards(player.player_id)
        novelty_signal = self.novelty.build_signal(_latest_scenes(self.store, loops))
        initial_scores = _initial_loop_scores(world_memories, player_id=player.player_id)
        loop_index = len(loops) + 1
        scenario = load_scenario(options.scenario_id)
        loop = LoopState(
            loop_id=new_loop_id(),
            player_id=player.player_id,
            seed=create_loop_seed(
                player.player_id,
                loop_index,
                {"memories": [memory.content for memory in memories]},
            ),
            phase=LoopPhase.CONNECT,
            location_id=scenario.starting_location,
            stability=initial_scores.stability,
            tension=initial_scores.tension,
            started_at=utc_now(),
            state=initial_scores.state,
            active_echoes=_echoes_from_memories(memories),
        )
        context = NarrativeContext(
            player=player,
            loop=loop,
            turn_index=0,
            recent_events=[],
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
        )
        context.novelty_notes.insert(0, f"SCENARIO_BRIEF: {scenario.brief}")
        context.novelty_notes.append(
            "LANGUAGE_RULE: Player-facing narration, objectives, choices, and action_result "
            "must be written in Korean by default. Keep only compact technical labels in English "
            "when they are diegetic UI terms."
        )
        _append_story_beat_notes(context.novelty_notes, scenario.story_beats, loop.phase)
        _append_script_examples(context.novelty_notes, scenario.script_examples)
        if loop.phase is LoopPhase.CONNECT and context.turn_index == 0:
            archetype = player.traits.get("archetype", "Unclassified")
            context.novelty_notes.append(
                f"ONBOARDING: Start with a diegetic booting sequence. "
                f"Recognize the player as a '{archetype}' signal. "
                f"Introduce Jung Se-rin (물거미) as she pulls the player into safety."
            )

        scene, payload = (
            self.director.fallback_scene(context)
            if options.fallback
            else self.director.generate_first_scene(context)
        )
        with span("mythos.session.connect", player_id=player.player_id, loop_id=loop.loop_id):
            transition = self.engine.apply_scene_payload(loop, scene, payload)
        if not transition.ok:
            raise RuntimeError(_format_errors(transition.errors))

        with self.store.transaction():
            self.store.save_loop(transition.loop)
            self.store.save_scene(scene)
            for event in transition.events:
                self.store.append_event(event)
            for shard in transition.discovered_shards:
                self.store.save_narrative_shard(shard)

        image_result = self._maybe_generate_image(options, transition.loop, scene, player.player_id)
        self.logger.info(
            "loop connected",
            extra={
                "player_id": player.player_id,
                "loop_id": transition.loop.loop_id,
                "scene_id": scene.scene_id,
                "status": "succeeded",
            },
        )
        return RuntimeSnapshot(
            player=player,
            loop=transition.loop,
            scene=scene,
            assets=self.store.list_assets(transition.loop.loop_id),
            image_result=image_result,
        )

    def choose(
        self,
        loop_id: str,
        choice_id: str | None = None,
        action: str | None = None,
        options: RuntimeOptions | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        player = self._require_player(loop.player_id)
        latest_scene = self.store.get_latest_scene(loop.loop_id)
        if latest_scene is None:
            raise RuntimeError(f"no scene found for loop_id={loop.loop_id}")

        resolved_action = _resolve_action(latest_scene, choice_id, action)
        recent_events = self.store.list_events(loop.loop_id)
        memories = self.store.list_player_memories(player.player_id)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        narrative_shards = self.store.list_narrative_shards(player.player_id)
        loops = self.store.list_loops(player.player_id)
        novelty_signal = self.novelty.build_signal(
            [*_latest_scenes(self.store, loops), latest_scene]
        )
        turn_index = latest_scene.turn_index + 1
        player_event = create_player_event(loop.loop_id, turn_index, resolved_action)
        # Load scenario configuration
        scenario = load_scenario(options.scenario_id)

        context = NarrativeContext(
            player=player,
            loop=loop,
            turn_index=turn_index,
            recent_events=recent_events,
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
            player_action=resolved_action,
        )
        # Keep injecting scenario brief for consistency
        context.novelty_notes.insert(0, f"SCENARIO_BRIEF: {scenario.brief}")
        context.novelty_notes.append(
            "LANGUAGE_RULE: Player-facing narration, objectives, choices, and action_result "
            "must be written in Korean by default. Keep only compact technical labels in English "
            "when they are diegetic UI terms."
        )
        _append_story_beat_notes(context.novelty_notes, scenario.story_beats, loop.phase)
        _append_script_examples(context.novelty_notes, scenario.script_examples)

        scene, payload = (
            self.director.fallback_scene(context)
            if options.fallback
            else self.director.generate_next_scene(context)
        )
        with span("mythos.session.choose", player_id=player.player_id, loop_id=loop.loop_id):
            transition = self.engine.apply_scene_payload(loop, scene, payload, player_event)
        if not transition.ok:
            raise RuntimeError(_format_errors(transition.errors))

        with self.store.transaction():
            self.store.save_loop(transition.loop)
            self.store.save_scene(scene)
            for event in transition.events:
                self.store.append_event(event)
            for shard in transition.discovered_shards:
                self.store.save_narrative_shard(shard)
            if transition.echo is not None:
                _save_echo_memory(self.store, transition.loop.player_id, transition.echo)

        image_result = self._maybe_generate_image(options, transition.loop, scene, player.player_id)
        self.logger.info(
            "choice applied",
            extra={
                "player_id": player.player_id,
                "loop_id": transition.loop.loop_id,
                "scene_id": scene.scene_id,
                "event_id": player_event.event_id,
                "status": "succeeded",
            },
        )
        return RuntimeSnapshot(
            player=player,
            loop=transition.loop,
            scene=scene,
            assets=self.store.list_assets(transition.loop.loop_id),
            image_result=image_result,
            echo=transition.echo,
        )

    def resume(self, loop_id: str | None = None, player_id: str | None = None) -> RuntimeSnapshot:
        loop = None
        if loop_id:
            loop = self.store.get_loop(loop_id)
        elif player_id:
            loops = self.store.list_loops(player_id)
            loop = loops[0] if loops else None
        else:
            raise RuntimeError("resume requires loop_id or player_id")
        if loop is None:
            raise RuntimeError("loop not found")
        player = self._require_player(loop.player_id)
        scene = self.store.get_latest_scene(loop.loop_id)
        if scene is None:
            raise RuntimeError(f"loop_id={loop.loop_id} has no scenes")
        return RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
        )

    def memory_overview(self, player_id: str, limit: int = 8) -> MemoryOverview:
        player = self._require_player(player_id)
        loops = self.store.list_loops(player.player_id)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        narrative_shards = self.store.list_narrative_shards(player.player_id, limit=1000)
        novelty_signal = self.novelty.build_signal(_latest_scenes(self.store, loops))
        world_archives = [
            memory
            for memory in world_memories
            if memory.kind == "loop_archive"
            and isinstance(memory.content, dict)
            and memory.content.get("player_id") == player.player_id
        ][-limit:]
        latest_adjustment = None
        for loop in loops:
            if isinstance(loop.state, dict):
                adj = loop.state.get("initial_world_memory_adjustment")
                if isinstance(adj, dict):
                    latest_adjustment = adj
                    break

        return MemoryOverview(
            world_archives=world_archives,
            narrative_shards=narrative_shards[:limit],
            novelty_notes=novelty_signal.notes,
            latest_adjustment=latest_adjustment,
            rollup=_player_rollup(world_memories, player.player_id),
            unlocked_lore=self.codex.get_unlocked_lore(narrative_shards),
        )

    def archive(self, loop_id: str) -> RuntimeSnapshot:
        loop = self._require_loop(loop_id)
        player = self._require_player(loop.player_id)
        latest_scene = self.store.get_latest_scene(loop.loop_id)
        if latest_scene is None:
            raise RuntimeError(f"loop_id={loop.loop_id} has no scenes")
        if loop.phase is LoopPhase.ENDED:
            return RuntimeSnapshot(
                player=player,
                loop=loop,
                scene=latest_scene,
                assets=self.store.list_assets(loop.loop_id),
            )

        event = create_world_event(
            loop.loop_id,
            latest_scene.turn_index + 1,
            "archive_loop",
            "Loop archived by UI.",
            {"phase": "ended"},
        )
        echo = Echo(
            echo_id=f"echo_{event.event_id.removeprefix('event_')}",
            source_loop_id=loop.loop_id,
            source_event_id=event.event_id,
            symbol=_symbol_from_scene(latest_scene),
            text=f"{latest_scene.title}: archived",
        )
        ended_loop = replace(
            loop,
            phase=LoopPhase.ENDED,
            ended_at=utc_now(),
            active_echoes=[*loop.active_echoes, echo],
        )
        has_world_archive = _has_archive_world_memory(
            self.store.list_world_memories(MYTHOS_WORLD_ID),
            loop_id=loop.loop_id,
            player_id=loop.player_id,
        )
        has_narrative_shard = _has_narrative_shard(
            self.store.list_narrative_shards(loop.player_id, limit=100),
            loop_id=loop.loop_id,
        )
        with self.store.transaction():
            self.store.save_loop(ended_loop)
            self.store.append_event(event)
            _save_echo_memory(self.store, loop.player_id, echo)
            if not has_world_archive:
                self.store.save_world_memory(_world_memory_from_archive(ended_loop, latest_scene))
            if not has_narrative_shard:
                self.store.save_narrative_shard(
                    _narrative_shard_from_archive(ended_loop, latest_scene, echo)
                )

        # Generate and save loop summary
        events = self.store.list_events(loop.loop_id)
        event_dicts = [to_json_dict(e) for e in events]
        summary_text = self.director.summarize_loop(event_dicts)
        summary_memory = WorldMemory(
            memory_id=new_memory_id(),
            world_id=MYTHOS_WORLD_ID,
            kind="loop_summary",
            content={
                "loop_id": loop.loop_id,
                "player_id": loop.player_id,
                "summary": summary_text,
            },
            weight=1.0,
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        self.store.save_world_memory(summary_memory)

        # Automatic Autonomy Leveling
        clues = self.store.list_narrative_shards(loop.player_id, limit=1000)
        clue_count = len([s for s in clues if s.kind == "clue"])

        # Determine new level based on scenario config
        new_level = 1
        try:
            # We assume scenario_id is stored in loop state or passed.
            # For robustness in local runtime, we default to neo-seoul.
            scenario = load_scenario("neo-seoul")
            for lv_str, cfg in sorted(
                scenario.autonomy_config.items(), key=lambda x: int(x[0]), reverse=True
            ):
                if clue_count >= cfg.get("clues_required", 999):
                    new_level = int(lv_str)
                    break
        except Exception:
            pass

        # Update player traits if level increased
        if new_level > int(player.traits.get("autonomy_level", 1)):
            updated_traits = dict(player.traits)
            updated_traits["autonomy_level"] = new_level
            # Also potentially add a trait for leveling up
            updated_player = replace(player, traits=updated_traits, updated_at=utc_now())
            self.store.create_player(updated_player)  # Upsert
            self.logger.info(
                "player autonomy level up",
                extra={"player_id": player.player_id, "new_level": new_level},
            )

        _compact_player_archives(self.store, loop.player_id)
        self.logger.info(
            "loop archived",
            extra={
                "player_id": loop.player_id,
                "loop_id": loop.loop_id,
                "event_id": event.event_id,
                "status": "succeeded",
            },
        )
        return RuntimeSnapshot(
            player=player,
            loop=ended_loop,
            scene=latest_scene,
            assets=self.store.list_assets(loop.loop_id),
            echo=echo,
        )

    def _maybe_generate_image(
        self, options: RuntimeOptions, loop: LoopState, scene: Scene, player_id: str
    ) -> VisualGenerationResult | None:
        if not options.with_image:
            return None
        # FLUX is heavy, so only spend it on key beats (connect, climax, phase shifts,
        # periodic refresh) instead of every turn — keeps the async queue drainable and
        # the synchronous fallback from blocking every single turn.
        if not options.image_every_turn and not _is_key_beat(loop, scene):
            return None
        overrides = {
            "enabled": True,
            "width": options.image_width,
            "height": options.image_height,
            "steps": options.image_steps,
            "scenario_id": options.scenario_id,
        }

        # Async path: enqueue a job only if a live worker is present; this keeps text
        # play non-blocking while degrading gracefully when no worker is running.
        if options.visual_async:
            queue = VisualJobQueue()
            if queue.worker_alive():
                # Avoid piling jobs up: skip if one is already in flight for this loop.
                in_flight = any(
                    asset.status in {"pending", "processing"}
                    for asset in self.store.list_assets(loop.loop_id)
                )
                if in_flight:
                    return None
                service = VisualService(store=self.store)
                return service.enqueue_for_scene(
                    scene,
                    player_id=player_id,
                    queue=queue,
                    storage_kind=options.image_storage,
                    request_overrides=overrides,
                )

        storage = (
            MinIOStorageAdapter()
            if options.image_storage == "minio"
            else FilesystemStorageAdapter()
        )
        service = VisualService(storage=storage, store=self.store)
        return service.generate_for_scene(
            scene,
            player_id=player_id,
            request_overrides=overrides,
        )

    def _require_player(self, player_id: str) -> PlayerProfile:
        player = self.store.get_player(player_id)
        if player is None:
            raise RuntimeError(f"player not found: {player_id}")
        return player

    def _require_loop(self, loop_id: str) -> LoopState:
        loop = self.store.get_loop(loop_id)
        if loop is None:
            raise RuntimeError(f"loop not found: {loop_id}")
        return loop


def _is_key_beat(loop: LoopState, scene: Scene) -> bool:
    """Whether this scene warrants a (costly) representative image.

    Key beats: the opening connect, act/phase shifts, climactic tension/low stability,
    and a periodic refresh so the picture doesn't go stale during long calm stretches.
    """
    if scene.turn_index == 0:
        return True
    if loop.phase in {LoopPhase.REWRITE, LoopPhase.ARCHIVE, LoopPhase.ENDED}:
        return True
    if loop.tension >= 70 or loop.stability <= 30:
        return True
    return scene.turn_index % 3 == 0


def _resolve_action(scene: Scene, choice_id: str | None, action: str | None) -> str:
    if action:
        return action
    if not choice_id:
        raise RuntimeError("choice_id or action is required")
    for choice in scene.choices:
        if choice.choice_id == choice_id:
            return choice.label
    raise RuntimeError(f"choice not found: {choice_id}")


def _echoes_from_memories(memories: list[PlayerMemory]) -> list[Echo]:
    echoes: list[Echo] = []
    for memory in memories:
        if memory.kind != "echo":
            continue
        content = memory.content
        try:
            echoes.append(
                Echo(
                    echo_id=str(content["echo_id"]),
                    source_loop_id=str(content["source_loop_id"]),
                    source_event_id=str(content["source_event_id"]),
                    symbol=str(content["symbol"]),
                    text=str(content["text"]),
                    weight=float(content.get("weight", memory.weight)),
                )
            )
        except KeyError:
            continue
    return echoes


def _save_echo_memory(store: MythOSStore, player_id: str, echo: Echo) -> PlayerMemory:
    now = utc_now()
    memory = PlayerMemory(
        memory_id=new_memory_id(),
        player_id=player_id,
        kind="echo",
        content={
            "echo_id": echo.echo_id,
            "source_loop_id": echo.source_loop_id,
            "source_event_id": echo.source_event_id,
            "symbol": echo.symbol,
            "text": echo.text,
            "weight": echo.weight,
        },
        weight=echo.weight,
        created_at=now,
        updated_at=now,
    )
    store.save_player_memory(memory)
    return memory


def _world_memory_from_archive(loop: LoopState, scene: Scene) -> WorldMemory:
    now = utc_now()
    return WorldMemory(
        memory_id=new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="loop_archive",
        content={
            "loop_id": loop.loop_id,
            "player_id": loop.player_id,
            "final_title": scene.title,
            "final_location": scene.location,
            "phase": loop.phase.value,
            "stability": loop.stability,
            "tension": loop.tension,
        },
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def _has_archive_world_memory(memories: list[WorldMemory], loop_id: str, player_id: str) -> bool:
    for memory in memories:
        content = memory.content
        if (
            memory.kind == "loop_archive"
            and isinstance(content, dict)
            and content.get("loop_id") == loop_id
            and content.get("player_id") == player_id
        ):
            return True
    return False


def _has_narrative_shard(shards: list[NarrativeShard], loop_id: str) -> bool:
    return any(shard.loop_id == loop_id for shard in shards)


def _player_rollup(world_memories: list[WorldMemory], player_id: str | None) -> dict | None:
    for memory in world_memories:
        content = memory.content
        if (
            memory.kind == "archive_rollup"
            and isinstance(content, dict)
            and (player_id is None or content.get("player_id") == player_id)
        ):
            return content
    return None


def _archives_to_compact(
    active_archives: list[WorldMemory], retention: int = ARCHIVE_RETENTION
) -> list[WorldMemory]:
    """Return the oldest archives beyond the retention window, oldest first."""
    ordered = sorted(active_archives, key=lambda memory: memory.created_at)
    if len(ordered) <= retention:
        return []
    return ordered[: len(ordered) - retention]


def _merge_archive_rollup(
    existing: dict | None,
    absorbed: list[WorldMemory],
    shards_by_loop: dict[str, NarrativeShard],
    player_id: str,
) -> dict:
    loop_count = int(existing.get("loop_count", 0)) if existing else 0
    sum_stability = float(existing.get("avg_stability", 0.0)) * loop_count if existing else 0.0
    sum_tension = float(existing.get("avg_tension", 0.0)) * loop_count if existing else 0.0
    phase_histogram = dict(existing.get("phase_histogram", {})) if existing else {}
    tone_histogram = dict(existing.get("tone_histogram", {})) if existing else {}
    symbol_histogram = dict(existing.get("symbol_histogram", {})) if existing else {}
    window = (
        dict(existing.get("window", {}))
        if existing and isinstance(existing.get("window"), dict)
        else {}
    )

    created_times: list[str] = []
    if window:
        t1 = window.get("first_created_at")
        t2 = window.get("last_created_at")
        if isinstance(t1, str):
            created_times.append(t1)
        if isinstance(t2, str):
            created_times.append(t2)

    for memory in absorbed:
        content = memory.content if isinstance(memory.content, dict) else {}
        stability = content.get("stability")
        tension = content.get("tension")
        loop_id = content.get("loop_id")
        if isinstance(stability, int) and isinstance(tension, int):
            sum_stability += stability
            sum_tension += tension
            loop_count += 1
        phase = content.get("phase")
        if phase and isinstance(phase, str):
            phase_histogram[phase] = phase_histogram.get(phase, 0) + 1
        shard = shards_by_loop.get(loop_id) if isinstance(loop_id, str) else None
        if shard is not None:
            if shard.emotional_tone:
                tone_histogram[shard.emotional_tone] = (
                    tone_histogram.get(shard.emotional_tone, 0) + 1
                )
            if shard.symbol:
                symbol_histogram[shard.symbol] = symbol_histogram.get(shard.symbol, 0) + 1
        created_times.append(memory.created_at.isoformat())

    avg_stability = round(sum_stability / loop_count, 2) if loop_count else 0.0
    avg_tension = round(sum_tension / loop_count, 2) if loop_count else 0.0
    if created_times:
        window = {
            "first_created_at": min(created_times),
            "last_created_at": max(created_times),
        }
    return {
        "player_id": player_id,
        "loop_count": loop_count,
        "avg_stability": avg_stability,
        "avg_tension": avg_tension,
        "phase_histogram": phase_histogram,
        "tone_histogram": tone_histogram,
        "symbol_histogram": symbol_histogram,
        "window": window,
    }


def _compact_player_archives(
    store: MythOSStore, player_id: str, retention: int = ARCHIVE_RETENTION
) -> None:
    world_memories = store.list_world_memories(MYTHOS_WORLD_ID)
    active_archives = [
        memory
        for memory in world_memories
        if memory.kind == "loop_archive"
        and isinstance(memory.content, dict)
        and memory.content.get("player_id") == player_id
    ]
    absorbed = _archives_to_compact(active_archives, retention)
    if not absorbed:
        return

    existing_rollup = next(
        (
            memory
            for memory in world_memories
            if memory.kind == "archive_rollup"
            and isinstance(memory.content, dict)
            and memory.content.get("player_id") == player_id
        ),
        None,
    )
    shards = store.list_narrative_shards(player_id, limit=1000)
    shards_by_loop = {shard.loop_id: shard for shard in shards}
    content = _merge_archive_rollup(
        existing_rollup.content if existing_rollup else None,
        absorbed,
        shards_by_loop,
        player_id,
    )
    now = utc_now()
    rollup = WorldMemory(
        memory_id=existing_rollup.memory_id if existing_rollup else new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="archive_rollup",
        content=content,
        weight=1.0,
        created_at=existing_rollup.created_at if existing_rollup else now,
        updated_at=now,
    )
    with store.transaction():
        store.save_world_memory(rollup)
        for memory in absorbed:
            store.save_world_memory(replace(memory, kind="archive_compacted", updated_at=now))


@dataclass(frozen=True)
class InitialLoopScores:
    stability: int
    tension: int
    state: dict


def _initial_loop_scores(
    world_memories: list[WorldMemory], player_id: str | None = None
) -> InitialLoopScores:
    base_stability = 70
    base_tension = 20
    archives = []
    for memory in world_memories[-8:]:
        if memory.kind == "loop_archive" and isinstance(memory.content, dict):
            if player_id is None or memory.content.get("player_id") == player_id:
                archives.append(memory.content)

    score_pairs = []
    for content in archives:
        s = content.get("stability")
        t = content.get("tension")
        if isinstance(s, int) and isinstance(t, int):
            score_pairs.append((s, t))

    rollup = _player_rollup(world_memories, player_id)
    if not score_pairs and rollup is None:
        return InitialLoopScores(
            stability=base_stability,
            tension=base_tension,
            state={},
        )

    recent_pairs = score_pairs[-5:]
    reasons: list[str] = []
    weight = len(recent_pairs)
    sum_stability: float = sum(pair[0] for pair in recent_pairs)
    sum_tension: float = sum(pair[1] for pair in recent_pairs)
    rollup_count = 0
    if rollup is not None:
        rollup_count = int(rollup.get("loop_count", 0))
        rollup_weight = min(rollup_count, 10)
        if rollup_weight > 0:
            sum_stability += float(rollup.get("avg_stability", base_stability)) * rollup_weight
            sum_tension += float(rollup.get("avg_tension", base_tension)) * rollup_weight
            weight += rollup_weight
            reasons.append("rollup_trend")
    if weight == 0:
        return InitialLoopScores(
            stability=base_stability,
            tension=base_tension,
            state={},
        )

    avg_stability = sum_stability / weight
    avg_tension = sum_tension / weight
    stability_delta = 0
    tension_delta = 0

    if avg_tension >= 70:
        stability_delta -= 5
        tension_delta += 8
        reasons.append("recent_archives_high_tension")
    elif avg_tension <= 25:
        tension_delta -= 3
        reasons.append("recent_archives_low_tension")

    if avg_stability <= 35:
        stability_delta -= 8
        tension_delta += 5
        reasons.append("recent_archives_low_stability")
    elif avg_stability >= 78:
        stability_delta += 4
        reasons.append("recent_archives_high_stability")

    archive_pressure = min(4, max(0, len(score_pairs) + rollup_count - 1))
    if archive_pressure:
        tension_delta += archive_pressure
        reasons.append("archive_pressure")

    stability = _clamp_score(base_stability + stability_delta)
    tension = _clamp_score(base_tension + tension_delta)
    state = {}
    if stability != base_stability or tension != base_tension:
        adjustment = {
            "stability_delta": stability - base_stability,
            "tension_delta": tension - base_tension,
            "sample_size": len(recent_pairs),
            "avg_stability": round(avg_stability, 2),
            "avg_tension": round(avg_tension, 2),
            "reasons": reasons,
        }
        if rollup_count:
            adjustment["rollup_loops"] = rollup_count
        state["initial_world_memory_adjustment"] = adjustment
    return InitialLoopScores(stability=stability, tension=tension, state=state)


def _narrative_shard_from_archive(loop: LoopState, scene: Scene, echo: Echo) -> NarrativeShard:
    return NarrativeShard(
        shard_id=new_shard_id(),
        loop_id=loop.loop_id,
        player_id=loop.player_id,
        symbol=echo.symbol,
        emotional_tone=_tone_from_loop(loop),
        text=f"{scene.title}: {scene.narration[:220].rstrip()}",
        weight=echo.weight,
        created_at=utc_now(),
    )


def _latest_scenes(store: MythOSStore, loops: list[LoopState], limit: int = 6) -> list[Scene]:
    scenes: list[Scene] = []
    for loop in loops[:limit]:
        scene = store.get_latest_scene(loop.loop_id)
        if scene is not None:
            scenes.append(scene)
    return scenes


def _append_story_beat_notes(
    notes: list[str],
    beats: list[dict[str, Any]],
    current_phase: LoopPhase,
) -> None:
    if not beats:
        return

    # Find beat matching current phase
    current = next((b for b in beats if b.get("phase") == current_phase.value), None)
    if current is None:
        return

    notes.append(
        "STORY_BEAT_RULE: Develop this beat deeply. A single beat should last multiple turns. "
        "Do NOT rush to the next phase. Explore the environment and characters. "
        "Use 'requested_next_phase' only when this part of the story is fully concluded."
    )
    notes.append(f"CURRENT_BEAT: {_compact_story_beat(current)}")


def _compact_story_beat(beat: dict[str, Any]) -> str:
    parts = [
        f"event={beat.get('event')}",
        f"trigger={beat.get('world_trigger')}",
        f"pressure={beat.get('pressure')}",
        f"hook={beat.get('player_hook')}",
        f"objective={beat.get('objective')}",
        f"reveal={beat.get('required_reveal')}",
        f"npcs={', '.join(beat.get('suggested_npcs', []))}",
        f"do={beat.get('do')}",
        f"dont={beat.get('dont')}",
    ]
    return " | ".join(part for part in parts if not part.endswith("=None"))


def _append_script_examples(notes: list[str], examples: list[dict[str, Any]]) -> None:
    if not examples:
        return

    notes.append(
        "SCRIPT_STYLE_GUIDE: Use the following few-shot examples for tone and quality reference."
    )
    for ex in examples:
        notes.append(f"EXAMPLE_{ex.get('type', 'generic').upper()}: {ex.get('text')}")


def _tone_from_loop(loop: LoopState) -> str:
    if loop.tension >= 70:
        return "volatile"
    if loop.stability <= 35:
        return "fragile"
    if loop.phase is LoopPhase.ENDED:
        return "resolved"
    return "uncertain"


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))


def _symbol_from_scene(scene: Scene) -> str:
    return next(
        (word.strip(".,:;!?").lower() for word in scene.title.split() if word.strip()),
        "echo",
    )


def _format_errors(errors: list) -> str:
    return "; ".join(f"{error.code}: {error.message}" for error in errors)

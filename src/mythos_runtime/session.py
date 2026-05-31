from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING, Any

from mythos_combat import PlayerAction, render_radar
from mythos_core import (
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
    new_scene_id,
    new_shard_id,
)
from mythos_core.clock import utc_now
from mythos_core.models import to_json_dict
from mythos_loop import LoopEngine, create_player_event, create_world_event
from mythos_memory import MythOSStore
from mythos_narrative import NarrativeDirector, NarrativeStreamEvent, ScenePayload
from mythos_narrative.codex import CodexService
from mythos_narrative.variation import NoveltyController
from mythos_runtime.audio_service import AudioService
from mythos_runtime.combat_service import CombatService, CombatTurnResult
from mythos_runtime.encounter_map import mark_encounter_resolved, tick_encounter_map
from mythos_runtime.observability import get_logger, span
from mythos_runtime.options import (
    MemoryOverview,
    RuntimeOptions,
    RuntimeSnapshot,
    RuntimeStreamEvent,
)
from mythos_runtime.progression import determine_autonomy_level
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import apply_archetype_traits, build_runtime_narrative_context
from mythos_runtime.visual_orchestration import maybe_generate_scene_image

if TYPE_CHECKING:
    from mythos_runtime.visual_service import VisualGenerationResult

MYTHOS_WORLD_ID = "mythos-local"

# Per-player active `loop_archive` world memories kept verbatim; older ones are
# absorbed into a statistical `archive_rollup`. See
# docs/plans/2026-05-30-memory-summary.md.
ARCHIVE_RETENTION = 20


class RuntimeSessionService:
    def __init__(
        self,
        store: MythOSStore,
        director: NarrativeDirector | None = None,
        engine: LoopEngine | None = None,
        novelty: NoveltyController | None = None,
        codex: CodexService | None = None,
        audio: AudioService | None = None,
        combat: CombatService | None = None,
    ) -> None:
        self.store = store
        self.director = director or NarrativeDirector()
        self.engine = engine or LoopEngine()
        self.novelty = novelty or NoveltyController()
        self.codex = codex or CodexService()
        self.audio = audio or AudioService(store)
        self.combat = combat or CombatService()
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

        if actual_traits.get("archetype"):
            try:
                actual_traits = apply_archetype_traits(actual_traits, load_scenario(scenario_id))
            except Exception:
                self.logger.debug(
                    "scenario archetype traits unavailable",
                    exc_info=True,
                    extra={"player_id": player_id, "status": "skipped"},
                )

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
        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=scenario,
            turn_index=0,
            recent_events=[],
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
            fast_mode=options.fast_mode,
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
        loop_after_map, _ = self._advance_encounter_map(
            transition.loop, payload, options, scene.turn_index
        )
        transition = replace(transition, loop=loop_after_map)

        with self.store.transaction():
            self.store.save_loop(transition.loop)
            self.store.save_scene(scene)
            for event in transition.events:
                self.store.append_event(event)
            for shard in transition.discovered_shards:
                self.store.save_narrative_shard(shard)

        image_result = self._maybe_generate_image(options, transition.loop, scene, player.player_id)
        bgm_path = self.audio.get_current_bgm(transition.loop, scene)

        self.logger.info(
            "loop connected",
            extra={
                "player_id": player.player_id,
                "loop_id": transition.loop.loop_id,
                "scene_id": scene.scene_id,
                "status": "succeeded",
                "bgm": bgm_path,
            },
        )
        return RuntimeSnapshot(
            player=player,
            loop=transition.loop,
            scene=scene,
            assets=self.store.list_assets(transition.loop.loop_id),
            image_result=image_result,
            bgm_path=bgm_path,
        )

    def stream_start_loop(
        self, player_id: str, options: RuntimeOptions | None = None
    ) -> Iterator[RuntimeStreamEvent]:
        options = options or RuntimeOptions()
        player = self._require_player(player_id)
        memories = self.store.list_player_memories(player.player_id)
        loops = self.store.list_loops(player.player_id)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        narrative_shards = self.store.list_narrative_shards(player.player_id)
        novelty_signal = self.novelty.build_signal(_latest_scenes(self.store, loops))
        initial_scores = _initial_loop_scores(world_memories, player_id=player.player_id)
        scenario = load_scenario(options.scenario_id)
        loop = LoopState(
            loop_id=new_loop_id(),
            player_id=player.player_id,
            seed=create_loop_seed(
                player.player_id,
                len(loops) + 1,
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
        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=scenario,
            turn_index=0,
            recent_events=[],
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
            fast_mode=options.fast_mode,
        )
        stream = (
            self._fallback_stream_event(context)
            if options.fallback
            else self.director.stream_first_scene(context)
        )
        for event in stream:
            if event.kind == "text":
                yield RuntimeStreamEvent(kind="text", text=event.text)
                continue
            if event.scene is None or event.payload is None:
                continue
            snapshot = self._commit_scene(
                player=player,
                loop=loop,
                scene=event.scene,
                payload=event.payload,
                options=options,
                span_name="mythos.session.connect",
                log_message="loop connected",
            )
            yield RuntimeStreamEvent(kind="final", snapshot=snapshot)

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

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=scenario,
            turn_index=turn_index,
            recent_events=recent_events,
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
            player_action=resolved_action,
            fast_mode=options.fast_mode,
        )

        scene, payload = (
            self.director.fallback_scene(context)
            if options.fallback
            else self.director.generate_next_scene(context)
        )
        with span("mythos.session.choose", player_id=player.player_id, loop_id=loop.loop_id):
            transition = self.engine.apply_scene_payload(loop, scene, payload, player_event)
        if not transition.ok:
            raise RuntimeError(_format_errors(transition.errors))
        loop_after_map, triggered_combat = self._advance_encounter_map(
            transition.loop, payload, options, scene.turn_index
        )
        transition = replace(transition, loop=loop_after_map)

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
        bgm_path = self.audio.get_current_bgm(transition.loop, scene)

        self.logger.info(
            "choice applied",
            extra={
                "player_id": player.player_id,
                "loop_id": transition.loop.loop_id,
                "scene_id": scene.scene_id,
                "event_id": player_event.event_id,
                "status": "succeeded",
                "bgm": bgm_path,
            },
        )
        snapshot = RuntimeSnapshot(
            player=player,
            loop=transition.loop,
            scene=scene,
            assets=self.store.list_assets(transition.loop.loop_id),
            image_result=image_result,
            echo=transition.echo,
            bgm_path=bgm_path,
        )
        requested_combat = _requested_combat_id(payload)
        next_combat = requested_combat or triggered_combat
        if next_combat and not CombatService.is_active(transition.loop):
            return self._begin_requested_combat(player, transition.loop, next_combat, options)
        return snapshot

    def stream_choose(
        self,
        loop_id: str,
        choice_id: str | None = None,
        action: str | None = None,
        options: RuntimeOptions | None = None,
    ) -> Iterator[RuntimeStreamEvent]:
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
        scenario = load_scenario(options.scenario_id)
        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=scenario,
            turn_index=turn_index,
            recent_events=recent_events,
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
            player_action=resolved_action,
            fast_mode=options.fast_mode,
        )
        stream = (
            self._fallback_stream_event(context)
            if options.fallback
            else self.director.stream_next_scene(context)
        )
        for event in stream:
            if event.kind == "text":
                yield RuntimeStreamEvent(kind="text", text=event.text)
                continue
            if event.scene is None or event.payload is None:
                continue
            snapshot = self._commit_scene(
                player=player,
                loop=loop,
                scene=event.scene,
                payload=event.payload,
                options=options,
                span_name="mythos.session.choose",
                log_message="choice applied",
                player_event=player_event,
            )
            yield RuntimeStreamEvent(kind="final", snapshot=snapshot)

    def resume(
        self,
        loop_id: str | None = None,
        player_id: str | None = None,
        options: RuntimeOptions | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
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

        bgm_path = self.audio.get_current_bgm(loop, scene)
        combat = None
        if scene.scene_type == "combat" or CombatService.is_active(loop):
            combat = self._combat_snapshot(loop, options)
        return RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
            bgm_path=bgm_path,
            combat=combat,
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

        clues = self.store.list_narrative_shards(loop.player_id, limit=1000)
        clue_count = len([s for s in clues if s.kind == "clue"])
        new_level = 1
        try:
            scenario = load_scenario("neo-seoul")
            new_level = determine_autonomy_level(scenario.autonomy_config, clue_count)
        except Exception:
            self.logger.debug(
                "autonomy level calculation skipped",
                exc_info=True,
                extra={"player_id": player.player_id, "loop_id": loop.loop_id, "status": "skipped"},
            )

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

    def start_combat(
        self,
        loop_id: str,
        encounter_id: str,
        options: RuntimeOptions | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        player = self._require_player(loop.player_id)
        scenario = load_scenario(options.scenario_id)
        stats = player.traits.get("stats", {}) if isinstance(player.traits, dict) else {}
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None

        with span("mythos.session.combat_start", player_id=player.player_id, loop_id=loop.loop_id):
            result = self.combat.begin(
                loop,
                scenario_combat=scenario.combat,
                encounter_id=encounter_id,
                player_name=player.display_name,
                player_stats={k: int(v) for k, v in stats.items() if isinstance(v, int | float)},
                archetype=archetype,
        )
        return self._commit_combat_turn(player, result, "combat started", options)

    def _advance_encounter_map(
        self,
        loop: LoopState,
        payload: ScenePayload,
        options: RuntimeOptions,
        turn_index: int,
    ) -> tuple[LoopState, str | None]:
        if CombatService.is_active(loop):
            return loop, None
        scenario = load_scenario(options.scenario_id)
        pending = loop.state.get("_pending_spawn_encounters", [])
        requested = [
            encounter_id
            for encounter_id in [*payload.world_delta.spawn_encounters, *pending]
            if isinstance(encounter_id, str)
        ]
        state, triggered = tick_encounter_map(
            loop.state,
            combat_pool=scenario.combat,
            seed=loop.seed,
            turn_index=turn_index,
            requested=requested,
        )
        state.pop("_pending_spawn_encounters", None)
        return replace(loop, state=state), triggered

    def combat_action(
        self,
        loop_id: str,
        action: PlayerAction,
        options: RuntimeOptions | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        if not CombatService.is_active(loop):
            raise RuntimeError(f"loop_id={loop.loop_id} has no active combat")
        player = self._require_player(loop.player_id)
        scenario = load_scenario(options.scenario_id)
        with span("mythos.session.combat_action", player_id=player.player_id, loop_id=loop.loop_id):
            result = self.combat.act(loop, action, scenario_combat=scenario.combat)
        return self._commit_combat_turn(player, result, "combat action applied", options)

    def _commit_combat_turn(
        self,
        player: PlayerProfile,
        result: CombatTurnResult,
        log_message: str,
        options: RuntimeOptions,
    ) -> RuntimeSnapshot:
        loop = result.loop
        previous_scene = self.store.get_latest_scene(loop.loop_id)
        turn_index = (previous_scene.turn_index + 1) if previous_scene else 0
        radar = result.radar
        encounter_id = radar.get("encounter_id") if isinstance(radar, dict) else None
        scene = Scene(
            scene_id=new_scene_id(),
            loop_id=loop.loop_id,
            turn_index=turn_index,
            title=f"교전 R{result.radar.get('round', 1)}",
            location=str(encounter_id or loop.location_id),
            narration=result.prose or "전투가 이어진다.",
            choices=[],
            visual_brief=_combat_visual_brief(result.radar),
            created_at=utc_now(),
            objective="적대 신호를 제압하거나 이탈하라.",
            action_result=result.outcome,
            scene_type="combat",
        )

        echo: Echo | None = None
        if result.finished:
            loop = self._apply_combat_rewards(loop, result)
            if result.outcome == "player_defeat":
                loop, echo = self._combat_permadeath(loop, scene)

        with self.store.transaction():
            self.store.save_loop(loop)
            self.store.save_scene(scene)
            if echo is not None:
                _save_echo_memory(self.store, loop.player_id, echo)

        image_result = self._maybe_generate_image(options, loop, scene, player.player_id)
        bgm_path = self.audio.get_current_bgm(loop, scene)
        self.logger.info(
            log_message,
            extra={
                "player_id": player.player_id,
                "loop_id": loop.loop_id,
                "scene_id": scene.scene_id,
                "status": "succeeded",
                "combat_finished": result.finished,
                "combat_outcome": result.outcome,
            },
        )
        return RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
            image_result=image_result,
            echo=echo,
            bgm_path=bgm_path,
            combat={
                "radar": result.radar,
                "available": result.available,
                "finished": result.finished,
                "outcome": result.outcome,
                "rewards": result.rewards,
                "summary": _combat_summary(result),
            },
        )

    def _begin_requested_combat(
        self,
        player: PlayerProfile,
        loop: LoopState,
        encounter_id: str,
        options: RuntimeOptions,
    ) -> RuntimeSnapshot:
        scenario = load_scenario(options.scenario_id)
        encounters = scenario.combat.get("encounters", {}) if isinstance(scenario.combat, dict) else {}
        if encounter_id not in encounters:
            raise RuntimeError(f"unknown combat encounter requested: {encounter_id}")
        stats = player.traits.get("stats", {}) if isinstance(player.traits, dict) else {}
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None
        result = self.combat.begin(
            loop,
            scenario_combat=scenario.combat,
            encounter_id=encounter_id,
            player_name=player.display_name,
            player_stats={k: int(v) for k, v in stats.items() if isinstance(v, int | float)},
            archetype=archetype,
        )
        return self._commit_combat_turn(player, result, "combat triggered by scene", options)

    def _combat_snapshot(
        self, loop: LoopState, options: RuntimeOptions
    ) -> dict[str, Any] | None:
        state = CombatService.load_state(loop)
        if state is None:
            return None
        scenario = load_scenario(options.scenario_id)
        available = self.combat.engine.available_actions(state) if state.active else {}
        rewards: dict[str, Any] = {}
        if not state.active and state.outcome:
            encounter = scenario.combat.get("encounters", {}).get(state.encounter_id, {})
            rewards = {"outcome": state.outcome, "encounter_reward": encounter.get("reward", {})}
        return {
            "radar": render_radar(state),
            "available": available,
            "finished": not state.active,
            "outcome": state.outcome,
            "rewards": rewards,
            "summary": _combat_summary_from_state(state),
        }

    def _apply_combat_rewards(self, loop: LoopState, result: CombatTurnResult) -> LoopState:
        reward = result.rewards.get("encounter_reward", {}) if isinstance(result.rewards, dict) else {}
        if not isinstance(reward, dict):
            return loop
        encounter_id = result.radar.get("encounter_id") if isinstance(result.radar, dict) else None
        loop = replace(loop, state=mark_encounter_resolved(loop.state, str(encounter_id) if encounter_id else None))
        stability = _clamp_score(loop.stability + int(reward.get("stability", 0)))
        tension = _clamp_score(loop.tension + int(reward.get("tension", 0)))
        if stability == loop.stability and tension == loop.tension:
            return loop
        return replace(loop, stability=stability, tension=tension)

    def _combat_permadeath(self, loop: LoopState, scene: Scene) -> tuple[LoopState, Echo]:
        event = create_world_event(
            loop.loop_id,
            scene.turn_index + 1,
            "combat_defeat",
            "Connector signal lost in combat.",
            {"phase": "ended"},
        )
        echo = Echo(
            echo_id=f"echo_{event.event_id.removeprefix('event_')}",
            source_loop_id=loop.loop_id,
            source_event_id=event.event_id,
            symbol="fallen",
            text=f"{scene.title}: 신호 소실",
        )
        ended = replace(
            loop,
            phase=LoopPhase.ENDED,
            ended_at=utc_now(),
            active_echoes=[*loop.active_echoes, echo],
        )
        self.store.append_event(event)
        return ended, echo

    def _maybe_generate_image(
        self, options: RuntimeOptions, loop: LoopState, scene: Scene, player_id: str
    ) -> VisualGenerationResult | None:
        return maybe_generate_scene_image(
            store=self.store,
            options=options,
            loop=loop,
            scene=scene,
            player_id=player_id,
        )

    def _commit_scene(
        self,
        *,
        player: PlayerProfile,
        loop: LoopState,
        scene: Scene,
        payload: ScenePayload,
        options: RuntimeOptions,
        span_name: str,
        log_message: str,
        player_event=None,
    ) -> RuntimeSnapshot:
        with span(span_name, player_id=player.player_id, loop_id=loop.loop_id):
            transition = self.engine.apply_scene_payload(loop, scene, payload, player_event)
        if not transition.ok:
            raise RuntimeError(_format_errors(transition.errors))
        loop_after_map, triggered_combat = self._advance_encounter_map(
            transition.loop, payload, options, scene.turn_index
        )
        transition = replace(transition, loop=loop_after_map)

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
        bgm_path = self.audio.get_current_bgm(transition.loop, scene)
        extra = {
            "player_id": player.player_id,
            "loop_id": transition.loop.loop_id,
            "scene_id": scene.scene_id,
            "status": "succeeded",
            "bgm": bgm_path,
        }
        if player_event is not None:
            extra["event_id"] = player_event.event_id
        self.logger.info(log_message, extra=extra)
        snapshot = RuntimeSnapshot(
            player=player,
            loop=transition.loop,
            scene=scene,
            assets=self.store.list_assets(transition.loop.loop_id),
            image_result=image_result,
            echo=transition.echo,
            bgm_path=bgm_path,
        )
        requested_combat = _requested_combat_id(payload)
        next_combat = requested_combat or triggered_combat
        if next_combat and not CombatService.is_active(transition.loop):
            return self._begin_requested_combat(player, transition.loop, next_combat, options)
        return snapshot

    def _fallback_stream_event(self, context) -> Iterator[NarrativeStreamEvent]:
        scene, payload = self.director.fallback_scene(context)
        yield NarrativeStreamEvent(kind="text", text=payload.narration)
        yield NarrativeStreamEvent(kind="final", scene=scene, payload=payload)

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


def _combat_summary(result: CombatTurnResult) -> dict[str, Any]:
    state = CombatService.load_state(result.loop)
    if state is None:
        return {}
    return _combat_summary_from_state(state)


def _combat_summary_from_state(state) -> dict[str, Any]:
    damage_dealt = 0
    damage_taken = 0
    hits = 0
    misses = 0
    crits = 0
    moves = 0
    defeated: list[str] = []
    for entry in state.log:
        actor = state.by_id(entry.actor)
        target_id = str(entry.detail.get("target", ""))
        target = state.by_id(target_id) if target_id else None
        damage = int(entry.detail.get("damage", 0) or 0)
        if entry.action in {"hit", "defeat"}:
            hits += 1
            if bool(entry.detail.get("crit", False)):
                crits += 1
            if actor is not None and target is not None:
                if actor.faction in {"player", "ally"} and target.faction == "enemy":
                    damage_dealt += damage
                elif actor.faction == "enemy" and target.faction in {"player", "ally"}:
                    damage_taken += damage
        elif entry.action == "miss":
            misses += 1
        elif entry.action == "move":
            moves += 1
        if entry.action == "defeat" and target is not None:
            defeated.append(target.name)

    player = state.player()
    living_enemies = len(state.living_enemies())
    return {
        "rounds": state.round,
        "turns": len([entry for entry in state.log if entry.action not in {"start", "end"}]),
        "damage_dealt": damage_dealt,
        "damage_taken": damage_taken,
        "hits": hits,
        "misses": misses,
        "crits": crits,
        "moves": moves,
        "defeated": defeated,
        "living_enemies": living_enemies,
        "player_hp": player.hp if player else 0,
        "player_max_hp": player.max_hp if player else 0,
    }


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


def _requested_combat_id(payload: ScenePayload) -> str | None:
    encounter_id = payload.world_delta.start_combat
    if encounter_id and encounter_id.strip():
        return encounter_id.strip()
    for flag in payload.world_delta.flags:
        if flag.startswith("start_combat:"):
            return flag.split(":", 1)[1].strip() or None
    return None


def _combat_visual_brief(radar: dict[str, Any]) -> str:
    blips = radar.get("blips", []) if isinstance(radar, dict) else []
    enemies = [
        str(blip.get("name", "enemy"))
        for blip in blips
        if isinstance(blip, dict) and blip.get("faction") == "enemy" and blip.get("alive", True)
    ]
    enemy_text = ", ".join(enemies[:3]) if enemies else "hostile signals"
    return (
        "Cinematic cyberpunk tactical combat scene in Neo-Seoul, "
        f"player signal facing {enemy_text}, neon rain, ARK surveillance grid, "
        "dynamic action, sharp readable silhouettes."
    )


def _symbol_from_scene(scene: Scene) -> str:
    return next(
        (word.strip(".,:;!?").lower() for word in scene.title.split() if word.strip()),
        "echo",
    )


def _format_errors(errors: list) -> str:
    return "; ".join(f"{error.code}: {error.message}" for error in errors)

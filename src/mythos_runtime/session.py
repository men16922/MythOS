from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING, Any

from mythos_combat import PlayerAction, render_radar, serialize_combat_log
from mythos_core import (
    Choice,
    Echo,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldEvent,
    WorldMemory,
    create_loop_seed,
    new_loop_id,
    new_memory_id,
    new_player_id,
    new_scene_id,
)
from mythos_core.clock import utc_now
from mythos_core.models import to_json_dict
from mythos_loop import LoopEngine, create_player_event, create_world_event
from mythos_memory import MythOSStore
from mythos_narrative import NarrativeContext, NarrativeDirector, NarrativeStreamEvent, ScenePayload
from mythos_narrative.codex import CodexService
from mythos_narrative.variation import NoveltyController
from mythos_runtime.audio_service import AudioService
from mythos_runtime.combat_service import CombatService, CombatTurnResult
from mythos_runtime.combat_session_helpers import (
    _combat_defeat_fallback_ending,
    _combat_summary,
    _combat_summary_from_state,
    _combat_visual_brief,
    _encounter_meta,
    _requested_combat_id,
)
from mythos_runtime.constants import (
    COMBAT_COOLDOWN_PRESSURE_TENSION,
    COMBAT_COOLDOWN_SCENES,
    COMBAT_RISK_CAP_BY_COUNT,
    COMBAT_SOFT_DEFEAT_HEAL_FRAC,
    COMBAT_SOFT_DEFEAT_STABILITY_LOSS,
    COMBAT_SOFT_DEFEAT_TENSION_GAIN,
    MYTHOS_WORLD_ID,
)
from mythos_runtime.encounter_map import (
    mark_encounter_alerted,
    mark_encounter_resolved,
    tick_encounter_map,
)
from mythos_runtime.ending_resolver import EndingResolver
from mythos_runtime.loop_scoring import (
    _clamp_score,
    _initial_loop_scores,
    _latest_scenes,
    _narrative_shard_from_archive,
)
from mythos_runtime.narrative_metrics import (
    director_metric_total as _director_metric_total,
)
from mythos_runtime.narrative_metrics import (
    save_narrative_metric_memory as _save_narrative_metric_memory,
)
from mythos_runtime.narrative_rollup import (
    _compact_player_archives,
    _prepare_narrative_memory_context,
)
from mythos_runtime.observability import get_logger, span
from mythos_runtime.options import (
    MemoryOverview,
    RunSummary,
    RuntimeOptions,
    RuntimeSnapshot,
    RuntimeStreamEvent,
    SaveSlot,
)
from mythos_runtime.progression import (
    MetaProgression,
    ProgressionService,
    _run_summary_from_memory,
    _run_summary_memory_from_archive,
    _world_memory_from_archive,
    apply_meta_progression_to_state,
    determine_autonomy_level,
    evaluate_meta_progression,
    load_progression,
    meta_progression_to_content,
    persist_progression,
    traits_with_meta_progression,
)
from mythos_runtime.route_growth import extend_route
from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map, build_route_seed
from mythos_runtime.route_runtime import (
    advance_route,
    junction_options,
    node_encounter_id,
    route_status,
)
from mythos_runtime.save_load import SaveLoadService
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import apply_archetype_traits, build_runtime_narrative_context
from mythos_runtime.session_memory import record_beat
from mythos_runtime.visual_orchestration import maybe_generate_scene_image

ROUTE_CHOICE_PREFIX = "route:"

if TYPE_CHECKING:
    from mythos_runtime.visual_service import VisualGenerationResult


@dataclass(frozen=True)
class _PreparedStartLoop:
    player: PlayerProfile
    loop: LoopState
    context: NarrativeContext


@dataclass(frozen=True)
class _PreparedChoice:
    player: PlayerProfile
    loop: LoopState
    impact_base_loop: LoopState
    context: NarrativeContext
    player_event: WorldEvent


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
        self.save_load = SaveLoadService(store)
        self.progression = ProgressionService(store)
        self.logger = get_logger("mythos.session")

    def _get_cache(self):
        if not hasattr(self, "_session_cache"):
            from mythos_runtime.visual_queue import SessionCache
            self._session_cache = SessionCache()
        return self._session_cache

    def _is_test_env(self) -> bool:
        import os
        import sys

        return (
            "unittest" in sys.modules
            or "pytest" in sys.modules
            or os.getenv("MYTHOS_ENV") == "test"
        )

    def _get_cached_snapshot(self, loop_id: str) -> RuntimeSnapshot | None:
        if self._is_test_env():
            return None
        cache = self._get_cache()
        if cache and cache.is_available():
            try:
                data = cache.get_snapshot(loop_id)
                if data:
                    from mythos_core.models import from_json_dict
                    return from_json_dict(RuntimeSnapshot, data)
            except Exception as exc:
                self.logger.warning("failed to decode cached snapshot", exc_info=exc)
        return None

    def _set_cached_snapshot(self, loop_id: str, snapshot: RuntimeSnapshot) -> None:
        if self._is_test_env():
            return
        cache = self._get_cache()
        if cache and cache.is_available():
            try:
                from mythos_core.models import to_json_dict
                data = to_json_dict(snapshot)
                if "image_result" in data:
                    data["image_result"] = None
                cache.set_snapshot(loop_id, data)
            except Exception as exc:
                self.logger.warning("failed to write snapshot cache", exc_info=exc)

    def _delete_cached_snapshot(self, loop_id: str) -> None:
        if self._is_test_env():
            return
        cache = self._get_cache()
        if cache and cache.is_available():
            try:
                cache.delete_snapshot(loop_id)
            except Exception:
                pass

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

    def _prepare_start_loop(self, player_id: str, options: RuntimeOptions) -> _PreparedStartLoop:
        player = self._require_player(player_id)
        memories = self.store.list_player_memories(player.player_id)
        loops = self.store.list_loops(player.player_id)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        narrative_shards = self.store.list_narrative_shards(player.player_id, limit=1000)
        novelty_signal = self.novelty.build_signal(_latest_scenes(self.store, loops))
        initial_scores = _initial_loop_scores(world_memories, player_id=player.player_id)
        scenario = load_scenario(options.scenario_id)
        meta_progression = load_progression(self.store, player.player_id, options.scenario_id)

        stats = player.traits.get("stats", {}) if isinstance(player.traits, dict) else {}
        max_hp = 10 + int(stats.get("strength", 5))

        initial_state = apply_meta_progression_to_state(
            {**initial_scores.state, "scenario_id": options.scenario_id},
            meta_progression,
            scenario.combat,
        )
        party = dict(initial_state.get("_party", {}))
        party.setdefault("player_hp", max_hp)
        party.setdefault("player_max_hp", max_hp)
        initial_state["_party"] = party

        loop_seed = create_loop_seed(
            player.player_id,
            len(loops) + 1,
            {"memories": [memory.content for memory in memories]},
        )
        # Generate this loop's operation map. Two modes:
        #  - dynamic (`route_map.mode == "dynamic"`): seed only the backbone
        #    (anchors + first horizon layers); `extend_route` grows it as the
        #    player advances, and the LLM may propose nodes. Not seed-reproducible.
        #  - static (default/legacy): the full deterministic DAG is pre-built.
        # Scenarios without a route_map config fall back to the legacy `_map`.
        route_cfg = scenario.route_map if isinstance(scenario.route_map, dict) else None
        if isinstance(route_cfg, dict) and route_cfg.get("mode") == "dynamic":
            route_map = build_route_seed(route_cfg, loop_seed)
        else:
            route_map = build_route_map(route_cfg, loop_seed)
        if route_map is not None:
            initial_state[ROUTE_MAP_KEY] = route_map

        loop = LoopState(
            loop_id=new_loop_id(),
            player_id=player.player_id,
            seed=loop_seed,
            phase=LoopPhase.CONNECT,
            location_id=scenario.starting_location,
            stability=initial_scores.stability,
            tension=initial_scores.tension,
            started_at=utc_now(),
            state=initial_state,
            active_echoes=_echoes_from_memories(memories),
        )
        memories, narrative_shards = _prepare_narrative_memory_context(
            self.store,
            self.director,
            player.player_id,
            memories,
            narrative_shards,
            turn_index=0,
            use_llm=not (options.fallback or options.fast_mode),
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
        return _PreparedStartLoop(player=player, loop=loop, context=context)

    def start_loop(self, player_id: str, options: RuntimeOptions | None = None) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        prepared = self._prepare_start_loop(player_id, options)
        player = prepared.player
        loop = prepared.loop
        context = prepared.context

        metric_total_before = _director_metric_total(self.director)
        scene, payload = (
            self.director.fallback_scene(context)
            if options.fallback
            else self.director.generate_first_scene(context)
        )
        return self._commit_scene(
            player=player,
            loop=loop,
            scene=scene,
            payload=payload,
            options=options,
            span_name="mythos.session.connect",
            log_message="loop connected",
            metric_total_before=metric_total_before,
        )

    def stream_start_loop(
        self, player_id: str, options: RuntimeOptions | None = None
    ) -> Iterator[RuntimeStreamEvent]:
        options = options or RuntimeOptions()
        prepared = self._prepare_start_loop(player_id, options)
        player = prepared.player
        loop = prepared.loop
        context = prepared.context
        metric_total_before = _director_metric_total(self.director)
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
                metric_total_before=metric_total_before,
            )
            yield RuntimeStreamEvent(kind="final", snapshot=snapshot)

    def _prepare_choice(
        self,
        loop_id: str,
        choice_id: str | None,
        action: str | None,
        options: RuntimeOptions,
    ) -> _PreparedChoice:
        cached = self._get_cached_snapshot(loop_id)
        if cached:
            loop = cached.loop
            player = cached.player
            latest_scene: Scene | None = cached.scene
        else:
            loop = self._require_loop(loop_id)
            if loop.phase is LoopPhase.ENDED:
                raise RuntimeError(f"loop_id={loop.loop_id} is ended")
            player = self._require_player(loop.player_id)
            latest_scene = self.store.get_latest_scene(loop.loop_id)

        if latest_scene is None:
            raise RuntimeError(f"no scene found for loop_id={loop_id}")

        resolved_action = _resolve_action(latest_scene, choice_id, action)
        impact_base_loop = loop
        loop = _apply_choice_requirements_and_cost(loop, latest_scene, choice_id)
        recent_events = self.store.list_events(loop.loop_id)
        memories = self.store.list_player_memories(player.player_id)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        narrative_shards = self.store.list_narrative_shards(player.player_id, limit=1000)
        loops = self.store.list_loops(player.player_id)
        novelty_signal = self.novelty.build_signal(
            [*_latest_scenes(self.store, loops), latest_scene]
        )
        turn_index = latest_scene.turn_index + 1
        player_event = create_player_event(loop.loop_id, turn_index, resolved_action)
        scenario = load_scenario(options.scenario_id)
        memories, narrative_shards = _prepare_narrative_memory_context(
            self.store,
            self.director,
            player.player_id,
            memories,
            narrative_shards,
            turn_index=turn_index,
            use_llm=not (options.fallback or options.fast_mode),
        )
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
        return _PreparedChoice(
            player=player,
            loop=loop,
            impact_base_loop=impact_base_loop,
            context=context,
            player_event=player_event,
        )

    def choose(
        self,
        loop_id: str,
        choice_id: str | None = None,
        action: str | None = None,
        options: RuntimeOptions | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        prepared = self._prepare_choice(loop_id, choice_id, action, options)
        player = prepared.player
        loop = prepared.loop
        impact_base_loop = prepared.impact_base_loop
        context = prepared.context
        player_event = prepared.player_event

        metric_total_before = _director_metric_total(self.director)
        scene, payload = (
            self.director.fallback_scene(context)
            if options.fallback
            else self.director.generate_next_scene(context)
        )
        return self._commit_scene(
            player=player,
            loop=loop,
            scene=scene,
            payload=payload,
            options=options,
            span_name="mythos.session.choose",
            log_message="choice applied",
            player_event=player_event,
            metric_total_before=metric_total_before,
            route_target=_route_target_from_choice(choice_id),
            impact_base_loop=impact_base_loop,
        )

    def stream_choose(
        self,
        loop_id: str,
        choice_id: str | None = None,
        action: str | None = None,
        options: RuntimeOptions | None = None,
    ) -> Iterator[RuntimeStreamEvent]:
        options = options or RuntimeOptions()
        prepared = self._prepare_choice(loop_id, choice_id, action, options)
        player = prepared.player
        loop = prepared.loop
        impact_base_loop = prepared.impact_base_loop
        context = prepared.context
        player_event = prepared.player_event
        metric_total_before = _director_metric_total(self.director)
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
                metric_total_before=metric_total_before,
                route_target=_route_target_from_choice(choice_id),
                impact_base_loop=impact_base_loop,
            )
            yield RuntimeStreamEvent(kind="final", snapshot=snapshot)

    def resume(
        self,
        loop_id: str | None = None,
        player_id: str | None = None,
        options: RuntimeOptions | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        if loop_id:
            cached = self._get_cached_snapshot(loop_id)
            if cached:
                return cached

        loop = None
        if loop_id:
            loop = self.store.get_loop(loop_id)
        elif player_id:
            # save slot phase is frozen at save time; resolve the live loop and
            # skip any that have since ENDED so player-resume picks the latest
            # *active* loop (ended loops live in run history, not the slot list).
            for slot in self.list_save_slots(player_id):
                cached = self._get_cached_snapshot(slot.loop_id)
                if cached:
                    return cached
                candidate = self.store.get_loop(slot.loop_id)
                if candidate is not None and candidate.phase is not LoopPhase.ENDED:
                    loop = candidate
                    break
            if loop is None:
                raise RuntimeError("no active loop to resume")
        else:
            raise RuntimeError("resume requires loop_id or player_id")
        if loop is None:
            raise RuntimeError("loop not found")
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError("ended loop is archived in run history, not loadable")
        player = self._require_player(loop.player_id)
        scene = self.store.get_latest_scene(loop.loop_id)
        if scene is None:
            raise RuntimeError(f"loop_id={loop.loop_id} has no scenes")

        bgm_path = self.audio.get_current_bgm(loop, scene)
        combat = None
        if scene.scene_type == "combat" or CombatService.is_active(loop):
            combat = self._combat_snapshot(loop, options)
        snapshot = RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
            bgm_path=bgm_path,
            combat=combat,
            clues_collected=self._clues_collected(player.player_id),
            epiphanies_unlocked=self._epiphanies_unlocked(player, loop),
        )
        self._set_cached_snapshot(loop.loop_id, snapshot)
        return snapshot

    def list_active_loops(self, player_id: str) -> list[LoopState]:
        self._require_player(player_id)
        return [
            loop for loop in self.store.list_loops(player_id) if loop.phase is not LoopPhase.ENDED
        ]

    def list_save_slots(self, player_id: str, limit: int = 20) -> list[SaveSlot]:
        self._require_player(player_id)
        return self.save_load.list_save_slots(player_id, limit)

    def save_slot(self, loop_id: str, label: str | None = None) -> SaveSlot:
        return self.save_load.save_slot(loop_id, label=label)

    def memory_overview(self, player_id: str, limit: int = 8) -> MemoryOverview:
        self._require_player(player_id)

        # 1. world_archives (loop_archive)
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        world_archives = [
            m
            for m in world_memories
            if m.kind == "loop_archive"
            and isinstance(m.content, dict)
            and m.content.get("player_id") == player_id
        ]
        world_archives.sort(key=lambda m: m.created_at, reverse=True)
        world_archives = world_archives[:limit]

        # 2. narrative_shards
        shards = self.store.list_narrative_shards(player_id, limit=limit)

        # 3. novelty_notes
        loops = self.store.list_loops(player_id)
        novelty_signal = self.novelty.build_signal(_latest_scenes(self.store, loops))
        novelty_notes = novelty_signal.notes

        # 4. run_summaries (run_summary)
        run_summaries = self.list_run_summaries(player_id, limit=limit)

        # 5. latest_adjustment
        latest_adjustment = None
        for lp in loops:
            if lp.phase is not LoopPhase.ENDED:
                adj = lp.state.get("initial_world_memory_adjustment")
                if adj:
                    latest_adjustment = adj
                    break
        if not latest_adjustment:
            adjustments = [m for m in world_memories if m.kind == "narrative_adjustment"]
            adjustments.sort(key=lambda m: m.created_at, reverse=True)
            latest_adjustment = adjustments[0].content if adjustments else None

        # 6. rollup
        rollups = [m for m in world_memories if m.kind == "shard_rollup"]
        rollups.sort(key=lambda m: m.created_at, reverse=True)
        rollup = rollups[0].content if rollups else None

        # 7. narrative_metrics
        player_memories = self.store.list_player_memories(player_id)
        metrics = [m for m in player_memories if m.kind == "narrative_metrics"]
        metrics.sort(key=lambda m: m.created_at, reverse=True)
        narrative_metrics = metrics[0].content if metrics else None

        # 8. meta_progression (dedicated player_progression table, memory fallback)
        # Progression is now keyed by (player, scenario); resolve the player's
        # current scenario from save slot → most-recent loop → default.
        scenario_id = "neo-seoul"
        active_slots = self.save_load.list_save_slots(player_id)
        if active_slots:
            scenario_id = active_slots[0].scenario_id
        elif loops:
            recent = max(loops, key=lambda lp: lp.started_at)
            scenario_id = str(recent.state.get("scenario_id") or scenario_id)

        progress = load_progression(self.store, player_id, scenario_id)
        meta_progression_dict = meta_progression_to_content(progress)

        # 9. unlocked_lore
        unlocked_lore = self.codex.get_unlocked_lore(shards)

        return MemoryOverview(
            world_archives=world_archives,
            narrative_shards=shards,
            novelty_notes=novelty_notes,
            run_summaries=run_summaries,
            latest_adjustment=latest_adjustment,
            rollup=rollup,
            narrative_metrics=narrative_metrics,
            meta_progression=meta_progression_dict,
            unlocked_lore=unlocked_lore,
        )

    def list_run_summaries(self, player_id: str, limit: int = 20) -> list[RunSummary]:
        self._require_player(player_id)
        return self.progression.list_run_summaries(player_id, limit)

    def skill_tree(self, player_id: str, scenario_id: str) -> dict[str, Any]:
        player = self._require_player(player_id)
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None
        return self.progression.skill_tree(player_id, scenario_id, archetype)

    def learn_skill(self, player_id: str, scenario_id: str, skill_id: str) -> dict[str, Any]:
        player = self._require_player(player_id)
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None
        return self.progression.learn_skill(player_id, scenario_id, skill_id, archetype)

    def _apply_meta_progression(
        self,
        player: PlayerProfile,
        run_summary_memory: WorldMemory,
    ) -> tuple[WorldMemory, MetaProgression, PlayerProfile]:
        scenario_id = str(run_summary_memory.content.get("scenario_id") or "neo-seoul")
        previous = load_progression(self.store, player.player_id, scenario_id)
        scenario = load_scenario(scenario_id)
        progress, unlocks = evaluate_meta_progression(
            previous,
            _run_summary_from_memory(run_summary_memory),
            scenario.combat,
            scenario.archetypes,
        )
        updated_content = dict(run_summary_memory.content)
        updated_content["unlocks_granted"] = unlocks
        updated_summary = replace(
            run_summary_memory,
            content=updated_content,
            updated_at=utc_now(),
        )
        updated_traits = traits_with_meta_progression(player.traits, progress)
        updated_player = replace(player, traits=updated_traits, updated_at=utc_now())
        return updated_summary, progress, updated_player

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
                clues_collected=self._clues_collected(player.player_id),
                epiphanies_unlocked=self._epiphanies_unlocked(player, loop),
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
        narrative_shards = self.store.list_narrative_shards(loop.player_id, limit=1000)
        clue_count = len([s for s in narrative_shards if s.kind == "clue"])
        loop_state = self._resolved_ending_state(
            loop,
            clue_count=clue_count,
            context="archive",
            combat_defeat_fallback=False,
        )

        ended_loop = replace(
            loop,
            phase=LoopPhase.ENDED,
            ended_at=utc_now(),
            active_echoes=[*loop.active_echoes, echo],
            state=loop_state,
        )
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        has_world_archive = _has_archive_world_memory(
            world_memories,
            loop_id=loop.loop_id,
            player_id=loop.player_id,
        )
        has_narrative_shard = _has_narrative_shard(
            self.store.list_narrative_shards(loop.player_id, limit=100),
            loop_id=loop.loop_id,
        )
        has_run_summary = _has_run_summary(world_memories, loop_id=loop.loop_id)
        events = [*self.store.list_events(loop.loop_id), event]
        event_dicts = [to_json_dict(e) for e in events]
        summary_text = self.director.summarize_loop(event_dicts)
        narrative_shards = self.store.list_narrative_shards(loop.player_id, limit=1000)
        run_summary_memory = _run_summary_memory_from_archive(
            ended_loop,
            latest_scene,
            events,
            narrative_shards,
            summary_text,
        )
        meta_progress: MetaProgression | None = None
        snapshot_player = player
        if not has_run_summary:
            run_summary_memory, meta_progress, snapshot_player = self._apply_meta_progression(
                player,
                run_summary_memory,
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
            if not has_run_summary:
                self.store.save_world_memory(run_summary_memory)
                if meta_progress is not None:
                    persist_progression(self.store, meta_progress)
                    self.store.create_player(snapshot_player)

        clue_count = len([s for s in narrative_shards if s.kind == "clue"])
        new_level = 1
        try:
            scenario = load_scenario(str(ended_loop.state.get("scenario_id") or "neo-seoul"))
            new_level = determine_autonomy_level(scenario.autonomy_config, clue_count)
        except Exception:
            self.logger.debug(
                "autonomy level calculation skipped",
                exc_info=True,
                extra={"player_id": player.player_id, "loop_id": loop.loop_id, "status": "skipped"},
            )

        if new_level > int(snapshot_player.traits.get("autonomy_level", 1)):
            updated_traits = dict(snapshot_player.traits)
            updated_traits["autonomy_level"] = new_level
            snapshot_player = replace(snapshot_player, traits=updated_traits, updated_at=utc_now())
            self.store.create_player(snapshot_player)
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
            player=snapshot_player,
            loop=ended_loop,
            scene=latest_scene,
            assets=self.store.list_assets(loop.loop_id),
            echo=echo,
            clues_collected=self._clues_collected(player.player_id),
            epiphanies_unlocked=self._epiphanies_unlocked(snapshot_player, ended_loop),
        )

    def _player_combat_stats(
        self, player: PlayerProfile, loop: LoopState, scenario: Any
    ) -> dict[str, int]:
        """Base player stats + equipped equipment bonuses for combat begin."""
        stats = player.traits.get("stats", {}) if isinstance(player.traits, dict) else {}
        base = {k: int(v) for k, v in stats.items() if isinstance(v, int | float)}
        items = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
        inventory = loop.state.get("_inventory", []) if isinstance(loop.state, dict) else []
        for entry in inventory:
            if not isinstance(entry, dict) or not entry.get("equipped"):
                continue
            definition = items.get(str(entry.get("id") or entry.get("item_id") or ""), {})
            bonus = definition.get("stats") if isinstance(definition, dict) else None
            if isinstance(bonus, dict):
                for stat, value in bonus.items():
                    if isinstance(value, int | float):
                        base[stat] = base.get(stat, 0) + int(value)
        return base

    def _combat_consumables(self, loop: LoopState, scenario: Any) -> list[dict[str, Any]]:
        """Usable consumable items (kind=consumable) from the loop inventory."""
        items_def = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
        inventory = loop.state.get("_inventory", []) if isinstance(loop.state, dict) else []
        counts: dict[str, int] = {}
        order: list[str] = []
        for entry in inventory:
            item_id = (
                str(entry.get("id") or entry.get("item_id") or "")
                if isinstance(entry, dict)
                else str(entry)
            )
            definition = items_def.get(item_id, {}) if isinstance(items_def, dict) else {}
            if not item_id or not isinstance(definition, dict) or definition.get("kind") != "consumable":
                continue
            if item_id not in counts:
                order.append(item_id)
            counts[item_id] = counts.get(item_id, 0) + 1
        return [
            {
                "item_id": item_id,
                "name": items_def[item_id].get("name", item_id),
                "effect": items_def[item_id].get("effect"),
                "count": counts[item_id],
            }
            for item_id in order
        ]

    def _snapshot_from_loop(
        self, player: PlayerProfile, loop: LoopState, options: RuntimeOptions | None = None
    ) -> RuntimeSnapshot:
        """Build a read-only snapshot for the loop's current scene (no advance)."""
        options = options or RuntimeOptions()
        scene = self.store.get_latest_scene(loop.loop_id)
        if scene is None:
            raise RuntimeError(f"loop_id={loop.loop_id} has no scenes")
        combat = None
        if scene.scene_type == "combat" or CombatService.is_active(loop):
            combat = self._combat_snapshot(loop, options)
        return RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
            bgm_path=self.audio.get_current_bgm(loop, scene),
            combat=combat,
            clues_collected=self._clues_collected(player.player_id),
            epiphanies_unlocked=self._epiphanies_unlocked(player, loop),
        )

    def equip_item(self, loop_id: str, item_id: str, equipped: bool = True) -> RuntimeSnapshot:
        """Toggle an equipment item's worn state (one item per slot)."""
        loop = self._require_loop(loop_id)
        player = self._require_player(loop.player_id)
        scenario = load_scenario(str(loop.state.get("scenario_id") or "neo-seoul"))
        items = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
        target_def = items.get(item_id, {}) if isinstance(items, dict) else {}
        target_slot = target_def.get("slot") if isinstance(target_def, dict) else None
        inventory = list(loop.state.get("_inventory", [])) if isinstance(loop.state, dict) else []
        updated: list[Any] = []
        for entry in inventory:
            if not isinstance(entry, dict):
                updated.append(entry)
                continue
            entry = dict(entry)
            eid = str(entry.get("id") or entry.get("item_id") or "")
            if eid == item_id:
                entry["id"] = eid
                entry["equipped"] = bool(equipped)
            elif equipped and target_slot is not None:
                # only one item per slot may be worn
                other = items.get(eid, {}) if isinstance(items, dict) else {}
                if isinstance(other, dict) and other.get("slot") == target_slot:
                    entry["equipped"] = False
            updated.append(entry)
        new_state = {**loop.state, "_inventory": updated}
        loop = replace(loop, state=new_state)
        with self.store.transaction():
            self.store.save_loop(loop)
        return self._snapshot_from_loop(player, loop)

    def start_combat(
        self,
        loop_id: str,
        encounter_id: str,
        options: RuntimeOptions | None = None,
        party_members: list[dict[str, Any]] | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        if party_members:
            party = dict(loop.state.get("_party", {})) if isinstance(loop.state, dict) else {}
            party["members"] = [dict(member) for member in party_members]
            state = dict(loop.state) if isinstance(loop.state, dict) else {}
            state["_party"] = party
            loop = replace(loop, state=state)
        player = self._require_player(loop.player_id)
        scenario = load_scenario(options.scenario_id)
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None

        with span("mythos.session.combat_start", player_id=player.player_id, loop_id=loop.loop_id):
            result = self.combat.begin(
                loop,
                scenario_combat=scenario.combat,
                encounter_id=encounter_id,
                player_name=player.display_name,
                player_stats=self._player_combat_stats(player, loop, scenario),
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
            allow_ambient=loop.tension >= 70 or loop.stability <= 30,
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
        defeat_event: WorldEvent | None = None
        combat_event: WorldEvent | None = None
        if result.finished:
            loop = self._apply_combat_rewards(loop, result)
            if result.outcome == "player_defeat":
                loop, defeat_event = self._combat_soft_defeat(loop, scene, encounter_id)
            combat_event = create_world_event(
                loop.loop_id,
                turn_index,
                "combat_finished",
                result.outcome,
                {
                    "combat_outcome": result.outcome,
                    "encounter_id": encounter_id,
                    "rewards": result.rewards,
                },
            )

        run_summary_memory: WorldMemory | None = None
        meta_progress: MetaProgression | None = None
        snapshot_player = player
        if result.finished and loop.phase is LoopPhase.ENDED:
            world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
            if not _has_run_summary(world_memories, loop_id=loop.loop_id):
                events = self.store.list_events(loop.loop_id)
                if defeat_event is not None:
                    events = [*events, defeat_event]
                if combat_event is not None:
                    events = [*events, combat_event]
                event_dicts = [to_json_dict(event) for event in events]
                # Combat defeat ends the loop mid-combat; never block the action
                # response on a slow LLM summary in fallback/fast mode.
                summary_text = self.director.summarize_loop(
                    event_dicts, use_llm=not (options.fallback or options.fast_mode)
                )
                run_summary_memory = _run_summary_memory_from_archive(
                    loop,
                    scene,
                    events,
                    self.store.list_narrative_shards(loop.player_id, limit=1000),
                    summary_text,
                )
                run_summary_memory, meta_progress, snapshot_player = self._apply_meta_progression(
                    player,
                    run_summary_memory,
                )

        if result.finished and isinstance(loop.state, dict):
            # Stamp combat pacing markers so the narrative path can enforce a
            # cooldown (no back-to-back combat) and an early-game difficulty cap.
            stamped = dict(loop.state)
            stamped["_last_combat_turn"] = turn_index
            if result.outcome == "player_victory":
                stamped["_combat_count"] = int(stamped.get("_combat_count", 0)) + 1
            loop = replace(loop, state=stamped)

        with self.store.transaction():
            self.store.save_loop(loop)
            self.store.save_scene(scene)
            self.save_load.autosave(loop, scene, assets=[])
            if defeat_event is not None:
                self.store.append_event(defeat_event)
            if combat_event is not None:
                self.store.append_event(combat_event)
            if echo is not None:
                _save_echo_memory(self.store, loop.player_id, echo)
            if run_summary_memory is not None:
                self.store.save_world_memory(run_summary_memory)
                if meta_progress is not None:
                    persist_progression(self.store, meta_progress)
                    self.store.create_player(snapshot_player)

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
            player=snapshot_player,
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
                "log": result.log,
                "elevations": result.elevations,
                "covers": result.covers,
                "hazards": result.hazards,
                "encounter": _encounter_meta(
                    load_scenario(options.scenario_id).combat.get("encounters", {}).get(
                        encounter_id, {}
                    )
                    if encounter_id
                    else {}
                ),
                "consumables": self._combat_consumables(
                    loop, load_scenario(options.scenario_id)
                ),
                "defeat_soft": _is_soft_defeat(loop),
            },
            clues_collected=self._clues_collected(player.player_id),
            epiphanies_unlocked=self._epiphanies_unlocked(snapshot_player, loop),
        )

    def _begin_requested_combat(
        self,
        player: PlayerProfile,
        loop: LoopState,
        encounter_id: str,
        options: RuntimeOptions,
    ) -> RuntimeSnapshot:
        scenario = load_scenario(options.scenario_id)
        encounters = (
            scenario.combat.get("encounters", {}) if isinstance(scenario.combat, dict) else {}
        )
        if encounter_id not in encounters:
            raise RuntimeError(f"unknown combat encounter requested: {encounter_id}")
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None
        result = self.combat.begin(
            loop,
            scenario_combat=scenario.combat,
            encounter_id=encounter_id,
            player_name=player.display_name,
            player_stats=self._player_combat_stats(player, loop, scenario),
            archetype=archetype,
        )
        return self._commit_combat_turn(player, result, "combat triggered by scene", options)

    def _combat_snapshot(self, loop: LoopState, options: RuntimeOptions) -> dict[str, Any] | None:
        state = CombatService.load_state(loop)
        if state is None:
            return None
        scenario = load_scenario(options.scenario_id)
        available = self.combat.engine.available_actions(state) if state.active else {}
        encounter = scenario.combat.get("encounters", {}).get(state.encounter_id, {})
        rewards: dict[str, Any] = {}
        if not state.active and state.outcome:
            rewards = {"outcome": state.outcome, "encounter_reward": encounter.get("reward", {})}
        return {
            "radar": render_radar(state),
            "available": available,
            "finished": not state.active,
            "outcome": state.outcome,
            "rewards": rewards,
            "summary": _combat_summary_from_state(state),
            "log": serialize_combat_log(state.log),
            "elevations": dict(state.elevations),
            "covers": dict(state.covers),
            "hazards": dict(state.hazards),
            "encounter": _encounter_meta(encounter),
            "consumables": self._combat_consumables(loop, scenario),
            "defeat_soft": _is_soft_defeat(loop),
        }

    def _resolved_ending_state(
        self,
        loop: LoopState,
        *,
        clue_count: int,
        context: str,
        combat_defeat_fallback: bool,
    ) -> dict[str, Any]:
        loop_state = dict(loop.state)
        ending_id = loop_state.get("ending_id")
        ending_label = loop_state.get("ending_label")
        if ending_id and ending_label != "Archived Loop":
            return loop_state

        scenario_id = str(loop_state.get("scenario_id") or "neo-seoul")
        try:
            scenario = load_scenario(scenario_id)
            resolved_id, resolved_label = EndingResolver.resolve_ending(loop, scenario, clue_count)
            if resolved_id:
                ending_id = resolved_id
                ending_label = resolved_label
            elif combat_defeat_fallback:
                ending_id, ending_label = _combat_defeat_fallback_ending(scenario.endings)
        except Exception as exc:
            self.logger.warning(
                "Failed to resolve ending in %s for loop %s: %s",
                context,
                loop.loop_id,
                exc,
                exc_info=True,
            )
            if combat_defeat_fallback:
                ending_id = "ending_erasure"
                ending_label = "강제 최적화 (Forced Erasure)"

        if ending_id:
            loop_state["ending_id"] = ending_id
        if ending_label:
            loop_state["ending_label"] = ending_label
        return loop_state

    def _apply_combat_rewards(self, loop: LoopState, result: CombatTurnResult) -> LoopState:
        encounter_id = result.radar.get("encounter_id") if isinstance(result.radar, dict) else None
        encounter_id = str(encounter_id) if encounter_id else None
        if result.outcome == "player_fled":
            return replace(loop, state=mark_encounter_alerted(loop.state, encounter_id))
        if result.outcome != "player_victory":
            return loop

        reward = (
            result.rewards.get("encounter_reward", {}) if isinstance(result.rewards, dict) else {}
        )
        if not isinstance(reward, dict):
            return loop
        loop = replace(loop, state=mark_encounter_resolved(loop.state, encounter_id))
        stability = _clamp_score(loop.stability + int(reward.get("stability", 0)))
        tension = _clamp_score(loop.tension + int(reward.get("tension", 0)))
        insight = max(0, int(reward.get("insight", 0) or 0))

        if insight > 0:
            scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
            previous = load_progression(self.store, loop.player_id, scenario_id)
            progress = replace(previous, insight_points=previous.insight_points + insight)
            scenario = load_scenario(scenario_id)
            loop = replace(
                loop,
                state=apply_meta_progression_to_state(loop.state, progress, scenario.combat),
            )
            persist_progression(self.store, progress)

        if stability == loop.stability and tension == loop.tension:
            return loop
        return replace(loop, stability=stability, tension=tension)

    def _apply_route_node_reward(
        self,
        loop: LoopState,
        node_id: str,
        node: dict[str, Any],
        perspective: dict[str, Any] | None,
    ) -> LoopState:
        """Apply a newly-entered route node's reward + perspective effect once.

        Closes the "choice -> session impact" loop numerically: non-combat node
        rewards (rest/market restore stability + HP, clue grants insight) and the
        active anchor perspective's `effect` deltas land on the loop. Combat-type
        nodes are skipped here — their encounter pays its own rewards. Applied
        node ids are tracked in `_route_map.applied_rewards` to avoid re-applying
        while the route lingers on the node across turns.
        """
        state = loop.state if isinstance(loop.state, dict) else {}
        route = state.get(ROUTE_MAP_KEY)
        if not isinstance(route, dict):
            return loop
        applied = list(route.get("applied_rewards", []))
        if node_id in applied:
            return loop

        dstab = dtens = dins = 0
        heal_frac = 0.0
        if not node.get("combat"):
            reward_raw = node.get("reward")
            reward: dict[str, Any] = reward_raw if isinstance(reward_raw, dict) else {}
            dstab += int(reward.get("stability", 0) or 0)
            dtens += int(reward.get("tension", 0) or 0)
            dins += int(reward.get("insight", 0) or 0)
            heal_frac = float(reward.get("heal_frac", 0.0) or 0.0)
        if perspective:
            effect_raw = perspective.get("effect")
            effect: dict[str, Any] = effect_raw if isinstance(effect_raw, dict) else {}
            dstab += int(effect.get("stability", 0) or 0)
            dtens += int(effect.get("tension", 0) or 0)
            dins += int(effect.get("insight", 0) or 0)

        new_state = dict(state)
        new_route = {**route, "applied_rewards": [*applied, node_id]}
        if heal_frac > 0:
            new_route_party = _heal_party(new_state.get("_party"), heal_frac)
            if new_route_party is not None:
                new_state["_party"] = new_route_party
        new_state[ROUTE_MAP_KEY] = new_route
        loop = replace(loop, state=new_state)

        if dins > 0:
            scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
            previous = load_progression(self.store, loop.player_id, scenario_id)
            progress = replace(previous, insight_points=previous.insight_points + dins)
            scenario = load_scenario(scenario_id)
            loop = replace(
                loop, state=apply_meta_progression_to_state(loop.state, progress, scenario.combat)
            )
            persist_progression(self.store, progress)

        if dstab or dtens:
            loop = replace(
                loop,
                stability=_clamp_score(loop.stability + dstab),
                tension=_clamp_score(loop.tension + dtens),
            )
        return loop

    def _combat_permadeath(
        self, loop: LoopState, scene: Scene
    ) -> tuple[LoopState, Echo, WorldEvent]:
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
        narrative_shards = self.store.list_narrative_shards(loop.player_id, limit=1000)
        clue_count = len([s for s in narrative_shards if s.kind == "clue"])
        loop_state = self._resolved_ending_state(
            loop,
            clue_count=clue_count,
            context="combat permadeath",
            combat_defeat_fallback=True,
        )

        ended = replace(
            loop,
            phase=LoopPhase.ENDED,
            ended_at=utc_now(),
            active_echoes=[*loop.active_echoes, echo],
            state=loop_state,
        )
        return ended, echo, event

    def _combat_soft_defeat(
        self, loop: LoopState, scene: Scene, encounter_id: Any
    ) -> tuple[LoopState, WorldEvent]:
        """Turn combat defeat into a recoverable capture/chase beat.

        The combat engine still reports ``player_defeat`` so the result panel can
        communicate loss clearly. Runtime state keeps the loop active, restores a
        small HP floor, and marks the next narrative turn as a forced recovery
        beat instead of archiving the run immediately.
        """
        event = create_world_event(
            loop.loop_id,
            scene.turn_index + 1,
            "combat_defeat_soft",
            "Connector signal suppressed; recovery route opened.",
            {
                "phase": "recovery",
                "combat_outcome": "player_defeat",
                "encounter_id": encounter_id,
                "soft_defeat": True,
            },
        )
        state = dict(loop.state) if isinstance(loop.state, dict) else {}
        run = dict(state.get("_run", {})) if isinstance(state.get("_run"), dict) else {}
        run["dead"] = False
        run["soft_defeats"] = int(run.get("soft_defeats", 0) or 0) + 1
        state["_run"] = run
        state["_soft_defeat_pending"] = True
        state["_last_combat_outcome"] = "soft_defeat"
        state["_combat_defeat_count"] = int(state.get("_combat_defeat_count", 0) or 0) + 1
        state.pop("_pending_spawn_encounters", None)

        flags = list(state.get("flags", [])) if isinstance(state.get("flags"), list) else []
        for flag in ("combat_defeat_soft", "captured_after_combat"):
            if flag not in flags:
                flags.append(flag)
        state["flags"] = flags

        healed_party = _heal_party(state.get("_party"), COMBAT_SOFT_DEFEAT_HEAL_FRAC)
        if healed_party is not None:
            state["_party"] = healed_party

        return (
            replace(
                loop,
                phase=LoopPhase.EXPLORE,
                stability=_clamp_score(loop.stability - COMBAT_SOFT_DEFEAT_STABILITY_LOSS),
                tension=_clamp_score(loop.tension + COMBAT_SOFT_DEFEAT_TENSION_GAIN),
                state=state,
            ),
            event,
        )

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
        metric_total_before: int | None = None,
        route_target: str | None = None,
        impact_base_loop: LoopState | None = None,
    ) -> RuntimeSnapshot:
        with span(span_name, player_id=player.player_id, loop_id=loop.loop_id):
            transition = self.engine.apply_scene_payload(loop, scene, payload, player_event)
        if not transition.ok:
            raise RuntimeError(_format_errors(transition.errors))
        if _is_recovery_scene_after_soft_defeat(loop, scene):
            transition = replace(
                transition,
                loop=replace(transition.loop, state=_clear_soft_defeat_pending(transition.loop.state)),
            )
        loop_after_map, triggered_combat = self._advance_encounter_map(
            transition.loop, payload, options, scene.turn_index
        )
        transition = replace(transition, loop=loop_after_map)

        # Advance the procedural route map: move the current node forward (honoring
        # the player's junction pick), resolve anchor perspectives from accumulated
        # flags, and tally ending influence. If the move enters a combat-type node,
        # trigger that node's encounter so combat/patrol/boss nodes mean combat.
        route_combat: str | None = None
        if isinstance(transition.loop.state, dict) and transition.loop.state.get(ROUTE_MAP_KEY):
            prev_route = transition.loop.state[ROUTE_MAP_KEY]
            prev_current = prev_route.get("current")
            routed_state = advance_route(
                transition.loop.state,
                turn_index=scene.turn_index,
                seed=transition.loop.seed,
                preferred_next=route_target,
            )
            transition = replace(transition, loop=replace(transition.loop, state=routed_state))
            new_route = routed_state[ROUTE_MAP_KEY]
            new_current = new_route.get("current")
            if new_current and new_current != prev_current:
                entered = new_route.get("nodes", {}).get(new_current, {})
                scenario = load_scenario(options.scenario_id)
                # Apply the entered node's reward + active perspective effect once.
                status = route_status(transition.loop.state) or {}
                rewarded = self._apply_route_node_reward(
                    transition.loop, new_current, entered, status.get("perspective")
                )
                transition = replace(transition, loop=rewarded)
                candidate = node_encounter_id(
                    entered,
                    scenario.route_map.get("combat_encounters"),
                    seed=transition.loop.seed,
                )
                if candidate and candidate in scenario.combat.get("encounters", {}):
                    route_combat = candidate

                # Dynamic route growth: now that the pointer advanced, thicken the
                # upcoming horizon layers with the GM's proposed nodes (type-
                # validated) topped up from authored pools. No-op for static maps.
                grown_state = extend_route(
                    transition.loop.state,
                    seed=transition.loop.seed,
                    turn_index=scene.turn_index,
                    proposals=list(payload.world_delta.route_nodes),
                )
                transition = replace(
                    transition, loop=replace(transition.loop, state=grown_state)
                )

        # Route junctions: at a layer boundary, replace this scene's choices with
        # the branch options (next candidate nodes) so the player explicitly picks
        # the next destination. In-layer turns keep the LLM's own choices.
        if isinstance(transition.loop.state, dict) and transition.loop.state.get(ROUTE_MAP_KEY):
            junction_opts = junction_options(transition.loop.state, turn_index=scene.turn_index)
            if junction_opts:
                scene = replace(scene, choices=_build_route_choices(junction_opts))

        # Session memory: record a compact beat + recent-prose window so later
        # scenes have a "story so far" to continue from (anti-repetition).
        if isinstance(transition.loop.state, dict):
            player_action = player_event.action if player_event is not None else None
            beat_state = record_beat(
                transition.loop.state, scene=scene, player_action=player_action
            )
            transition = replace(transition, loop=replace(transition.loop, state=beat_state))

        if player_event is not None and impact_base_loop is not None:
            impact = _choice_impact_summary(
                before=impact_base_loop,
                after=transition.loop,
                scene=scene,
                player_event=player_event,
            )
            state_with_impact = dict(transition.loop.state) if isinstance(transition.loop.state, dict) else {}
            state_with_impact["_last_choice_impact"] = impact
            transition = replace(transition, loop=replace(transition.loop, state=state_with_impact))

        with self.store.transaction():
            self.store.save_loop(transition.loop)
            self.store.save_scene(scene)
            self.save_load.autosave(transition.loop, scene, assets=[])
            for event in transition.events:
                self.store.append_event(event)
            for shard in transition.discovered_shards:
                self.store.save_narrative_shard(shard)
            if transition.echo is not None:
                _save_echo_memory(self.store, transition.loop.player_id, transition.echo)
        if metric_total_before is not None:
            self._persist_narrative_metric(
                player.player_id, transition.loop.loop_id, metric_total_before
            )

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
            clues_collected=self._clues_collected(player.player_id),
            epiphanies_unlocked=self._epiphanies_unlocked(player, transition.loop),
        )
        requested_combat = _requested_combat_id(payload)
        scenario_id = (
            transition.loop.state.get("scenario_id")
            if isinstance(transition.loop.state, dict)
            else None
        )
        if scenario_id == "neo-seoul" and scene.turn_index < 2:
            requested_combat = None
        next_combat = requested_combat or triggered_combat or route_combat
        next_combat = self._gate_next_combat(
            transition.loop, scene.turn_index, next_combat, options
        )
        if next_combat and not CombatService.is_active(transition.loop):
            combat_snapshot = self._begin_requested_combat(player, transition.loop, next_combat, options)
            self._set_cached_snapshot(transition.loop.loop_id, combat_snapshot)
            return combat_snapshot
        self._set_cached_snapshot(transition.loop.loop_id, snapshot)
        return snapshot

    def _gate_next_combat(
        self,
        loop: LoopState,
        turn_index: int,
        candidate: str | None,
        options: RuntimeOptions,
    ) -> str | None:
        """Apply combat pacing to a candidate encounter on the narrative path.

        Two guards address live-play findings (4턴 2회 + 조기 enforcer 즉사):
        - cooldown: suppress a new combat if the last one was within
          ``COMBAT_COOLDOWN_SCENES`` scenes, unless tension is high enough that
          a fight is story-justified.
        - early difficulty cap: downgrade encounters whose ``risk`` exceeds the
          tier unlocked by the number of combats already won, so the opening
          fights stay tutorial-tier and ramp as the player learns.
        """
        if not candidate or not isinstance(loop.state, dict):
            return candidate
        scenario = load_scenario(options.scenario_id)
        encounters = scenario.combat.get("encounters", {})
        if not isinstance(encounters, dict) or candidate not in encounters:
            return candidate

        last_combat = loop.state.get("_last_combat_turn")
        if isinstance(last_combat, int):
            within_cooldown = (turn_index - last_combat) < COMBAT_COOLDOWN_SCENES
            high_pressure = loop.tension >= COMBAT_COOLDOWN_PRESSURE_TENSION
            if within_cooldown and not high_pressure:
                return None

        combats_won = int(loop.state.get("_combat_count", 0))
        cap_index = min(combats_won, len(COMBAT_RISK_CAP_BY_COUNT) - 1)
        allowed_risk = COMBAT_RISK_CAP_BY_COUNT[cap_index]
        candidate_risk = int(encounters[candidate].get("risk", 1))
        if candidate_risk <= allowed_risk:
            return candidate
        # Downgrade to the highest-weight encounter within the allowed risk.
        affordable = [
            (eid, enc)
            for eid, enc in encounters.items()
            if int(enc.get("risk", 1)) <= allowed_risk
        ]
        if not affordable:
            return None
        affordable.sort(key=lambda item: float(item[1].get("weight", 1)), reverse=True)
        return str(affordable[0][0])

    def _persist_narrative_metric(
        self, player_id: str, loop_id: str, metric_total_before: int
    ) -> None:
        metrics = getattr(self.director, "metrics", None)
        total = int(getattr(metrics, "total", 0) or 0)
        if total <= metric_total_before:
            return
        outcome = getattr(metrics, "last_outcome", None)
        if not outcome:
            return
        _save_narrative_metric_memory(
            self.store,
            player_id=player_id,
            loop_id=loop_id,
            outcome=str(outcome),
            increment=total - metric_total_before,
        )

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

    def _clues_collected(self, player_id: str) -> int:
        try:
            return len(self.store.list_narrative_shards(player_id))
        except Exception:
            return 0

    def _epiphanies_unlocked(self, player: PlayerProfile, loop: LoopState) -> list[str]:
        try:
            from mythos_runtime.progression import check_mid_run_epiphanies, load_progression

            scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
            previous = load_progression(self.store, player.player_id, scenario_id)
            events = self.store.list_events(loop.loop_id)
            shards = self.store.list_narrative_shards(player.player_id, limit=1000)
            return check_mid_run_epiphanies(previous, scenario_id, events, shards, loop.loop_id)
        except Exception:
            self.logger.warning("failed to calculate mid-run epiphanies", exc_info=True)
            return []


def _heal_party(party: Any, frac: float) -> dict[str, Any] | None:
    """Restore player + party-member HP by a fraction of max (rest/market nodes)."""
    if not isinstance(party, dict):
        return None
    frac = max(0.0, min(1.0, frac))
    healed = dict(party)
    max_hp = int(healed.get("player_max_hp", healed.get("player_hp", 0)) or 0)
    if max_hp > 0:
        cur = int(healed.get("player_hp", 0) or 0)
        healed["player_hp"] = min(max_hp, cur + round(max_hp * frac))
    members = healed.get("members")
    if isinstance(members, dict):
        healed["members"] = {
            mid: _healed_party_member(member, frac) for mid, member in members.items()
        }
    elif isinstance(members, list):
        healed["members"] = [_healed_party_member(member, frac) for member in members]
    return healed


def _healed_party_member(member: Any, frac: float) -> Any:
    if not isinstance(member, dict):
        return member
    healed = dict(member)
    max_hp = int(healed.get("max_hp", healed.get("hp", 0)) or 0)
    if max_hp > 0:
        healed["hp"] = min(max_hp, int(healed.get("hp", 0) or 0) + round(max_hp * frac))
    return healed


def _state_flags(state: Any) -> set[str]:
    if not isinstance(state, dict):
        return set()
    flags = state.get("flags")
    if not isinstance(flags, list):
        return set()
    return {str(flag) for flag in flags}


def _route_node_label(state: Any) -> str | None:
    if not isinstance(state, dict):
        return None
    route = state.get(ROUTE_MAP_KEY)
    if not isinstance(route, dict):
        return None
    current = route.get("current")
    nodes = route.get("nodes")
    if not current or not isinstance(nodes, dict):
        return None
    node = nodes.get(current)
    if not isinstance(node, dict):
        return str(current)
    return str(node.get("title") or node.get("label") or current)


def _choice_impact_summary(
    *,
    before: LoopState,
    after: LoopState,
    scene: Scene,
    player_event: WorldEvent,
) -> dict[str, Any]:
    stability_delta = after.stability - before.stability
    tension_delta = after.tension - before.tension
    new_flags = sorted(_state_flags(after.state) - _state_flags(before.state))
    route_from = _route_node_label(before.state)
    route_to = _route_node_label(after.state)

    parts: list[str] = []
    if scene.action_result:
        parts.append(scene.action_result)
    if stability_delta:
        parts.append(f"안정성 {stability_delta:+d}")
    if tension_delta:
        parts.append(f"긴장도 {tension_delta:+d}")
    if new_flags:
        parts.append("새 플래그 " + ", ".join(new_flags[:3]))
    if route_from and route_to and route_from != route_to:
        parts.append(f"이동: {route_from} -> {route_to}")

    return {
        "action": player_event.action,
        "summary": " · ".join(parts) if parts else "선택 결과가 현재 장면에 반영되었습니다.",
        "stability_delta": stability_delta,
        "tension_delta": tension_delta,
        "new_flags": new_flags,
        "route_from": route_from,
        "route_to": route_to,
    }


def _is_soft_defeat(loop: LoopState) -> bool:
    return bool(
        isinstance(loop.state, dict)
        and loop.state.get("_soft_defeat_pending")
        and loop.state.get("_last_combat_outcome") == "soft_defeat"
    )


def _is_recovery_scene_after_soft_defeat(previous_loop: LoopState, scene: Scene) -> bool:
    return bool(
        isinstance(previous_loop.state, dict)
        and previous_loop.state.get("_soft_defeat_pending")
        and scene.scene_type != "combat"
    )


def _clear_soft_defeat_pending(state: dict[str, Any]) -> dict[str, Any]:
    next_state = dict(state) if isinstance(state, dict) else {}
    next_state.pop("_soft_defeat_pending", None)
    next_state["_soft_defeat_recovered"] = True
    next_state["_last_combat_outcome"] = "soft_defeat_recovered"
    return next_state


def _route_target_from_choice(choice_id: str | None) -> str | None:
    if choice_id and choice_id.startswith(ROUTE_CHOICE_PREFIX):
        return choice_id[len(ROUTE_CHOICE_PREFIX) :]
    return None


def _route_choice_badges(node: dict[str, Any]) -> str:
    parts: list[str] = []
    reward_raw = node.get("reward")
    reward: dict[str, Any] = reward_raw if isinstance(reward_raw, dict) else {}
    if node.get("risk"):
        parts.append(f"위험 {node.get('risk')}")
    if reward.get("insight"):
        parts.append(f"통찰 +{reward['insight']}")
    if reward.get("stability"):
        parts.append(f"안정 +{reward['stability']}")
    if reward.get("tension"):
        parts.append(f"추적 +{reward['tension']}")
    return " · ".join(parts)


# Plain-language meaning of each route node type so a junction choice reads as a
# destination with a purpose ("감시 사각(으)로 향한다 — 조용히 이동, 조우가 적은 경로")
# instead of a bare node name + terse label the player can't map to gameplay.
_ROUTE_TYPE_MEANING = {
    "story": "분기 결정이 기다리는 주요 장면",
    "boss": "지금까지의 선택과 관계가 모이는 최종 대면",
    "market": "보급·거래로 장비를 갖추는 곳",
    "rest": "정비·회복으로 다음 전투에 대비하는 곳",
    "clue": "단서를 캐내 진실에 다가가는 곳",
    "event": "예기치 못한 사건이 벌어지는 곳",
    "patrol": "조용히 이동하는, 조우가 적은 경로",
    "combat": "교전이 기다리는 경로",
}


def _route_destination_meaning(node: dict[str, Any]) -> str:
    node_type = str(node.get("type") or "")
    return _ROUTE_TYPE_MEANING.get(node_type) or str(node.get("label") or "다음 지점")


def _build_route_choices(options: list[dict[str, Any]]) -> list[Choice]:
    """Build branch choices from a junction's candidate next nodes."""
    choices: list[Choice] = []
    for node in options:
        node_id = str(node.get("id"))
        title = node.get("title") or node.get("label") or "다음 지점"
        label = f"{title}(으)로 향한다 — {_route_destination_meaning(node)}"
        badges = _route_choice_badges(node)
        if badges:
            label = f"{label} · {badges}"
        choices.append(
            Choice(choice_id=f"{ROUTE_CHOICE_PREFIX}{node_id}", label=label, intent="explore")
        )
    return choices


def _resolve_action(scene: Scene, choice_id: str | None, action: str | None) -> str:
    if action:
        return action
    if not choice_id:
        raise RuntimeError("choice_id or action is required")
    for choice in scene.choices:
        if choice.choice_id == choice_id:
            return choice.label
    raise RuntimeError(f"choice not found: {choice_id}")


def _apply_choice_requirements_and_cost(
    loop: LoopState, scene: Scene, choice_id: str | None
) -> LoopState:
    if not choice_id:
        return loop

    chosen_choice = next(
        (choice for choice in scene.choices if choice.choice_id == choice_id),
        None,
    )
    if chosen_choice is None:
        return loop

    if chosen_choice.requires:
        stab_min = chosen_choice.requires.get("stability_min")
        if stab_min is not None and loop.stability < stab_min:
            raise RuntimeError(
                f"선택 제약: [안정성] 수치가 {stab_min} 이상이어야 선택할 수 있습니다. (현재: {loop.stability})"
            )
        tens_max = chosen_choice.requires.get("tension_max")
        if tens_max is not None and loop.tension > tens_max:
            raise RuntimeError(
                f"선택 제약: [긴장도] 수치가 {tens_max} 이하여야 선택할 수 있습니다. (현재: {loop.tension})"
            )

    if not chosen_choice.cost:
        return loop

    stab_change = chosen_choice.cost.get("stability", 0)
    tens_change = chosen_choice.cost.get("tension", 0)
    return replace(
        loop,
        stability=max(0, min(100, loop.stability + stab_change)),
        tension=max(0, min(100, loop.tension + tens_change)),
    )


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


def _has_run_summary(memories: list[WorldMemory], loop_id: str) -> bool:
    for memory in memories:
        content = memory.content
        if (
            memory.kind == "run_summary"
            and isinstance(content, dict)
            and content.get("loop_id") == loop_id
        ):
            return True
    return False


def _has_narrative_shard(shards: list[NarrativeShard], loop_id: str) -> bool:
    return any(shard.loop_id == loop_id for shard in shards)


def _count_combat_outcomes(events: list[WorldEvent], outcome: str) -> int:
    count = 0
    for event in events:
        delta = event.state_delta if isinstance(event.state_delta, dict) else {}
        if delta.get("combat_outcome") == outcome:
            count += 1
    return count


def _allies_from_loop_state(state: dict[str, Any]) -> list[str]:
    party = state.get("_party")
    if not isinstance(party, dict):
        return []
    members = party.get("members")
    if not isinstance(members, list):
        return []
    allies = []
    for member in members:
        if isinstance(member, dict) and member.get("id"):
            allies.append(str(member["id"]))
    return allies


def _symbol_from_scene(scene: Scene) -> str:
    return next(
        (word.strip(".,:;!?").lower() for word in scene.title.split() if word.strip()),
        "echo",
    )


def _format_errors(errors: list) -> str:
    return "; ".join(f"{error.code}: {error.message}" for error in errors)

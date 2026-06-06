from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING, Any

from mythos_combat import PlayerAction, render_radar, serialize_combat_log
from mythos_core import (
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
    new_shard_id,
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
from mythos_runtime.encounter_map import (
    mark_encounter_alerted,
    mark_encounter_resolved,
    tick_encounter_map,
)
from mythos_runtime.ending_resolver import EndingResolver
from mythos_runtime.narrative_metrics import (
    director_metric_total as _director_metric_total,
)
from mythos_runtime.narrative_metrics import (
    save_narrative_metric_memory as _save_narrative_metric_memory,
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
    _meta_progression_memory,
    _run_summary_from_memory,
    _run_summary_memory_from_archive,
    _world_memory_from_archive,
    apply_meta_progression_to_state,
    determine_autonomy_level,
    evaluate_meta_progression,
    latest_meta_progression,
    meta_progression_from_content,
    meta_progression_to_content,
    traits_with_meta_progression,
)
from mythos_runtime.save_load import SaveLoadService
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import apply_archetype_traits, build_runtime_narrative_context
from mythos_runtime.constants import MYTHOS_WORLD_ID
from mythos_runtime.narrative_rollup import (
    _archives_to_compact,
    _compact_player_archives,
    _merge_archive_rollup,
    _player_rollup,
    _prepare_narrative_memory_context,
)
from mythos_runtime.visual_orchestration import maybe_generate_scene_image

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
        meta_progression = latest_meta_progression(memories, player.player_id, options.scenario_id)

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
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        player = self._require_player(loop.player_id)
        latest_scene = self.store.get_latest_scene(loop.loop_id)
        if latest_scene is None:
            raise RuntimeError(f"no scene found for loop_id={loop.loop_id}")

        resolved_action = _resolve_action(latest_scene, choice_id, action)
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
            # save slot phase is frozen at save time; resolve the live loop and
            # skip any that have since ENDED so player-resume picks the latest
            # *active* loop (ended loops live in run history, not the slot list).
            for slot in self.list_save_slots(player_id):
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
        return RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
            bgm_path=bgm_path,
            combat=combat,
            clues_collected=self._clues_collected(player.player_id),
        )

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

        # 8. meta_progression
        meta_memory = None
        for memory in reversed(player_memories):
            if memory.kind == "meta_progression":
                meta_memory = memory
                break

        scenario_id = "neo-seoul"
        active_slots = self.save_load.list_save_slots(player_id)
        if active_slots:
            scenario_id = active_slots[0].scenario_id

        progress = (
            meta_progression_from_content(
                meta_memory.content, player_id=player_id, scenario_id=scenario_id
            )
            if meta_memory
            else MetaProgression(player_id=player_id, scenario_id=scenario_id)
        )
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

    def _apply_meta_progression(
        self,
        player: PlayerProfile,
        run_summary_memory: WorldMemory,
    ) -> tuple[WorldMemory, PlayerMemory, PlayerProfile]:
        scenario_id = str(run_summary_memory.content.get("scenario_id") or "neo-seoul")
        previous = latest_meta_progression(
            self.store.list_player_memories(player.player_id),
            player.player_id,
            scenario_id,
        )
        progress, unlocks = evaluate_meta_progression(
            previous,
            _run_summary_from_memory(run_summary_memory),
        )
        updated_content = dict(run_summary_memory.content)
        updated_content["unlocks_granted"] = unlocks
        updated_summary = replace(
            run_summary_memory,
            content=updated_content,
            updated_at=utc_now(),
        )
        meta_memory = _meta_progression_memory(progress)
        updated_traits = traits_with_meta_progression(player.traits, progress)
        updated_player = replace(player, traits=updated_traits, updated_at=utc_now())
        return updated_summary, meta_memory, updated_player

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
        meta_memory: PlayerMemory | None = None
        snapshot_player = player
        if not has_run_summary:
            run_summary_memory, meta_memory, snapshot_player = self._apply_meta_progression(
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
                if meta_memory is not None:
                    self.store.save_player_memory(meta_memory)
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
        )

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
        defeat_event: WorldEvent | None = None
        combat_event: WorldEvent | None = None
        if result.finished:
            loop = self._apply_combat_rewards(loop, result)
            if result.outcome == "player_defeat":
                loop, echo, defeat_event = self._combat_permadeath(loop, scene)
            combat_event = create_world_event(
                loop.loop_id,
                turn_index,
                "combat_finished",
                result.outcome,
                {
                    "combat_outcome": result.outcome,
                    "encounter_id": encounter_id,
                },
            )

        run_summary_memory: WorldMemory | None = None
        meta_memory: PlayerMemory | None = None
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
                run_summary_memory, meta_memory, snapshot_player = self._apply_meta_progression(
                    player,
                    run_summary_memory,
                )

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
                if meta_memory is not None:
                    self.store.save_player_memory(meta_memory)
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
            },
            clues_collected=self._clues_collected(player.player_id),
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

    def _combat_snapshot(self, loop: LoopState, options: RuntimeOptions) -> dict[str, Any] | None:
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
            "log": serialize_combat_log(state.log),
            "elevations": dict(state.elevations),
            "covers": dict(state.covers),
            "hazards": dict(state.hazards),
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
        if stability == loop.stability and tension == loop.tension:
            return loop
        return replace(loop, stability=stability, tension=tension)

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
        )
        requested_combat = _requested_combat_id(payload)
        scenario_id = (
            transition.loop.state.get("scenario_id")
            if isinstance(transition.loop.state, dict)
            else None
        )
        if scenario_id == "neo-seoul" and scene.turn_index < 2:
            requested_combat = None
        next_combat = requested_combat or triggered_combat
        if next_combat and not CombatService.is_active(transition.loop):
            return self._begin_requested_combat(player, transition.loop, next_combat, options)
        return snapshot

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


def _combat_defeat_fallback_ending(
    endings: list[dict[str, Any]],
) -> tuple[str | None, str]:
    has_erasure = any(ending.get("id") == "ending_erasure" for ending in endings)
    if has_erasure:
        return "ending_erasure", "강제 최적화 (Forced Erasure)"
    if endings:
        ending = endings[-1]
        return ending.get("id"), ending.get("title") or "Ended Loop"
    return None, "Combat Defeat"


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
    encounter_id = _normalized_request_id(encounter_id)
    if encounter_id:
        return encounter_id
    for flag in payload.world_delta.flags:
        if flag.startswith("start_combat:"):
            return _normalized_request_id(flag.split(":", 1)[1])
    return None


def _normalized_request_id(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.lower() in {"null", "none", "false", "undefined", "nil"}:
        return None
    return cleaned


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

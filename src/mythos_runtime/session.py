from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field, replace
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
from mythos_core.dice import Dice
from mythos_core.models import to_json_dict
from mythos_core.text_match import name_mentions
from mythos_loop import LoopEngine, LoopTransition, create_player_event, create_world_event
from mythos_memory import MythOSStore
from mythos_narrative import NarrativeContext, NarrativeDirector, NarrativeStreamEvent, ScenePayload
from mythos_narrative.codex import CodexService
from mythos_narrative.variation import NoveltyController
from mythos_runtime.audio_service import AudioService
from mythos_runtime.boons import (
    BOON_OFFER_KEY,
    RUN_BOONS_KEY,
    boon_card,
    boon_stat_bonus,
    offer_boons,
)
from mythos_runtime.combat_service import CombatService, CombatTurnResult
from mythos_runtime.combat_session_helpers import (
    _apply_rest_recovery,
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
    SOFT_DEFEAT_COMBAT_COOLDOWN_SCENES,
)
from mythos_runtime.cutscenes import (
    ACTIVE_CUTSCENE_KEY,
    SEEN_CUTSCENES_KEY,
    next_unseen_cutscene,
)
from mythos_runtime.echoes import (
    ECHO_OFFER_KEY,
    INSCRIBE_CAP,
    INSCRIBED_ECHOES_KEY,
    echo_card,
    echo_offer_ids,
    echo_stat_bonus,
)
from mythos_runtime.encounter_map import (
    mark_encounter_alerted,
    mark_encounter_resolved,
    tick_encounter_map,
)
from mythos_runtime.ending_resolver import EndingResolver
from mythos_runtime.loop_modifiers import (
    LOOP_MODIFIER_KEY,
    modifier_effect,
    select_loop_modifier,
)
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
from mythos_runtime.route_map import (
    ROUTE_MAP_KEY,
    attach_side_anchors,
    build_route_map,
    build_route_seed,
)
from mythos_runtime.route_runtime import (
    advance_route,
    fold_relationship,
    junction_options,
    node_encounter_id,
    route_status,
)
from mythos_runtime.save_load import SaveLoadService
from mythos_runtime.scenario import load_scenario, load_scenario_i18n
from mythos_runtime.scenario_context import (
    ROUTE_STEERING_START_TURN,
    apply_archetype_traits,
    build_runtime_narrative_context,
    resolve_archetype_id,
)
from mythos_runtime.scenario_directives import (
    CutsceneDirective,
    available_opening_variants,
    load_scenario_directives,
)
from mythos_runtime.session_memory import (
    companions_seen,
    note_setup,
    record_beat,
)
from mythos_runtime.twists import (
    PENDING_TWIST_KEY,
    advance_twist_lifecycle,
    select_twist,
)
from mythos_runtime.visual_orchestration import maybe_generate_scene_image

ROUTE_CHOICE_PREFIX = "route:"

# Transient loop-state descriptor for the combat-entry transition beat (CBT
# feedback #1 "combat jump-scare"): written when a fight begins, rendered by the
# client as a 1-beat interstitial before the tactical board, cleared on the next
# narrative commit. Mirrors the ``_active_cutscene`` lifecycle.
COMBAT_INTERSTITIAL_KEY = "_combat_interstitial"

# Companions whose opening variants are always eligible without a meta unlock
# (mirrors route_map._TUTORIAL_COMPANIONS; se_rin owns the default opening).
_OPENING_TUTORIAL_COMPANIONS = frozenset({"kai"})


def _companion_alias_map(scenario: Any, scenario_id: str) -> dict[str, list[str]]:
    """Ally display name (KO canonical) → aliases to detect in scene prose.

    Aliases: the authored KO name, its given-name tail for 3+ char full names
    (정세린 → 세린 — prose usually drops the surname), and the EN glossary name
    so EN-mode loops keep the same companion-ref ledger (C3 foreshadow rule).
    """
    allies = scenario.combat.get("allies", {}) if isinstance(scenario.combat, dict) else {}
    overlay = load_scenario_i18n(scenario_id, "en")
    glossary = overlay.get("glossary") if isinstance(overlay, dict) else None
    glossary = glossary if isinstance(glossary, dict) else {}
    alias_map: dict[str, list[str]] = {}
    for entry in allies.values():
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "")
        if not name:
            continue
        aliases = [name]
        if len(name) >= 3:
            aliases.append(name[1:])
        en_name = glossary.get(name)
        if en_name:
            aliases.append(str(en_name))
            # EN prose usually drops the surname too (Jung Se-rin → Se-rin).
            last_token = str(en_name).split()[-1]
            if last_token and last_token not in aliases:
                aliases.append(last_token)
        alias_map[name] = aliases
    return alias_map


def _companions_in_text(alias_map: dict[str, list[str]], text: str) -> list[str]:
    """Companion display names referenced in ``text``.

    Delegates to the shared name rule: single-syllable KO names ("한") match only
    when particle-bounded, or they hit ordinary words (한다/한강/한 걸음) on every
    scene; ASCII aliases must stand alone, or "Han" matches inside *Handle*.
    """
    return [name for name, aliases in alias_map.items() if name_mentions(text, aliases)]


# G1 setup ledger seeds: the opening variant's hook line is a planted setup the
# climax act must pay off unless the loop resolved it (any listed flag earned).
_OPENING_HOOK_SETUPS: dict[str, tuple[str, list[str]]] = {
    "kai": ("카이의 백도어 신호 — 폐기층 좌표 조각의 정체", ["kai_found", "rebooted_kai", "kai_awakened"]),
    "lin_yue": ("린위에의 의뢰 쪽지 — 깨어날 자리를 알던 자", ["met_lin_yue"]),
    "han": ("지름길을 알려주고 사라진 사내의 정체", ["met_han"]),
    "su_ah": ("감시망에 구멍을 뚫는 익명의 핑", ["met_su_ah"]),
    "tae_o": ("바리케이드 뒤 실루엣과 주민들의 저항", ["met_tae_o"]),
    "solo": ("세린이 오지 않은 이유", []),
}


# Per-loop companion presence is gated on flags earned THIS loop; these prefixes
# are the "already met/trusted/refused/recruited" markers a companion carries.
_COMPANION_FLAG_PREFIXES = ("met_", "trusted_", "refused_", "ally_")


def _strip_carried_companion_presence(state: dict[str, Any], scenario: Any) -> None:
    """Guardrail: deny a prior-loop companion an unearned appearance this loop.

    A companion met/trusted/recruited in an earlier loop must re-introduce
    themselves through their meet-arc (or the authored opening) in the NEW loop
    before they can appear, guide, or join combat — no sudden pop-in from a
    carried flag (owner design 2026-07-10). So at the start of every loop after
    the first, drop any carried ``met_``/``trusted_``/``refused_``/``ally_``
    <companion> flag and remove any carried companion from the party. Only the
    affection BONUS (``meta_progression.relationships``) persists — the warmth is
    felt as narrative echoes, not as an already-present ally. The combat spawn
    (``combat_service`` unlock_flags∩flags), the C3 unheralded-ally join signal,
    and the Story-Bible flag gate all key off ``state["flags"]``, so clearing the
    carried flags here denies every downstream appearance vector at once.
    """
    combat = scenario.combat if isinstance(scenario.combat, dict) else {}
    allies = combat.get("allies", {})
    companion_ids = {
        str(entry.get("id", key))
        for key, entry in (allies.items() if isinstance(allies, dict) else [])
        if isinstance(entry, dict)
    }
    if not companion_ids:
        return
    carried = {
        f"{prefix}{cid}" for prefix in _COMPANION_FLAG_PREFIXES for cid in companion_ids
    }
    flags = state.get("flags")
    if isinstance(flags, list):
        state["flags"] = [flag for flag in flags if str(flag) not in carried]
    party = state.get("_party")
    if isinstance(party, dict):
        members = party.get("members")
        if isinstance(members, list):
            party["members"] = [
                member
                for member in members
                if not (isinstance(member, dict) and str(member.get("id")) in companion_ids)
            ]


def _select_opening_variant(
    scenario_id: str,
    *,
    seed: str,
    loop_index: int,
    unlocked_companions: set[str],
    met_companions: set[str],
) -> str:
    """Pick this loop's opening variant (B2 Loop2+ replay variety).

    Loop 1 always runs the authored Se-rin 5-cut tutorial opening. From loop 2
    a seed-deterministic pick from the authored variant pool applies, with
    unlocked-but-unmet companions preferred (their hook beat then pairs with
    the B1 guaranteed meet-arc slot). Scenarios without variant files always
    get ``"default"`` (behavior-preserving); loop 2+ never replays the 5-cut
    when variants exist (re-entry shortening is authored into each variant).
    """
    if loop_index <= 1:
        return "default"
    available = available_opening_variants(scenario_id)
    if not available:
        return "default"
    allowed = _OPENING_TUTORIAL_COMPANIONS | unlocked_companions
    companions = sorted(v for v in available if v != "solo" and v in allowed)
    dice = Dice(f"{seed}:opening-variant")
    unmet = [c for c in companions if c not in met_companions]
    if unmet:
        return str(dice.choice(unmet))
    pool = list(companions)
    if "solo" in available:
        pool.append("solo")
    if not pool:
        return "default"
    return str(dice.choice(pool))

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
    choice_relationship: dict[str, int] = field(default_factory=dict)
    cutscene_id: str | None = None


@dataclass(frozen=True)
class _NarrativeAdvance:
    """Output of ``RuntimeSessionService._advance_narrative_state``."""

    transition: LoopTransition
    scene: Scene
    story_turn: int
    route_combat: str | None
    route_combat_kind: str | None
    triggered_combat: str | None
    offered_junction: bool
    route_progress: MetaProgression | None


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
        meta_progression = load_progression(self.store, player.player_id, options.scenario_id)

        stats = player.traits.get("stats", {}) if isinstance(player.traits, dict) else {}
        max_hp = 10 + int(stats.get("strength", 5))

        initial_state = apply_meta_progression_to_state(
            {**initial_scores.state, "scenario_id": options.scenario_id},
            meta_progression,
            scenario.combat,
        )
        # GUARDRAIL: from loop 2 on, deny carried companion flags/party an
        # unearned appearance — each loop must re-introduce them (see
        # _strip_carried_companion_presence). The first loop's tutorial Se-rin
        # seed is added just below.
        if len(loops) > 0:
            _strip_carried_companion_presence(initial_state, scenario)
        party = dict(initial_state.get("_party", {}))
        party.setdefault("player_hp", max_hp)
        party.setdefault("player_max_hp", max_hp)
        # First loop = a guided tutorial: Se-rin is the Connector's established first
        # guide (present in the opening), so she is the guaranteed starting party.
        # Gate on loop_index (len(loops)==0 = the player's first loop), NOT
        # runs_completed: a tester who abandons loops without archiving keeps
        # runs_completed at 0, which used to re-seed Se-rin into EVERY loop's party
        # even while `_select_opening_variant` (keyed on len(loops)) served a loop-2+
        # variant opening — yielding a variant opening WITH a tutorial Se-rin in the
        # party. Keying both on len(loops) removes that mismatch. Kai and the rest
        # join with narrative context via their meet side-arcs; the party varies run
        # to run.
        if len(loops) == 0 and not party.get("members"):
            party["members"] = [{"id": "se_rin"}]
            flags = list(initial_state.get("flags", []) or [])
            for flag in ("met_se_rin", "tutorial_loop"):
                if flag not in flags:
                    flags.append(flag)
            initial_state["flags"] = flags
        initial_state["_party"] = party

        # Capture the character identity for this loop so save slots can show it on
        # the save/load screen. Stored per-loop because one stable player_id (closed
        # beta, [[en-ko]] Option B) may run several archetypes across loops; the
        # player row's traits only hold the latest.
        initial_state["display_name"] = player.display_name
        archetype = player.traits.get("archetype") if isinstance(player.traits, dict) else None
        if archetype:
            initial_state["archetype"] = str(archetype)
        # Seed the archetype's starting consumables so an item-gated BASE skill is
        # usable from the first combat instead of silently no-op'ing (echo_collector's
        # patch_protocol heal needs a nanopatch, but the loadout only granted a
        # weapon). Keyed by the resolved archetype id, same as archetype_base_skills.
        starting_items = (
            scenario.combat.get("archetype_starting_items", {})
            if isinstance(scenario.combat, dict)
            else {}
        )
        archetype_id = self._resolved_archetype(player, options.scenario_id)
        item_ids = (
            starting_items.get(archetype_id or "", [])
            if isinstance(starting_items, dict)
            else []
        )
        if item_ids:
            item_defs = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
            inventory = list(initial_state.get("_inventory", []))
            for item_id in item_ids:
                if item_id in item_defs:
                    inventory.append(item_defs[item_id])
            initial_state["_inventory"] = inventory

        loop_seed = create_loop_seed(
            player.player_id,
            len(loops) + 1,
            {"memories": [memory.content for memory in memories]},
        )
        # B2 Loop2+ opening variant: loop 1 keeps the Se-rin 5-cut tutorial;
        # later loops open on a seed-picked authored variant (companion hook /
        # solo), preferring unlocked-but-unmet companions. The pick is stored on
        # loop state so the prompt assembler, the mythos_loop flag heuristic, and
        # the B1 slot promotion below all read the same decision.
        unlocked_allies = set(getattr(meta_progression, "unlocked_allies", []) or [])
        allies_met = set(getattr(meta_progression, "allies_met", []) or [])
        opening_variant = _select_opening_variant(
            options.scenario_id,
            seed=loop_seed,
            loop_index=len(loops) + 1,
            unlocked_companions=unlocked_allies,
            met_companions=allies_met,
        )
        initial_state["_opening_variant"] = opening_variant
        # G1 setup ledger: the variant's hook is a planted 떡밥 the climax act
        # must pay off (unless a resolve flag is earned earlier this loop).
        hook = _OPENING_HOOK_SETUPS.get(opening_variant)
        if hook is not None:
            initial_state = note_setup(
                initial_state,
                f"opening_hook_{opening_variant}",
                hook[0],
                resolve_flags=hook[1],
            )
        # B3 loop modifier: one authored per-run twist from loop 2, announced to
        # the client as a banner and consumed by the pacing gate / market /
        # route-reward paths through the same state record.
        loop_modifier = select_loop_modifier(
            scenario.loop_modifiers, seed=loop_seed, loop_index=len(loops) + 1
        )
        if loop_modifier is not None:
            initial_state[LOOP_MODIFIER_KEY] = loop_modifier
        # Generate this loop's operation map. Two modes:
        #  - dynamic (`route_map.mode == "dynamic"`): seed only the backbone
        #    (anchors + first horizon layers); `extend_route` grows it as the
        #    player advances, and the LLM may propose nodes. Not seed-reproducible.
        #  - static (default/legacy): the full deterministic DAG is pre-built.
        # Scenarios without a route_map config fall back to the legacy `_map`.
        # The opening variant resolves each anchor's authored `variants` skin at
        # materialization, so the persisted nodes already carry the variant
        # beat/title/image (variant-routed opening S1; default = base skin).
        route_cfg = scenario.route_map if isinstance(scenario.route_map, dict) else None
        if isinstance(route_cfg, dict) and route_cfg.get("mode") == "dynamic":
            route_map = build_route_seed(route_cfg, loop_seed, opening_variant=opening_variant)
        else:
            route_map = build_route_map(route_cfg, loop_seed, opening_variant=opening_variant)
        if route_map is not None:
            # Weave authored side_arcs into the DAG as seed-selected optional
            # side-anchor branches (reachable yet skippable; boss distance kept).
            # Companion meet-arcs are gated on achievement-unlocked recruits.
            # B1 guaranteed meet-arc slot: an unlocked-but-never-met companion's
            # meet arc is forced into the map (exposure was the recruitment
            # bottleneck — ~25%/run per arc under pure seed-random selection).
            # A companion opening variant promotes THAT companion's arc into the
            # slot so the opening hook pays off on the same map (B2 pairing).
            route_map = attach_side_anchors(
                route_map,
                scenario.side_arcs,
                loop_seed,
                unlocked_companions=unlocked_allies,
                met_companions=allies_met,
                priority_companion=(
                    opening_variant
                    if opening_variant not in ("default", "solo")
                    else None
                ),
            )
            # B3 signal-jam style modifiers shrink the dynamic map's lookahead
            # (no-op for static maps, which never call extend_route).
            horizon_delta = modifier_effect(initial_state, "route_horizon_delta")
            if horizon_delta and isinstance(route_map, dict):
                base_horizon = int(route_map.get("horizon", 2) or 2)
                route_map["horizon"] = max(1, base_horizon + horizon_delta)
            initial_state[ROUTE_MAP_KEY] = route_map

        # Loop-aware world: record which iteration this is (1-based) so the session
        # synopsis can tell the GM the anomaly is repeating (Outer Wilds / Deathloop
        # framing) instead of treating every loop as the first.
        initial_state["_loop_index"] = len(loops) + 1

        # Opening in-run build pick: offer a starting boon so the player shapes this
        # run from turn 0 (the pick applies this loop only; permanent growth is meta).
        initial_state[BOON_OFFER_KEY] = offer_boons(seed=loop_seed, turn_index=0, taken=[])

        # Echo inscription: memories carried from prior loops may be inscribed for a
        # run modifier, so "carry an Echo forward" is felt mechanically (empty on a
        # first loop — nothing carried yet).
        echo_ids = echo_offer_ids(_echoes_from_memories(memories))
        if echo_ids:
            initial_state[ECHO_OFFER_KEY] = echo_ids

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
            novelty_signal=novelty_signal,
            fast_mode=options.fast_mode,
            language=options.language,
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
        # Defer the scene image (see stream_choose): ship the first-scene snapshot,
        # then generate the image and relay it as a trailing visual event.
        options = replace(options, defer_image=True)
        # Emit the chosen opening variant up front, before the (slow, LLM-driven)
        # first-scene generation. The variant is fixed the moment the loop is
        # prepared, but the snapshot that carries it only lands after generation
        # completes (8-20s on cloud). Without this early frame the client's intro
        # hold times out and reveals the default Se-rin cut, then remounts into
        # the real variant when the snapshot finally arrives (the "Se-rin flash →
        # variant swap" bug). This frame lets the intro pick the right sequence
        # in <1s. Fallback path emits it too — it also runs _prepare_start_loop.
        _loop_state = loop.state if isinstance(loop.state, dict) else {}
        _loop_meta = _loop_state.get("meta_progression")
        yield RuntimeStreamEvent(
            kind="meta",
            opening_variant=str(_loop_state.get("_opening_variant") or "default"),
            runs_completed=(
                int(_loop_meta.get("runs_completed", 0)) if isinstance(_loop_meta, dict) else 0
            ),
        )
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
            # Choices are delivered; generate the opening image off the critical
            # path and hand it back as a trailing visual event.
            image_result = self._maybe_generate_image(
                options, snapshot.loop, snapshot.scene, player.player_id
            )
            if image_result is not None:
                yield RuntimeStreamEvent(kind="visual", visual=image_result)

    def _prepare_choice(
        self,
        loop_id: str,
        choice_id: str | None,
        action: str | None,
        options: RuntimeOptions,
    ) -> _PreparedChoice:
        # WRITE path: always load the authoritative loop/scene from the store. The
        # snapshot cache is a read accelerator (resume); trusting it here let a
        # stale pre-combat snapshot be committed over fresh combat results — live
        # 2026-07-04 (loop_dbbd07cb…): 4 victories' loot + encounters_cleared were
        # silently reverted because combat commits didn't refresh the cache and the
        # next narrative choose() resurrected the cached pre-fight state (also a
        # zombie-active-combat vector).
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
            _recent_novelty_scenes(self.store, loops, active_loop_id=loop.loop_id)
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
        # A route choice selects the node that stages *this* generated scene, but
        # the durable route advance happens later in ``_commit_scene``. Preview the
        # same deterministic advance only for narrative context so node title,
        # curated-image lock, Story Bible flags, and route directives describe the
        # destination instead of the previous junction. Keep ``loop`` itself
        # unchanged here: commit still owns persistence, rewards, combat, and the
        # single durable transition.
        context_state = dict(loop.state) if isinstance(loop.state, dict) else {}
        context_state.pop(ACTIVE_CUTSCENE_KEY, None)
        context_loop = replace(loop, state=context_state)
        route_target = _route_target_from_choice(choice_id)
        route_preview_state = context_state
        if context_state.get(ROUTE_MAP_KEY):
            route_preview_state = advance_route(
                context_state,
                # Route clock counts narrative commits only (mirrors _commit_scene);
                # raw turn_index includes combat rounds and would over-advance.
                turn_index=_story_turn_for_commit(context_state, turn_index),
                seed=loop.seed,
                preferred_next=route_target,
            )
            if route_target:
                context_loop = replace(loop, state=route_preview_state)
        cutscene = _next_runtime_cutscene(
            replace(context_loop, state=route_preview_state),
            scenario_id=options.scenario_id,
            language=options.language,
            turn_index=turn_index,
        )
        if cutscene is not None:
            context_loop = replace(
                context_loop,
                state=_state_with_active_cutscene(context_loop.state, cutscene),
            )
        context = build_runtime_narrative_context(
            player=player,
            loop=context_loop,
            scenario=scenario,
            turn_index=turn_index,
            recent_events=recent_events,
            memories=memories,
            world_memories=world_memories,
            narrative_shards=narrative_shards,
            novelty_notes=novelty_signal.notes,
            novelty_signal=novelty_signal,
            player_action=resolved_action,
            fast_mode=options.fast_mode,
            language=options.language,
        )
        return _PreparedChoice(
            player=player,
            loop=loop,
            impact_base_loop=impact_base_loop,
            context=context,
            player_event=player_event,
            choice_relationship=_choice_relationship(latest_scene, choice_id),
            cutscene_id=cutscene.cutscene_id if cutscene is not None else None,
        )

    def _boons_view(self, loop: LoopState, options: RuntimeOptions) -> dict[str, Any]:
        """Client-facing build state: pending boon offer + active picks, plus the
        Echo-inscription offer / inscribed echoes carried from prior loops."""
        state = loop.state if isinstance(loop.state, dict) else {}
        lang = options.language
        offer = state.get(BOON_OFFER_KEY)
        active = state.get(RUN_BOONS_KEY)
        echo_meta = {
            str(getattr(e, "echo_id", "")): (getattr(e, "symbol", ""), getattr(e, "text", ""))
            for e in loop.active_echoes
        }

        def _echo_cards(ids: Any) -> list[dict[str, Any]]:
            cards = []
            for eid in ids if isinstance(ids, list) else []:
                symbol, text = echo_meta.get(str(eid), ("", ""))
                cards.append(echo_card(str(eid), symbol=symbol, text=text, language=lang))
            return cards

        echo_offer = state.get(ECHO_OFFER_KEY)
        # Combined run stat bonus (boons + inscribed echoes) so the Character screen
        # can show base + bonus — otherwise a pick only shows up implicitly in combat.
        stat_bonus = boon_stat_bonus(state.get(RUN_BOONS_KEY))
        for stat, value in echo_stat_bonus(state.get(INSCRIBED_ECHOES_KEY)).items():
            stat_bonus[stat] = stat_bonus.get(stat, 0) + value
        return {
            "offer": [boon_card(bid, lang) for bid in offer]
            if isinstance(offer, list) and offer
            else None,
            "active": [boon_card(bid, lang) for bid in active] if isinstance(active, list) else [],
            "echoOffer": _echo_cards(echo_offer) if echo_offer else None,
            "echoInscribed": _echo_cards(state.get(INSCRIBED_ECHOES_KEY)),
            "statBonus": stat_bonus,
        }

    def inscribe_echo(
        self, loop_id: str, echo_id: str, options: RuntimeOptions | None = None
    ) -> RuntimeSnapshot:
        """Inscribe one carried Echo as a this-run modifier (capped, from the offer)."""
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        player = self._require_player(loop.player_id)
        state = dict(loop.state) if isinstance(loop.state, dict) else {}
        offer = state.get(ECHO_OFFER_KEY)
        if not isinstance(offer, list) or echo_id not in offer:
            raise RuntimeError(f"echo {echo_id!r} is not in the current inscription offer")
        inscribed = [*(state.get(INSCRIBED_ECHOES_KEY) or []), echo_id]
        state[INSCRIBED_ECHOES_KEY] = inscribed
        # Cap reached (or offer exhausted) → close the offer; else keep remaining.
        remaining = [eid for eid in offer if eid != echo_id]
        if len(inscribed) >= INSCRIBE_CAP or not remaining:
            state.pop(ECHO_OFFER_KEY, None)
        else:
            state[ECHO_OFFER_KEY] = remaining
        loop = replace(loop, state=state)
        self.store.save_loop(loop)
        return self._snapshot_from_loop(player, loop, options)

    def choose_boon(
        self, loop_id: str, boon_id: str, options: RuntimeOptions | None = None
    ) -> RuntimeSnapshot:
        """Apply the player's pick from the pending boon offer (this run only)."""
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        player = self._require_player(loop.player_id)
        state = dict(loop.state) if isinstance(loop.state, dict) else {}
        offer = state.get(BOON_OFFER_KEY)
        if not isinstance(offer, list) or boon_id not in offer:
            raise RuntimeError(f"boon {boon_id!r} is not in the current offer")
        state[RUN_BOONS_KEY] = [*(state.get(RUN_BOONS_KEY) or []), boon_id]
        state.pop(BOON_OFFER_KEY, None)
        loop = replace(loop, state=state)
        self.store.save_loop(loop)
        return self._snapshot_from_loop(player, loop, options)

    @staticmethod
    def _current_route_node(loop: LoopState) -> dict[str, Any]:
        state = loop.state if isinstance(loop.state, dict) else {}
        route = state.get(ROUTE_MAP_KEY)
        if not isinstance(route, dict):
            return {}
        node = (route.get("nodes") or {}).get(route.get("current"))
        return node if isinstance(node, dict) else {}

    def _market_view(self, loop: LoopState, options: RuntimeOptions) -> dict[str, Any] | None:
        """Scrap→item exchange offers while standing on a market route node.

        Data-driven from ``combat.market_exchange`` ([{give, count, get}]); scenarios
        without the config (or without a route map, e.g. glass-library) get None —
        fully backward compatible. Affordability is computed against the loop
        inventory so the client can disable unaffordable offers.
        """
        if self._current_route_node(loop).get("type") != "market":
            return None
        try:
            scenario = load_scenario(options.scenario_id)
        except Exception:
            return None
        config = scenario.combat.get("market_exchange")
        if not isinstance(config, list) or not config:
            return None
        items_def = scenario.combat.get("items", {})
        inventory = loop.state.get("_inventory", []) if isinstance(loop.state, dict) else []
        held: dict[str, int] = {}
        for entry in inventory:
            item_id = (
                str(entry.get("id") or entry.get("item_id") or "")
                if isinstance(entry, dict)
                else str(entry)
            )
            if item_id:
                held[item_id] = held.get(item_id, 0) + 1
        # B3 market-boom style modifiers cheapen barter ("교환비↓"), floor 1.
        cost_delta = modifier_effect(loop.state, "market_cost_delta")
        offers = []
        for offer in config:
            if not isinstance(offer, dict):
                continue
            give, get_id = str(offer.get("give", "")), str(offer.get("get", ""))
            count = max(1, int(offer.get("count", 1) or 1) + cost_delta)
            give_def, get_def = items_def.get(give, {}), items_def.get(get_id, {})
            offers.append(
                {
                    "give": give,
                    "give_name": give_def.get("name", give),
                    "count": count,
                    "get": get_id,
                    "get_name": get_def.get("name", get_id),
                    "get_kind": get_def.get("kind", ""),
                    "affordable": held.get(give, 0) >= count,
                }
            )
        if not offers:
            return None
        view: dict[str, Any] = {"offers": offers, "held": held}
        # Canon vendor (e.g. Lin-yue's broker network) so the barter has a face —
        # surfaced in the UI header and echoed to the GM as a scene note.
        vendor = scenario.combat.get("market_vendor")
        if isinstance(vendor, dict) and vendor.get("name"):
            view["vendor"] = {"id": vendor.get("id", ""), "name": vendor["name"]}
        return view

    def exchange_material(
        self, loop_id: str, give: str, get: str, options: RuntimeOptions | None = None
    ) -> RuntimeSnapshot:
        """Trade materials for an item at a market route node (data-driven rates)."""
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        if CombatService.is_active(loop):
            raise RuntimeError("cannot trade during active combat")
        if self._current_route_node(loop).get("type") != "market":
            raise RuntimeError("no market at the current route node")
        player = self._require_player(loop.player_id)
        scenario = load_scenario(options.scenario_id)
        config = scenario.combat.get("market_exchange")
        offer = next(
            (
                o
                for o in (config if isinstance(config, list) else [])
                if isinstance(o, dict) and str(o.get("give")) == give and str(o.get("get")) == get
            ),
            None,
        )
        if offer is None:
            raise RuntimeError(f"no such exchange offer: {give} -> {get}")
        # Mirror the _market_view B3 cost delta so the charged count matches the offer shown.
        count = max(
            1, int(offer.get("count", 1) or 1) + modifier_effect(loop.state, "market_cost_delta")
        )
        state = dict(loop.state) if isinstance(loop.state, dict) else {}
        inventory = list(state.get("_inventory", []))

        def _entry_id(entry: Any) -> str:
            return (
                str(entry.get("id") or entry.get("item_id") or "")
                if isinstance(entry, dict)
                else str(entry)
            )

        matching = [i for i, e in enumerate(inventory) if _entry_id(e) == give]
        if len(matching) < count:
            raise RuntimeError(f"not enough {give}: need {count}, have {len(matching)}")
        for index in sorted(matching[:count], reverse=True):
            inventory.pop(index)
        items_def = scenario.combat.get("items", {})
        inventory.append(items_def.get(get, {"id": get, "name": get}))
        state["_inventory"] = inventory
        loop = replace(loop, state=state)
        self.store.save_loop(loop)
        return self._snapshot_from_loop(player, loop, options)

    def _redirect_to_active_combat(
        self, loop_id: str, options: RuntimeOptions
    ) -> RuntimeSnapshot | None:
        """Return the live combat snapshot when a narrative choice arrives mid-combat.

        A narrative ``choose``/``stream_choose`` must never generate a story scene
        on top of an unresolved combat: doing so orphans ``_combat.active=true`` in
        the loop state, which then permanently blocks every future combat launch —
        including the IX climax (the ``not is_active`` guard in ``_commit_scene``).
        Combat turns are driven by ``combat_action``; a narrative call here is a
        client desync, so re-sync it to the live fight instead of corrupting state.
        Returns ``None`` (proceed with narrative) when no combat is active.
        """
        loop = self.store.get_loop(loop_id)
        if loop is None or loop.phase is LoopPhase.ENDED:
            return None
        if not CombatService.is_active(loop):
            return None
        player = self._require_player(loop.player_id)
        scene = self.store.get_latest_scene(loop.loop_id)
        if scene is None:
            return None
        return self._snapshot_from_loop(player, loop, options, scene=scene)

    def choose(
        self,
        loop_id: str,
        choice_id: str | None = None,
        action: str | None = None,
        options: RuntimeOptions | None = None,
        scene_id: str | None = None,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        stale = self._snapshot_for_stale_choice(loop_id, scene_id, options)
        if stale is not None:
            return stale
        redirect = self._redirect_to_active_combat(loop_id, options)
        if redirect is not None:
            return redirect
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
            choice_relationship=prepared.choice_relationship,
            cutscene_id=prepared.cutscene_id,
        )

    def stream_choose(
        self,
        loop_id: str,
        choice_id: str | None = None,
        action: str | None = None,
        options: RuntimeOptions | None = None,
        scene_id: str | None = None,
    ) -> Iterator[RuntimeStreamEvent]:
        options = options or RuntimeOptions()
        stale = self._snapshot_for_stale_choice(loop_id, scene_id, options)
        if stale is not None:
            yield RuntimeStreamEvent(kind="final", snapshot=stale)
            return
        redirect = self._redirect_to_active_combat(loop_id, options)
        if redirect is not None:
            yield RuntimeStreamEvent(kind="final", snapshot=redirect)
            return
        # Defer the scene image so the choice-carrying snapshot ships before the
        # slow (~6-15s p50/max on prod) image generation, which then runs after the
        # snapshot and returns as a trailing visual event.
        options = replace(options, defer_image=True)
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
                choice_relationship=prepared.choice_relationship,
                cutscene_id=prepared.cutscene_id,
            )
            yield RuntimeStreamEvent(kind="final", snapshot=snapshot)
            # Choices are delivered; generate the scene image off the critical path
            # and hand it back so the socket relays a trailing visual_status frame.
            image_result = self._maybe_generate_image(
                options, snapshot.loop, snapshot.scene, player.player_id
            )
            if image_result is not None:
                yield RuntimeStreamEvent(kind="visual", visual=image_result)

    def _snapshot_for_stale_choice(
        self,
        loop_id: str,
        scene_id: str | None,
        options: RuntimeOptions,
    ) -> RuntimeSnapshot | None:
        """Make a retried choice from an old scene idempotent.

        Browsers and networks may duplicate a click/frame. The first request
        advances the loop; a retry must return the authoritative current scene
        instead of resolving the old choice against the new scene and raising
        ``choice not found``. Legacy clients without ``scene_id`` keep the old
        strict behavior.
        """

        if not scene_id:
            return None
        latest = self.store.get_latest_scene(loop_id)
        if latest is None or latest.scene_id == scene_id:
            return None
        return self.resume(loop_id=loop_id, options=options)

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

        return self._snapshot_from_loop(
            player, loop, options, scene=scene, include_finished_combat=True
        )

    def list_active_loops(self, player_id: str) -> list[LoopState]:
        self._require_player(player_id)
        return [
            loop for loop in self.store.list_loops(player_id) if loop.phase is not LoopPhase.ENDED
        ]

    def list_save_slots(self, player_id: str, limit: int = 20) -> list[SaveSlot]:
        self._require_player(player_id)
        return self.save_load.list_save_slots(player_id, limit)

    def save_slot(
        self, loop_id: str, label: str | None = None, slot_id: str | None = None
    ) -> SaveSlot:
        return self.save_load.save_slot(loop_id, label=label, slot_id=slot_id)

    def delete_save_slot(self, player_id: str, slot_id: str) -> int:
        self._require_player(player_id)
        return self.save_load.delete_save_slot(player_id, slot_id)

    def load_save_slot(
        self, player_id: str, slot_id: str, options: RuntimeOptions | None = None
    ) -> RuntimeSnapshot:
        """Load a save slot: restore its snapshot (manual saves) then resume.

        Legacy/autosave bookmark slots carry no snapshot — they just resume the
        live loop they point at. After a restore the read cache is refreshed so
        ``resume`` serves the restored moment, never a stale pre-load snapshot.
        """
        options = options or RuntimeOptions()
        restored = self.save_load.restore_slot(player_id, slot_id)
        if restored is None:
            slot = next(
                (s for s in self.list_save_slots(player_id, limit=60) if s.slot_id == slot_id),
                None,
            )
            if slot is None:
                raise RuntimeError(f"save slot not found: {slot_id}")
            return self.resume(loop_id=slot.loop_id, options=options)
        player = self._require_player(player_id)
        return self._snapshot_from_loop(player, restored, options)

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

    def _resolved_archetype(self, player: PlayerProfile, scenario_id: str) -> str | None:
        """Stable archetype id for combat/progression joins.

        Prefers the persisted ``archetype_id``; falls back to resolving a legacy/
        display-name ``archetype`` (old saves) to its id via the scenario table.
        """
        if not isinstance(player.traits, dict):
            return None
        raw = player.traits.get("archetype_id") or player.traits.get("archetype")
        if not raw:
            return None
        try:
            return resolve_archetype_id(load_scenario(scenario_id), raw)
        except Exception:
            return str(raw)

    def skill_tree(self, player_id: str, scenario_id: str) -> dict[str, Any]:
        player = self._require_player(player_id)
        archetype = self._resolved_archetype(player, scenario_id)
        return self.progression.skill_tree(player_id, scenario_id, archetype)

    def learn_skill(self, player_id: str, scenario_id: str, skill_id: str) -> dict[str, Any]:
        player = self._require_player(player_id)
        archetype = self._resolved_archetype(player, scenario_id)
        return self.progression.learn_skill(player_id, scenario_id, skill_id, archetype)

    def _apply_meta_progression(
        self,
        player: PlayerProfile,
        run_summary_memory: WorldMemory,
        *,
        previous: MetaProgression | None = None,
    ) -> tuple[WorldMemory, MetaProgression, PlayerProfile]:
        scenario_id = str(run_summary_memory.content.get("scenario_id") or "neo-seoul")
        # ``previous`` is a progression this transition already advanced but has
        # not written yet (combat reward insight); reading the store here instead
        # would build the run-summary unlocks on stale points and then overwrite
        # the reward when both land in the same transaction.
        if previous is None or previous.scenario_id != scenario_id:
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
                **self._progress_facts(player, loop),
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
        # `archive()` has no RuntimeOptions — the loop's own persisted language is
        # the only source, and an EN loop must not archive a Korean summary.
        summary_text = self.director.summarize_loop(
            event_dicts, language=_loop_language(loop)
        )
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
            **self._progress_facts(snapshot_player, ended_loop),
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
            # Gear worn by a companion (equipped_by=<ally id>) buffs THEM, not
            # the player (absent/"player" = player, legacy entries included).
            if entry.get("equipped_by") not in (None, "player"):
                continue
            definition = items.get(str(entry.get("id") or entry.get("item_id") or ""), {})
            bonus = definition.get("stats") if isinstance(definition, dict) else None
            if isinstance(bonus, dict):
                for stat, value in bonus.items():
                    if isinstance(value, int | float):
                        base[stat] = base.get(stat, 0) + int(value)
        # In-run build boons (this loop only) fold into the same stat channel, so a
        # small party can still scale into the IX climax through build choices.
        run_boons = loop.state.get(RUN_BOONS_KEY) if isinstance(loop.state, dict) else None
        for stat, value in boon_stat_bonus(run_boons).items():
            base[stat] = base.get(stat, 0) + int(value)
        # Inscribed echoes (memory carried from prior loops) add their run modifier.
        inscribed = loop.state.get(INSCRIBED_ECHOES_KEY) if isinstance(loop.state, dict) else None
        for stat, value in echo_stat_bonus(inscribed).items():
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
            if (
                not item_id
                or not isinstance(definition, dict)
                or definition.get("kind") != "consumable"
            ):
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
                # Ground-targeted throwables (EMP 수류탄): the client needs the
                # throw range + blast radius to run the XCOM-style cell picker.
                "range": items_def[item_id].get("range"),
                "radius": items_def[item_id].get("radius"),
            }
            for item_id in order
        ]

    def _snapshot_from_loop(
        self,
        player: PlayerProfile,
        loop: LoopState,
        options: RuntimeOptions | None = None,
        *,
        scene: Scene | None = None,
        include_finished_combat: bool = False,
    ) -> RuntimeSnapshot:
        """Read-only snapshot of the loop's current scene (no advance).

        The single constructor behind inscribe_echo / choose_boon /
        exchange_material / resume / load_save_slot / equip_item — they used to
        be seven hand-rolled copies differing only in which optional views they
        omitted. ``boons``/``market`` are always filled (``_market_view`` is None
        off a market node). ``combat`` follows the live fight; ``resume``-style
        callers also want a *finished* fight's view when the scene is a combat
        scene, which ``include_finished_combat`` opts into.
        """
        options = options or RuntimeOptions()
        if scene is None:
            scene = self.store.get_latest_scene(loop.loop_id)
        if scene is None:
            raise RuntimeError(f"loop_id={loop.loop_id} has no scenes")
        show_combat = CombatService.is_active(loop) or (
            include_finished_combat and scene.scene_type == "combat"
        )
        return RuntimeSnapshot(
            player=player,
            loop=loop,
            scene=scene,
            assets=self.store.list_assets(loop.loop_id),
            bgm_path=self.audio.get_current_bgm(loop, scene),
            combat=self._combat_snapshot(loop, options) if show_combat else None,
            **self._progress_facts(player, loop),
            boons=self._boons_view(loop, options),
            market=self._market_view(loop, options),
        )

    def equip_item(
        self,
        loop_id: str,
        item_id: str,
        equipped: bool = True,
        wearer: str | None = None,
    ) -> RuntimeSnapshot:
        """Toggle an equipment item's worn state (one item per slot PER WEARER).

        ``wearer`` is "player" (default/legacy) or a party member id — companions
        wear gear too, and their combat build folds it in (`_build_allies`)."""
        loop = self._require_loop(loop_id)
        player = self._require_player(loop.player_id)
        scenario = load_scenario(str(loop.state.get("scenario_id") or "neo-seoul"))
        items = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
        target_def = items.get(item_id, {}) if isinstance(items, dict) else {}
        target_slot = target_def.get("slot") if isinstance(target_def, dict) else None
        wearer_id = str(wearer or "player")
        if wearer_id != "player":
            party = loop.state.get("_party") if isinstance(loop.state, dict) else {}
            members = party.get("members", []) if isinstance(party, dict) else []
            member_ids = {
                str(m.get("id")) if isinstance(m, dict) else str(m) for m in members
            }
            if wearer_id not in member_ids:
                raise RuntimeError(f"wearer {wearer_id!r} is not in the current party")
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
                if equipped:
                    entry["equipped_by"] = wearer_id
                else:
                    entry.pop("equipped_by", None)
            elif equipped and target_slot is not None:
                # only one item per slot may be worn — per wearer.
                other = items.get(eid, {}) if isinstance(items, dict) else {}
                same_wearer = str(entry.get("equipped_by") or "player") == wearer_id
                if isinstance(other, dict) and other.get("slot") == target_slot and same_wearer:
                    entry["equipped"] = False
                    entry.pop("equipped_by", None)
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
        test_kit: bool = False,
    ) -> RuntimeSnapshot:
        options = options or RuntimeOptions()
        loop = self._require_loop(loop_id)
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop.loop_id} is ended")
        if test_kit:
            # Combat-simulator test kit (owner 2026-07-12 "바뀐 부분 전부 테스트
            # 가능하게"): a fresh sim loop has no insight unlocks and no
            # consumables, hiding tier-1 skills (자기 반발/과부하 일격 …) and the
            # EMP grenade from the sandbox. Grant the full skill pool + sample
            # throwables so every combat feature is exercisable.
            scenario_for_kit = load_scenario(options.scenario_id)
            skills_pool = (
                scenario_for_kit.combat.get("skills", {})
                if isinstance(scenario_for_kit.combat, dict)
                else {}
            )
            state = dict(loop.state) if isinstance(loop.state, dict) else {}
            meta = dict(state.get("meta_progression") or {})
            meta["learned_skills"] = sorted(skills_pool.keys())
            state["meta_progression"] = meta
            inventory = list(state.get("_inventory") or [])
            inventory += [
                "emp_grenade", "emp_grenade",
                "incendiary_grenade", "cryo_grenade",
                "nanopatch", "nanopatch",
            ]
            state["_inventory"] = inventory
            loop = replace(loop, state=state)
        if party_members is not None:
            party = dict(loop.state.get("_party", {})) if isinstance(loop.state, dict) else {}
            party["members"] = [dict(member) for member in party_members]
            # Simulator contract (owner 2026-07-12 "세린을 선택 안 해도 항상
            # 참전"): an explicit roster is EXCLUSIVE — story-flag allies
            # (unlock_flags∩flags, e.g. the opening's se_rin) must not ride in.
            party["exclusive"] = True
            state = dict(loop.state) if isinstance(loop.state, dict) else {}
            state["_party"] = party
            loop = replace(loop, state=state)
        player = self._require_player(loop.player_id)
        scenario = load_scenario(options.scenario_id)
        archetype = self._resolved_archetype(player, options.scenario_id)

        with span("mythos.session.combat_start", player_id=player.player_id, loop_id=loop.loop_id):
            result = self.combat.begin(
                loop,
                scenario_combat=scenario.combat,
                encounter_id=encounter_id,
                player_name=player.display_name,
                player_stats=self._player_combat_stats(player, loop, scenario),
                archetype=archetype,
                language=options.language,
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
            # The encounter *id* is an internal token: it reached the archived
            # `final_location`, save-slot labels and the image `LOC:` overlay as
            # raw text (`ix_confrontation`). The interstitial already treats
            # `location_hint` as the player-facing place, so reuse it here.
            location=self._encounter_location(encounter_id, options) or loop.location_id,
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
        combat_progress: MetaProgression | None = None
        boss_climax = False
        if result.finished:
            loop, combat_progress = self._apply_combat_rewards(loop, result)
            boss_climax = self._is_boss_climax_encounter(encounter_id, options)
            if boss_climax:
                # The IX climax has a definite outcome — win or lose ENDS the run.
                # Victory resolves the perspective-driven ending; defeat resolves
                # the erasure/capture ending. Never a recoverable soft defeat here:
                # an unwinnable boss soft-defeated every turn would re-throw the
                # fight forever (live 2026-07-03 "선택지→전투 무한루프").
                loop = self._resolved_boss_climax_loop(
                    loop, victory=(result.outcome == "player_victory")
                )
            elif result.outcome == "player_defeat":
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
            if boss_climax:
                echo = Echo(
                    echo_id=f"echo_{combat_event.event_id.removeprefix('event_')}",
                    source_loop_id=loop.loop_id,
                    source_event_id=combat_event.event_id,
                    symbol=_symbol_from_scene(scene),
                    text=(
                        f"{scene.title}: "
                        + ("관리자 IX 대면" if result.outcome == "player_victory" else "소거")
                    ),
                )
                loop = replace(loop, active_echoes=[*loop.active_echoes, echo])

        run_summary_memory: WorldMemory | None = None
        meta_progress: MetaProgression | None = None
        snapshot_player = player
        archive_memory: WorldMemory | None = None
        archive_shard: NarrativeShard | None = None
        if result.finished and loop.phase is LoopPhase.ENDED:
            world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
            # The boss climax ends the run here, not through archive() — which
            # returns early on an ENDED loop — so this path must persist the same
            # archive bundle: the loop_archive memory feeds the next loop's
            # starting scores and the memory overview, the shard feeds the codex.
            if not _has_archive_world_memory(
                world_memories, loop_id=loop.loop_id, player_id=loop.player_id
            ):
                archive_memory = _world_memory_from_archive(loop, scene)
            if echo is not None and not _has_narrative_shard(
                self.store.list_narrative_shards(loop.player_id, limit=100), loop_id=loop.loop_id
            ):
                archive_shard = _narrative_shard_from_archive(loop, scene, echo)
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
                    event_dicts,
                    use_llm=not (options.fallback or options.fast_mode),
                    language=options.language,
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
                    previous=combat_progress,
                )

        if result.finished and isinstance(loop.state, dict):
            # Stamp combat pacing markers so the narrative path can enforce a
            # cooldown (no back-to-back combat) and an early-game difficulty cap.
            stamped = dict(loop.state)
            stamped["_last_combat_turn"] = turn_index
            story_turn = stamped.get("_story_turn")
            # Combat rounds consume raw scene turns but not the narrative clock.
            # Store both clocks: raw remains the post-combat callback seam, while
            # ambient pacing uses the story clock. Legacy loops fall back safely.
            stamped["_last_combat_story_turn"] = (
                story_turn if isinstance(story_turn, int) else turn_index
            )
            # Markers for the post-combat narrative callback (#5: bridge the
            # tactical board back into the story). Kept separate from
            # ``_last_combat_outcome`` (soft-defeat state machine) to avoid clobber.
            stamped["_last_combat_result"] = result.outcome
            enc_id = result.radar.get("encounter_id") if isinstance(result.radar, dict) else None
            if enc_id:
                stamped["_last_combat_encounter"] = str(enc_id)
            if result.outcome == "player_victory":
                stamped["_combat_count"] = int(stamped.get("_combat_count", 0)) + 1
                # Reward a win with an in-run build pick (Hades-style). Skipped at
                # the boss climax (the run is ending) and if an offer is pending.
                if not boss_climax and not stamped.get(BOON_OFFER_KEY):
                    boon_offer = offer_boons(
                        seed=loop.seed,
                        turn_index=turn_index,
                        taken=stamped.get(RUN_BOONS_KEY) or [],
                    )
                    if boon_offer:
                        stamped[BOON_OFFER_KEY] = boon_offer
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
            # Reward insight lands in the same transaction as the loop state that
            # records it as applied; committing it early (as this used to) let a
            # failed save_loop re-credit the reward on the retried turn.
            if combat_progress is not None:
                persist_progression(self.store, combat_progress)
            if archive_memory is not None:
                self.store.save_world_memory(archive_memory)
            if archive_shard is not None:
                self.store.save_narrative_shard(archive_shard)
            if run_summary_memory is not None:
                self.store.save_world_memory(run_summary_memory)
                if meta_progress is not None:
                    persist_progression(self.store, meta_progress)
                    self.store.create_player(snapshot_player)

        if archive_memory is not None:
            _compact_player_archives(self.store, loop.player_id)

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
        combat_snapshot = RuntimeSnapshot(
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
                    load_scenario(options.scenario_id)
                    .combat.get("encounters", {})
                    .get(encounter_id, {})
                    if encounter_id
                    else {}
                ),
                "consumables": self._combat_consumables(loop, load_scenario(options.scenario_id)),
                "defeat_soft": _is_soft_defeat(loop),
            },
            **self._progress_facts(snapshot_player, loop),
            boons=self._boons_view(loop, options),
        )
        return combat_snapshot

    @staticmethod
    def _unheralded_allies(loop: LoopState, scenario: Any) -> list[dict[str, str]]:
        """Flag-unlocked non-party allies with no companion-ref beat this loop.

        These are the C3 "pop-in" cases: an ``unlock_flags`` grant (often a bare
        LLM ``world_delta`` flag) put them on the combat roster without any
        narrative introduction. Party members are excluded — joining the party
        is always a deliberate on-screen event.
        """
        state = loop.state if isinstance(loop.state, dict) else {}
        allies_pool = (
            scenario.combat.get("allies", {}) if isinstance(scenario.combat, dict) else {}
        )
        if not isinstance(allies_pool, dict):
            return []
        party = state.get("_party")
        members = party.get("members", []) if isinstance(party, dict) else []
        member_ids = {
            str(m.get("id")) for m in members if isinstance(m, dict) and m.get("id")
        }
        flags = {str(flag) for flag in state.get("flags", []) or []}
        seen_names = set(companions_seen(state))
        joining: list[dict[str, str]] = []
        for ally_id, entry in allies_pool.items():
            if not isinstance(entry, dict):
                continue
            actual_id = str(entry.get("id", ally_id))
            if actual_id in member_ids:
                continue
            unlock_flags = {str(flag) for flag in entry.get("unlock_flags", []) or []}
            if not unlock_flags & flags:
                continue
            name = str(entry.get("name") or actual_id)
            if name in seen_names:
                continue
            joining.append({"id": actual_id, "name": name})
        return joining

    def _begin_requested_combat(
        self,
        player: PlayerProfile,
        loop: LoopState,
        encounter_id: str,
        options: RuntimeOptions,
        *,
        origin: str = "ambient",
    ) -> RuntimeSnapshot:
        scenario = load_scenario(options.scenario_id)
        encounters = (
            scenario.combat.get("encounters", {}) if isinstance(scenario.combat, dict) else {}
        )
        if encounter_id not in encounters:
            raise RuntimeError(f"unknown combat encounter requested: {encounter_id}")
        # Combat telegraph: stage the transition-beat descriptor so the client can
        # render a 1-beat interstitial (encounter name / place / authored hook line)
        # before the tactical board — a fight announces itself instead of an
        # ambush-by-UI. ``origin`` distinguishes a deliberate route-node fight
        # ("route"/"boss") from ambient escalation ("ambient").
        encounter_meta = encounters[encounter_id]
        interstitial_state = dict(loop.state) if isinstance(loop.state, dict) else {}
        descriptor: dict[str, Any] = {
            "encounter": encounter_id,
            "name": encounter_meta.get("name"),
            "location": encounter_meta.get("location_hint"),
            "kind": origin,
            "line": encounter_meta.get("intro"),
        }
        # C3 unheralded-ally HOLD (owner 2026-07-11, replaces the announce-and-join
        # signal): a flag-unlocked non-party ally never referenced by any beat this
        # loop does NOT enter this fight — a route node-entry effect can set
        # ``met_han`` before the prose ever introduces Han (live: "사이드: 러너의
        # 지름길" node entry → Han popped into the next combat "뜬금없이"). Held
        # allies join the first combat AFTER the narration names them (record_beat
        # ledgers prose refs every committed scene).
        held = self._unheralded_allies(loop, scenario)
        interstitial_state[COMBAT_INTERSTITIAL_KEY] = descriptor
        # Combat IS the world reacting — reset the C1 no-op streak.
        interstitial_state.pop("_noop_turns", None)
        loop = replace(loop, state=interstitial_state)
        archetype = self._resolved_archetype(player, options.scenario_id)
        result = self.combat.begin(
            loop,
            scenario_combat=scenario.combat,
            encounter_id=encounter_id,
            player_name=player.display_name,
            player_stats=self._player_combat_stats(player, loop, scenario),
            archetype=archetype,
            language=options.language,
            exclude_ally_ids={ally["id"] for ally in held},
        )
        return self._commit_combat_turn(player, result, "combat triggered by scene", options)

    def _combat_snapshot(self, loop: LoopState, options: RuntimeOptions) -> dict[str, Any] | None:
        state = CombatService.load_state(loop)
        if state is None:
            return None
        # Prefer the loop's own scenario over ``options.scenario_id`` (which
        # defaults to neo-seoul): ``resume`` is reachable with default options
        # (e.g. connect_cli), so a mid-combat glass-library loop would otherwise
        # build its combat snapshot from the wrong scenario's encounter/reward
        # data. Mirrors the ``equip_item`` resolution.
        scenario_id = loop.state.get("scenario_id") if isinstance(loop.state, dict) else None
        scenario = load_scenario(scenario_id or options.scenario_id)
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

    def _is_boss_climax_encounter(self, encounter_id: Any, options: RuntimeOptions) -> bool:
        """True when a finished combat's encounter is the authored climax boss.

        Keys off the scenario route map's ``combat_encounters['boss']`` pool
        (``ix_confrontation`` for neo-seoul) rather than the route pointer, so it
        is unaffected by ambient combat that coincides on the boss node.
        """
        if not encounter_id:
            return False
        try:
            scenario = load_scenario(options.scenario_id)
        except Exception:
            return False
        route_map = scenario.route_map if isinstance(scenario.route_map, dict) else {}
        boss_pool = (route_map.get("combat_encounters") or {}).get("boss") or []
        return str(encounter_id) in {str(e) for e in boss_pool}

    # Boss-anchor perspective effects stamp one of these flags; on a climax
    # VICTORY they take priority over the numeric resolver ("victory resolves
    # the perspective-driven ending"). Order = authored specificity.
    _PERSPECTIVE_ENDING_FLAGS = (
        ("code_rewrite", "ending_code_rewrite"),
        ("noble_sacrifice", "ending_noble_sacrifice"),
        ("erased", "ending_erasure"),
        ("safe_refuge", "ending_safe_refuge"),
    )

    def _resolved_boss_climax_loop(self, loop: LoopState, *, victory: bool) -> LoopState:
        """End the loop at the climax with a resolved ending (win or lose).

        Victory resolves the perspective-driven ending (rewrite/sacrifice/refuge);
        defeat resolves the erasure/capture fallback. Either way the loop reaches
        ``ENDED`` so the climax owns the run's end instead of re-throwing combat.
        """
        narrative_shards = self.store.list_narrative_shards(loop.player_id, limit=1000)
        clue_count = len([s for s in narrative_shards if s.kind == "clue"])
        # Victory honors the boss perspective first (live 2026-07-04: a WON climax
        # resolved to Forced Erasure because the numeric erasure condition —
        # Resilience<5 && Tension>90 — is nearly always true at the boss, and the
        # perspective flags were never consulted).
        perspective_ending: str | None = None
        if victory and isinstance(loop.state, dict):
            flags = set(loop.state.get("flags") or [])
            perspective_ending = next(
                (eid for flag, eid in self._PERSPECTIVE_ENDING_FLAGS if flag in flags), None
            )
        if perspective_ending:
            loop_state = self._apply_ending_fields(dict(loop.state), perspective_ending, loop)
        else:
            loop_state = self._resolved_ending_state(
                loop,
                clue_count=clue_count,
                context="boss_victory" if victory else "boss_defeat",
                combat_defeat_fallback=not victory,
            )
        if (
            victory
            and perspective_ending is None
            and (
                not loop_state.get("ending_id")
                # A WON climax must never read as the defeat ending unless the
                # authored 'erased' perspective chose it above.
                or loop_state.get("ending_id") == "ending_erasure"
            )
        ):
            # Guarantee the climax always shows an ending: a victory with no
            # perspective-matched ending falls back to the first authored (survival)
            # ending. Defeat already fell back to erasure via ``combat_defeat_fallback``.
            scenario_id = str(loop_state.get("scenario_id") or "neo-seoul")
            try:
                endings = load_scenario(scenario_id).endings or []
            except Exception:
                endings = []
            fallback = next(
                (e for e in endings if e.get("id") != "ending_erasure"),
                endings[0] if endings else None,
            )
            if fallback:
                loop_state = dict(loop_state)
                loop_state["ending_id"] = fallback.get("id")
                loop_state["ending_label"] = (
                    fallback.get("label") or fallback.get("title") or "Ended Loop"
                )
                if isinstance(fallback.get("image"), str):
                    loop_state["ending_image"] = fallback["image"]
                narration = self._ending_narration_text(
                    scenario_id, loop_state.get("ending_id"), loop
                )
                if narration:
                    loop_state["ending_narration"] = narration
        return replace(
            loop,
            phase=LoopPhase.ENDED,
            ended_at=utc_now(),
            state=loop_state,
        )

    def _apply_ending_fields(
        self, loop_state: dict[str, Any], ending_id: str, loop: LoopState
    ) -> dict[str, Any]:
        """Stamp id/label/image/narration for a KNOWN ending id (perspective path)."""
        scenario_id = str(loop_state.get("scenario_id") or "neo-seoul")
        loop_state["ending_id"] = ending_id
        try:
            ending = next(
                (
                    item
                    for item in load_scenario(scenario_id).endings
                    if isinstance(item, dict) and item.get("id") == ending_id
                ),
                None,
            )
        except Exception:
            ending = None
        if ending:
            loop_state["ending_label"] = (
                ending.get("label") or ending.get("title") or ending_id
            )
            if isinstance(ending.get("image"), str):
                loop_state["ending_image"] = ending["image"]
        narration = self._ending_narration_text(scenario_id, ending_id, loop)
        if narration:
            loop_state["ending_narration"] = narration
        return loop_state

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
        if ending_id:
            try:
                ending = next(
                    (
                        item
                        for item in load_scenario(scenario_id).endings
                        if isinstance(item, dict) and item.get("id") == ending_id
                    ),
                    None,
                )
                if ending and isinstance(ending.get("image"), str):
                    loop_state["ending_image"] = ending["image"]
            except Exception:
                pass
        narration = self._ending_narration_text(scenario_id, ending_id, loop)
        if narration:
            loop_state["ending_narration"] = narration
        return loop_state

    def _ending_narration_text(
        self, scenario_id: str, ending_id: str | None, loop: LoopState
    ) -> str:
        """Player-facing 1-2 sentence cause for the ENDED screen.

        Prefers the scenario's authored ``endings[].narration`` for the resolved
        ending; otherwise narrates the *why* of a threshold archive (tracking
        maxed / signal lost) so the end screen reads as a story beat instead of a
        bare mechanical number ("추적도 98").
        """
        if ending_id:
            try:
                scenario = load_scenario(scenario_id)
                for ending in scenario.endings:
                    if isinstance(ending, dict) and ending.get("id") == ending_id:
                        narration = ending.get("narration")
                        if isinstance(narration, str) and narration.strip():
                            return narration.strip()
            except Exception:
                pass
        if loop.tension >= 90:
            return "관리망의 추적이 임계에 다다라, 집행부대가 끝내 당신의 신호를 특정해 정정 집행을 내렸다."
        if loop.stability <= 10:
            return "신호가 더는 형상을 유지하지 못하고, 접속이 풀리며 이번 루프가 닫혔다."
        return ""

    def _apply_combat_rewards(
        self, loop: LoopState, result: CombatTurnResult
    ) -> tuple[LoopState, MetaProgression | None]:
        encounter_id = result.radar.get("encounter_id") if isinstance(result.radar, dict) else None
        encounter_id = str(encounter_id) if encounter_id else None
        if result.outcome == "player_fled":
            return replace(loop, state=mark_encounter_alerted(loop.state, encounter_id)), None
        if result.outcome != "player_victory":
            return loop, None

        reward = (
            result.rewards.get("encounter_reward", {}) if isinstance(result.rewards, dict) else {}
        )
        if not isinstance(reward, dict):
            return loop, None
        loop = replace(loop, state=mark_encounter_resolved(loop.state, encounter_id))
        stability = _clamp_score(loop.stability + int(reward.get("stability", 0)))
        tension = _clamp_score(loop.tension + int(reward.get("tension", 0)))
        insight = max(0, int(reward.get("insight", 0) or 0))
        # B3 patrol-surge style modifiers sweeten victory insight ("전투 빈도↑ 보상↑").
        if insight > 0:
            insight = max(0, insight + modifier_effect(loop.state, "combat_insight_bonus"))

        progress: MetaProgression | None = None
        if insight > 0:
            scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
            previous = load_progression(self.store, loop.player_id, scenario_id)
            progress = replace(previous, insight_points=previous.insight_points + insight)
            scenario = load_scenario(scenario_id)
            loop = replace(
                loop,
                state=apply_meta_progression_to_state(loop.state, progress, scenario.combat),
            )

        if stability == loop.stability and tension == loop.tension:
            return loop, progress
        return replace(loop, stability=stability, tension=tension), progress

    def _apply_route_node_reward(
        self,
        loop: LoopState,
        node_id: str,
        node: dict[str, Any],
        perspective: dict[str, Any] | None,
    ) -> tuple[LoopState, MetaProgression | None]:
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
            return loop, None
        applied = list(route.get("applied_rewards", []))
        if node_id in applied:
            return loop, None

        dstab = dtens = dins = 0
        heal_frac = 0.0
        if not node.get("combat"):
            reward_raw = node.get("reward")
            reward: dict[str, Any] = reward_raw if isinstance(reward_raw, dict) else {}
            dstab += int(reward.get("stability", 0) or 0)
            dtens += int(reward.get("tension", 0) or 0)
            dins += int(reward.get("insight", 0) or 0)
            heal_frac = float(reward.get("heal_frac", 0.0) or 0.0)
            # B3 signal-jam style modifiers sweeten clue payouts ("단서 보상↑").
            if node.get("type") == "clue":
                dins += modifier_effect(state, "clue_insight_bonus")
        if perspective:
            effect_raw = perspective.get("effect")
            effect: dict[str, Any] = effect_raw if isinstance(effect_raw, dict) else {}
            dstab += int(effect.get("stability", 0) or 0)
            dtens += int(effect.get("tension", 0) or 0)
            dins += int(effect.get("insight", 0) or 0)
        node_effect_raw = node.get("effect")
        node_effect: dict[str, Any] = node_effect_raw if isinstance(node_effect_raw, dict) else {}
        dstab += int(node_effect.get("stability", 0) or 0)
        dtens += int(node_effect.get("tension", 0) or 0)
        dins += int(node_effect.get("insight", 0) or 0)

        new_state = dict(state)
        new_route = {**route, "applied_rewards": [*applied, node_id]}
        if heal_frac > 0:
            new_route_party = _heal_party(new_state.get("_party"), heal_frac)
            if new_route_party is not None:
                new_state["_party"] = new_route_party
        new_state[ROUTE_MAP_KEY] = new_route
        loop = replace(loop, state=new_state)

        progress: MetaProgression | None = None
        if dins > 0:
            scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
            previous = load_progression(self.store, loop.player_id, scenario_id)
            progress = replace(previous, insight_points=previous.insight_points + dins)
            scenario = load_scenario(scenario_id)
            loop = replace(
                loop, state=apply_meta_progression_to_state(loop.state, progress, scenario.combat)
            )

        if dstab or dtens:
            loop = replace(
                loop,
                stability=_clamp_score(loop.stability + dstab),
                tension=_clamp_score(loop.tension + dtens),
            )
        return loop, progress

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
        state["_soft_defeat_turn"] = scene.turn_index + 1
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

    def _advance_narrative_state(
        self,
        *,
        transition: LoopTransition,
        loop: LoopState,
        scene: Scene,
        payload: ScenePayload,
        options: RuntimeOptions,
        player_event: WorldEvent | None,
        route_target: str | None,
        impact_base_loop: LoopState | None,
        choice_relationship: dict[str, int] | None,
        cutscene_id: str | None,
    ) -> _NarrativeAdvance:
        """The narrative-turn reducer: everything between the engine's transition
        and the transaction, with no store writes.

        Materialize items → clear soft-defeat → encounter map → relationship fold
        → story clock → rest → interstitial → twist lifecycle → pending boss →
        route advance + node reward → pre-climax threshold deferral → cutscene →
        junction choices → session-memory beat → choice impact / no-op streak →
        twist selection. ``loop`` is the loop BEFORE this turn (its phase and
        soft-defeat marker are inputs); ``transition`` is the engine's output.
        The single store *read* is the progression behind a route-node reward,
        which is returned as ``route_progress`` for the caller to persist inside
        the same transaction as the loop state.
        """
        scenario = load_scenario(options.scenario_id)
        # Materialize unconditionally (was: only on LLM grant_items) — bare item-id
        # strings also arrive via route/effect rewards, and an unmaterialized id
        # leaks raw into the 직전-결과 line ("획득 drone_scrap", owner 2026-07-11).
        # No-op when nothing in _inventory is a bare string.
        transition = replace(
            transition,
            loop=replace(
                transition.loop,
                state=_materialize_inventory_items(transition.loop.state, scenario),
            ),
        )
        if _is_recovery_scene_after_soft_defeat(loop, scene):
            transition = replace(
                transition,
                loop=replace(
                    transition.loop, state=_clear_soft_defeat_pending(transition.loop.state)
                ),
            )
        loop_after_map, triggered_combat = self._advance_encounter_map(
            transition.loop, payload, options, scene.turn_index
        )
        transition = replace(transition, loop=loop_after_map)

        # Fold the chosen scene choice's authored relationship delta (companion
        # affection) into loop state *before* the route advance, so the route
        # reconcile in ``advance_route`` preserves this non-route contribution.
        if choice_relationship:
            base_state = transition.loop.state if isinstance(transition.loop.state, dict) else {}
            folded_state = dict(base_state)
            folded_state["relationships"] = fold_relationship(
                base_state.get("relationships"), choice_relationship
            )
            transition = replace(transition, loop=replace(transition.loop, state=folded_state))

        # Route clock: count only *narrative* commits. Combat rounds also consume
        # scene ``turn_index`` (one scene per round), so pacing the route on the raw
        # index let a few long fights inflate the clock and skip whole story layers —
        # live 2026-07-04 (loop_dbbd07cb…): ~6 narrative scenes reached the IX boss
        # with 0 clues because each fight fast-forwarded target_layer. ``_story_turn``
        # increments once per narrative commit; legacy loops without the counter fall
        # back to ``scene.turn_index`` once and count normally from there.
        story_turn = _story_turn_for_commit(transition.loop.state, scene.turn_index)
        if isinstance(transition.loop.state, dict):
            transition = replace(
                transition,
                loop=replace(
                    transition.loop,
                    state={**transition.loop.state, "_story_turn": story_turn},
                ),
            )

        # Rest beat: each narrative commit heals the player and living party
        # members a little toward max HP (REST_RECOVERY_HP), so carried combat
        # damage fades over quiet turns instead of compounding all loop.
        transition = replace(
            transition,
            loop=replace(transition.loop, state=_apply_rest_recovery(transition.loop.state)),
        )

        # The combat-entry interstitial descriptor is transient: any narrative
        # commit after the fight began clears it (mirrors ``_active_cutscene``).
        if isinstance(transition.loop.state, dict) and (
            COMBAT_INTERSTITIAL_KEY in transition.loop.state
        ):
            cleared_interstitial = dict(transition.loop.state)
            cleared_interstitial.pop(COMBAT_INTERSTITIAL_KEY, None)
            transition = replace(
                transition, loop=replace(transition.loop, state=cleared_interstitial)
            )

        # G2 twist lifecycle: the scene being committed is the one whose prompt
        # saw the pending twist — promote it to the active (delivery) marker so
        # the snapshot pairs it with the sting+glitch cues; a previous delivery
        # marker clears.
        if isinstance(transition.loop.state, dict):
            transition = replace(
                transition,
                loop=replace(
                    transition.loop, state=advance_twist_lifecycle(transition.loop.state)
                ),
            )

        # Boss buildup: a climax fight parked on node entry fires on the FIRST
        # choice made at the confrontation — the arrival commit stays a narrative
        # beat with choices (IX declares itself; the player answers), so the fight
        # lands as a consequence instead of an ambush-by-UI (live feedback
        # 2026-07-04: "마지막 노드 진입하자마자 급작스럽게 보스전").
        route_combat: str | None = None
        route_combat_kind: str | None = None
        if isinstance(transition.loop.state, dict):
            pending_boss = transition.loop.state.get("_pending_boss_combat")
            if pending_boss:
                cleared_state = dict(transition.loop.state)
                cleared_state.pop("_pending_boss_combat", None)
                transition = replace(transition, loop=replace(transition.loop, state=cleared_state))
                route_combat = str(pending_boss)
                route_combat_kind = "boss"
                transition = self._defer_threshold_archive_for_climax(
                    transition, prior_phase=loop.phase, payload=payload
                )

        # Advance the procedural route map: move the current node forward (honoring
        # the player's junction pick), resolve anchor perspectives from accumulated
        # flags, and tally ending influence. If the move enters a combat-type node,
        # trigger that node's encounter so combat/patrol/boss nodes mean combat.
        route_progress: MetaProgression | None = None
        if isinstance(transition.loop.state, dict) and transition.loop.state.get(ROUTE_MAP_KEY):
            prev_route = transition.loop.state[ROUTE_MAP_KEY]
            prev_current = prev_route.get("current")
            routed_state = advance_route(
                transition.loop.state,
                turn_index=story_turn,
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
                rewarded, route_progress = self._apply_route_node_reward(
                    transition.loop, new_current, entered, status.get("perspective")
                )
                transition = replace(transition, loop=rewarded)
                seen_encounters: list[str] = []
                if isinstance(transition.loop.state, dict):
                    raw_seen = transition.loop.state.get("_route_encounters_seen")
                    if isinstance(raw_seen, list):
                        seen_encounters = [str(e) for e in raw_seen]
                candidate = node_encounter_id(
                    entered,
                    scenario.route_map.get("combat_encounters"),
                    seed=transition.loop.seed,
                    exclude=seen_encounters,
                )
                if candidate and candidate in scenario.combat.get("encounters", {}):
                    if entered.get("type") == "boss":
                        # Buildup beat: park the climax so THIS commit stays a
                        # narrative confrontation scene (with choices); the fight
                        # fires on the player's next choice. Keep the loop live if
                        # a coincident tension/stability threshold would archive
                        # this same turn — the parked fight owns the loop's end.
                        staged_state = dict(transition.loop.state)
                        staged_state["_pending_boss_combat"] = candidate
                        transition = replace(
                            transition,
                            loop=replace(transition.loop, state=staged_state),
                        )
                        transition = self._defer_threshold_archive_for_climax(
                            transition, prior_phase=loop.phase, payload=payload
                        )
                    else:
                        route_combat = candidate
                        route_combat_kind = "route"
                        # Record the encounter so this loop's later combat nodes
                        # prefer unseen encounters (roster variety). Bounded window.
                        tracked_state = dict(transition.loop.state)
                        tracked_state["_route_encounters_seen"] = [
                            *seen_encounters,
                            candidate,
                        ][-8:]
                        transition = replace(
                            transition,
                            loop=replace(transition.loop, state=tracked_state),
                        )

                # Dynamic route growth: now that the pointer advanced, thicken the
                # upcoming horizon layers with the GM's proposed nodes (type-
                # validated) topped up from authored pools. No-op for static maps.
                grown_state = extend_route(
                    transition.loop.state,
                    seed=transition.loop.seed,
                    turn_index=story_turn,
                    proposals=list(payload.world_delta.route_nodes),
                )
                transition = replace(transition, loop=replace(transition.loop, state=grown_state))

        # Climax reachability pacing guard. ``DEFAULT_TURNS_PER_LAYER`` spaces the
        # authored boss node ~20 turns out, so under real-LLM drift a mid-run
        # numeric threshold (``tension>=90`` / ``stability<=10``) would
        # auto-archive the loop long before the IX climax — the golden path then
        # never reaches the boss and the run has no payoff (live 2026-07-03 fixed
        # preemption *at* the boss node; live 2026-07-04 showed the stability side:
        # the LLM grinds ~-5 stability per scene, so a pre-boss collapse is the
        # common case, not a rare erasure — loop_26adffc3 died at rn10, one node
        # short). While the boss node is still ahead, defer any bare threshold
        # archive so the route can carry the player to the climax; an explicit LLM
        # ``end_condition`` stays a real early end, and once the boss node is
        # reached ``_defer_threshold_archive_for_climax`` + the fight own the end.
        if (
            isinstance(transition.loop.state, dict)
            and transition.loop.state.get(ROUTE_MAP_KEY)
            and not _route_boss_reached(transition.loop.state)
        ):
            transition = self._defer_threshold_archive_before_climax(
                transition, prior_phase=loop.phase, payload=payload
            )

        # P1-a companion cutscene appearance: a threshold-qualified directive is
        # staged as this narrative turn's authored interstitial. Persist only a
        # compact active-node descriptor for the client/curated image, and mark it
        # seen once the scene commits so retries or later turns cannot replay it.
        # A normal scene clears the previous turn's transient descriptor.
        scene, cutscene_state = _apply_cutscene_appearance(
            transition.loop.state,
            scene,
            cutscene_id=cutscene_id,
            scenario_id=options.scenario_id,
            language=options.language,
        )
        transition = replace(
            transition,
            loop=replace(transition.loop, state=cutscene_state),
        )

        # Route junctions: at a layer boundary, replace this scene's choices with
        # the branch options (next candidate nodes) so the player explicitly picks
        # the next destination. In-layer turns keep the LLM's own choices.
        offered_junction = False
        if isinstance(transition.loop.state, dict) and transition.loop.state.get(ROUTE_MAP_KEY):
            junction_opts = junction_options(transition.loop.state, turn_index=story_turn)
            if junction_opts:
                scene = replace(scene, choices=_build_route_choices(junction_opts))
                offered_junction = True

        # Session memory: record a compact beat + recent-prose window so later
        # scenes have a "story so far" to continue from (anti-repetition). The
        # beat also ledgers which companions this scene referenced (C3): combat
        # ally staging reads it to decide who needs a join signal.
        if isinstance(transition.loop.state, dict):
            player_action = player_event.action if player_event is not None else None
            beat_scenario = load_scenario(options.scenario_id)
            beat_state = record_beat(
                transition.loop.state,
                scene=scene,
                player_action=player_action,
                companions=_companions_in_text(
                    _companion_alias_map(beat_scenario, options.scenario_id),
                    f"{scene.title}\n{scene.narration}",
                ),
            )
            transition = replace(transition, loop=replace(transition.loop, state=beat_state))

        if player_event is not None and impact_base_loop is not None:
            impact = _choice_impact_summary(
                before=impact_base_loop,
                after=transition.loop,
                scene=scene,
                player_event=player_event,
            )
            state_with_impact = (
                dict(transition.loop.state) if isinstance(transition.loop.state, dict) else {}
            )
            state_with_impact["_last_choice_impact"] = impact
            # C1 no-op turn guard ("선택이 반영 안 되는 느낌"): count consecutive
            # non-junction turns whose world state did not move at all; the prompt
            # assembler escalates the world's reaction at 1 and forces an event at
            # 2+. Any real delta — or a junction (a decision point by itself) —
            # resets the streak.
            eventful = bool(
                impact.get("stability_delta")
                or impact.get("tension_delta")
                or impact.get("new_flags")
                or impact.get("items_gained")
                or impact.get("route_from") != impact.get("route_to")
            )
            prior_noops = int(state_with_impact.get("_noop_turns", 0) or 0)
            state_with_impact["_noop_turns"] = (
                0 if eventful or offered_junction else prior_noops + 1
            )
            # G2 twist selection: once per loop, when an authored twist's
            # conditions are met, arm it — the NEXT scene delivers it.
            twist = select_twist(
                load_scenario(options.scenario_id).twist_bank,
                state_with_impact,
                seed=transition.loop.seed,
                turn_index=story_turn,
            )
            if twist is not None:
                state_with_impact[PENDING_TWIST_KEY] = twist
            transition = replace(transition, loop=replace(transition.loop, state=state_with_impact))

        return _NarrativeAdvance(
            transition=transition,
            scene=scene,
            story_turn=story_turn,
            route_combat=route_combat,
            route_combat_kind=route_combat_kind,
            triggered_combat=triggered_combat,
            offered_junction=offered_junction,
            route_progress=route_progress,
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
        choice_relationship: dict[str, int] | None = None,
        cutscene_id: str | None = None,
    ) -> RuntimeSnapshot:
        scenario = load_scenario(options.scenario_id)
        # LLM item grants: whitelist-clamp BEFORE apply (unknown/non-grantable ids
        # dropped), then upgrade the appended id strings to full item defs so the
        # inventory/equip/consumable UI can render them.
        payload = _filter_grant_items(payload, scenario, turn_index=scene.turn_index)
        with span(span_name, player_id=player.player_id, loop_id=loop.loop_id):
            transition = self.engine.apply_scene_payload(loop, scene, payload, player_event)
        if not transition.ok:
            raise RuntimeError(_format_errors(transition.errors))
        if transition.repairs:
            # Soft-repairs are intended behavior; recording them is what makes
            # model-output drift (over-limit narration, duplicate choice ids,
            # out-of-range deltas) measurable instead of silently absorbed.
            self.logger.info(
                "scene payload soft-repaired",
                extra={
                    "player_id": player.player_id,
                    "loop_id": loop.loop_id,
                    "turn_index": scene.turn_index,
                    "repairs": transition.repairs,
                },
            )
        advance = self._advance_narrative_state(
            transition=transition,
            loop=loop,
            scene=scene,
            payload=payload,
            options=options,
            player_event=player_event,
            route_target=route_target,
            impact_base_loop=impact_base_loop,
            choice_relationship=choice_relationship,
            cutscene_id=cutscene_id,
        )
        transition, scene = advance.transition, advance.scene
        route_combat, route_combat_kind = advance.route_combat, advance.route_combat_kind
        triggered_combat, route_progress = advance.triggered_combat, advance.route_progress

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
            # Route-node insight is persisted with the loop state that lists the
            # node in ``applied_rewards``; an early commit would double-credit it
            # if save_loop failed and the turn was retried.
            if route_progress is not None:
                persist_progression(self.store, route_progress)
        if metric_total_before is not None:
            self._persist_narrative_metric(
                player.player_id, transition.loop.loop_id, metric_total_before
            )

        # Streaming defers the (slow) scene image so the choices-carrying snapshot
        # ships first; the caller generates it afterward and relays a visual_status
        # frame. REST callers keep the inline image. See RuntimeOptions.defer_image.
        image_result = (
            None
            if options.defer_image
            else self._maybe_generate_image(options, transition.loop, scene, player.player_id)
        )
        bgm_path = self.audio.get_current_bgm(transition.loop, scene)
        # Per-scene INFO log: the finished script (narration), the resulting state, and
        # the choices on offer — a full readable scene summary each turn (instead of the
        # per-token streaming DEBUG frames). Structured fields stay queryable.
        final_loop = transition.loop
        scene_state = final_loop.state if isinstance(final_loop.state, dict) else {}
        extra = {
            "player_id": player.player_id,
            "loop_id": final_loop.loop_id,
            "scene_id": scene.scene_id,
            "status": "succeeded",
            "bgm": bgm_path,
            "title": scene.title,
            "location": scene.location,
            "phase": final_loop.phase.value,
            "stability": final_loop.stability,
            "tension": final_loop.tension,
            "flags": list(scene_state.get("flags", []) or []),
            "objective": scene.objective,
            "narration": scene.narration,
            "choices": [{"label": c.label, "intent": c.intent} for c in scene.choices],
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
            **self._progress_facts(player, transition.loop),
            boons=self._boons_view(transition.loop, options),
            market=self._market_view(transition.loop, options),
        )
        next_combat = self._resolve_next_combat(
            transition.loop,
            scene,
            payload,
            route_combat=route_combat,
            triggered_combat=triggered_combat,
            options=options,
        )
        # A deliberate route-node combat (patrol/boss climax) supersedes a stale
        # active-combat left in the loop state. Otherwise a zombie ``_combat``
        # (e.g. an abandoned ambient fight never resolved to a finish) keeps
        # ``is_active`` permanently True, so the ``not is_active`` guard below would
        # silently skip launching the authored IX climax when the pointer reaches
        # the boss node — the fight then never starts and nothing owns the loop end,
        # so tension climbs unguarded to the auto-archive threshold (live 2026-07-03,
        # loop_99ac4fe6...: a turn-5 ``patrol_ambush`` stayed active=true and blocked
        # the boss for the rest of the run). Clear the mismatched active combat so the
        # route climax owns the turn. ``route_combat`` only fires on node entry, so a
        # genuinely in-progress fight (which blocks route advance) is never cleared.
        if route_combat and CombatService.is_active(transition.loop):
            active_state = CombatService.load_state(transition.loop)
            if active_state is None or active_state.encounter_id != route_combat:
                transition = replace(
                    transition,
                    loop=replace(
                        transition.loop,
                        state=_without_combat_state(transition.loop.state),
                    ),
                )
        if next_combat and not CombatService.is_active(transition.loop):
            if triggered_combat and triggered_combat != next_combat:
                # An encounter-map contact triggered, but the fight we actually
                # begin is a different encounter (the gate downgraded it, or a
                # boss node took precedence). Resolve the original contact now,
                # else it stays "engaged" on the player's tile and re-triggers
                # every turn — re-downgraded each time — a phantom-pursuit loop
                # (post-combat resolution keys off the encounter that ran).
                transition = replace(
                    transition,
                    loop=replace(
                        transition.loop,
                        state=mark_encounter_resolved(transition.loop.state, triggered_combat),
                    ),
                )
            combat_origin = (
                route_combat_kind
                if route_combat and next_combat == route_combat and route_combat_kind
                else "ambient"
            )
            combat_snapshot = self._begin_requested_combat(
                player, transition.loop, next_combat, options, origin=combat_origin
            )
            return combat_snapshot
        return snapshot

    def _defer_threshold_archive_for_climax(
        self,
        transition: LoopTransition,
        *,
        prior_phase: LoopPhase,
        payload: ScenePayload,
    ) -> LoopTransition:
        """Keep the loop live when the boss climax fires on a threshold-archive turn.

        ``apply_scene_payload`` auto-archives when ``tension>=90`` /
        ``stability<=10`` (``_archive_requested``) *before* the route advance
        discovers that this same turn enters the authored boss node. Letting that
        numeric threshold win would leave the loop in ARCHIVE while the climax
        combat begins, so the fight's outcome (victory -> ending, defeat ->
        soft-defeat/erasure) can no longer resolve the run. Defer the threshold
        archive: revert to the pre-transition phase and drop the minted Echo so
        the boss fight resolves the loop's end. An explicit LLM ``end_condition``
        still ends the loop (author intent wins) — only the threshold is deferred.
        """
        loop = transition.loop
        if loop.phase not in {LoopPhase.ARCHIVE, LoopPhase.ENDED}:
            return transition
        if prior_phase in {LoopPhase.ARCHIVE, LoopPhase.ENDED}:
            return transition
        end_condition = (payload.end_condition or "").lower()
        if end_condition in {"archive", "ended", "loop_complete"}:
            return transition
        revived = replace(
            loop,
            phase=prior_phase,
            ended_at=None,
            active_echoes=[e for e in loop.active_echoes if e is not transition.echo],
        )
        return replace(transition, loop=revived, echo=None)

    def _defer_threshold_archive_before_climax(
        self,
        transition: LoopTransition,
        *,
        prior_phase: LoopPhase,
        payload: ScenePayload,
    ) -> LoopTransition:
        """Keep the loop live when a pre-climax numeric threshold archive would
        end the run before the golden path reaches the authored boss node.

        The route advances one layer every ``DEFAULT_TURNS_PER_LAYER`` turns, so
        the boss sits ~20 turns out; under real-LLM drift both thresholds are hit
        long before the climax — tension spikes, and stability is ground down
        ~-5 per scene (live 2026-07-04: every run collapses to ``stability<=10``
        around layer 4, so treating that as a "rare deliberate erasure" ending
        stranded players one node short of the boss). This defers *any* bare
        threshold archive while the boss node is still ahead (the caller gates on
        ``_route_boss_reached``); an explicit LLM ``end_condition`` remains a real
        early end, and the loop still resolves at the boss via
        ``_defer_threshold_archive_for_climax`` + the fight (victory -> perspective
        ending, defeat -> erasure) once it is reached. Mirrors that helper's
        revert (restore the pre-transition phase, clear ``ended_at``, drop the
        minted Echo).
        """
        loop = transition.loop
        if loop.phase not in {LoopPhase.ARCHIVE, LoopPhase.ENDED}:
            return transition
        if prior_phase in {LoopPhase.ARCHIVE, LoopPhase.ENDED}:
            return transition
        end_condition = (payload.end_condition or "").lower()
        if end_condition in {"archive", "ended", "loop_complete"}:
            return transition
        # Rescue only a threshold-driven archive (the only remaining archive
        # cause once an explicit end_condition is excluded above).
        if loop.tension < 90 and loop.stability > 10:
            return transition
        revived = replace(
            loop,
            phase=prior_phase,
            ended_at=None,
            active_echoes=[e for e in loop.active_echoes if e is not transition.echo],
        )
        return replace(transition, loop=revived, echo=None)

    def _resolve_next_combat(
        self,
        loop: LoopState,
        scene: Scene,
        payload: ScenePayload,
        *,
        route_combat: str | None,
        triggered_combat: str | None,
        options: RuntimeOptions,
    ) -> str | None:
        """Decide which encounter (if any) should begin now on the narrative path.

        Precedence: authored route-node combat (patrol/boss climax) > ambient
        combat (LLM ``start_combat`` / encounter-map contact). ``route_combat``
        is the deliberate destination the player walked into, so it wins AND
        bypasses the pacing gate; ambient combat is subject to pacing (cooldown +
        early risk cap). Precedence matters because ``route_combat`` is only
        recomputed on node entry — if a coinciding ambient contact (high tension)
        or an LLM ``start_combat`` on the boss-entry turn won the chain, the
        parked climax node would never fire again (and the risk-5 boss would also
        always exceed the risk cap and be downgraded/suppressed by the gate).
        """
        if route_combat:
            return route_combat
        # Recovery beat after a soft defeat: suppress ambient combat for a few
        # scenes regardless of tension, so a losing player gets a genuine breather
        # instead of being re-thrown into a fight every turn. Deliberate route-node
        # combat (returned above) is unaffected.
        state = loop.state if isinstance(loop.state, dict) else {}
        sd_turn = state.get("_soft_defeat_turn")
        if (
            isinstance(sd_turn, int)
            and (scene.turn_index - sd_turn) < SOFT_DEFEAT_COMBAT_COOLDOWN_SCENES
        ):
            return None
        requested_combat = _requested_combat_id(payload)
        scenario_id = state.get("scenario_id")
        if scenario_id == "neo-seoul" and scene.turn_index < 2:
            requested_combat = None
        ambient_combat = requested_combat or triggered_combat
        return self._gate_next_combat(loop, scene.turn_index, ambient_combat, options)

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
          ``COMBAT_COOLDOWN_SCENES`` narrative scenes. High tension may override
          the normal cooldown, but not after ``player_fled``.
        - early difficulty cap: downgrade encounters whose ``risk`` exceeds the
          tier unlocked by the number of combats already won, so the opening
          fights stay tutorial-tier and ramp as the player learns.
        """
        if not candidate or not isinstance(loop.state, dict):
            return candidate
        scenario = load_scenario(options.scenario_id)
        encounters = scenario.combat.get("encounters", {})
        if not isinstance(encounters, dict) or candidate not in encounters:
            # The plain-text parser synthesizes ``combat_default`` when prose
            # mentions a fight without naming an encounter, and the LLM can
            # invent ids outright. Passing an unknown id through here made
            # ``_begin_requested_combat`` raise AFTER the scene transaction had
            # committed — a 500 on a turn that was already persisted. No fight
            # is the right answer; the narration still carries the beat.
            self.logger.warning(
                "unknown combat encounter requested; ignoring",
                extra={"loop_id": loop.loop_id, "encounter_id": candidate},
            )
            return None

        last_combat_story = loop.state.get("_last_combat_story_turn")
        current_story = loop.state.get("_story_turn")
        last_combat_raw = loop.state.get("_last_combat_turn")
        if isinstance(last_combat_story, int) and isinstance(current_story, int):
            combat_gap = current_story - last_combat_story
        elif isinstance(last_combat_raw, int):
            # Read-compatible fallback for saves created before the narrative
            # combat marker existed. New combat finishes always stamp both clocks.
            combat_gap = turn_index - last_combat_raw
        else:
            combat_gap = None
        if combat_gap is not None:
            # B3 patrol-surge style modifiers shorten the ambient-combat cooldown
            # (never below 0); deliberate route combat already bypasses this gate.
            cooldown_scenes = max(
                0, COMBAT_COOLDOWN_SCENES + modifier_effect(loop.state, "combat_cooldown_delta")
            )
            within_cooldown = combat_gap < cooldown_scenes
            high_pressure = loop.tension >= COMBAT_COOLDOWN_PRESSURE_TENSION
            fled_last_combat = loop.state.get("_last_combat_result") == "player_fled"
            if within_cooldown and (fled_last_combat or not high_pressure):
                return None

        combats_won = int(loop.state.get("_combat_count", 0))
        cap_index = min(combats_won, len(COMBAT_RISK_CAP_BY_COUNT) - 1)
        allowed_risk = COMBAT_RISK_CAP_BY_COUNT[cap_index]
        candidate_risk = int(encounters[candidate].get("risk", 1))
        if candidate_risk <= allowed_risk:
            return candidate
        # Downgrade into the allowed risk tier. Taking the highest-weight entry made
        # this a constant: the cap is keyed to combats *won*, so a player who keeps
        # fleeing stays at tier 1, where `patrol_ambush` is the only authored
        # encounter — the same fight, same enemies, same intro copy, three times in
        # one arm (live 2026-08-01, recurring 2026-08-08). Draw by weight instead,
        # and never re-serve the encounter just fought: ambient combat is pacing, so
        # skipping a beat reads better than a repeat. Deliberate route combat
        # bypasses this gate entirely, so the player can still pick a fight.
        last_encounter = str(loop.state.get("_last_combat_encounter") or "")
        affordable = [
            (eid, enc)
            for eid, enc in encounters.items()
            if int(enc.get("risk", 1)) <= allowed_risk and eid != last_encounter
        ]
        if not affordable:
            return None
        dice = Dice(f"{loop.seed}:combat-downgrade:{turn_index}")
        return str(
            dice.weighted_choice(
                [eid for eid, _ in affordable],
                [float(enc.get("weight", 1)) for _, enc in affordable],
            )
        )

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

    def _encounter_location(self, encounter_id: str | None, options: RuntimeOptions) -> str:
        """Authored player-facing place for an encounter, or "" when unknown."""
        if not encounter_id:
            return ""
        try:
            scenario = load_scenario(options.scenario_id)
            encounters = (
                scenario.combat.get("encounters", {}) if isinstance(scenario.combat, dict) else {}
            )
            meta = encounters.get(encounter_id)
        except Exception:
            return ""
        if not isinstance(meta, dict):
            return ""
        return str(meta.get("location_hint") or "").strip()

    def _progress_facts(
        self,
        player: PlayerProfile,
        loop: LoopState,
        *,
        shards: list[NarrativeShard] | None = None,
        events: list[WorldEvent] | None = None,
    ) -> dict[str, Any]:
        """``clues_collected`` + ``epiphanies_unlocked`` for a snapshot, from ONE
        shard read (they used to fetch the same 1000-row list twice per
        snapshot, on top of what the transition had already loaded). Callers
        that hold the lists pass them in. Failures degrade per fact, as before.
        """
        if shards is None:
            try:
                # Explicit limit: the store default is 8, which pinned the CLUE
                # MATRIX gauge at 8/16 and desynced Insight from the resolver.
                shards = self.store.list_narrative_shards(player.player_id, limit=1000)
            except Exception:
                shards = []
        clues = len([shard for shard in shards if shard.kind == "clue"])
        epiphanies: list[str] = []
        try:
            from mythos_runtime.progression import check_mid_run_epiphanies, load_progression

            scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
            previous = load_progression(self.store, player.player_id, scenario_id)
            if events is None:
                events = self.store.list_events(loop.loop_id)
            epiphanies = check_mid_run_epiphanies(
                previous, scenario_id, events, shards, loop.loop_id
            )
        except Exception:
            self.logger.warning("failed to calculate mid-run epiphanies", exc_info=True)
        return {"clues_collected": clues, "epiphanies_unlocked": epiphanies}



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


# Item kinds the GM may hand out through ``world_delta.grant_items`` — carriables
# a scene action can plausibly yield (salvage, a vendor's spare patch). Keys,
# quest data, and equipment stay author/loot-table controlled.
GRANTABLE_ITEM_KINDS = {"consumable", "material"}
MAX_GRANT_ITEMS_PER_SCENE = 2


OPENING_NO_GRANT_MAX_TURN = 2


def _filter_grant_items(
    payload: ScenePayload, scenario: Any, turn_index: int = OPENING_NO_GRANT_MAX_TURN + 1
) -> ScenePayload:
    """Clamp LLM item grants to the scenario whitelist (id must exist, kind must
    be grantable) and to ``MAX_GRANT_ITEMS_PER_SCENE`` — a hallucinated id must
    never become a junk inventory row (cf. the placeholder-clue cleanup).

    Also drops ALL grants during the opening establishing beats
    (``turn_index <= OPENING_NO_GRANT_MAX_TURN``): a context-free item pickup in
    the lone-protagonist opening reads as unmotivated (user feedback 2026-07-09).
    The prompt affordance is suppressed there too (scenario_context), so this is
    the backstop for a model that grants anyway."""
    raw = list(payload.world_delta.grant_items or [])
    if not raw:
        return payload
    if turn_index <= OPENING_NO_GRANT_MAX_TURN:
        return replace(payload, world_delta=replace(payload.world_delta, grant_items=[]))
    items_def = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
    valid = [
        item_id
        for item_id in raw
        if isinstance(items_def.get(item_id), dict)
        and items_def[item_id].get("kind") in GRANTABLE_ITEM_KINDS
    ][:MAX_GRANT_ITEMS_PER_SCENE]
    if valid == raw:
        return payload
    return replace(payload, world_delta=replace(payload.world_delta, grant_items=valid))


def _materialize_inventory_items(state: Any, scenario: Any) -> Any:
    """Upgrade bare item-id strings in ``_inventory`` to their full scenario item
    defs (name/kind/effect) so the inventory UI, equip flow, and consumable button
    can render them. The loop engine appends ``grant_items`` as plain ids because
    it is scenario-agnostic; this runs right after apply at the session boundary."""
    if not isinstance(state, dict):
        return state
    inventory = state.get("_inventory")
    if not isinstance(inventory, list):
        return state
    items_def = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
    changed = False
    upgraded = []
    for entry in inventory:
        if isinstance(entry, str) and isinstance(items_def.get(entry), dict):
            upgraded.append(dict(items_def[entry]))
            changed = True
        else:
            upgraded.append(entry)
    if not changed:
        return state
    return {**state, "_inventory": upgraded}


def _story_turn_for_commit(state: Any, scene_turn: int) -> int:
    """The route-clock turn for this narrative commit.

    Counts only story scenes: combat rounds also consume scene ``turn_index`` (one
    scene per round), so pacing the route on the raw index lets long fights skip
    story layers. Legacy loops without the counter fall back to the scene index
    once and count narratively from there.
    """
    if isinstance(state, dict):
        prev = state.get("_story_turn")
        if isinstance(prev, int):
            return prev + 1
    return int(scene_turn)


def _recent_novelty_scenes(
    store: MythOSStore,
    loops: list[LoopState],
    *,
    active_loop_id: str,
    limit: int = 6,
) -> list[Scene]:
    """Recent narrative scenes for the active loop, then prior-loop context.

    The old input used one latest scene per loop and appended the active latest
    scene a second time. That made the current run's long repetition invisible.
    Prioritize the active run's real narrative sequence; fill any remaining
    window with one latest scene from older loops.
    """
    active = [
        scene
        for scene in store.list_scenes(active_loop_id)
        if scene.scene_type != "combat"
    ][-limit:]
    remaining = max(0, limit - len(active))
    if remaining == 0:
        return active
    prior = [
        scene
        for scene in _latest_scenes(store, loops, limit=limit)
        if scene.loop_id != active_loop_id and scene.scene_type != "combat"
    ][-remaining:]
    return [*prior, *active]


def _without_combat_state(state: Any) -> Any:
    """Return a copy of ``state`` with the active-combat key dropped.

    Used to supersede a stale/zombie ``_combat`` when a deliberate route-node
    combat must take the turn. Non-dict states pass through unchanged.
    """
    if not isinstance(state, dict):
        return state
    if "_combat" not in state:
        return state
    cleared = dict(state)
    cleared.pop("_combat", None)
    return cleared


def _route_boss_reached(state: Any) -> bool:
    """True when the route pointer sits on the authored boss node.

    Used by the climax pacing guard to distinguish "boss still ahead" (defer a
    tension collapse) from "at the climax" (the boss deferral + fight own the
    end). False for legacy ``_map`` scenarios with no route map.
    """
    if not isinstance(state, dict):
        return False
    route = state.get(ROUTE_MAP_KEY)
    if not isinstance(route, dict):
        return False
    current = route.get("current")
    nodes = route.get("nodes")
    if not current or not isinstance(nodes, dict):
        return False
    node = nodes.get(current)
    if not isinstance(node, dict):
        return False
    return str(node.get("type")) == "boss"


def _inventory_counts(state: Any) -> tuple[dict[str, int], dict[str, str]]:
    """Per-item-id counts + display names from a loop state's ``_inventory``."""
    counts: dict[str, int] = {}
    names: dict[str, str] = {}
    inventory = state.get("_inventory") if isinstance(state, dict) else None
    for entry in inventory or []:
        if isinstance(entry, str):
            item_id, name = entry, entry
        elif isinstance(entry, dict):
            item_id = str(entry.get("id") or entry.get("item_id") or "")
            name = str(entry.get("name") or item_id)
        else:
            continue
        if not item_id:
            continue
        counts[item_id] = counts.get(item_id, 0) + 1
        names.setdefault(item_id, name)
    return counts, names


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
    # Items gained this turn (LLM grant_items / scripted rewards): the player has
    # no other feedback that a "잔해를 수습한다" pick actually paid out.
    before_counts, _ = _inventory_counts(before.state)
    after_counts, after_names = _inventory_counts(after.state)
    items_gained: list[dict[str, Any]] = [
        {"id": item_id, "name": after_names.get(item_id, item_id), "count": gained}
        for item_id, count in after_counts.items()
        if (gained := count - before_counts.get(item_id, 0)) > 0
    ]

    parts: list[str] = []
    if scene.action_result:
        parts.append(scene.action_result)
    if stability_delta:
        parts.append(f"안정성 {stability_delta:+d}")
    if tension_delta:
        parts.append(f"긴장도 {tension_delta:+d}")
    if items_gained:
        parts.append(
            "획득 "
            + ", ".join(
                f"{item['name']}×{item['count']}" if item["count"] > 1 else str(item["name"])
                for item in items_gained[:3]
            )
        )
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
        "items_gained": items_gained,
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


def _loop_language(loop: LoopState) -> str:
    """The loop's persisted narrative language, for paths that have no
    ``RuntimeOptions`` (archive). Legacy loops predate the field and stay ``ko``."""
    state = loop.state if isinstance(loop.state, dict) else {}
    language = str(state.get("language") or "").strip().lower()
    return language if language in {"ko", "en"} else "ko"


def _clear_soft_defeat_pending(state: dict[str, Any]) -> dict[str, Any]:
    next_state = dict(state) if isinstance(state, dict) else {}
    next_state.pop("_soft_defeat_pending", None)
    next_state["_soft_defeat_recovered"] = True
    next_state["_last_combat_outcome"] = "soft_defeat_recovered"
    return next_state


def _state_with_active_cutscene(
    state: dict[str, Any], cutscene: CutsceneDirective
) -> dict[str, Any]:
    next_state = dict(state) if isinstance(state, dict) else {}
    next_state[ACTIVE_CUTSCENE_KEY] = {
        "id": cutscene.cutscene_id,
        "companion": cutscene.companion,
        "title": cutscene.title,
        "image": cutscene.image,
    }
    return next_state


def _route_node_allows_cutscene(state: dict[str, Any]) -> bool:
    """Keep authored cutscenes off combat/anchor entry scenes.

    The cutscene remains eligible and will appear on the next ordinary transit
    scene. This prevents an interstitial from replacing a side-arc reveal, a
    curated main anchor, or the scene that starts combat.
    """
    status = route_status(state)
    node = status.get("node") if status else None
    if not isinstance(node, dict):
        return True
    return not bool(
        node.get("anchor")
        or node.get("side_arc")
        or node.get("combat")
        or node.get("type") in {"combat", "boss", "patrol"}
    )


def _next_runtime_cutscene(
    loop: LoopState,
    *,
    scenario_id: str,
    language: str,
    turn_index: int,
) -> CutsceneDirective | None:
    state = loop.state if isinstance(loop.state, dict) else {}
    if (
        turn_index < ROUTE_STEERING_START_TURN
        or loop.phase not in {LoopPhase.EXPLORE, LoopPhase.INTERACT}
        or CombatService.is_active(loop)
        or not _route_node_allows_cutscene(state)
    ):
        return None
    directives = load_scenario_directives(scenario_id, language)
    # Present-this-loop gate: a companion cutscene only plays in-game if the
    # companion is actually present — the same unlock_flags∩flags set that spawns
    # them in combat. Affection carries across loops, but a companion re-met only
    # in a prior loop must be re-introduced before their cutscene fires again
    # (else a carried-affection cutscene pops in mid-scene with another NPC).
    scenario = load_scenario(scenario_id)
    allies = scenario.combat.get("allies", {}) if isinstance(scenario.combat, dict) else {}
    flag_set = {str(flag) for flag in state.get("flags", []) or []}
    present_companions = {
        str(entry.get("id", key))
        for key, entry in (allies.items() if isinstance(allies, dict) else [])
        if isinstance(entry, dict)
        and {str(f) for f in entry.get("unlock_flags", []) or []} & flag_set
    }
    return next_unseen_cutscene(
        directives.cutscenes,
        state.get("relationships"),
        state.get("flags"),
        state.get(SEEN_CUTSCENES_KEY),
        present_companions,
    )


def _apply_cutscene_appearance(
    state: dict[str, Any],
    scene: Scene,
    *,
    cutscene_id: str | None,
    scenario_id: str,
    language: str,
) -> tuple[Scene, dict[str, Any]]:
    next_state = dict(state) if isinstance(state, dict) else {}
    next_state.pop(ACTIVE_CUTSCENE_KEY, None)
    if not cutscene_id:
        return scene, next_state
    cutscene = load_scenario_directives(scenario_id, language).cutscene(cutscene_id)
    if cutscene is None:
        return scene, next_state
    seen_raw = next_state.get(SEEN_CUTSCENES_KEY)
    seen = [str(value) for value in seen_raw] if isinstance(seen_raw, list) else []
    if cutscene.cutscene_id not in seen:
        seen.append(cutscene.cutscene_id)
    next_state[SEEN_CUTSCENES_KEY] = seen
    next_state = _state_with_active_cutscene(next_state, cutscene)
    return replace(scene, title=cutscene.title, scene_type="cutscene"), next_state


def _route_target_from_choice(choice_id: str | None) -> str | None:
    if choice_id and choice_id.startswith(ROUTE_CHOICE_PREFIX):
        return choice_id[len(ROUTE_CHOICE_PREFIX) :]
    return None


def _route_choice_badges(node: dict[str, Any]) -> str:
    parts: list[str] = []
    reward_raw = node.get("reward")
    reward: dict[str, Any] = reward_raw if isinstance(reward_raw, dict) else {}
    # Costs first (so heat never reads as a reward), then gains.
    if node.get("risk"):
        parts.append(f"위험 {node.get('risk')}")
    if reward.get("tension"):
        parts.append(f"추적도 +{reward['tension']} ⚠")
    if reward.get("insight"):
        parts.append(f"통찰 +{reward['insight']}")
    if reward.get("stability"):
        parts.append(f"안정 +{reward['stability']}")
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
    "patrol": "감시망을 은밀히 파고드는 지름길 — 순찰 매복·교전 위험이 크다",
    "combat": "교전이 기다리는 경로",
}


def _route_destination_meaning(node: dict[str, Any]) -> str:
    description = str(node.get("description") or "").strip()
    if description:
        return description
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
            Choice(
                choice_id=f"{ROUTE_CHOICE_PREFIX}{node_id}",
                label=label,
                intent="explore",
                combat_risk=bool(node.get("combat")),
            )
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


def _choice_relationship(scene: Scene, choice_id: str | None) -> dict[str, int]:
    """Extract a chosen scene choice's ``effect.relationship`` (companion affection).

    Returns the per-companion integer deltas authored on the choice, or ``{}`` for
    free-text actions, unknown choices, or Director-generated choices that carry no
    effect. The deltas are folded into ``loop.state["relationships"]`` in
    ``_commit_scene`` (mirrors the route perspective relationship in ``route_runtime``).
    """
    if not choice_id:
        return {}
    chosen = next((c for c in scene.choices if c.choice_id == choice_id), None)
    if chosen is None or not isinstance(chosen.effect, dict):
        return {}
    relationship = chosen.effect.get("relationship")
    if not isinstance(relationship, dict):
        return {}
    out: dict[str, int] = {}
    for name, delta in relationship.items():
        try:
            out[str(name)] = out.get(str(name), 0) + int(delta)
        except (TypeError, ValueError):
            continue
    return out


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


def _symbol_from_scene(scene: Scene) -> str:
    return next(
        (word.strip(".,:;!?").lower() for word in scene.title.split() if word.strip()),
        "echo",
    )


def _format_errors(errors: list) -> str:
    return "; ".join(f"{error.code}: {error.message}" for error in errors)

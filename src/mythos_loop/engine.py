from __future__ import annotations

from dataclasses import dataclass, field, replace

from mythos_core import Echo, LoopPhase, LoopState, NarrativeShard, Scene, WorldEvent
from mythos_core.clock import utc_now
from mythos_core.ids import new_event_id, new_shard_id
from mythos_core.mapgrid import update_map
from mythos_core.models import Actor
from mythos_core.text_match import mentions
from mythos_narrative.schemas import ScenePayload

from .validator import ValidationError, Validator


@dataclass(frozen=True)
class LoopTransition:
    loop: LoopState
    events: list[WorldEvent]
    errors: list[ValidationError]
    discovered_shards: list[NarrativeShard] = field(default_factory=list)
    echo: Echo | None = None
    # Soft-repair codes the validator applied to the payload before it was
    # committed (see Validator.validate_scene_payload). Diagnostic only — the
    # session logs these so model-output drift is measurable per turn.
    repairs: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not any(err.is_fatal for err in self.errors)


class LoopEngine:
    def __init__(self, validator: Validator | None = None) -> None:
        self.validator = validator or Validator()

    def apply_scene_payload(
        self,
        loop: LoopState,
        scene: Scene,
        payload: ScenePayload,
        chosen_event: WorldEvent | None = None,
    ) -> LoopTransition:
        validation = self.validator.validate_scene_payload(loop, scene, payload)
        has_fatal = any(err.is_fatal for err in validation.errors)
        if has_fatal:
            return LoopTransition(loop=loop, events=[], errors=validation.errors)

        if chosen_event is not None:
            event_validation = self.validator.validate_event_append(loop, chosen_event)
            if not event_validation.ok:
                return LoopTransition(loop=loop, events=[], errors=event_validation.errors)

        repaired_payload = validation.repaired_payload or payload
        next_phase = self._next_phase(loop, repaired_payload)
        phase_validation = self.validator.validate_phase_transition(loop.phase, next_phase)
        if not phase_validation.ok:
            return LoopTransition(loop=loop, events=[], errors=phase_validation.errors)

        state_delta = repaired_payload.world_delta.as_state_delta()
        # Ensure proper Se-rin flags during the onboarding phase of Neo-Seoul based on player choices.
        # Only for the DEFAULT Se-rin opening: loop-2+ opening variants (kai/solo/…)
        # don't feature her in the early turns, so the keyword heuristic would set
        # met_se_rin spuriously (the else-branch fires on any non-refusal action).
        scenario_id = loop.state.get("scenario_id") if isinstance(loop.state, dict) else None
        opening_variant = (
            str(loop.state.get("_opening_variant") or "default")
            if isinstance(loop.state, dict)
            else "default"
        )
        if scenario_id == "neo-seoul" and scene.turn_index <= 2 and opening_variant == "default":
            flags = state_delta.setdefault("flags", [])
            action_text = ""
            if chosen_event is not None and chosen_event.actor == Actor.PLAYER:
                action_text = chosen_event.action or ""

            # Keyword matching. These were Korean-only, so on an EN loop neither
            # list could fire and the else-branch below flagged EVERY English
            # player `met_se_rin` — "Refuse her hand and slip into the alley
            # alone" was recorded as acceptance, and `refused_se_rin` was
            # unreachable in the product's default language. The flags gate route
            # content, Se-rin's combat presence and ending branches, so the whole
            # refusal arm of the opening was dead in English.
            met_keywords = [
                "따라",
                "수락",
                "동의",
                "손을",
                "신뢰",
                "오토바이",
                "타기",
                "탑승",
                "잡는다",
                "동행",
                "협력",
                "follow",
                "accept",
                "agree",
                "trust",
                "ride",
                "board",
                "join",
                "grab",
                "take",
                "hand",
                "along",
                "together",
            ]
            refused_keywords = [
                "거절",
                "거부",
                "혼자",
                "독자",
                "경계",
                "피해",
                "숨기",
                "은신",
                "기다린다",
                "분석",
                "refuse",
                "decline",
                "reject",
                "ignore",
                "alone",
                "avoid",
                "hide",
                "wary",
                "distrust",
                "without",
                "own",
                "another",
            ]

            # An explicit refusal verb decides on its own, because the sentence
            # usually names what is being refused: "Refuse her hand" carries both
            # signals, and the old `is_refused and not is_met` let the noun win.
            # The softer markers (alone / hide / 혼자 / 은신) still defer to an
            # acceptance word, so "take her hand instead of hiding alone" stays
            # acceptance.
            refusal_verbs = ["거절", "거부", "refuse", "decline", "reject"]
            is_refused = mentions(action_text, refusal_verbs) or (
                mentions(action_text, refused_keywords) and not mentions(action_text, met_keywords)
            )
            # The two flags are exclusive, and loop 1 pre-seeds ``met_se_rin``
            # (tutorial party). Removing the loser from the delta alone left the
            # pre-seeded flag in place — the merge is a union — so a refusal on
            # loop 1 recorded BOTH and the gates fell to perspective ordering.
            remove_flags = list(state_delta.get("remove_flags", []))
            if is_refused:
                if "refused_se_rin" not in flags:
                    flags.append("refused_se_rin")
                if "met_se_rin" in flags:
                    flags.remove("met_se_rin")
                remove_flags.append("met_se_rin")
            else:
                if "met_se_rin" not in flags:
                    flags.append("met_se_rin")
                if "refused_se_rin" in flags:
                    flags.remove("refused_se_rin")
                remove_flags.append("refused_se_rin")
            state_delta["remove_flags"] = remove_flags
        state = _merge_state(loop.state, state_delta)
        # Lay the scene's location onto the dynamic tile map (persisted in loop.state).
        state = update_map(state, scene.location, scene.turn_index)
        stability = _clamp_score(loop.stability + repaired_payload.world_delta.stability)
        tension = _clamp_score(loop.tension + repaired_payload.world_delta.tension)
        ended_at = utc_now() if next_phase is LoopPhase.ENDED else loop.ended_at

        discovered_shards = []
        for clue in repaired_payload.world_delta.clues:
            text = str(clue.get("text") or "").strip()
            # Empty model-produced clue objects used to become the permanent
            # placeholder ``clue / A piece of the puzzle.`` and flood Codex.
            # A clue without evidence text is not player information: discard it.
            if not text or text == "A piece of the puzzle.":
                continue
            symbol = str(clue.get("symbol") or scene.title).strip()
            discovered_shards.append(
                NarrativeShard(
                    shard_id=new_shard_id(),
                    loop_id=loop.loop_id,
                    player_id=loop.player_id,
                    symbol=symbol,
                    emotional_tone="discovered",
                    text=text,
                    weight=1.0,
                    created_at=utc_now(),
                    kind="clue",
                    metadata={"tags": clue.get("tags", [])},
                )
            )

        updated_loop = replace(
            loop,
            phase=next_phase,
            location_id=scene.location,
            stability=stability,
            tension=tension,
            ended_at=ended_at,
            state=state,
        )

        events = []
        if chosen_event is not None:
            events.append(chosen_event)
        events.append(
            WorldEvent(
                event_id=new_event_id(),
                loop_id=loop.loop_id,
                turn_index=scene.turn_index,
                actor=Actor.WORLD,
                action="scene_generated",
                result=scene.title,
                state_delta=state_delta,
                created_at=utc_now(),
            )
        )

        if next_phase in {LoopPhase.ARCHIVE, LoopPhase.ENDED}:
            source_event = chosen_event or events[-1]
            echo = self.create_echo(updated_loop, source_event, scene)
            echo_validation = self.validator.validate_echo(echo)
            if not echo_validation.ok:
                return LoopTransition(
                    loop=updated_loop,
                    events=events,
                    errors=echo_validation.errors,
                    discovered_shards=discovered_shards,
                    repairs=validation.repairs,
                )

            # CRITICAL: Add echo to loop state
            updated_loop = replace(
                updated_loop,
                active_echoes=[*updated_loop.active_echoes, echo],
            )

            return LoopTransition(
                loop=updated_loop,
                events=events,
                errors=[],
                echo=echo,
                discovered_shards=discovered_shards,
                repairs=validation.repairs,
            )

        return LoopTransition(
            loop=updated_loop,
            events=events,
            errors=[],
            discovered_shards=discovered_shards,
            repairs=validation.repairs,
        )

    def append_event(self, loop: LoopState, event: WorldEvent) -> LoopTransition:
        validation = self.validator.validate_event_append(loop, event)
        if not validation.ok:
            return LoopTransition(loop=loop, events=[], errors=validation.errors)
        return LoopTransition(loop=loop, events=[event], errors=[])

    def create_echo(self, loop: LoopState, source_event: WorldEvent, scene: Scene) -> Echo:
        return Echo(
            echo_id=f"echo_{source_event.event_id.removeprefix('event_')}",
            source_loop_id=loop.loop_id,
            source_event_id=source_event.event_id,
            symbol=_symbol_from_scene(scene),
            text=f"{scene.title}: {source_event.action}",
            weight=1.0,
        )

    def _next_phase(self, loop: LoopState, payload: ScenePayload) -> LoopPhase:
        if loop.phase is LoopPhase.ARCHIVE:
            return LoopPhase.ENDED

        # Explicit archive request by LLM or status scores
        if _archive_requested(loop, payload):
            return LoopPhase.ARCHIVE

        # Explicit phase transition request by LLM
        if payload.requested_next_phase:
            try:
                requested = LoopPhase(payload.requested_next_phase.lower())
                # The soft-defeat recovery beat must not be ended by the model
                # asking for "archive"/"ended" directly — the same rule
                # _archive_requested applies to end_condition and score thresholds.
                soft_defeat = isinstance(loop.state, dict) and loop.state.get(
                    "_soft_defeat_pending"
                )
                if soft_defeat and requested in (LoopPhase.ARCHIVE, LoopPhase.ENDED):
                    requested = loop.phase
                # Validate that it's a valid forward transition
                if self.validator.validate_phase_transition(loop.phase, requested).ok:
                    return requested
            except (ValueError, AttributeError):
                pass  # Ignore invalid phase names

        # Turn 0 always moves from CONNECT to EXPLORE if not already archiving
        if loop.phase is LoopPhase.CONNECT:
            return LoopPhase.EXPLORE

        # Default: stay in current phase to allow longer story arcs
        return loop.phase


def _archive_requested(loop: LoopState, payload: ScenePayload) -> bool:
    state = loop.state if isinstance(loop.state, dict) else {}
    if state.get("_soft_defeat_pending"):
        return False
    end_condition = (payload.end_condition or "").lower()
    if end_condition in {"archive", "ended", "loop_complete"}:
        return True
    next_stability = loop.stability + payload.world_delta.stability
    next_tension = loop.tension + payload.world_delta.tension
    return next_stability <= 10 or next_tension >= 90


def _merge_state(state: dict, state_delta: dict) -> dict:
    merged = dict(state)
    flags = set(merged.get("flags", []))
    flags.update(state_delta.get("flags", []))
    # Explicit removals (exclusive flag pairs) — everything else is a union.
    flags.difference_update(state_delta.get("remove_flags", []))
    merged["flags"] = sorted(flags)
    grant_items = state_delta.get("grant_items", [])
    if isinstance(grant_items, list) and grant_items:
        inventory = list(merged.get("_inventory", []))
        inventory.extend(grant_items)
        merged["_inventory"] = inventory
    hp = state_delta.get("hp")
    if isinstance(hp, int):
        party = dict(merged.get("_party", {}))
        current_hp = party.get("player_hp")
        max_hp = party.get("player_max_hp")
        if max_hp is None:
            max_hp = 15
        if current_hp is None:
            current_hp = max_hp
        party["player_hp"] = max(0, min(max_hp, current_hp + hp))
        party["player_max_hp"] = max_hp
        merged["_party"] = party
    spawn_encounters = state_delta.get("spawn_encounters", [])
    if isinstance(spawn_encounters, list) and spawn_encounters:
        merged["_pending_spawn_encounters"] = [
            str(encounter_id) for encounter_id in spawn_encounters if isinstance(encounter_id, str)
        ]
    return merged


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))


def _symbol_from_scene(scene: Scene) -> str:
    words = [word.strip(".,:;!?").lower() for word in scene.title.split()]
    return next((word for word in words if word), "echo")

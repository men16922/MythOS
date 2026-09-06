from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any

from mythos_core import Choice, Echo, LoopPhase, LoopState, Scene, WorldEvent
from mythos_narrative.schemas import (
    ALLOWED_WORLD_DELTA_KEYS,
    MAX_CHOICES,
    MAX_NARRATION_CHARS,
    MAX_VISUAL_BRIEF_CHARS,
    ScenePayload,
    WorldDelta,
)

ALLOWED_STATE_DELTA_KEYS = {"stability", "tension", "flags", "phase", "echo"}

# Variant-routed opening (S3): on variant loops the early window belongs to the
# variant hook, so the canonical Se-rin first-contact flags must not enter world
# state from the model — the directive alone cannot be trusted (live evidence:
# loop_88ba… set met_se_rin at turn 1 from a non-Se-rin choice).
SE_RIN_CONTACT_FLAGS = frozenset({"met_se_rin", "trusted_se_rin", "refused_se_rin"})
SE_RIN_CLAMP_MAX_TURN = 3


@dataclass(frozen=True)
class ValidationError:
    code: str
    message: str
    is_fatal: bool = True


@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    errors: list[ValidationError]
    repaired_payload: ScenePayload | None = None
    # Which soft-repairs were applied to produce repaired_payload. The repair
    # itself is not new behavior — recording it is: without this ledger the
    # validator computes the diagnosis (what the model got wrong) and discards
    # it, so model-output drift (over-limit narration, duplicate choice ids,
    # out-of-range deltas) stays invisible in logs.
    repairs: list[str] = field(default_factory=list)


class Validator:
    def validate_scene_payload(
        self, loop: LoopState, scene: Scene, payload: ScenePayload
    ) -> ValidationResult:
        errors: list[ValidationError] = []
        repairs: list[str] = []
        repaired = payload

        if loop.phase is LoopPhase.ENDED:
            errors.append(ValidationError("loop_ended", "ended loop cannot accept new scenes"))

        if scene.loop_id != loop.loop_id:
            errors.append(ValidationError("loop_mismatch", "scene.loop_id must match loop.loop_id"))

        choice_result = self.validate_choices(payload.choices)
        errors.extend(choice_result.errors)

        # Choices soft-repair
        repaired_choices = list(payload.choices)
        for i, choice in enumerate(repaired_choices):
            c_id = choice.choice_id.strip() if choice.choice_id else ""
            c_label = choice.label.strip() if choice.label else ""
            c_intent = choice.intent.strip() if choice.intent else ""
            if not c_id or not c_label or not c_intent:
                repaired_choices[i] = replace(
                    choice,
                    choice_id=c_id or f"choice_{i}",
                    label=c_label or "계속하기",
                    intent=c_intent or "explore",
                )
                if "choice_fields_filled" not in repairs:
                    repairs.append("choice_fields_filled")

        seen_ids = set()
        for i, choice in enumerate(repaired_choices):
            c_id = choice.choice_id
            if c_id in seen_ids:
                new_id = f"{c_id}_{i}"
                repaired_choices[i] = replace(choice, choice_id=new_id)
                seen_ids.add(new_id)
                if "choice_id_deduped" not in repairs:
                    repairs.append("choice_id_deduped")
            else:
                seen_ids.add(c_id)

        if len(repaired_choices) == 0:
            from mythos_core import Choice

            repaired_choices = [
                Choice(choice_id="choice_default", label="계속하기", intent="explore")
            ]
            repairs.append("choices_defaulted")
        elif len(repaired_choices) > MAX_CHOICES:
            repaired_choices = repaired_choices[:MAX_CHOICES]
            repairs.append("choices_capped")

        if repaired_choices != payload.choices:
            repaired = replace(repaired, choices=repaired_choices)

        if len(payload.narration) > MAX_NARRATION_CHARS:
            repaired = replace(
                repaired,
                narration=payload.narration[:MAX_NARRATION_CHARS].rstrip(),
            )
            repairs.append("narration_truncated")

        if len(payload.visual_brief) > MAX_VISUAL_BRIEF_CHARS:
            repaired = replace(
                repaired,
                visual_brief=payload.visual_brief[:MAX_VISUAL_BRIEF_CHARS].rstrip(),
            )
            repairs.append("visual_brief_truncated")

        # Unsupported keys in world_delta will be naturally filtered out when building clamped_delta.
        # We perform a soft-repair rather than a hard failure to avoid crashing the game.

        flags = list(payload.world_delta.flags)
        if _se_rin_clamp_active(loop, scene):
            flags = [flag for flag in flags if flag not in SE_RIN_CONTACT_FLAGS]
            if flags != list(payload.world_delta.flags):
                repairs.append("se_rin_flags_stripped")

        clamped_stability = _clamp_delta(payload.world_delta.stability)
        clamped_tension = _clamp_delta(payload.world_delta.tension)
        if (
            clamped_stability != payload.world_delta.stability
            or clamped_tension != payload.world_delta.tension
        ):
            repairs.append("world_delta_clamped")
        clamped_delta = WorldDelta(
            stability=clamped_stability,
            tension=clamped_tension,
            flags=flags,
            clues=list(payload.world_delta.clues),
            start_combat=payload.world_delta.start_combat,
            spawn_encounters=list(payload.world_delta.spawn_encounters),
            grant_items=list(payload.world_delta.grant_items),
            hp=payload.world_delta.hp,
        )
        if clamped_delta != payload.world_delta:
            repaired = replace(repaired, world_delta=clamped_delta)

        return ValidationResult(
            ok=not errors,
            errors=errors,
            repaired_payload=repaired if repaired != payload else None,
            repairs=repairs,
        )

    def validate_choices(self, choices: list[Choice]) -> ValidationResult:
        errors: list[ValidationError] = []
        if not (1 <= len(choices) <= MAX_CHOICES):
            errors.append(
                ValidationError("invalid_choice_count", "scene choices must be 1-4", is_fatal=False)
            )
        choice_ids = [choice.choice_id for choice in choices]
        if len(set(choice_ids)) != len(choice_ids):
            errors.append(
                ValidationError("duplicate_choice_id", "choice ids must be unique", is_fatal=False)
            )
        for choice in choices:
            if (
                not choice.choice_id.strip()
                or not choice.label.strip()
                or not choice.intent.strip()
            ):
                errors.append(
                    ValidationError(
                        "invalid_choice", "choice fields must be non-empty", is_fatal=False
                    )
                )
        return ValidationResult(ok=not errors, errors=errors)

    def validate_state_delta(self, state_delta: dict[str, Any]) -> ValidationResult:
        errors: list[ValidationError] = []
        unknown_keys = set(state_delta) - ALLOWED_STATE_DELTA_KEYS
        if unknown_keys:
            errors.append(
                ValidationError(
                    "invalid_state_delta",
                    f"state_delta has unsupported keys: {sorted(unknown_keys)}",
                )
            )
        return ValidationResult(ok=not errors, errors=errors)

    def validate_phase_transition(
        self, current: LoopPhase, next_phase: LoopPhase
    ) -> ValidationResult:
        allowed = _allowed_next_phases(current)
        if next_phase not in allowed:
            return ValidationResult(
                ok=False,
                errors=[
                    ValidationError(
                        "invalid_phase_transition",
                        f"cannot transition from {current.value} to {next_phase.value}",
                    )
                ],
            )
        return ValidationResult(ok=True, errors=[])

    def validate_event_append(self, loop: LoopState, event: WorldEvent) -> ValidationResult:
        errors: list[ValidationError] = []
        if loop.phase is LoopPhase.ENDED:
            errors.append(ValidationError("loop_ended", "ended loop cannot accept new events"))
        if event.loop_id != loop.loop_id:
            errors.append(ValidationError("loop_mismatch", "event.loop_id must match loop.loop_id"))
        errors.extend(self.validate_state_delta(event.state_delta).errors)
        return ValidationResult(ok=not errors, errors=errors)

    def validate_echo(self, echo: Echo) -> ValidationResult:
        errors: list[ValidationError] = []
        if not echo.source_loop_id.strip():
            errors.append(ValidationError("missing_source_loop", "echo requires source_loop_id"))
        if not echo.source_event_id.strip():
            errors.append(ValidationError("missing_source_event", "echo requires source_event_id"))
        return ValidationResult(ok=not errors, errors=errors)


def _allowed_next_phases(current: LoopPhase) -> set[LoopPhase]:
    transitions = {
        LoopPhase.CONNECT: {LoopPhase.CONNECT, LoopPhase.EXPLORE, LoopPhase.ARCHIVE},
        LoopPhase.EXPLORE: {LoopPhase.EXPLORE, LoopPhase.INTERACT, LoopPhase.ARCHIVE},
        LoopPhase.INTERACT: {LoopPhase.INTERACT, LoopPhase.REWRITE, LoopPhase.ARCHIVE},
        LoopPhase.REWRITE: {LoopPhase.REWRITE, LoopPhase.ARCHIVE},
        LoopPhase.ARCHIVE: {LoopPhase.ARCHIVE, LoopPhase.ENDED},
        LoopPhase.ENDED: {LoopPhase.ENDED},
    }
    return transitions[current]


def _world_delta_keys_ok(world_delta: WorldDelta) -> bool:
    return set(world_delta.as_state_delta()) <= ALLOWED_WORLD_DELTA_KEYS


def _se_rin_clamp_active(loop: LoopState, scene: Scene) -> bool:
    state = loop.state if isinstance(loop.state, dict) else {}
    variant = str(state.get("_opening_variant") or "default")
    return variant != "default" and scene.turn_index <= SE_RIN_CLAMP_MAX_TURN


def _clamp_delta(value: int) -> int:
    return max(-25, min(25, value))

from __future__ import annotations

from dataclasses import dataclass, replace

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


class Validator:
    def validate_scene_payload(
        self, loop: LoopState, scene: Scene, payload: ScenePayload
    ) -> ValidationResult:
        errors: list[ValidationError] = []
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

        seen_ids = set()
        for i, choice in enumerate(repaired_choices):
            c_id = choice.choice_id
            if c_id in seen_ids:
                new_id = f"{c_id}_{i}"
                repaired_choices[i] = replace(choice, choice_id=new_id)
                seen_ids.add(new_id)
            else:
                seen_ids.add(c_id)

        if len(repaired_choices) == 0:
            from mythos_core import Choice

            repaired_choices = [
                Choice(choice_id="choice_default", label="계속하기", intent="explore")
            ]
        elif len(repaired_choices) > MAX_CHOICES:
            repaired_choices = repaired_choices[:MAX_CHOICES]

        if repaired_choices != payload.choices:
            repaired = replace(repaired, choices=repaired_choices)

        if len(payload.narration) > MAX_NARRATION_CHARS:
            repaired = replace(
                repaired,
                narration=payload.narration[:MAX_NARRATION_CHARS].rstrip(),
            )

        if len(payload.visual_brief) > MAX_VISUAL_BRIEF_CHARS:
            repaired = replace(
                repaired,
                visual_brief=payload.visual_brief[:MAX_VISUAL_BRIEF_CHARS].rstrip(),
            )

        # Unsupported keys in world_delta will be naturally filtered out when building clamped_delta.
        # We perform a soft-repair rather than a hard failure to avoid crashing the game.

        clamped_delta = WorldDelta(
            stability=_clamp_delta(payload.world_delta.stability),
            tension=_clamp_delta(payload.world_delta.tension),
            flags=list(payload.world_delta.flags),
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

    def validate_state_delta(self, state_delta: dict) -> ValidationResult:
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


def _clamp_delta(value: int) -> int:
    return max(-25, min(25, value))

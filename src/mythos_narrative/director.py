from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field, replace
from time import perf_counter
from typing import Any, Protocol

from openai import OpenAI

from mythos_core import Choice, Scene
from mythos_core.clock import utc_now
from mythos_core.ids import new_scene_id
from mythos_image_agent.config import AgentConfig
from mythos_runtime.observability import get_logger, timed
from mythos_runtime.settings import load_runtime_settings

from .parser import NarrativeParseError, parse_scene_payload, repair_scene_payload
from .prompts import build_first_scene_messages, build_next_scene_messages, build_repair_messages
from .schemas import (
    MAX_VISUAL_BRIEF_CHARS,
    SCENE_JSON_SCHEMA,
    NarrativeContext,
    ScenePayload,
    WorldDelta,
)
from .streaming import NarrationFieldExtractor, NarrativeStreamEvent


class JSONProvider(Protocol):
    def generate(self, messages: list[dict[str, str]]) -> str:
        raise NotImplementedError


class StreamingJSONProvider(JSONProvider, Protocol):
    def stream(self, messages: list[dict[str, str]]) -> Iterator[str]:
        raise NotImplementedError


# Generation outcomes, ordered from healthiest to most degraded. These feed the
# provider QA metric so we can watch how often the LLM path needs help.
OUTCOME_SUCCESS = "success"  # provider returned a valid payload on the first parse
OUTCOME_PROVIDER_REPAIR = "provider_repair"  # a second provider call fixed the payload
OUTCOME_LOCAL_REPAIR = "local_repair"  # we salvaged the payload without the provider
OUTCOME_FALLBACK = "fallback"  # provider was unusable; canned scene served instead

_OUTCOMES = (
    OUTCOME_SUCCESS,
    OUTCOME_PROVIDER_REPAIR,
    OUTCOME_LOCAL_REPAIR,
    OUTCOME_FALLBACK,
)


@dataclass
class NarrativeMetrics:
    """In-memory counters for Narrative Director generation outcomes.

    Deliberate ``--fallback`` runs never reach the provider, so they are not
    recorded here; this only tracks the quality of the live provider path.
    """

    counts: dict[str, int] = field(default_factory=lambda: {outcome: 0 for outcome in _OUTCOMES})

    def record(self, outcome: str) -> None:
        self.counts[outcome] = self.counts.get(outcome, 0) + 1

    @property
    def total(self) -> int:
        return sum(self.counts.values())

    @property
    def degraded(self) -> int:
        """Generations that needed repair or fell back."""
        return self.total - self.counts.get(OUTCOME_SUCCESS, 0)

    def ratios(self) -> dict[str, float]:
        total = self.total
        if total == 0:
            return {outcome: 0.0 for outcome in _OUTCOMES}
        return {outcome: round(self.counts.get(outcome, 0) / total, 4) for outcome in _OUTCOMES}

    def as_dict(self) -> dict[str, object]:
        return {
            "counts": dict(self.counts),
            "total": self.total,
            "degraded": self.degraded,
            "ratios": self.ratios(),
        }


@dataclass(frozen=True)
class OllamaJSONProvider:
    config: AgentConfig

    def _client(self) -> OpenAI:
        return OpenAI(
            base_url=self.config.ollama_base_url,
            api_key="ollama",
            timeout=self.config.ollama_timeout_seconds,
        )

    def _request_kwargs(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        return {
            "model": self.config.ollama_model,
            "messages": messages,
            "temperature": 0.7,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "scene_payload", "schema": SCENE_JSON_SCHEMA},
            },
        }

    def generate(self, messages: list[dict[str, str]]) -> str:
        client = self._client()
        kwargs = self._request_kwargs(messages)
        try:
            response = client.chat.completions.create(**kwargs)
        except Exception:
            if load_runtime_settings().fast_mode:
                raise
            kwargs["response_format"] = {"type": "json_object"}
            response = client.chat.completions.create(**kwargs)

        content = response.choices[0].message.content
        return content.strip() if content else ""

    def stream(self, messages: list[dict[str, str]]) -> Iterator[str]:
        client = OpenAI(
            base_url=self.config.ollama_base_url,
            api_key="ollama",
            timeout=self.config.ollama_timeout_seconds,
        )
        kwargs = {**self._request_kwargs(messages), "stream": True}
        try:
            stream = client.chat.completions.create(**kwargs)
        except Exception:
            if load_runtime_settings().fast_mode:
                raise
            kwargs["response_format"] = {"type": "json_object"}
            stream = client.chat.completions.create(**kwargs)
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content


class NarrativeDirector:
    def __init__(
        self, provider: JSONProvider | None = None, repair_enabled: bool | None = None
    ) -> None:
        self.provider = provider or OllamaJSONProvider(AgentConfig())
        self.repair_enabled = repair_enabled
        self.logger = get_logger("mythos.narrative")
        self.metrics = NarrativeMetrics()

    def generate_first_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        return self._generate(context, build_first_scene_messages(context))

    def generate_next_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        return self._generate(context, build_next_scene_messages(context))

    def stream_first_scene(self, context: NarrativeContext) -> Iterator[NarrativeStreamEvent]:
        yield from self._stream_generate(context, build_first_scene_messages(context))

    def stream_next_scene(self, context: NarrativeContext) -> Iterator[NarrativeStreamEvent]:
        yield from self._stream_generate(context, build_next_scene_messages(context))

    def fallback_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        payload = _fallback_payload(context)
        payload = _apply_novelty_guard(context, payload)
        return _scene_from_payload(context, payload), payload

    def summarize_loop(self, events: list[dict[str, Any]]) -> str:
        """Generates a poetic 2-3 sentence summary of the entire loop events."""
        prompt = (
            "Summarize the following sequence of events in a loop-based narrative. "
            "Focus on the player's key choices and the significant changes to the world. "
            "Write the summary in Korean, in a poetic but clear style fitting a cyber-mythic game. "
            "Keep it to 2-3 sentences.\n\nEvents:\n"
        )
        for event in events:
            actor = event.get("actor", "UNKNOWN")
            action = event.get("action", "")
            result = event.get("result", "")
            prompt += f"- {actor}: {action} -> {result}\n"

        try:
            response = self.provider.generate(
                [
                    {
                        "role": "system",
                        "content": "You are a poetic chronicler of the MythOS universe.",
                    },
                    {"role": "user", "content": prompt},
                ]
            )
            parsed = json.loads(response)
            if isinstance(parsed, dict) and "summary" in parsed:
                return str(parsed["summary"])
            return response.strip()
        except Exception:
            self.logger.debug("loop summary provider failed", exc_info=True)
            return _fallback_loop_summary(events)

    def _generate(
        self, context: NarrativeContext, messages: list[dict[str, str]]
    ) -> tuple[Scene, ScenePayload]:
        scene, payload, outcome = self._generate_classified(context, messages)
        self._record_outcome(context, outcome)
        return scene, payload

    def _stream_generate(
        self, context: NarrativeContext, messages: list[dict[str, str]]
    ) -> Iterator[NarrativeStreamEvent]:
        stream_method = getattr(self.provider, "stream", None)
        if not callable(stream_method):
            scene, payload = self._generate(context, messages)
            yield NarrativeStreamEvent(kind="text", text=payload.narration)
            yield NarrativeStreamEvent(kind="final", scene=scene, payload=payload)
            return

        raw_parts: list[str] = []
        extractor = NarrationFieldExtractor()
        start = perf_counter()
        try:
            for chunk in stream_method(messages):
                raw_parts.append(chunk)
                for text in extractor.feed(chunk):
                    yield NarrativeStreamEvent(kind="text", text=text)
            raw_payload = "".join(raw_parts)
            scene, payload, outcome = self._scene_from_raw_or_fallback(context, raw_payload)
        except Exception:
            self.logger.warning(
                "narrative streaming fallback used",
                extra={
                    "player_id": context.player.player_id,
                    "loop_id": context.loop.loop_id,
                    "status": "fallback",
                    "outcome": OUTCOME_FALLBACK,
                },
            )
            scene, payload = self.fallback_scene(context)
            outcome = OUTCOME_FALLBACK

        latency_ms = round((perf_counter() - start) * 1000, 3)
        self.logger.info(
            "narrative streaming finished",
            extra={
                "player_id": context.player.player_id,
                "loop_id": context.loop.loop_id,
                "provider": type(self.provider).__name__,
                "latency_ms": latency_ms,
                "status": "fallback" if outcome == OUTCOME_FALLBACK else "succeeded",
                "outcome": outcome,
            },
        )
        self._record_outcome(context, outcome)
        yield NarrativeStreamEvent(
            kind="fallback" if outcome == OUTCOME_FALLBACK else "final",
            scene=scene,
            payload=payload,
            outcome=outcome,
        )

    def _scene_from_raw_or_fallback(
        self, context: NarrativeContext, raw_payload: str
    ) -> tuple[Scene, ScenePayload, str]:
        try:
            payload = parse_scene_payload(raw_payload)
            payload = _apply_novelty_guard(context, payload)
            return _scene_from_payload(context, payload), payload, OUTCOME_SUCCESS
        except Exception:
            try:
                payload = parse_scene_payload(repair_scene_payload(raw_payload))
                payload = _apply_novelty_guard(context, payload)
                return _scene_from_payload(context, payload), payload, OUTCOME_LOCAL_REPAIR
            except Exception:
                scene, payload = self.fallback_scene(context)
                return scene, payload, OUTCOME_FALLBACK

    def _generate_classified(
        self, context: NarrativeContext, messages: list[dict[str, str]]
    ) -> tuple[Scene, ScenePayload, str]:
        try:
            with timed(
                "mythos.narrative.generate",
                self.logger,
                "narrative generation finished",
                player_id=context.player.player_id,
                loop_id=context.loop.loop_id,
                provider=type(self.provider).__name__,
            ):
                raw_payload = self.provider.generate(messages)
            payload = parse_scene_payload(raw_payload)
        except Exception as first_error:
            raw = raw_payload if "raw_payload" in locals() else ""

            # 1) Cheap deterministic salvage first — most malformed payloads (missing
            # optional keys, off-shape choices, markdown fences) are fixable locally
            # without paying for a second ~12s LLM round-trip.
            try:
                payload = parse_scene_payload(repair_scene_payload(raw))
                payload = _apply_novelty_guard(context, payload)
                return _scene_from_payload(context, payload), payload, OUTCOME_LOCAL_REPAIR
            except Exception:
                pass

            if not self._repair_enabled(context):
                self.logger.warning(
                    "narrative fallback used",
                    extra={
                        "player_id": context.player.player_id,
                        "loop_id": context.loop.loop_id,
                        "status": "fallback",
                        "outcome": OUTCOME_FALLBACK,
                    },
                )
                scene, payload = self.fallback_scene(context)
                return scene, payload, OUTCOME_FALLBACK

            # 2) Only now spend a provider repair round-trip.
            try:
                repair_messages = build_repair_messages(
                    raw,
                    getattr(first_error, "errors", [str(first_error)]),
                    context,
                )
                with timed(
                    "mythos.narrative.repair",
                    self.logger,
                    "narrative repair finished",
                    player_id=context.player.player_id,
                    loop_id=context.loop.loop_id,
                    provider=type(self.provider).__name__,
                ):
                    repaired_raw = self.provider.generate(repair_messages)
                try:
                    payload = parse_scene_payload(repaired_raw)
                    outcome = OUTCOME_PROVIDER_REPAIR
                except NarrativeParseError:
                    payload = parse_scene_payload(repair_scene_payload(repaired_raw))
                    outcome = OUTCOME_LOCAL_REPAIR
                payload = _apply_novelty_guard(context, payload)
                return _scene_from_payload(context, payload), payload, outcome
            except Exception:
                self.logger.warning(
                    "narrative fallback used",
                    extra={
                        "player_id": context.player.player_id,
                        "loop_id": context.loop.loop_id,
                        "status": "fallback",
                    },
                )
                scene, payload = self.fallback_scene(context)
                return scene, payload, OUTCOME_FALLBACK

        payload = _apply_novelty_guard(context, payload)
        return _scene_from_payload(context, payload), payload, OUTCOME_SUCCESS

    def _record_outcome(self, context: NarrativeContext, outcome: str) -> None:
        self.metrics.record(outcome)
        self.logger.info(
            "narrative outcome",
            extra={
                "player_id": context.player.player_id,
                "loop_id": context.loop.loop_id,
                "status": "fallback" if outcome == OUTCOME_FALLBACK else "succeeded",
                "outcome": outcome,
            },
        )

    def _repair_enabled(self, context: NarrativeContext) -> bool:
        if self.repair_enabled is not None:
            return self.repair_enabled
        if context.fast_mode:
            return False
        return not load_runtime_settings().fast_mode


def _scene_from_payload(context: NarrativeContext, payload: ScenePayload) -> Scene:
    return Scene(
        scene_id=new_scene_id(),
        loop_id=context.loop.loop_id,
        turn_index=context.turn_index,
        title=payload.title,
        location=payload.location,
        narration=payload.narration,
        choices=payload.choices,
        visual_brief=payload.visual_brief[:MAX_VISUAL_BRIEF_CHARS].rstrip(),
        created_at=utc_now(),
        objective=payload.objective,
        action_result=payload.action_result,
        scene_type=payload.scene_type,
    )


def _fallback_payload(context: NarrativeContext) -> ScenePayload:
    novelty_hint = ""
    if context.novelty_notes:
        novelty_hint = " The world avoids a recent pattern and introduces a new pressure point."
    elif context.world_memories or context.narrative_shards:
        novelty_hint = " Archived memories tug at the scene without repeating their old shape."

    if context.player_action:
        narration = (
            f"The world absorbs the action: {context.player_action}. "
            "A low signal answers from behind the access layer, unresolved but stable enough to follow."
            f"{novelty_hint}"
        )
        title = "Signal Afterimage"
    else:
        narration = (
            "A pale access gate opens inside a silent server hall. The Connector's name "
            f"flickers once, then the world waits for intent.{novelty_hint}"
        )
        title = (
            "Changed Signal at the Threshold"
            if context.novelty_notes
            else "Signal at the Threshold"
        )

    return ScenePayload(
        title=title,
        location=context.loop.location_id,
        narration=narration,
        choices=[
            Choice(
                choice_id=f"choice_{context.turn_index + 1}_approach",
                label="Approach the signal",
                intent="explore",
            ),
            Choice(
                choice_id=f"choice_{context.turn_index + 1}_listen",
                label="Listen for an echo",
                intent="interact",
            ),
        ],
        visual_brief=(
            "A lone luminous access gate inside a dark server hall, floating Korean UI fragments, "
            "cyber-mythic mood, cinematic side lighting, precise architectural lines."
        )[:MAX_VISUAL_BRIEF_CHARS],
        world_delta=WorldDelta(stability=0, tension=2, flags=["fallback_scene"]),
        end_condition=None,
        objective="Access the data core to stabilize the connection."
        if context.turn_index == 0
        else None,
        action_result="Success (Fallback)" if context.player_action else None,
    )


def _apply_novelty_guard(context: NarrativeContext, payload: ScenePayload) -> ScenePayload:
    if not context.novelty_notes:
        return payload
    title_key = payload.title.strip().lower()
    if not title_key:
        return payload
    note_text = " ".join(context.novelty_notes).lower()
    if title_key not in note_text:
        return payload

    title = f"Changed {payload.title}"
    narration = f"{payload.narration.rstrip()} A new pressure point alters the pattern before it can repeat."
    return replace(payload, title=title, narration=narration)


def _fallback_loop_summary(events: list[dict[str, Any]]) -> str:
    if not events:
        return "루프는 조용히 닫혔다. 남은 것은 아직 이름을 얻지 못한 신호뿐이다."
    last = events[-1]
    action = str(last.get("action") or "마지막 선택")
    return f"루프는 '{action}'의 잔향을 남기고 접혔다. 세계는 그 선택을 낮은 신호로 보관한다."

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field, replace
from time import perf_counter
from typing import Any, Protocol, cast

from openai import OpenAI

from mythos_core import Choice, Scene
from mythos_core.clock import utc_now
from mythos_core.ids import new_scene_id
from mythos_image_agent.config import AgentConfig
from mythos_runtime.observability import get_logger, span, timed
from mythos_runtime.settings import load_runtime_settings

from .fallbacks import DEFAULT_FALLBACK
from .parser import NarrativeParseError, parse_scene_payload, parse_story_text, repair_scene_payload
from .prompts import (
    build_first_scene_messages,
    build_first_story_messages,
    build_next_scene_messages,
    build_next_story_messages,
    build_repair_messages,
)
from .schemas import (
    MAX_VISUAL_BRIEF_CHARS,
    NarrativeContext,
    ScenePayload,
    WorldDelta,
)
from .streaming import NarrationFieldExtractor, NarrativeStreamEvent, PlainTextStoryExtractor


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
    last_outcome: str | None = None

    def record(self, outcome: str) -> None:
        self.counts[outcome] = self.counts.get(outcome, 0) + 1
        self.last_outcome = outcome

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
            "last_outcome": self.last_outcome,
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

    def generate_story(self, messages: list[dict[str, str]], *, model: str | None = None) -> str:
        """Use storyteller model (gemma4:26b) for raw text generation without constraints."""
        client = self._client()
        target_model = model or self.config.ollama_model_story
        kwargs: dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": 0.4,
            "extra_body": {
                "keep_alive": "30m",
                "options": {
                    "num_ctx": 8192,
                    "repeat_penalty": 1.3,
                    "repeat_last_n": 256,
                    "top_p": 0.85,
                    "top_k": 30,
                    "num_predict": 2048,
                }
            },
        }
        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        return content.strip() if content else ""

    def generate_json(self, messages: list[dict[str, str]]) -> str:
        """Use parser model (gemma4:latest/8b) to parse raw text into JSON schema."""
        client = self._client()
        kwargs: dict[str, Any] = {
            "model": self.config.ollama_model_parser,
            "messages": messages,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "extra_body": {
                "keep_alive": "30m",
                "options": {
                    "num_ctx": 8192,
                    "num_predict": 1536,
                }
            },
        }
        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        return content.strip() if content else ""

    def generate(self, messages: list[dict[str, str]], *, model: str | None = None) -> str:
        """Fallback compatibility for single model mode: runs on config.ollama_model."""
        client = self._client()
        target_model = model or self.config.ollama_model
        kwargs: dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "extra_body": {
                "keep_alive": "30m",
                "options": {
                    "num_ctx": 8192,
                    "repeat_penalty": 1.3,
                    "repeat_last_n": 256,
                    "top_p": 0.85,
                    "top_k": 30,
                    "num_predict": 2048,
                }
            },
        }
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
        """Streams standard JSON chunks for single model mode."""
        client = self._client()
        kwargs: dict[str, Any] = {
            "model": self.config.ollama_model,
            "messages": messages,
            "temperature": 0.3,
            "stream": True,
            "response_format": {"type": "json_object"},
            "extra_body": {
                "keep_alive": "30m",
                "options": {
                    "num_ctx": 8192,
                    "repeat_penalty": 1.3,
                    "repeat_last_n": 256,
                    "top_p": 0.85,
                    "top_k": 30,
                    "num_predict": 2048,
                }
            },
        }
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

    def stream_story(self, messages: list[dict[str, str]], *, model: str | None = None) -> Iterator[str]:
        """Streams raw story text using storyteller model (gemma4:26b) without constraints."""
        client = self._client()
        target_model = model or self.config.ollama_model_story
        kwargs: dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": 0.4,
            "stream": True,
            "extra_body": {
                "keep_alive": "30m",
                "options": {
                    "num_ctx": 8192,
                    "repeat_penalty": 1.3,
                    "repeat_last_n": 256,
                    "top_p": 0.85,
                    "top_k": 30,
                    "num_predict": 2048,
                }
            },
        }
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

    def _use_dual_model(self) -> bool:
        config = getattr(self.provider, "config", None)
        if config is None:
            return False
        story_model = getattr(config, "ollama_model_story", None)
        parser_model = getattr(config, "ollama_model_parser", None)
        return bool(story_model and parser_model and story_model != parser_model)

    def _story_model(self) -> str | None:
        return getattr(getattr(self.provider, "config", None), "ollama_model_story", None)

    def _parser_model(self) -> str | None:
        return getattr(getattr(self.provider, "config", None), "ollama_model_parser", None)

    def generate_first_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        if self._use_dual_model():
            story_model = self._story_model()
            return self._generate_dual(context, build_first_story_messages(context), model=story_model)
        return self._generate_legacy(context, build_first_scene_messages(context))

    def generate_next_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        if self._use_dual_model():
            story_model = self._story_model()
            return self._generate_dual(context, build_next_story_messages(context), model=story_model)
        return self._generate_legacy(context, build_next_scene_messages(context))

    def stream_first_scene(self, context: NarrativeContext) -> Iterator[NarrativeStreamEvent]:
        if self._use_dual_model():
            story_model = self._story_model()
            yield from self._stream_generate_dual(context, build_first_story_messages(context), model=story_model)
        else:
            yield from self._stream_generate_legacy(context, build_first_scene_messages(context))

    def stream_next_scene(self, context: NarrativeContext) -> Iterator[NarrativeStreamEvent]:
        if self._use_dual_model():
            story_model = self._story_model()
            yield from self._stream_generate_dual(context, build_next_story_messages(context), model=story_model)
        else:
            yield from self._stream_generate_legacy(context, build_next_scene_messages(context))

    def fallback_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        payload = _fallback_payload(context)
        payload = _apply_novelty_guard(context, payload)
        return _scene_from_payload(context, payload), payload

    def summarize_loop(self, events: list[dict[str, Any]], *, use_llm: bool = True) -> str:
        """Generates a poetic 2-3 sentence summary of the entire loop events.

        ``use_llm=False`` (fallback/fast paths) returns a deterministic summary
        without touching the provider. This keeps loop-end — notably combat
        defeat — instant instead of blocking on a slow Ollama call (the provider
        only raises on error, not on slowness, so the except below cannot guard
        a merely-slow response).
        """
        if not use_llm:
            return _fallback_loop_summary(events)
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
            parser_model = self._parser_model()
            response: str = cast(Any, self.provider).generate(
                [
                    {
                        "role": "system",
                        "content": "You are a poetic chronicler of the MythOS universe.",
                    },
                    {"role": "user", "content": prompt},
                ],
                model=parser_model
            )
            parsed = json.loads(response)
            if isinstance(parsed, dict) and "summary" in parsed:
                return str(parsed["summary"])
            return response.strip()
        except Exception:
            self.logger.debug("loop summary provider failed", exc_info=True)
            return _fallback_loop_summary(events)

    def summarize_narrative_shards(
        self,
        shards: list[dict[str, Any]],
        *,
        existing_summary: str | None = None,
        use_llm: bool = True,
    ) -> str:
        """Summarize old narrative shards for long-session prompt compaction."""
        if not use_llm:
            return _fallback_shard_summary(shards, existing_summary=existing_summary)
        prompt = (
            "Compress these MythOS narrative shards into a durable causality summary. "
            "Preserve long-term consequences, recurring symbols, discovered clues, "
            "NPC relationship shifts, and unresolved threats. Write in Korean. "
            "Keep it under 5 compact bullet-like sentences. Do not quote the shards verbatim.\n\n"
        )
        if existing_summary:
            prompt += f"Existing summary to update:\n{existing_summary}\n\n"
        prompt += "Shards:\n"
        for shard in shards:
            symbol = shard.get("symbol", "")
            tone = shard.get("emotional_tone", "")
            kind = shard.get("kind", "general")
            text = str(shard.get("text") or "")[:420]
            prompt += f"- [{kind}] symbol={symbol} tone={tone}: {text}\n"

        try:
            parser_model = self._parser_model()
            response: str = cast(Any, self.provider).generate(
                [
                    {
                        "role": "system",
                        "content": "You are a concise memory archivist for Project MythOS.",
                    },
                    {"role": "user", "content": prompt},
                ],
                model=parser_model
            )
            parsed = json.loads(response)
            if isinstance(parsed, dict) and "summary" in parsed:
                return str(parsed["summary"]).strip()
            return response.strip()
        except Exception:
            self.logger.debug("narrative shard summary provider failed", exc_info=True)
            return _fallback_shard_summary(shards, existing_summary=existing_summary)

    def _generate_dual(
        self, context: NarrativeContext, story_messages: list[dict[str, str]], *, model: str | None = None
    ) -> tuple[Scene, ScenePayload]:
        # Step 1: Storytelling plain text generation (Gemma 26B / 8B according to model parameter)
        try:
            with timed(
                "mythos.narrative.generate_story",
                self.logger,
                "storytelling generation finished",
                player_id=context.player.player_id,
                loop_id=context.loop.loop_id,
                provider=type(self.provider).__name__,
            ):
                story_text = cast(Any, self.provider).generate_story(story_messages, model=model)
        except Exception:
            self.logger.warning("storyteller model failed, using fallback", exc_info=True)
            scene, payload = self.fallback_scene(context)
            self._record_outcome(context, OUTCOME_FALLBACK)
            return scene, payload

        # Step 2: Structural parsing via Regex & Heuristics (Instant)
        try:
            payload = parse_story_text(story_text)
            payload = _apply_novelty_guard(context, payload)
            outcome = OUTCOME_SUCCESS
        except Exception:
            self.logger.warning("storytext parsing failed, using fallback", exc_info=True)
            scene, payload = self.fallback_scene(context)
            outcome = OUTCOME_FALLBACK

        self._record_outcome(context, outcome)
        return _scene_from_payload(context, payload), payload

    def _stream_generate_dual(
        self, context: NarrativeContext, story_messages: list[dict[str, str]], *, model: str | None = None
    ) -> Iterator[NarrativeStreamEvent]:
        stream_method = getattr(self.provider, "stream_story", None) or getattr(self.provider, "stream", None)
        if not callable(stream_method):
            scene, payload = self._generate_dual(context, story_messages, model=model)
            yield NarrativeStreamEvent(kind="text", text=payload.narration)
            yield NarrativeStreamEvent(kind="final", scene=scene, payload=payload)
            return

        raw_parts: list[str] = []
        extractor = PlainTextStoryExtractor()
        start = perf_counter()
        try:
            # Stream storyteller text in real-time (routed model)
            for chunk in stream_method(story_messages, model=model):
                raw_parts.append(chunk)
                text = extractor.feed(chunk)
                if text:
                    yield NarrativeStreamEvent(kind="text", text=text)
            
            # Emit any remaining text in the safety window buffer
            remainder = extractor.flush()
            if remainder:
                yield NarrativeStreamEvent(kind="text", text=remainder)

            story_text = "".join(raw_parts)

            # Parse structural payload instantly via Regex
            payload = parse_story_text(story_text)
            payload = _apply_novelty_guard(context, payload)
            scene = _scene_from_payload(context, payload)
            outcome = OUTCOME_SUCCESS
        except Exception:
            self.logger.warning("dual-model streaming failed, using fallback", exc_info=True)
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

    def _generate_legacy(
        self, context: NarrativeContext, messages: list[dict[str, str]]
    ) -> tuple[Scene, ScenePayload]:
        # Legacy single-model generation (uses provider.generate on config.ollama_model)
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
            outcome = OUTCOME_SUCCESS
        except Exception as first_error:
            raw = raw_payload if "raw_payload" in locals() else ""
            try:
                payload = parse_scene_payload(repair_scene_payload(raw))
                outcome = OUTCOME_LOCAL_REPAIR
            except Exception:
                if not self._repair_enabled(context):
                    scene, payload = self.fallback_scene(context)
                    self._record_outcome(context, OUTCOME_FALLBACK)
                    return scene, payload
                try:
                    repair_messages = build_repair_messages(
                        raw,
                        getattr(first_error, "errors", [str(first_error)]),
                        context,
                    )
                    repaired_raw = self.provider.generate(repair_messages)
                    try:
                        payload = parse_scene_payload(repaired_raw)
                        outcome = OUTCOME_PROVIDER_REPAIR
                    except NarrativeParseError:
                        payload = parse_scene_payload(repair_scene_payload(repaired_raw))
                        outcome = OUTCOME_LOCAL_REPAIR
                except Exception:
                    scene, payload = self.fallback_scene(context)
                    self._record_outcome(context, OUTCOME_FALLBACK)
                    return scene, payload

        payload = _apply_novelty_guard(context, payload)
        self._record_outcome(context, outcome)
        return _scene_from_payload(context, payload), payload

    def _stream_generate_legacy(
        self, context: NarrativeContext, messages: list[dict[str, str]]
    ) -> Iterator[NarrativeStreamEvent]:
        stream_method = getattr(self.provider, "stream", None)
        if not callable(stream_method):
            scene, payload = self._generate_legacy(context, messages)
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
            self.logger.warning("legacy streaming failed, using fallback", exc_info=True)
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

    def _record_outcome(self, context: NarrativeContext, outcome: str) -> None:
        self.metrics.record(outcome)
        ratios = self.metrics.ratios()
        # Per-generation in-memory counters reset when a new director is built
        # (e.g. the per-request API path), so also emit the outcome + running
        # aggregate to an OTel span and the structured log. That makes provider
        # degradation observable in Jaeger across processes, independent of any
        # single director's lifetime.
        with span(
            "mythos.narrative.outcome",
            player_id=context.player.player_id,
            loop_id=context.loop.loop_id,
            outcome=outcome,
            total=self.metrics.total,
            degraded=self.metrics.degraded,
            success_ratio=ratios[OUTCOME_SUCCESS],
        ):
            pass
        self.logger.info(
            "narrative outcome",
            extra={
                "player_id": context.player.player_id,
                "loop_id": context.loop.loop_id,
                "status": "fallback" if outcome == OUTCOME_FALLBACK else "succeeded",
                "outcome": outcome,
                "total": self.metrics.total,
                "degraded": self.metrics.degraded,
                "success_ratio": ratios[OUTCOME_SUCCESS],
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
    # Scenario-authored override (directives/fallback.md) → falls back to the shared
    # neo-seoul default. The branch *logic* (player_action / novelty present?) stays
    # here; all prose comes from the dict (prompt layer).
    fb = context.fallback_scene or DEFAULT_FALLBACK

    novelty_hint = ""
    if context.novelty_notes:
        novelty_hint = str(fb.get("novelty_hint_notes", ""))
    elif context.world_memories or context.narrative_shards:
        novelty_hint = str(fb.get("novelty_hint_memories", ""))

    if context.player_action:
        narration = (
            f"당신은 {context.player_action}.\n\n"
            f"{fb.get('narration_with_action', '')}"
            f"{novelty_hint}"
        )
        title = str(fb.get("title_with_action", ""))
    else:
        narration = f"{fb.get('narration_no_action', '')}{novelty_hint}"
        title = str(
            fb.get("title_novelty", "") if context.novelty_notes else fb.get("title_default", "")
        )

    choices = [
        Choice(
            choice_id=f"choice_{context.turn_index + 1}_{c.get('suffix', i)}",
            label=str(c.get("label", "")),
            intent=str(c.get("intent", "explore")),
        )
        for i, c in enumerate(fb.get("choices", []) or [])
    ]

    return ScenePayload(
        title=title,
        # Prose location (not the raw loop.location_id "data-layer-01", which
        # jarringly surfaced an underground data-layer in the UI when generation
        # failed during the rainy-alley opening).
        location=str(fb.get("location", "")),
        narration=narration,
        choices=choices,
        visual_brief=str(fb.get("visual_brief", ""))[:MAX_VISUAL_BRIEF_CHARS],
        world_delta=WorldDelta(stability=0, tension=2, flags=["fallback_scene"]),
        end_condition=None,
        objective=str(fb.get("objective_turn0", "")) if context.turn_index == 0 else None,
        action_result="행동이 적용되었습니다." if context.player_action else None,
    )


def _apply_novelty_guard(context: NarrativeContext, payload: ScenePayload) -> ScenePayload:
    # The scripted opening (turns 0-4) intentionally reuses the authored beat
    # titles/locations, so this repeat-heuristic mis-fires there — it was mangling
    # good opening scenes with a "Changed …" title and a canned
    # "다른 압력이 끼어든다" tail (e.g. the 세린 first-contact/chase beats). Skip it.
    if context.turn_index <= 4:
        return payload
    if not context.novelty_notes:
        return payload
    title_key = payload.title.strip().lower()
    if not title_key:
        return payload
    note_text = " ".join(context.novelty_notes).lower()
    if title_key not in note_text:
        return payload

    title = f"Changed {payload.title}"
    narration = (
        f"{payload.narration.rstrip()} 같은 패턴이 반복되기 전에, 다른 압력이 장면 안으로 끼어든다."
    )
    return replace(payload, title=title, narration=narration)


def _fallback_loop_summary(events: list[dict[str, Any]]) -> str:
    if not events:
        return "루프는 조용히 닫혔다. 남은 것은 아직 이름을 얻지 못한 신호뿐이다."
    last = events[-1]
    action = str(last.get("action") or "마지막 선택")
    return f"루프는 '{action}'의 잔향을 남기고 접혔다. 세계는 그 선택을 낮은 신호로 보관한다."


def _fallback_shard_summary(
    shards: list[dict[str, Any]], *, existing_summary: str | None = None
) -> str:
    if not shards:
        return existing_summary or "아직 압축할 장기 서사 파편이 없다."
    symbols: list[str] = []
    tones: list[str] = []
    clues: list[str] = []
    for shard in shards:
        symbol = str(shard.get("symbol") or "").strip()
        tone = str(shard.get("emotional_tone") or "").strip()
        kind = str(shard.get("kind") or "general")
        if symbol:
            symbols.append(symbol)
        if tone:
            tones.append(tone)
        if kind == "clue" and symbol:
            clues.append(symbol)
    symbol_text = ", ".join(dict.fromkeys(symbols[:6])) or "이름 없는 신호"
    tone_text = ", ".join(dict.fromkeys(tones[:4])) or "불안정한 잔향"
    clue_text = ", ".join(dict.fromkeys(clues[:6])) or "확정 단서 없음"
    prefix = f"{existing_summary.rstrip()} " if existing_summary else ""
    return (
        f"{prefix}장기 기억은 {len(shards)}개의 파편을 흡수했다. "
        f"반복 상징은 [{symbol_text}], 정서는 [{tone_text}], 확정 단서는 [{clue_text}]로 남아 "
        "다음 장면의 인과율 압력과 NPC 반응을 낮은 배경 신호로 조정한다."
    ).strip()

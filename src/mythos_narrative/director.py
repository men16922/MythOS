from __future__ import annotations

import json
import re
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

from .fallbacks import default_fallback
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
from .trace import set_trace_fields, unwrap_provider, wrap_provider
from .usage import clear_usage, take_usage
from .variation import NoveltyController


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

# Typed fallback reasons. A bare OUTCOME_FALLBACK count cannot distinguish a
# safety-filter empty (watched prod risk) from a malformed payload or a dead
# provider, so every fallback records which reject edge it came through.
REASON_BLANK_OUTPUT = "blank_output"  # provider returned empty/blank content (safety filter)
REASON_PARSE_ERROR = "parse_error"  # provider returned content we could not parse
REASON_PROVIDER_ERROR = "provider_error"  # provider call itself raised (network/model)


def _classify_fallback_reason(error: BaseException | None) -> str:
    if isinstance(error, NarrativeParseError):
        text = " ".join(error.errors).lower()
        # A structurally-present payload whose narration is empty IS the
        # safety-filter signature (observed 2026-07-19: filtered generations
        # return structure with blank narration, not an empty body) — counting
        # it as blank_output rather than parse_error is deliberate.
        if "empty" in text and ("payload" in text or "narration" in text):
            return REASON_BLANK_OUTPUT
        return REASON_PARSE_ERROR
    return REASON_PROVIDER_ERROR


@dataclass
class NarrativeMetrics:
    """In-memory counters for Narrative Director generation outcomes.

    Deliberate ``--fallback`` runs never reach the provider, so they are not
    recorded here; this only tracks the quality of the live provider path.
    """

    counts: dict[str, int] = field(default_factory=lambda: {outcome: 0 for outcome in _OUTCOMES})
    last_outcome: str | None = None
    fallback_reasons: dict[str, int] = field(default_factory=dict)

    def record(self, outcome: str, reason: str = "") -> None:
        self.counts[outcome] = self.counts.get(outcome, 0) + 1
        self.last_outcome = outcome
        if outcome == OUTCOME_FALLBACK:
            key = reason or "unknown"
            self.fallback_reasons[key] = self.fallback_reasons.get(key, 0) + 1

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
            "fallback_reasons": dict(self.fallback_reasons),
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
                    "num_ctx": self.config.ollama_num_ctx,
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
                    "num_ctx": self.config.ollama_num_ctx,
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
                    "num_ctx": self.config.ollama_num_ctx,
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
                    "num_ctx": self.config.ollama_num_ctx,
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
                    "num_ctx": self.config.ollama_num_ctx,
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
        if provider is None:
            # Select Ollama (default) or the Gemini/Vertex cloud provider per
            # MYTHOS_NARRATIVE_PROVIDER. Lazy import avoids a director↔provider cycle.
            from .gemini_provider import build_narrative_provider

            provider = build_narrative_provider()
        # Tracing wraps every provider at one seam, so a workload trace has the
        # same shape no matter which engine served it. Off unless
        # MYTHOS_PROMPT_TRACE is set, in which case wrap_provider is a no-op.
        self.provider = wrap_provider(provider)
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

    def _keybeat_model(self, context: NarrativeContext) -> str | None:
        """Per-turn model override for the key-beat split (legacy/Gemini path).

        Returns the provider config's ``keybeat_model`` on key-beat turns
        (opening/anchor/cutscene/boss/ending — set by the context builder), else
        None → the provider's base model. Configs without the attr (Ollama
        ``AgentConfig``) always return None, so the local path is untouched.
        """
        if not context.key_beat:
            return None
        return getattr(getattr(self.provider, "config", None), "keybeat_model", None)

    def generate_first_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        set_trace_fields(
            loop_id=getattr(context.loop, "loop_id", None),
            turn_index=context.turn_index,
            language=context.language,
        )
        if self._use_dual_model():
            story_model = self._story_model()
            return self._generate_dual(context, build_first_story_messages(context), model=story_model)
        return self._generate_legacy(
            context, build_first_scene_messages(context), model=self._keybeat_model(context)
        )

    def generate_next_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        set_trace_fields(
            loop_id=getattr(context.loop, "loop_id", None),
            turn_index=context.turn_index,
            language=context.language,
        )
        if self._use_dual_model():
            story_model = self._story_model()
            return self._generate_dual(context, build_next_story_messages(context), model=story_model)
        return self._generate_legacy(
            context, build_next_scene_messages(context), model=self._keybeat_model(context)
        )

    def stream_first_scene(self, context: NarrativeContext) -> Iterator[NarrativeStreamEvent]:
        set_trace_fields(
            loop_id=getattr(context.loop, "loop_id", None),
            turn_index=context.turn_index,
            language=context.language,
        )
        if self._use_dual_model():
            story_model = self._story_model()
            yield from self._stream_generate_dual(context, build_first_story_messages(context), model=story_model)
        else:
            yield from self._stream_generate_legacy(
                context, build_first_scene_messages(context), model=self._keybeat_model(context)
            )

    def stream_next_scene(self, context: NarrativeContext) -> Iterator[NarrativeStreamEvent]:
        set_trace_fields(
            loop_id=getattr(context.loop, "loop_id", None),
            turn_index=context.turn_index,
            language=context.language,
        )
        if self._use_dual_model():
            story_model = self._story_model()
            yield from self._stream_generate_dual(context, build_next_story_messages(context), model=story_model)
        else:
            yield from self._stream_generate_legacy(
                context, build_next_scene_messages(context), model=self._keybeat_model(context)
            )

    def fallback_scene(self, context: NarrativeContext) -> tuple[Scene, ScenePayload]:
        payload = _fallback_payload(context)
        payload = _apply_novelty_guard(context, payload)
        return _scene_from_payload(context, payload), payload

    def summarize_loop(
        self,
        events: list[dict[str, Any]],
        *,
        use_llm: bool = True,
        language: str = "ko",
    ) -> str:
        """Generates a poetic 2-3 sentence summary of the entire loop events.

        ``use_llm=False`` (fallback/fast paths) returns a deterministic summary
        without touching the provider. This keeps loop-end — notably combat
        defeat — instant instead of blocking on a slow Ollama call (the provider
        only raises on error, not on slowness, so the except below cannot guard
        a merely-slow response).
        """
        if not use_llm:
            return _fallback_loop_summary(events, language)
        target = "English" if language == "en" else "Korean"
        prompt = (
            "Summarize the following sequence of events in a loop-based narrative. "
            "Focus on the player's key choices and the significant changes to the world. "
            f"Write the summary in {target}, in a poetic but clear style fitting a "
            "cyber-mythic game. Keep it to 2-3 sentences.\n\nEvents:\n"
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
            return _fallback_loop_summary(events, language)

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
                provider=type(unwrap_provider(self.provider)).__name__,
            ):
                story_text = cast(Any, self.provider).generate_story(story_messages, model=model)
        except Exception:
            self.logger.warning("storyteller model failed, using fallback", exc_info=True)
            scene, payload = self.fallback_scene(context)
            self._record_outcome(context, OUTCOME_FALLBACK, reason=REASON_PROVIDER_ERROR)
            return scene, payload

        # Step 2: Structural parsing via Regex & Heuristics (Instant)
        reason = ""
        try:
            payload = parse_story_text(story_text)
            payload = _apply_novelty_guard(context, payload)
            outcome = OUTCOME_SUCCESS
        except Exception as exc:
            self.logger.warning("storytext parsing failed, using fallback", exc_info=True)
            scene, payload = self.fallback_scene(context)
            outcome = OUTCOME_FALLBACK
            reason = _classify_fallback_reason(exc)

        self._record_outcome(context, outcome, reason=reason)
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
            reason = ""
        except Exception as exc:
            self.logger.warning("dual-model streaming failed, using fallback", exc_info=True)
            scene, payload = self.fallback_scene(context)
            outcome = OUTCOME_FALLBACK
            reason = _classify_fallback_reason(exc)

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
                "reason": reason,
            },
        )
        self._record_outcome(context, outcome, reason=reason)
        yield NarrativeStreamEvent(
            kind="fallback" if outcome == OUTCOME_FALLBACK else "final",
            scene=scene,
            payload=payload,
            outcome=outcome,
        )

    def _generate_legacy(
        self,
        context: NarrativeContext,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
    ) -> tuple[Scene, ScenePayload]:
        # Legacy single-model generation (uses provider.generate on config.ollama_model).
        # `model` (key-beat split) overrides the provider's base model for this turn;
        # it is only ever non-None for providers whose config declares keybeat_model,
        # so the bare-protocol generate(messages) call stays valid everywhere else.
        clear_usage()
        try:
            with timed(
                "mythos.narrative.generate",
                self.logger,
                "narrative generation finished",
                player_id=context.player.player_id,
                loop_id=context.loop.loop_id,
                provider=type(unwrap_provider(self.provider)).__name__,
                model_override=model or "",
                key_beat=context.key_beat,
            ) as log_fields:
                if model:
                    raw_payload = cast(Any, self.provider).generate(messages, model=model)
                else:
                    raw_payload = self.provider.generate(messages)
                # Token counts exist only after the call, and only for providers
                # that report them; this is what makes per-loop cost recoverable
                # from the turn log instead of estimated (PROGRESS_LOG 2026-08-13).
                log_fields.update(take_usage())
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
                    self._record_outcome(
                        context, OUTCOME_FALLBACK, reason=_classify_fallback_reason(first_error)
                    )
                    return scene, payload
                try:
                    repair_messages = build_repair_messages(
                        raw,
                        getattr(first_error, "errors", [str(first_error)]),
                        context,
                    )
                    if model:
                        repaired_raw = cast(Any, self.provider).generate(
                            repair_messages, model=model
                        )
                    else:
                        repaired_raw = self.provider.generate(repair_messages)
                    try:
                        payload = parse_scene_payload(repaired_raw)
                        outcome = OUTCOME_PROVIDER_REPAIR
                    except NarrativeParseError:
                        payload = parse_scene_payload(repair_scene_payload(repaired_raw))
                        outcome = OUTCOME_LOCAL_REPAIR
                except Exception:
                    scene, payload = self.fallback_scene(context)
                    self._record_outcome(
                        context, OUTCOME_FALLBACK, reason=_classify_fallback_reason(first_error)
                    )
                    return scene, payload

        payload = _apply_novelty_guard(context, payload)
        self._record_outcome(context, outcome)
        return _scene_from_payload(context, payload), payload

    def _stream_generate_legacy(
        self,
        context: NarrativeContext,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
    ) -> Iterator[NarrativeStreamEvent]:
        stream_method = getattr(self.provider, "stream", None)
        if not callable(stream_method):
            scene, payload = self._generate_legacy(context, messages, model=model)
            yield NarrativeStreamEvent(kind="text", text=payload.narration)
            yield NarrativeStreamEvent(kind="final", scene=scene, payload=payload)
            return

        raw_parts: list[str] = []
        extractor = NarrationFieldExtractor()
        start = perf_counter()
        clear_usage()
        try:
            # `model` is only ever non-None for providers whose config declares
            # keybeat_model (Gemini), and that provider's stream accepts it.
            chunks = stream_method(messages, model=model) if model else stream_method(messages)
            for chunk in chunks:
                raw_parts.append(chunk)
                for text in extractor.feed(chunk):
                    yield NarrativeStreamEvent(kind="text", text=text)
            raw_payload = "".join(raw_parts)
            scene, payload, outcome, reason = self._scene_from_raw_or_fallback(context, raw_payload)
            if outcome == OUTCOME_FALLBACK and self._stream_retry_enabled():
                # Streamed controlled generation can degenerate into a whitespace
                # run that hits max_output_tokens (observed on gemini-3.5-flash:
                # finish=MAX_TOKENS, tail all spaces), so a parse failure here is
                # usually transient. One non-streaming retry recovers the turn
                # instead of silently serving the canned fallback scene on the
                # highest-leverage (key-beat) turns.
                self.logger.warning(
                    "streamed payload unparseable, retrying non-streaming",
                    extra={
                        "player_id": context.player.player_id,
                        "loop_id": context.loop.loop_id,
                        "raw_len": len(raw_payload),
                        "raw_tail": raw_payload[-120:],
                    },
                )
                retry_raw = (
                    cast(Any, self.provider).generate(messages, model=model)
                    if model
                    else self.provider.generate(messages)
                )
                scene, payload, outcome, reason = self._scene_from_raw_or_fallback(
                    context, retry_raw
                )
        except Exception as exc:
            self.logger.warning("legacy streaming failed, using fallback", exc_info=True)
            scene, payload = self.fallback_scene(context)
            outcome = OUTCOME_FALLBACK
            reason = _classify_fallback_reason(exc)

        latency_ms = round((perf_counter() - start) * 1000, 3)
        self.logger.info(
            "narrative streaming finished",
            extra={
                "player_id": context.player.player_id,
                "loop_id": context.loop.loop_id,
                "provider": type(self.provider).__name__,
                # Which model actually served this turn ("" = provider base model).
                # The key-beat A/B verdict is read off these two fields in prod logs;
                # streaming is the production path, so they must be logged here too.
                "model_override": model or "",
                "key_beat": context.key_beat,
                "latency_ms": latency_ms,
                "status": "fallback" if outcome == OUTCOME_FALLBACK else "succeeded",
                "outcome": outcome,
                "reason": reason,
                # Token counts for every provider call this turn made, including
                # the non-streaming retry above — this is the production path, so
                # it is where per-loop cost actually becomes recoverable.
                **take_usage(),
            },
        )
        self._record_outcome(context, outcome, reason=reason)
        yield NarrativeStreamEvent(
            kind="fallback" if outcome == OUTCOME_FALLBACK else "final",
            scene=scene,
            payload=payload,
            outcome=outcome,
        )

    def _scene_from_raw_or_fallback(
        self, context: NarrativeContext, raw_payload: str
    ) -> tuple[Scene, ScenePayload, str, str]:
        try:
            payload = parse_scene_payload(raw_payload)
            payload = _apply_novelty_guard(context, payload)
            return _scene_from_payload(context, payload), payload, OUTCOME_SUCCESS, ""
        except Exception as first_error:
            try:
                payload = parse_scene_payload(repair_scene_payload(raw_payload))
                payload = _apply_novelty_guard(context, payload)
                return _scene_from_payload(context, payload), payload, OUTCOME_LOCAL_REPAIR, ""
            except Exception:
                scene, payload = self.fallback_scene(context)
                return scene, payload, OUTCOME_FALLBACK, _classify_fallback_reason(first_error)

    def _record_outcome(self, context: NarrativeContext, outcome: str, reason: str = "") -> None:
        self.metrics.record(outcome, reason=reason)
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
            reason=reason,
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
                "fallback_reason": reason or None,
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

    def _stream_retry_enabled(self) -> bool:
        # Unlike _repair_enabled, fast_mode must NOT veto the streamed parse-fail
        # retry: player-facing API flows default to RuntimeOptions.fast_mode=True,
        # which silently disabled this retry in production — the 2026-08-01 arm's
        # parse_error turn served the canned fallback with zero retry attempts.
        # By the time this gate is consulted the turn has already failed, so one
        # non-streaming retry is the fastest route to a real scene; fast_mode is
        # about perceived latency, not about accepting canned fallbacks. An
        # explicit repair_enabled=False (tests / deliberate no-repair runs) wins.
        if self.repair_enabled is not None:
            return self.repair_enabled
        return True


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


# Language-keyed connective strings the director wraps around the fallback dict prose.
# Authored fallback dicts (directives/fallback.md) carry no connectives, so these stay
# in code; ko keeps the exact pre-S1 wording (behavior-preserving), en is its mirror.
_FALLBACK_CONNECTIVES: dict[str, dict[str, str]] = {
    "ko": {"action_prefix": "당신은 ", "action_suffix": ".", "action_applied": "행동이 적용되었습니다."},
    "en": {"action_prefix": "You ", "action_suffix": ".", "action_applied": "Your action has been applied."},
}


def _fallback_payload(context: NarrativeContext) -> ScenePayload:
    # Scenario-authored override (directives/fallback.md) → falls back to the shared
    # neo-seoul default for the active language. The branch *logic* (player_action /
    # novelty present?) stays here; all prose comes from the dict (prompt layer).
    fb = context.fallback_scene or default_fallback(context.language)
    conn = _FALLBACK_CONNECTIVES.get(context.language, _FALLBACK_CONNECTIVES["ko"])

    novelty_hint = ""
    if context.novelty_notes:
        novelty_hint = str(fb.get("novelty_hint_notes", ""))
    elif context.world_memories or context.narrative_shards:
        novelty_hint = str(fb.get("novelty_hint_memories", ""))

    if context.player_action:
        narration = (
            f"{conn['action_prefix']}{context.player_action}{conn['action_suffix']}\n\n"
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
        action_result=conn["action_applied"] if context.player_action else None,
    )


def _apply_novelty_guard(context: NarrativeContext, payload: ScenePayload) -> ScenePayload:
    # The scripted opening (turns 0-4) intentionally reuses the authored beat
    # titles/locations, so this repeat-heuristic mis-fires there — it was mangling
    # good opening scenes with a "Changed …" title and a canned
    # "다른 압력이 끼어든다" tail (e.g. the 세린 first-contact/chase beats). Skip it.
    if context.turn_index <= 4:
        return payload
    alternate_location, fixed_anchor = _route_novelty_target(context)
    if fixed_anchor:
        return payload

    if context.novelty_signal is not None:
        revision = NoveltyController().revise_candidate(
            context.novelty_signal,
            title=payload.title,
            location=payload.location,
            narration=payload.narration,
            alternate_location=alternate_location,
            language=getattr(context, "language", "ko"),
        )
        if revision is None:
            return payload
        return replace(
            payload,
            title=revision.title,
            location=revision.location,
            narration=revision.narration,
        )

    # Compatibility path for callers that still construct a context with only
    # prompt notes. It enforces a real state change instead of cosmetically
    # prefixing the same title with "Changed"/"달라진".
    if not context.novelty_notes or not payload.title.strip():
        return payload
    note_text = " ".join(context.novelty_notes).casefold()
    if payload.title.strip().casefold() not in note_text:
        return payload
    location = (alternate_location or payload.location).strip()
    if getattr(context, "language", "ko") == "en":
        title = f"New Vector at {location}"
        tail = f"The repeated route seals behind you; a new constraint shifts the action to {location}."
    else:
        title = f"{location}의 새 국면"
        tail = f"반복되던 경로가 뒤에서 닫히고, 새 제약이 행동을 {location}(으)로 옮긴다."
    return replace(
        payload,
        title=title,
        location=location,
        narration=f"{payload.narration.rstrip()} {tail}",
    )


def _route_novelty_target(context: NarrativeContext) -> tuple[str | None, bool]:
    """Return the staged route location and whether it is an authored anchor."""
    state = context.loop.state if isinstance(context.loop.state, dict) else {}
    route_map = state.get("_route_map")
    if not isinstance(route_map, dict):
        return None, False
    nodes = route_map.get("nodes")
    current = route_map.get("current")
    if not isinstance(nodes, dict) or current not in nodes:
        return None, False
    node = nodes.get(current)
    if not isinstance(node, dict):
        return None, False
    label = str(node.get("title") or node.get("label") or current).strip()
    return (label or None), bool(node.get("anchor"))


_INTERNAL_TOKEN = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)+$")


def _summary_action_phrase(events: list[dict[str, Any]]) -> str | None:
    """The last action, only when it reads as prose. System-generated events carry a
    raw state token (``combat_finished``) that must not surface in player-facing
    summary text (live 2026-08-08: "루프는 'combat_finished'의 잔향을…")."""
    if not events:
        return None
    action = str(events[-1].get("action") or "").strip()
    if not action or _INTERNAL_TOKEN.match(action):
        return None
    return action


def _fallback_loop_summary(events: list[dict[str, Any]], language: str = "ko") -> str:
    """Deterministic loop summary. Used on the fast/fallback paths (notably combat
    defeat), so it must honour the loop's language like the LLM path does."""
    action = _summary_action_phrase(events)
    if language == "en":
        if action is None:
            return (
                "The loop closed quietly. What remains is a signal that has not "
                "yet earned a name."
            )
        return (
            f"The loop folded, leaving the afterglow of '{action}'. "
            "The world files that choice away as a low signal."
        )
    if action is None:
        return "루프는 조용히 닫혔다. 남은 것은 아직 이름을 얻지 못한 신호뿐이다."
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

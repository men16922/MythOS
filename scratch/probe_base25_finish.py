"""Measure finish_reason + token usage on the key-beat 3.5 stream, N runs,
to catch the stochastic prod parse failure (suspect: MAX_TOKENS truncation)."""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime

os.environ.setdefault("MYTHOS_LOG_LEVEL", "ERROR")

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_narrative.gemini_provider import GeminiConfig, VertexGeminiJSONProvider, _split_messages
from mythos_narrative.parser import parse_scene_payload
from mythos_narrative.prompts import build_first_scene_messages
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context

_NOW = datetime(2026, 7, 14, tzinfo=UTC)

player = PlayerProfile("p_probe", "KeybeatQA", _NOW, _NOW, {"archetype": "ghost"})
loop = LoopState(
    "l_probe", "p_probe", "seed", LoopPhase.CONNECT, "c17_alley", 70, 22, _NOW, None, {}, []
)
ctx = build_runtime_narrative_context(
    player=player,
    loop=loop,
    scenario=load_scenario("neo-seoul"),
    turn_index=0,
    recent_events=[],
    memories=[],
    world_memories=[],
    narrative_shards=[],
    novelty_notes=[],
    language="en",
)
messages = build_first_scene_messages(ctx)
cfg = GeminiConfig(model="gemini-2.5-flash", keybeat_model=None)
provider = VertexGeminiJSONProvider(cfg)
client = provider._client()
system_instruction, contents = _split_messages(messages)
gen_cfg = provider._generation_config(system_instruction)

n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
for i in range(n):
    parts: list[str] = []
    finish = None
    usage = None
    stream = client.models.generate_content_stream(
        model="gemini-2.5-flash", contents=contents, config=gen_cfg
    )
    for chunk in stream:
        t = getattr(chunk, "text", None)
        if isinstance(t, str) and t:
            parts.append(t)
        cands = getattr(chunk, "candidates", None)
        if cands and getattr(cands[0], "finish_reason", None):
            finish = cands[0].finish_reason
        um = getattr(chunk, "usage_metadata", None)
        if um is not None:
            usage = um
    raw = "".join(parts)
    try:
        parse_scene_payload(raw)
        ok = "PARSE_OK"
    except Exception as exc:  # noqa: BLE001
        ok = f"PARSE_FAIL({type(exc).__name__})"
    out = getattr(usage, "candidates_token_count", None)
    thk = getattr(usage, "thoughts_token_count", None)
    print(
        f"run {i}: {ok} finish={finish} raw_len={len(raw)} out_tokens={out} thinking_tokens={thk}"
    )
    if "FAIL" in ok:
        print("  tail:", raw[-200:].replace("\n", " "))

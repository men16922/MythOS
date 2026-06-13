"""Ad-hoc TTFT benchmark for the dual-model narrative pipeline.

Measures, against the live Ollama:
  - real prompt token count (vs num_ctx=8192)
  - stream_story TTFT + total, run twice (cold vs warm prefix cache)
  - parser (generate_json) latency

Run: .venv/bin/python scratch/ttft_bench.py
"""
from __future__ import annotations

import time
from datetime import UTC, datetime

from openai import OpenAI

from mythos_core import LoopPhase, LoopState, PlayerProfile
from mythos_core.models import PlayerMemory, WorldEvent, WorldMemory
from mythos_image_agent.config import AgentConfig
from mythos_narrative.prompts import build_next_story_messages
from mythos_narrative.schemas import NarrativeContext

cfg = AgentConfig()
now = datetime(2026, 5, 30, tzinfo=UTC)


def make_context(heavy: bool) -> NarrativeContext:
    mems: list[PlayerMemory] = []
    wmems: list[WorldMemory] = []
    events: list[WorldEvent] = []
    if heavy:
        for i in range(4):
            mems.append(
                PlayerMemory(
                    memory_id=f"mem_{i}",
                    player_id="p1",
                    kind="echo",
                    content={
                        "summary": (
                            "세린은 비식별 신호를 따라 데이터 지층 깊은 곳으로 향했고, "
                            "추격자들이 골목마다 잠복해 있었다. 오존 냄새가 코를 찔렀다. " * 3
                        )
                    },
                    weight=1.0,
                    created_at=now,
                    updated_at=now,
                )
            )
        for i in range(3):
            wmems.append(
                WorldMemory(
                    memory_id=f"wm_{i}",
                    world_id="neo-seoul",
                    kind="causality",
                    content={"summary": "검열 드론 순찰이 강화되었고 시민들은 광장을 피한다. " * 4},
                    weight=1.0,
                    created_at=now,
                    updated_at=now,
                )
            )
        for i in range(3):
            events.append(
                WorldEvent(
                    event_id=f"ev_{i}",
                    loop_id="loop1",
                    turn_index=i,
                    actor="player",
                    action="플레이어가 색인 단말을 해킹해 금서 좌표를 얻었다. " * 3,
                    result="좌표 획득",
                    state_delta={},
                    created_at=now,
                )
            )

    return NarrativeContext(
        player=PlayerProfile(
            player_id="p1", display_name="세린", created_at=now, updated_at=now
        ),
        loop=LoopState(
            loop_id="loop1",
            player_id="p1",
            seed="seed1",
            phase=LoopPhase.EXPLORE,
            location_id="data-layer-03",
            stability=55,
            tension=45,
            started_at=now,
        ),
        turn_index=3,
        recent_events=events,
        memories=mems,
        world_memories=wmems,
        player_action="비식별 신호의 출처를 추적한다",
    )


def count_prompt_tokens(messages: list[dict[str, str]]) -> int:
    client = OpenAI(base_url=cfg.ollama_base_url, api_key="ollama", timeout=600)
    r = client.chat.completions.create(
        model=cfg.ollama_model_story,
        messages=messages,
        temperature=0.4,
        max_tokens=1,
        extra_body={"keep_alive": "30m", "options": {"num_ctx": 8192}},
    )
    return r.usage.prompt_tokens if r.usage else -1


def stream_once(messages: list[dict[str, str]], num_ctx: int) -> tuple[float, float, int]:
    client = OpenAI(base_url=cfg.ollama_base_url, api_key="ollama", timeout=600)
    start = time.perf_counter()
    ttft = None
    chars = 0
    stream = client.chat.completions.create(
        model=cfg.ollama_model_story,
        messages=messages,
        temperature=0.4,
        stream=True,
        extra_body={
            "keep_alive": "30m",
            "options": {
                "num_ctx": num_ctx,
                "repeat_penalty": 1.3,
                "repeat_last_n": 256,
                "top_p": 0.85,
                "top_k": 30,
                "num_predict": 512,
            },
        },
    )
    for chunk in stream:
        c = chunk.choices[0].delta.content
        if c:
            if ttft is None:
                ttft = time.perf_counter() - start
            chars += len(c)
    total = time.perf_counter() - start
    return ttft or total, total, chars


def main() -> None:
    print(f"story model = {cfg.ollama_model_story}")
    print(f"parser model = {cfg.ollama_model_parser}")
    print(f"base_url = {cfg.ollama_base_url}\n")

    for label, heavy in (("MINIMAL", False), ("HEAVY (≈real play)", True)):
        ctx = make_context(heavy)
        msgs = build_next_story_messages(ctx)
        chars = sum(len(m["content"]) for m in msgs)
        print(f"=== {label} ===")
        print(f"prompt chars = {chars}")
        ptok = count_prompt_tokens(msgs)
        print(f"prompt tokens = {ptok}  (num_ctx cap = 8192 -> {'TRUNCATED!' if ptok > 8192 else 'ok'})")

        for run in (1, 2):
            ttft, total, out = stream_once(msgs, 8192)
            print(f"  stream_story run{run}: TTFT={ttft:.1f}s total={total:.1f}s out_chars={out}")
        print()


if __name__ == "__main__":
    main()

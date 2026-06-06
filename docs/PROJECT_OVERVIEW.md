# Project MythOS Overview

최종 갱신: 2026-06-06

Project MythOS / 세계:접속은 AI가 게임마스터 역할을 수행하는 1인용 SF 루프형 TRPG/CRPG다. 플레이어는 붕괴하는 데이터 세계에 접속한 첫 번째 Connector가 되어, 루프마다 단서와 잔향을 남기며 세계의 진실에 접근한다.

## Core Fantasy

- **AI GM**: Ollama-backed Narrative Director가 장면, 선택지, 판정 서사를 생성한다.
- **Loop campaign**: 한 세션은 하나의 루프이며, 종료 후 Echo/Run Summary/Memory가 다음 루프에 영향을 준다.
- **Survival clock**: stability/tension이 세션 압력을 만든다.
- **Codex**: Narrative Shard, lore, inventory, echoes, progression state를 플레이어가 읽는 기억의 별자리로 노출한다.
- **Tactical combat**: LLM이 아니라 deterministic combat engine이 이동, 명중, 피해, 스킬, AI, 승패를 판정한다.

## Current Product Surface

- Primary: FastAPI-served React + TypeScript SPA at `http://localhost:8000`.
- Secondary: Streamlit local demo at `http://localhost:8501`.
- CLI: smoke/demo and scripted runtime operations.

All surfaces share `RuntimeSessionService`; UI layers should not own gameplay rules.

## Content

- Primary scenario: `Neo-Seoul 01`.
- Expansion sample: `glass-library`.
- Scenario runtime data: `resources/<scenario>/scenario.json`.
- Story bible snippets: `resources/<scenario>/story_bible/bible.json`.

## Local Stack

- PostgreSQL: runtime state and memory.
- MinIO: generated/static asset storage.
- Redis: visual job queue and worker heartbeat.
- Ollama: local LLM.
- mflux/FLUX: Apple Silicon image generation.
- OTel/Jaeger: tracing and diagnostics.

## Active Direction

See `docs/NEXT_PLAN.md`.

Current priorities:

1. Character-art combat presentation upgrade.
2. Archetype/skill progression and Codex Skill tree.
3. Controllable party allies.
4. `glass-library` scenario expansion.

# Gameplay Design

최종 갱신: 2026-06-06

이 파일은 현재 게임 규칙의 압축본이다. 장문 원문은
`docs/archive/GAMEPLAY_FULL_2026-06-06.md`를 본다.

## One-Line

AI가 게임마스터인 1인용 루프형 TRPG/CRPG. 플레이어는 데이터 세계에 접속한 Connector이며, 루프마다 생존·단서·관계·전투 결과를 남겨 다음 루프의 세계를 바꾼다.

## Design Pillars

- **AI GM**: Narrative Director가 장면 묘사, 선택지, 판정 서사를 만든다.
- **Loop memory**: Echo, Run Summary, Narrative Shard, World/Player Memory가 다음 루프에 반영된다.
- **Survival + mystery**: stability/tension은 단기 생존 압력, Codex/lore는 장기 미스터리 진행도다.
- **Engine-authoritative combat**: 전투 판정은 deterministic combat engine이 담당한다.
- **Hybrid presentation**: 평소에는 읽기 좋은 서사 UI, 접속/붕괴/해금/전투는 디제틱 연출.

## Core Loop

1. Player begins or resumes a loop.
2. AI GM presents a scene and choices/free-action affordance.
3. Player chooses or declares an action.
4. Runtime validates world delta, updates stability/tension/flags/memory.
5. Scene may trigger clues, NPC state, travel, combat, ending pressure, or visual generation.
6. Loop archives into run summary/echo/progression on ending or collapse.

## Phases

`CONNECT -> EXPLORE -> INTERACT -> REWRITE -> ARCHIVE -> ENDED`

Phases are narrative framing and runtime state. The AI can color transitions, but runtime validation owns legal state changes.

## Player Systems

- 5 stats: Strength, Intelligence, Charisma, Agility, Perception.
- Archetype/persona affects initial stats, prose bias, and eventually unlock gating.
- Autonomy level gates how far the character can resist/alter the world.
- Stability low or tension high means collapse pressure and possible loop end.

## Codex / Progression

Current implemented concepts:

- Narrative Shards as clues.
- Lore/codex unlocks.
- Run History and run summaries.
- Meta progression with traits/allies/items/codex unlocks.
- Save/load for active loops; ended loops belong to history.

Planned next:

- Ghost-only initial archetype gate.
- Skill unlocks through epiphany events.
- Insight points for Codex Skill tree learning/rank-up.

## Combat

Combat is a tactical submode:

- Scenario data defines weapons, skills, allies, bestiary, encounters, loot.
- Engine handles initiative, movement, range, accuracy, damage, crit, skills/items, flee, AI, outcome.
- LLM may introduce encounters but does not decide hit/damage/outcome.
- React renders tactical board, drag/drop movement, rosters, controls, log, VFX.
- Streamlit uses a local JSON bridge to avoid per-action iframe remount.

Current combat direction:

- Character-art board sprites.
- role/tags-driven skill animations.
- Icon action bar.
- Controllable party allies.

## Scenario / Story Bible

- `scenario.json` contains runtime data and scenario-specific GM policy.
- `story_bible/bible.json` contains author-written snippets.
- Only relevant snippets should enter the prompt based on phase/location/flags/NPC state.
- Neo-Seoul 01 is primary; `glass-library` is next expansion target.

## UI Rule

Player UI hides raw ids, provider details, repair metrics, and infra internals. Developer UI may expose metrics, memories, flags, endings, infra links, and asset diagnostics.

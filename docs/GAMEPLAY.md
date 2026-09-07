# Gameplay Design

최종 갱신: 2026-06-06

이 파일은 현재 게임 규칙의 압축본이다. 장문 원문은
`bin/docs/archive/GAMEPLAY_FULL_2026-06-06.md`를 본다.

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
- Archetype gates, skill unlock epiphanies, insight points, Codex Skill tree learning/rank-up.

Current focus:

- Tune insight/skill rewards inside `neo-seoul` so progression improves replay motivation and combat choices.

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

Party survivability rules (2026-07-04):

- A downed ally (hp<=0) sits out only the current fight; the next encounter rebuilds them at max(1, max_hp//4) (`combat_service._build_allies`).
- Every narrative scene commit heals the player + living members `REST_RECOVERY_HP` (2) toward max — the rest beat between fights. Downed members are not rest-healed.
- Heal/shield support skills (role healing/defense) can be directed at any friendly in range: engine `friendly_targets` + the SUPPORT TARGET row in `CombatControls` (default = most wounded).
- `restart_core` (재기동 코어, rare consumable; market 5 scrap) revives the first downed ally mid-combat at max(bonus, max_hp//3); not consumed when nobody is down.
- LLM scenes may grant carriable items via `world_delta.grant_items` (e.g. salvaging drone wreckage → drone_scrap): ids whitelisted to kinds consumable/material and capped 2/scene at commit (`session._filter_grant_items`), then materialized to full item defs for the inventory UI.

Status effects (2026-07-12 base, 2026-09-06 intensity stacking — owner "option 2"):

- Six persistent statuses, one rule row each in `mythos_combat/status_rules.py`: burn (DoT at the victim's turn start), corrode (armor down), acid (defense down), freeze (no movement, can still act), shock (no focus regen, cooldowns frozen), hacked (spends its next turn attacking its own side).
- Reapplying a status **accumulates turns** up to its cap (burn 3, the rest 6) **and raises its stack count** where the status has a magnitude: burn `1d4 × stacks` (cap 3), corrode `-2 armor × stacks` (cap 2), acid `-2 defense × stacks` (cap 2). freeze/shock/hacked are binary gates pinned at one stack.
- Stacks never decay per turn; they clear with the status (expiry, hacked consumption, revive — a revived unit comes back clean). The log says ` (중첩 ×N)`, the roster chip and board badge show `×N`.
- **Boss stack resistance** (2026-09-07): a unit with `ai == "boss"` holds at most `BOSS_STACK_CAP = 2` stacks of any status (so burn tops out at ×2 on IX); the turns still refresh and the refused stack is logged (`중첩 저항!` / `stacking resisted!`). Same intent as the stun guard below — one constant in `status_rules.py`.
- Stun is a separate ledger (`stunned_turns`, cap 3, boss follow-up stun halved) and does not stack in intensity.

Current focus:

- Tune Neo-Seoul encounters so each fight has a gameplay purpose: movement, focus use, ally protection, recovery, or escape pressure.

## Scenario / Story Bible

- `scenario.json` contains runtime data and scenario-specific GM policy.
- `story_bible/bible.json` contains author-written snippets.
- Only relevant snippets should enter the prompt based on phase/location/flags/NPC state.
- Neo-Seoul 01 is primary; `glass-library` is next expansion target.
- As of 2026-06-07, `glass-library` expansion is on hold. Current priority is making Neo-Seoul 01 feel like a complete playable scenario.

## UI Rule

Player UI hides raw ids, provider details, repair metrics, and infra internals. Developer UI may expose metrics, memories, flags, endings, infra links, and asset diagnostics.

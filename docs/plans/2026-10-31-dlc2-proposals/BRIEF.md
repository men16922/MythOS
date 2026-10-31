# Proposal brief — game improvement, DLC 2, fun (2026-10-31)

Owner request: Claude, Astra (Codex) and Argon (agy) each write a concrete, independent proposal covering **game improvement, use of reverse engineering, content expansion, DLC 2 and fun**. Claude then judges and merges them into one plan. You write one proposal; you do not merge.

## Deliverable

Write exactly one file in this directory, in **Korean**, under 200 lines: `astra.md` (Codex lane), `argon.md` (agy lane) or `claude-proposal.md` (Claude lane, renamed: `claude.md` loads as a project `CLAUDE.md` on this case-insensitive disk). Tick your own seed in `docs/NEXT_PLAN.md` and add one short entry to `docs/PROGRESS_LOG.md`. Change nothing else: no code, content, config, tests or other docs. This is a proposal, not an implementation.

**Independence:** do not open the other agents' proposal files in this directory, even if they exist. Do not open `docs/plans/2026-10-31-next-update-plan.md` either; it is one agent's earlier draft and would anchor you. A proposal that repeats the known backlog adds nothing, so bring your own judgment.

## Read first

`docs/AGENT_BRIEF.md`, `docs/GAMEPLAY.md`, `docs/LESSONS.md`, `docs/DECISIONS.md`, `docs/test/mythos2_fun_check.md`, `docs/plans/2026-10-30-next-content-expansion-plan.md`, `docs/plans/2026-10-26-dlc-expansion-plan.md`. Then read `src/mythos_ui/src/v2/engine` and `src/mythos_ui/src/v2/content` as needed.

## Lead with your strength

- **Astra:** world, narrative, scenes worth retelling, wording, what makes the setting distinctive.
- **Argon:** game concept, content variety, visual identity, what a player sees and remembers.
- **Claude:** systems, engine seams, balance risk, build cost, what is really cheap and what only looks cheap.

Cover every section anyway.

## Evidence rules

An earlier review invented effects that do not exist in the content, so:

- Every claim about this game cites a repo path, with a line number where possible. If you did not check it, say "미확인".
- Claims about other games come from memory, since this run has no network. Mark them "기억 기반". Do not invent numbers.
- Any number for this game is read from code or a run you made, never estimated silently.

## Reverse engineering: what it means here

Allowed: analysing the **publicly observable rules and structure** of other games (what the player sees, how a system pays off, why it works), then redesigning the idea in Mythos's own terms. Also allowed and encouraged: reverse-engineering **our own game** — mining the bot simulator, `engine/`, content tables and branch `1.0` for what is unused, dominated, repetitive or never reached.

Not allowed: decompiling, extracting or copying code, assets, data files, text or names from any other game; bypassing protection of any kind. Propose nothing that needs these. Flag anything with a patent risk (the Nemesis note in the expansion plan is the example).

## Standing owner rules

- Fun first. Judge every idea on decision (does each run's thinking change), scene (is there a moment you would tell someone about), discovery (is there something to look for next run). Added fatigue is a penalty.
- UX first: the game stays simple on screen; backend complexity is fine. New indicators are small and quiet.
- The telegraph pillar stays: every damage and outcome is previewed before it happens.
- AI stays off the critical path: authored text first, authored fallback always, AI never decides numbers. Dailies and replays stay AI-free and deterministic.
- Only IX remembers across runs; companions get faint deja vu at most. Runtime image generation and LLM-made cards, enemies or maps are rejected.
- Paid release is on hold; contests and showcases are the outlet. Bots cannot measure fun, so a big build starts with a small art-free prototype the owner can try in the sandbox.
- New images: Codex image only. Vertex Veo is banned.
- Standard-run mixed bot sits at 44.9 % in a 35–45 % band: nothing that adds net power fits without a cost.
- The game already has six acts, 11 companions, 5 archetypes, 176 cards. Do not propose volume for its own sake.

## Required headings, in this order

1. `## 요약` — five lines at most: your single strongest recommendation first.
2. `## 현재 게임 진단` — the three biggest weaknesses, each with evidence.
3. `## 리버스 엔지니어링` — other games (3–5, in a table: 구조, Mythos 현황, 가져올 것, 가져오지 않을 것) and at least two findings from reverse-engineering our own game.
4. `## 게임 개선` — 3–5 changes to what already exists, no new content.
5. `## 콘텐츠 확장` — small additions that change decisions, not volume.
6. `## DLC 2` — one concept, not a menu: title, player fantasy, the one new rule, why it is not Deep Signal again, scope (acts, enemies, cards, scenes, images), what can be reused.
7. `## 재미 프로토타입` — the smallest art-free test of your best idea, and what result would kill it.
8. `## 우선순위` — a table: 항목, 규모 (S/M/L), 판단, 장면, 발견, 피로, 위험, 선행 조건.
9. `## 확인할 사항` — decisions or facts only the owner can settle, each with your default.

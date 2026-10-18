# MYTHOS 2.0 — Signal Run (세계:접속) · contest write-up

*Judge-facing summary, English. Facts are as of 2026-10-18; numbers come from the repo's own tests, simulator and
logs (see "Evidence" at the end). Owner-facing contest plan: `docs/plans/2026-10-18-strategy-and-market-analysis.md` §5.*

## One line

A cyberpunk tactics deck-builder where you read every enemy move before it happens — and an AI game master,
the city's administrator AI and the people you meet react to what you actually did and typed, without ever being
allowed to decide the outcome.

## What you play

- **Into the Breach-style board (7×5).** Enemies telegraph exactly where they will strike. You win by moving,
  pushing enemies into each other, into burning ground, live wires or the void — not by out-trading damage.
- **Slay the Spire-style run.** Branching act map (3 acts; act 1 and 2 bosses drawn from a pool of two each, IX at the top), deck of protocol cards,
  implants (passives with sets), consumables, shops, safehouses, events, a daily seed with a leaderboard.
- **Hades-style loop.** Each loop leaves echoes; companions build bonds; the Archive unlocks cards, lore, endings.
- **A Baldur's Gate-style layer.** Districts with d20 conversations, approval, backgrounds, quests and camp nights.
- Content: 104 cards · 29 enemies · 39 encounters · 44 implants · 68 events · 6 companions with 3-event arcs ·
  6 districts with 18 NPCs you can talk to in your own words · 4 endings. Korean and English throughout. Web + Android.

## Where the AI is — and where it is not

| The AI does | The AI never does |
| --- | --- |
| Narrates each scene in the GM's voice, shaped by your stats, trace level and party | Block play: the authored line is already on screen; the AI line swaps in if it arrives in time |
| **Improvise:** you type any action in an event; the model classifies it into a stat, a difficulty (3–9), one reward and one risk from fixed lists, and the engine rolls it | Pick outcomes, numbers or rewards — the engine clamps every Improvise result to fixed ranges |
| **NPC talk:** you type what you say; the NPC answers in character and the model maps your words onto one of the scene's real options, which then rolls a d20 | Invent options, items or state changes outside the authored scene |
| **IX**, the administrator AI, cuts in on notable combat moments and remembers earlier loops (who killed you, how often) | Touch the daily seed: dailies are identical for everyone, AI or not |
| Writes a run chronicle from the actions you typed; talking enemies taunt at half health | Generate images, cards or enemies at runtime |

Design rule: **authored text first, AI on top.** Every AI call has an authored fallback, a timeout, a per-player
monthly allowance, a global daily ceiling and a monthly spend cap. Lines a model wrote are logged per run and
reportable in-app. Measured cost: ≈ 63 model calls ≈ **$0.05 per full run** (Vertex `gemini-3.8-flash`).

## Engineering worth a look

- **Pure TypeScript engine**, JSON state, seeded randomness only — the same seed and the same inputs replay the
  same run. Randomness is split into **named streams** (map per act; rewards/shop/events per node; shuffle and
  enemy AI per fight), so on the daily seed every player gets the same maps and the same fight at the same node
  no matter what they did before — the precondition for replay-verified leaderboards.
- **Bots that play the real thing**: a greedy (1-ply exhaustive) and a mixed bot drive the run simulator used for
  balance A/B on identical seed blocks, and a UI bot plays whole runs through real clicks in a headless browser.
- **Gates**: 339 engine/content tests, 323 backend tests, a browser smoke, a 3-minute UI playthrough; 100 %
  generated-art coverage is itself a test.
- Stack: React 19 + Vite, FastAPI on Cloud Run, Postgres, Firebase Google sign-in, Vertex AI (Gemini), Capacitor
  Android. Art: generated (image models), curated per screen; music: generated loops.

## Try it

- Web: the production Cloud Run URL (see `docs/online.md`). Plays fully offline without an account; **AI lines need
  Google sign-in** (guests get the authored game).
- A full run is three acts (about 15 fights); the daily seed is the quickest way to compare runs.

## Evidence (in this repo)

- Rules: `docs/GAMEPLAY.md` · design contract: `docs/plans/2026-10-10-mythos-2.0.md`
- Balance numbers: `.claude/skills/gameplay-qa/references/qa-routes.md` (mixed bot ≈ 43 % wins at base difficulty)
- AI cost measurement: `bin/docs/archive/progress-2026-10-17-mythos2-ai-and-bench.md`
- Named RNG streams: `src/mythos_ui/src/v2/engine/streams.ts` + `streams.test.ts`

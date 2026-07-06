# AGY-Assisted Neo-Seoul Live QA Lane

Status: **WS0 complete — WS1 next**  
Date: 2026-06-21  
Primary checklist: `docs/test/neo_seoul_live_qa.md`  
Related operations docs: `docs/engineering/mythos/{AGENTIC,LOOP,VERIFICATION}.md`

## 1. Decision

Create a separate, explicitly armed **`[qa:agy]` evidence lane** for Neo-Seoul live QA. It must not broaden the existing `[auto:agy]` image lane and must not let an agent close human-feel checklist items automatically.

AGY's role is:

1. execute or supervise a real browser play session;
2. collect reproducible evidence;
3. issue `PASS_CANDIDATE`, `FAIL_EVIDENCE`, or `NEEDS_HUMAN` per checklist item;
4. leave the final `[x]` sign-off to a human.

The practical goal is not to replace human judgment. It is to reduce a 30–60 minute manual run to a short review of screenshots, traces, scene excerpts, choices, and state deltas.

## 2. Why a separate lane is required

Current constraints:

- `scripts/overnight/PROMPT.agy.md` owns image drafting and simple asset verification only.
- It forbids `api`, `dev-*`, and `test-e2e*`, and limits writes to image staging/resources/tests.
- The normal overnight runner consumes deterministic `[auto*]` tasks and commits source changes.
- `docs/test/neo_seoul_live_qa.md` intentionally contains subjective checks that `make check` cannot prove.
- AGY exposes browser tools to the actor session. The intended priority is Chrome DevTools first and AGY's Playwright MCP second.
- Python Playwright may encode a deterministic regression only after an objective bug is accepted; it must never substitute for AGY during live QA.

Therefore the QA flow must be opt-in, evidence-only, and independent of the normal commit loop.

## 3. Verification boundary

| Layer | Owner | Result |
| --- | --- | --- |
| Mechanical | lifecycle wrapper + artifact validator | AGY exited cleanly, required events/screenshots exist, server stopped, source tree unchanged |
| Semantic | AGY browser actor | direct play plus evidence-backed candidate judgment for story continuity, clarity, and visible consequences |
| Creative | Human | final feel/balance/memorability sign-off in `neo_seoul_live_qa.md` |

Rules:

- AGY never changes `[ ]/[~]/[!]/[x]` in the authoritative checklist.
- AGY never edits source, tests, scenarios, prompts, or runtime state files during a QA run.
- A `PASS_CANDIDATE` is evidence for human review, not completion.
- Objective findings that recur should become Playwright/unit invariants and move down to the mechanical layer.

## 4. Proposed architecture

```text
human arms one QA run
  → deterministic wrapper performs preflight and starts an isolated API
  → AGY uses Chrome DevTools (primary) or its Playwright MCP (secondary)
  → AGY directly plays and writes checkpoint evidence
  → artifact validator checks completeness
  → report contains candidate verdicts with exact evidence references
  → wrapper stops the server and confirms source-tree invariance
  → human reviews report and updates live-QA checklist separately
```

Separate control and judgment:

- **Wrapper owns lifecycle and safety:** ports, process cleanup, timeouts, output path, source-tree cleanliness.
- **AGY owns all browser work:** navigation, choices, combat actions, screenshots, console/network inspection, and semantic judgment through its own tool families.
- **Python owns no browser:** it prepares the manifest and validates AGY-authored evidence/verdict only.
- **Human owns acceptance:** only the human converts candidate evidence into checklist sign-off or implementation work.

If Chrome DevTools is unavailable in a specific AGY session, use AGY's Playwright MCP. If both tool families fail, end `NEEDS_HUMAN`; never fall back to Python browser automation.

## 5. Lane and command contract

New tag:

- `[qa:agy]` — live observation/review task; source-read-only, evidence-write-only, never consumed by the normal `[auto:agy]` runner.

Proposed commands:

```sh
make live-qa-agy-probe       # static/fallback capability and lifecycle probe
make live-qa-agy-af          # targeted A/F evidence run
make live-qa-agy-full        # later: bounded full A-I candidate run
```

Do not overload `make overnight-agy*`. The normal target creates commits from `[auto:agy]`; the QA target creates local evidence and exits without a commit.

Proposed environment controls:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LIVE_QA_CASE` | `af` | checklist case/profile |
| `LIVE_QA_MODE` | `real` | `probe|fallback|real`; only real results can support narrative-feel review |
| `LIVE_QA_PORT` | dynamically allocated | avoid collision with developer API |
| `LIVE_QA_MAX_TURNS` | case-specific | bound runtime and spend |
| `LIVE_QA_TIMEOUT` | `3600` | hard wall-clock cap |
| `LIVE_QA_AGY` | `1` | explicit opt-in to paid/unsandboxed AGY execution |

## 6. Artifact contract

Every run writes only under:

```text
outputs/live-qa/<run-id>/
  manifest.json
  events.jsonl
  console.log
  report.md
  verdict.json
  screenshots/
```

Required contents:

- `manifest.json`: commit SHA, dirty/clean preflight, scenario, QA case, mode, model names, port, start/end timestamps, checklist revision hash.
- `events.jsonl`: turn, phase/location, visible narrative, available choices, selected choice, state gauges/deltas, combat entry/result, ending reason.
- screenshots: before/after every evaluated checkpoint, named by turn and checklist item.
- `console.log`: Chrome DevTools/Playwright MCP console errors and failed network requests (`none` when clean).
- `report.md`: concise per-item narrative with evidence links; no unsupported feel claims.
- `verdict.json`: schema-checked item verdicts (`PASS_CANDIDATE|FAIL_EVIDENCE|NEEDS_HUMAN`) and evidence paths.

Artifacts are local runtime outputs and are not committed by default. A human may promote a small report or selected screenshot intentionally when durable evidence is useful.

## 7. Implementation work packages

### WS0 — capability and safety probe

Goal: prove the smallest AGY-direct browser loop without touching real QA status.

Changes:

- Add `scripts/live-qa/run-agy.sh` with preflight, dynamic port, timeout, traps, and clean-tree checks.
- Add `scripts/live-qa/PROMPT.agy.md` with AGY-direct browser and evidence-write-only rules.
- Add `scripts/live-qa/artifacts.py` for manifest preparation, server readiness, and browser-free evidence validation.
- Add `make live-qa-agy-probe`.

Probe sequence:

1. wrapper starts fallback-mode API on an isolated port;
2. AGY directly plays two turns with Chrome DevTools or its Playwright MCP;
3. AGY writes screenshots, events, console evidence, and a candidate verdict;
4. verify no tracked files changed and all child processes stopped.

Completion criteria:

- artifact pack validates;
- source tree stays unchanged;
- server/browser cleanup succeeds after pass, failure, and timeout;
- AGY records the actual browser tool family used;
- failure of both AGY tool families returns `NEEDS_HUMAN` without Python substitution.

### WS1 — artifact schema and deterministic validator

Goal: make incomplete or fabricated QA evidence fail mechanically.

Changes:

- Define a small versioned JSON schema/dataclass for manifest/events/verdict.
- Add an offline validator command and unit tests.
- Require referenced screenshots/files to exist, remain under the run directory, and be non-empty.
- Require every verdict to cite at least one event plus one visual/text checkpoint.
- Reject `PASS_CANDIDATE` when fatal page/console errors, timeouts, or missing checkpoints exist.

Completion criteria:

- valid fixture passes;
- missing screenshot, invalid evidence path, fatal console error, and timeout fixtures fail;
- `make check` remains green.

### WS2 — targeted A/F real-stack pilot

Goal: produce useful evidence for the two current highest-priority sign-offs:

- A: ending screen explains why the run ended in narrative terms.
- F: the first post-combat scene carries combat aftermath, heat, and companion reaction.

Approach:

- Use a unique QA player/run ID; never reset shared DB state.
- AGY must reach or inspect the required event through the real browser UI; setup helpers may seed prerequisites but cannot perform browser actions for AGY.
- Use real Ollama narrative mode. Fallback output may test mechanics but cannot support semantic sign-off.
- Capture the pre-event scene, action/combat result, first post-event scene, ending UI, and relevant state deltas.

Completion criteria:

- one artifact pack covers both A and F or two isolated packs cover them independently;
- each candidate verdict quotes/cites exact scene and screenshot evidence;
- a human can accept/reject both items in five minutes or less;
- AGY does not update the checklist itself.

### WS3 — adaptive bounded play

Goal: let AGY exercise C/D/E/G/H observations over a bounded run.

Add an action protocol:

```json
{
  "action": "choose|combat|inspect|stop",
  "target": "visible id only",
  "reason": "one sentence",
  "checklist_focus": ["C", "D"]
}
```

AGY selects only currently visible legal actions through Chrome DevTools/Playwright MCP and records each action in `events.jsonl`. Invalid/repeated actions or tool failure stop with `NEEDS_HUMAN`; AGY cannot inject arbitrary browser JavaScript or mutate backend state directly.

Completion criteria:

- turn/action/time budgets are enforced;
- every adaptive action is replayable from `events.jsonl`;
- C/D/E/G/H receive evidence-backed candidate verdicts;
- no claim is made for I's overall human satisfaction.

### WS4 — full-run digest and regression promotion

Goal: support an unattended 30–60 minute candidate run while shrinking human review time.

- Add a full-run digest: key scenes, choice chain, combat count, ending, progression carry-over, screenshots, and unresolved judgments.
- Keep I (memorable scenes, basic fun, desire to replay) human-only.
- Convert recurring objective findings into Playwright/unit tests and remove them from the semantic report once mechanically covered.
- Optionally integrate the digest into `/overnight-report`; do not merge this until the standalone QA flow is stable.

Completion criteria:

- bounded full run ends normally or produces a classified diagnostic;
- digest is reviewable in under ten minutes;
- promoted deterministic checks demonstrate fault-injection RED before adoption.

## 8. Safety and operational constraints

- Human-launched only; never silently enabled by `make overnight*`.
- No `git add`, commit, push, checkout, reset, dependency installation, Docker reset, DB reset, or source edit.
- Wrapper snapshots `git status --porcelain` before/after and fails if tracked state changes.
- Use a dedicated port and unique QA player/session namespace.
- Wrapper, not AGY, owns server startup/termination through `trap` cleanup.
- Restrict network to localhost/Ollama unless a separately approved image/model call is required.
- Cap turns, wall-clock time, and AGY invocations; log actual token/cost telemetry when exposed.
- Preserve raw evidence even when the semantic verdict parser fails; parser failure becomes `NEEDS_HUMAN`.

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Chrome DevTools is absent in one CLI session | AGY uses its Playwright MCP; both unavailable → `NEEDS_HUMAN`, never Python browser fallback |
| AGY is unsandboxed | dedicated prompt, no source writes, worktree/output boundary, wrapper pre/post clean-tree assertion |
| Real narrative is nondeterministic | record model/config/choices/state; candidate verdict only; rerun targeted checkpoint when ambiguous |
| Long full-run latency/cost | targeted A/F pilot first, max-turn/time limits, checkpoint setup instead of replaying every prerequisite |
| QA pollutes shared persistence | unique player/run IDs, no reset, explicit optional cleanup by wrapper |
| DOM selectors drift | add stable `data-testid` only as a separate deterministic implementation task |
| Agent overclaims subjective quality | fixed verdict vocabulary, mandatory evidence references, human-only final sign-off |
| QA lane starts fixing findings | prompt and wrapper forbid source writes; findings become a separate NEXT_PLAN task after human review |

## 10. Expected repository changes

Planned implementation files:

- `scripts/live-qa/run-agy.sh`
- `scripts/live-qa/artifacts.py`
- `scripts/live-qa/PROMPT.agy.md`
- `src/` or `tests/` artifact schema/validator module at the smallest appropriate boundary
- `tests/test_live_qa_artifacts.py`
- `Makefile` targets `live-qa-agy-{probe,af,full}`
- `docs/engineering/mythos/{AGENTIC,VERIFICATION}.md` lane mapping
- `docs/NEXT_PLAN.md` `[qa:agy]` semantics only after WS0 proves feasibility

Do not modify the existing `PROMPT.agy.md` image role except to link to the separate QA workflow. Do not make `docs/test/neo_seoul_live_qa.md` machine-owned.

## 11. Recommended execution order

1. Implement WS0 only.
2. Run the capability probe manually and inspect the artifact pack.
3. Implement WS1 validator.
4. Implement and run the A/F pilot with AGY as the browser actor.
5. Stop for human review before WS3.
6. Build adaptive/full-run support only if the pilot materially reduces review time.

The first implementation slice should not attempt full A–I coverage. Success is a safe A/F evidence pack with reliable cleanup and no tracked-file changes.

## 12. WS0 measured result (2026-06-21)

- Implemented `scripts/live-qa/{run-agy.sh,artifacts.py,PROMPT.agy.md}` and `make live-qa-agy-probe`.
- Removed the initial Python Playwright prototype after a direct capability measurement proved AGY can operate the local app with its own Playwright MCP. Python now performs artifact preparation/validation only.
- Final direct run: AGY created the player, played two interactive Neo-Seoul scenes, selected a legal choice, and wrote two event records, console/network evidence, and two full-page screenshots.
- Artifact validator confirmed AGY exit 0, browser tool `PLAYWRIGHT_MCP`, `PASS_CANDIDATE`, 2/2 events/screenshots, zero validation errors, server cleanup, and identical pre/post Git source state.
- Chrome DevTools remains priority 1 by policy; it was not loaded in this specific CLI run, so AGY correctly used priority 2 Playwright MCP.
- Architecture decision for WS1+: AGY always owns live browser interaction. Failure of both AGY tool families ends `NEEDS_HUMAN`; Python Playwright is only for later deterministic regression tests.
- Evidence run: `outputs/live-qa/ws0-agy-direct-20260621/` (local output, not committed).

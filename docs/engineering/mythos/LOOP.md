# MythOS interpretation — LOOP_ENGINEERING (autonomous overnight unattended loop)
Last updated: 2026-06-14

> An operations manual mapping the bible [`../LOOP_ENGINEERING.md`](../LOOP_ENGINEERING.md) concepts **onto this repo's runner · env · make targets**.
> "While you sleep, headless Claude Code implements, verifies, records, and commits NEXT_PLAN `[auto]` tasks on its own."
> Code basis: `scripts/overnight/{run.sh,PROMPT.md,overnight-settings.json}`, `.claude/skills/`, `docs/NEXT_PLAN.md`.

---

## 0. ⚠️ Core premise — MythOS is a game (this LOOP's applicability limit)

This LOOP was originally designed for deterministic backend services. MythOS is a **narrative game**, so most of the backlog is **human play-feel QA** (all of `docs/test/neo_seoul_live_qa.md`) · **content/Story-Bible authoring** · **balance tuning** · **LLM prompt-feel tuning**, which an unattended agent cannot verify.

→ So this LOOP fits only **hygiene / regression / refactor / codemod / deterministic-bugfix**. It is not used for creative/feel work. The `[auto]` backlog is inherently thin and drains fast (as of 2026-06-14 the initial `[auto]` bundle is already nearly drained — §6). Common exit reasons are `DONE` (drained) or **`MAX_NO_PROGRESS`**, and **that's normal**. For efficiency, **seed a bundle of `[auto]` items before running** (regression-test backfill, codemod, lint/type debt, stale-doc cleanup) — the `/overnight-seed` skill helps this judgment/backfill (per-lane volume estimate + shortfall notice). Running without seeding stops immediately at no-progress.

## 1. One-line summary
Invoke one prompt headless repeatedly, where each iteration restores state from a small context (`/sync`) →
implements **one `[auto]` task** from NEXT_PLAN and passes the gate → records (`/checkpoint`) → **commits locally**.
One iteration is one atomic unit of work, and since each iteration commits, **whenever it stops, loss is at most one iteration**.

## 2. Why designed this way (core principles)
| Principle | Why |
| --- | --- |
| **Fresh context per iteration** | New process each iteration (`claude -p`) → no context bloat/summarization. Re-reading just the Read Path (`/sync` ~130 lines) restores it. |
| **Iteration = one task + immediate commit** | Whenever a limit/crash hits, uncommitted loss is just one iteration. The next iteration takes over via `/sync`. |
| **Offline gate is the commit gate** | If `$GATE_CMD` (default `make check` = ruff+eslint+mypy+tsc/vite-build+unittest) isn't green, no commit → broken code doesn't accumulate. No Docker/Ollama/FLUX/network. |
| **State on files** | `NEXT_PLAN.md` (backlog) · `PROGRESS_LOG.md` (history) · git history. Disk, not memory, is the source of truth. |
| **Least-privilege unattended run** | `overnight-settings.json` allow/deny → blocks `git push`, network, destructive actions while you sleep. Interactive settings are untouched. |

## 3. Components

### 3.1 Runner — `scripts/overnight/run.sh`
The unattended loop (bash, macOS bash 3.2 compatible). Invokes the headless agent once per iteration.

**Engine selection (`ENGINE` env var, default `claude`)** — the LOOP control logic (STOP/DONE · classify · no-progress · HEAD diff) is engine-independent; only the invocation line/prompt/permission boundary branch:
- `ENGINE=claude` (default): `claude -p "$(cat PROMPT.md)" --permission-mode acceptEdits --settings scripts/overnight/overnight-settings.json --output-format json`.
- `ENGINE=codex`: `codex exec --cd <repo> --sandbox workspace-write -c sandbox_workspace_write.network_access=false -c approval_policy=never --json --output-last-message logs/last-message.txt "$(cat PROMPT.codex.md)" </dev/null`.
  The prompt is `scripts/overnight/PROMPT.codex.md` (reads/performs `.agents/skills/*/SKILL.md` procedures instead of calling Skills).
  **`</dev/null` required**: codex exec stalls waiting for more input if stdin stays open (unattended-iteration freeze).
- `ENGINE=agy`: `agy --print "$(cat PROMPT.agy.md)" --dangerously-skip-permissions --print-timeout 30m --add-dir <repo> </dev/null`.
  Image-draft lane. Needs host FLUX/MPS/network, so **no sandbox** → boundary is the PROMPT.agy.md guardrails + worktree isolation.
  default `--print-timeout` 5m is short for one iteration, so 30m. `</dev/null` prevents stdin freeze.

> **3-engine parallelism**: run claude/codex/agy concurrently each in its own worktree+branch (`loop/{claude,codex,agy}`) to structurally eliminate commit conflicts. Lane tags · domain split · integration merge are owned by **[`AGENTIC.md`](AGENTIC.md)** (`scripts/overnight/{worktrees.sh,merge-loops.sh}`, `make overnight-worktrees`/`overnight-merge`).

One iteration flow:
```
check STOP/DONE files → check MAX_ITER → run claude -p iteration → classify_outcome → branch → (pause) → repeat
```

Control files / env vars (defaults in the `: "${VAR:=...}"` block at the top of `run.sh`):
| Item | Default | Role |
| --- | --- | --- |
| `scripts/overnight/STOP` | — | If present, **graceful exit** before entering the next iteration (the current one finishes). Created by an operator `touch` or a red-leftover iteration. |
| `scripts/overnight/DONE` | — | Created by the agent when the `[auto]` backlog is drained / all blocked (reason recorded) → runner exits. |
| `GATE_CMD` | `make check` | Commit gate (swappable) = ruff+eslint+mypy+tsc/vite-build+unittest. Faster variants: `make check-auto` (excl. mypy) · `make smoke-local`. PROMPT.md references it as `$GATE_CMD`. |
| `MAX_ITER` | 20 | Runaway-prevention backstop (total iteration cap). |
| `ITER_TIMEOUT` | 1800s | Max run time per iteration (`gtimeout`/`timeout`; disabled if absent). |
| `LIMIT_WAIT` | 1800s | Wait then retry on usage/session-limit detection. |
| `PAUSE` | 30s | Gap between iterations. |
| `MAX_CONSEC_FAIL` | 3 | Safe stop after N consecutive failures. |
| `MAX_NO_PROGRESS` | 2 | Safe stop after N consecutive success-but-**no-new-commit** (the main exit reason for a thin backlog — blocks no-progress looping). |
| `KEEP_ITER_LOGS` | 30 | Keep only the latest N `scripts/overnight/logs/iter-*.log` (`runner.log` always kept). |
| `--once` | — | Run only one iteration (chain verification). |

> Runtime artifacts (`logs/` · `STOP` · `DONE`) are `.gitignore`d. The tracked harness is `run.sh` · `PROMPT.md` · `PROMPT.codex.md` · `overnight-settings.json`.

### 3.2 Outcome classification — `classify_outcome` (python3 inside run.sh, read-only)
Judges limit by a structured signal, not free-text grep (avoid false misjudgment):
1. `--output-format json` object **`is_error == false`** → `success`
   (ignore "rate limit" etc. mentioned in a successful iteration's text — blocks misjudging a normal iteration).
2. Only when not success, check limit text (`usage/session limit`, `rate limit`, `overloaded`, `hit your …`, `quota` etc.) → `limit`.
3. Otherwise → `failure` if rc≠0, else `success`.

Branching: `limit`→reset consec_fail · wait `LIMIT_WAIT` then retry / `failure`→consec_fail++ · stop at limit /
`success`→reset consec_fail + **before/after HEAD compare** (new commit → reset no_progress · log hash; none → no_progress++ · stop at limit).

### 3.3 Iteration instructions — `scripts/overnight/PROMPT.md`
The fixed procedure the headless agent runs each iteration:
1. **Restore state**: Skill `sync`.
2. **Recover leftovers**: `git status --porcelain`. dirty = prior iteration's interrupted leftover → recovery is this iteration's work.
   If `$GATE_CMD` is green, commit `[recovered]` directly; if red, leave untouched + record Blocker + create `STOP` (human review needed).
3. **Pick task**: only the top one `[auto]` in `NEXT_PLAN.md` (skip `[manual]`/`[blocked]`/untagged, no arbitrary promotion).
   On 2 Blockers for the same item, append `[blocked]` and move to the next candidate. If no `[auto]` remains, create `DONE` and exit.
4. **Implement + gate**: code+tests per the completion criterion → until `$GATE_CMD` is fully green. On failure, `git restore` then Blocker.
5. **Record**: Skill `checkpoint`.
6. **Commit**: confirm changes via `git status` → `git add -A && git commit` (local only).

Invariants: no `git push`, no Docker/Ollama/FLUX/network, no destructive/online make, **do not start forbidden work classes** (play QA · content · balance · prompt-feel), no exceeding one work bundle, prioritize steps 5-6 when a limit is near. Comply with `harness/CORE_MANDATES.md` §4-5.

### 3.4 Backlog tagging — `docs/NEXT_PLAN.md`
The work queue the runner consumes. Attach inline automation tags on an **axis separate** from the status box (`[x]`/`[/]`/`[ ]`/`[~]`):
- `[auto]` = locally · deterministically · offline verifiable — must have a **one-line completion criterion**.
- `[manual]` = human play/content/balance/prompt-feel.
- `[blocked]` = 2 accumulated Blockers (auto-marked by the runner) or unmet precondition.
- untagged = not an unattended target (safe default). The runner consumes only `[auto]`.

**Quality-review iteration pattern**: insert a read-only review-type `[auto]` item after an implementation chain to review the commit range from a type/simplification angle, **no code edits**, and feed findings back as NEXT_PLAN `[auto]`.

### 3.5 Doc-harness skills (`.claude/skills/`)
Separated so boundaries don't overlap — each owns a LOOP step:
| Skill | Step | Responsibility |
| --- | --- | --- |
| `/sync` | Iteration start | Read only the Read Path and restore state. **Read only** |
| `/checkpoint` | Before iteration end | Append PROGRESS_LOG + update STATUS/NEXT_PLAN. **Record only** |
| `/tidy-docs` | On budget overflow | Split archive · compress. **Tidy only** |
| `/overnight-seed` | **Before running** | Per-lane `[auto]` backlog tally + candidate-menu survey + wall-clock estimate · shortfall notice; record into NEXT_PLAN on approval |
| `/overnight-report` | Morning review | Report runner state · iterations · commits · gate re-measurement · remaining `[auto]` backlog + generate per-run checklist. **Read + verify only** |

> Skills are **git-tracked** (mirror-synced across the 4 dirs `.claude/.agents/.codex/.gemini` — DECISIONS 2026-06-14, no re-ignore).
> A new skill goes in all 4 as the same `SKILL.md`. Fixing only one makes behavior diverge per lane.

### 3.6 Unattended permissions — `scripts/overnight/overnight-settings.json`
A **dedicated permission boundary** loaded only via `claude -p … --settings scripts/overnight/overnight-settings.json`.
`defaultMode: acceptEdits` + allowlist (Read/Edit/Write/Skill, **enumerated** safe make targets,
`git add|commit|status|diff|log|restore|checkout --`, `python3` etc.). **deny (the real safety boundary — deny wins):
`git push` · `git reset --hard` · `curl`/`wget` · `rm -rf` · `sudo` · destructive/online make (`infra-*`/`db-*`/`smoke`/`test-db`/
`test-e2e*`/`narrative-smoke` (non-fallback)/`visual-worker*`/`dev-*`/`streamlit`/`api`/`connect-demo`) · Web* · MCP (github/playwright)**.
Allowing all `Bash(make *)` is forbidden (prevents auto-allowing new destructive targets). **Interactive settings
(`~/.claude/settings.json`, `.claude/settings.local.json`) are untouched.**

**Codex engine's permission boundary (`ENGINE=codex`)**: Codex draws the boundary with a **sandbox**, not settings.json.
The global `~/.codex/config.toml` is `danger-full-access` (for interactive convenience), which is dangerous unattended, so `run.sh`
**overrides** it per iteration via CLI `-c`/`--sandbox` — `workspace-write` + `network_access=false` + `approval_policy=never`.
Effect (measured directly via `codex exec` on 2026-06-14 — despite global YOLO, in-iteration `curl` failed with exit 6=DNS block):
**network blocked** (= physically seals `git push` · `curl`/`wget` · Ollama · FLUX · Docker-online) + workspace-write only + non-interactive (no escalation). **Remaining gap**: local destruction within the workspace
(`rm -rf` · `git reset --hard`) is not blocked by the sandbox — unlike Claude's per-command deny, Codex blocks this only by the explicit
prohibition in `PROMPT.codex.md` §0 (blast radius ≤1 iteration since each commits). Global config and interactive Codex are untouched.

## 4. Operation (real use — `make` targets)
Don't call `scripts/overnight/run.sh` directly; use the Makefile targets (guards · sleep-prevention · nohup · cleanup included).

```sh
# Pre: ① clean working tree (if dirty, iteration 1 goes to leftover recovery) ② seed [auto] items (no-progress exits immediately if none)
#      ③ (recommended) brew install coreutils → enable iteration timeout  ④ confirm make check is green at current HEAD

make overnight-once      # one iteration only (chain verification) — recommended before first run
make overnight-watch     # ★ start + immediately follow logs (all in one). Loop keeps running even if you Ctrl+C out
make overnight           # start only (background, sleep-prevention + nohup) — fire-and-forget without follow
                         #   token cap: MAX_ITER=12 make overnight(-watch)
                         #   variant:  GATE_CMD="make smoke-local" make overnight-watch  (runtime-flow nightly)

# Codex engine (same LOOP, only the invoked agent is codex exec). Verify one iteration with -once on first run too.
make overnight-codex-once   # codex one iteration only (chain verification)
make overnight-codex-watch  # codex start + follow logs
make overnight-codex        # codex background start
# stop/logs/status/clean are the same run.sh process, so make overnight-{stop,logs,status,clean} is shared across engines.
# (or directly: ENGINE=codex make overnight-watch)
make overnight-logs      # follow a running loop's runner.log separately
make overnight-status    # quick check of process/STOP/DONE/recent logs
make overnight-stop      # graceful stop (finish current iteration then exit)
make overnight-clean     # after exit, clean up STOP/DONE control files
# In the morning: run /overnight-report in a claude session (exit reason · iterations · commits · gate re-measurement · remaining [auto])
#         then human review follows docs/test/bible/overnight-review-checklist.md (a repeating process).
```
Stop conditions: `DONE` (drained/all blocked) · `STOP` (manual/red leftover) · `MAX_ITER` · N consecutive failures · N no-progress.
**Stop when done**: `[auto]` drained → agent creates `DONE` → runner exits before the next iteration (no extra tokens). Only the cost of the one DONE-creating iteration.

## 5. Limits / known behavior
- **Thin `[auto]` backlog (§0)**: the most important limit. Frequent no-progress exits are normal. Seeding before running recommended.
- **Headless iteration verified end-to-end (2026-06-14)**: one `--once` iteration proved runner↔`claude -p` integration · settings load ·
  leftover recovery · gate · `[recovered]` commit · exit branching (found+fixed a REPO_ROOT fallback bug on the first run — §6). Always verify one iteration with `--once` on first start.
- **No `gtimeout`/`timeout` on this machine** → iteration timeout disabled. Recommend `brew install coreutils` before a long run (without it `ITER_TIMEOUT` doesn't apply).
- **Mac sleep/lid**: `caffeinate` is required, power connection recommended (battery + closed lid sleeps). `gtimeout` via `brew install coreutils`.
- **Per-iteration loss**: if a limit hits mid-iteration, that one in-progress iteration may be uncommitted-lost (committed up to just before;
  the next iteration restores via `/sync`). Leftovers are handled by PROMPT step 2 (green=`[recovered]` commit, red=untouched+STOP).
- **dirty-tree misfire**: if the working tree is dirty at start, iteration 1 goes to leftover recovery (or STOP if red). Empty the tree before first run.
- **Branch drift**: commits stack on the checked-out branch. `/overnight-report` states the branch. A dedicated branch is recommended.

## 6. This repo's application scope / history
- **2026-06-14 — harness build**: ported another repo's LOOP_ENGINEERING into MythOS (`scripts/overnight/` 3 files + `/overnight-report`
  skill + NEXT_PLAN `[auto]/[manual]/[blocked]` tagging). Gate is `make check` (after clearing mypy debt, promoted `check-auto`→`check`).
- **2026-06-14 — first `[auto]` bundle done in-session** (interactively by hand, not headless unattended): mypy debt src+tests 0
  (greening the `make check` gate), stale dated-plan header alignment, Codex skill button-state determinization + bugfix, bin/ store read-only
  review + pruning. → These works are exactly the demonstration of the `[auto]` work class the LOOP is good at, and as a result the `[auto]` backlog is nearly drained.
- **2026-06-14 — first headless `--once` live verification**: found+fixed a REPO_ROOT fallback bug during runner execution (`git rev-parse … || cd .. && pwd`
  operator precedence printed two lines → `cd` failed). On rerun the headless agent recognized the uncommitted fix as a leftover
  → `make check` green → auto-recovered via `[recovered]` commit (`94f77fc`). Whole chain (integration · sync · leftover recovery · gate · commit · exit) demonstrated.
  Multi-iteration unattended running (overnight) is the user's call. Per-iteration measured effects are recorded in `docs/PROGRESS_LOG.md` alongside iteration commits.

- **2026-06-14 — Codex engine added**: added `ENGINE` (claude|codex) branching in `run.sh` (single LOOP source kept),
  `scripts/overnight/PROMPT.codex.md` (performs `.agents/skills/*` procedures instead of Skills), `make overnight-codex*` targets.
  The safety boundary is the sandbox `run.sh` forces via CLI (`workspace-write`+network-block+approval never), not the global
  `~/.codex/config.toml` (danger-full-access). **2-iteration `codex exec` demonstration**: (1) network block confirmed (despite global
  YOLO, in-iteration curl exit 6=DNS), (2) stdin freeze bug fixed (`</dev/null`), (3) **`.git` write-block bug
  fixed** — workspace-write blocked `.git` so `git commit` failed (`Operation not permitted`), so add
  `<repo>/.git` to `writable_roots` (per-iteration commit is the LOOP core), (4) **actual autonomous commit demonstrated** (codex implemented an encounter-
  integrity invariant→`make check` green→local commit `0a910df`→runner HEAD-diff detected→normal exit).
  Side finding: codex tends to fabricate missing assets as placeholders to force green → `PROMPT.codex.md §0` states
  "missing asset=Blocker, no fabricate." Multi-iteration unattended running is the user's call (first run via `make overnight-codex-once`).

The honest triage of `[auto]` candidates is always authoritatively the automation tags in `docs/NEXT_PLAN.md`.

## 7. Related docs
- Bible (concept): [`../LOOP_ENGINEERING.md`](../LOOP_ENGINEERING.md) · sibling interpretations: [`AGENTIC.md`](AGENTIC.md) · [`HARNESS.md`](HARNESS.md) · [`PROMPT.md`](PROMPT.md)
- Design invariants: `harness/CORE_MANDATES.md` · handoff: `harness/CONTEXT_BRIDGE.md`
- Doc operation (Read Path/Context Budget): `docs/DOCS_POLICY.md` · `docs/README.md`
- Backlog: `docs/NEXT_PLAN.md` · history: `docs/PROGRESS_LOG.md`

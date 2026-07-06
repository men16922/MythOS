# MythOS interpretation — AGENTIC_ENGINEERING (3-engine parallel multi-agent)
Last updated: 2026-06-14

> Maps the bible [`../AGENTIC_ENGINEERING.md`](../AGENTIC_ENGINEERING.md) concepts **onto this repo's implementation**.
> Implementation: three engines claude·codex·agy run the unattended loop **concurrently, each in its own worktree+branch**,
> with claude doing orchestration (lane assignment + integration merge). Code basis: `scripts/overnight/{run.sh,PROMPT*.md,
> worktrees.sh,merge-loops.sh}`, [`LOOP.md`](LOOP.md), `docs/NEXT_PLAN.md`. Raw research `bin/docs/archive/AI_REARCH.md`.

## 0. Core principle — block conflicts by "structure"
Concurrent-write conflicts are blocked by **isolation**, not willpower. Keep three axes non-overlapping:
1. **worktree isolation** — a different work tree + branch per engine (`loop/{claude,codex,agy}`) → they cannot touch the same file at once.
2. **lane separation** — engine-suffix tags on `NEXT_PLAN` tasks → two engines don't pick the same item.
3. **domain split** — per-engine directory ownership → merge conflicts are effectively nil.
4. **shared-doc convention** — checkpoint docs are the exception to the domain split (all three touch them), so a separate convention blocks conflicts:
   - `PROGRESS_LOG.md` = append-only + **`.gitattributes merge=union`** → both sides' additions auto-merge (0 conflict markers).
   - `NEXT_PLAN.md` = each engine toggles **only its own lane's one line** → different lines, so 3-way merge auto-resolves.
   - `STATUS.md`/`AGENT_BRIEF.md` = **engines do not edit mid-iteration**; the orchestrator (claude) updates them in bulk after merge.
   (Demonstrated 2026-06-14: before this convention, 3 engines appending to PROGRESS_LOG/NEXT_PLAN/STATUS simultaneously caused merge conflicts.)
On top of that, the existing **concurrent-writer-detection STOP** (run.sh) remains as a last-resort safety net.

## 1. Engine · lane · domain · gate
| Engine | Lane tag | Owned domain (these dirs only) | Sandbox | Gate | Branch |
| --- | --- | --- | --- | --- | --- |
| **claude** | `[auto]` / `[auto:claude]` | `src/`, `tests/`, `harness/`, `scripts/overnight/`, complex refactor · invariant · orchestration | `overnight-settings.json` (deny push/net/destructive) | `make check` | `loop/claude` |
| **codex** | `[auto:codex]` | Builder: `docs/`/scenario/story_bible deterministic refactor · verification · dialogue scripts. **+ Reviewer (Auditor)**: read-only audit of the integration diff | `codex exec` workspace-write + no-net + `.git` writable | `make check` (build) / read-only (review) | `loop/codex` |
| **agy** | `[auto:agy]` | `resources/<scn>/{characters,characters/combat,concept,enemies,enemies/combat,opening,scenes}` image drafts + simple verification | none (needs host FLUX/MPS/network) → prompt guardrails + branch isolation | **integrity gate** (asset exists/dimensions/naming; make check for no code breakage) | `loop/agy` (review) |

- **codex = claude failover**: if a claude iteration is `limit`, the runner has codex consume the claude lane instead (Phase 6, `run.sh`).
- **agy output is review material**: an image's aesthetic "fit" can't be judged unattended → stack it on `loop/agy` and **a human reviews in the morning**.
  The auto gate sees only integrity (exists/matches spec). **No fabricating** a missing asset as a placeholder (PROMPT.agy.md §0).
- **`[qa:agy]` is a separate evidence lane, not an overnight commit lane**: AGY directly plays through Chrome DevTools first / its Playwright MCP second and writes ignored evidence under `outputs/live-qa/`. The wrapper only manages services/safety; Python only validates artifacts. AGY never edits source or closes the human-owned checklist. Design: `bin/docs/plans/2026-06-21-agy-assisted-live-qa.md`.

## 1.5 Creator ≠ Reviewer (Claude → Codex → Claude)
Applying AI_REARCH's core principle: separate the maker from the auditor to reduce self-confirmation bias.
- claude/agy **create** in their lanes (build/draft) → integrate into `loop/integration` via `overnight-merge`.
- **codex read-only-audits the integration diff** (`make overnight-review` → `scripts/overnight/review.sh` +
  `PROMPT.review.md`): scores bugs/edges/missing-tests/simplification/performance, writes only one `logs/review-latest.md`, and notes
  **proposed follow-up work** (with lane tags). **Does not modify code or NEXT_PLAN.**
- The orchestrator (claude/human) reflects findings into `NEXT_PLAN` → next iteration claude **fixes** them. Loop complete.
- Images (agy) follow the same spirit: agy drafts via in-session Imagen + a fit review (`outputs/combat-sprite-compare/*-review.md`),
  and final aesthetic acceptance is a human call.

## 2. Why content/images have a different gate from claude's code loop
Image generation needs host FLUX/MPS + network and is **non-deterministic** (same prompt differs each time), so it can't be frozen by `make check`.
story_bible/dialogue authoring is "feel" judgment too, so not unattended-verifiable. Hence:
- **Tier 1 (deterministic code)**: claude (+failover codex) → `make check` green → auto commit. Safe.
- **Tier 2 (content/image)**: codex (deterministic refactor/verification) + agy (image draft) → auto-commit only via an **integrity gate**,
  aesthetic/narrative quality goes to human review. Auto-generated output doesn't go straight to main but stacks on a review branch (`loop/{codex,agy}`).

## 2.7 Operating-model choice — the reality of the worktree gate (demonstrated 2026-06-14)
A **key constraint** confirmed in the 3-engine parallel demonstration: a worktree has no `.venv`/`node_modules` (gitignore). symlinking them from main
**breaks the gate** — (a) `.venv` symlink → editable install resolves to main src → code changes are **false green**, (b) `node_modules` symlink → tsc/vite write to a shared `.tmp` → **EPERM**. Hence:
- **Model A — code lanes sequential in the main checkout (recommended default).** claude/codex `[auto*]` code work runs in main,
  repeating `--once` in lane-tag order (concurrent-writer STOP as safety net). The gate is faithful, 0 env duplication. But not "concurrent."
- **Model B — true worktree parallelism (incl. code lanes).** Provision each worktree's own venv+node_modules once via `make overnight-worktrees-setup`
  (needs network, by a human outside the loop). Then its own editable install points at that worktree's src, faithful. Cost: disk/time.
- **Image/doc lanes (agy, codex-docs)** work in a worktree without their own env (demonstrated: agy generated+committed 6 skill icons in a worktree). Because no code gate is needed.
→ **Recommended**: agy (images) on worktree, claude/codex (code) on Model A (main sequential) or B (worktree after provision).

## 3. Operation (make targets)
```sh
# 1) Prepare worktree isolation. symlink only .claude/.agents (don't symlink .venv/node_modules — breaks the gate).
make overnight-worktrees          # create/refresh (+.claude/.agents symlink)
make overnight-worktrees-setup    # (Model B) per-worktree venv+node_modules for code lanes — network once
make overnight-worktrees-status   # status + symlink check
make overnight-worktrees-down     # remove (branches preserved)

# 2) Start each engine in its own worktree (separate terminal/background → true parallelism)
(cd ../MythOS-loop-claude && make overnight-watch)              # claude lane
(cd ../MythOS-loop-codex  && make overnight-codex-watch)        # codex lane
(cd ../MythOS-loop-agy    && make overnight-agy-watch)          # agy lane

# 3) Morning: claude integrates + codex reviews + human reviews
make overnight-merge              # loop/* → loop/integration + rerun make check (no push)
make overnight-review             # codex read-only-audits the main...loop/integration diff → logs/review-latest.md
# Reflect review findings into NEXT_PLAN (next iteration claude fixes) → review loop/integration
# (especially agy image aesthetic fit) → if clean, merge/push to main.
```
- Each worktree has its own `scripts/overnight/logs|STOP|DONE` (gitignore) so they don't interfere.
- Commits stay local on each engine's own branch (`loop/<eng>`). **No engine pushes** (human does after integration).

## 4. Limits / cautions
- **agy no-sandbox**: agy runs unrestricted on the host. The boundary is only the `PROMPT.agy.md` guardrails + worktree/branch isolation.
  If destructive actions worry you, review the agy lane more often or trial+adopt `agy --sandbox` (terminal restriction).
- **Lane assignment is the human/claude's responsibility**: without an `[auto:codex]`/`[auto:agy]` tag, that engine exits immediately as `drained`.
  Assignment = `NEXT_PLAN` tagging. The claude orchestrator tags work onto its domain-appropriate lane.
- **No domain trespass**: each PROMPT §0/§3 forbids edits outside the owned domain. A trespass surfaces as a merge conflict + STOP.

## 5. Related docs
- Bible (concept): [`../AGENTIC_ENGINEERING.md`](../AGENTIC_ENGINEERING.md) · sibling interpretations: [`LOOP.md`](LOOP.md) · [`HARNESS.md`](HARNESS.md) · [`PROMPT.md`](PROMPT.md)
- Backlog/lane tags: `docs/NEXT_PLAN.md` · design invariants: `harness/CORE_MANDATES.md` · image standard: `docs/IMAGE_POLICY.md`

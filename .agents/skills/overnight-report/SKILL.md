---
name: overnight-report
description: Morning review of an unattended overnight loop. Read and verify runner status/iterations/commits-since-start/gate re-measurement/remaining [auto] backlog, then generate a per-run human-review checklist file. Use on "overnight 보고", "아침 검수", "overnight-report", "밤새 뭐 했어".
---

# /overnight-report — Unattended-loop morning review

**Read and re-verify once** what the unattended overnight loop (`scripts/overnight/run.sh`,
`docs/engineering/mythos/LOOP.md`) did overnight. Don't edit code/docs (that's `/checkpoint`'s job). Don't guess.

> **Bible ↔ per-run instance separation:**
> - The static template (repeatable processes A~E) is `docs/test/bible/overnight-review-checklist.md` (bible).
> - This skill **generates a file** `docs/test/history/<MMDD-HHMM>-overnight-review-checklist.md` that **fills the bible's B~E
>   with this run's facts** (per-run instance). These files are gitignored — regenerable artifacts, not committed.

## Procedure

1. **Confirm exit reason:**
   - From the last line of `scripts/overnight/logs/runner.log`, identify the exit reason (DONE/STOP/MAX_ITER/consec-fail/no-progress).
   - Check whether `scripts/overnight/STOP`·`scripts/overnight/DONE` files exist and read the reason inside them.

2. **Tally iterations/commits:**
   - In `runner.log`, find the number of iterations run and the start-point HEAD (logged as `HEAD_BEFORE`).
   - List the loop's commits with `git log --oneline <start>..HEAD`. **State the current branch** (e.g.
     `feat/poc-ux-visual-combat-batch`). Highlight `[recovered]`-prefixed commits separately (recovery from an interrupted iteration).

3. **Working tree:**
   - Check uncommitted leftovers with `git status -sb`. If any, warn of **possible red leftovers**
     (PROMPT.md step 2: red leftovers need human review → STOP trigger).

4. **Re-measure the gate:**
   - Run `$GATE_CMD` once directly (default `make check`; runtime-flow nights use `make smoke-local`) to
     **independently confirm whether current HEAD is actually green** (re-verify, don't trust the loop's gate result).
   - On failure, report which stage broke (ruff/eslint/mypy/tsc/test). If not run, mark it "unverified".

5. **Remaining backlog:**
   - In `docs/NEXT_PLAN.md`, tally the count and list of remaining `[auto]`/`[blocked]` items, and any items newly
     auto-marked `[blocked]` this night.

5b. **Automatic browser-QA evidence (if any):**
   - If `scripts/overnight/logs/qa-status.tsv` exists, summarize each QA run: trigger (post-commit/drain), outcome
     (PASS_CANDIDATE/SKIP/filter-skip/FAIL_EVIDENCE/NEEDS_HUMAN), case, and run_id. Evidence lives in
     `outputs/live-qa/<run_id>/` (`report.md` · `verdict.json` · `screenshots/` · `events.jsonl`).
   - **A PASS_CANDIDATE is an evidence candidate, NOT a human sign-off.** Surface `FAIL_EVIDENCE`/`NEEDS_HUMAN` as
     items requiring human review (these also STOP the loop). Always distinguish three tiers: mechanically-verified
     commit · AGY browser-evidence candidate · human sign-off still pending.
   - **Autonomous findings triage**: if `scripts/overnight/logs/qa-findings.md` exists, list its new unchecked
     `- [ ]` items (objective defects AGY discovered). These are **untagged on purpose** — recommend which to
     promote to `[auto:claude]` (objective, deterministically fixable) vs `[manual]` (needs feel judgment).
     The loop never auto-promotes them; promotion is a human decision.

6. **Output summary (5-10 lines, English):**
   - exit reason · N commits made (hash·branch) · gate green/red (which stage) ·
     M remaining `[auto]` · browser-QA outcomes + evidence dir (if any) ·
     **items needing human review** (red leftovers · new `[blocked]` · STOP reason · QA FAIL/NEEDS-HUMAN).

7. **Generate the per-run human-review checklist file:**
   - Filename: `docs/test/history/<MMDD-HHMM>-overnight-review-checklist.md`. Use the **exit time of the run under review** as the timestamp
     (last line of runner.log / `DONE`·`STOP` file time); if unavailable, current time. Format `MMDD-HHMM`
     (e.g. `0614-2333`) — **no colons** (filesystem-safe). Re-running in the same minute overwrites.
   - Content: the B~E of `docs/test/bible/overnight-review-checklist.md` as **checkboxes filled with this run's facts**.
     Don't copy the static bible — insert facts gathered in 1~5 above (commit hashes · new `[blocked]` · ahead count · remaining seed) to make
     **directly actionable lines**. Omit non-applicable lines. Minimal skeleton (only what exists):
     - `[ ]` **(B) Per-commit self-check** — for each commit, read the actual diff with `git show <hash>`/`git diff` and write **two lines**:
       ① **what changed** — concretely: files touched · tests added/modified · behavior change (e.g. "added 3 `FooTest` to `X.py`,
       no production code change"). ② **what to verify** — verification matching that change (e.g. "whether assertion thresholds match
       the scenario data", "whether a refactor is behavior-preserving", "if a prose claim, open the actual file and fact-check — non-test
       sentences aren't caught by `make check`"). ② differs by commit type: **test added**→what does it guarantee · over-detection/false green?,
       **refactor/codemod**→behavior · public API unchanged?, **bugfix**→root cause and reproduction · regression test included?, **docs**→is the sentence true?
     - `[ ]` **(C) New `[blocked]` triage** — does `<item>` capture an actual content/balance bug (game-breaking first:
       dead-end routes/unreachable endings/missing assets/unwinnable combat/dead progression prioritized)?
     - `[ ]` **(D) push decision** — branch is K ahead of `main`. If results are good, `git push` (human does it — runner must not push).
     - `[ ]` **(E) Next seed** — remaining `[auto]` or seed a new bundle (on exhaustion, immediate no-progress exit). Re-arm after `make overnight-clean`.
   - At the file head, add a one-line note: exit reason · gate result · target HEAD range. After creating, echo the path to chat.

## Rules

- **Read + run the gate once + generate one per-run checklist file only.** No other code/doc edits, commits, tags, or `make overnight-clean` (`/checkpoint`·human handle those).
  Don't edit the bible (`docs/test/bible/`) — only write new per-run instances.
- No destructive/online make targets (`infra-*`/`db-*`/`smoke`/`test-db`/`test-e2e*`/`dev-*` etc.).
  Allowed: only `make check`·`make smoke-local`·`make test`.
- Report gate results **only for what you actually ran**. If not run, write "unverified".
- No guessing. If it's not in `runner.log`/git/`NEXT_PLAN.md`, write "none / not in docs".

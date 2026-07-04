---
inclusion: always
---


# /overnight-report — morning review of the unattended loop

**Read and re-verify once** what the unattended loop (`scripts/overnight/run.sh`) did overnight.
Do NOT fix code/docs (that's `/checkpoint`). Do not guess.

## Config

Read `.claude/harness-config.json` for `gate` and the plan doc. Defaults: `gate=make check`,
`plan=docs/NEXT_PLAN.md`. The loop's gate is in `scripts/overnight/run.sh` ($GATE_CMD).

> **Bible ↔ per-run instance split:**
> - The static template (steps A~E) is `docs/test/bible/overnight-review-checklist.md` (the bible).
> - This skill fills that bible's B~E with **this run's facts** and writes a per-run instance to
>   `docs/test/history/<MMDD-HHMM>-overnight-review-checklist.md`. Those history files are gitignored
>   (regenerable artifacts — don't commit them).

## Procedure

1. **Exit reason:** last line of `scripts/overnight/logs/runner.log` (DONE/STOP/MAX_ITER/consec-fail/
   no-progress). Read `scripts/overnight/STOP`·`DONE` if present and their reason.

2. **Iterations/commits:** find the iteration count and the start HEAD (`HEAD_BEFORE` in the log).
   List the loop's commits via `git log --oneline <start>..HEAD`. **Name the current branch.**
   Highlight `[recovered]` commits (interrupted-iteration recovery).

3. **Work tree:** `git status -sb` for uncommitted residue. Residue → warn **possible red residual**
   (PROMPT.md step 2: red residual needs human review → STOP trigger).

4. **Re-measure the gate:** run `$GATE_CMD` once yourself to independently confirm HEAD is actually
   green (don't trust the loop's own gate result). On failure, report which stage broke. If not run,
   state "unverified".

5. **Remaining backlog:** count remaining `[auto]`/`[blocked]` items in the plan doc, list them, and
   note any newly auto-marked `[blocked]` from this run.

6. **Output a 5-10 line summary:** exit reason · N commits (hashes·branch) · gate green/red (which
   stage) · remaining `[auto]` · **items needing human review** (red residual / new `[blocked]` / STOP reason).

7. **Generate the per-run review checklist file:**
   - Name: `docs/test/history/<MMDD-HHMM>-overnight-review-checklist.md`. Timestamp = the **reviewed
     run's end time** (runner.log last line / DONE·STOP file time), else now. Format `MMDD-HHMM`
     (no colons — filesystem safe). Same-minute re-run overwrites.
   - Content: fill the bible's B~E with **this run's facts** (commit hashes, new `[blocked]`, ahead
     count, remaining seed) — make each line directly actionable, don't copy the static bible. Minimal
     skeleton (only what applies):
     - `[ ]` **(B) per-commit self-check** — for each commit, read the real diff (`git show <hash>`) and
       write two lines: ① **what changed** (files·tests added/changed·behavior) ② **what to verify**
       (matched to the change kind: *test-add*→does it guarantee something / false-green? *refactor/codemod*→behavior & public API unchanged? *bugfix*→root cause + regression test? *docs prose*→is the sentence true — open the file; the gate can't catch prose claims).
     - `[ ]` **(C) new `[blocked]` triage** — is it a real bug that breaks the product (the
       worst-first concerns for **your domain**)?
     - `[ ]` **(D) push decision** — branch ahead K. If good, `git push` (human does it — the runner
       must not push).
     - `[ ]` **(E) next seed** — remaining `[auto]` or seed a new batch (`/overnight-seed`). Then
       `make overnight-clean` and restart.
   - Put a one-line header note (exit reason · gate result · HEAD range). Echo the path in chat.

## Rules

- **Read + run the gate once + generate one per-run checklist file only.** No other code/doc edits,
  commits, tags, or cleanup (those are `/checkpoint` / human). Don't modify the bible — only write a new
  per-run instance.
- No destructive/online targets. Allowed: the repo's gate (`$GATE_CMD`) and read-only commands.
- Report gate results only for what you actually ran. If not run, write "unverified".
- No guessing. If it's not in runner.log/git/the plan doc, write "none / not in docs".

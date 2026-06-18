---
name: checkpoint
description: Record the current session's work into the right places in the Project MythOS doc system (PROGRESS_LOG/STATUS/AGENT_BRIEF/NEXT_PLAN/COMPLETED_SUMMARY/DECISIONS) with context. Use on "체크포인트", "checkpoint", "진행 상황 저장", "docs에 반영", or when a work bundle completes.
---

# /checkpoint — Reflect work into the docs

Automates the "work complete" procedure and update sequence in `docs/DOCS_POLICY.md`.
Record **only when a meaningful unit of work is done** (don't log every small edit).

> Note: PROGRESS_LOG/STATUS/NEXT_PLAN entries are now authored in **English** — the operational doc layer is English; user-facing/narrative content stays Korean.

## Procedure

1. **Collect this session's changes:**
   - `git status -sb`, `git diff --stat`, and (if any) this session's commits `git log --oneline`.
   - Summarize what you Changed, what you Verified, Blockers, and Next.
   - List only verification commands you actually ran. If not run, mark it "unverified".

2. **Append the newest entry to the top of PROGRESS_LOG.md** (`## YYYY-MM-DD — one-line title`):
   ```text
   ## YYYY-MM-DD — <title>
   - Status:
   - Changed:
   - Verified:
   - Blockers:
   - Next:
   ```
   - Use today's date (no relative dates). If an entry with the same date exists, decide whether to merge.
   - Compress to 5-15 lines. Don't copy detailed diffs.

3. **Update STATUS.md** — reflect changes to baseline/active focus/verification state/open risks.
   Remove resolved risks, add new ones. Update the "last updated" date.

4. **Update AGENT_BRIEF.md** — only if the snapshot or active-work priority changed.
   Keep the 60-line target. Update the "last updated" date.

5. **Update NEXT_PLAN.md** — remove/check completed tasks, reflect any shift in next direction.
   NEXT_PLAN holds only "open work" (not completion history).

   **★ On plan-only / unfinished exit (continuity required):** if there is work the next session must pick up,
   update the single `▶ NEXT SESSION:` line at the top of `AGENT_BRIEF.md` (= **in-repo plan path** `docs/plans/*`
   + the first concrete action). That way the next `/sync` echoes that pointer first so the work isn't dropped.
   - Keep the plan file **inside the repo** (`docs/plans/YYYY-MM-DD-<topic>.md`). Do not record `~/.claude/plans/*`
     (plan-mode scratch, random names, outside the repo) as the authoritative pointer in NEXT_PLAN/AGENT_BRIEF — the next session can't find it.
   - "Next session work" is not a preamble note but the **authoritative active focus** (AGENT_BRIEF Active Work #1 + STATUS Active Focus
     + NEXT_PLAN priority) — align all three entry docs.

6. **Conditional updates:**
   - milestone done → summarize purpose/deliverable/verification briefly in `COMPLETED_SUMMARY.md`.
   - hard-to-reverse choice (provider/infra/data model/doc policy/public workflow) →
     record Decision/Reason/Impact in `DECISIONS.md`.
   - if this was the start of a large task, consider a `docs/plans/YYYY-MM-DD-<topic>.md` snapshot.

7. **Output a summary** — one line per file on how it was updated, plus whether to suggest a commit.
   Commit/push only when the user explicitly asks.

## Rules

- Keep current docs short — don't copy detailed change history into STATUS/AGENT_BRIEF.
  Detail goes in PROGRESS_LOG, and to archive when it grows.
- Line budgets: AGENT_BRIEF ≤60, STATUS/NEXT_PLAN ≤120, PROGRESS_LOG ≤120.
  If PROGRESS_LOG exceeds budget, only record with this skill and delegate cleanup to `/tidy-docs` (suggest to the user).
- Write in English, but keep identifiers/commands/paths verbatim.
- If unsure what to record, confirm the "scope of this work unit" with the user once.

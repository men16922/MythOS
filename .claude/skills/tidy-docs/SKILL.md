---
name: tidy-docs
description: Tidy/consolidate/compress Project MythOS docs per the context-budget rules. Split a grown PROGRESS_LOG into monthly archive, compress completed checklists into COMPLETED_SUMMARY, consolidate/retire duplicate/stale md, and diet current docs back within the line budget. Use on "문서 정리", "tidy-docs", "컨텍스트 최적화", "md 통합".
---

# /tidy-docs — Doc context optimization

Automates the Context Budget · Retiring/Deleting procedures of `docs/DOCS_POLICY.md`.
Goal: keep the **agent's start context small** without losing dated records and decision history.

## Safety principles (read first)

- **Deletion is the last resort.** Don't delete outright — move to archive, or leave a link after summarizing.
- Before deleting/overwriting a doc you didn't create, open the actual content to confirm it matches the description.
- Before destructive operations (file deletion, bulk moves), **present a plan of what moves where first** and
  get user approval. After migrating, verify no references are broken.

## Procedure

1. **Diagnose** — measure line-budget overruns and duplication:
   - `wc -l docs/AGENT_BRIEF.md docs/STATUS.md docs/NEXT_PLAN.md docs/PROGRESS_LOG.md`
   - Budgets: AGENT_BRIEF ≤60, STATUS ≤120, NEXT_PLAN ≤120, PROGRESS_LOG ≤120, DESIGN keeps a compressed summary.
   - List which docs are over and which content is duplicate/stale, and report to the user.

2. **Split PROGRESS_LOG** — when over 120 lines:
   - Keep only the newest 3-5 entries in `docs/PROGRESS_LOG.md`.
   - **Move (append)** the rest to `bin/docs/archive/progress-YYYY-MM.md`. Merge if the same month's archive exists.
   - Check/update the archive-link notice at the top of PROGRESS_LOG.

3. **Compress completed checklists** — if completed task checklists linger in current docs (STATUS/NEXT_PLAN/dated plan),
   compress them into `COMPLETED_SUMMARY.md` as purpose·deliverable·verification and leave only a link in current docs.

4. **Tidy dated plans** — don't delete completed plans in `docs/plans/`:
   - Confirm the essence was summarized into `COMPLETED_SUMMARY.md`.
   - Migrate completed plans to `bin/docs/plans/` (or `bin/docs/archive/`), update the on-demand list in `docs/README.md`.

5. **Consolidate/retire duplicate/stale md** — cross-check the `docs/README.md` index against actual files:
   - If the same content is in two current docs, consolidate into one authoritative doc and link from the other.
   - Retiring: ① summarize the essence into the right place among COMPLETED_SUMMARY/DECISIONS/DESIGN/STATUS →
     ② mark its status `Retired`/`Archive` in `docs/README.md` → ③ check for remaining references with `rg "<doc name>"` →
     ④ if worth preserving, move to `bin/docs/archive/` → ⑤ if duplicate + summarized + no references, delete.

6. **Diet DESIGN.md** — if detailed design prose crept in, keep only a compressed summary and move the original to `bin/docs/archive/`.

7. **Verify index/link integrity** — after the work:
   - Check broken references with `rg -l "<moved file name>" docs/ src/ README.md`.
   - Confirm the current/on-demand lists in `docs/README.md` match actual files.
   - Reflect the "last updated" date of moved/deleted docs and the README update date.

8. **Output summary** — moved/compressed/retired/deleted files as a table, before→after line counts, remaining overruns.

## Rules

- Preserve: design rationale, decision context, past milestone detail records.
- Deletable: same content summarized in another current doc + not directly updated going forward + no code/README references.
- Current docs hold only the "compressed state needed for current judgment". Don't copy detailed history — link to archive.
- This skill only tidies. New work recording is `/checkpoint`'s job; context restoration is `/sync`'s.
- `docs/engineering/` is on-demand (not a line-budget target). When tidying, don't break the **bible↔interpretation links** (`*_ENGINEERING.md`↔`mythos/*.md`). Authority for doc-operations concepts is `docs/engineering/CONTEXT_ENGINEERING.md` + `docs/DOCS_POLICY.md`.

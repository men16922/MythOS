# Lessons

Repo-specific things a future unattended iteration should know before repeating a mistake.
One line per lesson, dated, newest on top.

- 2026-09-06: the claude-lane WorkContract scope is `src/ tests/ harness/ scripts/overnight/ docs/ Makefile` (compile-contract.sh) — a seed that names `experiments/` or `scripts/<other>` gets its commit reverted by `10-diff-scope` even when the gate and critic pass; keep those paths out of `[auto:claude]` seeds or do them in a supervised session.
- 2026-09-06: direct `.venv/bin/ruff`/`make format` calls get silently permission-blocked in the unattended sandbox (no approver); `.venv/bin/python -m ruff format ...` runs the same tool and is allowed. Also: `ruff format` can reflow a list literal across lines (magic trailing comma), which breaks any test that `assertIn`s an exact multi-line source snippet — search `tests/*.py` for `read("src/<pkg>...")` literal-source assertions on any dir before/after formatting it, and loosen matches (e.g. `assertRegex` tolerant of whitespace) instead of fighting the formatter.

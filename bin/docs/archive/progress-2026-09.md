# Progress archive — 2026-09

Raw increments moved out of `docs/PROGRESS_LOG.md` (newest on top). Compressed summaries live in `docs/COMPLETED_SUMMARY.md`.

## 2026-09-05 — Overnight Harness pin repaired to 1.4.0; Fable 5.1 critic wired in

- Status: harness plugin updated to 1.4.0 upstream, and the repo's pin was stale — `.claude/harness-config.json` `harness_root` pointed at the 1.3.4 cache dir, which no longer exists (only 1.2.0/1.4.0 are cached). `make overnight-where` was silently resolving `HARNESS_ROOT` to empty, i.e. every `overnight*` target was broken. Local-only, doc/config/Makefile edit; no model call.
- Changed: `.claude/harness-config.json` `harness_root` → the 1.4.0 cache path. `Makefile` gained 1.4.0's per-repo model-routing block (`CLAUDE_MODEL=claude-sonnet-5` actor, `OVERNIGHT_CRITIC_MODEL=claude-fable-5-1` critic, both `export`ed) and the widened `HARNESS_ROOT` fallback probe (adds antigravity-cli/opencode cache paths) from the plugin's `Makefile.harness.snippet`. MythOS's own additions (contract compiler, verify/oversight/repair env, graph-smoke/measure targets) were left untouched — those are repo-owned, not part of the plugin template.
- Verified: `make overnight-where` now resolves `HARNESS_ROOT` to the 1.4.0 path (was empty).
- **Deployed `mythos-api-00085-mvr`** (owner lifted the 08-09 hold, DECISIONS 2026-09-05): the 39-commit fix bundle since `00084-nt2`. Pre-deploy gate: lint/typecheck 0, **1325** tests OK (6 skipped), rebuilt `app.js` byte-identical to the committed bundle; doc-budget was the only red item (pre-existing, needs `/tidy-docs`). Post-deploy: 100% traffic, root + `/api/v1/health` 200, live/local `app.js` SHA-256 match (`8a26071b…`), pins preserved (`gemini-3.5-flash` / `gemini-3.1-flash-image` @ `global`, timeout 3600), 0 WARNING+ logs in the first 30 min. Consequence: the banked 08-08 arm is no longer build-comparable — the next promotion sample must be a fresh arm on `00085`.
- Next: run `make overnight-once` to confirm the critic actually launches on `claude-fable-5-1` before trusting it unattended.

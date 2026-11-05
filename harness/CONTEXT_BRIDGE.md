# Agent Context Bridge

Read `docs/AGENT_BRIEF.md` → `docs/STATUS.md` → `docs/NEXT_PLAN.md`; the newest `docs/PROGRESS_LOG.md` entry carries verification evidence. This bridge is an orientation aid, not a second history.

## Current handoff (2026-11-05)

- **Checkout**: `main`, runtime commit `505ccff`. Local and remote branches are now only `main` and `1.0` (the archived runtime). Twenty local and six remote stale branches were retired at the owner's request. Their commits are backed up in `.git/branch-backups/20261105-191957/retired-branches.bundle`; seven old worktrees remain detached with their files and local edits preserved.
- **Release**: route-aware event/act-intro/boss GM context, plus the prior Sea shop/safehouse fixes. Preview `00185-yev` matches `505ccff` (6/6, including all 13 JS/CSS chunks); promoted to 100% latest and production verified 5/5 plus real-click smoke 3/3. Rollback is `00183-xaz` (`5db096d`).
- **Local checks**: full `make check` passed: Node 584, Python 343 run with 12 database tests skipped. Built-SPA E2E passed. KO/EN boss intro and phase UI checks passed on Outside, Sea 4/5/6 and Deep 4 (10 cases, mocked model response, no browser errors).
- **Content snapshot**: 245 cards, 154 enemies, 181 encounters, 76 implants, 337 events (12 procedural), 14 companions, 34 districts / 97 NPCs, 18 endings; read directly from CONTENT. Website/contest draft counts now match.
- **Play Store next**: `docs/plans/2026-11-05-play-store-release-plan.md` defines recommended free-first / Signal+-later with G0–G7; no launch hold lifted. FCM connected testing found and fixed pending topic work recreating a token after off. Real deletion/renewal, reconnect/process-death cleanup and cancellable Settings flows now pass on API 36; full gate Node 594, Python 352/15 DB skips, E2E passed. Latest unsigned candidate estimate 368,390,479 bytes; 16 KB packaging verified. Details: `docs/plans/2026-11-05-push-connected-acceptance.md`. Prior API 24 development-provider lifecycle evidence remains separate. Debug legacy on/off upgrade preserved storage; old off queue stayed dormant until explicit re-enable. Event-input rotation visibility was fixed and actual native IME checks passed. Latest artifact/evidence: `docs/plans/2026-11-05-android-upgrade-keyboard-qa.md`. D7 now confirms Neon `us-east-1` hostname region, global Gemini resolution, absent active-model logging config and refreshed 30/400-day log retention (`docs/plans/2026-11-05-data-locations-backup-audit.md`); actual recovery settings/contracts remain unknown. Next: D6 diagnostics toggle/pending-report acceptance without report transmission, then physical/Play-signed coverage. Production retention scheduling, policy publication/contact, signing, account deletion/reviewer access and human play verdicts remain open.
- **Human feedback**: Deep/Sea and hidden Chronicle play verdicts, then fixes driven by those observations. The six-chapter Chronicle prototype already includes meters, agendas, core-card carryover and twists; it remains opt-in at `?chronicle=1`.
- **Authority**: `DECISIONS.md` (2026-11-05) resolves delegated art/consumable/banter/deployment choices. Human fun verdicts cannot be supplied by an agent. Paid Play/Signal+, paid Vertex evaluation, paid voice/music generation, public posting and contest submission remain separate gates. No unattended seeds are queued.

## Invariants and limits

- Rules run in the browser's pure seeded TS engine; the AI GM is off the critical path, with authored fallbacks. Server saves are client-trusted JSON.
- Browser QA is muted and uses at most one tab; prefer headless Playwright. Never invoke Vertex Veo. New images use Codex image.
- Balance comparisons need identical seed blocks and system-usage telemetry; assisted UI wins do not prove balance or fun.
- Local GM: `gemma4:8b-64k`; `.env`'s `gemma4:latest` is not installed. Keep paid model quality checks separate from fake-response/UI plumbing checks.
- `make api` stops other mythos_api processes; isolated QA uses private uvicorn ports and an in-memory store.

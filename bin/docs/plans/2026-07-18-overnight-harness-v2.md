# Overnight Harness V2 — MythOS plugin adoption plan

Date: 2026-07-18 · Revised: 2026-07-19 · Status: **IMPLEMENTED AND VERIFIED**

Outcome: plugin source 1.1.0 owns the generic controller; MythOS owns a lane-aware compiler,
four verifier adapters, permission/state, and operator tooling. Vendored behavior and actor prompts
are retired. Verification: plugin 51/51 offline checks, real Codex 0.144.5 commit probe, MythOS
`make check` 1130 tests (5 skipped), `make smoke-local`, package/manifest checks, and
`harness-init --check` all pass. Marketplace publication remains the normal separate commit/push/
reinstall operation; MythOS is pinned to the verified source checkout until then.

Human-load status: the controller cutover itself auto-closes **0 of the current 16** human-play
checks. The planned 6 auto / 8 monitored / 2 human split still requires explicit assertions,
report integration, a monitored sampling policy, and three-release measurement. The projected
90–150 → 30–60 minute reduction remains a hypothesis, not a delivered result.

Research basis:

- [OpenAI + Anthropic synthesis](../reference/2026-07-18-openai-anthropic-harness-synthesis.md)
- [Fable / Anthropic view](../reference/2026-07-18-fable-harness-anthropic-view.md)
- [Sol / OpenAI view](../reference/2026-07-18-sol-harness-long-loop-hitl.md)

## Decision

MythOS will **not build or own another RunController**. The current
`overnight-harness` plugin 1.1.0 implements the generic V2 perimeter and is the behavior
source of truth. MythOS will become a consuming repository with:

1. repo-owned state and permission configuration;
2. a small lane-aware WorkContract adapter;
3. MythOS-specific verifier adapters;
4. the existing multi-worktree/operator tooling outside the runner.

The 921-line vendored `scripts/overnight/run.sh` is therefore migration input, not the V2 base.
After compatibility fixtures pass, it is removed rather than wrapped or kept as a fallback. Git is
the rollback path; two active runners would recreate source-of-truth drift.

## Measured starting point

Measured on 2026-07-19:

- Plugin source repo is clean at `main...origin/main`; package/adapter version is 1.0.0.
- The configured plugin source and installed Codex 1.0.0 cache have identical runner/package files.
- Plugin offline suites pass **41 checks** across regression, contract, controller, and verifier
  behavior.
- Plugin runner is 649 lines plus focused `lib/*.sh` modules; MythOS still invokes its 921-line
  vendored runner from the Makefile.
- `harness-init --check` resolves the plugin successfully but flags four vendored behavior files:
  `run.sh`, `status.sh`, `dashboard.sh`, and `notify.sh`.
- MythOS's current dirty tree mixes already-deployed gameplay/UI work with Harness V2 docs. No
  structural cutover happens in that bundle.

The plugin has already completed the old plan's P0-P6 machinery:

| Capability | Plugin 1.0.0 state | MythOS action |
| --- | --- | --- |
| Engine adapter interface and normalized outcomes | implemented | consume unchanged |
| Append-only event ledger and typed terminals | implemented | consume unchanged |
| Claim/lease, orphan reconciliation, retry/backoff | implemented | consume unchanged |
| Capability profile | implemented | consume; add the missing commit probe upstream |
| WorkContract and lean prompt | implemented, opt-in | consume through a MythOS compiler adapter |
| Verifier registry and evidence bundle | implemented | register MythOS verifiers |
| Graduated oversight and review queue | implemented, opt-in | enable after parity |
| Bounded subagent budget | implemented, default 0 | keep 0 until measured pilot |
| Status/dashboard/notify and resolver | implemented | consume unchanged |

This replaces the earlier plan to implement those modules inside MythOS.

## Target ownership and seams

### Plugin-owned behavior

The plugin remains the only implementation of:

- runner lifecycle, engine invocation, classification, budgets, retries, and reconciliation;
- WorkContract default compiler and prompt renderer;
- external gate, critic, registered-verifier dispatch, rejection, and evidence bundle;
- status, dashboard, notification transport, event/claim schemas, and plugin skills.

MythOS must not copy `run.sh` or plugin `lib/*.sh` back into this repository.

### MythOS-owned state and policy

MythOS keeps:

- `.claude/harness-config.json`, engine permission files, logs, STOP/DONE/CLAIM, and evidence;
- `make check` and the repo's auto/manual/blocked policy;
- engine-lane selection (`[auto]`, `[auto:claude]`, `[auto:codex]`, `[auto:agy]`);
- combat/route, browser, image-identity, narrative-eval, and diff-scope verification;
- `worktrees.sh`, `merge-loops.sh`, `review.sh`, and the human-launched image regeneration flow;
- the manual QA authority in `docs/test/neo_seoul_live_qa.md`.

### Small external interfaces

The desired operator interface stays familiar:

```text
make overnight-<engine>-once
make overnight-<engine>-watch
make overnight-status
make overnight-stop
make overnight-where
```

MythOS needs only two behavior seams from the plugin:

```text
contract compiler: engine + plan + mission context -> schema-valid WorkContract
verifier adapter: commit range -> pass | fail | inconclusive | needs_human + evidence refs
```

Everything else stays behind the plugin's interface. The deletion test is decisive: deleting the
MythOS runner must not spread controller logic into the Makefile, verifier scripts, or prompts.

## Compatibility gaps to close upstream

Three generic gaps block a safe full MythOS cutover. They should be fixed in the plugin repository,
tested there, released, and then consumed here. Do not patch a MythOS copy of the runner.

### U1 — external/lane-aware contract compiler

Add a backward-compatible `OVERNIGHT_CONTRACT_COMPILER` hook. The built-in compiler remains the
default. The hook receives engine, plan, mission, budgets, and output path and returns a
schema-valid contract.

Required MythOS behavior:

- Claude lane consumes `[auto]` and `[auto:claude]`.
- Codex consumes `[auto:codex]`; explicit failover may additionally consume the Claude lane.
- AGY consumes only `[auto:agy]`; Kiro gets its own explicit mapping.
- Scope, allowed actions, required verifiers, and human escalation are compiled per lane.
- A configured compiler must fail closed. It must distinguish `drained`, `all-blocked`, and
  `invalid contract`; it must not silently fall back to the generic procedure prompt.

This removes the need for three large engine-specific procedure prompts. Until U1 ships, plugin
cutover is limited to a compatibility fixture; it is not armed for real MythOS lanes.

### U2 — real repo-write capability probe

Implement the pending `repo_write_commit` in-sandbox probe and use it in preflight/oversight.
MythOS worktrees require Codex to write the Git common directory; the current plugin Codex adapter
does not pass the writable root that the MythOS runner already uses.

Done means:

- a disposable worktree fixture proves index/object/ref writes without network access;
- the adapter grants only the resolved Git common directory, not a broader host path;
- capability failure stops before iteration 1 with evidence;
- Claude/AGY/Kiro behavior is unchanged.

### U3 — bounded typed verifier results

Extend the existing verifier protocol backward-compatibly:

- `pass`: accept;
- `fail`: reject/revert;
- `inconclusive`: fail closed;
- `needs_human`: keep the evidence, do not auto-accept, stop/queue for human decision;
- every verifier runs under a configurable timeout.

The event schema already names `needs_human`; this closes the implementation seam needed by
browser and taste-adjacent MythOS checks without turning them into false failures or false passes.

## MythOS adapter set

After U1-U3 are available, add only the following repo modules.

### A1 — `scripts/overnight/compile-contract.sh`

- Parse one lane-eligible item and its one-line completion criterion.
- Reject manual, blocked, untagged, live-service, content-authoring, balance, and prompt-feel work.
- Derive the narrowest scope and allowed actions instead of using `include: ["."]`.
- Require the mechanical gate for every contract.
- Attach diff-scope plus conditional gameplay/browser/image verifiers based on touched/declared scope.
- Preserve the human authority for prod/deploy/secrets/taste.
- Emit only the plugin's versioned WorkContract schema; no lifecycle logic.

Tests exercise the script through its interface with fixtures for every lane, wrapped Markdown
items, blocked/drained states, forbidden work, and invalid completion criteria.

### A2 — `scripts/overnight/verifiers.d/10-diff-scope.sh`

Always runs. It proves the commit stayed inside the contract's include/exclude scope and did not
weaken tests, add suppressions, touch secrets, or invoke generated/vendor masking. It complements,
not duplicates, the plugin critic.

### A3 — deterministic gameplay oracle

`20-gameplay-oracle.sh` activates only for combat/route/state changes. It reuses existing narrow
tests and deterministic same-seed comparisons; it does not create a second test framework.
Browser VFX is never judged under `?fallback=1`.

### A4 — objective browser verifier

`30-browser-objective.sh` wraps the existing candidate filter and AGY live-QA evidence path.
It checks load, console/network errors, touch/scroll geometry, and declared UI assertions.

- Objective defect: `fail`.
- Browser unavailable or evidence incomplete: `needs_human`.
- Subjective combat feel, prose tone, and overall UX remain outside auto acceptance.

The old drain sweep becomes an explicit post-loop audit/review command rather than hidden controller
logic.

### A5 — image identity verifier

`40-image-identity.sh` extracts the current inline image judge into a standalone adapter. It runs
only when canonical character/enemy art changes, compares against authored references, caps the
batch, and records model/version/reference evidence.

- Clear identity mismatch: `fail`.
- Low margin, missing reference, or judge failure: `needs_human`.
- Aesthetic adoption remains human-owned.

### A6 — optional narrative rubric prefilter

Keep `scripts/eval/` as the implementation. Register it only for an explicitly monitored
contract with a banked loop/rubric; it cannot promote prompt-feel or ending-quality work to
`[auto]`. Low margin or grader disagreement routes to human review.

## Keep, reshape, and retire

| Current MythOS artifact | Action |
| --- | --- |
| `run.sh`, `status.sh`, `dashboard.sh`, `notify.sh` | retire after cutover fixtures pass |
| `Makefile.harness.snippet` | replace with the plugin 1.0.0+ invocation shape, then remove the stale copy |
| `PROMPT.md`, `PROMPT.codex.md`, `PROMPT.agy.md` | shrink into contract-policy fixtures; retire duplicated procedures after U1 parity |
| `browser-qa.sh`, `browser-qa-filter.sh` | keep implementation, expose through verifier/audit adapters |
| inline image judge in `run.sh` | extract to a verifier adapter |
| blocker cross-engine escalation | replace with typed `needs_human`/review queue first; reintroduce automated relay only after measured need |
| log cap and shutdown digest | do not re-port blindly; use plugin retention/evidence, add upstream only if measurements show a real gap |
| `worktrees.sh`, `merge-loops.sh`, `review.sh` | keep as MythOS operator orchestration; they never become controller internals |
| `image-regen.sh` | keep human-launched and outside the unattended drain |

## Delivery phases

### Phase 0 — isolate and freeze

1. Finish or checkpoint the current deployed/UI/research dirty bundle.
2. Create a clean harness-only branch/worktree.
3. Record the exact plugin root/version/checksum chosen by `make overnight-where`.
4. Freeze a MythOS-only delta matrix: vendored behavior not already covered by plugin 1.0.0,
   its fixture, and its destination (`adapter`, `operator tool`, `retire`, or `upstream`).

Exit: no product/UI change is mixed with the harness migration; the old runner can be reproduced
from Git and every retained MythOS behavior has an owner.

### Phase 1 — close U1-U3 in the plugin

Implement and test the compiler hook, repo-write probe, and typed/timeout verifier protocol in the
plugin repo. Release them as one compatible plugin increment and install it through the normal
plugin path.

Exit:

- plugin offline suites are green;
- existing consumer fixtures remain green with no new config;
- new MythOS compatibility fixtures cover lane selection, Codex worktree commit, and
  `needs_human`;
- source and installed cache match.

### Phase 2 — add MythOS adapters without switching the runner

Add `compile-contract.sh`, `verifiers.d/`, adapter fixtures, and an idempotent environment doctor.
Exercise them directly and through the plugin fake engine while the vendored runner remains the
operator path.

Exit:

- adapter tests pass through their public interfaces;
- verifier evidence is schema-valid and fail-closed;
- no adapter contains claim/retry/engine-invocation/controller logic;
- no real quota, browser, image generation, deploy, or push is required.

### Phase 3 — single cutover

Replace the Makefile overnight targets with plugin resolution/invocation while preserving the
existing operator names. Enable:

```text
OVERNIGHT_PROBE=1
OVERNIGHT_CONTRACT=1
OVERNIGHT_CONTRACT_REQUIRED=1
OVERNIGHT_VERIFY_GATE=1
OVERNIGHT_CRITIC=auto
OVERNIGHT_OVERSIGHT=graduated
OVERNIGHT_SUBAGENTS=0
```

Remove the four vendored behavior files and duplicated procedure prompts only after parity. Keep
repo state, adapters, and operator tools. Remove the machine-specific `harness_root` pin after the
released plugin is installed; use `OVERNIGHT_HARNESS_ROOT` only for explicit development tests.

Exit:

- `harness-init --check` has no vendored-behavior warning;
- `make overnight-where` resolves the intended installed plugin;
- all existing Make targets resolve to plugin behavior;
- STOP/DONE/log/status/report workflows still operate on repo-local state;
- rollback is one Git revert plus reinstalling the prior plugin version.

### Phase 4 — measured engine rollout

Use the same deterministic task bank and change one axis at a time:

1. fake-engine full chain;
2. Claude `--once` on a disposable clean worktree;
3. Codex `--once` after `repo_write_commit=true`;
4. AGY only in its isolated worktree with explicit permission acknowledgement;
5. one bounded watch run.

Real engine/browser/image runs are owner-armed because they spend quota or touch live tooling.
Compare against the frozen V1 baseline on verified outcomes/hour, cost, interventions, false
stop/accept, recovery, and dirty leftovers.

Exit: three representative MythOS runs do not regress safety/recovery and improve or preserve cost
per verified outcome. Only then does the plugin path become the default documented route.

### Phase 5 — optimization and HITL reduction

- Confirm the plugin's preliminary lean-prompt result on MythOS-sized work before deleting the last
  procedure scaffolding.
- Keep subagents at 0 initially; test 1-3 only on independent read/test/review work.
- Use the evidence/review queue to measure browser/image/narrative grader calibration.
- Attempt the 6 auto / 8 monitored / 2 human QA split only across three release bundles.
- Retire a scaffold only when its assumption is disproved and the same fixture remains green.

## Verification matrix

| Layer | Required proof |
| --- | --- |
| Plugin | regression + contract + controller + verifier suites |
| Resolution | `harness-init --check`, `make overnight-where`, source/cache checksum |
| Contract | lane/blocked/drained/forbidden/wrapped-item fixtures; schema validation |
| Codex boundary | disposable worktree commit probe; network remains denied |
| Verifiers | pass/fail/inconclusive/needs-human/timeout fixtures; evidence hashes |
| MythOS mechanical | `make check` at committed HEAD |
| Runtime objective | non-fallback browser evidence when the contract requires it |
| Operator flow | STOP/DONE/status/dashboard/report and worktree merge dry-runs |
| Human authority | no auto acceptance for prod, secrets, irreversible changes, balance, ending emotion, or aesthetic adoption |

## Rollback and stop rules

- Any duplicate dispatch, permission widening, missing evidence, dirty leftover, or false acceptance
  stops the cutover and restores the previous plugin version/Makefile commit.
- A verifier timeout or unavailable runtime is never converted to PASS.
- Two representative runs that worsen recovery or cost per verified outcome roll back the feature
  flag, not the safety perimeter.
- No `git push`, deploy, destructive cleanup, or production credential use is introduced.
- Do not preserve a second runner “for safety”; Git history and a versioned plugin are the rollback.

## First implementation slice

The next implementation task is **not** a MythOS controller. On a clean harness worktree:

1. write the MythOS delta matrix from the current vendored runner against plugin 1.0.0;
2. turn U1-U3 into plugin fixtures and backward-compatible interface changes;
3. return to MythOS only after that plugin release is installed and checksum-verified.

This is the smallest slice that removes source-of-truth drift while preserving the genuinely
MythOS-specific behavior.

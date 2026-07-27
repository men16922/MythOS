# MythOS Dev Graph — coding-agent development team implementation plan

Status: Proposed for implementation
Date: 2026-07-26
Scope: MythOS development automation, not the game runtime's narrative/route/combat graph
Primary owner: MythOS owner
Implementation owners: generic runtime in Overnight Harness; MythOS policy and evidence adapters in this repo

Related authority:

- [`../reference/2026-07-26-graph-engineering-after-harness-120.md`](../reference/2026-07-26-graph-engineering-after-harness-120.md)
- [`../reference/GRAPH_ADOPTION.md`](../reference/GRAPH_ADOPTION.md)
- [`../engineering/HARNESS_ENGINEERING.md`](../engineering/HARNESS_ENGINEERING.md)
- [`../engineering/LOOP_ENGINEERING.md`](../engineering/LOOP_ENGINEERING.md)
- [`../engineering/VERIFICATION_ENGINEERING.md`](../engineering/VERIFICATION_ENGINEERING.md)
- [`../engineering/mythos/HARNESS.md`](../engineering/mythos/HARNESS.md)
- [`../engineering/mythos/LOOP.md`](../engineering/mythos/LOOP.md)
- [`../engineering/mythos/VERIFICATION.md`](../engineering/mythos/VERIFICATION.md)

Design input reviewed for this revision:

- André Lindenberg, “From Loops to Graphs” (2026-07-26, user-supplied article). Adopted here as a
  design prompt for edge quality, upstream human gates, reviewable vertical slices, regression validity,
  and comprehension debt. Company claims and numerical incident/productivity figures are not used as
  acceptance thresholds until verified against primary sources.

## 1. Executive intent

Build a CLI-first development graph that operates coding agents as a bounded, evidence-producing
MythOS development team. A human supplies product intent, constraints, and taste authority. The graph
turns that input into a WorkContract, requires product/architecture/program-design agreement, divides a
feature into reviewable vertical slices, invokes one write-capable implementer, runs independent
mechanical and domain verification, and routes the result through typed `accept`, `repair`, `human`, or
`revert` edges.

The first objective is not a generic graph platform or dashboard. It is one real MythOS vertical feature
completed through small, independently verified slices as a local commit candidate with replayable state,
complete evidence, crash recovery, and an honest human handoff for subjective residue.

Target operating statement:

> Given a bounded feature specification, the Dev Graph produces a verified local commit candidate and
> evidence bundle without human steering between deterministic steps. Humans retain product direction,
> ambiguous trade-offs, irreversible actions, final play feel, push, deploy, and release authority.

## 2. Success definition

The first production-shaped pilot is successful only when all of the following are demonstrated:

1. Before implementation, the owner approves product intent plus an architecture/program-design artifact
   naming the interface, types, call/state flow, invariants, and reviewable slice plan.
2. One owner-approved vertical feature travels from contract compilation through independently green
   slices to a local committed candidate.
3. New regression tests fail against the pre-patch base and pass against the candidate, or carry a typed,
   reviewable exemption for work where red-before/green-after is not meaningful.
4. The mission ledger reconstructs the same state deterministically after process restart.
5. The text trajectory attributes every actor, gate, critic, verifier, repair, and human decision to a
   stable node attempt with evidence and duration/cost where available.
6. Mechanical, regression-validity, and domain failures cannot be reported as accepted.
7. `needs_human` pauses the same mission; approve/reject resumes it without rerunning already-completed
   actor/gate/critic/verifier stages.
8. A forced process kill at each critical Git/evidence transition does not create duplicate commits,
   double revert, missing compensation, or mixed-lineage acceptance.
9. The loop never pushes, deploys, reads production secrets, or expands scope on its own.
10. Human review can decide the candidate from the mission summary and linked evidence without rereading
   the full agent transcript.

Measured outcomes must report both productivity and error counters:

- verified-complete missions;
- false accepts and false stops;
- repair attempts and verified repair success;
- human pauses and overrides;
- wall time, tokens, and cost per verified commit;
- dirty leftovers, scope escapes, and recovery failures;
- evaluator disagreement;
- human review minutes per mission;
- red-before/green-after regression-test validity rate and exemption count;
- change amplification: files/modules and public interfaces touched by comparable follow-up changes;
- interface/dependency drift, duplicated responsibility, and new unexplained seams;
- follow-up change wall time, repair count, and human comprehension sample.

## 3. Non-goals for the first implementation

- No LangGraph, Temporal, workflow database, or second state authority.
- No visual dashboard before real ledger trajectories exist.
- No unrestricted multi-agent fan-out or concurrent writes to one worktree.
- No automatic graph topology, prompt, rubric, or verifier optimization.
- No self-promotion of `[manual]`, `[blocked]`, or untagged work into an unattended lane.
- No automated product-priority selection, balance acceptance, narrative-tone acceptance, or aesthetic
  acceptance.
- No throughput, generated line count, or merged-commit count used alone as a quality metric.
- No push, deploy, release, dependency installation, production mutation, or secret access.
- No duplication of the plugin-owned runner inside MythOS.
- No coupling between this development graph and MythOS player/runtime state.

## 4. Ownership model

Portable graph behavior stays plugin-owned; MythOS owns only its policy and evidence seams.

| Owner | Responsibility |
| --- | --- |
| Overnight Harness | mission lifecycle, append-only ledger, state projection, claim/recovery, pause/resume, provenance, trajectory, actor adapters, typed routing, compensation/revert |
| MythOS | backlog authority, WorkContract compiler, scope policy, gate command, domain verifier adapters, evidence projection, held-out banks, operator Make targets |
| Human owner | goal and taste authority, held-out-bank ratification, high-risk approval, push/deploy/release, final pilot verdict |

Do not copy `run.sh`, `ledger.py`, `trajectory.py`, `provenance.py`, pause/resume, or recovery logic into
this repository. If the generic implementation needs to change, change and release the plugin, then pin
MythOS to that released version.

## 5. Deep-module interface

The development graph must present one small interface while hiding ledger, recovery, routing, Git
compensation, and evidence bookkeeping behind it.

Conceptual interface:

```text
compile(task_ref, engine) -> WorkContract
run(contract_ref) -> MissionId
inspect(mission_id) -> MissionProjection
resume(mission_id, approve | reject) -> MissionProjection
```

The existing operator commands remain the concrete interface unless implementation proves another
adapter is necessary:

```sh
make overnight-<engine>-once
make overnight-ledger-check
make overnight-ledger-state
make overnight-trajectory MISSION=<mission-id>
make overnight-resume MISSION=<mission-id> DECISION=approve|reject
make overnight-provenance-compare LEFT=<manifest> RIGHT=<manifest>
```

Interface invariants:

- `compile` fails closed without an executable Done criterion, bounded scope, verifier, budget, and
  human escalation rule.
- `run` has one write lease and at most one write-capable actor at a time.
- `inspect` is pure and never mutates the ledger, Git, claim, or mission state.
- `resume` is valid only for a durable paused mission whose Git state, contract hash, evidence refs, and
  graph fingerprint still match the pause snapshot.
- All critical state changes are append + lock + flush before the next externally visible effect, or
  are covered by idempotent recovery from a preceding checkpoint.

This interface is the test seam. Unit and integration tests drive the same compile/run/inspect/resume
contract used by operators; tests do not reach through it to patch internal ledger state except for
explicit corruption and crash fixtures.

## 6. State and artifact contracts

The JSONL ledger remains the sole structured state authority. Git history and compressed docs are the
other two members of the existing triple-state model. Trajectory and any future dashboard are read-only
projections.

### 6.1 MissionSpec / WorkContract

Required fields:

- `mission_id`, source plan path/line, lane, engine, graph/schema version;
- goal summary, intent, explicit non-goals, Done criterion;
- approved design artifact hash: interface, types, call/state flow, invariants, and rollback;
- ordered slice IDs, per-slice scope/Done criterion, dependencies, and review budget;
- included/excluded paths and allowed actions;
- risk: customer proximity, reversibility, secrets, production, destructive action;
- budgets: wall time, turns, retries, repair revisions, subagents;
- required evidence/verifiers and assertion IDs;
- oversight mode and typed human-escalation conditions;
- contract, prompt, model, verifier, repository, runner, and plugin lineage hashes.

### 6.2 NodeAttempt

Every invocation receives a unique `attempt_id` even when it repeats the same logical node.

- `node_id`, `attempt_id`, `parent_id`, mission/slice/iteration/engine/actor identity;
- deterministic input/output state hashes;
- start/end timestamps and `duration_ms`;
- verdict, typed edge, evidence refs;
- token and cost usage owned by exactly one critical result event;
- Git base/head/range and pending-effect identity when the node can mutate state.

### 6.3 ArtifactRef

Artifacts are immutable and content-addressed in the ledger:

- commit or diff range;
- product/architecture/program-design snapshot and owner decision;
- contract and provenance manifest;
- base-versus-candidate regression proof plus gate, critic, verifier, simulator, browser, and image logs;
- screenshots and evidence bundles;
- human decision record;
- recovery/compensation record.

The ledger stores metadata and hashes, not large artifact bodies. Missing or hash-mismatched required
evidence fails closed.

### 6.4 MissionProjection

The projection returns current status, pending node/effect, accepted and pending commit ranges, pause
snapshot, lineage fingerprint, accumulated evidence, recovery state, and balanced duration/token/cost
totals. Replaying the same valid ledger must produce byte-equivalent structured output.

## 7. Graph topology and typed routing

Logical flow:

```text
mission.compile
  -> product.review
  -> design.propose
  -> design.approve
  -> slice.plan
  -> workspace.prepare
  -> actor.invoke
  -> actor.commit
  -> gate.external
  -> regression.validity?       # new regression tests: base red -> candidate green
  -> critic.review?              # risk/contract selected
  -> verifier.dispatch*          # MythOS domain adapters
  -> evidence.bundle
  -> decision.route
       -> accept.slice -> slice.next | mission.integrate
       -> repair.invoke -> actor.commit -> gate.external -> ...
       -> human.pause -> human.approve | human.reject
       -> revert.compensate
  -> maintainability.measure
  -> accept.finalize
  -> tracker.reconcile
  -> mission.terminal
```

Required edge vocabulary:

| Edge | Meaning |
| --- | --- |
| `accept` | All required evidence passed; retain the local commit and reconcile the tracker. |
| `repair` | Concrete in-scope diagnosis exists and revision budget remains. |
| `reverify` | A repaired commit must traverse external gate, critic, and required verifier perimeter again. |
| `human` | Evidence is unavailable, uncertain, disagreeing, subjective, high-risk, or authority-bound. |
| `approve` | Human accepts the exact paused commit/evidence snapshot. |
| `reject` | Human rejects the paused candidate; create history-preserving compensation. |
| `revert` | Hard reject, exhausted repair, contract violation, or invalid evidence. |
| `retry` | Transient actor/tool failure within explicit retry budget; never a semantic repair. |
| `abort` | Corruption, lineage drift, unsafe workspace, missing authority, or invalid recovery state. |

The logical workflow may contain repair/reverify cycles. The recorded execution trajectory stays acyclic
because each node attempt is immutable, uniquely identified, and causally linked forward in time.
An accepted slice is not a released feature: the mission owns the complete base-to-final commit range and
may compensate that range if a later integration edge fails.

## 8. Automated development-team roles

Roles are graph responsibilities, not necessarily long-lived agents or simultaneous processes.

| Role | Write access | Responsibility |
| --- | --- | --- |
| Lead/compiler | no | Turn one owner-approved task into a bounded WorkContract and ordered slice plan; refuse subjective or unverifiable scope. |
| Design reviewer | no | Propose/check the interface, types, call/state flow, invariants, dependency direction, test strategy, and rollback before actor dispatch. |
| Implementer | one leased worktree | Modify code/tests/docs within one slice scope and produce one atomic local commit per slice. |
| Mechanical verifier | no | Rerun `make check` outside the actor and attach exact output. |
| Regression verifier | no | Prove new regression tests fail on the base and pass on the candidate, or validate an explicit exemption. |
| Gameplay specialist | no | Select deterministic combat/route tests and simulator evidence for relevant diffs. |
| Browser specialist | no | Exercise objective rendered assertions and capture console/network/screenshot evidence. |
| Image specialist | no | Check stable identity against canon; route aesthetics or missing canon to human. |
| Narrative evaluator | no | Score repetition, length, leakage, fallback, and rubric compliance against a bank; never own final prose taste. |
| Critic | no | Review committed diff/evidence for concrete regression, masking, scope, migration, or invariant defects. |
| Repair actor | same write lease | Receive the typed diagnosis and modify the same candidate within revision budget. |
| Integrator | controller-owned | Keep, pause, or compensate the commit; reconcile plan/docs; emit terminal evidence. |

Single-writer is mandatory for P0-P1. Future scouts may fan out only on immutable inputs and return
read-only findings to one integrator.

## 9. MythOS domain adapters

Retain and graph-bind the existing adapters:

- `10-diff-scope`: scope, secrets, test deletion, suppression, and verification weakening;
- `15-regression-validity` (new): for new regression tests, run the same assertion on base and candidate;
  require base fail + candidate pass, or a typed contract exemption for new-feature/refactor/docs cases;
- `20-gameplay-oracle`: deterministic combat and route modules selected from changed seams;
- `30-browser-objective`: rendered objective assertions and evidence bundles;
- `40-image-identity`: stable character/enemy identity against canonical art;
- `CRITIC_PROMPT.md`: MythOS architecture and product-authority invariants;
- `make check`: authoritative offline commit gate.

Add only after a measured pilot requires it:

- `50-narrative-rubric`: read-only bank evaluation for repetition, length, raw-state leakage, fallback,
  localization integrity, and rubric scoring. Missing bank/model or subjective residue returns `human`,
  never a synthetic pass.

Verifier protocol must be documented consistently in the plugin and MythOS interpretations:

- `0`: pass;
- `1`: hard fail/revert;
- `2`: inconclusive/fail closed unless the contract explicitly maps it to human;
- `3`: needs human/pause;
- `4`: concrete, in-scope, repairable reject.

The actor may add tests required by the feature but may not delete tests, weaken existing assertions,
alter the held-out evaluation bank, modify verifier authority in the same mission, or make generated
bundles the sole behavior source.

## 10. High-leverage human gates, slices, and comprehension debt

The graph does not remove humans uniformly. It places them at edges where an upstream decision prevents
expensive downstream work:

1. **Product review:** approve the problem, user value, non-goals, and subjective authority before design.
2. **Architecture review:** approve module ownership, seam placement, dependency direction, state authority,
   and migration/rollback strategy.
3. **Program-design review:** approve types, interface invariants, call/state flow, error modes, test plan,
   and slice ordering before implementation.
4. **First-slice review:** audit the first small integrated slice before repeating the pattern across the
   remaining feature.
5. **Merge/release review:** retain human authority for production, taste, customer impact, and irreversible
   action.

Low-risk hygiene/refactor missions may satisfy design review through a small checked artifact plus a
read-only critic. The first vertical pilot and any structural change require explicit owner approval at
`design.approve`.

A feature mission is divided into reviewable slices. The WorkContract sets a review budget such as changed
paths, diff size, and conceptual responsibilities, but no universal line-count threshold becomes a proxy
for quality. A slice that exceeds its budget routes to replan/human instead of silently widening scope.
Every slice must be independently green and leave the repository coherent.

Comprehension debt is measured across missions, not guessed from one diff. The report tracks:

- change amplification for comparable small follow-up requests;
- public interface and configuration-surface growth;
- dependency cycles, duplicated ownership, and new seams without a decision record;
- time/repair count required for later agents to change the same area;
- whether a human can explain the change from design, diff, and evidence without the original transcript.

These begin as monitored trend signals. Promote a repeated, reliable failure into a deterministic gate
only after calibration; do not let a probabilistic maintainability score become an automatic product
authority.

Production incidents and user feedback may later enter through a read-only
`production.signal -> intake.candidate` edge. Human triage decides whether the signal becomes a mission;
production telemetry never dispatches code changes directly in the first implementation.

## 11. First pilot: one vertical MythOS feature

The owner selects the exact mechanic before dispatch. Recommended shape:

> Add one bounded companion skill or status effect across deterministic rules, balance data, KO/EN copy,
> icon/VFX mapping, UI presentation, regression tests, combat simulation, and rendered evidence.

The pilot WorkContract must name:

- exact mechanic and player-visible behavior;
- approved interface, types, call/state flow, invariants, test strategy, and rollback;
- ordered reviewable slices with dependency and per-slice Done criteria;
- affected scenario/characters and explicit non-goals;
- deterministic rule and balance invariants;
- localization strings and fallback behavior;
- required changed paths and forbidden paths;
- focused unit/simulator/browser assertions;
- acceptable use of existing assets versus any new visual generation;
- remaining subjective questions for the owner;
- repair budget `0` for the first baseline run;
- no subagents and no network/push/deploy.

Pilot completion criterion:

1. Owner approves the product/architecture/program-design artifact before implementation.
2. The first integrated slice receives an explicit owner audit before the remaining pattern repeats.
3. Every slice is independently green and produces one bounded local commit.
4. New regression tests prove base fail + candidate pass, or carry an accepted typed exemption.
5. `make check` passes outside the actor.
6. `$gameplay-qa` mechanical and simulator layers pass.
7. Relevant browser assertions produce a valid evidence bundle; uncertain rendering pauses.
8. Diff-scope and critic pass without verifier/rubric modification.
9. Ledger check and deterministic state/trajectory replay pass.
10. The candidate remains local only, with no push/deploy.
11. Owner receives a concise maintainability/subjective checklist and approve/reject command.

## 12. Implementation phases

### P0 — Release and pin the durable graph substrate

Status (2026-07-26): complete locally at upstream commit `bc48e8b`, tag
`overnight-harness--v1.3.0`, and the tag-derived 1.3.0 cache pin. Remote publication was not performed.

Work:

- finish upstream read-back and authoritative test gate for P0-A/P0-B/P1-A/P1-B/P1-C;
- commit/tag/release the graph-capable Harness version through its own release process;
- update MythOS `harness_root`/plugin resolution to the released artifact rather than a personal source
  checkout;
- align plugin and MythOS docs on the five-value verifier protocol;
- preserve schema compatibility or provide an explicit offline migration/read strategy.

Done:

- `make overnight-where` resolves the intended released version;
- upstream offline graph/recovery suites and package/init checks pass;
- MythOS `make overnight-ledger-check`, state, trajectory, resume, and provenance commands operate against
  the released package;
- no duplicate controller/runtime exists in MythOS.

### P1 — Add a MythOS graph integration smoke

Status (2026-07-26): complete. `make overnight-graph-smoke` proves all five fixture paths against the
released 1.3.0 cache, repeats equivalently, and leaves the MythOS worktree/ledger/claim untouched.

Work:

- add a read-only/offline `overnight-graph-smoke` operator target;
- create disposable fixture missions for design-blocked, accepted, reverted, repaired, and paused paths;
- validate contract compilation, ledger corruption rejection, projection determinism, evidence hashes,
  base/candidate regression validity, accounting balance, and provenance drift rejection;
- keep the graph smoke separate from ordinary product `make check` until the released plugin dependency is
  stable and cheap enough to satisfy the optional-accelerator rule.

Done:

- one command proves all five design-blocked/terminal/pause shapes without touching the current worktree
  or network;
- fixtures leave no source changes or persistent claims;
- repeated runs produce equivalent projections.

### P2 — Dogfood one real single-writer mission

Status (2026-07-26): complete as a correctly compensated first non-fixture mission. Owner-approved
`mission-20260726-181623-39074` produced one in-scope commit, then the independent gate exposed ambient
`OVERNIGHT_LANE` contamination and reverted it. Ledger/state/trajectory, exact compensation, scope, and
base-red/candidate-green regression evidence were audited from the preserved bundle. The adapter defect is
regression-locked; a second real-engine mission requires fresh approval and an explicit hard-budget policy.

Work:

- author one temporary, owner-approved `[auto:<engine>]` mission with executable Done criteria;
- require a minimal design artifact and bounded one-slice plan before actor dispatch;
- run from a clean disposable worktree with repair `0`, subagents `0`, and explicit budgets;
- collect contract, provenance, node attempts, gate/critic/verifier evidence, and terminal trajectory;
- perform a human audit even if every automated layer passes.

Done:

- the first non-fixture MythOS ledger contains a complete mission;
- the resulting commit is either verified and locally retained, correctly paused, or correctly compensated;
- no status is inferred from agent prose.

### P3 — Prove pause/resume and transition recovery

Work:

- route a deterministic verifier fixture to `needs_human`;
- approve one paused candidate and reject another;
- inject real process termination between actor/commit, gate/evidence, repair/reverify, and revert effects;
- restart and reconcile every interrupted state.

Done:

- approve/reject closes the same mission exactly once;
- completed actor/gate/critic/verifier work is not rerun after human resume;
- no duplicate commit, double compensation, orphan claim, missing range, or mixed lineage occurs.

### P4 — Run the vertical feature pilot

Work:

- compile the owner-selected feature through the domain adapter set;
- route product/architecture/program design through explicit approval before actor dispatch;
- implement one independently green local commit per reviewable slice and audit the first integrated slice;
- generate mechanical, gameplay, browser, and applicable narrative/image evidence;
- preserve all subjective residue as an explicit human checklist;
- compare graph report with a conventional supervised implementation review.

Done:

- the pilot completion criterion in §11 passes;
- human review can decide from evidence without reconstructing the full session;
- observed gaps are classified as product work, verifier gap, graph/runtime gap, or human authority—not
  collapsed into generic failure.

### P5 — Measure repair before enabling it

Precondition: owner ratifies `scripts/overnight/heldout-bank.md` composition.

2026-07-28 measurement: clean repair-0 bank v1 produced 0/3 accepted because all actors exceeded
the 12-turn acceptance gate before external verifiers (37/28/27); all were exactly compensated.
Repair-1 cannot exercise a repair edge under this contract. Keep repair off and never tune/retry
against bank v1. Owner decision 2026-07-28: retain strict 12-turn acceptance and close P5 without
repair-1. Any future reopening requires preregistration, a new owner-ratified unseen bank, and fresh
cost approval.

Work:

- run paired disposable-worktree trials with repair `0` and repair `1` against the frozen bank;
- audit every accepted bank commit;
- compare verified completion, false accepts, false stops, human overrides, dirty leftovers, cost, and
  repair success, regression validity, change amplification, and comprehension-debt trend signals;
- record promotion and rollback thresholds before seeing the result.

Done:

- repair default changes only if verified completion improves without unacceptable false-accept or cost
  regression;
- otherwise repair remains opt-in and the failed hypothesis is recorded.

### P6 — Extract a separate framework only after three workflows

Precondition: at least three real categories have completed—structural code work, gameplay work, and a
UI/content/visual vertical slice.

Work:

- apply the deletion test: identify behavior that would otherwise be duplicated across three consumers;
- extract only stable mission/ledger/router/projection interfaces into a separately versioned package or
  plugin module;
- retain Git workspace, coding-agent, verifier, and MythOS policy as adapters;
- add a second non-MythOS adapter before declaring a generic seam real.

Done:

- the extracted framework reduces caller knowledge and duplication;
- MythOS behavior and evidence remain unchanged through the same interface tests;
- there is still one structured state authority.

### P7 — Read-only dashboard, later

Precondition: real trajectories exist and operators have identified repeated questions that text output
cannot answer efficiently.

The dashboard may project mission status, causal path, evidence, cost/time, repair loops, human pauses,
and false-accept calibration. It never dispatches hidden work, mutates the ledger directly, or becomes a
second scheduler/state store.

## 13. Verification matrix

| Scenario | Expected proof |
| --- | --- |
| Design unapproved | No actor dispatch; mission pauses or aborts with the missing product/architecture/program-design decision. |
| Slice scope expansion | Route to replan/human; no silent path or responsibility expansion. |
| Regression validity | New regression test fails on base and passes on candidate, or a typed exemption is explicitly reviewed. |
| Clean accept | Required gate/critic/verifiers pass; one retained local commit; balanced trajectory. |
| Mechanical red | Actor claim is not accepted; typed reject and compensation evidence exist. |
| Critic hard fail | Concrete finding references diff evidence; no repair edge; candidate compensated. |
| Repairable verifier | Exit `4`; bounded repair receives diagnosis; full perimeter reruns. |
| Repair exhaustion | Original-to-final range is compensated once; terminal reason names exhausted budget. |
| Human pause | Pending commit/evidence snapshot durable; write lease released; mission non-terminal. |
| Human approve | Exact pending commit retained; same mission terminal accepted; no stage rerun. |
| Human reject | History-preserving compensation; same mission terminal rejected. |
| Corrupt ledger | Check/project/report/resume fail closed with a precise corruption location. |
| Missing evidence | Required hash/ref fails closed; never accepted from actor prose. |
| Provenance drift | Resume/compare refuses mixed graph lineage and requests a new human decision. |
| Process kill | Restart recovers or safely stalls; no duplicate commit, evidence, cost, or revert. |
| Scope escape | `10-diff-scope` rejects; repair is forbidden for contract/security violations. |
| Maintainability drift | Report as a monitored trend with evidence; do not auto-reject until a calibrated deterministic rule exists. |
| Production signal | Create a read-only intake candidate for human triage; never dispatch or mutate production directly. |

## 14. Rollout and rollback

Rollout order:

1. released graph substrate;
2. offline fixtures;
3. one disposable real mission with repair off;
4. pause/recovery proof;
5. design-approved, sliced vertical feature pilot;
6. held-out repair A/B;
7. optional read-only fan-out and framework extraction.

Rollback is configuration-first:

- stop new dispatch;
- keep the append-only ledger and evidence for diagnosis;
- set repair and subagents to `0`;
- revert to the last released plugin version through the configured Harness pin;
- do not delete or rewrite mission history;
- compensate only affected Git ranges through the recorded recovery interface;
- update the plan/decision record with the measured reason.

## 15. Explicit human decisions

Required before the corresponding phase:

- approve the exact first vertical feature and its subjective checklist;
- approve the first pilot's architecture/program-design artifact and first integrated slice;
- approve release/pin changes to the external Harness checkout;
- ratify held-out-bank composition before repair A/B;
- authorize any real model/network cost beyond existing offline coding-agent calls;
- explicitly authorize bounded read-only multi-agent fan-out;
- approve push, deploy, production access, and release separately.

## 16. Immediate implementation order

1. Record the ownership/interface decision in `docs/DECISIONS.md` before code changes.
2. Convert P0-A/P0-B/P1-A/P1-B/P1-C from personal upstream checkout state into a tested released Harness
   version and update MythOS's pin.
3. Extend WorkContract compilation with the design artifact, slice plan/review budget, and regression-test
   validity policy; add the `design.approve` route and `15-regression-validity` adapter.
4. Implement the MythOS `overnight-graph-smoke` fixture seam and expanded verification matrix.
5. Run one real single-writer mission with repair/subagents off and audit its ledger/trajectory.
6. Prove pause approve/reject and crash recovery.
7. Ask the owner to select the exact vertical feature and approve its design/slices, then run the pilot.
8. Checkpoint immediate and comprehension-debt baseline results; only then decide repair activation,
   fan-out, framework extraction, or UI.

The first implementation slice is complete when steps 1-5 produce the first valid non-empty MythOS
mission trajectory from a released Graph-capable Harness with an approved design artifact and valid
regression evidence, without push, deploy, or subjective auto-accept.

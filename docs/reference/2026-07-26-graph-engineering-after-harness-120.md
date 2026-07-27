# Graph Engineering after Harness Plugin 1.2.0

Date: 2026-07-26
Status: research / implementation audit / recommendation
Scope: Project MythOS + Overnight Harness Plugin 1.2.0 (`a697cb6`)

> Implementation update (2026-07-26): **P0-A, P0-B, P1-A, P1-B, and P1-C are locally released as Harness
> 1.3.0 (`bc48e8b`, tag `overnight-harness--v1.3.0`) and MythOS pins its tag-derived cache.** Remote publication
> remains pending. `ledger.py` now owns locked append + `fsync`, schema 1 replay/schema 2 hashed refs,
> deterministic projection and corruption checks; claim reconciliation uses the same projector;
> evidence schema/writer mismatches are fixed and evidence-free acceptance is blocked. Verifier
> `needs_human` now creates a durable non-terminal snapshot; approve/reject resumes the same mission
> only after HEAD/worktree/evidence/graph validation and never reruns the automated chain. Offline
> harness suite is now 116 checks. P1-A adds a canonical secret-free manifest before the first event;
> schema-3 events/evidence share its fingerprint/ref, replay rejects mixed lineage, and manifest diff
> separates configuration drift from same-graph nondeterminism. MythOS exposes ledger/state/resume/
> provenance-compare targets. P1-C adds durable effect checkpoints, accepted-evidence recovery,
> idempotent full-range compensation, and eight real-process kill/restart fixtures. P1-B adds a
> deterministic causal/accounting projection. **P2 bounded read-only scatter/gather is next, gated on
> held-out-bank ratification and explicit multi-agent authorization.**

## Executive verdict

개선사항은 있다. 다만 다음 단계는 graph framework 도입이나 write-lane fan-out이 아니다.
1.2.0은 graph의 **판정 토폴로지**를 상당 부분 해결했다. `PASS|REPAIR|FAIL`, verifier
`0|1|2|3|4`, bounded revision, cross-engine critic으로 reject가 더 이상 하나의 blind-restart
edge로 뭉개지지 않는다.

남은 큰 갭은 세 가지다.

1. **Durable state:** 이벤트를 남기지만 lifecycle-critical event도 best-effort write이고,
   `needs_human`은 재개 가능한 checkpoint가 아니라 terminal + review queue다.
2. **Graph provenance:** 어떤 graph/config/prompt/verifier 조합이 그 결정을 만들었는지 하나의
   fingerprint로 재현할 수 없다.
3. **Edge credit:** mission 결과는 알 수 있지만 어느 node/edge/repair가 품질·비용·실패에
   기여했는지 비교하기 어렵다.

따라서 1.3 후보의 권장 순서는 **ledger/evidence integrity → pause/resume → provenance →
edge-level trajectory → 제한적 read-only fan-out 실험**이다. LangGraph나 Temporal을 런타임으로
도입할 필요는 없다. 검증된 primitive만 현재 Bash runner와 JSONL seam에 작게 이식하면 된다.

## 1. 조사 범위와 판정 기준

### 현재 구현 대조

- MythOS: `.claude/harness-config.json`, `Makefile`, `scripts/overnight/`,
  `docs/reference/GRAPH_ADOPTION.md`, `docs/plans/2026-07-25-harness-120-adoption.md`
- plugin 1.2.0: `run.sh`, `lib/events.sh`, `lib/claim.sh`, `lib/verify.sh`, event/evidence schemas,
  controller/contract/repair tests
- 판단 기준: crash 후 복원, human pause 후 같은 mission 재개, effect 중복 방지, 실행 조합 재현,
  edge별 비용·품질 귀속, held-out 평가 가능성

### 외부 1차 자료

- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)는 graph state
  snapshot을 thread checkpoint로 저장해 interruption, human-in-the-loop, fault tolerance에 쓴다.
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)는 동일 thread ID로
  저장된 state를 재개하며, 재개 시 node 앞부분이 다시 실행될 수 있으므로 interrupt 전 side effect는
  idempotent해야 한다고 명시한다.
- [Temporal architecture](https://github.com/temporalio/temporal/blob/main/docs/architecture/README.md)는
  append-only history replay로 workflow state를 복원하고, workflow는 deterministic/no-side-effect,
  activity는 idempotent 또는 non-retryable로 분리한다.
- [OpenTelemetry trace specification](https://opentelemetry.io/docs/specs/otel/overview/)은 trace를
  parent/child span과 causal link로 표현한다. 시간순 로그만으로는 드러나지 않는 fan-out/fan-in 및
  retry 인과관계를 표현하는 데 적합하다.
- [StateFlow](https://arxiv.org/abs/2403.11322)는 process grounding을 state/transition에,
  sub-task solving을 state 내부 action에 분리하는 설계를 제안한다. 핵심은 framework가 아니라
  명시적 state machine과 transition boundary다.
- [Agent Lightning](https://arxiv.org/abs/2508.03680)은 실행과 학습을 분리하고 trajectory를
  transition 단위로 분해해 credit assignment를 수행한다. 이 repo에는 RL보다 먼저 동일한 형태의
  관측 가능한 trajectory가 필요하다는 근거로만 사용한다.
- [AFlow](https://arxiv.org/abs/2410.10762)는 code-represented workflow graph를 실행 feedback으로
  탐색할 수 있음을 보인다. 반대로 held-out bank와 graph version lineage 없이 topology를 자동
  최적화하면 같은 bank에 과적합될 수 있으므로, 현재는 도입 근거가 아니라 **보류 근거**다.
- [Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)은
  research형 병렬 작업에서 orchestrator-worker가 유용했지만, 자체 데이터상 multi-agent가 chat보다
  약 15배의 token을 쓰며 dependency가 많은 coding task는 적합도가 낮다고 보고한다.

## 2. 1.2.0에서 이미 적용된 graph engineering

| Graph primitive | 1.2.0 / MythOS 상태 | 판정 |
| --- | --- | --- |
| typed reject edge | critic `PASS|REPAIR|FAIL`, verifier `0/1/2/3/4` | 적용 |
| bounded loop-back | `budgets.revisions`, `OVERNIGHT_REPAIR=0..3` | 적용, MythOS는 default-off |
| independent reviewer | `OVERNIGHT_CRITIC_ENGINE` | 적용, 효과는 1건 smoke뿐 |
| external anchor | 새 commit에서 gate 재실행, fail-closed verifier | 적용 |
| single-writer claim | live PID 거부, stale claim reconciliation | 적용 |
| append-only history | `events.jsonl`, typed terminal | 적용, durability는 부분적 |
| human edge | verifier exit 3, `REVIEW_QUEUE.md`, durable pause/resume | P0-B 적용, local 1.3.0 release |
| immutable evidence intent | contract/verifier/artifact schema + sha256 | 부분 적용, 아래 mismatch 존재 |
| held-out anchor bank | MythOS bank 초안 3건 | 구성됨, owner ratification 전 |
| edge-level causal trace | node/edge/parent/state-delta identity | 미적용 |
| graph/config lineage | canonical manifest + schema-3 event/evidence binding | P1-A 적용, local 1.3.0 release |

결론적으로 1.2.0의 다음 단계는 reject edge를 더 늘리는 것이 아니라 **edge를 건너는 state의
내구성과 계보를 보강하는 일**이다.

## 3. 구현 감사에서 확인된 구체적 갭

### G6. 원장이 authoritative하다고 보기 어려움

`lib/events.sh`는 ledger를 "state reconstruction의 machine surface"로 설명하지만 event emission은
명시적으로 best-effort이며 실패를 삼킨다. 이 상태에서는 lifecycle-critical event 하나가 빠져도
runner는 계속 진행하고, 다음 process는 불완전한 원장으로 state를 재구성한다. schema가 말하는
"sequence gap = corruption"도 runtime에서 fail-closed로 검사하지 않는다.

또한 stale claim reconciliation은 orphan mission을 `stalled`로 닫을 뿐이다. 마지막으로 성공한
node, pending effect, 검증 중이던 commit range를 복원해 재개하지 않는다. 이는 안전한 stop이지만
durable execution은 아니다.

### G7. `needs_human`은 pause가 아니라 terminal

등록 verifier가 exit 3을 반환하면 runner는 pending commit과 evidence bundle을 남기고
`needs_human` terminal을 기록한 뒤 claim을 해제한다. 사람의 결정은 같은 mission의 다음 edge로
들어가지 않으며, resume cursor나 stale-state 검증도 없다.

현재 동작은 **human review queue**로는 안전하다. 다만 graph 용어로는 interrupt/resume가 아니므로
문서와 관측에서 둘을 구분해야 한다. pending commit을 사람이 승인했는지, 거절했는지, 수정했는지까지
하나의 mission trajectory로 닫으려면 resumable state가 필요하다.

### G8. evidence schema와 writer 사이의 provenance mismatch

현재 writer와 schema 사이에 다음 차이가 있다.

- event schema의 `evidence_refs` 설명은 `path#sha256` 또는 bundle ID를 요구하지만 emitter는 path만
  기록한다.
- evidence schema의 `contract_ref`는 immutable `path#sha256`를 요구하지만 writer는 contract path
  또는 `gate:<command>`만 기록한다.
- verifier evidence artifact writer는 type `verifier-evidence`를 쓰지만 schema enum에는 그 값이
  없다(`gate-log|trace|screenshot|diff|commit|report|other`). evidence가 있는 verifier 경로에서 strict
  validation하면 불일치할 수 있다.
- bundle에는 adapter version은 있지만 runner/plugin commit, graph schema version, effective config,
  contract compiler, critic prompt/model/engine, verifier executable hash가 하나의 manifest로 묶이지 않는다.

이는 "증거 파일이 없다"는 뜻이 아니다. 현재 증거로 결과를 감사할 수는 있지만, **서로 다른 밤의
graph를 동등 조건으로 비교하거나 정확히 재현하기 어렵다**는 뜻이다.

### G9. event는 시간순이지만 graph 인과관계는 약함

event 기본 키는 mission, sequence, attempt, engine, adapter다. `node_id`, `edge_type`, `parent_event_id`,
`state_before_hash`, `state_after_hash`, `effect_id`, 시작/종료 duration이 공통 필드가 아니다.
repair attempt는 extension event로 볼 수 있지만 다음 질문은 자동 집계하기 어렵다.

- 어떤 reject edge가 repair 성공률을 높였는가?
- cross-engine critic이 추가한 비용과 실제 결함 발견률은 얼마인가?
- gate/critic/verifier 중 어디서 wall time이 소모됐는가?
- 같은 input state에서 graph/config 변경 전후 결과가 왜 달라졌는가?

## 4. 권장 개선안

### P0-A. Ledger + evidence integrity gate — released locally in 1.3.0

새 graph runtime보다 먼저 현재 원장을 믿을 수 있게 만든다.

1. `mission.claimed`, effect start/result, checkpoint, terminal은 **critical event**로 분류하고 atomic
   append + fsync 또는 temp-and-rename snapshot을 사용한다. critical write 실패는 mission을
   fail-closed로 중지한다. usage/debug event만 best-effort를 허용한다.
2. 공통 reducer를 만들어 `events.jsonl -> mission state`를 결정적으로 project한다. status/dashboard,
   orphan reconciliation, report가 같은 reducer를 사용한다.
3. sequence gap, duplicate terminal, terminal 뒤 event, dangling effect, invalid schema를 검증하는
   `ledger-check`를 gate에 추가한다.
4. evidence writer를 schema와 정렬하고 모든 immutable ref에 실제 sha256을 붙인다.

**Exit criterion:** 일부 event line 삭제·중복·절단을 주입한 test에서 정상 ledger는 동일 state로
replay되고, 손상 ledger는 runner/report가 명시적으로 corruption으로 거부한다.

### P0-B. Resumable human checkpoint — released locally in 1.3.0

`needs_human`을 없애지 말고 terminal과 pause를 분리한다.

- `wait.user_input` 또는 `wait.approval` event와 `PAUSED/<mission>.json` snapshot을 기록한다.
- snapshot 최소 필드: mission/attempt, pending edge, HEAD/range, dirty state, contract hash, evidence
  bundle hash, graph fingerprint, 질문, 허용된 resume verdict.
- `overnight-resume <mission> --approve|--reject`는 같은 HEAD·cleanliness·fingerprint를 검증한 뒤
  accept/revert edge만 실행한다. drift가 있으면 자동 재개하지 않고 새 human decision으로 돌린다.
- 승인/거절/수정 결과까지 같은 mission에 event로 남기고 terminal은 그 뒤 한 번만 기록한다.

**Exit criterion:** process 종료 후 다른 process에서 승인/거절을 각각 재개해 duplicate commit,
double revert, orphan claim 없이 동일 mission이 하나의 terminal로 닫힌다.

**구현 결과 (2026-07-26):** `pause.py`/`pause.sh`가 atomic snapshot과 pending HEAD, evidence,
controller/policy/verifier manifest hash를 기록한다. `resume.sh`는 claim을 다시 획득하고 snapshot을
재검증한 뒤 approve면 pending commit을 유지하고 reject면 공통 `git.sh` seam으로 compensation
commit을 만든다. paused mission은 일반 orphan projection에서 제외되며, status에 별도 표시된다.
승인/거절, interrupted claim, double/conflicting decision, stale HEAD, dirty tree, evidence tamper,
graph drift, 다음 normal runner의 paused-orphan exclusion까지 offline fixture로 검증했다.

### P1-A. Graph provenance manifest — released locally in 1.3.0

mission 시작 시 다음 값을 canonical JSON으로 만들고 sha256을 `graph_fingerprint`로 기록한다.

- plugin version + runner Git commit
- event/evidence/work-contract schema versions
- effective environment 중 정책 값(비밀 제외): gate, budget, critic/repair/oversight mode
- contract compiler hash + compiled contract hash
- actor/critic engine/model/adapter version + critic prompt hash
- ordered verifier registry + executable/rubric hash
- graph topology version

manifest는 evidence bundle artifact로 포함한다. 비밀·전체 environment·원문 credential은 절대 넣지
않는다.

**Exit criterion:** 두 mission의 결과 차이를 `graph_fingerprint`와 manifest diff로 설명할 수 있고,
동일 fingerprint인데 결과가 다른 경우를 non-deterministic node/effect 분석 대상으로 자동 표시한다.

**구현 결과 (2026-07-26):** `provenance.py`가 canonical JSON, atomic write, source drift validation,
manifest diff를 소유하고 `provenance.sh`는 mission 시작 전 initializer 하나만 노출한다. manifest는
plugin/runner commit+file hash, schema/topology, whitelisted policy/budgets, contract compiler binding,
actor/critic engine-model-adapter-prompt, ordered verifier/rubric hash를 기록하며 secret/full environment는
배제한다. 새 event/evidence schema 3은 동일 fingerprint/ref를 강제하고 ledger는 같은 mission의 mixed
lineage를 거부한다. runner mission이 여러 iteration을 포함하므로 compiled WorkContract는 manifest를
변조하지 않고 각 evidence bundle의 immutable `contract_ref`로 결박한다. 5개 provenance fixture를
포함한 전체 offline suite는 100/100이다.

### P1-B. Edge-level trajectory와 causal trace — released locally in 1.3.0

framework를 도입하지 않고 event vocabulary를 정규화한다.

```text
mission
  -> actor.invoke
  -> gate.verify
  -> critic.review
  -> verifier.<name>
  -> accept | repair -> actor.invoke | revert | wait.human
```

각 node attempt에 `node_id`, `attempt_id`, `parent_id`, `input_state_hash`, `output_state_hash`, duration,
tokens/cost, verdict를 붙인다. repair와 향후 fan-out에는 OpenTelemetry span link와 같은 causal link를
사용한다. JSONL이 source of truth이고 OTel export는 선택적 projection으로 둔다.

이 trajectory는 당장 RL에 쓰지 않는다. 먼저 edge별 성공률·비용·false accept·human override를
집계하는 offline report에 사용한다.

**Exit criterion:** accepted/repaired/reverted/needs-human mission 한 건씩을 node/edge diagram과 표로
재구성하고, 총 duration/tokens가 child attempt 합계와 맞는다.

**구현 결과 (2026-07-26):** `trajectory.py`가 ledger JSONL을 수정하지 않고 mission별 stable
`node_id`/`attempt_id`/`parent_id`, deterministic input/output state hash, typed edge/verdict/evidence,
duration/token/cost로 투영한다. actor/gate/critic/repair/repo verifier 결과는 `duration_ms`를 기록하고
critical actor/repair/critic result가 token/cost를 소유한다. best-effort usage event는 관측 호환용이며
회계에서 제외한다. raw source total과 projected child 합계가 독립적으로 맞아야 하고 음수 회계는 fail-closed다.
accepted/repaired/reverted/needs-human 4경로, byte-deterministic replay, causal chain, balanced accounting을
8개 fixture로 검증했다. text mode는 causal path와 node/accounting table을 함께 렌더한다.
actor/repair/critic usage는 critical result에 한 번만 귀속하고 best-effort
usage event는 accounting에서 제외한다. JSONL이 유일한 source of truth이고 OTel은 선택적 export로만 남는다.

### P1-C. Transition fault matrix — released locally in 1.3.0

happy-path test만 늘리지 말고 edge 사이 crash를 주입한다.

| 주입 지점 | 반드시 지킬 불변식 |
| --- | --- |
| actor commit 후 event 전 | orphan을 탐지하고 중복 actor dispatch 금지 |
| gate pass 후 evidence 전 | evidence 없는 auto-accept 금지 |
| critic REPAIR 후 actor 재호출 전 | 진단과 budget 보존 |
| repair commit 후 재검증 중 | 원 commit range 전체가 추적됨 |
| revert 중 process kill | 다음 start에서 double revert 금지 |
| human pause 후 HEAD 변경 | stale resume 거부 |
| terminal write 직전/직후 kill | terminal은 정확히 한 번 |

**구현 결과 (2026-07-26):** `mission.checkpointed`가 actor 직전 base, repair의 original→final range,
revert 전후를 기록하고 ledger projection이 이를 accepted evidence와 함께 recovery row로 노출한다.
다음 claim takeover는 immutable accepted bundle과 exact HEAD가 맞을 때만 accepted로 닫고, 그 전이면
전체 range를 base tree로 compensation한 뒤 stalled로 닫는다. partial revert는 abort/retry하며 이미
보상 commit이 생긴 경우 base/current tree identity로 완료를 인식해 double revert를 막는다. 모호한
evidence/HEAD/dirty/ancestry는 새 actor dispatch를 차단한다. `tests/fault-matrix.sh`의 8개 실제
`SIGKILL` fixture와 기존 `tests/resume.sh`의 human-pause HEAD drift fixture를 합쳐 표의 전 항목을
검증했고 전체 harness suite는 108/108이다.

### P2. Read-only scatter/gather만 제한 실험

병렬화는 coding write lane이 아니라 독립적인 **read-only scout**에서 시작한다.

- 후보: 서로 독립적인 web research, test failure clustering, diff risk review
- 금지: 같은 worktree 동시 write, shared mutable plan 수정, 순서 의존 implementation
- fan-out budget 상한 2~3, 모든 input artifact hash 고정, fan-in evaluator 하나
- 단일 agent 대비 wall time, tokens, 발견한 유효 결함, 중복률을 paired report

Anthropic의 비용/적합성 데이터 때문에 이것은 default가 아니라 held-out A/B다. MythOS의
Model-B 3-lane demonstration과도 분리한다. worktree lane 병렬성은 repository ownership 문제이고,
scout fan-out은 한 mission 내부의 read-only graph 문제다.

### P3. Automated graph optimization은 보류

AFlow류 topology search나 Agent Lightning류 학습은 지금 적용하지 않는다. 선행 조건은 다음이다.

1. owner-ratified held-out task bank
2. graph fingerprint + replayable trajectory
3. false accept / dirty leftover / human override counter-metric
4. 최소 표본과 promotion/rollback 규칙

이 조건 전에는 사람이 graph를 작게 변경하고 held-out 결과로 승격하는 편이 더 안전하고 싸다.

## 5. 1.3 제안 범위

### Must

- schema/writer mismatch 수정
- critical event durability + `ledger-check`
- reducer 기반 state projection
- resumable human checkpoint
- graph provenance manifest
- transition fault matrix

### Should

- edge-level trajectory report
- OTel-compatible parent/link field
- cross-engine critic paired metrics

### Not now

- LangGraph/Temporal 런타임 의존성
- graph DSL/bible 신설
- unrestricted multi-agent fan-out
- concurrent writes to one worktree
- automatic prompt/topology optimization
- `OVERNIGHT_REPAIR=1` before held-out bank ratification

## 6. MythOS 적용 우선순위

1. **Harness upstream 우선:** P0-A/P0-B/P1-A/P1-B/P1-C는 upstream checkout에 구현 완료(미출시).
   다음 P2 read-only fan-out은 held-out-bank ratification과 명시적 multi-agent 허가 전에는 시작하지 않는다.
2. **MythOS는 consumer contract만 준비:** held-out bank owner ratification, ledger/state/resume/
   provenance-compare operator seam, repo verifier/rubric hash 제공.
3. **측정 후 opt-in:** repair와 cross-engine critic은 trajectory report가 생긴 뒤 held-out A/B로
   판정한다. 현재의 1건 disagreement를 효과로 일반화하지 않는다.
4. **제품 graph는 별도:** narrative/route/combat graph는 이미 deterministic anchor와 validator
   repair ledger가 있다. overnight controller의 durable-execution 문제를 제품 runtime에 그대로
   이식하지 않는다.

## Final recommendation

Graph Engineering 관점의 다음 투자점은 **더 복잡한 graph**가 아니라 **복원 가능하고 비교 가능한
graph**다. 1.2.0이 edge semantics를 만들었으므로, 1.3은 그 edge를 건너는 state와 evidence를
durable·versioned·causal하게 만드는 릴리스가 가장 자연스럽다.

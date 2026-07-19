# OpenAI + Anthropic 관점의 MythOS Harness V2 최종 합성

작성: 2026-07-18 · 성격: **최종 연구 합성 / 구현 전 기준 문서**

입력 문서:

- [`2026-07-18-sol-harness-long-loop-hitl.md`](2026-07-18-sol-harness-long-loop-hitl.md) — GPT-5.6 Sol / OpenAI 관점
- [`2026-07-18-fable-harness-anthropic-view.md`](2026-07-18-fable-harness-anthropic-view.md) — Claude Fable 5 / Anthropic 관점

이 문서는 두 연구 문서를 대체하지 않는다. 서로 다른 강조점을 하나의 MythOS 채택 기준으로
정리하고, **지금 확정할 원칙**과 **실험으로 판정할 가설**을 분리한다.

## 최종 결론 (교차 검수 후 재작성: Claude Fable 5, 2026-07-18)

**판정: 채택.** 본문 §1–§10은 OpenAI 관점 문서와 Anthropic 관점 문서 어느 쪽과도 모순 없이
합성되었고, 두 원 문서를 낳은 양쪽 모델이 이 결론에 서명한다. MythOS Harness V2는 이 문서를
구현 전 기준으로 삼는다.

합성 전체를 지탱하는 아이디어는 하나다.

> **perimeter와 scaffold를 분리하라.** 안전·증거·복구·감독 외곽(perimeter)은 얇고 영구적이며
> 모델이 아무리 좋아져도 제거하지 않는다. 모델 결함을 보정하는 내부 장치(scaffold)는 전부
> "엔진이 X를 못 한다"는 가정을 기록한 부채이며, capability probe로 켜고 끄고 엔진 세대마다
> 제거 가능성을 재측정한다.

이 분리가 두 관점의 표면적 대립을 해소한다. OpenAI의 "외부 제어면을 만들라"는 perimeter에 대한
말이고, Anthropic의 "하네스를 다이어트하라"는 scaffold에 대한 말이다. 같은 층에 대한 주장이
아니므로 둘 다 옳고, 하나라도 빠지면 실패한다 — perimeter 없는 다이어트는 복구 불능 자율화이고,
다이어트 없는 제어면은 921줄 러너의 재생산이다.

이 결론에서 도출되는 서열도 하나다. **verifier가 controller보다 먼저다.** 자율화의 상한을 정하는
것은 mission 상태기계의 정교함이 아니라 증거의 질이다 — 결정론 gate, combat/route oracle, browser
runtime evidence, 독립 rubric grader가 강할수록 controller는 단순해도 된다. 따라서 §10 우선순위의
3번(VerifierRegistry 추출)은 4번(RunController)에 실질적으로 선행하며, P0 이후 첫 코드 투자는
verifier adapter다.

사람의 역할은 "모든 산출물의 승인자"에서 세 가지로 이동한다: ①테스트·oracle·rubric·관측 표면의
설계자 ②불가역·고위험·낮은 확신·평가자 불일치·taste의 최종심 ③자동 평가자 drift를 보정하는
라벨 공급자. 단, 이 이동은 목표가 아니라 **측정으로 획득하는 상태**다 — §5의 6/8/2 전환과
50–70% 절감은 세 release bundle에서 escaped defect·false accept·calibration drift가 유지될 때만
채택되는 가설이지, 지금 선언하는 성과가 아니다.

지금 확정하는 것은 §6의 원칙 10개와 §8의 P0 산출물 4종이다. 나머지는 전부 §7의 가설이며, 한
실험에 한 축, 두 대표 run 악화 시 기능 롤백, safety baseline은 실험 대상에서 제외한다는 규율
아래에서만 판정한다. 첫 행동은 변하지 않는다: **controller 코드가 아니라 P0의 assumption matrix와
세 run 기준선부터.**

```text
영구 perimeter
  권한·예산·상태·복구·증거·감독 정책
        ↓
가변 scaffold
  reset/continue · prompt detail · decomposition · retry choreography · memory hints
        ↓
capability-aware actor
  Sol / Fable / Claude / Codex / AGY / 기타 엔진 adapter
```

## 1. 양측이 합의하는 사실

### 1.1 병목은 actor 지능만이 아니다

- OpenAI: 생성량이 늘자 human QA와 조정이 병목이 되었고, UI·로그·메트릭을 agent-readable하게
  만든 뒤 자동화 범위가 넓어졌다.
- Anthropic: 장기 작업에서 성능을 가르는 것은 샌드박스, 체크포인트, 테스트, 피드백 형식,
  진행 추적 같은 환경 설계였다.
- MythOS 결론: 다음 투자는 더 긴 프롬프트보다 `VerifierRegistry`, runtime/browser evidence,
  evaluator calibration에 우선 배분한다.

### 1.2 actor의 자기 완료 선언은 증거가 아니다

- 양측 모두 self-evaluation의 낙관성과 “green but wrong” 문제를 인정한다.
- 완료는 CLI exit, 커밋 생성, actor 요약 중 어느 하나로 판정하지 않는다.
- `WorkContract`가 요구한 evidence를 독립 verifier가 확인하고, controller가 tracker state를
  다시 읽은 뒤에만 mission을 `accepted`로 전이한다.

### 1.3 강한 모델일수록 prompt는 lean해진다

- OpenAI는 목표·범위·승인 경계·성공 조건을 남기고 반복 지시와 불필요한 tool description을
  줄이라고 권한다.
- Anthropic은 이전 모델용 step-by-step 스캐폴딩이 강한 모델의 품질을 낮출 수 있으므로
  de-prescription A/B를 권한다.
- MythOS 결론: 정적 안전 규칙은 sandbox/rules/gate가 소유하고, actor prompt는 렌더링된
  `WorkContract` 요약과 현재 checkpoint만 담는다.

### 1.4 reset과 continuation은 엔진 능력에 따라 달라진다

- 약한 모델이나 drift가 발생한 세션에는 fresh reset + 구조화 handoff가 유리하다.
- 강한 모델은 continuous session + compaction/persisted reasoning이 더 단순하고 효율적일 수 있다.
- MythOS 결론: `mission != process != turn != commit`. fresh process는 안전한 fallback이며
  universal policy가 아니다.

### 1.5 사람 판단은 제거보다 압축이 목표다

- 결정론적 상태와 runtime behavior는 자동 증거로 내린다.
- UX·서사·이미지 같은 확률적 품질은 agent가 prefilter하고 표본 감사한다.
- 결말 감정, 제품 방향, 밸런스 임계값, prod/비밀/불가역 행동은 human authority로 유지한다.

## 2. 두 관점의 차이와 MythOS 최종 선택

| 축 | OpenAI 강조 | Anthropic 강조 | MythOS 최종 선택 |
| --- | --- | --- | --- |
| 제어 | 외부 orchestrator가 상태·재시도·복구 소유 | 플랫폼/모델이 compaction·memory·budget 일부 흡수 | 영구 perimeter는 controller 소유, scaffold는 capability에 위임 가능 |
| 하네스 성장 | 더 긴 실행을 위한 명시적 control plane | 모델이 좋아질수록 불필요한 하네스 삭제 | controller를 만들되 assumption ledger로 무조건적인 V1 이식 금지 |
| 완료 계약 | evidence contract와 verifier | goal + gradeable rubric + `max_iterations` | `WorkContract = goal + scope + rubric/evidence + budget + oversight` |
| 메모리 | persisted reasoning과 cache | file lesson memory | repo lesson 파일은 portable surface, engine reasoning은 optional cache; 어느 것도 runtime truth 아님 |
| 병렬성 | 기본 3, 독립 작업 중심 | claim/oracle이 있으면 16-agent도 가능 | 시작 상한 3; 공유 쓰기 직렬화·claim·oracle이 증명된 레인만 단계적 확대 |
| 안전 | sandbox + rules + approval review | 모델 측 refusal/action classifier | 물리 권한은 외부 고정; refusal은 별도 event이며 자동 폴백은 policy 결정 |
| 검증 | trace/evals/adversarial verifier | independent grader/oracle/differential test | 결정론 gate + oracle + runtime evidence + 독립 rubric grader를 조합 |

핵심 해소 방식은 **perimeter/scaffold 분리**다.

### 영구 perimeter

- sandbox와 허용 경로;
- push/deploy/network/destructive/secret 경계;
- mission ID, claim/lease, terminal state;
- wall/token/cost/retry/subagent budget;
- external re-gate와 evidence requirement;
- append-only event ledger와 restart reconciliation;
- human-decision 조건.

### 제거 가능한 scaffold

- fresh-process 강제;
- 한 iteration 한 task 강제;
- sprint/decomposition 형식;
- 장황한 절차 프롬프트;
- 고정 retry choreography;
- progress narration 규칙;
- actor용 memory hint와 요약 형식.

scaffold를 추가하거나 유지할 때는 반드시 “어떤 엔진 결함을 가정하는가”와 제거 조건을 기록한다.

## 3. 최종 module 설계

외부 interface는 작게 유지한다.

```text
controller reconcile --once|--watch
controller status
controller stop
```

| Module | 책임 | 최종 판단 |
| --- | --- | --- |
| `RunController` | claim/lease, lifecycle, checkpoint, retry/backoff, stall/restart reconciliation | 영구 perimeter |
| `WorkContract` | goal, scope, allowed actions, gradeable rubric/evidence, budgets, oversight | Markdown plan을 실행 계약으로 컴파일 |
| `EngineAdapter` | capability probe, invoke/continue/cancel, event/usage/refusal normalization | 브랜드가 아니라 실제 surface 능력으로 선택 |
| `VerifierRegistry` | gate, oracle, state, browser, trace, rubric, adversarial verifier 조합 | MythOS 자동화의 최우선 투자점 |
| `OversightPolicy` | automated/monitored/human-decision 라우팅 | 위험·확신·불일치·되돌릴 수 있음으로 판정 |
| `EvidenceBundle` | verifier 버전, 로그, trace, screenshot, rubric verdict, human override 참조 | mission acceptance의 유일한 증거 묶음 |

`AssumptionLedger`는 별도 runtime module로 만들지 않는다. P0 behavior/fixture inventory의 한 컬럼이자
설계 감사 문서로 둔다. 얕은 pass-through module을 하나 더 만드는 대신, 기존 module의 scaffold
정책을 제거할 근거로 사용한다.

## 4. 최종 mission 흐름

```text
queued → claimed → running ↔ checkpointed → verifying → reviewing
          │           │             │           ├─ accepted
          │           ├─ stalled ───┘           ├─ revise
          │           ├─ refused                ├─ retry_wait
          │           └─ failed                 └─ needs_human
          └─ released / canceled
```

규칙:

- 정상 continuation과 비정상 retry를 구분한다.
- `refused`는 failure/rate-limit/timeout과 다른 event다.
- rubric grader가 있는 contract는 `max_iterations` 안에서 iterate→grade→revise할 수 있다.
- 이전 reasoning이나 lesson은 참고 자료이며 tracker/evidence를 덮어쓰지 않는다.
- controller는 매 dispatch 전에 reconciliation을 수행한다.
- 동일 mutable tree에 대한 writer는 항상 하나다.

## 5. 검증과 HITL 최종 구조

### 증거 계층

1. **Mechanical** — lint, type, build, unit/contract test, policy check.
2. **Oracle/state** — 결정론 combat/route 결과, DB state, golden behavior, differential comparison.
3. **Runtime/experience** — 실제 browser/touch/scroll, console/network, OTel trace, latency, screenshot.
4. **Semantic/adversarial** — scope drift, test 약화, mock-only success, stub, spec/test mismatch.
5. **Human authority** — taste, 제품 방향, prod/비밀/불가역 결정, 낮은 확신과 평가자 불일치.

### Neo-Seoul 수동 QA 목표

기존 16개 human-play 항목에 대한 1차 목표는 유지한다.

- **6 auto-close**: 상태·도착률·합류·컷신 cardinality·return path처럼 실행 가능한 증거가 있는 항목.
- **8 monitored**: 지도/touch, 이미지 일관성, pace, 성장, 서사 연결처럼 agent prefilter + 표본 감사가
  적합한 항목.
- **2 human-authority**: 결말의 정서적 납득과 기억에 남는 장면/전체 verdict.

목표는 human QA 시간을 50–70% 줄이는 가설이다. 세 release bundle 동안 다음이 모두 유지될 때만
채택한다.

- escaped P0/P1 defect 증가 없음;
- false accept/false stop 허용 범위 내;
- grader-human calibration drift 안정;
- 재검과 복구 시간을 포함한 실제 human minutes 감소.

## 6. 지금 확정하는 원칙

1. plugin behavior SoT + MythOS verifier adapter 구조를 목표로 한다.
2. 안전·증거 perimeter는 모델 업그레이드로 제거하지 않는다.
3. V1의 921줄 책임을 그대로 V2에 이식하지 않는다.
4. 모든 non-perimeter behavior는 assumption과 제거 조건을 가진다.
5. `WorkContract`는 절차 목록보다 goal + gradeable rubric/evidence + budget을 우선한다.
6. actor와 grader/verifier context를 분리한다.
7. capability는 model/version 문자열이 아니라 adapter probe와 fixture로 판정한다.
8. shared mutable write는 직렬화한다.
9. 자동 평가자는 versioning·human calibration·drift 감사를 받는다.
10. push/deploy/destructive/prod와 최종 taste 권위는 사람에게 남긴다.

## 7. 실험으로 남기는 가설

- Sol/Fable급 엔진에서 continuous session이 fresh reset보다 verified outcome/hour를 높이는가?
- 절차 프롬프트를 얼마나 제거해야 품질이 오르고, 어느 지점부터 규율이 무너지는가?
- `LESSONS.md` 파일 메모리가 반복 실패를 줄이는가, 오래된 조언으로 drift를 만드는가?
- post-planning/post-test-writing critic이 post-commit critic보다 비용 대비 결함 예방 효과가 높은가?
- rubric iterate→grade→revise가 첫 reject 후 새 iteration보다 효율적인가?
- 동시 subagent 3을 넘겼을 때 claim/worktree/oracle 비용을 상쇄하는 wall-clock 이득이 있는가?
- explicit caching/persisted reasoning/Task Budget 같은 vendor primitive가 portable controller의 어떤
  scaffold를 안전하게 삭제할 수 있는가?

한 실험에서 한 축만 바꾼다. 두 대표 run이 안전·복구·cost per verified outcome을 악화시키면 해당
기능을 제거한다. safety baseline을 낮추어 실험을 살리지 않는다.

## 8. P0 산출물의 최종 형태

첫 구현 단계는 controller 코드가 아니라 다음 네 산출물이다.

### 8.1 V1 behavior/fixture/assumption matrix

```text
behavior | owner today | fixture/evidence | assumes engine cannot X | perimeter/scaffold
         | keep/ablate/probe | removal condition
```

### 8.2 세 run 기준선

- autonomous useful time;
- intervention/human minutes;
- false STOP와 no-progress;
- recovery와 dirty-leftover;
- token/cost per verified outcome;
- actor/critic/grader별 비용;
- 현재 harness LOC와 활성 assumption 수.

### 8.3 스키마 4종

- `WorkContract`;
- mission/event lifecycle;
- engine capability profile;
- `EvidenceBundle` + verifier result.

### 8.4 source-of-truth 결정 자료

- plugin runner와 MythOS vendored runner의 behavior diff;
- MythOS 전용 verifier hook 목록;
- compatibility Make target 목록;
- rollback 경로와 fixture coverage.

이 네 가지가 reviewable해지기 전에는 `RunController` 구현 언어와 파일 이동을 확정하지 않는다.

## 9. 통합 지표

- **Autonomous useful time**
- **Cost per verified outcome**
- **Human minutes per release**
- **Intervention rate by cause**
- **False accept / false stop**
- **Recovery yield / dirty-leftover rate**
- **Repeated reliability (`pass^k`)**
- **Verifier-human calibration and margin drift**
- **Harness LOC / active assumption count**
- **Scaffold retired per engine upgrade**
- **Memory hit/stale-memory rate**
- **Parallel efficiency after coordination overhead**

단순 token 절감, 긴 run 시간, commit 수, subagent 수는 단독 성공 지표가 아니다.

## 10. 최종 우선순위

1. **P0 기준선 + SoT + assumption matrix**
2. **WorkContract/event/capability/evidence schema**
3. **VerifierRegistry 우선 추출** — combat/route oracle, gate, browser, narrative judge
4. **RunController reconciliation 최소 구현**
5. **Sol/Fable capability-aware continuation + lean prompt + lesson memory 실험**
6. **graduated oversight로 Neo-Seoul HITL 6/8/2 전환**
7. **bounded multi-agent와 entropy gardener**

최종적으로 더 오래 도는 AI 자동화는 “한 모델을 오래 켜두는 기술”이 아니다.

> **복구 가능한 mission, 측정 가능한 evidence, 삭제 가능한 scaffold, 학습하는 verifier, 그리고
> 예외만 보는 사람을 하나의 루프로 묶는 기술이다.**

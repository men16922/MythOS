# Claude Fable 5 시점의 하네스·자율화 연구 정리 — Anthropic 관점

작성: 2026-07-18 · 성격: Anthropic의 최신 연구/제품 발표를 MythOS 운영 하네스에 번역한 기술 레퍼런스.
짝 문서: [`2026-07-18-sol-harness-long-loop-hitl.md`](2026-07-18-sol-harness-long-loop-hitl.md) (GPT-5.6 Sol / OpenAI 관점).
목적: 두 관점을 비교하고, 현재 AI 코딩 에이전트에서 가능한 최대 자율화/자동화의 설계 원칙을 뽑는다.

## 결론

Anthropic 관점의 핵심 명제는 Sol 문서와 방향이 다르다. OpenAI가 "외부 orchestrator가 상태기계를
소유하라"고 말할 때, Anthropic은 **"하네스의 모든 구성요소는 '모델이 스스로 못 하는 것'에 대한
가정을 인코딩한다 — 모델이 좋아질 때마다 그 가정을 재검사하고 하네스를 다이어트하라"**고 말한다.
MythOS에 대한 번역은 네 가지다.

1. 921줄 `run.sh`의 각 책임에 **"어떤 모델 결함을 가정하는가"**를 태깅한다. 가정이 낡은 조각은
   V2에서 이식하지 않고 삭제한다 (planner-generator-evaluator 사례: Opus 4.6에서 sprint 분해와
   강제 reset이 통째로 불필요해짐).
2. 자율성의 상한은 프롬프트가 아니라 **환경 설계**가 정한다. C 컴파일러 실험에서 인간의 유일한
   역할은 테스트·피드백 포맷·진행 추적을 설계하는 것이었고, 그 위에서 16개 에이전트가 2주간
   무인으로 돌았다. MythOS의 verifier adapter 투자가 정확히 이 자리다.
3. 완료 판정은 **rubric을 계약으로** 만든다. 사람이 rubric을 한 번 쓰면 independent grader가
   iterate→grade→revise 루프를 대신 돈다 (Managed Agents Outcomes의 `user.define_outcome` 형태).
   사람은 rubric 작성과 최종 taste 판정으로 물러난다.
4. 강한 모델에는 **메모리 표면 + lean prompt + 자율운영 리마인더**가 스캐폴딩보다 효과적이다.
   Fable 5는 파일 메모리로 성능이 Opus 4.8 대비 3배 더 개선됐고, 과잉 처방된 프롬프트/스킬은
   오히려 출력 품질을 떨어뜨린다.

## 1. Fable 5가 실제로 바꾼 전제

- **일 단위 자율 실행**: 하네스(Claude Code/Managed Agents) 안에서 며칠 단위로 계획→위임→자가검증을
  지속. Stripe는 5천만 줄 Ruby 마이그레이션을 1일에 수행("두 달치 팀 작업"). 작업이 길고 복잡할수록
  이전 모델 대비 격차가 커진다 — 즉 **기존 워크로드가 아니라 그 위 난이도에서 평가해야 한다**.
- **최소 하네스 원칙의 실증**: 이전 모델이 복잡한 helper 하네스를 요구했던 vision 게임 과제를
  minimal vision-only 하네스로 통과. 하네스 복잡도는 모델 세대마다 줄어야 정상이라는 증거.
- **파일 메모리의 레버리지**: 장기 과제에서 자기 노트를 다시 읽으며 개선; 메모리 제공 시 성능
  향상이 Opus 4.8의 3배. 공식 가이드도 "lesson 파일 표면을 주고, 형식을 지정하고, 다음 세션에서
  참조하게 하라"를 명시.
- **프롬프트 방향**: 이전 모델용 step-by-step 스캐폴딩은 **제거**가 기본 (de-prescribe → A/B).
  대신 ①자율운영 리마인더("사용자가 실시간으로 없다; 되돌릴 수 있는 행동은 묻지 말고 진행; 턴
  종료 전 마지막 문단이 계획/약속이면 지금 실행") ②**근거 기반 진행 보고**("보고 전 각 주장을
  이번 세션의 tool result와 대조; 미검증이면 미검증이라 말하라" — 조작된 상태 보고를 거의 제거)
  ③장기 세션 가독성 지시. 이는 OpenAI의 lean-prompt 권고와 **수렴**한다.
- **안전은 모델 측 분류기 + 폴백**: cyber/bio 요청은 분류기가 거절(`stop_reason: refusal`)하고
  Opus 4.8로 자동 폴백(세션의 <5%). 하네스가 아니라 API 계층이 안전 외곽 일부를 흡수한다.
- **비용/제어 레버**: `effort`(low~max)가 지능·지연·비용의 1차 제어이고, **Task Budgets**(베타)는
  에이전트 루프 전체에 토큰 상한을 모델이 인지하는 형태로 준다 — MythOS의 iteration budget과
  같은 발상이 API 원시요소로 내려온 것.

## 2. Anthropic 연구·사례의 공통점

| 연구/사례 | 관찰 | MythOS 번역 |
| --- | --- | --- |
| Effective harnesses (2025-11) | initializer + `claude-progress.txt` + git이 세션 간 연속성의 최소 골격 | `/sync`·checkpoint·원자 커밋은 이미 동형 — 유지 |
| Planner-Generator-Evaluator (2026-03) | self-eval은 "자신 있게 칭찬"으로 실패; few-shot으로 회의적으로 튜닝한 **독립 evaluator**만 유효. Opus 4.5는 context anxiety로 강제 reset 필요 → 4.6은 continuous session+compaction으로 단순화 | actor/verifier 분리 유지 + **capability-aware reset/continue** (V2 P2의 근거) |
| 같은 연구의 핵심 교훈 | "하네스의 모든 구성요소는 모델 결함에 대한 가정" — 구성요소를 하나씩 제거해 load-bearing 여부를 측정 | P0 인벤토리에 **assumption 컬럼** 추가: 각 run.sh 책임이 가정하는 모델 결함 명시 |
| C 컴파일러 16-agent (2026) | git 기반 task-claim 락, GCC를 oracle로 쓴 차등 테스트, 무한 루프 러너, 2주/2천 세션/$20k → 10만 줄 컴파일러. 인간 역할 = 환경(테스트·피드백 포맷·진행 추적) 설계뿐 | task-claim은 Model-B worktree 레인과 동형; **oracle 차등 검증**(정답 엔진과 비교)은 combat 시뮬/route 결정론 검증에 직접 이식 가능 |
| Code with Claude 2026 | "병목은 지능이 아니라 인프라" — Managed Agents(샌드박스·체크포인트·자격증명 스코핑), **Outcomes**(rubric grader 루프), auto-mode의 파괴적 행동/주입 분류기, Rubber-Duck critic(계획 후·구현 후·테스트 작성 후), routines/워크트리 | 파괴적 행동 분류기 ≈ MythOS 권한 분류기(이미 있음); Outcomes = WorkContract의 제품화 선례; critic 삽입 지점 3개는 러너 critic 훅 위치의 참고값 |
| Demystifying evals | rubric은 영구 권위가 아니라 calibration 대상; 사람 라벨 bank와 drift 감사 | `scripts/eval/` 골든 뱅크가 이미 이 모양 — Anthropic 관점에서 MythOS의 **자산** (gap 아님) |

## 3. OpenAI vs Anthropic 관점 비교

두 진영은 서로 반대 방향에서 출발해 같은 지점에 수렴한다.

| 축 | OpenAI (Sol 문서) | Anthropic (이 문서) | 수렴점 |
| --- | --- | --- | --- |
| 병목 진단 | 생성→검증·조정·인간 주의력으로 이동 | 지능→인프라(샌드박스·체크포인트·자격증명)로 이동 | 병목은 더 이상 모델이 아니다 |
| 제어 소유권 | **외부 상태기계**가 lease·stall·retry·budget 소유 (Symphony) | **모델+플랫폼 원시요소**가 흡수 (compaction, 메모리, Task Budget, Outcomes grader) — 하네스는 얇게 | 얇은 외곽 + 강한 actor. MythOS V2의 "plugin SoT + repo verifier adapter"와 일치 |
| 하네스 수명관 | 하네스는 영구 필요; 모델 업그레이드는 actor prompt 단순화 근거 | 하네스는 **부채**; 모델 세대마다 구성요소 단위로 재검사·삭제 | 안전·증거 외곽은 유지, 보정 스캐폴딩은 다이어트 |
| 검증 | trace→evals, adversarial verifier, SpecBench류 reward-hacking 검사 | 독립 evaluator의 제품화(Outcomes rubric grader, Rubber-Duck critic), oracle 차등 테스트 | self-eval 불신 + 독립 평가자 + 증거 계약 |
| HITL 축소 | 감독 tier(자동/표본감사/인간)를 위험·확신도로 라우팅 | **rubric을 계약으로**: 사람은 rubric을 쓰고, grader가 max_iterations까지 대신 돈다; 파괴적 행동만 분류기가 차단 | 사람은 "산출물 승인자"에서 "환경·rubric 설계자 + taste 최종심"으로 이동 |
| 멀티에이전트 | 보수적: 기본 동시성 3, 공유 mutable state 부적합 | 공격적: 16-agent 컴파일러, agent teams, coordinator/threads — 단 **git/파일시스템을 조정 기질**로 사용 | 공유 쓰기는 직렬화/락, 탐색·검증은 병렬 |
| 인간의 durable 역할 | 고위험·저확신·분포 밖 판정 | 환경 설계(테스트·피드백·진행 추적)와 rubric 작성 | 판정 대상을 줄이고, 판정 기준을 자산화 |

**최대 자율화 레시피 (양 관점 합성)**: 무한 루프 러너 + task-claim(락) + oracle/결정론 테스트 +
독립 grader(rubric 계약) + 파일 메모리 + 파괴적 행동 분류기 + 근거 기반 진행 보고. 이 위에서
사람이 하는 일은 ①환경과 rubric 설계 ②taste·불가역 결정 ③grader drift 보정 라벨링 — 세 가지뿐이다.

## 4. MythOS 적용안 (Harness V2 플랜에의 주입)

V2 플랜(P0~P5)의 골격은 유지하되, Anthropic 관점이 바꾸는 것:

- **P0 인벤토리에 assumption 컬럼**: 각 run.sh 책임을 `behavior | fixture | 가정하는 모델 결함 |
  Fable-5급에서 여전히 유효?`로 기록. "유효하지 않음"은 V2 이식 대상에서 제외 — 하네스 다이어트를
  P0 산출물에 내장한다.
- **WorkContract ≈ Outcome**: 계약 스키마를 `user.define_outcome` 모양(goal + gradeable rubric +
  max_iterations)에 정렬. NEXT_PLAN `[auto]` 컴파일 시 "체크 가능한 rubric 없으면 자동화 거부"는
  이미 플랜에 있음 — rubric의 grader를 `scripts/eval/narrative_judge.py` 계열로 등록하면
  iterate→grade→revise 루프가 P3 없이도 부분 가동된다.
- **oracle 차등 검증 이식**: 결정론 combat 엔진/route DAG가 곧 GCC-oracle의 자리다. "같은 seed,
  기대 상태와 diff" 검증을 verifier adapter 1호로 — 이미 있는 시뮬 테스트의 재분류라 비용이 낮다.
- **러너 actor prompt에 즉시 추가 (저비용, P1 이전에 가능)**: ①근거 기반 진행 보고 지시
  ②자율운영 리마인더(턴 종료 전 마지막 문단 검사) ③lesson 파일 표면(`scripts/overnight/LESSONS.md`
  한 파일, 형식 지정) — 셋 다 프롬프트/파일 추가만으로 되고 V1 안전 동작을 건드리지 않는다.
- **P2(장기 세션 파일럿)의 판정 기준 보강**: planner-generator-evaluator의 실측 — 강한 모델은
  continuous session+compaction이 reset보다 단순하고 성능도 낫다 — 이 P2 가설의 직접 근거.
  파일럿 비교축에 "제거 가능해진 스캐폴딩 줄 수"를 추가한다 (하네스 LOC를 부채 지표로).
- **P5(멀티에이전트) 상한 재검토**: OpenAI 권고(동시성 3)와 Anthropic 실증(16 병렬)의 차이는
  **조정 기질의 유무**다. MythOS는 git worktree 락이 이미 있으므로, 공유 쓰기 직렬화가 보장되는
  레인에 한해 3 초과 병렬을 실험할 근거가 있다. 단 시작은 플랜대로 3에서.
- **바꾸지 않는 것**: 안전 외곽(권한 분류기, auto-push 금지, 오너 taste 권위), 증거 번들,
  external re-gate. Anthropic 관점에서도 이것은 "보정 스캐폴딩"이 아니라 "안전·증거 외곽"이라
  다이어트 대상이 아니다.

## 5. 평가 지표 (Sol 문서 지표에 추가)

- **Harness LOC / 가정 수**: 모델 업그레이드마다 삭제한 스캐폴딩 줄 수·폐기된 가정 수. 줄어들지
  않으면 하네스가 부채로 자라고 있다는 신호.
- **Rubric-grader 합치율**: 골든 뱅크 사람 라벨 대비 grader 판정 일치·margin drift (기존 지표와 동일).
- **Memory hit rate**: lesson 파일이 실제로 다음 세션의 행동을 바꾼 빈도 (참조 로그로 측정).
- 나머지(autonomous useful time, intervention rate, false accept/stop, cost per verified outcome,
  human minutes)는 Sol 문서 §5와 공유 — 두 관점이 같은 지표로 측정된다는 것 자체가 수렴의 증거.

## Sources

- [Anthropic — Claude Fable 5 and Claude Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5)
- [Anthropic — Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)
- [Anthropic — Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Anthropic — How Claude Code is used in practice](https://www.anthropic.com/research/claude-code-expertise)
- [InfoQ — Code with Claude 2026: Managed Agents, capability curve](https://www.infoq.com/news/2026/05/code-with-claude/)
- [Claude Platform Docs — Introducing Claude Fable 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5)
- Claude Platform Docs — Managed Agents: Outcomes (`user.define_outcome`), Memory Stores, Scheduled Deployments, Multi-agent

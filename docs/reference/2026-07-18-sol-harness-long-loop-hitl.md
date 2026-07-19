# GPT-5.6 Sol 시점의 하네스·장기 루프·HITL 연구 정리

작성: 2026-07-18 · 성격: 최신 외부 연구를 MythOS 운영 하네스에 번역한 기술 레퍼런스
짝 문서: [`2026-07-18-fable-harness-anthropic-view.md`](2026-07-18-fable-harness-anthropic-view.md) (Claude Fable 5 / Anthropic 관점 + 양 관점 비교)

## 결론

`GPT-5.6 Sol`처럼 더 오래 일하고 도구·서브에이전트를 잘 쓰는 모델이 나와도 하네스의 필요성은
줄지 않는다. 병목이 **생성**에서 **검증·조정·사람의 주의력**으로 이동한다. MythOS가 다음에
강화할 것은 더 긴 프롬프트나 더 많은 병렬 에이전트가 아니라 다음 네 가지다.

1. Markdown 태그를 실행 직전에 **검증 가능한 작업 계약**으로 컴파일한다.
2. 한 작업 안에서는 여러 턴을 이어가되, 외부 상태기계가 lease·stall·retry·budget·checkpoint를 소유한다.
3. 테스트 하나가 아니라 상태·브라우저·트레이스·독립 평가자를 묶은 **증거 계약**으로 완료를 판정한다.
4. 사람은 모든 산출물을 승인하지 않고, 고위험·저확신·평가자 불일치·분포 밖 사례만 본다.

## 1. 5.6 Sol이 실제로 바꾼 전제

- OpenAI는 Sol을 장기 전문 워크플로와 코딩의 flagship tier로 두고, Responses API에
  Programmatic Tool Calling, persisted reasoning, explicit caching, multi-agent beta를 추가했다.
  다만 multi-agent는 공유 mutable state나 순차 의존 작업에는 맞지 않고, 기본 동시성 3을 권장한다.
- 공식 prompting guidance는 더 강한 모델일수록 **반복 지시를 줄인 lean prompt**, 명확한 성공 조건,
  승인 경계, 현재 작업 layer, 실제 검증을 권한다. 즉 모델 업그레이드는 runner의 안전·증거 외곽을
  없애는 근거가 아니라, 내부 actor prompt를 단순화하는 근거다.
- OpenAI의 agent-first 사례는 단일 Codex run이 6시간 이상 일할 수 있음을 보였지만, 동시에 인간 QA가
  병목이 되었고 UI·로그·메트릭을 에이전트가 직접 읽게 만든 뒤에야 그 병목이 줄었다.
- Symphony는 성공/실패만 기록하지 않는다. preparing/running/succeeded/failed/timed-out/stalled 같은
  상태, claim, reconciliation, continuation, exponential backoff를 외부 orchestrator가 소유한다.

따라서 MythOS는 고정된 “매 회차 새 프로세스”와 “한 세션이 끝났으니 작업도 끝”을 분리해야 한다.
한 mission은 여러 agent turn/session을 가질 수 있고, 완료 여부는 tracker state와 evidence contract가 정한다.

## 2. 최신 장기 실행 연구의 공통점

| 연구/사례 | 관찰 | MythOS 번역 |
| --- | --- | --- |
| Anthropic long-running harness (2025-11) | initializer + feature 단위 coding + git/progress artifact가 context 간 연속성을 만든다 | 기존 `/sync`·checkpoint·원자 커밋은 유지 |
| Anthropic planner-generator-evaluator (2026-03) | self-eval은 낙관적이며 독립 evaluator가 더 잘 교정된다 | actor와 verifier를 분리하고 evaluator feedback을 다음 sprint 입력으로 사용 |
| 같은 연구의 context 비교 | 약한 모델은 reset이 필요했지만 강한 모델은 continuous session+compaction이 더 단순했다 | 무조건 reset이 아니라 capability-aware reset/continue 정책 |
| OpenAI harness engineering (2026-02) | app/log/metric legibility와 반복 entropy scan이 인간 QA/정리 병목을 줄였다 | browser evidence + OTel query + recurring gardener를 하나의 evidence pipeline으로 통합 |
| OpenAI Symphony (2026-05) | issue claim, retry queue, stall detection, reconciliation이 지속 실행의 핵심 | `STOP/DONE` 두 파일을 mission state machine으로 확장 |
| Verification Horizon (2026-06) | verifier는 인간 의도의 proxy이며 generator가 강해질수록 같이 진화해야 한다 | 고정 rubric을 영구 권위로 보지 말고 human calibration bank와 drift audit 운영 |
| SpecBench (2026-05) | 긴 작업에서 테스트 통과를 최적화하며 실제 spec을 어기는 reward hacking이 발생한다 | 테스트 축소·우회·mock-only 성공을 adversarial verifier가 별도 검사 |

## 3. HITL을 없애지 않고 줄이는 방법

사람 병목 감소의 단위는 “manual 체크박스를 auto로 이름 변경”하는 것이 아니다. 각 검수를 다음으로
분해한다.

```text
객관 상태 검사 → 실제 브라우저/런타임 재생 → 독립 rubric 평가 → 평가자 불일치/저확신 탐지
  → low-risk auto-accept 또는 표본 감사 → 고위험/저확신만 human decision
```

감독 tier는 작업 종류가 아니라 **고객 근접성 · 되돌릴 수 있음 · 데이터/비밀 · 운영 환경 · 평가자
확신도**로 정한다.

| Tier | 판정 | 예 |
| --- | --- | --- |
| A — automated | 결정론 gate + 증거 계약 통과 시 계속 | 리팩터, invariant, 정적 UI wiring, 로그/문서 위생 |
| B — monitored | 자동 평가 후 10~20% 표본 감사, drift 시 표본률 상승 | 브라우저 UX, 이미지 일관성, 서사 연결, 반복 playtest |
| C — human decision | 사람 판정 없이는 승급하지 않음 | irreversible/prod 권한, 제품 방향, 결말 감정, 밸런스 임계값 변경 |

사람의 과거 판정도 버리지 않는다. 승인/거절, 두 후보 중 선택, 수정 요청, “둔함/예민함” 같은 verdict를
pairwise preference와 rubric label로 eval bank에 저장한다. 평가자는 이 bank에 대해 주기적으로
calibration하며, 사람은 **불확실성이 큰 사례를 우선 라벨링**한다.

## 4. 현재 Neo-Seoul 16개 수동 체크의 자동화 가능성

| 묶음 | 현재 | 목표 |
| --- | --- | --- |
| 도착률·합류·컷신 1회·선택지 도착·용어 주석 | 사람이 직접 확인 | 상태/DB/브라우저 assertion으로 auto-close |
| 다인 파티 밸런스 | 몇 판 체감 | 다중 seed combat simulation + 분포 임계값, 이상치만 사람 |
| 지도 drag·scroll | 손가락 체감 | touch replay + scroll position/long-task trace + 영상, 실패/경계값만 사람 |
| 두 스타일 분기·서사 연결 | 두 full loop | persona agent loop + state divergence + narrative judge; 사람은 낮은 margin만 비교 |
| 얼굴/그림체 일관성 | 3~4턴 육안 | identity reference 기반 multimodal pairwise judge + 표본 감사 |
| pace·시장·전환·성장 | full run | simulated user + turn/latency/state metrics + rubric, 이상 구간 clip만 사람 |
| 엔딩 납득·기억 장면·총평 | 사람의 경험 | 사람 권위 유지; 자동 평가는 prefilter/비교 자료만 제공 |

초기 목표는 **16개 전수 수동 → 6개 auto-close + 8개 agent-prefilter/표본 감사 + 2개 human-authority**다.
시간 기준으로는 현재 여러 루프에 걸친 약 90~150분 검수를 **30~60분**으로 줄이는 1차 가설
(약 50~70% 감소)이다. 이 수치는 약속이 아니라 측정 목표다. false-accept, false-stop, human minutes,
재검률을 3회 release bundle에서 측정한 뒤 조정한다.

## 5. 평가 지표

- **Autonomous useful time**: 사람 개입 없이 verified progress가 이어진 시간.
- **Intervention rate**: mission 10개당 사람 호출 수와 원인.
- **False accept / false stop**: 사람이 뒤집은 자동 PASS / 자동 STOP 비율.
- **Recovery yield**: crash/stall 후 같은 mission을 사람 없이 복구한 비율.
- **Cost per verified outcome**: token/cost가 아니라 evidence contract를 통과한 결과당 비용.
- **pass@k / pass^k**: 탐색·후보 생성은 pass@k, 반복 신뢰성이 필요한 release path는 pass^k.
- **Judge calibration**: 인간 label과 evaluator 점수의 일치·불일치·margin drift.
- **Human minutes per release**: 최종 병목 지표.

## Sources

- [OpenAI — GPT-5.6](https://openai.com/index/gpt-5-6/)
- [OpenAI API — Using GPT-5.6](https://developers.openai.com/api/docs/guides/model-guidance?model=gpt-5.6)
- [OpenAI API — Multi-agent](https://developers.openai.com/api/docs/guides/responses-multi-agent)
- [OpenAI — Harness engineering](https://openai.com/index/harness-engineering/)
- [OpenAI — Running Codex safely](https://openai.com/index/running-codex-safely/)
- [OpenAI — Symphony orchestration spec](https://openai.com/index/open-source-codex-orchestration-symphony/)
- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [The Verification Horizon](https://arxiv.org/abs/2606.26300)
- [SpecBench](https://arxiv.org/abs/2605.21384)
- [Governed AI-Assisted Engineering](https://arxiv.org/abs/2606.22484)

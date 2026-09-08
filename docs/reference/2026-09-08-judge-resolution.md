# LLM-judge 해상도 측정 (P4-2) — 2026-09-08

서빙 리서치 플랜 P4(`docs/plans/2026-08-30-mythos-as-serving-research-workload.md`)와 NEXT_PLAN §3의 "judge 분산 ~1점" 문제에 대한 첫 실측. 질문은 하나다 — **같은 입력을 같은 judge가 다시 채점하면 몇 점이 움직이는가.** 그 값보다 작은 차이는 실험 결과가 아니라 judge다.

## 방법

- **judge 고정(P4-1)**: `scripts/eval/narrative_judge.py`가 `claude -p --model <pin>`으로 부른다. 핀은 `EVAL_JUDGE_MODEL`(Makefile에서 `OVERNIGHT_CRITIC_MODEL`을 따름, 기본 `claude-fable-5-1`). 이전엔 맨 `claude -p`라 CLI 기본 모델을 따라 표류했고 provenance에도 모델이 없었다. 이제 `provenance.json`에 `judge_model`·argv·`judge_version`·루브릭 SHA-256이 남는다.
- **표본**: `SPLIT.json`의 development 분할 2개(`local-evidence-safety` 62장면, `local-people-help` 60장면). promotion 뱅크는 승격 판정 외에는 채점하지 않는다는 규칙 그대로 손대지 않았다.
- **N = 5**, 연속 실행(23:15–23:24, 각 실행 약 1분 45초). judge 버전 `2.1.263`, 루브릭 `eb9a46d8…`. 집계는 `scripts/eval/judge_resolution.py`(순수 함수 `aggregate`, `tests/test_narrative_eval.py`가 고정). 원본 `outputs/evals/20260908-2317*..2323*`, 보고서 `outputs/evals/resolution-20260908-232355/`(둘 다 로컬 전용, gitignore).

## 결과

| 표본 | 축 | 중앙값 | 평균 | 표준편차 | 범위(max−min) |
|---|---|---|---|---|---|
| evidence-safety | register | 3 | 2.8 | **0.84** | **2** (2→4) |
| evidence-safety | naming | 3 | 3.2 | 0.45 | 1 |
| evidence-safety | **overall** | 1 | 1.4 | **0.55** | **1** |
| evidence-safety | continuity / repetition / choices | 1 / 1 / 2 | — | 0 | 0 |
| people-help | 모든 축 + overall | 1 / 2 / 1 / 2 / 1 · 1 | — | **0** | **0** |

- **선언: 이 루브릭의 단일 실행 해상도는 overall 기준 1점, 축 기준 최대 2점(`register`)이다.** 같은 judge·같은 루브릭·같은 바이트에서 그렇다.
- 2026-08-13의 "7월 3/5 → 8월 2/5" 이동은 judge 표류가 아니어도 나올 수 있는 크기였다. 핀은 *원인을 귀속 가능하게* 만들 뿐 노이즈를 없애지 않는다.
- 한 표본은 5회 모두 완전 동일했다. 즉 분산은 표본·축에 따라 0에서 2점까지 갈리고, "judge가 ±1점"이라는 한 줄로 요약할 수 없다 — 비교마다 그 표본의 N회 분포를 봐야 한다.

## 한계 (읽는 쪽이 과대해석하지 않도록)

- **바닥 효과**: development 표본은 1–2/5의 낮은 점수라 아래로 움직일 여지가 없다. 승격 뱅크(2–3/5)의 분산은 이보다 **클 수 있다**. 여기 값은 **하한**이다.
- N=5, 표본 2개, 한 judge 버전. 승격 뱅크의 해상도는 승격 판정 시점에 같은 방법으로 따로 재야 한다(뱅크 규칙상 지금 재지 않았다).
- 실행 간 간격이 짧아(연속) 모델 측 시간 표류는 포함되지 않는다.

## 오너 결정으로 남는 것 (P4-3, NEXT_PLAN §3과 같은 항목)

1. **중앙값 집계**: 승격·실험 비교는 단일 실행이 아니라 같은 N의 중앙값으로 하고, 해상도 미만 차이는 "구분 불가"로 보고한다 — 권고.
2. 승격 뱅크에 대해 위 측정을 1회 수행할지(뱅크 채점 = 승격 결정 규칙과 충돌하므로 오너 승인 필요).
3. 또는 숫자 게이트를 내리고 오너 감 판정만 남길지.

측정 재현: `for i in 1 2 3 4 5; do .venv/bin/python scripts/eval/narrative_judge.py; done` → `.venv/bin/python scripts/eval/judge_resolution.py outputs/evals/<5개 dir>`.

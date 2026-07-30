# Narrative Eval Rubric (LLM-judge)

골든 루프 트랜스크립트를 채점하는 서사 루브릭. `narrative_judge.py`가 이 파일 전문을 judge
프롬프트에 주입한다 — **축 튜닝은 이 파일에서만** (코드는 축 이름에 의존하지 않고 verdict JSON을
그대로 리포트에 접는다). 배경: `docs/reference/2026-07-17-anthropic-openai-agent-stacks.md` §3-1.

## Eval split와 승격 규칙

- `SPLIT.json`의 `development` 표본만 기본 `make eval-narrative`에서 채점합니다.
- `promotion` 표본은 파일 해시로 고정하며 prompt/directive 반복에 사용하지 않습니다. 2026-07-28
  기준점 점수는 split 고정 전에 공개됐으므로 블라인드 결과가 아닙니다.
- 승격 판정 때만 `make eval-narrative-promotion EVAL_PROMOTION_METRICS=<json>`을 사용합니다.
  JSON의 `samples`는 promotion 표본 이름과 정확히 같아야 하며 각 항목에 숫자
  `cost_per_loop_usd`, `repetition_compliance`와 `length_compliance`(`pass`/`fail`)가 필요합니다.
  리포트는 이 지표를 루브릭 점수와 함께 출력합니다.

## 채점 축 (각 1-5, 5가 최고)

- **continuity (연속성)**: 직전 장면·선택의 결과가 다음 장면에 이어지는가. 방금 한 일을 잊은 듯한
  턴, 끊긴 참조, 위치/시간 순간이동이 있으면 감점.
- **register (레지스터)**: 일반 장면은 물리적·스크린플레이형 액션 라인인가. 추상 개념어 남발은
  감점 — 단, 의도적으로 난해한 장면(데이터 코어 내부, IX 대면)의 추상 텍스처는 정상.
- **repetition (반복)**: 같은 표현/문형/추상구가 장면을 넘어 재등장하는가. 조사·어미 반복 포함.
- **naming (정합)**: 고유명사 표기(정세린/세린, 린위에, 카이 RX-09, 관리자 IX), 등장 전 인물 이름
  선출현 금지, 발명된 시스템 명사(복지 점수류) 부재, 세린 반말 화법 유지.
- **choices (선택지 품질)**: 2-3개, 서로 다른 의도, 즉시 이해되는 구체 행동문(12~32자), 전문용어 없음.

## Judge 출력 계약 (STRICT)

judge는 아래 형태의 **raw JSON 객체 하나만** 출력한다 (마크다운 펜스/부연 금지):

```json
{
  "scores": {"continuity": 4, "register": 3, "repetition": 5, "naming": 5, "choices": 4},
  "overall": 4,
  "issues": [
    {"turn": 3, "axis": "register", "quote": "문제가 된 짧은 인용", "note": "무엇이 왜 문제인지 한 줄"}
  ],
  "one_line": "이 루프 서사 품질 한 줄 총평"
}
```

- `issues`는 감점 근거가 된 곳만, 턴 번호와 함께. 없으면 빈 배열.
- 확신이 없으면 낮은 쪽이 아니라 **3(중립)** 을 주고 issues에 불확실성을 적는다.

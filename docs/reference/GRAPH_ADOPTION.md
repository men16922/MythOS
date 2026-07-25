# 1.2.0 채택 가이드 — 작업 repo 관점

plugin을 1.1.0 → 1.2.0으로 올린 **작업 repo**에서 무엇이 좋아지고, 무엇을 추가로 해야 하는지.

- 연구 근거: [`reference/2026-07-25-graph-engineering-after-loop-engineering.md`](../reference/2026-07-25-graph-engineering-after-loop-engineering.md) §7
- 변경 목록: [`CHANGELOG.md`](../CHANGELOG.md) 1.2.0 · 동작 상세: [`USAGE.md`](USAGE.md) · engine: [`ENGINES.md`](ENGINES.md)
- 남은 실험: [`docs/v2/STATUS.md`](v2/STATUS.md)

> **이 문서는 배포되지 않는다.** 플러그인 payload는 `plugins/overnight-harness/`뿐이므로
> (`docs/ARCHITECTURE.md` → Repository Layout) root `docs/`는 작업 repo에 설치되지 않는다. 이 문서는
> `/plugin marketplace update`를 실행하는 **운영자가 GitHub에서 한 번 읽는** 릴리스 가이드다.
>
> 작업 repo가 설치받아 계속 참조하는 것은 다음이며, 이 문서의 개념은 거기에 이미 반영돼 있다:
> `docs/engineering/VERIFICATION_ENGINEERING.md` §2·§4(keep/repair/revert, 진단 보존) ·
> `docs/engineering/AGENTIC_ENGINEERING.md` §3(리뷰어 독립성 3축) ·
> `scripts/overnight/lib/verify.sh` 헤더(verifier exit code 규약) ·
> `scripts/overnight/run.sh` 환경변수 주석 · `scripts/overnight/CRITIC_PROMPT.example.md`.
>
> 이 문서만 한국어다. 다른 `docs/*.md`는 영문 + `docs/ko/` 번역 구조를 따른다.

---

## 0. 한 줄 요약

1.2.0은 밤샘 루프의 reject 경로에 **되돌아가는 화살표**를 추가한다. 지금까지 거부된 커밋은
revert되고 iteration이 소모됐으며, **리뷰어의 진단은 버려졌다**. 이제 그 진단을 actor에게 돌려주고
bounded 수정 기회를 준다.

**업그레이드만 해도 깨지는 것은 없다. 대신 아무것도 안 하면 좋아지는 것도 없다** — 신규 기능은
전부 opt-in이다.

---

## 1. 업그레이드

runner는 repo에 vendoring되지 않고 plugin에서 실행되므로, plugin만 올리면 된다.

```bash
/plugin marketplace update overnight-harness      # Claude
```

Makefile snippet이 설치된 최고 버전을 자동 해석한다(`harness-locate.sh`). 확인:

```bash
# 어떤 plugin 경로가 해석됐는지
"$(bash <plugin>/bin/harness-locate.sh)"/.claude-plugin/plugin.json   # "version": "1.2.0"

# 실제로 1.2.0 runner가 돌았는지 (한 번 돌린 뒤)
grep -o '"adapter_version":"[^"]*"' scripts/overnight/logs/events.jsonl | tail -1   # 1.2.0
```

`.claude/harness-config.json`에 `harness_root`를 **핀으로 박아 뒀다면** 그 경로가 계속 이깁니다 —
자동 업데이트가 안 되니 지우거나 새 경로로 갱신하세요.

### 업그레이드 직후 상태 (아무 설정도 안 한 경우)

동작은 1.1.0과 **동일**하다. `OVERNIGHT_REPAIR=0`, `OVERNIGHT_CRITIC_ENGINE` 미설정이 기본값이다.
단 세 가지 버그 수정은 자동으로 적용된다:

| 수정 | 이전 증상 |
| --- | --- |
| `revert_commit` 범위 인식 | 한 iteration이 여러 커밋을 남긴 경우 `HEAD`만 revert돼 나머지가 브랜치에 남았다 |
| verifier reason 잘림 | 여러 단어 reason이 원장(`events.jsonl`)에 **첫 단어만** 기록됐다 |
| `verifier-reject` terminal | typed terminal이 `rejected_by_verifier`가 아니라 일반 `failed`로 떨어졌다 |

---

## 2. 단계별 활성화 — 비용 순

### 1단계: semantic 층을 실제로 켠다 (환경변수 2개, 비용 최소)

이건 1.2.0 기능이 아니고 **이미 있었지만 기본값이 꺼져 있던** 것이다. 여기부터 시작해야 repair
edge가 의미를 갖는다(critic이 꺼져 있으면 repairable reject가 gate RED 하나뿐).

```bash
OVERNIGHT_CRITIC=auto OVERNIGHT_OVERSIGHT=graduated make overnight
```

- `auto` = LLM 없는 위험 휴리스틱이 트립할 때만 critic 실행 → test 파일 삭제/축소,
  `noqa`/`eslint-disable`/`pytest.mark.skip` 추가, 민감·생성 파일 변경, scope 초과에만 과금.
- `graduated` = 위험한데 critic이 안 돈 커밋을 `logs/REVIEW_QUEUE.md`에 적재 → 아침에 그 줄만 본다.

**개선:** green gate가 못 잡는 실패(테스트 무력화, 죽은 코드로 마스킹, scope creep)가 걸러진다.
아침 검수가 "전체 훑어보기" → "REVIEW_QUEUE 몇 줄".

### 2단계: 리뷰어를 다른 engine으로 (1줄, 자기채점 해소)

```bash
OVERNIGHT_ENGINE=claude OVERNIGHT_CRITIC_ENGINE=codex OVERNIGHT_CRITIC=auto make overnight
```

전제: 그 CLI가 `PATH`에 있고, 경계 파일이 있는 engine이면 그것도 있어야 한다
(claude → `scripts/overnight/overnight-settings.json`, opencode → `scripts/overnight/opencode.json`).
**없으면 preflight에서 FATAL** — actor를 붙이기 전에 죽는다. actor engine으로 몰래 되돌아가지
않는다(그러면 없애려던 자기채점이 조용히 복구되므로).

**개선:** 지금까지 코드를 쓴 engine이 자기 코드를 검사했다. 역할은 분리됐지만(read-only) CLI·도구
표면·벤더 편향을 공유했다 — 자기가 구조적으로 놓치는 것은 검사할 때도 놓친다. 이걸 닫는다.
막는 실패는 밤샘에서 **가장 비싼 것**, 즉 나쁜 커밋의 통과(false accept)다. revert는 손해가
iteration 하나지만, 통과한 나쁜 커밋 위에는 밤새 다른 커밋이 쌓인다.

**부수 효과:** 두 engine의 판정이 갈리는 비율 자체가 정보다(벤더 편향 or 진짜 결함). 원장에서
`review.completed`의 `verdict`를 세면 된다.

### 3단계: repair edge (핵심 기능, 비용 = actor 호출 1회 추가)

```bash
OVERNIGHT_REPAIR=1 OVERNIGHT_CRITIC=auto make overnight
```

**이전:** 새벽 2시 — actor가 커밋 → gate 초록 → critic이 "테스트를 지워서 통과시켰다" FAIL →
revert, 실패 카운트 +1 → 다음 iteration이 **같은 항목을 진단 없이 처음부터** → 3회면
`MAX_CONSEC_FAIL` 소진, 커밋 0개로 밤샘 종료.

**이후:** reject 증거(gate 로그 tail / critic reason / verifier reason)를 actor에게 돌려주고
**1회** 수정 기회 → 전체 검증 체인 재실행 → 통과하면 accept.

무엇이 repair 대상인지는 **typed reject edge**가 정한다:

| reject | edge | 이유 |
| --- | --- | --- |
| 외부 gate RED (phantom-success) | **repair** | 기계적이고 구체적인 실패 출력 |
| critic `REPAIR` (regression, masking) | **repair** | 결함을 명시한 정직한 버그 |
| critic `FAIL` (테스트 무력화, scope creep) | **revert** | gate를 속인 actor에게 재시도를 주면 리뷰어를 속이는 법을 배운다 |
| critic `INCONCLUSIVE` | **revert** | 돌려줄 구체적 내용이 없다 (fail-closed) |
| verifier `exit 4` | **repair** | repo가 "구체적이고 scope 안"이라고 표시 |
| verifier fail / `exit 2` | **revert** | 기존 fail-closed 동작 그대로 |
| verifier `exit 3` | **human** | 커밋 보존 + REVIEW_QUEUE + run 종료 |

**유지되는 perimeter:** 수정된 커밋에도 외부 gate 재실행 · critic/verifier 재실행 · 실패한 repair는
미수정 reject와 똑같이 revert · **커밋 없이 dirty tree만 남기면 수정 없음으로 처리**(harness는
절대 자동 커밋하지 않음) · 최종 거부 시 그 iteration이 만든 **모든** 커밋 revert · 시도는 최대 3회.

**비용:** repair가 붙은 iteration은 actor 호출이 2번이므로 대략 2배. `OVERNIGHT_REPAIR_TIMEOUT`으로
시도당 상한을 따로 줄 수 있다(기본은 `ITER_TIMEOUT`과 동일 → 최악의 경우 iteration 벽시계가 2배).
`MAX_ITER`가 시간 예산이라면 낮추는 것을 고려하세요.

---

## 3. 작업 repo가 추가로 해야 할 일

### 3.1 필수에 가까움 — `.gitignore` 확인

```
scripts/overnight/logs/
scripts/overnight/CLAIM
scripts/overnight/DONE
scripts/overnight/STOP
```

repair edge는 "actor가 dirty tree를 남겼는가"를 판정 기준으로 쓴다. runner 자신의 로그/claim이
추적되고 있으면 그 판정이 오염된다.

### 3.2 `CRITIC_PROMPT.md`를 override했다면 갱신

repo에 `scripts/overnight/CRITIC_PROMPT.md`가 **있으면** plugin 기본 프롬프트를 완전히 대체하므로
`REPAIR` 판정을 절대 내지 않는다 → critic reject는 전부 revert(=1.1.0 동작). 안전하지만 기능의
절반을 못 쓴다.

`plugins/.../CRITIC_PROMPT.example.md`의 "Which rejection verdict to use" 절과 3값 출력 형식을
자기 프롬프트에 옮기세요. 없으면(기본) plugin 프롬프트를 쓰므로 자동 적용된다.

### 3.3 repo verifier에 `exit 4` 도입

지금 `verifiers.d/*.sh`가 `exit 1`로 거부하는 것 중 **객체적으로 고칠 수 있는 결함**을 `exit 4`로
바꾼다. 첫 stdout 줄이 actor에게 그대로 전달되므로 **reason이 곧 수정 지시서**다.

```bash
#!/usr/bin/env bash
# scripts/overnight/verifiers.d/api-contract.sh   (chmod +x)
range="$1"
# 환경: OVERNIGHT_CONTRACT_FILE OVERNIGHT_MISSION_ID OVERNIGHT_ENGINE_NAME OVERNIGHT_LOG_DIR
if ! python3 tools/check_openapi.py > "$OVERNIGHT_LOG_DIR/api-$$.txt" 2>&1; then
  echo "openapi.yaml이 핸들러와 불일치: $(head -1 "$OVERNIGHT_LOG_DIR/api-$$.txt"); evidence=$OVERNIGHT_LOG_DIR/api-$$.txt"
  exit 4                      # 구체적 + scope 안 → repair 대상
fi
if git diff --name-only "$range" | grep -q '^src/billing/'; then
  echo "billing 경로 변경 — 사람 판단 필요"
  exit 3                      # 커밋 보존, REVIEW_QUEUE, run 종료
fi
exit 0
```

기준: **`exit 4`는 "이걸 고쳐라"를 한 줄로 쓸 수 있을 때만.** 계약 위반(scope creep, 테스트 무력화)은
`exit 1`로 남긴다 — 같은 actor에게 되돌리는 것이 잘못된 대응인 부류다.
reason에 `; evidence=<경로>`를 붙이면 그 파일이 sha256과 함께 evidence bundle에 박힌다.

### 3.4 held-out task bank — repair edge를 켤 거면 **선행 조건**

repair edge의 고유 실패 모드는 **actor가 결함을 고치는 대신 리뷰어를 달래는 법을 배우는 것**이다.
증상은 "완료 커밋 수가 오르는데 품질은 내려감"이고, **완료 수만 보면 탐지 불가능**하다.

- 프롬프트/effort/contract 튜닝에 **절대 쓰지 않는** task bank를 따로 두고, 기본값 승격 직전에만 돌린다.
- 지표를 짝으로 보고한다: 완료/시간은 **반드시** false-accept와, 비용 절감은 **반드시**
  dirty-leftover rate와 함께.

이 harness 자체의 P3 A/B가 지금 튜닝과 판정에 같은 3-item bank를 쓰고 있고(`docs/v2/BASELINE.md`),
그래서 이 항목이 미해결로 남아 있다(연구 문서 §7 G4).

### 3.5 계약을 쓴다면 `budgets.revisions`

`OVERNIGHT_CONTRACT=1`이면 내장 컴파일러가 `OVERNIGHT_REPAIR` 값을 `budgets.revisions`로 넣는다.
**외부 컴파일러(`OVERNIGHT_CONTRACT_COMPILER`)를 쓴다면** 직접 넣어야 한다 — 없으면
`OVERNIGHT_REPAIR`로 폴백한다. 항목별로 다르게 줄 수 있다(위험한 항목은 `0`, 기계적 항목은 `1`).
스키마 상한은 3.

---

## 4. 관측 — 아침에 무엇을 보는가

```bash
make overnight-status                      # lane 트리 (critic✓/✗, tok, $)
cat scripts/overnight/logs/REVIEW_QUEUE.md # 사람이 볼 것만

# repair edge가 실제로 돌았는지
grep -o '"type":"x-harness.repair_[a-z]*"' scripts/overnight/logs/events.jsonl | sort | uniq -c
# 어떤 site에서 몇 번, 결과는
grep 'x-harness.repair_' scripts/overnight/logs/events.jsonl | python3 -m json.tool --json-lines 2>/dev/null || \
  grep 'x-harness.repair_' scripts/overnight/logs/events.jsonl
```

| 이벤트 | 의미 |
| --- | --- |
| `x-harness.repair_attempted` | `site`(gate/critic/verifier), `attempt_no`, `budget`, `reason` |
| `x-harness.repair_result` | `recommitted`(재검증 진행) · `dirty`(커밋 없음 → 거부) · `no_change`(변화 없음 → 거부) |
| `x-harness.repair_closed` | `attempts`, `outcome`: `repaired` or `rejected` |

증거 파일: `logs/repair-<iter>-<n>.log`(수정 시도 출력), `logs/gate-<iter>-r<n>.log`,
`logs/critic-<iter>-r<n>.log`. accept된 커밋의 evidence bundle은 **실제로 초록이 된** gate 실행을
가리킨다.

**측정할 것 (짝으로)**

| 지표 | 기대 방향 | 짝지을 것 |
| --- | --- | --- |
| 밤당 verified 커밋 수 | ↑ | false accept (평평해야 함) |
| `consec-fail` 조기 종료 | ↓ | dirty-leftover rate |
| 토큰/비용 per verified commit | 소폭 ↑ 허용 | 완료 수 대비 |
| critic 판정 불일치율 (2단계) | — | 불일치가 진짜 결함인 비율 |

---

## 5. 롤백

전부 환경변수라 코드 되돌림이 필요 없다.

```bash
OVERNIGHT_REPAIR=0                # repair edge만 끈다
unset OVERNIGHT_CRITIC_ENGINE     # 같은 engine critic으로 복귀
OVERNIGHT_CRITIC=0                # semantic 층 전체 끄기
```

세 개를 모두 되돌리면 1.1.0 동작(+ §1의 버그 수정 3건)이다. gate·revert·permission boundary·budget·
claim·typed terminal·evidence는 perimeter이므로 롤백 대상이 아니다.

---

## 6. 아직 안 된 것 — 기대하면 안 되는 것

| 항목 | 상태 |
| --- | --- |
| **repair edge의 실효성** | **미측정.** 27개 offline 검사로 *메커니즘*은 검증됐지만, 실제로 완료 수를 올리고 false-accept를 안 올리는지는 실제 밤샘 A/B가 필요하다. 그래서 기본값이 `0`이다 |
| **cross-engine critic의 실효성** | **미측정.** 판정 불일치율 데이터 없음 |
| held-out bank (§3.4) | 미착수 — 위 두 측정의 선행 조건 |
| 병렬 lane / fan-out | **비채택.** multi-worktree scheduler는 V2 명시적 non-goal이고, graph 담론 쪽 증거도 토큰 15배·fan-in 병목 경고로 기울어 있다. 기존 subagent 예산(`OVERNIGHT_SUBAGENTS`, 상한 3)의 P6 wall-clock 측정이 선행 |
| mission 내부 sub-step checkpoint | **비채택.** "1 iteration = 1 commit"이 crash 경계를 이미 주고 있고 더 쪼개면 그 불변식과 충돌한다. repair edge가 같은 통증을 훨씬 싸게 해결 |
| graph 프레임워크(LangGraph 등) / graph DSL | **비채택.** no-build·low-dependency 설치 계약을 깬다. mission lifecycle은 이미 graph이고 edge는 `run.sh` 제어 흐름이다 |

---

## 7. 권장 순서

1. **오늘** — plugin 업데이트 + `.gitignore` 확인(§3.1). 설정 변경 없이 정상 동작 확인.
2. **1박** — `OVERNIGHT_CRITIC=auto OVERNIGHT_OVERSIGHT=graduated`. 아침에 REVIEW_QUEUE 확인.
3. **그 다음** — `OVERNIGHT_CRITIC_ENGINE` (두 번째 CLI가 있다면).
4. **repair edge 전에** — held-out bank 구성(§3.4) + repo verifier `exit 4` 분류(§3.3).
5. **그 다음** — `OVERNIGHT_REPAIR=1`, 짝 지표로 2박 비교. 악화되면 `0`으로 되돌린다.

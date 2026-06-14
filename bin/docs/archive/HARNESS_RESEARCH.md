# Workrepo Harness Engineering 적용 정리

## 1. 한 줄 정의

`workrepo`의 Harness Engineering은 AI 에이전트가 코드를 마음대로 생성하게 두는 것이 아니라, 저장소 안에 지식, 제약, 검증, 상태 기록, 리뷰 루프를 심어서 에이전트가 안전하게 반복 실행되도록 만드는 개발 운영 체계다.

핵심 문장으로 정리하면 다음과 같다.

> Humans steer. Agents execute.
> 사람은 방향과 경계를 정하고, 에이전트는 그 안에서 구현, 검증, 수정, 기록을 반복한다.

`workrepo`에서 목표로 해야 할 것은 단순한 “Claude/Codex 사용”이 아니라 다음 구조다.

```text
요구사항 정의
  → 에이전트가 읽기 쉬운 저장소 구조
  → 명시적 제약
  → 자동 검증 게이트
  → 독립 리뷰 에이전트
  → 상태 기록
  → 반복 실행 루프
  → 엔트로피 정리
```

---

## 2. workrepo에 적용할 최종 목표 구조

초기 목표는 L1-L2 수준이다.

```text
L0: Ad-hoc
- 그냥 Claude/Codex에게 명령
- 매번 사람이 승인
- 규칙과 상태가 대화창에만 존재

L1: Basic Harness
- CLAUDE.md / AGENTS.md
- 기본 lint/test gate
- git worktree 또는 branch 격리
- 작업 계획 문서화

L2: Automated Feedback
- gate script
- Codex read-only review
- Claude가 리뷰 반영
- 실패 시 2~3회 자동 재시도
- 작업 결과 report/checkpoint 저장

L3: Multi-Agent
- coder / reviewer / gardener 역할 분리
- 위험도 기반 승인
- 병렬 worktree 실행
- 정기 entropy scan

L4: Self-Evolving
- 실패 trace 분석
- harness 자체 개선 PR 생성
- 예외 상황에서만 인간 개입
```

`workrepo`는 당장 L2까지 가는 것이 현실적이다.
즉, “작업 1개를 Claude가 구현하고, Codex가 읽기 전용 리뷰하고, Claude가 수정하고, 테스트 통과 후 checkpoint를 남기는 구조”를 만든다.

---

## 3. 적용 원칙

## 3.1 Repository as Single Source of Truth

Slack, 구두 설명, ChatGPT 대화, 임시 메모는 에이전트에게 안정적인 지식이 아니다.

따라서 모든 중요한 규칙은 저장소에 들어가야 한다.

```text
나쁜 방식:
- "전에 말했듯이..."
- "이건 우리 팀 관례야"
- "이 파일은 건드리면 안 돼"

좋은 방식:
- docs/ARCHITECTURE.md
- docs/CODING_STANDARDS.md
- docs/HARNESS.md
- docs/NEXT_PLAN.md
- .ai/features.json
- .ai/progress.md
```

에이전트가 다음 세션에서 다시 시작해도 같은 판단을 하게 만들려면, 지식은 대화가 아니라 repo에 있어야 한다.

---

## 3.2 Agent Legibility First

에이전트가 repo를 쉽게 읽을 수 있어야 한다.

사람에게 익숙한 구조가 아니라, 에이전트가 빠르게 방향을 잡을 수 있는 구조가 필요하다.

```text
원칙:
- 진입점은 작게
- 핵심 문서는 짧게
- 상세 문서는 링크로 분리
- 명령어는 명확하게
- 금지 사항은 테스트나 스크립트로 강제
```

`CLAUDE.md`는 300줄짜리 매뉴얼이 아니라 100줄 이하의 지도 역할을 해야 한다.

---

## 3.3 Constraints Create Speed

제약이 많으면 느려지는 것이 아니라, AI 에이전트 환경에서는 오히려 빨라진다.

이유는 다음과 같다.

```text
제약 없음:
- 에이전트가 자유롭게 추측
- 엉뚱한 파일 수정
- 아키텍처 드리프트
- 리뷰 비용 증가

제약 있음:
- 수정 가능한 영역 명확
- 테스트 기준 명확
- 실패 원인 명확
- 자동 수정 가능
```

따라서 workrepo에는 “하지 말아야 할 것”을 반드시 명시해야 한다.

---

## 3.4 Deterministic + Probabilistic Hybrid

에이전트 검증은 두 종류로 나눠야 한다.

```text
결정론적 검증:
- lint
- type check
- unit test
- architecture test
- forbidden pattern scan
- secret scan

확률론적 검증:
- Codex review
- Claude self-review
- security reasoning review
- architecture drift review
```

L1-L3에서는 결정론적 검증을 우선하고, L4부터 LLM 리뷰를 붙인다.

---

## 3.5 Progressive Deletability

하네스는 영구히 복잡해야 하는 것이 아니다.

모델 성능이 좋아지거나 repo의 테스트 체계가 강해지면 일부 규칙은 제거되어야 한다.

각 규칙에는 제거 조건을 남긴다.

```text
예시:
- 이 규칙은 3개월 동안 위반이 없으면 제거 후보로 본다.
- 이 gate는 CI에서 동일하게 검증되면 local hook에서 제거한다.
- 이 문서는 자동 생성 문서로 대체되면 삭제한다.
```

---

## 4. workrepo 권장 디렉터리 구조

```text
workrepo/
  CLAUDE.md
  AGENTS.md

  docs/
    HARNESS.md
    ARCHITECTURE.md
    CODING_STANDARDS.md
    NEXT_PLAN.md
    RUNBOOK.md

    design-docs/
      ADR-0001-example.md

    exec-plans/
      0001-example-plan.md

  .ai/
    features.json
    progress.md
    events.jsonl

    reviews/
      codex-review-latest.md

    reports/
      final-report-latest.md

    traces/
      trace-latest.jsonl

  .claude/
    settings.json

    hooks/
      pretooluse.ps1
      stop.ps1

    skills/
      codex-review/
        SKILL.md
        scripts/
          codex_review.ps1

      gardener/
        SKILL.md
        scripts/
          scan_entropy.ps1

  scripts/
    gates/
      gate-l1.ps1
      gate-l2.ps1
      gate-l3.ps1
      gate-all.ps1

    harness/
      loop-once.ps1
      checkpoint.ps1
      acquire-task.ps1
      release-task.ps1

  current_tasks/

  tests/
    architecture/
      dependency-rules.test.*
```

Windows 기준이라면 실제 root는 다음처럼 잡으면 된다.

```powershell
C:\AI-LAB\workspace\workrepo
```

---

## 5. Knowledge Pyramid 적용

문서 구조는 L0-L3로 나눈다.

```text
L0: 세션 시작 시 무조건 읽는 문서
- CLAUDE.md
- AGENTS.md

L1: 필요할 때 바로 참조하는 핵심 문서
- docs/HARNESS.md
- docs/ARCHITECTURE.md
- docs/CODING_STANDARDS.md
- docs/NEXT_PLAN.md

L2: 작업별 상세 문서
- docs/design-docs/
- docs/exec-plans/
- .ai/features.json

L3: 생성 문서 / 참조 문서 / 대용량 문서
- .ai/reports/
- .ai/reviews/
- .ai/traces/
- generated/
- references/
```

핵심은 `CLAUDE.md`가 모든 내용을 품지 않는 것이다.
`CLAUDE.md`는 지도이고, 상세 내용은 링크로 이동한다.

---

## 6. CLAUDE.md 권장 초안

````markdown
# CLAUDE.md

## 1. Role

You are the coding agent for this repository.

Your job is to implement one small task at a time, verify it, document the result, and leave the repository in a mergeable state.

## 2. Operating Principle

Humans steer. Agents execute.

Do not guess hidden requirements.
Do not expand scope without recording it.
Do not leave the repo in a broken state.

## 3. Read Order

Before starting work, read these files in order:

1. docs/HARNESS.md
2. docs/ARCHITECTURE.md
3. docs/CODING_STANDARDS.md
4. docs/NEXT_PLAN.md
5. .ai/features.json
6. .ai/progress.md

## 4. Allowed Work

You may edit:

- src/**
- tests/**
- docs/**
- scripts/**
- .ai/progress.md
- .ai/events.jsonl
- .ai/reports/**

You must not edit without explicit instruction:

- secrets
- credentials
- production deployment files
- billing configuration
- IAM/admin policy files
- generated lock files unless required by dependency changes

## 5. Standard Workflow

1. Select one task from docs/NEXT_PLAN.md or .ai/features.json.
2. Write a short execution plan.
3. Implement the smallest useful change.
4. Run local gates.
5. Fix failures up to 3 iterations.
6. Run read-only review if code changed.
7. Apply critical review findings.
8. Write .ai/reports/final-report-latest.md.
9. Update .ai/progress.md.
10. Leave the repo clean and mergeable.

## 6. Gate Commands

Run these before finishing:

```powershell
.\scripts\gates\gate-l1.ps1
.\scripts\gates\gate-l2.ps1
.\scripts\gates\gate-l3.ps1
````

If a gate fails, fix the cause. Do not bypass the gate.

## 7. Error Handling

When blocked, write:

* what failed
* exact command
* exact error
* suspected cause
* safest next step

Save this to:

.ai/reports/final-report-latest.md

## 8. Completion Criteria

A task is complete only when:

* code is implemented
* tests or verification steps passed
* review findings are addressed or explicitly deferred
* progress is updated
* no unrelated files are modified

````

---

## 7. docs/HARNESS.md 권장 내용

```markdown
# Harness Engineering

## 1. Purpose

This repository uses a harness-based AI development workflow.

The harness exists to make AI coding agents reliable by controlling:

- environment
- constraints
- feedback loops
- state persistence
- review boundaries

## 2. Agent Roles

### Coder Agent

Primary implementation agent.

Responsibilities:

- understand the selected task
- modify code
- add or update tests
- run gates
- produce final report

### Reviewer Agent

Read-only evaluator.

Responsibilities:

- inspect git diff
- identify bugs, missing tests, security risks, and architecture drift
- never modify files
- produce markdown review

### Gardener Agent

Entropy management agent.

Responsibilities:

- detect stale docs
- detect unused files
- detect duplicated logic
- detect architecture drift
- propose cleanup PRs

## 3. Feedback Ladder

Repeated feedback must be encoded into stronger systems.

| Repeated Issue | Encoding Target |
|---|---|
| One-time comment | Review note |
| Repeated twice | Documentation |
| Repeated three times | Script, linter, or test |
| Safety critical | Hard gate |

## 4. Verification Layers

| Level | Trigger | Purpose |
|---|---|---|
| L1 | file change | syntax, file size, forbidden pattern |
| L2 | turn end | lint, formatting, architecture check |
| L3 | before completion | unit/integration tests |
| L4 | after L3 | Codex/LLM review |
| L5 | PR stage | full CI, E2E, human approval |

## 5. Autonomy Rule

The agent may act freely inside approved boundaries.

The agent must stop and report when:

- production credentials are required
- billing or IAM changes are needed
- destructive migration is involved
- user data deletion is involved
- tests fail after 3 fix attempts
- scope changed materially

## 6. Deletability

Every harness rule should eventually be removable.

A rule becomes a deletion candidate when:

- no violation occurs for 3 months
- an equivalent deterministic test exists
- CI enforces it more reliably
- the rule no longer reflects the architecture
````

---

## 8. .ai/features.json 구조

`features.json`은 에이전트가 처리할 수 있는 작업 목록이다.
마크다운보다 JSON이 좋은 이유는 구조가 고정되어 있고, 에이전트가 임의로 흐트러뜨리기 어렵기 때문이다.

```json
{
  "features": [
    {
      "id": "F-0001",
      "title": "Add health check endpoint",
      "status": "todo",
      "risk": "low",
      "scope": {
        "allowed_paths": [
          "src/**",
          "tests/**",
          "docs/**"
        ],
        "forbidden_paths": [
          ".env",
          "secrets/**",
          "infra/prod/**"
        ]
      },
      "requirements": [
        "Expose GET /health",
        "Return status 200",
        "Return JSON body with status field"
      ],
      "tests": [
        "tests/health-check.test.*"
      ],
      "verification_steps": [
        "Run gate-l1",
        "Run gate-l2",
        "Run gate-l3",
        "Verify /health returns 200"
      ],
      "passes": []
    }
  ]
}
```

규칙은 단순하다.

```text
에이전트가 수정 가능한 필드:
- status
- passes

에이전트가 함부로 바꾸면 안 되는 필드:
- requirements
- scope
- tests
- verification_steps
```

---

## 9. L1-L5 Gate 설계

## 9.1 L1 Gate

목적은 아주 빠른 실패 감지다.

검사 대상:

```text
- 금지 파일 수정 여부
- 너무 큰 파일 생성 여부
- secret pattern 포함 여부
- merge conflict marker 여부
- 기본 syntax 문제
```

예시 PowerShell:

```powershell
# scripts/gates/gate-l1.ps1

$ErrorActionPreference = "Stop"

Write-Host "[L1] Checking forbidden patterns..."

$changed = git diff --name-only

$forbiddenFiles = @(
  ".env",
  ".env.local",
  "secrets/",
  "credentials"
)

foreach ($file in $changed) {
  foreach ($pattern in $forbiddenFiles) {
    if ($file -like "*$pattern*") {
      throw "[L1] Forbidden file modified: $file"
    }
  }
}

$conflicts = git diff --check
if ($LASTEXITCODE -ne 0) {
  throw "[L1] Git diff check failed. Fix whitespace or conflict markers."
}

$secretPatterns = @(
  "AKIA[0-9A-Z]{16}",
  "aws_secret_access_key",
  "BEGIN PRIVATE KEY",
  "password\s*="
)

foreach ($pattern in $secretPatterns) {
  $result = git diff | Select-String -Pattern $pattern
  if ($result) {
    throw "[L1] Potential secret detected. Remove secret before continuing."
  }
}

Write-Host "[L1] Passed"
```

---

## 9.2 L2 Gate

목적은 repo 구조와 코드 스타일 검증이다.

검사 대상:

```text
- formatter
- linter
- type check
- architecture boundary
- dependency rule
```

예시:

```powershell
# scripts/gates/gate-l2.ps1

$ErrorActionPreference = "Stop"

Write-Host "[L2] Running repo-level checks..."

if (Test-Path "package.json") {
  npm run lint
  if ($LASTEXITCODE -ne 0) { throw "[L2] npm lint failed" }

  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw "[L2] npm typecheck failed" }
}

if (Test-Path "pom.xml") {
  mvn -q -DskipTests compile
  if ($LASTEXITCODE -ne 0) { throw "[L2] Maven compile failed" }
}

if (Test-Path "build.gradle" -or Test-Path "build.gradle.kts") {
  .\gradlew compileJava
  if ($LASTEXITCODE -ne 0) { throw "[L2] Gradle compile failed" }
}

Write-Host "[L2] Passed"
```

---

## 9.3 L3 Gate

목적은 기능 검증이다.

검사 대상:

```text
- unit test
- integration test
- contract test
- changed area test
```

예시:

```powershell
# scripts/gates/gate-l3.ps1

$ErrorActionPreference = "Stop"

Write-Host "[L3] Running tests..."

if (Test-Path "package.json") {
  npm test
  if ($LASTEXITCODE -ne 0) { throw "[L3] npm test failed" }
}

if (Test-Path "pom.xml") {
  mvn test
  if ($LASTEXITCODE -ne 0) { throw "[L3] Maven test failed" }
}

if (Test-Path "build.gradle" -or Test-Path "build.gradle.kts") {
  .\gradlew test
  if ($LASTEXITCODE -ne 0) { throw "[L3] Gradle test failed" }
}

Write-Host "[L3] Passed"
```

---

## 9.4 Gate 통합 스크립트

```powershell
# scripts/gates/gate-all.ps1

$ErrorActionPreference = "Stop"

.\scripts\gates\gate-l1.ps1
.\scripts\gates\gate-l2.ps1
.\scripts\gates\gate-l3.ps1

Write-Host "[GATE] All gates passed"
```

---

## 10. Two-Agent System 적용

`workrepo`에서는 생성자와 평가자를 분리한다.

```text
Claude
- coder
- implementer
- test fixer
- review 반영자

Codex
- read-only reviewer
- diff reviewer
- security/edge case reviewer
- missing test detector
```

중요한 점은 Codex가 코드를 고치면 안 된다는 것이다.
Codex는 오직 리뷰만 한다.

권장 흐름:

```text
1. Claude가 작업 구현
2. gate-l1/l2/l3 실행
3. Codex가 git diff read-only 리뷰
4. Claude가 Critical / Should Fix 항목 반영
5. gate 재실행
6. final-report 작성
```

---

## 11. Codex Review Skill 구조

```text
.claude/
  skills/
    codex-review/
      SKILL.md
      scripts/
        codex_review.ps1
```

`SKILL.md` 예시:

```markdown
# codex-review

## Purpose

Run Codex as a read-only reviewer for the current git diff.

## Rules

Codex must not modify files.
Codex must not create tests directly.
Codex must only report:

- bugs
- missing tests
- security risks
- edge cases
- architecture drift
- unclear requirements

## Output

Save review to:

.ai/reviews/codex-review-latest.md

## After Review

Claude must read the review and classify findings:

- Critical: must fix
- Should Fix: fix if safe
- Follow-up: document only
- Won't Fix: explain why
```

PowerShell 예시:

```powershell
# .claude/skills/codex-review/scripts/codex_review.ps1

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path ".ai/reviews" | Out-Null

$diffPath = ".ai/reviews/current-diff.patch"
$reviewPath = ".ai/reviews/codex-review-latest.md"

git diff > $diffPath

if ((Get-Item $diffPath).Length -eq 0) {
  "# Codex Review`n`nNo diff to review." | Out-File -Encoding utf8 $reviewPath
  exit 0
}

$prompt = @"
You are a read-only code reviewer.

Review the following git diff.

Do not suggest broad rewrites.
Do not modify files.
Focus on:
- correctness bugs
- missing tests
- security risks
- edge cases
- architecture drift

Return markdown with sections:
1. Critical
2. Should Fix
3. Tests Missing
4. Security
5. Architecture
6. Follow-up

Diff:
$(Get-Content $diffPath -Raw)
"@

$prompt | codex exec --read-only - > $reviewPath

Write-Host "[Codex Review] Saved to $reviewPath"
```

---

## 12. State Persistence 적용

에이전트 세션은 끊긴다.
따라서 상태는 대화창이 아니라 repo에 남겨야 한다.

권장 3중 상태 저장:

```text
1. Git history
- 실제 변경 이력

2. .ai/features.json
- 기능 상태
- 검증 passes

3. .ai/progress.md
- 자연어 진행 상황
- 다음 에이전트를 위한 인수인계
```

`.ai/progress.md` 예시:

```markdown
# AI Progress

## Current Status

No active task.

## Last Completed Task

- Task:
- Date:
- Summary:
- Files changed:
- Gates passed:
- Review result:

## Known Issues

None.

## Next Recommended Task

Read docs/NEXT_PLAN.md and select the next low-risk task.
```

`.ai/events.jsonl` 예시:

```jsonl
{"ts":"2026-06-14T20:00:00+09:00","type":"task.started","task_id":"F-0001","agent":"claude"}
{"ts":"2026-06-14T20:05:00+09:00","type":"gate.passed","level":"L1"}
{"ts":"2026-06-14T20:07:00+09:00","type":"gate.failed","level":"L2","reason":"typecheck failed"}
{"ts":"2026-06-14T20:15:00+09:00","type":"task.completed","task_id":"F-0001"}
```

---

## 13. Checkpoint 스크립트

`````powershell
# scripts/harness/checkpoint.ps1

param(
  [string]$TaskId = "unknown",
  [string]$Status = "checkpoint",
  [string]$Summary = ""
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path ".ai/reports" | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"

$event = @{
  ts = $timestamp
  type = "checkpoint"
  task_id = $TaskId
  status = $Status
  summary = $Summary
} | ConvertTo-Json -Compress

Add-Content -Path ".ai/events.jsonl" -Value $event

$report = @"
# Final Report

## Task

$TaskId

## Status

$Status

## Summary

$Summary

## Git Status

````text
$(git status --short)
`````

## Recent Diff

```text
$(git diff --stat)
```

"@

$report | Out-File -Encoding utf8 ".ai/reports/final-report-latest.md"

Write-Host "[Checkpoint] Saved"

````

---

## 14. Infinite Loop를 workrepo에 적용하는 방식

무작정 `while true`를 돌리면 위험하다.  
처음에는 `loop-once` 방식으로 시작한다.

```text
loop-once:
1. git pull
2. NEXT_PLAN에서 작업 하나 선택
3. Claude 실행
4. gate 실행
5. Codex review 실행
6. Claude가 review 반영
7. final report 생성
8. git status 확인
9. 사람이 commit 또는 agent commit
````

`loop-once.ps1` 예시:

```powershell
# scripts/harness/loop-once.ps1

$ErrorActionPreference = "Stop"

Write-Host "[Loop] Pull latest"
git pull

Write-Host "[Loop] Show next plan"
Get-Content "docs/NEXT_PLAN.md"

Write-Host "[Loop] Run gates before work"
.\scripts\gates\gate-l1.ps1

Write-Host "[Loop] Hand over to coding agent"
Write-Host "Run Claude Code now with CLAUDE.md instructions."

Write-Host "[Loop] After Claude finishes, run:"
Write-Host ".\scripts\gates\gate-all.ps1"
Write-Host ".\.claude\skills\codex-review\scripts\codex_review.ps1"
Write-Host ".\scripts\harness\checkpoint.ps1 -TaskId <TASK_ID> -Status completed -Summary <SUMMARY>"
```

처음부터 완전 자동화하지 않는다.
먼저 `loop-once`가 안정화되면 `overnight-loop`로 확장한다.

---

## 15. Boundary-Based Security 적용

권한은 매번 승인하는 방식이 아니라, 경계 기반으로 나눠야 한다.

```text
Tier 1: 항상 허용
- read
- grep
- glob
- git status
- git diff

Tier 2: repo 내부에서 허용
- src/** 수정
- tests/** 수정
- docs/** 수정
- scripts/** 수정

Tier 3: 조건부 승인
- bash 실행
- dependency 설치
- web fetch
- git push
- cloud command
- production config 변경
- secret 접근
```

Tier 3 작업은 반드시 plan을 먼저 쓰게 한다.

```text
Tier 3 실행 전 요구 형식:

1. 하려는 작업
2. 필요한 이유
3. 영향을 받는 파일/서비스
4. 실패 시 복구 방법
5. 실행 명령
```

---

## 16. Agent-Friendly Error Message 적용

에이전트가 고칠 수 없는 에러 메시지는 좋은 하네스가 아니다.

나쁜 에러:

```text
dependency violation
```

좋은 에러:

```text
ERROR: src/service/auth.ts imports src/ui/LoginPage.tsx

Service layer must not import UI layer.
Move UI-specific logic to src/ui, and keep auth logic in src/service.
Allowed direction: UI -> Service -> Repository.
```

`gate` 스크립트는 실패 시 반드시 다음을 포함해야 한다.

```text
- 무엇이 잘못됐는지
- 어느 파일이 문제인지
- 왜 금지되는지
- 어떻게 고쳐야 하는지
```

---

## 17. Entropy Management 적용

에이전트는 빠르게 코드를 만든다.
그만큼 문서 드리프트, 중복 코드, 아키텍처 드리프트도 빠르게 쌓인다.

따라서 `gardener` 역할이 필요하다.

Gardener Agent의 책임:

```text
- docs와 코드 불일치 확인
- TODO/FIXME 누적 확인
- 죽은 파일 확인
- 중복 함수 확인
- 사용하지 않는 export 확인
- gate 우회 흔적 확인
- 테스트 없는 변경 확인
- final report 누락 확인
```

`.claude/skills/gardener/SKILL.md` 예시:

```markdown
# gardener

## Purpose

Detect entropy in the repository and propose cleanup tasks.

## Do Not

Do not perform large refactors automatically.
Do not delete files without evidence.
Do not change production behavior.

## Check

- stale docs
- duplicated logic
- unused files
- missing tests
- architecture drift
- ignored failures
- skipped gates

## Output

Write report to:

.ai/reports/gardener-report-latest.md
```

---

## 18. Reasoning Sandwich 적용

모든 단계에 최고 추론 모델을 쓰면 비용과 시간이 낭비된다.

workrepo에서는 다음처럼 나눈다.

```text
계획:
- 높은 추론
- 범위 파악
- 위험 분석
- 파일 영향도 분석

구현:
- 보통 추론
- 빠르게 코드 수정
- 테스트 작성

검증:
- 높은 추론
- 실패 원인 분석
- 리뷰 반영
- edge case 점검
```

Claude/Codex 역할로 바꾸면 다음과 같다.

```text
Plan:
- Claude high reasoning

Build:
- Claude normal coding

Review:
- Codex read-only
- Claude high reasoning for fixes
```

---

## 19. workrepo AI-DLC 운영 흐름

## 19.1 Requirements

요구사항은 자연어 한 줄이 아니라 검증 가능한 구조로 작성한다.

나쁜 예:

```text
로그인 기능 구현
```

좋은 예:

```text
이메일/비밀번호 로그인 API를 구현한다.
성공 시 JWT를 발급한다.
실패 시 401을 반환한다.
비밀번호는 평문 저장하지 않는다.
테스트 파일은 tests/auth-login.test.*에 작성한다.
```

---

## 19.2 Harness Design

작업 전에 다음을 만든다.

```text
- CLAUDE.md
- docs/HARNESS.md
- docs/ARCHITECTURE.md
- docs/CODING_STANDARDS.md
- scripts/gates/*
- .ai/features.json
- .ai/progress.md
```

---

## 19.3 Agent Execution

에이전트 실행은 다음 원칙을 따른다.

```text
- 한 번에 작업 하나
- 파일 범위 제한
- 최대 3회 자동 수정
- 실패하면 report 작성
- 테스트 없이 완료 금지
- review 없이 큰 변경 완료 금지
```

---

## 19.4 Automated Verification

검증은 계층화한다.

```text
L1:
- 금지 파일
- secret
- conflict marker

L2:
- lint
- typecheck
- compile
- architecture rule

L3:
- unit test
- integration test

L4:
- Codex review
- security review

L5:
- CI
- E2E
- human approval
```

---

## 19.5 Continuous Entropy Management

매주 또는 큰 작업 후 gardener를 실행한다.

```text
권장 주기:
- 작은 개인 repo: 주 1회
- agent loop 실행 repo: 매일 1회
- overnight loop repo: 매 loop 종료 후 요약 scan
```

---

## 20. workrepo에 바로 적용하는 순서

## Phase 0. 현재 상태 평가

먼저 repo의 현재 상태를 확인한다.

```powershell
git status
git branch
git log --oneline -5
Get-ChildItem
```

확인할 것:

```text
- 테스트 명령이 있는가
- lint 명령이 있는가
- README가 최신인가
- 아키텍처 문서가 있는가
- agent instruction 파일이 있는가
- 금지 파일 규칙이 있는가
- 작업 backlog가 있는가
```

---

## Phase 1. 최소 하네스 생성

```powershell
mkdir docs
mkdir docs\design-docs
mkdir docs\exec-plans
mkdir .ai
mkdir .ai\reviews
mkdir .ai\reports
mkdir .ai\traces
mkdir scripts
mkdir scripts\gates
mkdir scripts\harness
mkdir .claude
mkdir .claude\skills
mkdir .claude\hooks
mkdir current_tasks
```

생성할 파일:

```text
CLAUDE.md
AGENTS.md
docs/HARNESS.md
docs/ARCHITECTURE.md
docs/CODING_STANDARDS.md
docs/NEXT_PLAN.md
.ai/features.json
.ai/progress.md
.ai/events.jsonl
```

---

## Phase 2. Gate 추가

```text
scripts/gates/gate-l1.ps1
scripts/gates/gate-l2.ps1
scripts/gates/gate-l3.ps1
scripts/gates/gate-all.ps1
```

처음에는 완벽한 gate가 아니어도 된다.
중요한 것은 모든 에이전트 작업이 같은 검증 명령을 통과하게 만드는 것이다.

---

## Phase 3. Codex Review 연결

```text
.claude/skills/codex-review/
  SKILL.md
  scripts/codex_review.ps1
```

규칙:

```text
- Codex는 read-only
- Claude가 수정 담당
- Critical은 반드시 반영
- Follow-up은 NEXT_PLAN에 기록
```

---

## Phase 4. loop-once 적용

처음부터 overnight loop를 돌리지 않는다.

먼저 수동 loop를 안정화한다.

```text
1. Claude에게 task 하나 부여
2. gate-all 실행
3. codex-review 실행
4. Claude에게 review 반영 지시
5. gate-all 재실행
6. checkpoint 저장
7. 사람이 commit
```

이 흐름이 5회 이상 안정적으로 성공하면 자동 loop를 고려한다.

---

## Phase 5. Gardener 추가

반복 실행 후에는 정리 agent가 필요하다.

```text
- .ai/reports/gardener-report-latest.md
- docs/NEXT_PLAN.md에 cleanup task 추가
- 중복, drift, stale docs 추적
```

---

## 21. OpenClaw / Claude / Codex 기준 역할 분리

현재 workrepo에 맞는 역할 분리는 다음이 가장 현실적이다.

```text
OpenClaw
- 외부 오케스트레이터
- Telegram/CLI에서 작업 지시
- loop 실행 트리거
- 결과 보고 수신

Claude
- 메인 구현 agent
- 계획 수립
- 코드 수정
- 테스트 수정
- Codex 리뷰 반영
- checkpoint 작성

Codex
- 독립 리뷰 agent
- read-only diff review
- missing test / bug / security / edge case 탐지

Playwright
- 브라우저/E2E 확인용 Hands
- 클릭/입력/스크린샷 자동화

Git
- 상태 저장
- 작업 단위 분리
- coordination primitive

Gardener
- 장기 엔트로피 관리
- 문서/코드 drift 탐지
```

---

## 22. workrepo 완료 기준

하네스 적용 1차 완료 기준은 다음이다.

```text
필수:
- CLAUDE.md 존재
- docs/HARNESS.md 존재
- docs/NEXT_PLAN.md 존재
- .ai/features.json 존재
- gate-all.ps1 존재
- codex-review skill 존재
- progress/report 기록 가능

권장:
- architecture test 존재
- gardener skill 존재
- current_tasks lock 구조 존재
- worktree 기반 병렬 실행 가능

나중:
- EKS session-per-pod
- Step Functions orchestration
- DynamoDB/S3 event log
- LangFuse trace
- full AI-DLC platform
```

---

## 23. 최종 결론

이 문서를 workrepo에 적용한다는 것은 “AI에게 좋은 프롬프트를 쓰는 것”이 아니다.

실제 적용의 핵심은 다음이다.

```text
1. repo를 에이전트가 읽기 쉽게 만든다.
2. 모든 규칙을 repo에 넣는다.
3. 작업 단위를 JSON/문서로 구조화한다.
4. L1-L3 deterministic gate를 만든다.
5. Codex 같은 독립 reviewer를 붙인다.
6. Claude가 review를 반영하게 한다.
7. progress, events, reports로 상태를 남긴다.
8. 반복되는 피드백은 문서가 아니라 test/linter/gate로 승격한다.
9. gardener로 엔트로피를 지속 관리한다.
10. 사람은 매 행동 승인이 아니라 방향, 경계, 예외만 관리한다.
```

따라서 workrepo의 목표 상태는 다음 문장으로 요약할 수 있다.

> workrepo는 AI가 코드를 생성하는 공간이 아니라, AI가 안전하게 작업하고 스스로 검증하며 실패를 기록하고 다시 개선할 수 있는 하네스가 내장된 실행 환경이어야 한다.

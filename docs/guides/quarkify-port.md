# Quarkify 적용 지침 (overnight-harness repo 포팅용)

> **이 문서는 에이전트(Claude Opus 4.8)를 향한 2인칭 작업 지시서다.**
> 다른 repo에 이 파일을 붙여넣고 "이 문서대로 Quarkify를 적용해줘"라고 요청하면,
> 에이전트는 **이 문서 하나만 읽고** 도구 설치 → config 작성 → Make 배선 → 정책 문서화 →
> 검증까지 스스로 수행할 수 있어야 한다. 스크립트 본문은 전량 임베드돼 있으므로
> (도구 clone 외) 외부 네트워크·원본 repo 의존이 없다.
>
> 출처: Project MythOS에서 측정·도입한 구성을 일반화한 것. 근거 데이터는 §1 참조.

---

## 0. 당신(에이전트)이 할 일 — 한눈에

이 repo에 **Quarkify 코드 토폴로지 인덱스**를 가져온다. Quarkify는 소스를 *심볼·관계 인덱스*
(폴더 토폴로지)로 분해해, "어느 파일·어느 심볼·어디서 호출"을 grep 루프 없이 결정론적으로 짚게 한다.

순서: **Step 0(감지) → 1~6(파일 생성/배선) → 7(정책 문서화, 조건부) → 8(검증)**.
중간에 **언어·경로를 이 repo에 맞게 채우는 자리(ADAPT 표기)** 가 있다 — 거기만 바꾸고 나머지는 verbatim.

> ⚠️ **먼저 읽어라 — 이건 "QUARKIFY-FIRST" 처방이 아니다.** §1의 measured-adoption을 읽고,
> 이 repo가 *대형 코드베이스*가 맞는지 가늠한 뒤 도입하라. 소형/희소 코드면 정책 문구만 남기고
> 일상 탐색은 grep 우선으로 결론 내도 된다(§4).

---

## 1. 무엇이며, 왜 조건부인가 (measured adoption)

**Quarkify = 심볼·관계 인덱스(목차)이지 코드 저장소가 아니다.** 소스(`src` 등)를 폴더 토폴로지로 분해한다:

- `quark/` — 심볼 계층(파일→클래스→함수→문). **리프는 빈 폴더이고, 위치는 전부 *폴더명*에 인코딩**된다
  (`file__<path>_<kind>__<symbol>` 형식). 즉 **라인 번호는 없다.**
- `_mirror/by_role/`, `_mirror/by_kind/`, `_mirror/by_file/` — 역할/종류/파일별 평면 뷰.
- `_axon/` — 의존·호출 링크(크로스레퍼런스).
- `ai_context_guide.txt` — 생성 끝에 기록되는 네비게이션 안내(신선도 마커로도 쓰임).

**핵심 정책: 이득은 측정으로만 정당화된다.** 레버는 쉘 latency가 아니라 *탐색 왕복 수 × 턴당 토큰*이다.
인덱스 명령 자체는 grep보다 느릴 수도 있다. MythOS 실측(10,072 LOC 패키지 기준):

| 검색어 히트 수 | 토큰 절감 | 판단 |
| --- | --- | --- |
| ≤ 15 (드문 리터럴) | 0 ~ **−5% (손해)** | grep이 더 쌈 — 쓰지 마라 |
| 30 ~ 90 | 55 ~ 79% | 인덱스 우선 |
| 200+ (흔한 심볼) | **80 ~ 92%** | 인덱스 강력 우선 |

> **절감 ∝ 검색어 히트 수 ∝ 코드 규모.** 따라서: **대형 패키지 + 고빈도 심볼(넓은 탐색)** 에서만 인덱스를
> 먼저 쓰고, **드문 리터럴·소형 파일**은 grep. 그리고 **권위는 항상 원본 파일** — 인덱스로 *위치*를 짚은 뒤
> 본문·정확한 라인 span은 원본을 read 한다(리프가 빈 폴더라 본문이 없다).
>
> 그래서 이 도구는 **선택적 가속기**다 — 절대 `make check`/CI 게이트에 넣지 않는다(부재 산출물을 필수
> 빌드의존으로 만들면 clone/CI가 깨진다).

---

## 2. 전제조건

- `git`, `bash`.
- **Node ≥ 22.12** (도구 엔진 `quarkify.mjs` 실행용). `node --version`으로 확인.
- **`npm install` 불필요** — 도구는 Node stdlib만 import하고, 선언된 유일 의존(puppeteer)은 core path에서
  미사용. clone + checkout만으로 동작.
- 대상 언어 무관(이 문서는 언어-agnostic). 단 §3에서 이 repo 언어에 맞춰 glob을 채운다.

---

## 3. 적용 절차

### Step 0 — 이 repo 감지 (ADAPT 값 수집)

다음 3가지를 먼저 확정한다(이후 단계에서 그대로 쓴다):

1. **repo 절대경로**: `pwd` 결과 (예: `/home/me/work/myrepo`). → config의 `srcDir`/`outDir`에 쓴다.
2. **소스 레이아웃·언어 → `sourceFiles` glob**: 이 repo의 실제 소스 위치/확장자를 보고 정한다.
   - Python: `['src/**/*.py']` (또는 `['<pkg>/**/*.py']`)
   - TS/JS: `['src/**/*.ts', 'src/**/*.tsx']`
   - Go: `['**/*.go']` / Ruby: `['lib/**/*.rb', 'app/**/*.rb']` 등 — **이 repo 구조를 직접 보고 결정.**
3. **소스 루트 디렉터리명**: 보통 `src`. 다르면(`lib`/`app`/`pkg` 등) 기록 — Step 4의 신선도 스크립트에 쓴다.
4. **도메인 역할 후보 → `guessRole` 초안**: 이 repo의 디렉터리/모듈명을 훑어 coarse 역할 버킷을 만든다
   (예: `api`/`persistence`/`domain`/`worker`…). MythOS 예시는 Step 3에 있으나 **그대로 복붙 금지**(도메인이 다름).

### Step 1 — `tools/quarkify/setup.sh` (verbatim)

아래를 **그대로** 생성한다(수정 불필요 — fork 안 하면 URL/PIN 동일). 실행권한 부여(`chmod +x`).

```bash
#!/usr/bin/env bash
#
# setup.sh — fetch the external Quarkify tool at a PINNED commit (idempotent).
# ----------------------------------------------------------------------------
# Quarkify (companyjupiter/quarkify, Apache-2.0) decomposes source into a quark
# folder topology. It is an EXTERNAL tool — it lives outside this repo so the
# repo stays clean. The engine (quarkify.mjs) imports only Node stdlib; its sole
# declared dependency (puppeteer) is unused by the core path, so NO `npm install`
# is needed — clone + checkout is enough.
#
# Home defaults to ~/tools/quarkify; override with $QUARKIFY_HOME.
#
# Usage:
#   bash tools/quarkify/setup.sh        # clone@PIN if missing, else verify PIN
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_URL="https://github.com/companyjupiter/quarkify.git"
PIN="cace87f5ea96333642d6198b6364ab38efd99ff9"
QUARKIFY_HOME="${QUARKIFY_HOME:-$HOME/tools/quarkify}"

if [ -d "$QUARKIFY_HOME/.git" ]; then
  cur="$(git -C "$QUARKIFY_HOME" rev-parse HEAD 2>/dev/null || echo none)"
  if [ "$cur" = "$PIN" ]; then
    echo "quarkify-setup: OK — already at pinned commit ($PIN) in $QUARKIFY_HOME"
    exit 0
  fi
  echo "quarkify-setup: existing clone at $cur, fetching + checking out pin $PIN…"
  git -C "$QUARKIFY_HOME" fetch --depth 1 origin "$PIN" 2>/dev/null || git -C "$QUARKIFY_HOME" fetch origin
  git -C "$QUARKIFY_HOME" checkout -q "$PIN"
else
  echo "quarkify-setup: cloning $REPO_URL → $QUARKIFY_HOME"
  mkdir -p "$(dirname "$QUARKIFY_HOME")"
  git clone -q "$REPO_URL" "$QUARKIFY_HOME"
  git -C "$QUARKIFY_HOME" checkout -q "$PIN"
fi

got="$(git -C "$QUARKIFY_HOME" rev-parse HEAD)"
[ "$got" = "$PIN" ] || { echo "FATAL: pin mismatch — wanted $PIN, got $got" >&2; exit 1; }
echo "quarkify-setup: ready at $QUARKIFY_HOME ($PIN) — no npm install required"
```

### Step 2 — `tools/quarkify/generate.sh` (verbatim)

그대로 생성(상대경로로 자기 위치를 해석하므로 수정 불필요). `chmod +x`.

```bash
#!/usr/bin/env bash
#
# generate.sh — (re)generate the whole-src quark topology into .quarkify/src/.
# ----------------------------------------------------------------------------
# Drives the external Quarkify tool against tools/quarkify/config.mjs.
# The output (.quarkify/) is a LOCAL BUILD ARTIFACT — gitignored, not committed.
# Re-run after pulling or changing code; it is fast (~seconds) and idempotent.
#
#   bash tools/quarkify/generate.sh        # or: make quarkify
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUARKIFY_HOME="${QUARKIFY_HOME:-$HOME/tools/quarkify}"
CONFIG="$REPO_ROOT/quarkify/config.mjs"

if [ ! -f "$QUARKIFY_HOME/quarkify.mjs" ]; then
  echo "quarkify: tool not found at $QUARKIFY_HOME" >&2
  echo "          run 'make quarkify-setup' first (clones the pinned tool)." >&2
  exit 1
fi
[ -f "$CONFIG" ] || { echo "quarkify: config missing: $CONFIG" >&2; exit 1; }

echo "quarkify: generating whole-src topology → .quarkify/src/ …"
node "$QUARKIFY_HOME/quarkify.mjs" "$CONFIG"
echo "quarkify: done. query with e.g.:"
echo "  find .quarkify/src/quark -type d -iname '*<symbol>*'"
echo "  ls   .quarkify/src/_mirror/by_role/"
```

> 참고: 여기서 `CONFIG="$REPO_ROOT/quarkify/config.mjs"`의 `$REPO_ROOT`는 스크립트 부모 디렉터리
> (`tools/`)다 → 실제로 `tools/quarkify/config.mjs`를 가리킨다. 의도된 동작이니 건드리지 마라.

### Step 3 — `tools/quarkify/config.mjs` (ADAPT — 이 repo에 맞게 채움)

아래 **템플릿**을 생성하되 `«…»` 부분을 Step 0 값으로 교체한다. ESM(`export default`) 형식.

```javascript
// Quarkify — whole-src config for «REPO_NAME».
// Decomposes the source tree into one quark topology under .quarkify/src/.
// One tree is enough: quark folder names embed the full path, so packages are
// self-namespaced and `_mirror/by_role/` aggregates roles across the codebase.
//
// Run (via Makefile): `make quarkify`  (calls tools/quarkify/generate.sh)
// Direct:  node "$QUARKIFY_HOME/quarkify.mjs" <abs path to this file>
export default {
  name: '«REPO_NAME»',                          // 예: 'myrepo-src'
  srcDir: '«ABS_REPO_ROOT»',                    // Step 0의 pwd, 예: '/home/me/work/myrepo'
  outDir: '«ABS_REPO_ROOT»/.quarkify/src',      // 위 + /.quarkify/src

  sourceFiles: [
    '«SRC_GLOB»',                               // Step 0, 예: 'src/**/*.ts' (여러 줄 가능)
  ],

  perfData: {},

  // Coarse role tags used by _mirror/by_role/. Order matters: first match wins.
  // 이 repo의 도메인에 맞게 작성한다(아래 MythOS 예시는 참고용 — 복붙 금지).
  guessRole(name) {
    const n = name.toLowerCase();
    // if (n.includes('cli')) return 'entrypoint';
    // if (n.includes('store') || n.includes('db')) return 'persistence';
    // if (n.includes('api') || n.includes('router')) return 'api';
    // if (n.includes('model') || n.includes('schema')) return 'domain';
    return 'core';
  },
};
```

**참고용 — MythOS의 실제 `guessRole`(도메인 특화 예시; 절대 그대로 쓰지 말 것):**

```javascript
  guessRole(name) {
    const n = name.toLowerCase();
    if (n.includes('cli')) return 'entrypoint';
    if (n.includes('session') || n.includes('service')) return 'orchestration';
    if (n.includes('store') || n.includes('postgres') || n.includes('persist')) return 'persistence';
    if (n.includes('director') || n.includes('parser') || n.includes('prompt') || n.includes('narrative')) return 'narrative_gen';
    if (n.includes('flux') || n.includes('generator') || n.includes('image') || n.includes('visual')) return 'image_gen';
    if (n.includes('combat') || n.includes('encounter') || n.includes('skill')) return 'combat';
    if (n.includes('route') || n.includes('map')) return 'routing';
    if (n.includes('valid')) return 'validation';
    if (n.includes('engine') || n.includes('loop')) return 'state_machine';
    if (n.includes('event')) return 'event_builder';
    if (n.includes('model') || n.includes('schema') || n.includes('ids') || n.includes('seed') || n.includes('clock')) return 'domain';
    if (n.includes('api') || n.includes('server') || n.includes('router')) return 'api';
    if (n.includes('observ') || n.includes('telemetry') || n.includes('log')) return 'observability';
    return 'runtime_core';
  },
```

### Step 4 — `harness/check-quarkify.sh` (ADAPT 2곳 — 비차단 신선도)

`harness/` 없으면 만든다. 아래를 생성하고 `chmod +x`. **ADAPT**: 이 repo가 Python이 아니거나 소스 루트가
`src`가 아니면 두 곳을 바꾼다 — ① `SRC_DIR="src"`, ② `find ... -name '*.py'` **두 군데**의 `'*.py'`를
이 repo 확장자로(예: `'*.ts'`; 다중 확장자는 `\( -name '*.ts' -o -name '*.tsx' \)`).

```bash
#!/usr/bin/env bash
#
# check-quarkify.sh — verify the Quarkify code-topology index is fresh vs source.
# ----------------------------------------------------------------------------
# .quarkify/src/ is a gitignored, regenerable LOCAL BUILD ARTIFACT (see tools/quarkify/).
# It goes stale when src/*.py changes. This script surfaces that — but it is NON-GATING:
# the index is an OPTIONAL navigation accelerator, so this is deliberately NOT wired into
# `make check` (that would make an absent/optional artifact a mandatory build dependency,
# breaking CI and any clone without the tool). Use `make quarkify-check` on demand.
#
# Freshness rule: stale if the newest src/**/*.py mtime is newer than the index's
# ai_context_guide.txt (which Quarkify writes at the end of every generation).
#
# Usage:
#   bash harness/check-quarkify.sh --check   # report only: exit 1 if stale/missing
#   bash harness/check-quarkify.sh           # self-heal: regenerate if stale/missing
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

INDEX_DIR=".quarkify/src"
MARKER="$INDEX_DIR/ai_context_guide.txt"   # written at end of generation
SRC_DIR="src"                               # ADAPT: 소스 루트가 다르면 변경

# mtime in epoch seconds — macOS (stat -f) and GNU (stat -c) both.
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }

CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1

# state: missing | stale | fresh
state="fresh"
if [ ! -f "$MARKER" ]; then
  state="missing"
else
  marker_t="$(mtime "$MARKER")"
  newest_src="$(find "$SRC_DIR" -name '*.py' -not -path '*/__pycache__/*' -print0 \
                | xargs -0 stat -f %m 2>/dev/null || \
                find "$SRC_DIR" -name '*.py' -not -path '*/__pycache__/*' -printf '%T@\n' 2>/dev/null)"
  newest_src="$(printf '%s\n' "$newest_src" | cut -d. -f1 | sort -n | tail -1)"
  [ -z "$newest_src" ] && newest_src=0
  if [ "$newest_src" -gt "$marker_t" ]; then state="stale"; fi
fi

if [ "$CHECK" -eq 1 ]; then
  case "$state" in
    fresh)   echo "check-quarkify: OK — .quarkify/src is fresh"; exit 0 ;;
    missing) echo "check-quarkify: MISSING — .quarkify/src not built." >&2 ;;
    stale)   echo "check-quarkify: STALE — src/ changed since last index build." >&2 ;;
  esac
  # Agent-friendly error: what / where / why / how-to-fix.
  {
    echo "  what:  Quarkify code-topology index is $state"
    echo "  where: $INDEX_DIR (gitignored local build artifact)"
    echo "  why:   navigation via a $state index can mislead — authority is the source file"
    echo "  fix:   run 'make quarkify' (≈4s; first time 'make quarkify-setup')"
  } >&2
  exit 1
fi

# no flag → self-heal
if [ "$state" = "fresh" ]; then
  echo "check-quarkify: already fresh — nothing to do"
  exit 0
fi
echo "check-quarkify: $state → regenerating…"
bash "$REPO_ROOT/tools/quarkify/generate.sh"
```

> `harness/`가 이 repo에 없고 만들고 싶지 않다면 이 스크립트를 `tools/quarkify/check.sh`로 두고
> Step 5의 `quarkify-check` 경로만 맞춰도 된다(선택).

### Step 5 — Makefile 배선 (있으면)

이 repo에 `Makefile`이 있으면: `.PHONY` 라인에 `quarkify-setup quarkify quarkify-check` 토큰 3개를 추가하고,
아래 3개 타깃을 추가한다(레시피 verbatim — 탭 들여쓰기 주의).

```makefile
quarkify-setup:   ## one-time: clone the pinned Quarkify tool (zero deps, no npm)
	@bash tools/quarkify/setup.sh
quarkify:         ## regenerate whole-src code topology → .quarkify/src (fast)
	@bash tools/quarkify/generate.sh
quarkify-check:   ## .quarkify/src 신선도 검사(비차단; stale면 make quarkify 안내). make check 미포함
	@bash harness/check-quarkify.sh --check
```

> **`make check`(또는 lint/test 게이트)에는 절대 추가하지 마라.** 선택적 가속기다.
> **Makefile이 없으면**: 이 단계를 건너뛰고, 사용자에게 직접 호출법을 알린다 —
> `bash tools/quarkify/setup.sh`(최초 1회) → `bash tools/quarkify/generate.sh`(재생성).

### Step 6 — `.gitignore`

다음 한 줄을 추가한다(이미 있으면 생략):

```
.quarkify/
```

클론된 도구(`~/tools/quarkify`)는 repo 밖이라 무관하다.

### Step 7 — 정책 문서화 (조건부 — 파일이 있을 때만)

이 repo가 overnight-harness 플러그인 consumer면 아래 파일들이 (제너릭 버전으로) 존재할 수 있다.
**존재하는 것에만** 정책 문구를 추가한다. **없는 파일은 임의로 만들지 말고**, 무엇을 스킵했는지 사용자에게 보고하라.

- **`harness/CORE_MANDATES.md`** — 규율 목록에 한 줄 추가:
  > **Navigation tooling discipline**: 코드 탐색은 측정된 조건부 정책을 따른다 — 대형 패키지·고빈도 심볼은
  > `.quarkify/src` 인덱스(필요시 `make quarkify` 재생성, 멱등 ~4s) 우선, 드문 리터럴은 grep. 인덱스는
  > 위치용일 뿐 **최종 확인은 원본 파일**을 읽는다. 선택적 로컬 가속기이므로 게이트화하지 않는다
  > (`make check` 미포함). 상세: 진입점 "## Quarkify" 섹션.

- **`docs/engineering/CONTEXT_ENGINEERING.md`** — "구조 인덱스는 조건부" 절이 없으면 추가(있으면 중복 금지):
  > **구조 인덱스는 조건부**: 구조 인덱스(심볼·호출그래프 폴더맵/LSP/ctags 등)는 grep의 대안이 될 수 있으나
  > 만능이 아니다. 레버는 쉘 latency가 아니라 *왕복 수 × 턴토큰*이다. **언제 이득**: 대형 모듈+고빈도 심볼.
  > **언제 손해**: 드문 리터럴·소형 파일은 grep이 더 쌈 — 측정 없이 "인덱스 우선" 처방을 받지 않는다.
  > **structure-before-body**: 큰 파일은 통독 말고 인덱스로 멤버부터 좁힌다. **단 인덱스 ≠ 권위** — 본문은 원본에서 확인.

- **`docs/engineering/HARNESS_ENGINEERING.md`** — 원칙 목록에 추가:
  > **Measured Adoption**: 외부 도구·하네스 프롬프트를 처방 그대로 받지 않는다. 효과를 **측정해 조건부 정책으로
  > 도출**하고 **제거 조건**을 단다. (vendor "X-FIRST/Y 회피" 프롬프트 → 실측 후 "대형·고빈도에서만, 권위는
  > 원본"처럼 한정.) 선택적 가속기는 **게이트화하지 않는다**(필수 빌드의존화 금지).

- **에이전트 진입점**(`CLAUDE.md` / `AGENTS.md` / `GEMINI.md` 등 이 repo가 쓰는 것) — "## Quarkify" 섹션 추가:
  > ## Quarkify (선택적 탐색 가속)
  > `.quarkify/src/`는 `make quarkify`로 생성하는 코드 심볼·호출그래프 인덱스다(gitignore 생성물).
  > **언제 써라**: 대형 패키지에서 흔한 심볼·넓은 탐색일 때 grep보다 먼저 —
  > `find .quarkify/src/quark -type d -iname '*<symbol>*'` / `ls .quarkify/src/_mirror/by_role/<role>`.
  > **언제 쓰지 마라**: 드문 리터럴·단일 후보는 grep이 더 싸다. **권위는 항상 원본** — 리프는 빈 폴더(위치만)
  > 이므로 위치를 짚은 뒤 본문은 원본 파일을 읽는다. 없거나 stale면 `make quarkify`(최초 `make quarkify-setup`).

---

## 4. (선택·권장) 측정 단계 — measured adoption

채택을 강제하지 않는다. 설치 후 이 repo의 **가장 큰 패키지/디렉터리**에서 빠른 A/B를 1회 권하면 좋다:

```bash
# 흔한 심볼 하나 고르고(예: 'session'·'store'·'config'), 대략 토큰 비교
grep -rn '<sym>' <src_dir> | wc -c                         # grep 경로 비용(대략)
find .quarkify/src/quark -type d -iname '*<sym>*' | wc -l   # 인덱스 히트 수
```

§1의 스케일 법칙으로 판정: 히트가 수십~수백이고 코드가 크면 인덱스가 유리, 히트가 한 줌이면 grep 유지.
**이득이 없으면 정책 문구만 남기고 일상 탐색은 grep 우선으로 결론**지어도 된다 — 그게 measured adoption이다.

---

## 5. 검증 (적용 후 반드시 실행)

```bash
make quarkify-setup        # 또는: bash tools/quarkify/setup.sh
#  → "quarkify-setup: ready ... — no npm install required"

make quarkify              # 또는: bash tools/quarkify/generate.sh
#  → ".quarkify/src/ …" 생성. 아래 확인:
test -f .quarkify/src/ai_context_guide.txt && echo "marker OK"
ls .quarkify/src/_mirror/by_role/                      # 비어있지 않아야 함
find .quarkify/src/quark -type d -iname '*<known_sym>*' # 이 repo의 알려진 심볼 1개 → 히트

make quarkify-check        # 또는: bash harness/check-quarkify.sh --check
#  → "check-quarkify: OK — .quarkify/src is fresh"

git status --porcelain | grep -q '\.quarkify/' && echo "FAIL: .quarkify tracked" || echo "gitignore OK"
```

모두 통과하면 적용 완료. 사용자에게 **무엇을 만들었고(파일 목록), Step 7에서 무엇을 스킵했는지**(없던 진입점/바이블)
요약 보고하라.

---

## 6. 주의·함정 (체크리스트)

- **권위는 원본 파일.** quark 리프는 빈 폴더(위치만 인코딩, 라인 번호 없음) → 심볼 확정 후 본문/정확한 span은 원본 read.
- **`.quarkify/`는 커밋 금지** — 로컬 빌드물. 코드 바뀌면 stale → `make quarkify` 재생성(멱등, 수 초).
- **`make check`/CI 게이트에 넣지 마라** — 부재 산출물을 필수 빌드의존으로 만들면 clone/CI가 깨진다.
- **`config.mjs`의 `srcDir`/`outDir`는 절대경로** → repo를 다른 위치로 옮기거나 다른 머신에서 clone하면 재작성 필요.
- **도구는 핀 커밋 고정**(`cace87f5ea96333642d6198b6364ab38efd99ff9`) — 업스트림 변동 영향을 차단한다. 의도적으로 바꾸지 마라.
- **Node 22+ 필수** — 낮으면 `quarkify.mjs`가 실패한다. 검증 전에 `node --version` 확인.

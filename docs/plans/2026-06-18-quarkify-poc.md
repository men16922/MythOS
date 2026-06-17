# Quarkify PoC 평가 — MythOS 적용 타당성 (2026-06-18)

대상 plan: `~/.claude/plans/quarkify-md-misty-teacup.md` (승인본)
범위: `mythos_loop` 한 패키지(539 LOC, 4파일) 쿼크화 후 grep-loop 대비 A/B 실측.

> **후속(2026-06-18):** 이 PoC 결과로 전체 `src/`(78파일 18k LOC) 확장 완료 — production 경로
> `tools/quarkify/`(`make quarkify-setup`/`make quarkify`) + CLAUDE.md "## Quarkify" Soft 가이드.
> 본 PoC의 패키지별 설정 `tools/quarkify-poc/`는 증거로 **동결**.

## TL;DR — 권고: **대형 코드베이스에 유의미, 자동 재생성 전제로 채택 추진**

메커니즘 검증됨(Python 파서 정상, 무의존·재현 가능), **결정론적 심볼+호출그래프 탐색**이 고유 가치.
1차(539 LOC)에선 한계이득(50~70%)이었으나 **2차(10,072 LOC) 실측에서 흔한 검색어 절감 80~92%로
규모 비례 확정** — `loop` 한 검색에서만 ~2만 토큰 절약. → 임계(모듈 ~1,500 LOC / 검색어 히트 ~30) 위
대형 패키지에서 분명히 유의미. **남은 전제: 재생성 자동화(make+CI)와 하네스 와이어링**만 갖추면 채택.

## 실행 결과 (실측)

- 설치: `~/tools/quarkify`에 clone. **npm install 불필요** — 유일 의존성 `puppeteer`는 `quarkify.mjs`가
  import하지 않음(미사용). 코어는 Node stdlib만으로 동작. Node v24.9.0(≥22.12 충족).
- 게이트 스모크(`validator.py` 단일): quark 297 / mirror 60 / axon 48. Python 파서 정상 분해 확인.
- 본 실행(`src/mythos_loop/**/*.py`, 4파일): **quark 731 / mirror 119 / axon 104**, 732 디렉터리.
- 생성물 `.quarkify/`는 gitignore 처리 → `git status` 비노출 확인.

## A/B 결과 (질문 3개, B=quark-tree / A=grep)

| 질문 | B: quark-tree | A: grep | 정답 |
|---|---|---|---|
| Q1 stability/tension 0–100 clamp | `find` 1회 → `engine.py/fn___clamp_score` + `apply_scene_payload` 내 `call___clamp_score` 호출지점까지 폴더명으로 노출 | `grep stability` 6히트(소규모라 무난, 단 정의 식별 추가 판단 필요) | `engine.py:271 _clamp_score = max(0,min(100,v))` ✓ |
| Q2 허용 phase 전이 + 강제 위치 | `find` 1회 → `validator.py/fn___allowed_next_phases/var__transitions` + `fn__validate_phase_transition`(강제) + engine `_next_phase` 호출 | `grep transition\|phase` **54히트**(노이즈 큼, 전이맵까지 필터 필요) | `validator.py:188-197 transitions 맵`, validate_phase_transition 강제 ✓ |
| Q3 world_delta ±25 clamp | `find` 1회 → `validator.py/fn___clamp_delta` + `validate_state_delta` 호출 | `grep delta` 41히트 / `grep 25` 1히트(리터럴이 희귀해 우연히 적중) | `validator.py:204 _clamp_delta = max(-25,min(25,v))` ✓ |

**B 정확도 3/3.** 세 질문 모두 `find` 1회로 *어느 함수·어느 파일·어디서 호출*까지 **폴더명만으로** 확정,
본문은 짚어준 함수만 열어 채점. grep은 본문 히트를 훑어 정의를 분별하는 단계가 더 든다(특히 Q2 54히트).

## 핵심 발견 (도입 판단에 중요)

1. **quark 리프는 빈 폴더 — 코드 본문/라인번호 없음.** 토폴로지는 전부 *폴더명*에 인코딩. 즉 Quarkify는
   **심볼·관계 인덱스(목차)**이지 코드 저장소가 아니다. "토큰 ~90% 절감"은 *위치 탐색* 비용에 적용되고,
   본문은 여전히 원본을 읽어야 한다. 라인번호가 없어 심볼 확정 후 정확한 span은 grep/read로 한 번 더 집어야 함.
2. **고유 가치 = 결정론적 구조+호출그래프.** grep은 매치를 주고, quark는 containment 계층(`class→fn→stmt`) +
   `_axon` 의존 링크 + `_mirror/by_role|by_kind` 역할별 평면 조회를 준다. "누가 clamp를 호출하나"가 폴더로 드러남.
3. **이 규모에선 한계이득 작음.** 539 LOC·네이밍 양호 패키지에선 grep도 충분히 실용적(Q1 6히트, Q3 '25' 1히트).
   이득은 **코드베이스 크기·난잡도에 비례** — `mythos_runtime/session.py`(2088라인)나 `mythos_combat`처럼
   grep 노이즈가 실제로 큰 곳에서 가치가 커진다.
4. **doc-centric 레이어와 중복 아님, 층위가 다름.** 기존 `/sync`·`CORE_MANDATES §6`는 *무엇을/왜*(도메인·상태),
   quark는 *어디에*(심볼·호출). 보완재.
5. **staleness.** 산출물은 코드 변경 시 재생성 필요(모든 인덱스 공통). 현재 어디에도 wired 안 됨.

## 2차 실측 — `mythos_runtime` (10,072 LOC, 17파일, session.py 2,088라인)

생성: quark 14,011 / mirror 1,643 / axon 1,640, **2초**. 검색 1회 컨텍스트 토큰(grep vs quark, chars/4):

| 검색어 | grep 히트 | grep tok | quark tok | 절감 |
|---|---|---|---|---|
| transaction | 5 | 136 | 144 | −5% (손해) |
| choose | 15 | 433 | 181 | 58% |
| echo | 65 | 1,847 | 827 | 55% |
| session | 66 | 2,282 | 465 | 79% |
| archive | 86 | 2,795 | 749 | 73% |
| store | 235 | 7,545 | 578 | **92%** |
| loop | 777 | 24,969 | 4,298 | **82%** |

**확정된 법칙**: 절감 ∝ 검색어 히트 수 ∝ 코드 규모.
- 히트 ≤15(드문 용어) → quark 무이득/손해(grep이 이미 최소).
- 히트 30~90 → 55~79%. 히트 200+ → 80~92%.
- 1차(539 LOC, 히트≤40, 절감≤70%) → 2차(10k LOC, 히트 200~777, 절감 80~92%)로 스케일 효과 입증.

## 재평가 트리거 (이게 갖춰지면 전면 도입 plan 착수)

- [ ] **재생성 자동화**: `make quarkify`(전 패키지 config) + pre-commit/CI에서 변경분 재생성 → staleness 차단.
- [ ] **대형·난잡 타깃 A/B**: `mythos_runtime`/`mythos_combat`에서 같은 실측 — grep 노이즈가 큰 곳에서 이득 재확인.
- [ ] **하네스 와이어링**(위 2개 통과 후에만): `quarkify.md`의 QUARKIFY-FIRST 규약을 CLAUDE.md/sync에 편입,
      `.quarkify/_smoke` 폐기, ai_context_guide를 에이전트 read-path에 연결.

## 산출물 / 파일

- 추적 신규: `tools/quarkify-poc/{_smoke,mythos_loop}.mjs`, 이 노트.
- 수정: `.gitignore`(`.quarkify/` 추가).
- gitignored: `.quarkify/{_smoke,mythos_loop}/**`. 외부: `~/tools/quarkify`(clone).
- 불변: `quarkify.md`(참고자료로 유지, 하네스 미활성).

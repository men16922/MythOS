# Progress Log

Last updated: 2026-07-12

## 2026-07-12 (live session #13, claude lane) — 전투 피드백 배치 1: 스킬 리워크 + 가독성 VFX + XCOM 투척
- Status: Done, `make check` **1008** green (+15 tests). UNDEPLOYED (00052 위 신규 번들 시작).
- 오너 라이브 피드백 반영 (00052 플레이 세션): **시스템 해킹 → 1턴 스턴** (구 focus_drain은 집중 0 적에 "-0" 무효과; cd 2→3) · **과부하 일격 → 근접 스플래시** (aoe_radius 1, 명중 피해가 인접 적에 확산; push 제거) · **자기 반발 신설** (전용 밀기 스킬: push 2 + 1d4 충격, 자기 견인 트리에서 해금) · **무피해 유틸 리밸런싱** (자기 견인=끌려온 충격 1d4 보장, 신호 도약=착지 인접 1d4 방전 — 명중 굴림 없는 고정 피해라 유틸 캐스트가 턴 낭비가 안 됨) · **EMP 수류탄 → XCOM식 광역 스턴** (지도에서 칸 지정 투척, range 4/radius 1, 셀 프리뷰 링+조준 모드 UI).
- **가독성 VFX**: 밀기/당기기 = 낚아채기 연출 (가속 스냅 170ms + 드래그 트레일 + 착지 크런치 링/셰이크; 엔진이 from/forced 메타 방출, 0칸이면 "꿈쩍도 안 한다" 로그) · **스턴 = 💫 기절 배지 + 노란 대시 헤일로** (보드 상시 표시) · control 스킬 = 수렴 링(흡착 큐) · aoe = 블래스트 웨이브 링.
- Next: `[auto:agy]` magnetic_repulse 전용 아이콘 (현재 magnetic_pull 복사 플레이스홀더) · 오너 후속 지시 대기 3건 = 2-티어 컨트롤(타겟팅·행동 예측) · 전투 반응성 진단 · 상태이상 시스템(부식·연소·산성·냉동·감전) 설계.

## 2026-07-12 (live session, claude lane) — 커버 아트 오너 승인 → IMAGEN_MODEL Makefile 고정 → **DEPLOYED `00052-fcx`**
- 오너 비교시트 승인(7장 확정, su-ah 4차=attempt-1 스타일+나이프 교체 포함) → cover 아트 블로커 해제.
- `make deploy`에 `IMAGEN_MODEL ?= gemini-3.1-flash-image` + `--update-env-vars` 고정 (`893457f`) — env-보존 배포가 리비전의 낡은 imagen-3.0 값을 계속 되살리던 함정 봉인. 오버라이드: `make deploy IMAGEN_MODEL=<id>`.
- **오너 `make deploy` 실행 → `mythos-api-00052-fcx` 100% 트래픽.** 검증: health/root 200 + 리비전 env에 IMAGEN_MODEL 고정 확인(gcloud describe). 세션 #8-#12 번들 전체가 라이브.
- Next: `! git push` · 오너 라이브 체감(이미지 일관성 · push/pull+cover · hot-path choices · portrait combat 실기기) — `docs/test/neo_seoul_live_qa.md` 갱신본이 권위.

## 2026-07-12 — overnight Codex: Su-ah cover pose regenerated from the approved style anchor
- Status: Done; still undeployed and awaiting the existing human cover-art identity sign-off.
- Changed: replaced `su-ah-cover.png` with a 512×768 RGBA cover sprite that retains attempt-1's crouch, magenta hex shield, circuit-embroidery coat, utility belt, and lighting, replacing only the datapad with the guard-matching low purple knife.
- Verified: inspected the candidate against Su-ah idle/guard and the attempt-1 anchor; alpha conversion reports transparent corners. `make check` green (993 tests; content, lint, types, and Vite build passed).
- Blockers: the visual comparison sheet needs its Su-ah cover cell refreshed before the manual owner approval; deployment remains blocked on that approval.
- Next: refresh `outputs/cover-pose-regen/comparison-sheet.png`, then obtain the manual approval before any owner-only push/deploy.

## 2026-07-12 — overnight Codex: final two cover-pose sprites regenerated → 오너 리뷰: player-noise 승인, su-ah 스타일 리젝
- Status: player-noise **오너 승인** 확정; su-ah는 무기(나이프)는 맞지만 attempt-1 대비 스타일 회귀(회로 자수 질감/디테일 밀도 소실)로 **오너 리젝** → 4차 재시드(attempt-1을 1순위 레퍼런스로 무기 든 손만 교체, 브리프 4차 개정). still undeployed.
- Changed: regenerated and promoted `player-noise-cover.png` (short-haired masked, unarmed, green hex shield) and `su-ah-cover.png` (glasses/bun, purple shield, guard-matching knife); refreshed `outputs/cover-pose-regen/comparison-sheet.png` and the review table.
- Verified: inspected each target's idle/guard references and final alpha candidates; both final files are 512×768 RGBA with transparent corners. `make check` green (993 tests).
- Blockers: none for the automated item; `[manual]` owner comparison-sheet identity approval still gates deployment.
- Next: owner reviews `outputs/cover-pose-regen/comparison-sheet.png`; if approved, push and deploy with `IMAGEN_MODEL=gemini-3.1-flash-image` remain owner-only actions.

## 2026-07-12 (live session, claude lane) — cover-pose regen: 잔여 5장 재적용 → 오너 리뷰로 2장 재오픈
- Status: 5/7 확정 (`2942a74`). 오너 비교시트 리뷰에서 신규 캐논 규칙 확정 — **cover 소품은 그 캐릭터 guard 정본에 있는 것만** → player-noise(라이플, 정본은 비무장)·su-ah(데이터패드, guard=나이프) FAIL 재시드(브리프 3차 개정: guard-소품 규칙 명문화, 오염원이던 브리프의 "소총/데이터패드" 지시 수정). UNDEPLOYED.
- 러너 2회차(codex)가 잔여 5장(lin-yue/su-ah/tae-o/han/player-noise)을 승격했으나(`33b5a4a`) critic이 정당하게 reject — NEXT_PLAN에서 이 항목을 `[manual]` 후속 없이 DONE으로 닫고 불릿의 잔여 이력을 삭제했기 때문(아트 품질 문제 아님). revert(`0647fab`) 후 claude가 아트 5장만 복원하고 문서를 후속-보존형으로 재작성.
- Verified: claude 시각 정체성 재판정 5장 전원 PASS vs 정본 idle/guard — 오너 리젝 사유 해소(린위에=여성 인간, 태오=남성, player-noise 초록 육각 실드) + 7장 포즈 전부 상이. 1회차 se-rin/kai(`df8d1e6`)는 러너 image-judge PASS + AGY live-QA PASS_CANDIDATE. `make check` green.
- Next: `[manual]` 오너 비교 시트 확인 → 승인 시 deploy 블로커 해제 · `! git push` · `make deploy` w/ `IMAGEN_MODEL=gemini-3.1-flash-image`.

## 2026-07-12 — overnight Codex: cover-pose regeneration partial promotion
- Status: In progress; two of seven identity-reviewed candidates promoted, remaining five stay pending.
- Changed: regenerated `se-rin-cover.png` and `kai-cover.png` from each character's guard/idle references; preserved chroma-key sources and RGBA candidates in `outputs/cover-pose-regen/` with a per-character review table.
- Verified: both promoted files are 512×768 RGBA PNGs with transparent corners; visual identity/prop/shield/pose review passed.
- Blockers: none in this partial promotion; the task completion criterion still requires five reviewed candidates and `make check`.
- Next: regenerate lin-yue, su-ah, tae-o, han, and player-noise using their own guard/idle references; only promote PASS candidates.

## 2026-07-12 — overnight Codex: cover-pose regeneration blocked at identity review
- Status: Blocker #1; no project assets were changed.
- Changed: generated seven reference-guided cover-pose candidates in a temporary workspace and chroma-keyed them to RGBA 512×768 for inspection.
- Verified: opened every target's `-idle`/`-guard` reference, then visually checked all seven candidates against the five-item brief.
- Blockers: `player-noise` rendered a neutral/dark shield instead of the required green hexagonal hologram, so the all-PASS promotion criterion failed; assets were deliberately not replaced and `make check` was not run.
- Next: human review/reseed direction needed before another unattended regeneration; do not promote partial art.

## 2026-07-12 (live session, claude lane) — A2A 러너 릴레이 2종 구현 + cover 아트 7장 재생성 재시드
- **A2A 검토→구현** (`docs/plans/2026-07-12-a2a-relays.md`, run.sh): 라이브 A2A는 비채택(one-shot 복구성 훼손·공통 프로토콜 부재·쿼터 이중 소모). 대신 러너 중개 one-shot 릴레이 2종 — **Relay 1 image-judge 게이트**: 캐릭터/적 아트 커밋을 claude 시각 판정자(plan 모드)가 정본(-idle/-guard/초상)과 대조, FAIL=critic-reject 식 자동 revert, fail-open; **리젝 배치 `4d5b3be` 실판정 FAIL 재현 확인**(kai=인간 오검출 정확 지목). **Relay 2 당일 블로커 에스컬레이션**: codex/agy 회차가 Blocker/[blocked] 기록 시 다음 1회차를 claude 크로스레인 처리(상한 2/run, --once 미발동). `OVERNIGHT_IMAGE_JUDGE`/`OVERNIGHT_ESCALATE` 기본 on.
- **cover 스프라이트 1차(4d5b3be) 오너 전량 리젝** — 7장이 동일 템플릿 + 정체성 뒤섞임(세린=플레이어 디자인, 카이=인간, 린위에=카이 로봇 바디, 태오=여성). 브리프 `scratch/codex-cover-pose-brief.md`를 7장 전원 개성 앵커로 확대(han 해커 정찰·player 주인공 결의 추가, "7장 같은 자세=전체 실패" 명문화) 후 `[auto:codex]` 재시드, codex --once 재실행(커밋은 image-judge 가 스크린).
- Follow-up: regen #1 obeyed the self-check but the all-PASS criterion discarded all 7 candidates over ONE fail (player-noise shield color; blocker `bd907af`, ~6M tok, nothing kept) → criterion relaxed to **partial promotion** (`e5f847a`: stage in `outputs/cover-pose-regen/`, promote PASS immediately, retry only FAILs, 2 tries each). Regen #2 hit the codex usage limit instantly (00:23, resets **03:29**) — correctly classified `limit` by the fixed classifier; runner stopped on owner request.
- Next: after 03:29 rearm `ENGINE=codex nohup caffeinate -dimsu scripts/overnight/run.sh --once &` (image-judge screens the commit, then human identity re-check on a comparison sheet) · ⚠ rejected batch-1 sprites remain in `resources/` until then · `! git push` (ahead 26) · owner `make deploy` w/ `IMAGEN_MODEL=gemini-3.1-flash-image`.

## 2026-07-11 — overnight Codex: player cover sprites regenerated
- Status: Done; UNDEPLOYED.
- Changed: added seven player-side crouching cover sprites (`se-rin`, `kai`, `lin-yue`, `han`, `su-ah`, `tae-o`, `player-noise`) at `resources/neo-seoul/characters/combat/*-cover.png`; enemies retain the guard fallback.
- Verified: each file is RGBA PNG, 512×768 with transparent background; `make check` green (993 tests).
- Blockers: none.
- Next: no remaining eligible Codex-lane item in the current plan.

## 2026-07-11 (live session #11, claude lane) — 엄폐 포즈 배선 (codex 2회 실패분 인계) + overnight limit 오분류 수정
- Status: Done, `make check` **993** green (+3 tests). UNDEPLOYED (session #9/#10 번들에 합류).
- **엄폐 포즈 배선**: combatCanvas pose 유니언에 `"cover"` — 엄폐 칸 위 유닛은 웅크림 포즈로 렌더. 스프라이트 규약 `<char>-cover.png`(authored guard/idle 경로에서 파생, 저작 키 불요), 로드 실패 시 guard 포즈 폴백(`brokenSprites` onerror 추적 + 재드로). 우선순위 anim override > hit > defend guard > cover > idle. codex 실패 원인(선언 순서)을 피해 커버 룩업을 pose 식 앞으로 호이스트, 🛡배지 블록이 재사용; +3 소스락 tests. 크라우치 아트는 `[auto:codex]` 리젠으로 남김(그때까지 폴백이 guard 표시).
- **overnight `classify_outcome` 오분류 수정** (`695b25e` + 플러그인 SSOT `3751178`): codex JSONL엔 `is_error`가 없어 전체 로그 키워드 스캔으로 낙하 → 문서/커밋 제목에 에코된 "quota"가 성공 회차를 limit으로 오탐(회차당 30분 헛대기). 이제 turn.completed(rc=0)=success, limit 스캔은 마지막 에이전트 메시지만. 수정 후 codex 랜 5회차 정상 완주 DONE(drained).
- Next: `[auto:codex]` 크라우치 스프라이트 아트 · `! git push` (ahead 16) · owner `make deploy` (`IMAGEN_MODEL=gemini-3.1-flash-image` 필수).

## 2026-07-11 — overnight Codex: cover-pose blocked; icon + key-beat coverage completed
- Status: Cover-pose Blocker #2 recorded; magnetic-pull icon and image-continuity lever #2 completed.
- Changed: attempted `combatCanvas` cover pose plus guard fallback, then restored it after each gate failure; replaced `resources/neo-seoul/skills/magnetic_pull.png` (the `emp_pulse` placeholder copy) with a dedicated self-traction illustration; added fixed three-turn curated sequences for night market, incinerator, Kai awakening, Spire gate, and IX.
- Verified: cover-pose attempts: focused test passed, then `make check` failed TS2448/TS2454 and ruff I001; icon and key-beat coverage: `make check` green (content validation, ruff, ESLint, mypy, Vite build, 990 tests), with route test + actual asset checks.
- Blockers: cover-pose is now `[blocked]` after two failed unattended attempts; it needs human review before retry.
- Next: no remaining eligible Codex-lane item in the current plan.

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

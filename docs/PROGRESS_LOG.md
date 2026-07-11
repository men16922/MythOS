# Progress Log

Last updated: 2026-07-12

## 2026-07-12 — overnight Codex: cover-pose regeneration completed
- Status: Done; all seven owner-rejection replacements are now promoted.
- Changed: generated and identity-reviewed lin-yue, su-ah, tae-o, han, and player-noise cover sprites from their own idle/guard references; promoted the five new PASS candidates alongside the prior se-rin and kai promotions.
- Verified: all five new sprites are 512×768 RGBA PNGs with transparent corners; each passed the five-point identity, shield, prop, and distinct-pose review in `outputs/cover-pose-regen/review.md`; `make check` green (993 tests).
- Blockers: none.
- Next: the Codex lane is drained; the runner image-judge must screen this asset commit before any deployment.

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

# Progress Log

Last updated: 2026-07-12

## 2026-07-12 (live session #15) — status stacking · collision slam · cryo damage · BGM env · codex parallel triage
- Status: Done, `make check` **1058** green. Pushed to origin (owner, 07-12 night); UNDEPLOYED. 5 code commits `2d94ad6..ac66266`.
- **Status stacking (owner-decided)** (`2d94ad6`): reapply now ACCUMULATES turns (cap `STATUS_EFFECT_TURNS_CAP=6`, tunable) for statuses AND stun; multi-status coherence locked (independent tick/expire/badges) + fixed `_run_until_controllable` handing the turn to a unit its own upkeep burn just killed.
- **Collision slam (owner request)**: forced movement (밀기/당기기) cut short by board edge / **full-cover structure** (now blocks FORCED movement only) / another unit deals flat 1d4 armor-bypass slam (`detail.slam`+`obstacle`) with amber burst + 💥 충돌! float + shake; 🎯 aim preview mirrors the cover block. Sim-verified: full-cover push → "꿈쩍도 하지 않는다!" + "💥 장애물에 부딪혀 2 충돌 피해!" (evidence `outputs/qa-slam/`).
- **자기 반발 진단**: cut-in fires correctly at HEAD (`magnetic_repulse.png` card verified in sim) — the invisible case was the 0-tile blocked push, which now slams visibly. Likely also a stale-tab factor on the owner's build.
- **냉각 수류탄 데미지** (owner request): +`"damage": "1d4"` (scenario.json), engine path already generic; sim-verified -3 blast ×2 + ❄×2.
- **BGM ENV** (`c300f1a`, owner request): `DEFAULT_BGM_ON` env → open `/api/v1/client-config`; hostname heuristic removed; `enableBgm()` no longer force-starts when the server default is false; `make api`/`api-cloud` export false. Browser-verified silent after ENTER.
- **codex 병렬 레인** (worktree, reviewed+cherry-picked): victory lineup `.slice(0,3)` truncation dropped 린위에 → render all survivors (`0066319`) · loot pills raw ids → KO/EN 표시명 매핑 11종 + readable fallback (`89d05d8`).
- **Live-QA guide refreshed (owner request)**: all 17 owner-confirmed `[x]` items removed; new feel checks added for slam/cryo-damage/status-stacking; 한 시스템 침투 uncastable warning inlined in A-1 (`8105006`, 235→175 lines).
- Blockers: none. 한's 시스템 침투 ◆4 > max FOCUS 3 (uncastable) still open — needs owner balance call (cost 3 vs max_focus 4).
- Next: owner `make deploy` (push done) → feel pass on the refreshed `docs/test/neo_seoul_live_qa.md` → agy art seeds. Note: local API left running with the new bundle.

## 2026-07-12 (live session #14 cont.) — grenade cut-in gap diagnosed + fixed; blast amplified; QA-skill wiring
- Status: Done, `make check` **1042** green. UNDEPLOYED. Owner live reports (local): 견인/반발 스킬 카드 안 뜸 · EMP 폭발 이펙트 없음.
- **/diagnose 결과**: 견인 카드는 현재 번들에서 정상 렌더(DOM 덤프로 `magnetic_pull.png` 풀 시퀀스 확인 — 스테일 탭/더블탭 플러시 추정, **하드 리로드 필요**). EMP는 실제 갭 2개: ① 무피해 수류탄(스턴만)은 `item`+`info` 로그뿐이라 컷인 게이트(hit/defeat) 미통과 — 소이만 컷인이 뜨던 비대칭 ② 보드 폭발은 재생되지만 계측상 밝기 2.0×/0.5s로 약해 "없음"으로 체감.
- **수정 (`7882d3d`)**: 셀 투척 아이템은 항상 아이템 아트 컷인(오너 "수류탄도 스킬카드처럼") · 폭발 = 피격 셀 백→화염 점화 + 코어 확대 + 1150ms + 셰이크 18/450 (재계측 피크 2.7×) · 컷인 마운트 후 350ms 스킵 유예(더블탭 플러시 방지) · 로컬 호스트 BGM 기본 OFF(오너 요청). 소스락 +2.
- **튜토리얼 다음 버튼 (`c7165f9`)**: 첫 전투 가이드가 행동 수행으로만 진행돼 2-4페이지를 못 읽던 것(오너 보고) → 다음 ▸/완료 버튼 추가, 행동 자동 진행 유지. 시뮬에서 4페이지 넘김+닫힘 검증.
- **오너 결정**: 상태이상 **중첩 = 지속 턴수 누적**(강도 스택 아닌 B안) + **서로 다른 상태 다중 동시 적용** 처리 보장 — NEXT_PLAN `[auto:claude]` 등재 (구현은 다음 작업).
- Also: `gameplay-qa` 스킬 체크(한국어 트리거 보강) + `sync-skills.sh` references/ 투영 · CORE_MANDATES §5 gameplay-qa 의무화 · QA 가이드 A-4 신설.

## 2026-07-12 — Shared gameplay QA skill for local combat verification
- Status: Done.
- Changed: Added `$gameplay-qa` as a canonical `.claude/skills` skill and mirrored it to `.agents`, `.codex`, and `.gemini`; it routes combat rules through narrow unit tests, `make check`, non-fallback simulator/browser evidence, and preserves manual feel verdicts.
- Verified: `./.venv/bin/python -m unittest tests.test_combat_engine` (51 tests) · `quick_validate.py` for all four copies · `make check-skills` · `git diff --check`.
- Blockers: None. The skill deliberately does not deploy, mutate production data, or convert human play-feel checks into automated passes.
- Next: Invoke `$gameplay-qa` for the next combat mechanic, targeting, VFX, or board-interaction change.

## 2026-07-12 (live session #14, claude lane) — combat VISUAL overhaul V1-V6 (owner probe: all four areas)
- Status: Done, `make check` **1041** green. UNDEPLOYED (origin+3; owner pushed the prior +20 mid-session).
- Owner answered the "시각적으로 별로임" probe: **ALL FOUR** (status badges / aim·blast rings / cinema cards / board look) + two live requests (camera drag-pan, node-themed combat backdrops). Diagnosed by direct chrome-devtools sim run — evidence `outputs/vis-diag/01..32`, design `docs/plans/2026-07-12-combat-visual-overhaul.md`.
- **V1 (`8b86423`)**: `getIsoConfig` centering BUG fixed (10×7 arenas clipped right-edge enemy sprites off-canvas) + **camera drag-pan** on empty background (dataset-shared like boardZoom; unit drag/taps keep priority; double-press recenters; works on enemy turns).
- **V2+V3 (`075da28`)**: node-tinted backdrop (biome from encounter id: streets/undercity/industrial/spire — gradient+glow+vignette+arena rim; art hook `combat/backdrops/<biome>.png`) · floor stamp alpha-jitter + checker (kills uniform circuit noise) · **cell-true AoE**: new `cells` FX fills exact chebyshev blast tiles; ring/spark → grid-aligned diamonds; range tint → corner chevrons; out-of-range hover = red cell.
- **V4-V6 (`6eaa975`)**: status badges → dark circular chips + color rim ABOVE the name (was icon-on-name mush; cap 3 + "+N") · cinema impact slashes across defender card + strip speed-lines + 62/74px damage numbers + grenade throws show item art center card (`itemId` through the queue) · SKILL_SYMBOLS full coverage (제어/강화 skills showed bare "제/강" letters) + consumable item thumbnails.
- Non-visual findings for triage (NOT fixed): 한's 시스템 침투 cost ◆4 > max FOCUS 3 (uncastable ever) · 린위에 missing from victory lineup · loot pills show raw ids (`drone_scrap`/`nanopatch`).
- Next: `! git push` → owner `make deploy` → owner feel pass (A-1/A-3 + new A-4 visual overhaul) · agy art seeds (backdrop plates ×4, flat badge glyphs ×7, brighter floor tile, cover_full prop).

## 2026-07-12 (live session #13 cont.10, claude lane) — 전투 완성도 배치: 직접 시뮬 테스트로 발굴+수정
- Status: Done, `make check` **1041** green. UNDEPLOYED (origin+19). 오너 지시 "직접 전투 시뮬레이터 들어가서 테스트하고 개선" → chrome-devtools로 로컬 시뮬 구동해 발굴.
- **스킬 카드 안 뜸** (자기 견인/자기 반발 등): 시네마 레지스트리에 스킬 5/~20개만 등록돼 있었음 → 전 스킬 카드 추가 + `getSkillId` 정확-id 우선 + 특정-우선 키워드 폴백("신호"가 신호 오버드라이브 삼키던 버그 수정) (`abe2d6a`).
- **EMP 펄스/정밀 EMP/시스템 해킹 데미지 0**: 순수 제어기라 피해 없음 → 1d4 `shock_damage` 라이더(플레이어·NPC·시그니처 3경로). **과부하 일격 언밸런스**(적 2 원샷): 스플래시 절반 피해로. **"2번 발동"**: 처치 시 컷인 중복 → 공격자당 1회(처치 우선) dedup.
- **EMP 수류탄 폭발 이펙트 없음**: 착탄 셀 실폭발 VFX(흰 코어→화염 링→연기)+최대 셰이크. **냉각 수류탄(피해 0)**도 안 뜸: diff 이벤트 없어 instant 경로로 빠지던 것 → board-fx 마커 조기 스캔(`84210e3`). **조준 사거리** 안 보임: 닿는 칸 황색 틴트.
- i18n: 신규 수류탄/무기 EN 용어집(`84a24c4`). +6 tests.
- ⚠ **fallback 모드 전투 애니메이션 분리 시도→REVERT**: fallback→정적 전투는 설계 의도(2026-06-06)이고 오너가 non-fallback에서 확인 완료 → 되돌림. 잔여: 오너 "시각적으로 별로임" 대상 미확정(상태 배지 아이콘 / 조준·폭발 링 / 컷인 카드 / 보드 룩 중 어느 것인지 확인 필요).

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

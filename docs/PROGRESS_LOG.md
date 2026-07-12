# Progress Log

Last updated: 2026-07-12

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

## 2026-07-12 (agy lane) — status effect & item grenade icons generated (`make check` green)
- Status: Done
- Changed:
  - Generated and post-processed 7 status icons (`stunned.png`, `burn.png`, `corrode.png`, `acid.png`, `freeze.png`, `shock.png`, `hacked.png`) to `resources/neo-seoul/status/` as transparent RGBA 256x256 images.
  - Generated and resized 2 tactical grenade items (`incendiary_grenade.png`, `cryo_grenade.png`) to `resources/neo-seoul/items/` as 512x512 RGB images.
  - Added `status` and `items` paths to `tests/test_image_assets.py` `IMAGE_SUBDIRS` array for automated integrity checks.
  - Added staging audit records and quality reviews at `outputs/agy/status-icons/review.md`.
- Verified:
  - Ran `make check` (1037 unit tests green, including image asset format, non-empty, and dimension integrity checks).
- Blockers: None
- Next:
  - Owner playtest and live aesthetic review of the generated badges and items.

## 2026-07-12 (live session #13 cont.9) — 보드 임팩트 오버홀 + 상태이상 콘텐츠 배선 (`1937a84`, make check 1037)
- 오너 00055 피드백("효과가 미약, 비주얼 임팩트 부족, 조종이 즉발처럼 보임") 반영: 낚아채기=2중 쇼크웨이브+유닛 플래시+"밀려남!/끌려옴!" 플로트+셰이크 12 · 상태 부여=색상 링 폭발+배지 상승+플래시 · AoE 셰이크 1.7배 · **🕹 배신 타격=풀스크린 컷인**(엔진 hacked_blow 마커) · 배지=**아이콘 이미지**(`status/<id>.png` 규약, 필 폴백) — 아트는 `[auto:agy]` 시드.
- **상태이상 slice 3 배선 (오너 "같이 진행")**: 소각기→플라즈마 토치(🔥2턴)·신호추적기→산성 분사구(💧2+🧪2)·집행유닛 충격봉(⚡1) — 무기 `applies` 라이더 신설(양방향: 적→파티도 걸림). 소이 수류탄(1d4+🔥2)/냉각 수류탄(❄1) 신설 — `status_grenade` 범용 셀 투척, 테스트 킷 포함, 아이콘 플레이스홀더.
- UNDEPLOYED. 다음: agy 아이콘 9종 → 재배포 → 오너 임팩트 재판정.

## 2026-07-12 (live session #13 cont.8) — **DEPLOYED `mythos-api-00055-46x`** (저녁 배치 전체)
- 오너 지시 배포 → 100% 트래픽, smoke health/root 200. 포함: 낮 QA 5건 수정(`ba4dd19`) + 🎯 조준 스킬(`e67dafa`) + 상태이상 slice 2(`9ff6419`) + 시스템 침투 실구현/시그니처 분리/테스트 킷(`b0eff5c`).
- QA 가이드 갱신(`81ef938`): 시뮬=권장 전투 테스트벤치(테스트 킷) · A-0 #7(낮 지적 재확인) · **A-1 신설**(🎯 조준/⚡감전/🕹 조종/킷 — 린위에+한+수아 파티 한 판이면 전부 확인).

## 2026-07-12 (live session #13 cont.7) — 시스템 침투 실구현 + 시그니처 분리 + 시뮬 테스트 킷 (`b0eff5c`, make check 1032)
- **시스템 침투(hack_control)가 유령 스킬이었음을 발견**: 정의+UI 라벨만 있고 엔진 처리 0 (시전=집중 4 낭비). 오너 기대 메커니즘("적이 1턴 동안 적을 공격")대로 구현 — 🕹 조종 배지, 다음 턴에 가장 가까운 동료 적을 공격(이동+무기 공격, 스턴식 행동시점 소모+다음 upkeep 칩 정리).
- **시그니처 분리 (오너 승인)**: 정밀 EMP = ⚡감전 2턴 부여(신규 범용 `applies` 유틸 캐스트 경로: 플레이어+NPC+AI 자동시전 판단) → 수아(스턴)/린위에(감전) 차별화 + 감전이 당장 플레이 가능해짐.
- **시뮬 테스트 킷**: `/combat/begin test_kit=true`(시뮬 UI 상시 전송) → 전 스킬 해금 + EMP 수류탄×2/나노패치×2 지급. 감사에서 발견한 시뮬 미노출(자기 반발·과부하 일격·EMP 펄스 tier1, 수류탄) 전부 해소. 미노출 잔여 = 연소/부식/산성/냉동 (slice 3 부여 매핑 전 — 의도됨).
- 배포: 오너가 `! make deploy` 실행 → `mythos-api-00054-rbr` smoke 200 (이 배치는 그 후 = UNDEPLOYED).

## 2026-07-12 (live session #13 cont.6) — 상태이상 slice 2: 산성/냉동/감전 (`9ff6419`, make check 1029)
- 설계 5종 중 잔여 3종 훅 완성: **산성 💧**=유효 방어 -2(하한 1) · **냉동 ❄**=이동만 봉쇄(행동 가능; player move 홀드 로그 + AI 제자리 + reachable=[] → 보드 어포던스 정직) · **감전 ⚡**=그 턴 집중 회복·쿨다운 진행 정지. 배지 3종 + KO/EN apply/expire/hold 문자열. **콘텐츠 부여는 여전히 0** — slice 3(오너 밸런스 패스) 전까지 라이브 동작 불변이라 게이트 위반 아님.
- `make deploy`는 권한 분류기가 차단 (일반 "다음 우선순위" 지시는 프로덕션 배포 동의 아님) — 오너 `!` 실행 필요.

## 2026-07-12 (live session #13 cont.5) — 2-티어 slice 1 확장: 🎯 조준 스킬 (`e67dafa`, make check 1026)
- 위치 의존 스킬(push/pull/aoe_radius/stun, range>0)에 옵트인 **🎯 조준 토글**: 보드가 유닛 피커가 되고, 적 호버 시 **결과 프리뷰**(변위 도착지 화살표 — 엔진 `_skill_displace` 클라이언트 미러 · 폭발 링 · 💫 마크) 후 탭으로 시전. 기본 스킬 버튼은 자동 타겟 그대로(2-티어 원칙). 아이템 투척과 스킬 조준이 GroundTargeting 피커 하나로 통합.
- 게이트 안 걸린 백로그 소진 — 남은 것 전부 오너 게이트: 배포 후 A-0 재확인 · 상태이상 slice 2/3 · 2-티어 slice 4 판정.

## 2026-07-12 (live session #13 cont.4) — 오너 00053 라이브 QA 5건 수정 (`ba4dd19`, make check 1024)
- 오너 플레이 A-0 패스에서 발견 5건 진단→수정: **기절 배지 안 보임**(1턴 스턴이 한 트랜지션에서 적용+소모 → 칩을 다음 upkeep까지 유지) · **해킹 컷인 2회**(stun_applied가 두 번째 "skill" 로그 → "info" 강등 + 클라이언트 액터당 dedupe) · **드래그 이동 안 됨+튜토리얼 1단계 갇힘**(발밑 칸 정밀 잡기만 허용 → 스프라이트 몸통 잡기 허용 + 밝은 타일 클릭 이동 복원=튜토리얼 문구와 일치) · **공격 컷인 이미지 지연**(전투 시작 시 초상/포즈 전량 프리로드) · **시뮬레이터 세린 고정 참전**(명시 로스터=배타, 빈 목록=솔로; 일반 루프 불변). 자기 견인은 오너 정상 확인.
- UNDEPLOYED — 재배포 후 플레이 A-0 재확인 필요 (특히 1번 💫 배지 · 튜토리얼 1→2 진행).

## 2026-07-12 (live session #13 cont.3) — **DEPLOYED `mythos-api-00053-hj4`** (전투 피드백 번들)
- 오너 지시로 `make deploy` 실행 → 100% 트래픽. 검증: health/root 200 + 리비전 env `IMAGEN_MODEL=gemini-3.1-flash-image` 고정 확인. git push는 오너가 선행 완료.
- QA 가이드에 **플레이 A-0** 섹션 추가 (오전 지적 6건 재확인 체크리스트: 해킹 스턴 💫 · 낚아채기 · EMP 셀 투척 · 스플래시 · 반응성/탭스킵 · 명중% 칩+인텐트 렌즈). 이 체감 판정이 상태이상 slice 2-3 착수 게이트 (오너 확인: 검증 후 진행).

## 2026-07-12 (live session #13 cont.2) — 2-티어 슬라이스 2·3 + 상태이상 슬라이스 1 구현
- Status: Done, `make check` **1019** green. UNDEPLOYED (전투 피드백 번들 누적: `1d26a20`..`b55b37b`).
- **2-티어 slice 2** (`a164f81`): TARGETS 칩에 결정론 사격 예보 — 서버 `_attack_preview`(실제 `_attack` 수식 미러: 스탯+무기+고저차+지각 vs 유효방어+원거리 엄폐, 크리트 하한 5%) → "🎯65% ⚔6-16 🛡". **slice 3** (`de00355`): 적 호버/탭 시 그 적의 텔레그래프 스포트라이트(실선+글로우, 타 인텐트 딤) + 인스펙터 Intent 행이 그 적의 다음 행동("⚔2d6 → 세린") 표시.
- **상태이상 slice 1** (`b55b37b`): `Combatant.status_effects` + 연소/부식(설계 문서 매핑대로: 🔥=턴 시작 1d4 DoT·🧪=장갑 -2) + 스킬 `applies` 라이더 + 턴 upkeep 틱/만료 로그 + 보드 배지 pill 행 + 직렬화 왕복. 콘텐츠 부여는 slice 3(오너 밸런스 패스 게이트).
- Note: 부식 스택(-4)은 설계에서 "refresh만"으로 단순화해 구현 — 스택 필요하면 slice 2에서.

## 2026-07-12 (live session #13 cont.) — 전투 반응성 진단→수정 + 2-티어/상태이상 설계 스냅샷
- **반응성 diagnose 완료** (`5aa65d8`, make check 1010): H3 서버지연 기각(턴 해소 p50 0.08ms) / H1 확정 — 클릭 1회가 시네마 4~6개 직렬(표준 2.1s·빠름 1.2s) = **p50 7.0s/max 10.5s 강제 관람**(="제멋대로 진행"), 입력은 그동안 드랍(="클릭 딜레이"). 수정: 풀스크린 시네마는 지시한 유닛의 타격+처치 비트만 → **재계측 p50 3.6s/max 4.8s** + 시네마 **탭하여 스킵**(큐 플러시, ~1.5s 복귀). 적/아군 AI 타격은 보드 애니메이션(러시/트레이서/플로트/셰이크 기존 구현)이 담당. 계측 스크립트 scratchpad, 소스락 tests +2.
- **설계 스냅샷 2건**: `docs/plans/2026-07-12-two-tier-combat-control.md` (기존 자산 인벤토리 — 수동 타겟·텔레그래프·EMP 셀 타겟팅은 이미 있음 → 갭은 명중% 프리뷰·인텐트 렌즈·스킬 셀 타겟팅 패리티 3슬라이스) · `docs/plans/2026-07-12-status-effects-design.md` (5종 키워드 매핑 + 스턴 패턴 미러 엔진 셰이프 + 보드 배지/틱 VFX + 슬라이스 3단).
- ⚠ 히스토리 노트: agy 러너(아이콘 회차)가 도는 동안 반응성 소스 수정이 진행돼 러너 커밋 `86e8ffb`에 아이콘+반응성 소스가 섞여 들어감(게이트는 GREEN·critic PASS — 내용 무결). NEEDS_HUMAN STOP도 같은 동시편집 아티팩트라 확인 후 해제. **러너 가동 중 repo 편집 금지 재확인.**

## 2026-07-12 (overnight agy lane) — magnetic_repulse skill icon generated
- Status: Done; `make check` green (1008 tests).
- Changed: generated `magnetic_repulse.png` skill icon matching the `magnetic_pull.png` reference image and style guidelines; promoted the icon from staging outputs to `resources/neo-seoul/skills/magnetic_repulse.png`.
- Verified: run `make check` (all tests, types, lint, and build green); inspected size and dimensions of the generated icon.
- Blockers: None.
- Next: human play-feel QA of the new skill mechanics and icons.

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

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

# Portrait combat visual hierarchy — "보드가 주인공"

Date: 2026-07-17. Status: slices 1-4 SHIPPED (this doc = the hierarchy verdict the owner asked for:
"전체적인 전투화면에서 뭘 강조해서 보여줘야하고, 뭘 작게 보여줘야할지"). Owner real-device findings
that triggered it: board too small vs console · cinema skill card overlapping both unit cards ·
simulator forcing a boon pick.

## Hierarchy verdict (portrait touch combat)

| Tier | Element | Treatment |
|---|---|---|
| **1 — dominant** | 전장 보드 | The screen's protagonist: explicit height band (`100dvh − 176px chrome − 30dvh dock`), canvas HEIGHT-fits the band (grow-only), width overflow pans (pan-x + drag-pan). Board-first scroll pins it to the viewport top on combat entry. |
| **2 — always at thumb** | 행동/스킬/소모품 dock | Compact tool shelf, NOT a co-star: 38→**30dvh**, tighter padding, own scroll. |
| **3 — thin, glanceable** | 턴 순서 스트립 · 현재 턴/FOCUS 라인 | One line each, directly above/inside the band. |
| **4 — scrolls away** | 제목/교전 배경/학습 목표 배너/회전 힌트 | Above the pinned board; reachable by scrolling up, invisible during the fight. |
| **5 — below the fold** | 타일 정보 · PARTY/ENEMY 로스터 · 전투 로그 · 범례 | Between board and dock / under it; reference material, not the loop. |

Principle: the turn loop is **look at the board → tap an action** — everything else is either one
thin line or a scroll away. (Same LC5/LC6 logic that fixed landscape, applied vertically.)

## Shipped slices

1. **Board band + height-fit**: `index.css` "Portrait combat board band" + `combatCanvas.ts`
   `isPortraitCoarse` grow-only fit (mirrors LC1's shrink-fit inverted). 390×844 measured:
   canvas 273→**389px tall (554 wide, pans)**; board > dock (253px) for the first time.
2. **Board-first scroll**: bottom-stick suppressed while a fight runs; `boardWrapRef.scrollIntoView`
   pins the band top on entry (re-pin at 120/400ms — canvas fit + banners shift layout after mount).
3. **Cinema cards scale on narrow portrait**: fixed 220/240px cards (≈680px total) → 27/31vw
   (measured 105+121+105=331px on 390): attacker/skill/target keep separate lanes, no overlap.
4. **Simulator = straight to combat**: sim entry snapshot drops `boons` — no run-boon draft modal.

Locks: `tests/test_portrait_combat_dock.py` (7). Evidence: `outputs/live-qa/manual-20260717-portrait-board/`
(board-dominant screenshot, wrapperTop 0, boardFullyVisible true, boonOverlay false, console clean).

## Deliberately NOT done (candidates if the owner still wants more board)

- Rotate-hint/goal-banner auto-suppression in portrait (saves ~90px of tier-4 chrome).
- Initial camera auto-center on the party↔enemy midpoint (enemies can start off the panned view;
  turn strip + targets list carry awareness meanwhile).
- TARGETS list → chips row (board tap is the primary targeting path; list is tier-5 redundancy).
- 176px chrome constant → measured `--combat-chrome-h` custom property if devices vary.

## Remaining human verdict

Real-device feel (§2 of the QA guide): band height vs thumb reach, pan feel with the bigger board,
cinema readability at 27vw, and whether tier-4 chrome scrolling away ever disorients.

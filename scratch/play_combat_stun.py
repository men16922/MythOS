# ruff: noqa: E402
"""Combat autoplayer — drive the local sim to capture STUN (💫) and SLAM (💥) VFX.

Points at an already-running `make api` server (default :8000, DEFAULT_BGM_ON=false).
Enters the boot → combat simulator, dismisses the boon draft + tutorial, then drives
turns purely through the DOM action console (CombatControls is DOM; the board/badges
are canvas but Playwright screenshots capture them). Detection of stun/slam is via the
DOM combat-log text (기절 / 충돌). Screenshots land in the evidence dir.

Interaction model (verified in CombatControls.tsx):
  - enemy targets  = .cc-btn.tgt:not(.friendly); text carries "· 사거리 밖" when out of range
  - a skill main button .cc-skill auto-targets the selected target (no board click)
  - attack/defend/wait = .cc-btn
Strategy per controllable turn: select nearest in-range enemy, try a stun skill
(기절), else pull it closer (당기기, may slam into a wall), else defend while enemies
approach. Loop until a stun is logged, combat ends, or the round cap.
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
APP_URL = f"{BASE}/"  # NO ?fallback=1 → combat VFX render
OUT = Path(__file__).parent.parent / "outputs" / "live-qa" / "manual-20260713-combat" / "auto"
OUT.mkdir(parents=True, exist_ok=True)
MAX_STEPS = 70


def log(*a):
    print("[auto]", *a, flush=True)


def shot(page, name):
    p = OUT / name
    page.screenshot(path=str(p))
    log("screenshot", name)


def main():
    stun_captured = False
    slam_captured = False
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(APP_URL)

        # Boot → ENTER
        page.wait_for_selector(".boot-enter-btn", timeout=15000)
        page.click(".boot-enter-btn")
        page.wait_for_timeout(1500)

        # Force KO so log keywords (기절/충돌/사거리 밖) match.
        try:
            lt = page.locator(".lang-toggle")
            if lt.count() and lt.first.inner_text(timeout=1000).strip().upper() == "KO":
                lt.first.click()  # toggle shows the OTHER lang; "KO" label ⇒ currently EN
                page.wait_for_timeout(400)
        except Exception as e:
            log("lang toggle skipped:", e)

        # Open the combat simulator, select party (Su-a + Han + Lin Yue), start.
        page.wait_for_selector("#combat-simulator", timeout=10000)
        try:
            page.locator("#combat-simulator summary").click()
        except Exception:
            pass
        page.wait_for_timeout(300)
        want = ["Su-a", "수아", "Han", "한", "Lin Yue", "린위에"]
        for lab in page.locator(".sim-ally").all():
            txt = lab.inner_text()
            cb = lab.locator("input[type=checkbox]")
            on = any(w in txt for w in want)
            if cb.is_checked() != on:
                cb.click()
        # Melee encounter (enforcers with shock batons) so enemies close into
        # EMP-Pulse range (2) instead of being killed at distance like patrol drones.
        try:
            page.select_option("#sim-encounter", "enforcer_standoff")
            page.wait_for_timeout(200)
        except Exception as e:
            log("encounter select skipped:", e)
        page.click("#sim-start")
        log("sim started (enforcer_standoff)")

        # Wait for the tactical board.
        for _ in range(40):
            if "TACTICAL BOARD" in page.inner_text("body") or page.locator("canvas").count():
                break
            page.wait_for_timeout(500)
        page.wait_for_timeout(1500)

        # Dismiss the boon draft (any augment card) — detect the modal by class, not
        # text (names are localized). Loop in case more than one card round appears.
        for _ in range(3):
            if not page.locator(".boon-overlay").count():
                break
            cards = page.locator(".boon-card")
            if not cards.count():
                break
            log("dismiss boon: clicking first .boon-card")
            cards.first.click()
            page.wait_for_timeout(900)
        # Skip the first-combat guide (bilingual; it doesn't modal-block but tidy anyway).
        for label in ("Skip", "건너뛰기", "건너뛰기 ▸"):
            sk = page.locator(f"button:has-text('{label}')")
            if sk.count():
                try:
                    sk.first.click()
                    page.wait_for_timeout(400)
                except Exception:
                    pass
                break
        shot(page, "10-board-round-start.png")

        for step in range(MAX_STEPS):
            # A boon/reward draft can reappear mid-run and modal-blocks the console.
            if page.locator(".boon-overlay").count() and page.locator(".boon-card").count():
                page.locator(".boon-card").first.click()
                page.wait_for_timeout(700)
            body = page.inner_text("body")

            # Combat resolved?
            if any(
                k in body for k in ("전리품", "승리", "패배", "획득 / 변화", "VICTORY", "DEFEAT")
            ):
                log("combat ended at step", step)
                shot(page, f"90-combat-end-step{step:02d}.png")
                break

            skills = page.locator(".cc-skill")
            if not skills.count():
                # Not a controllable turn (enemy acting) — let it resolve.
                page.wait_for_timeout(900)
                continue

            # Controllable turn. Enumerate enemy targets.
            enemy_btns = [
                b
                for b in page.locator(".cc-btn.tgt").all()
                if "friendly" not in (b.get_attribute("class") or "")
            ]
            if not enemy_btns:
                # nothing to target — wait/defend
                _click_first(page, [".cc-btn"], text="대기")
                page.wait_for_timeout(600)
                continue

            def out_of_range(txt):
                return "사거리밖" in txt or "사거리 밖" in txt

            in_range = [b for b in enemy_btns if not out_of_range(b.inner_text())]
            target = (in_range or enemy_btns)[0]
            tgt_txt = target.inner_text().replace("\n", " ")[:50]
            oor = out_of_range(target.inner_text())
            target.click()
            page.wait_for_timeout(200)

            def cast(keywords):
                for s in skills.all():
                    st = s.inner_text()
                    if any(k in st for k in keywords) and not s.is_disabled():
                        s.click()
                        return True
                return False

            if oor:
                # Enemy still approaching — DEFEND (survive; do NOT damage, so the
                # target lives long enough to enter stun range 2).
                if not _click_first(page, [".cc-btn"], text="방어"):
                    _click_first(page, [".cc-btn"], text="대기")
                action = "defend (await approach)"
            elif not stun_captured and cast(["기절"]):
                action = f"STUN cast on [{tgt_txt}]"
            elif not slam_captured and cast(["당기기", "견인"]):
                action = f"PULL cast on [{tgt_txt}] (slam?)"
            elif stun_captured and _click_first(page, [".cc-btn"], text="공격"):
                action = "attack (finish)"
            else:
                if not _click_first(page, [".cc-btn"], text="방어"):
                    _click_first(page, [".cc-btn"], text="대기")
                action = "defend (fallback)"
            log(f"step {step}: {action}")

            page.wait_for_timeout(1300)  # let VFX play

            # Detect real events in the COMBAT LOG only (#combat-log). The skill
            # button label also contains "기절 · 1턴", so a whole-body scan false-
            # positives; the log carries the actual event ("회로를 마비시켰다! (기절 N턴)"
            # / "기절 상태로 움직이지 못한다" / "💥 … 충돌 피해").
            try:
                clog = page.locator("#combat-log").inner_text()
            except Exception:
                clog = ""
            if not stun_captured and "기절" in clog:
                stun_captured = True
                log(f"*** STUN captured at step {step} ***")
                shot(page, f"20-STUN-step{step:02d}.png")
            if not slam_captured and "충돌" in clog:
                slam_captured = True
                log(f"*** SLAM captured at step {step} ***")
                shot(page, f"30-SLAM-step{step:02d}.png")

            if step % 3 == 0:
                shot(page, f"15-progress-step{step:02d}.png")

            if stun_captured and slam_captured:
                log("both stun+slam captured — stopping")
                break

        shot(page, "99-final.png")
        browser.close()

    log("RESULT stun_captured=", stun_captured, "slam_captured=", slam_captured)
    return 0 if stun_captured else 4


def _click_first(page, selectors, text=None):
    for sel in selectors:
        loc = page.locator(sel)
        if text is not None:
            loc = loc.filter(has_text=text)
        if loc.count():
            try:
                loc.first.click()
                return True
            except Exception:
                continue
    return False


if __name__ == "__main__":
    sys.exit(main())

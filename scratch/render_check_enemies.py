# ruff: noqa: E402
"""Render-check the regenerated enemy sprites on the tactical board.

For each encounter covering the 4 regenerated enemies (shock_trooper_patrol,
mech_siege, tracker_ambush), enter the combat simulator (non-fallback so VFX/pose
swaps render), screenshot the spawn board, attack once to trigger a pose swap, and
record console errors + failed image requests. Evidence lands in
outputs/live-qa/manual-20260714-enemy-art/.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
OUT = Path(__file__).parent.parent / "outputs" / "live-qa" / "manual-20260714-enemy-art"
OUT.mkdir(parents=True, exist_ok=True)
ENCOUNTERS = ["shock_trooper_patrol", "mech_siege", "tracker_ambush"]


def log(*a):
    print("[render-check]", *a, flush=True)


def run_encounter(browser, enc, failures):
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors = []
    page.on(
        "console",
        lambda m: console_errors.append(m.text) if m.type == "error" else None,
    )
    bad_images = []
    page.on(
        "response",
        lambda r: bad_images.append(f"{r.status} {r.url}")
        if r.status >= 400 and r.url.endswith(".png")
        else None,
    )

    page.goto(BASE + "/")  # no ?fallback=1 — pose swap/VFX must render
    page.wait_for_selector(".boot-enter-btn", timeout=15000)
    page.click(".boot-enter-btn")
    page.wait_for_timeout(1200)

    page.wait_for_selector("#combat-simulator", timeout=10000)
    try:
        page.locator("#combat-simulator summary").click()
    except Exception:
        pass
    page.wait_for_timeout(300)
    page.select_option("#sim-encounter", enc)
    page.wait_for_timeout(200)
    page.click("#sim-start")
    log(enc, "sim started")

    for _ in range(40):
        if page.locator("canvas").count():
            break
        page.wait_for_timeout(500)
    page.wait_for_timeout(1500)

    # Dismiss boon draft + first-combat guide.
    for _ in range(3):
        if not (page.locator(".boon-overlay").count() and page.locator(".boon-card").count()):
            break
        page.locator(".boon-card").first.click()
        page.wait_for_timeout(800)
    for label in ("Skip", "건너뛰기"):
        sk = page.locator(f"button:has-text('{label}')")
        if sk.count():
            try:
                sk.first.click()
                page.wait_for_timeout(400)
            except Exception:
                pass
            break

    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / f"{enc}-1-spawn.png"))
    log(enc, "spawn screenshot")

    # One attack on the first in-range enemy to trigger a pose swap / hit flash.
    acted = False
    for step in range(12):
        if page.locator(".boon-overlay").count() and page.locator(".boon-card").count():
            page.locator(".boon-card").first.click()
            page.wait_for_timeout(700)
        if not page.locator(".cc-skill").count():
            page.wait_for_timeout(800)
            continue
        enemies = [
            b
            for b in page.locator(".cc-btn.tgt").all()
            if "friendly" not in (b.get_attribute("class") or "")
        ]
        in_range = [
            b for b in enemies if "사거리" not in b.inner_text() and "Out of range" not in b.inner_text()
        ]
        if not in_range:
            atk = page.locator(".cc-btn").filter(has_text="대기")
            if not atk.count():
                atk = page.locator(".cc-btn").filter(has_text="Wait")
            if atk.count():
                atk.first.click()
            page.wait_for_timeout(900)
            continue
        in_range[0].click()
        page.wait_for_timeout(200)
        atk = page.locator(".cc-btn").filter(has_text="공격")
        if not atk.count():
            atk = page.locator(".cc-btn").filter(has_text="Attack")
        if atk.count():
            atk.first.click()
            page.wait_for_timeout(450)  # mid-swing: hit/attack pose frame
            page.screenshot(path=str(OUT / f"{enc}-2-action.png"))
            page.wait_for_timeout(1200)
            page.screenshot(path=str(OUT / f"{enc}-3-settled.png"))
            log(enc, f"action screenshots at step {step}")
            acted = True
            break
    if not acted:
        page.screenshot(path=str(OUT / f"{enc}-2-noaction.png"))
        log(enc, "WARN: no controllable attack turn reached")

    if console_errors:
        failures.append(f"{enc} console errors: {console_errors[:5]}")
    if bad_images:
        failures.append(f"{enc} failed images: {bad_images[:10]}")
    page.close()


def main():
    failures: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for enc in ENCOUNTERS:
            try:
                run_encounter(browser, enc, failures)
            except Exception as e:
                failures.append(f"{enc} EXCEPTION: {e}")
        browser.close()
    for f in failures:
        log("FAIL:", f)
    log("RESULT", "PASS" if not failures else f"{len(failures)} failure groups")
    return 0 if not failures else 3


if __name__ == "__main__":
    sys.exit(main())

# ruff: noqa: E402
"""Render-check the turn-order strip (two-tier slice 4) in the local sim."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
OUT = Path(__file__).parent.parent / "outputs" / "live-qa" / "manual-20260714-turn-strip"
OUT.mkdir(parents=True, exist_ok=True)


def log(*a):
    print("[strip-check]", *a, flush=True)


def main():
    failures = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(BASE + "/")
        page.wait_for_selector(".boot-enter-btn", timeout=15000)
        page.click(".boot-enter-btn")
        page.wait_for_timeout(1200)
        page.wait_for_selector("#combat-simulator", timeout=10000)
        try:
            page.locator("#combat-simulator summary").click()
        except Exception:
            pass
        page.wait_for_timeout(300)
        page.select_option("#sim-encounter", "shock_trooper_patrol")
        page.click("#sim-start")
        for _ in range(40):
            if page.locator("canvas").count():
                break
            page.wait_for_timeout(500)
        page.wait_for_timeout(1500)
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
        page.wait_for_timeout(600)

        strip = page.locator(".turn-order-strip")
        chips = page.locator(".turn-chip")
        if not strip.count():
            failures.append("strip not rendered")
        else:
            n = chips.count()
            log(f"strip rendered with {n} chips")
            if n < 2:
                failures.append(f"only {n} chips")
            active = page.locator(".turn-chip-active")
            if not active.count():
                failures.append("no active chip highlight")
            imgs = page.locator(".turn-chip-img")
            log(f"chips with sprite thumbs: {imgs.count()}")
        page.screenshot(path=str(OUT / "strip-board.png"))
        # zoomed crop of the strip region
        if strip.count():
            strip.first.screenshot(path=str(OUT / "strip-closeup.png"))
        if errors:
            failures.append(f"console errors: {errors[:5]}")
        browser.close()
    for f in failures:
        log("FAIL:", f)
    log("RESULT", "PASS" if not failures else "FAIL")
    return 0 if not failures else 3


if __name__ == "__main__":
    sys.exit(main())

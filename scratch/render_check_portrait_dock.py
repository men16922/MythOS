# ruff: noqa: E402
"""Verify the portrait combat action dock: board + docked console co-visible
at scrollY=0 on a 390x844 touch viewport (no scroll loop to act)."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
OUT = Path(__file__).parent.parent / "outputs" / "live-qa" / "manual-20260714-portrait-dock"
OUT.mkdir(parents=True, exist_ok=True)


def log(*a):
    print("[dock-check]", *a, flush=True)


def main():
    failures = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
        )
        page = ctx.new_page()
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
        # First-visit legend popup auto-opens — close it so it can't overlap.
        toggle = page.locator(".tactical-legend-toggle[aria-expanded='true']")
        if toggle.count():
            try:
                toggle.first.click()
                page.wait_for_timeout(300)
            except Exception:
                pass
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
        # Realistic mid-combat state: dismiss the one-time rotate hint and the
        # encounter-background banner so the board is what shares the screen.
        for sel in ("button:has-text('Got it')", ".combat-learning-goal-close"):
            btn = page.locator(sel)
            if btn.count():
                try:
                    btn.first.click()
                    page.wait_for_timeout(250)
                except Exception:
                    pass
        # Legend popup can (re)open on fresh profiles — close before measuring.
        toggle = page.locator(".tactical-legend-toggle[aria-expanded='true']")
        if toggle.count():
            try:
                toggle.first.click()
                page.wait_for_timeout(300)
            except Exception:
                pass
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(300)

        metrics = page.evaluate(
            """() => {
              const cc = document.getElementById('combat-controls');
              const canvas = document.getElementById('combat');
              const ccr = cc ? cc.getBoundingClientRect() : null;
              const cvr = canvas ? canvas.getBoundingClientRect() : null;
              const style = cc ? getComputedStyle(cc) : null;
              return {
                scrollY: window.scrollY,
                vh: window.innerHeight,
                ccPosition: style ? style.position : null,
                ccTop: ccr ? Math.round(ccr.top) : null,
                ccBottom: ccr ? Math.round(ccr.bottom) : null,
                canvasTop: cvr ? Math.round(cvr.top) : null,
                canvasVisible: cvr ? cvr.top < window.innerHeight && cvr.bottom > 0 : false,
                actionBtns: cc ? cc.querySelectorAll('.cc-btn, .cc-skill').length : 0,
              };
            }"""
        )
        log("metrics:", metrics)
        if metrics["ccPosition"] != "fixed":
            failures.append(f"console not docked (position={metrics['ccPosition']})")
        if not metrics["canvasVisible"]:
            failures.append("board canvas not visible at scrollY=0")
        if metrics["ccBottom"] is None or abs(metrics["ccBottom"] - metrics["vh"]) > 4:
            failures.append(
                f"dock not flush to viewport bottom ({metrics['ccBottom']} vs {metrics['vh']})"
            )
        if metrics["actionBtns"] < 1:
            failures.append("no action buttons inside the dock")
        page.screenshot(path=str(OUT / "portrait-dock.png"))
        # An action must be tappable without scrolling: tap the first visible action.
        atk = page.locator("#combat-controls .cc-btn").first
        if atk.count():
            try:
                atk.click(timeout=3000)
                log("tapped first action without scrolling")
                page.wait_for_timeout(900)
                page.screenshot(path=str(OUT / "portrait-after-tap.png"))
            except Exception as e:
                failures.append(f"action tap failed: {e}")
        if errors:
            failures.append(f"console errors: {errors[:5]}")
        browser.close()
    for f in failures:
        log("FAIL:", f)
    log("RESULT", "PASS" if not failures else "FAIL")
    return 0 if not failures else 3


if __name__ == "__main__":
    sys.exit(main())

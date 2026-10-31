"""Play the live game on a deployed URL through real clicks: a combat-sandbox fight and a short run.

  .venv/bin/python scripts/dev/url_smoke.py --url https://<service>.run.app
  make url-smoke URL=https://<service>.run.app

`make verify-preview` proves a revision serves the committed bundle; it never plays a card. This does, using only what a
player can click (the dev-only `window.__m2` hook does not exist in production builds, so `ui_playthrough.py` cannot
drive a deployed site). Anonymous and muted (`?mute=1`), one browser tab, no sign-in, nothing written server-side.

1. Sandbox fight: `/?sandbox=combat&enc=a1_n1_dodge`, `enemies→1hp`, play cards until the HUD says WON.
2. Run flow: New loop → Connect → intro → event → recruit → directive → map → fight, until the first fight ends
   (a defeat counts: the blind clicker does not plan, so this checks transitions, not balance).

Exit 0 = both passed with no console/page errors. Sound and Google sign-in are not covered.
"""

from __future__ import annotations

import argparse
import sys
import time

from playwright.sync_api import Page, sync_playwright

SANDBOX_TILES = [(530, 300), (640, 300), (560, 350), (540, 420), (520, 230), (700, 280)]


def visible(page: Page, selector: str) -> list:
    loc = page.locator(selector)
    return [loc.nth(i) for i in range(loc.count()) if loc.nth(i).is_visible()]


def click(page: Page, selector: str) -> bool:
    for item in visible(page, selector)[:1]:
        try:
            item.click(timeout=1500, force=True)  # pulsing buttons are never 'stable'
            return True
        except Exception:
            return False
    return False


def play_cards(page: Page, tiles: list[tuple[int, int]]) -> None:
    for key in "12345":
        page.keyboard.press(key)
        page.wait_for_timeout(250)
        for xy in tiles:
            page.mouse.click(*xy)
            page.wait_for_timeout(120)
        page.keyboard.press("Escape")


def sandbox_fight(page: Page, base: str) -> tuple[bool, str]:
    page.goto(
        f"{base}/?sandbox=combat&mute=1&enc=a1_n1_dodge", wait_until="networkidle", timeout=60000
    )
    page.wait_for_timeout(2000)
    page.get_by_role("button", name="enemies→1hp").click()
    page.wait_for_timeout(500)
    click(page, "button:has-text('튜토리얼 건너뛰기'), button:has-text('Skip tutorial')")
    for turn in range(1, 7):
        play_cards(page, SANDBOX_TILES)
        if "WON" in page.locator("body").inner_text():
            return True, f"won on turn {turn}"
        page.keyboard.press("e")
        page.wait_for_timeout(3500)
    return False, "no WON after 6 turns"


def screen_kind(page: Page) -> str:
    if visible(page, "[data-testid=recruit-scene]"):
        return "recruit"
    if visible(page, "[data-testid=directive-opt-1]"):
        return "directive"
    if visible(page, ".m2c-bottom, .m2c-board"):
        return "combat"
    if visible(page, ".m2-node.is-reach"):
        return "map"
    return "intro" if "Go in" in page.locator("body").inner_text() else "other"


def run_flow(page: Page, base: str, max_seconds: float) -> tuple[bool, str]:
    page.goto(f"{base}/?mute=1", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(1500)
    page.get_by_role("button", name="New loop").click()
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="Connect").click()
    seen: list[str] = []
    fought = False
    deadline = time.time() + max_seconds
    while time.time() < deadline:
        page.wait_for_timeout(700)
        kind = screen_kind(page)
        if not seen or seen[-1] != kind:
            seen.append(kind)
        if kind == "recruit":
            click(
                page,
                "button:has-text('Next'), button:has-text('Skip'), [data-testid=recruit-scene] button",
            )
        elif kind == "directive":
            click(page, "[data-testid=directive-opt-1]")
        elif kind == "intro":
            click(page, "button:has-text('Go in')")
        elif kind == "map":
            if fought:
                return True, " → ".join(seen)
            click(page, ".m2-node.is-reach")
        elif kind == "combat":
            fought = True
            play_cards(page, SANDBOX_TILES[:5])
            page.keyboard.press("e")
            page.wait_for_timeout(3500)
        else:
            if (
                "Back to the Archive" in page.locator("body").inner_text()
                or "Forced Erasure" in page.locator("body").inner_text()
            ):
                return fought, " → ".join(seen) + " → end"
            click(
                page,
                "button:has-text('Skip'), button:has-text('Leave both'), button:has-text('Continue'), button:has-text('Take'), button:has-text('Leave')",
            )
    return False, "timed out: " + " → ".join(seen)


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--url", required=True, help="base URL of the deployed service")
    ap.add_argument("--max-seconds", type=float, default=240.0, help="budget for the run-flow part")
    args = ap.parse_args()
    base = args.url.rstrip("/")
    errors: list[str] = []
    results: list[tuple[str, bool, str]] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: (
                errors.append(f"console: {m.text}")
                if m.type == "error" and "Failed to load resource" not in m.text
                else None
            ),
        )
        for name, fn in (
            ("sandbox fight", lambda: sandbox_fight(page, base)),
            ("run flow", lambda: run_flow(page, base, args.max_seconds)),
        ):
            try:
                ok, why = fn()
            except Exception as exc:
                ok, why = False, f"crashed: {str(exc).splitlines()[0][:200]}"
            results.append((name, ok, why))
        browser.close()
    for name, ok, why in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}: {why}")
    print(
        f"{'PASS' if not errors else 'FAIL'}  console/page errors: {len(errors)}"
        + (f" — first: {errors[0][:200]}" if errors else "")
    )
    return 0 if all(ok for _, ok, _ in results) and not errors else 1


if __name__ == "__main__":
    sys.exit(main())

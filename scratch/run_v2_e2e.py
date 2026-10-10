# ruff: noqa: I001
"""Mythos 2.0 browser smoke: title → setup → prologue → act intro → opening event → map → first fight.

Headless Chromium against a throwaway uvicorn on :8082, always with ``?mute=1`` (no audio graph is
ever created). Fails on any page error / console error or if a screen never appears.
Run: ``make test-e2e-v2`` (needs a built SPA: ``make frontend-build``).
"""

import multiprocessing
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import uvicorn
from playwright.sync_api import Page, sync_playwright

from mythos_api.app import create_app

PORT = 8082
APP_URL = f"http://127.0.0.1:{PORT}/?mute=1"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"


def run_server() -> None:
    uvicorn.run(create_app(), host="127.0.0.1", port=PORT, log_level="error")


def shot(page: Page, name: str) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    page.screenshot(path=str(OUTPUT_DIR / f"e2e_v2_{name}.png"))


def click_through_act_intro(page: Page) -> None:
    for _ in range(6):
        intro = page.locator(".m2-actintro")
        if intro.count() == 0 or not intro.first.is_visible():
            return
        intro.first.click()
        page.wait_for_timeout(700)


def main() -> int:
    server = multiprocessing.Process(target=run_server, daemon=True)
    server.start()
    errors: list[str] = []
    try:
        for _ in range(60):
            try:
                import urllib.request

                urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/v2/health", timeout=1)
                break
            except Exception:
                time.sleep(0.5)
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
            page.on(
                "console",
                lambda msg: errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None,
            )

            page.goto(APP_URL)
            page.evaluate(
                "() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mythos2')) "
                "localStorage.removeItem(k); sessionStorage.clear(); localStorage.setItem('mythos2.mute', '1') }"
            )
            page.goto(APP_URL)
            page.get_by_role("button", name=re.compile("새 루프|New Loop")).first.click()
            print("title → setup")

            page.get_by_role("button", name=re.compile(r"^\s*(접속|Connect)\s*$")).first.click()
            page.wait_for_timeout(600)
            page.keyboard.press("Escape")  # skip the loop-1 prologue
            page.wait_for_selector(".m2-actintro", timeout=10000)
            shot(page, "act_intro")
            click_through_act_intro(page)
            print("act intro → opening event")

            page.wait_for_selector(".m2-options .m2-option", timeout=10000)
            shot(page, "event")
            page.locator(".m2-options .m2-option:not(.is-locked)").first.click()
            page.get_by_role("button", name=re.compile("계속|Continue")).first.click(timeout=10000)
            page.wait_for_timeout(800)

            # Optional follow-ups of the opening choice: a card reward fan or a card picker.
            if page.locator(".m2-choice").count() > 0:
                page.locator(".m2-choice__slot").first.click(force=True)
                page.wait_for_timeout(900)
            print("event resolved → map")

            page.wait_for_selector(".m2-node.is-reach", timeout=10000)
            shot(page, "map")
            page.locator(".m2-node.is-reach").first.click(force=True)  # reachable nodes pulse forever
            page.wait_for_selector(".m2c-root", timeout=15000)
            page.wait_for_timeout(2500)  # boss/encounter intro + coach marks
            shot(page, "combat")
            print("map → combat")

            # Dismiss the first-combat coach marks if present, then cycle a few turns.
            skip = page.get_by_role("button", name=re.compile("건너뛰기|Skip"))
            if skip.count() > 0 and skip.first.is_visible():
                skip.first.click()
            for _ in range(3):
                page.keyboard.press("e")
                page.wait_for_timeout(3500)
            shot(page, "combat_after_turns")
            if page.locator(".m2c-root").count() == 0 and page.locator(".m2-choice, .m2-ending").count() == 0:
                errors.append("combat screen vanished without a reward/ending screen")
            browser.close()
    finally:
        server.terminate()

    if errors:
        print("FAILED:")
        for e in errors:
            print("  ", e)
        return 1
    print("Mythos 2.0 browser smoke passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Mythos 2.0 browser smoke: title → setup → prologue → act intro → opening event → map → first fight, then the
online pieces in open mode: the account chip (sign-in ends in the graceful "not open yet" line), the daily
leaderboard from the title, and a daily run that ends (abandoned) and posts its rank to the local server.

Headless Chromium against a throwaway uvicorn (``E2E_PORT``, default: a free port; never 8010/5173), always with
``?mute=1`` (no audio graph is ever created), one tab. Fails on any page error / console error or if a screen never
appears. The server runs on the in-memory store with ``MYTHOS_AUTH=open`` and no Firebase web config (``/config`` →
``firebase: null``), so nothing reaches the local dev database and the sign-in path is hermetic. ``E2E_STATIC_DIR`` serves another SPA build instead of ``src/mythos_api/static``.
Run: ``make test-e2e-v2`` (needs a built SPA: ``make frontend-build``).
"""

import multiprocessing
import os
import re
import socket
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import uvicorn
from playwright.sync_api import Page, sync_playwright

from mythos_api.app import create_app


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


# Chosen once in the parent and handed to the server process through the environment (spawn re-imports this file).
PORT = int(os.environ.setdefault("E2E_PORT", str(free_port())))
if PORT in (8010, 5173):
    raise SystemExit("E2E_PORT must not be one of the owner's dev ports (8010, 5173)")
APP_URL = f"http://localhost:{PORT}/?mute=1"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"
CLEAR_STORAGE = (
    "() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mythos2')) "
    "localStorage.removeItem(k); sessionStorage.clear(); localStorage.setItem('mythos2.mute', '1') }"
)


def run_server() -> None:
    # Hermetic: the in-memory store (never the local dev Postgres: leaderboard rows would show up there), open mode,
    # and no Firebase web config (a config without its keys reads as none).
    os.environ.setdefault("MYTHOS_V2_STORE", "memory")
    os.environ["MYTHOS_AUTH"] = "open"
    os.environ["MYTHOS_FIREBASE_WEB_CONFIG"] = "{}"
    static_dir = os.getenv("E2E_STATIC_DIR")
    if static_dir:
        import mythos_api.app as app_module

        app_module.STATIC_DIR = Path(static_dir)
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


def online_flow(page: Page, errors: list[str]) -> None:
    """Fresh profile: account chip → leaderboard from the title → a daily run that ends and posts its rank."""
    page.evaluate(CLEAR_STORAGE)
    page.goto(APP_URL)

    # Sign-in is not configured on this server: the chip answers with the graceful line, never a crash.
    page.locator(".m2-title__account .m2-account__chip").click()
    note = page.locator(".m2-title__account .m2-account__note.is-warn")
    note.wait_for(timeout=8000)
    if "아직 열리지 않았다" not in note.inner_text():
        errors.append(f"unexpected sign-in note: {note.inner_text()!r}")
    shot(page, "title_signin")
    print("account chip → not-configured note")

    # Leaderboard from the title's daily row.
    page.locator(".m2-menu-side").click()
    page.wait_for_selector(".m2-board", timeout=5000)
    page.wait_for_selector(
        ".m2-board__list, .m2-board__state:not(:has-text('불러오는'))", timeout=10000
    )
    if page.locator(".m2-board__state.is-offline").count() > 0:
        errors.append("leaderboard says offline against the local server")
    shot(page, "board_title")
    page.get_by_role("button", name=re.compile(r"^\s*(닫기|Close)\s*$")).last.click()
    print("title → leaderboard → close")

    # A daily run: set up, connect, reach the first event, abandon it from the pause menu.
    page.locator(".m2-menu-item--daily").click()
    page.get_by_role("button", name=re.compile(r"^\s*(접속|Connect)\s*$")).first.click()
    page.wait_for_timeout(600)
    page.keyboard.press("Escape")  # skip the loop-1 prologue
    page.wait_for_selector(".m2-actintro", timeout=10000)
    click_through_act_intro(page)
    page.wait_for_selector(".m2-options .m2-option", timeout=10000)
    page.locator("button[title^='메뉴']").first.click()
    page.get_by_role("button", name=re.compile("루프 포기")).click()
    page.get_by_role("button", name=re.compile(r"^\s*포기한다\s*$")).click()
    page.wait_for_selector(".m2-ending", timeout=10000)
    line = page.locator(".m2-ending__daily.is-ok .m2-ending__daily-line")
    line.wait_for(timeout=10000)
    text = line.inner_text()
    if not re.search(r"오늘 \d+위 / 총 \d+명", text) or "기록 갱신" not in text:
        errors.append(f"daily rank line looks wrong: {text!r}")
    page.wait_for_timeout(2600)  # let the tally finish counting
    shot(page, "daily_end_rank")
    print(f"daily run end → {text.strip()!r}")

    page.locator(".m2-ending__daily .m2-btn").click()
    page.wait_for_selector(".m2-board__row.is-me", timeout=10000)
    shot(page, "board_after_daily")
    page.get_by_role("button", name=re.compile(r"^\s*(닫기|Close)\s*$")).last.click()
    print("end screen → leaderboard shows my row")


def main() -> int:
    server = multiprocessing.Process(target=run_server, daemon=True)
    server.start()
    errors: list[str] = []
    try:
        for _ in range(60):
            try:
                import urllib.request

                urllib.request.urlopen(f"http://localhost:{PORT}/api/v2/health", timeout=1)
                break
            except Exception:
                time.sleep(0.5)
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
            page.on(
                "console",
                lambda msg: (
                    errors.append(f"console.{msg.type}: {msg.text}")
                    if msg.type == "error"
                    else None
                ),
            )

            page.goto(APP_URL)
            page.evaluate(CLEAR_STORAGE)
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
            page.locator(".m2-node.is-reach").first.click(
                force=True
            )  # reachable nodes pulse forever
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
            if (
                page.locator(".m2c-root").count() == 0
                and page.locator(".m2-choice, .m2-ending").count() == 0
            ):
                errors.append("combat screen vanished without a reward/ending screen")

            online_flow(page, errors)
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

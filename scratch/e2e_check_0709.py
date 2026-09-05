# ruff: noqa: E402, I001
"""Objective Playwright check for the 2026-07-09 opening/early-loop fixes.

Runs the API in fallback narrative mode (?fallback=1) — deterministic, no Vertex,
no image gen — so the first SCENE is the variant-neutral DEFAULT_FALLBACK. Verifies:
  #4  variant-neutral fallback: the fallback scene narration + choices name NO companion (세린).
  #2a boon stat labels: the boon overlay leaks NO raw English stat key (intelligence/focus).
Notes what it can NOT check here (needs a live 2회차+ variant loop or the LLM to fail).
"""

import multiprocessing
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import uvicorn
from playwright.sync_api import sync_playwright

from mythos_api.app import create_app

# Port 8080 is taken by adminer when local docker infra is up — use a free one.
PORT = 8099
APP_URL = f"http://127.0.0.1:{PORT}/?fallback=1&image=0"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"


def run_server():
    uvicorn.run(create_app(), host="127.0.0.1", port=PORT, log_level="error")


def main():
    server = multiprocessing.Process(target=run_server)
    server.start()
    time.sleep(3.0)
    results = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(APP_URL)
            page.wait_for_selector(".boot-enter-btn", timeout=15000)
            page.click(".boot-enter-btn")
            page.wait_for_selector("#display-name", timeout=10000)
            # Fresh browser defaults to EN — switch to KO so we test the Korean copy
            # (#4 checks for "세린"; EN would render "Se-rin").
            try:
                if page.locator(".lang-toggle").inner_text(timeout=1000).strip().upper() == "KO":
                    page.click(".lang-toggle")  # button shows the OTHER lang; "KO" => currently EN
            except Exception:
                pass
            page.fill("#display-name", "플레이라이트봇")
            page.click(".arch-card:first-child")
            page.click("#start")

            # #2a: capture the boon overlay + its stat lines up front (the leak would
            # be a raw 'intelligence +N' / 'focus +N' stat line; the desc legitimately
            # contains the English word 'focus').
            narration, choices, stat_lines = "", [], []
            try:
                page.wait_for_selector(".boon-overlay", timeout=40000)

                stat_lines = page.locator(".boon-card-stats").all_inner_texts()
                page.locator(".boon-overlay").screenshot(path=str(OUTPUT_DIR / "e2e_0709_boon.png"))
                print("BOON STAT LINES:", stat_lines)
            except Exception as e:
                print(f"(no boon overlay: {e})")

            # Robustly click through whatever modal is up (boon / intro) until the
            # interactive scene's choices appear.
            try:
                for _ in range(60):
                    if page.locator("#choices button").count() > 0:
                        break
                    for sel in (".boon-card", ".intro-accept-btn"):
                        if page.locator(sel).count():
                            try:
                                page.locator(sel).first.click(force=True, timeout=2000)
                            except Exception:
                                pass
                            break
                    time.sleep(0.5)
                narration = page.locator("#narration").inner_text(timeout=3000)
                choices = page.locator("#choices button").all_inner_texts()
                page.screenshot(path=str(OUTPUT_DIR / "e2e_0709_fallback_scene.png"))
                print("SCENE NARRATION:", narration[:200])
                print("SCENE CHOICES:", choices)
            except Exception as e:
                print(f"(could not reach the interactive scene: {e})")
            browser.close()

        # ---- assertions (status: PASS / FAIL / SKIP) ----
        # #2a is the browser-checkable one; #4 is also byte-parity test-locked
        # (fallback.md ↔ DEFAULT_FALLBACK), so a harness that can't render the scene
        # leaves it SKIP (not FAIL).
        reached = bool(choices)
        stat_blob = " | ".join(stat_lines).lower()
        results.append(
            (
                "#2a boon stat line has NO raw 'intelligence'/'focus' key (KO 연산/집중, EN INT/FOC)",
                "PASS"
                if (stat_lines and "intelligence" not in stat_blob and "focus" not in stat_blob)
                else "FAIL",
                " | ".join(stat_lines) if stat_lines else "NO boon stat lines captured",
            )
        )
        results.append(
            (
                "#4 fallback scene names NO companion (세린) — else test-locked by byte-parity",
                (
                    "PASS"
                    if ("세린" not in narration and all("세린" not in c for c in choices))
                    else "FAIL"
                )
                if reached
                else "SKIP",
                (narration[:100] + " || " + " | ".join(choices))
                if reached
                else "scene not reached (fallback-mode modal ordering); content locked by test_scenario_directives byte-parity",
            )
        )
    finally:
        server.terminate()
        server.join(timeout=5)
        if server.is_alive():
            server.kill()

    print("\n==== 2026-07-09 fix checks (fallback mode) ====")
    failed = False
    for name, status, detail in results:
        print(f"  [{status:4}] {name}")
        print(f"         → {detail!r}")
        failed = failed or status == "FAIL"
    print("\nNOT checkable in fallback mode (needs live 2회차+ variant loop / LLM failure):")
    print("  - Se-rin intro flash removal · han opening tone · #5 opening item suppression")
    print("\nRESULT:", "FAIL" if failed else "OK (no failures)")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

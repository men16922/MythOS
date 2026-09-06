# ruff: noqa: E402, I001
import multiprocessing
import os
import sys
import time
from pathlib import Path

# Add src to python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import uvicorn
from playwright.sync_api import sync_playwright

from mythos_api.app import create_app


APP_URL = "http://127.0.0.1:8080/?fallback=1&image=0"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"


def run_server():
    app = create_app()
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="error")


def wait_for_interactive_scene(page, *, timeout: int = 60000) -> None:
    page.wait_for_function(
        """
        () => {
          const status = document.querySelector('#status')?.textContent || '';
          const hasChoices = document.querySelectorAll('#choices button').length > 0;
          const hasCombat = !!document.querySelector('#combat');
          const hasEnded = document.body.textContent.includes('여정 종료');
          const hasError = status.startsWith('오류:');
          return hasChoices || hasCombat || hasEnded || hasError;
        }
        """,
        timeout=timeout,
    )
    status = page.locator("#status").inner_text() if page.locator("#status").count() else ""
    if status.startswith("오류:"):
        raise RuntimeError(status)


def page_diagnostics(page) -> str:
    body_text = page.locator("body").inner_text(timeout=1000)
    status = (
        page.locator("#status").inner_text(timeout=1000) if page.locator("#status").count() else ""
    )
    return (
        f"status={status!r}, "
        f"choices={page.locator('#choices button').count()}, "
        f"combat={page.locator('#combat').count()}, "
        f"body={body_text[:1200]!r}"
    )


def resolve_build_offers(page) -> None:
    """Accept blocking boon/echo offers before interacting with story choices."""
    for _ in range(3):
        overlay = page.locator(".boon-overlay")
        if overlay.count() == 0 or not overlay.is_visible():
            return
        heading = page.locator(".boon-modal-head").inner_text()
        button = page.locator(".boon-card:first-child")
        page.wait_for_function(
            "() => !document.querySelector('.boon-card:first-child')?.disabled",
            timeout=10000,
        )
        button.click()
        page.wait_for_function(
            """
            (previous) => {
              const overlay = document.querySelector('.boon-overlay');
              const heading = document.querySelector('.boon-modal-head')?.textContent || '';
              const button = document.querySelector('.boon-card:first-child');
              return !overlay || (heading !== previous && button && !button.disabled);
            }
            """,
            arg=heading,
            timeout=10000,
        )
    if page.locator(".boon-overlay").count():
        raise RuntimeError("Build offer overlay did not settle. " + page_diagnostics(page))


def run_test():
    server_process = multiprocessing.Process(target=run_server)
    server_process.start()
    browser = None

    # Wait for server to boot
    time.sleep(3.0)

    print("Testing started. Connecting via Playwright...")
    try:
        with sync_playwright() as p:
            # Headless run
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Listen to browser console and errors
            page.on(
                "pageerror", lambda exc: print(f"❌ JavaScript Page Error: {exc}", file=sys.stderr)
            )
            page.on("console", lambda msg: print(f"ℹ️ Browser Console [{msg.type}]: {msg.text}"))

            print(f"Navigating to {APP_URL}...")
            page.goto(APP_URL)

            print(f"Page title: {page.title()}")

            # First-entry boot intro overlay — dismiss it to reach onboarding.
            print("Dismissing boot intro...")
            page.wait_for_selector(".boot-enter-btn", timeout=15000)
            page.click(".boot-enter-btn")

            print("Entering player name...")
            page.wait_for_selector("#display-name", timeout=10000)
            page.fill("#display-name", "플레이라이트봇")

            print("Selecting Netrunner archetype...")
            page.click(".arch-card:first-child")

            print("Clicking '접속 · 루프 시작'...")
            page.click("#start")

            # Session-start cinematic (session_intro) — accept to reach the board.
            print("Accepting session intro cinematic...")
            page.wait_for_selector(".intro-accept-btn", timeout=40000)
            page.click(".intro-accept-btn")

            print("Waiting for main dashboard view...")
            page.wait_for_selector("#play", timeout=30000)
            print("Logged in successfully. Game screen loaded!")

            print("Waiting for narrative typewriter stream to finish...")
            wait_for_interactive_scene(page)
            resolve_build_offers(page)
            print("Checking achievements dashboard in both languages...")
            # Tab order: story · character · skills · codex — the progress
            # dashboard (achievements + run history) lives under Codex now.
            page.locator(".tab-btn").nth(3).click()
            page.wait_for_selector(".achievements-section", timeout=15000)
            if page.locator(".achievement-totals > div").count() != 3:
                raise RuntimeError("Expected three cumulative achievement totals")
            if page.locator(".achievement-group").nth(0).locator(".achievement-row").count() != 4:
                raise RuntimeError("Expected four companion recruitment milestones")
            if page.locator(".achievement-group").nth(1).locator(".achievement-row").count() != 6:
                raise RuntimeError("Expected six companion upgrade milestones")
            heading_before = page.locator("#achievements-heading").text_content()
            page.click(".lang-toggle")
            heading_after = page.locator("#achievements-heading").text_content()
            if {heading_before, heading_after} != {"Achievements", "업적"}:
                raise RuntimeError(
                    f"Achievement heading did not localize: {heading_before!r} -> {heading_after!r}"
                )
            achievements_path = str(OUTPUT_DIR / "e2e_achievements.png")
            page.locator(".achievements-section").screenshot(path=achievements_path)
            print(f"Achievements dashboard verified: {achievements_path}")
            page.locator(".tab-btn").nth(2).click()
            page.wait_for_selector(".skill-tree-graph", timeout=15000)
            if page.locator(".skill-tree-summary > span").count() != 3:
                raise RuntimeError("Expected learned/available/locked skill summary")
            if page.locator(".skill-tree-column").count() < 2:
                raise RuntimeError("Expected dependency-based skill graph columns")
            if page.locator(".skill-tree-item").count() == 0:
                raise RuntimeError("Expected skill nodes in the graph")
            skill_tree_path = str(OUTPUT_DIR / "e2e_skill_tree.png")
            page.locator("#skill-tab-content").screenshot(path=skill_tree_path)
            print(f"Skill tree graph verified: {skill_tree_path}")
            page.locator(".tab-btn").nth(0).click()
            if page.locator("#choices button").count() == 0:
                raise RuntimeError(
                    "Expected narrative choices after begin. " + page_diagnostics(page)
                )

            # Capture screenshot
            screenshot_path = str(OUTPUT_DIR / "e2e_react_play.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            print(f"Capturing screenshot: {screenshot_path}")
            page.screenshot(path=screenshot_path)

            # Read first choice label
            first_choice = page.locator("#choices button:first-child")
            first_choice_text = first_choice.locator(".cmd-label").text_content()
            print(f"First choice text: {first_choice_text}")

            print("Clicking first choice to progress turn...")
            first_choice.click()

            page.wait_for_function(
                "() => document.querySelectorAll('#choices button').length === 0",
                timeout=10000,
            )

            # Wait for turn 1 streaming
            print("Waiting for next narrative turn typewriter...")
            wait_for_interactive_scene(page)

            # Capture screenshot after turn 1 choice
            screenshot_path_turn1 = str(OUTPUT_DIR / "e2e_react_play_turn1.png")
            print(f"Capturing second screenshot: {screenshot_path_turn1}")
            page.screenshot(path=screenshot_path_turn1)

            print("Automated browser test completed successfully!")
            browser.close()
    except Exception as e:
        print(f"E2E Test Failed: {e}", file=sys.stderr)
        try:
            if "page" in locals():
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                page.screenshot(path=str(OUTPUT_DIR / "e2e_failure.png"))
                print("Failure diagnostics: " + page_diagnostics(page), file=sys.stderr)
        except Exception as diag_error:
            print(f"Failed to capture diagnostics: {diag_error}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        print("Stopping uvicorn server...")
        server_process.terminate()
        server_process.join(timeout=5)
        if server_process.is_alive():
            server_process.kill()
            server_process.join(timeout=5)


if __name__ == "__main__":
    run_test()

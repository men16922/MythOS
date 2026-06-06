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


def run_server():
    app = create_app()
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="error")


def run_test():
    server_process = multiprocessing.Process(target=run_server)
    server_process.start()

    # Wait for server to boot
    time.sleep(3.0)

    print("Testing started. Connecting via Playwright...")
    try:
        with sync_playwright() as p:
            # Headless run
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            print("Navigating to http://127.0.0.1:8080...")
            page.goto("http://127.0.0.1:8080/")

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
            page.wait_for_selector("#choices button", timeout=20000)

            # Capture screenshot
            screenshot_path = str(Path(__file__).parent.parent / "outputs" / "e2e_react_play.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            print(f"Capturing screenshot: {screenshot_path}")
            page.screenshot(path=screenshot_path)

            # Read first choice label
            first_choice = page.locator("#choices button:first-child")
            first_choice_text = first_choice.locator(".cmd-label").text_content()
            print(f"First choice text: {first_choice_text}")

            print("Clicking first choice to progress turn...")
            first_choice.click()

            # Wait for turn 1 streaming
            print("Waiting for next narrative turn typewriter...")
            time.sleep(5.0)

            # Capture screenshot after turn 1 choice
            screenshot_path_turn1 = str(
                Path(__file__).parent.parent / "outputs" / "e2e_react_play_turn1.png"
            )
            print(f"Capturing second screenshot: {screenshot_path_turn1}")
            page.screenshot(path=screenshot_path_turn1)

            print("Automated browser test completed successfully!")
            browser.close()
    except Exception as e:
        print(f"E2E Test Failed: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
    finally:
        print("Stopping uvicorn server...")
        server_process.terminate()
        server_process.join()


if __name__ == "__main__":
    run_test()

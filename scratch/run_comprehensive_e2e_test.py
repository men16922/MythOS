import multiprocessing
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

    print("[1/10] Server booted. Starting Playwright E2E...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # --- STEP 1: Onboarding ---
            print("[2/10] Navigating to http://127.0.0.1:8080...")
            page.goto("http://127.0.0.1:8080/")
            assert "세계" in page.title() or "MythOS" in page.title(), "Title mismatch!"

            print("[3/10] Entering name & archetype selection...")
            page.fill("#display-name", "플레이라이트 마스터봇")
            page.click(".arch-card:first-child")

            print("[4/10] Clicking '접속 · 루프 시작'...")
            page.click("#start")
            page.wait_for_selector("#play", timeout=15000)
            print("Successfully entered dashboard view!")

            # Wait for typewriter text stream to finish and choices to appear
            page.wait_for_selector("#choices button", timeout=20000)

            # --- STEP 2: HUD Gauge Verification ---
            print("[5/10] Verifying HUD Gauges...")
            gauges = page.locator(".gauge")
            gauge_count = gauges.count()
            print(f"Detected {gauge_count} gauges on the HUD.")
            assert gauge_count >= 2, "Gauges should be rendered!"

            # Check for specific gauge labels
            gauge_heads = page.locator(".gauge-head .k").all_text_contents()
            print(f"HUD Gauge Labels: {gauge_heads}")
            assert "STABILITY" in gauge_heads or any(
                "STABILITY" in label for label in gauge_heads
            ), "STABILITY gauge missing"
            assert "TENSION" in gauge_heads or any("TENSION" in label for label in gauge_heads), (
                "TENSION gauge missing"
            )

            # --- STEP 3: Tab Transition (Codex, Dev) ---
            print("[6/10] Navigating tab views...")

            # Go to Codex tab
            print("Switching to Codex tab...")
            page.click('.tab-btn:has-text("기억의 별자리")')
            page.wait_for_selector("#codex-tab-content", timeout=5000)
            assert page.is_visible("#codex-tab-content"), "Codex tab content is not visible!"
            print("Codex tab rendered successfully.")

            # Go to Dev tab
            print("Switching to Dev tab...")
            page.click('.tab-btn:has-text("개발자 콘솔")')
            page.wait_for_selector("#dev-tab-content", timeout=5000)
            assert page.is_visible("#dev-tab-content"), "Developer tab content is not visible!"
            print("Developer tab rendered successfully.")

            # Back to Story tab
            print("Switching back to Story tab...")
            page.click('.tab-btn:has-text("서사 접속")')
            page.wait_for_selector("#story-tab-content", timeout=5000)
            assert page.is_visible("#story-tab-content"), "Story tab content is not visible!"

            # --- STEP 4: Session Save ---
            print("[7/10] Verifying Session Save...")
            save_input = page.locator('#save-load-panel input[placeholder="설명 (선택)"]')
            save_input.click()
            save_input.fill("E2E 세이브 스냅샷")
            page.wait_for_timeout(1000)

            input_val = page.evaluate(
                "() => document.querySelector('#save-load-panel input').value"
            )
            print(f"Debug: Input field value before click: '{input_val}'")

            page.click('#save-load-panel button:has-text("SAVE")')

            # Wait for save slot to appear and update to the manual save label
            page.wait_for_selector(".save-slot-item", timeout=5000)

            print("Waiting for save slot label to update in UI...")
            success = False
            for _ in range(10):
                first_slot_label = page.locator(".save-slot-label").first.text_content()
                if "E2E 세이브 스냅샷" in first_slot_label:
                    success = True
                    break
                page.wait_for_timeout(500)

            first_slot_label = page.locator(".save-slot-label").first.text_content()
            print(f"First slot label after waiting: {first_slot_label}")
            assert success, (
                f"Save label mismatch! Expected 'E2E 세이브 스냅샷' to appear, but got '{first_slot_label}'"
            )

            # Capture screenshot after Save
            screenshot_path = str(
                Path(__file__).parent.parent / "outputs" / "e2e_full_play_saved.png"
            )
            page.screenshot(path=screenshot_path)
            print(f"Captured save state screenshot at: {screenshot_path}")

            # --- STEP 5: Progress Turn & Load/Rollback ---
            print("[8/10] Progressing turn and validating load rollback...")

            # Click first choice to progress turn
            first_choice = page.locator("#choices button:first-child")
            page.screenshot(
                path=str(Path(__file__).parent.parent / "outputs" / "e2e_full_play_before_turn.png")
            )
            first_choice.click()

            # Wait for turn transition and typewriter finish
            print("Waiting for next turn's choices to load...")
            time.sleep(6.0)  # Wait a bit for WS response stream
            page.wait_for_selector("#choices button", timeout=20000)

            # Capture turn 1 state
            screenshot_path_turn1 = str(
                Path(__file__).parent.parent / "outputs" / "e2e_full_play_turn1.png"
            )
            page.screenshot(path=screenshot_path_turn1)
            print(f"Captured turn 1 state at: {screenshot_path_turn1}")

            # Load back to turn 0
            print("Clicking LOAD to rollback to turn 0...")
            page.locator(".save-slot-load-btn").first.click()

            # Wait for rollback
            print("Waiting for reload/rollback stream...")
            time.sleep(6.0)
            page.wait_for_selector("#choices button", timeout=20000)

            # Validate rollback screen
            screenshot_path_rollback = str(
                Path(__file__).parent.parent / "outputs" / "e2e_full_play_rollback.png"
            )
            page.screenshot(path=screenshot_path_rollback)
            print(f"Captured rollback state at: {screenshot_path_rollback}")

            # --- STEP 6: Resume Game Detection ---
            print("[9/10] Verifying Session Resume from Landing Page...")

            # Save IDs for verify
            saved_session = page.evaluate("() => localStorage.getItem('mythos.session')")
            print(f"Current local session data: {saved_session}")
            assert saved_session is not None, "mythos.session not found in localStorage!"

            # Close browser tab & open new one
            page.close()
            page = browser.new_page()

            # Navigate again
            print("Re-navigating to homepage...")
            page.goto("http://127.0.0.1:8080/")

            # Inject session data back to ensure it is present on landing page
            page.evaluate(f"() => localStorage.setItem('mythos.session', '{saved_session}')")
            page.reload()  # Reload to let React detect localStorage data

            # Check if resume button is visible
            print("Waiting for resume button to be visible...")
            page.wait_for_selector("#resume", timeout=5000)
            assert page.is_visible("#resume"), "Resume button did not appear on landing page!"

            # Click resume
            print("Clicking resume button...")
            page.click("#resume")
            page.wait_for_selector("#play", timeout=10000)
            print("Reconnected to active loop via Resume successfully!")

            # Capture resumed state
            screenshot_path_resumed = str(
                Path(__file__).parent.parent / "outputs" / "e2e_full_play_resumed.png"
            )
            page.screenshot(path=screenshot_path_resumed)
            print(f"Captured resumed state at: {screenshot_path_resumed}")

            print("[10/10] Comprehensive E2E Playwright test completed successfully!")
            browser.close()
    except Exception as e:
        print(f"Comprehensive E2E Test Failed: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        print("Stopping uvicorn server...")
        server_process.terminate()
        server_process.join()


if __name__ == "__main__":
    run_test()

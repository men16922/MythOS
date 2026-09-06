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


def resolve_build_offers(page) -> None:
    """Accept blocking boon/echo offers before interacting with story choices."""
    for _ in range(3):
        overlay = page.locator(".boon-overlay")
        if overlay.count() == 0 or not overlay.is_visible():
            return
        heading = page.locator(".boon-modal-head").inner_text()
        page.wait_for_function(
            "() => !document.querySelector('.boon-card:first-child')?.disabled", timeout=10000
        )
        page.locator(".boon-card:first-child").click()
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
        raise RuntimeError("Build offer overlay did not settle.")


def advance_turn(page) -> None:
    """Pick the first choice and wait for the next interactive scene."""
    page.locator("#choices button:first-child").click()
    page.wait_for_function(
        "() => document.querySelectorAll('#choices button').length === 0", timeout=10000
    )
    page.wait_for_selector("#choices button", timeout=30000)
    resolve_build_offers(page)


def open_save_panel(page) -> None:
    """Reach the save/load launcher.

    On a first loop the aside is deliberately minimal for turns 0-2 (onboarding
    density), so the launcher does not exist yet — advance until it does. It
    then sits inside a folded <details> chip whose summary must be opened."""
    for _ in range(6):
        panel = page.locator("#save-load-panel")
        if panel.count():
            if not panel.is_visible():
                summary = page.locator("summary.aside-chip-summary", has_text="Save / Load")
                if summary.count():
                    summary.first.click()
            page.wait_for_selector("#save-load-panel", state="visible", timeout=5000)
            return
        print("Save launcher not rendered yet (minimal aside) — advancing a turn...")
        advance_turn(page)
    raise RuntimeError("Save/load launcher never appeared")


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
            page.goto("http://127.0.0.1:8080/?fallback=1&image=0")
            assert "세계" in page.title() or "MythOS" in page.title(), "Title mismatch!"

            # First-entry boot intro overlay — dismiss it to reach onboarding.
            print("Dismissing boot intro...")
            page.wait_for_selector(".boot-enter-btn", timeout=15000)
            page.click(".boot-enter-btn")

            print("[3/10] Entering name & archetype selection...")
            page.fill("#display-name", "플레이라이트 마스터봇")
            page.click(".arch-card:first-child")

            print("[4/10] Clicking '접속 · 루프 시작'...")
            page.click("#start")

            # Session-start cinematic (session_intro) — accept to reach the board.
            print("Accepting session intro cinematic...")
            page.wait_for_selector(".intro-accept-btn", timeout=40000)
            page.click(".intro-accept-btn")

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

            # Build offers (AMP shard / echo inscription) block the board until picked.
            resolve_build_offers(page)

            # --- STEP 3: Tab Transition (Codex, Dev) ---
            print("[6/10] Navigating tab views...")
            # Tab order: story · character · skills · codex (· dev for admins only).
            tabs = page.locator(".tab-btn")
            print("Switching to Codex tab...")
            tabs.nth(3).click()
            page.wait_for_selector("#codex-tab-content", timeout=15000)
            assert page.is_visible("#codex-tab-content"), "Codex tab content is not visible!"
            print("Codex tab rendered successfully.")

            if tabs.count() >= 5:
                print("Switching to Dev tab...")
                tabs.nth(4).click()
                page.wait_for_selector("#dev-tab-content", timeout=5000)
                assert page.is_visible("#dev-tab-content"), "Developer tab content is not visible!"
                print("Developer tab rendered successfully.")
            else:
                print("Dev tab hidden (not admin) — skipped.")

            print("Switching back to Story tab...")
            tabs.nth(0).click()
            page.wait_for_selector("#story-tab-content", timeout=5000)
            assert page.is_visible("#story-tab-content"), "Story tab content is not visible!"

            # --- STEP 4: Session Save ---
            print("[7/10] Verifying Session Save...")
            open_save_panel(page)
            page.click("#save-load-panel .sl-launch button:first-child")
            page.wait_for_selector(".sl-modal .sl-save-row input", timeout=10000)
            page.fill(".sl-modal .sl-save-row input", "E2E 세이브 스냅샷")
            page.click(".sl-modal .sl-save-row button")
            print("Waiting for the saved slot to show the manual label...")
            page.wait_for_function(
                "() => Array.from(document.querySelectorAll('.sl-title'))"
                ".some((e) => (e.textContent || '').includes('E2E 세이브 스냅샷'))",
                timeout=10000,
            )
            first_slot_label = page.locator(".sl-title").first.text_content()
            print(f"First slot label after save: {first_slot_label}")
            page.click(".sl-close")
            page.wait_for_selector(".sl-modal", state="detached", timeout=5000)

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
            resolve_build_offers(page)

            # Capture turn 1 state
            screenshot_path_turn1 = str(
                Path(__file__).parent.parent / "outputs" / "e2e_full_play_turn1.png"
            )
            page.screenshot(path=screenshot_path_turn1)
            print(f"Captured turn 1 state at: {screenshot_path_turn1}")

            # Load back to turn 0
            print("Clicking LOAD to rollback to turn 0...")
            open_save_panel(page)
            page.click("#save-load-panel .sl-launch button:nth-child(2)")
            page.wait_for_selector(".sl-modal .sl-load-btn", timeout=10000)
            page.locator(".sl-modal .sl-load-btn").first.click()

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
            page.goto("http://127.0.0.1:8080/?fallback=1&image=0")

            # Inject session data back to ensure it is present on landing page
            page.evaluate(f"() => localStorage.setItem('mythos.session', '{saved_session}')")
            page.reload()  # Reload to let React detect localStorage data

            # First-entry boot intro overlay — dismiss it to reach onboarding.
            print("Dismissing boot intro on reload...")
            page.wait_for_selector(".boot-enter-btn", timeout=15000)
            page.click(".boot-enter-btn")

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

"""High-quality teaser gameplay recorder (CDP screencast -> ffmpeg VFR assembly).

Playwright's built-in WebM recorder (VP8, ~25fps, headless jank) was judged not good
enough for the CBT teaser. This recorder drives a HEADED Chromium (GPU compositing),
captures every compositor frame via the CDP ``Page.startScreencast`` API with real
timestamps, and assembles a 1920x1080 H.264 clip with ffmpeg's concat demuxer so
frame pacing matches what the browser actually painted.

Recording starts only AFTER the scene is reached (owner feedback: no entry/loading
navigation in the clips). Entry prefers the Resume button over the Load modal.

The invite URL is supplied at runtime and never written to disk. Captures use the
supplied account; screens that expose admin/DEV-only UI must not reach final cuts.
"""

from __future__ import annotations

import argparse
import base64
import shutil
import subprocess
import tempfile
import time
from collections.abc import Callable
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

REPO = Path(__file__).resolve().parents[2]
V2 = REPO / "docs" / "cbt" / "v2"

HIDE_DEV_JS = """
(() => {
  const hide = () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      if (b.textContent.trim() === 'Dev') b.style.display = 'none';
    });
    document.querySelectorAll('details, section, div').forEach(el => {
      const t = (el.firstElementChild && el.firstElementChild.textContent || '').trim();
      if (/^DEV LOG/i.test(t)) el.style.display = 'none';
    });
  };
  hide();
  new MutationObserver(hide).observe(document.body, {childList: true, subtree: true});
})()
"""


class ScreencastRecorder:
    """Collect CDP screencast frames (PNG + timestamp) for one page."""

    def __init__(self, page: Page, out_dir: Path) -> None:
        self.page = page
        self.out_dir = out_dir
        self.frames: list[tuple[float, Path]] = []
        self._session = page.context.new_cdp_session(page)
        self._session.on("Page.screencastFrame", self._on_frame)
        self._recording = False

    def _on_frame(self, params: dict) -> None:
        try:
            self._session.send("Page.screencastFrameAck", {"sessionId": params["sessionId"]})
        except Exception:
            return
        if not self._recording:
            return
        ts = params.get("metadata", {}).get("timestamp") or time.time()
        path = self.out_dir / f"f{len(self.frames):06d}.png"
        path.write_bytes(base64.b64decode(params["data"]))
        self.frames.append((float(ts), path))

    def start(self) -> None:
        if self._recording:
            return
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self._recording = True
        self._session.send(
            "Page.startScreencast",
            {"format": "png", "maxWidth": 1920, "maxHeight": 1080, "everyNthFrame": 1},
        )

    def stop(self) -> None:
        self._recording = False
        try:
            self._session.send("Page.stopScreencast")
        except Exception:
            pass

    def assemble(self, output: Path, min_seconds: float = 1.0) -> bool:
        """Write frames to an H.264 MP4 with true per-frame durations."""
        if len(self.frames) < 2:
            print(f"not enough frames captured ({len(self.frames)})")
            return False
        listing = self.out_dir / "concat.txt"
        lines = []
        for (ts, path), (next_ts, _) in zip(self.frames, self.frames[1:]):
            duration = max(1 / 60, min(5.0, next_ts - ts))  # keep real holds; cap runaway gaps
            lines.append(f"file '{path.name}'\nduration {duration:.4f}")
        lines.append(f"file '{self.frames[-1][1].name}'")  # concat demuxer tail rule
        listing.write_text("\n".join(lines))
        total = self.frames[-1][0] - self.frames[0][0]
        if total < min_seconds:
            print(f"clip too short: {total:.2f}s")
            return False
        output.parent.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(listing),
                "-fps_mode",
                "vfr",
                "-vf",
                "scale=1920:1080:force_original_aspect_ratio=decrease,"
                "pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                "-c:v",
                "libx264",
                "-crf",
                "16",
                "-preset",
                "slow",
                "-pix_fmt",
                "yuv420p",
                str(output),
            ],
            cwd=self.out_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"ffmpeg failed: {result.stderr[-800:]}")
            return False
        print(f"assembled {len(self.frames)} frames / {total:.1f}s -> {output.relative_to(REPO)}")
        return True


def settle(page: Page, ms: int = 2500) -> None:
    page.wait_for_timeout(ms)


def enter_and_english(page: Page) -> None:
    """Pass the boot screen, ensure English UI, and hide admin-only Dev tab."""
    boot = page.locator(".boot-enter-btn")
    if boot.count() and boot.is_visible():
        boot.click()
        settle(page, 3000)
    body = page.locator("body").inner_text()
    hangul = sum(1 for ch in body if "가" <= ch <= "힣")
    if hangul > 20:  # UI is Korean -> toggle to EN (button label shows the TARGET lang)
        en_btn = page.locator("button:has-text('EN')").first
        if en_btn.count():
            en_btn.click()
            settle(page, 2000)
    page.evaluate(HIDE_DEV_JS)


def accept_awaken(page: Page) -> None:
    """Dismiss the post-load re-entry overlay if present."""
    for sel in ("button:has-text('AWAKEN')", ".intro-accept-btn"):
        loc = page.locator(sel)
        if loc.count() and loc.first.is_visible():
            loc.first.click()
            settle(page, 5000)
            return


def resolve_start_overlays(page: Page) -> None:
    """Loop-start modals block the screen until resolved, in order:
    AMP SHARD (pick one augment) then INSCRIBE MEMORY (pick one carried Echo)."""
    for _ in range(3):
        boon = page.locator(".boon-overlay")
        if boon.count() and boon.first.is_visible():
            cards = page.locator(".boon-card")
            if cards.count():
                cards.first.click()
            settle(page, 3000)
            continue
        dialog = page.locator("[role='dialog']:has-text('INSCRIBE MEMORY')")
        if dialog.count() and dialog.first.is_visible():
            card = dialog.first.locator("[class*='card']").first
            if card.count():
                card.click()
            settle(page, 3000)
            continue
        return


def resume_or_load(page: Page, needle: str) -> bool:
    """Enter the game: Resume the active loop when available, else Load a slot."""
    resume = page.locator("#resume, button:has-text('Resume'), button:has-text('이어하기')").first
    if resume.count() and resume.is_visible():
        print("resuming active loop")
        resume.click()
        settle(page, 6000)
    else:
        load_btn = page.locator("button:has-text('Load'), button:has-text('불러오기')").first
        if not (load_btn.count() and load_btn.is_visible()):
            print("no Resume/Load available")
            return False
        load_btn.click()
        settle(page, 2000)
        cards = page.locator(".sl-card")
        hit = False
        for i in range(cards.count()):
            title = cards.nth(i).locator(".sl-title").inner_text()
            if needle.lower() in title.lower():
                print(f"loading slot: {title}")
                cards.nth(i).locator(".sl-load-btn").first.click()
                hit = True
                break
        if not hit:
            print(f"slot '{needle}' not found")
            close = page.locator(".sl-close")
            if close.count():
                close.click()
            return False
        settle(page, 6000)
    accept_awaken(page)
    resolve_start_overlays(page)
    page.evaluate(HIDE_DEV_JS)
    return True


Begin = Callable[[], None]


# --- scene drivers: reach the scene FIRST, call begin() at the showcase moment ---


def drive_story_view(page: Page, slot: str, begin: Begin) -> None:
    """Choice prompt -> selection -> streaming narration (the AI-GM proof shot)."""
    if not resume_or_load(page, slot):
        raise RuntimeError("cannot enter game")
    settle(page, 2500)
    begin()
    settle(page, 2000)  # hold the choice prompt readable
    choice = page.locator(".command-card").first
    if choice.count() and choice.is_visible():
        choice.hover()
        settle(page, 1500)
        choice.click()
        settle(page, 20000)  # typewriter stream + scene image fade-in
    else:
        print("no visible choice; recording current story state")
        settle(page, 8000)


def drive_character_tab(page: Page, slot: str, begin: Begin) -> None:
    if not resume_or_load(page, slot):
        raise RuntimeError("cannot enter game")
    begin()
    settle(page, 800)
    page.locator(".tab-btn").nth(1).click()
    settle(page, 3000)
    page.mouse.wheel(0, 500)
    settle(page, 2500)


def drive_codex_tab(page: Page, slot: str, begin: Begin) -> None:
    if not resume_or_load(page, slot):
        raise RuntimeError("cannot enter game")
    begin()
    settle(page, 800)
    page.locator(".tab-btn").nth(3).click()
    settle(page, 3000)
    page.mouse.wheel(0, 600)
    settle(page, 3000)


def drive_route_map_zoom(page: Page, slot: str, begin: Begin) -> None:
    """Resume, expand the operation map on camera, then pan across it."""
    if not resume_or_load(page, slot):
        raise RuntimeError("cannot enter game")
    settle(page, 1500)
    expand = page.locator("button:has-text('Expand')").first
    if not (expand.count() and expand.is_visible()):
        raise RuntimeError("operation map Expand button not found")
    expand.scroll_into_view_if_needed()
    begin()
    settle(page, 1200)
    expand.click()  # on camera: panel -> OPERATION MAP DETAIL modal
    page.wait_for_selector(".route-map-modal", timeout=10000)
    settle(page, 2500)
    nodes = page.locator(".route-map-modal-graph button, .route-map-modal-graph [class*='node']")
    for i in range(min(nodes.count(), 3)):
        node = nodes.nth(i)
        # Raw mouse glide: node.hover() dead-locks once the first tooltip opens
        # (the popover intercepts pointer events and fails actionability checks).
        bb = node.bounding_box()
        if bb:
            page.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2, steps=25)
            settle(page, 1800)
    settle(page, 2500)


def drive_combat_sim(page: Page, slot: str, begin: Begin) -> None:
    """Enter the combat simulator from the setup screen (owner-directed) and play
    several readable rounds. ``slot`` filters the encounter option text."""
    sim = page.locator("#combat-simulator summary")
    if not sim.count():
        raise RuntimeError("combat simulator entry not found")
    sim.click()
    settle(page, 1500)
    options = page.locator("#sim-encounter option")
    labels = [options.nth(i).inner_text() for i in range(options.count())]
    print("encounters:", labels)
    if slot:
        for i, label in enumerate(labels):
            if slot.lower() in label.lower():
                value = options.nth(i).get_attribute("value")
                page.locator("#sim-encounter").select_option(value=value)
                print("selected:", label)
                break
    boxes = page.locator(".sim-ally input")
    for i in range(boxes.count()):
        if not boxes.nth(i).is_checked():
            boxes.nth(i).check()
    settle(page, 800)
    page.locator("#sim-start").click()
    page.wait_for_selector("canvas", timeout=30000)
    # The AMP SHARD modal and FIRST COMBAT GUIDE arrive AFTER the board renders —
    # poll them away before any recording starts.
    for _ in range(10):
        resolve_start_overlays(page)
        skip = page.locator("button:has-text('Skip')").first
        if skip.count() and skip.is_visible():
            skip.click()
            settle(page, 1200)
        blocked = (
            (
                page.locator(".boon-overlay").count()
                and page.locator(".boon-overlay").first.is_visible()
            )
            or (
                page.locator("[role='dialog']").count()
                and page.locator("[role='dialog']").first.is_visible()
            )
            or (skip.count() and skip.is_visible())
        )
        if not blocked:
            break
        settle(page, 1200)
    page.evaluate(HIDE_DEV_JS)
    close_legend = page.locator("button:has-text('Close legend')").first
    if close_legend.count() and close_legend.is_visible():
        close_legend.click()
        settle(page, 800)

    def frame_board() -> None:
        # Keep the tactical board in frame — target buttons live far below and
        # Playwright's auto-scroll drags the viewport off the canvas.
        page.evaluate(
            "document.querySelector('canvas')?.scrollIntoView({block:'start',behavior:'instant'})"
        )

    frame_board()
    settle(page, 1500)  # let the board finish its reveal BEFORE recording
    begin()
    settle(page, 4000)  # entry hold: board, backdrop, enemy intents
    for _ in range(6):
        acted = False
        skill = page.locator(".cc-skill:not([disabled])").first
        if skill.count() and skill.is_visible():
            skill.click()
            settle(page, 1200)
            targets = page.locator(".cc-btn.tgt")
            target = targets.filter(has_text="🎯").first if targets.count() else targets
            if not (target.count() and target.first.is_visible()):
                target = targets.first
            if target.count() and target.is_visible():
                target.hover()
                settle(page, 1600)  # aim preview / hit chance forecast
                target.click()
                frame_board()
                settle(page, 5000)  # VFX, cut-in, damage numbers
                acted = True
        if not acted:
            end_turn = page.locator(
                "#cc-continue, button:has-text('End Turn'), button:has-text('턴 종료')"
            ).first
            if end_turn.count() and end_turn.is_visible():
                end_turn.click()
                frame_board()
                settle(page, 4000)
            else:
                settle(page, 2500)


SCENES: dict[str, tuple[str, Callable[[Page, str, Begin], None]]] = {
    "story_view": ("scene_03", drive_story_view),
    "route_map_zoom": ("scene_04", drive_route_map_zoom),
    "character_tab": ("scene_05", drive_character_tab),
    "combat_sim": ("scene_06", drive_combat_sim),
    "codex_tab": ("scene_09", drive_codex_tab),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="Invite URL; never persisted")
    parser.add_argument("--scene", required=True, choices=sorted(SCENES))
    parser.add_argument("--slot", default="", help="Save-slot / encounter filter")
    parser.add_argument("--label", default=None, help="Output file stem override")
    parser.add_argument("--keep-frames", action="store_true")
    args = parser.parse_args()

    folder, driver = SCENES[args.scene]
    label = args.label or f"hq_{args.scene}"
    output = V2 / folder / f"{label}.mp4"
    frames_dir = Path(tempfile.mkdtemp(prefix=f"teaser_{args.scene}_"))

    with sync_playwright() as pw:
        # Headed + visible window required: the screencast only receives frames the
        # compositor actually paints, and macOS stops painting occluded windows
        # (observed starvation: 23 frames / 24s). The owner keeps the window
        # unobstructed during capture.
        browser = pw.chromium.launch(
            headless=False,
            args=[
                "--window-size=1936,1180",
                "--disable-background-timer-throttling",
                "--disable-renderer-backgrounding",
                "--disable-backgrounding-occluded-windows",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080}, device_scale_factor=1
        )
        page = context.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        settle(page, 2500)
        enter_and_english(page)

        rec = ScreencastRecorder(page, frames_dir)
        try:
            driver(page, args.slot, rec.start)
        finally:
            rec.stop()
            context.close()
            browser.close()

    ok = rec.assemble(output)
    if not args.keep_frames:
        shutil.rmtree(frames_dir, ignore_errors=True)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

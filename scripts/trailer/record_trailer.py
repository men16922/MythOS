"""Record the Mythos 2.0 store trailer from the REAL game (headless, muted, one tab) and cut it with ffmpeg.

  make api   # not needed: this script starts its own throwaway server (in-memory store, open auth, GM off)
  .venv/bin/python scripts/trailer/record_trailer.py [--out outputs/trailer] [--keep-raw]

It serves the built SPA (``make frontend-build``) plus a throwaway ``vite`` dev server is NOT used: the dev-only
``window.__m2`` hook is what lets it jump to the screens worth showing (an event with a check, the IX offer with
its mirror, a bond cutscene, the Archive memories), so it needs ``npx vite`` in ``src/mythos_ui`` — started here on
a private port. Never uses the owner's dev ports (8010, 5173).

Output: ``<out>/mythos2_trailer.mp4`` (1280x720, 30 fps, H.264 + AAC) with the game's own title/map/combat music
bed (resources/neo-seoul/v2/music) and a few burned-in captions. Raw per-scene recordings go to ``<out>/raw``.

The game is always recorded muted (``?mute=1``); music is added in the edit, never captured.
"""

from __future__ import annotations

import argparse
import contextlib
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
MUSIC = ROOT / "resources" / "neo-seoul" / "v2" / "music"
UI = ROOT / "src" / "mythos_ui"
W, H = 1280, 720
# Apple SD Gothic Neo carries the Hangul glyphs (Menlo has none); the captions are Korean.
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"


def caption_png(text: str, path: Path, size: int = 36, width: int = W, height: int = H) -> Path:
    """A transparent full-frame PNG with `text` centred near the bottom (this ffmpeg build has no drawtext/freetype)."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, size)
    box = draw.textbbox((0, 0), text, font=font)
    x, y = (width - (box[2] - box[0])) // 2, height - 78
    # A dark strip behind the line: the footage is the real UI, which is busy at the bottom.
    draw.rectangle((0, height - 100, width, height), fill=(2, 8, 14, 190))
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2), (-2, 2), (2, -2)):
        draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 200))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    img.save(path)
    return path


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_http(url: str, tries: int = 80) -> None:
    import urllib.request

    for _ in range(tries):
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except Exception:
            time.sleep(0.4)
    raise SystemExit(f"server did not come up: {url}")


def click_through_act_intro(page: Page) -> None:
    for _ in range(6):
        intro = page.locator(".m2-actintro")
        if intro.count() == 0 or not intro.first.is_visible():
            return
        intro.first.click()
        page.wait_for_timeout(700)


def set_run(page: Page, patch_js: str) -> None:
    page.evaluate(
        f"() => {{ const m = window.__m2; const run = structuredClone(m.run); {patch_js}; m.setRun(run) }}"
    )


# --------------------------------------------------------------------------- scenes
# Each scene: (name, seconds_to_keep, function(page) that performs it on a fresh context). The recording starts at
# page creation, so each function ends when its beat has played; the cut keeps the tail `keep` seconds.


def scene_title(page: Page, base: str) -> None:
    page.goto(f"{base}/?mute=1")
    page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mythos2')) localStorage.removeItem(k); localStorage.setItem('mythos2.mute','1') }"
    )
    page.reload()
    page.wait_for_timeout(4200)


def scene_daily_setup(page: Page, base: str) -> None:
    page.goto(f"{base}/?mute=1")
    page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mythos2')) localStorage.removeItem(k); localStorage.setItem('mythos2.mute','1') }"
    )
    page.reload()
    page.wait_for_selector(".m2-menu-item--daily", timeout=15000)
    page.wait_for_timeout(600)
    page.locator(".m2-menu-item--daily").click()
    page.wait_for_selector("[data-testid=mutator-card]", timeout=8000)
    page.wait_for_timeout(3600)


def scene_event(page: Page, base: str) -> None:
    start_daily_run(page, base)
    set_run(
        page,
        "run.stats.str = 9; run.rng = 11; run.screen = { kind: 'event', eventId: 'a1_hand_crank_lamp', resolved: null, improvised: null }",
    )
    page.wait_for_selector(".m2-options .m2-option", timeout=10000)
    page.wait_for_timeout(2600)
    page.locator(".m2-options .m2-option").first.click()
    page.wait_for_selector("[data-testid=stat-voice]", timeout=15000)
    page.wait_for_timeout(2600)


def scene_ix_mirror(page: Page, base: str) -> None:
    start_daily_run(page, base)
    set_run(
        page,
        "run.flags = { saved_citizen: 1, lin_yue_debt: 1, kai_found: 1 }; run.act = 3; "
        "run.screen = { kind: 'event', eventId: 'a3_ix_offer', resolved: null, improvised: null }",
    )
    page.wait_for_selector("[data-testid=ix-mirror]", timeout=15000)
    page.wait_for_timeout(5200)


def scene_cutscene(page: Page, base: str) -> None:
    start_daily_run(page, base)
    set_run(
        page,
        "run.party = [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 1 }]; run.screen = { kind: 'rest', done: false }",
    )
    page.wait_for_selector(".m2-restopt--bond", timeout=10000)
    page.locator(".m2-restopt--bond").click()
    page.locator(".m2-bondpick").first.click()
    page.wait_for_selector("[data-testid=cutscene]", timeout=10000)
    page.wait_for_timeout(8200)


def scene_combat(page: Page, base: str) -> None:
    page.goto(f"{base}/?sandbox=combat&mute=1&enc=a2_elite_incinerator")
    # The sandbox is a dev harness: hide its toolbar so only the game itself is on screen.
    page.add_style_tag(content=".m2c-sb-bar{display:none !important}")
    page.wait_for_timeout(2600)
    for _turn in range(3):
        for slot in range(1, 6):
            page.keyboard.press(str(slot))
            page.wait_for_timeout(200)
            hits = page.locator(".m2c-u-hit")
            for k in range(hits.count() - 1, -1, -1):
                with contextlib.suppress(
                    Exception
                ):  # a click on a unit that is not a legal target does nothing
                    hits.nth(k).click(timeout=400, force=True)
                page.wait_for_timeout(120)
            page.wait_for_timeout(450)
        page.keyboard.press("e")
        page.wait_for_timeout(5200)


def scene_memories(page: Page, base: str) -> None:
    start_daily_run(page, base)
    page.evaluate(
        """() => { const m = window.__m2;
          m.setProfile((p) => ({ ...p, loops: 4, wins: 3, bestAct: 3, echoes: 120, totalEchoes: 120, paradoxUnlocked: 1,
            cutscenes: ['se_rin_first_light','se_rin_promise','tae_o_unlatched','han_name_field','su_ah_warm_crystal','kai_rain_sound','lin_yue_incense'] }));
          m.setRun(null); m.setView('archive') }"""
    )
    page.wait_for_selector(".m2-tabs--sm", timeout=10000)
    page.locator(".m2-tabs--sm button", has_text="기억").click()
    page.wait_for_selector("[data-testid=memory-card]", timeout=6000)
    page.wait_for_timeout(3600)


def start_daily_run(page: Page, base: str) -> None:
    page.goto(f"{base}/?mute=1")
    page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mythos2')) localStorage.removeItem(k); localStorage.setItem('mythos2.mute','1') }"
    )
    page.reload()
    page.wait_for_function("() => !!window.__m2", timeout=15000)
    page.locator(".m2-menu-item--daily").click()
    page.get_by_role("button", name=re.compile(r"^\s*(접속|Connect)\s*$")).first.click()
    page.wait_for_timeout(600)
    page.keyboard.press("Escape")
    page.wait_for_selector(".m2-actintro", timeout=10000)
    click_through_act_intro(page)
    page.wait_for_selector(".m2-options .m2-option", timeout=10000)


# name, function, seconds kept from the END of the recording, caption (ko)
SCENES = [
    ("01_title", scene_title, 3.2, "세계:접속"),
    ("02_event", scene_event, 5.4, "모든 선택에는 대가가 있다"),
    ("03_combat", scene_combat, 11.0, "적이 칠 칸이 미리 보인다"),
    ("04_cutscene", scene_cutscene, 6.0, "함께 걸은 사람들"),
    ("05_ix", scene_ix_mirror, 5.0, "IX는 당신의 선택을 기억한다"),
    ("06_daily", scene_daily_setup, 3.4, "매일 다른 변형"),
    ("07_memories", scene_memories, 3.2, "기억은 쌓인다"),
]
OUTRO = "MYTHOS 2.0 · SIGNAL RUN"


def record(out: Path, base: str, keep_raw: bool) -> list[Path]:
    raw = out / "raw"
    shutil.rmtree(raw, ignore_errors=True)
    raw.mkdir(parents=True)
    clips: list[Path] = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, fn, keep, _caption in SCENES:
            ctx = browser.new_context(
                viewport={"width": W, "height": H},
                record_video_dir=str(raw),
                record_video_size={"width": W, "height": H},
            )
            page = ctx.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
            try:
                fn(page, base)
            finally:
                video = page.video
                ctx.close()
            if errors:
                print(f"  ! {name}: page errors: {errors[:2]}")
            src = Path(video.path()) if video else None
            if not src or not src.exists():
                raise SystemExit(f"no recording for {name}")
            dest = raw / f"{name}.webm"
            src.rename(dest)
            clips.append(dest)
            print(f"  recorded {name} ({keep}s kept of the tail)")
        browser.close()
    return clips


def cut(out: Path, clips: list[Path]) -> Path:
    """Trim each recording to its last `keep` seconds, overlay a caption PNG (fade in/out), concat, add the music bed."""
    parts: list[Path] = []
    for (name, _fn, keep, caption), clip in zip(SCENES, clips, strict=True):
        dur = float(
            subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "csv=p=0",
                    str(clip),
                ],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        )
        start = max(0.0, dur - keep)
        part = out / "raw" / f"{name}.mp4"
        cap = caption_png(caption, out / "raw" / f"{name}_caption.png")
        fade = f"fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st={keep - 0.6:.2f}:d=0.6:alpha=1"
        graph = f"[0:v]scale={W}:{H}:flags=lanczos,fps=30,format=yuv420p[v];[1:v]format=rgba,{fade}[c];[v][c]overlay=0:0:format=auto,format=yuv420p[o]"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-ss",
                f"{start:.2f}",
                "-t",
                f"{keep:.2f}",
                "-i",
                str(clip),
                "-loop",
                "1",
                "-t",
                f"{keep:.2f}",
                "-framerate",
                "30",
                "-i",
                str(cap),
                "-filter_complex",
                graph,
                "-map",
                "[o]",
                "-an",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "20",
                "-t",
                f"{keep:.2f}",
                str(part),
            ],
            check=True,
        )
        parts.append(part)
    # Outro card (solid, title + tagline), 2.6 s.
    outro = out / "raw" / "99_outro.mp4"
    from PIL import Image, ImageDraw, ImageFont

    card = Image.new("RGB", (W, H), (4, 16, 26))
    draw = ImageDraw.Draw(card)
    for text, size, y, fill in (
        (OUTRO, 56, H // 2 - 50, (92, 242, 216)),
        ("Neo-Seoul · tactical deck-builder roguelite", 26, H // 2 + 28, (200, 215, 220)),
    ):
        font = ImageFont.truetype(FONT, size)
        box = draw.textbbox((0, 0), text, font=font)
        draw.text(((W - (box[2] - box[0])) // 2, y), text, font=font, fill=fill)
    card_path = out / "raw" / "99_outro.png"
    card.save(card_path)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-loop",
            "1",
            "-framerate",
            "30",
            "-t",
            "2.6",
            "-i",
            str(card_path),
            "-vf",
            "format=yuv420p",
            "-c:v",
            "libx264",
            "-crf",
            "20",
            str(outro),
        ],
        check=True,
    )
    parts.append(outro)
    listing = out / "raw" / "concat.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in parts), encoding="utf-8")
    silent = out / "raw" / "silent.mp4"
    subprocess.run(
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
            "-c",
            "copy",
            str(silent),
        ],
        check=True,
    )
    total = float(
        subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(silent),
            ],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    )
    final = out / "mythos2_trailer.mp4"
    # Music: the title loop under everything, a fade in/out; the game itself stays muted in the recording.
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(silent),
            "-stream_loop",
            "-1",
            "-i",
            str(MUSIC / "title.m4a"),
            "-filter_complex",
            f"[1:a]atrim=0:{total:.2f},afade=t=in:st=0:d=1.2,afade=t=out:st={total - 1.8:.2f}:d=1.8,volume=0.9[a]",
            "-map",
            "0:v",
            "-map",
            "[a]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(final),
        ],
        check=True,
    )
    return final


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--out", default=str(ROOT / "outputs" / "trailer"))
    ap.add_argument("--keep-raw", action="store_true")
    ap.add_argument(
        "--cut-only",
        action="store_true",
        help="re-cut the recordings already in <out>/raw (no re-recording)",
    )
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if args.cut_only:
        raw = out / "raw"
        clips = [raw / f"{name}.webm" for name, *_ in SCENES]
        missing = [c.name for c in clips if not c.exists()]
        if missing:
            raise SystemExit(f"--cut-only needs earlier recordings (--keep-raw); missing {missing}")
        final = cut(out, clips)
        print(f"done → {final} ({final.stat().st_size / 1e6:.1f} MB)")
        return 0
    api_port, ui_port = free_port(), free_port()
    if {api_port, ui_port} & {8010, 5173}:
        raise SystemExit("picked an owner dev port; rerun")
    env = {
        **os.environ,
        "MYTHOS_V2_STORE": "memory",
        "MYTHOS_AUTH": "open",
        "MYTHOS_FIREBASE_WEB_CONFIG": "{}",
        "MYTHOS_V2_GM": "off",
        "PYTHONPATH": str(ROOT / "src"),
    }
    api = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "mythos_api.app:create_app",
            "--factory",
            "--port",
            str(api_port),
            "--log-level",
            "error",
        ],
        env=env,
        cwd=ROOT,
    )
    ui = subprocess.Popen(
        ["npx", "vite", "--port", str(ui_port), "--strictPort"],
        env={**os.environ, "MYTHOS_DEV_API": f"http://127.0.0.1:{api_port}"},
        cwd=UI,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_http(f"http://127.0.0.1:{api_port}/api/v2/health")
        wait_http(f"http://localhost:{ui_port}/")
        print("recording…")
        clips = record(out, f"http://localhost:{ui_port}", args.keep_raw)
        print("cutting…")
        final = cut(out, clips)
        if not args.keep_raw:
            shutil.rmtree(out / "raw", ignore_errors=True)
        print(f"done → {final} ({final.stat().st_size / 1e6:.1f} MB)")
    finally:
        for proc in (ui, api):
            proc.terminate()
        for proc in (ui, api):
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                proc.kill()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

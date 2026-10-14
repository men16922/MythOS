"""Google Play store graphics from the REAL game (headless, muted, one tab at a time, private ports).

  .venv/bin/python scripts/android/store_assets.py [--out outputs/play-store] [--only icon,feature,shots]

Writes (Play Console specs: docs/play-store.md):
  icon-512.png                       512x512 app icon (the launcher glyph on its own background, no alpha)
  feature-ko.png / feature-en.png    1024x500 feature graphics (title key art + the game's own title type)
  shots/<lang>/NN_<scene>.png        1920x1080 phone screenshots of real screens (16:9, landscape like the game)

Like scripts/trailer/record_trailer.py (whose scene helpers it reuses) it starts a throwaway API (in-memory store, open
auth, GM off) and a private ``npx vite`` (the dev-only ``window.__m2`` hook jumps to the screens worth showing); it never
touches the owner's dev ports. The screenshots are the game as rendered at a 960x540 phone-landscape viewport at 2x.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "trailer"))
sys.path.insert(0, str(ROOT / "scripts" / "android"))

import make_icons  # noqa: E402
import record_trailer as rt  # noqa: E402

TITLE_ART = ROOT / "resources" / "neo-seoul" / "v2" / "art" / "title.webp"
VIEW = {"width": 960, "height": 540}
SCALE = 2  # → 1920x1080

FEATURE_TEXT = {
    "ko": ("세계:접속", "MYTHOS 2.0 · SIGNAL RUN", "적이 칠 칸이 보인다. 덱으로 뒤집어라."),
    "en": (
        "세계:접속",
        "MYTHOS 2.0 · SIGNAL RUN",
        "See every strike coming. Turn it with your deck.",
    ),
}


def set_lang(page: Page, lang: str) -> None:
    if lang == "ko":
        return
    page.evaluate(
        "(lang) => window.__m2.setProfile((p) => ({ ...p, settings: { ...p.settings, lang } }))",
        lang,
    )
    page.wait_for_timeout(400)


def park(page: Page) -> None:
    page.mouse.move(2, VIEW["height"] - 2)


# --------------------------------------------------------------------------- scenes (end on the frame to keep)


def shot_title(page: Page, base: str, lang: str) -> None:
    rt.scene_title(page, base)
    if lang == "en":
        page.get_by_role("radio", name="English").click()
        page.wait_for_timeout(800)


def shot_event(page: Page, base: str, lang: str) -> None:
    rt.start_daily_run(page, base)
    set_lang(page, lang)
    rt.set_run(
        page,
        "run.stats.str = 9; run.rng = 11; run.screen = { kind: 'event', eventId: 'a1_hand_crank_lamp', resolved: null, improvised: null }",
    )
    page.wait_for_selector(".m2-options .m2-option", timeout=10000)
    page.wait_for_timeout(3500)  # the event text finishes typing


def shot_map(page: Page, base: str, lang: str) -> None:
    rt.start_daily_run(page, base)
    set_lang(page, lang)
    rt.set_run(page, "run.screen = { kind: 'map' }")
    page.wait_for_timeout(3000)


def _fight(encounter: str, companions: list[str], turns: int) -> Callable[[Page, str, str], None]:
    def scene(page: Page, base: str, lang: str) -> None:
        rt.enter_fight(page, base, encounter, companions)
        set_lang(page, lang)
        rt.play_expert_turns(page, turns)
        # Next turn's telegraphs are up; select the first card so its targets light up too.
        page.keyboard.press("1")
        page.wait_for_timeout(700)
        park(page)
        page.wait_for_timeout(500)

    return scene


def shot_cutscene(page: Page, base: str, lang: str) -> None:
    rt.start_daily_run(page, base)
    set_lang(page, lang)
    rt.set_run(
        page,
        "run.party = [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 1 }]; run.screen = { kind: 'rest', done: false }",
    )
    page.wait_for_selector(".m2-restopt--bond", timeout=10000)
    page.locator(".m2-restopt--bond").click()
    page.locator(".m2-bondpick").first.click()
    page.wait_for_selector("[data-testid=cutscene]", timeout=10000)
    page.wait_for_timeout(6500)


def shot_ix(page: Page, base: str, lang: str) -> None:
    rt.start_daily_run(page, base)
    set_lang(page, lang)
    rt.set_run(
        page,
        "run.flags = { saved_citizen: 1, lin_yue_debt: 1, kai_found: 1 }; run.act = 3; "
        "run.screen = { kind: 'event', eventId: 'a3_ix_offer', resolved: null, improvised: null }",
    )
    page.wait_for_selector("[data-testid=ix-mirror]", timeout=15000)
    page.wait_for_timeout(5000)


SHOTS: list[tuple[str, Callable[[Page, str, str], None]]] = [
    ("01_combat_haetae", _fight("a1_boss_haetae", ["se_rin", "tae_o"], 2)),
    ("02_combat_incinerator", _fight("a2_elite_incinerator", ["se_rin", "su_ah"], 2)),
    ("03_map", shot_map),
    ("04_event", shot_event),
    ("05_companion", shot_cutscene),
    ("06_ix", shot_ix),
    ("07_title", shot_title),
]


def screenshots(base: str, out: Path, langs: list[str]) -> list[Path]:
    written: list[Path] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        for lang in langs:
            (out / "shots" / lang).mkdir(parents=True, exist_ok=True)
            for name, fn in SHOTS:
                ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE)
                page = ctx.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
                try:
                    fn(page, base, lang)
                    dest = out / "shots" / lang / f"{name}.png"
                    page.screenshot(path=str(dest))
                    written.append(dest)
                    print(f"  {lang}/{name}.png")
                finally:
                    ctx.close()
                if errors:
                    raise SystemExit(f"{lang}/{name}: page errors {errors[:2]}")
        browser.close()
    return written


# --------------------------------------------------------------------------- feature graphic + icon


FEATURE_CSS = """
#feat{position:fixed;inset:0;z-index:2147483647;width:1024px;height:500px;overflow:hidden;background:#05090c}
#feat .bg{position:absolute;inset:0;background:url('/resources/neo-seoul/v2/art/title.webp') 72% 40%/cover no-repeat}
#feat .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,7,10,.94) 0%,rgba(3,7,10,.78) 36%,rgba(3,7,10,.1) 66%,rgba(3,7,10,0) 100%)}
#feat .txt{position:absolute;left:64px;top:50%;transform:translateY(-50%);color:#e8fbfb}
#feat .ko{font:800 92px/1 var(--m2-body);letter-spacing:-.02em;text-shadow:0 0 28px rgba(78,242,227,.35)}
#feat .en{margin-top:14px;font:600 24px/1 var(--m2-display);letter-spacing:.32em;color:#4ef2e3}
#feat .tag{margin-top:26px;font:500 22px/1.35 var(--m2-body);color:#cfe3e6;max-width:430px}
"""


def feature_graphics(base: str, out: Path, langs: list[str]) -> list[Path]:
    """An overlay drawn inside the running game page, so it uses the game's own fonts and art."""
    written: list[Path] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        page = browser.new_page(viewport={"width": 1024, "height": 500})
        page.goto(f"{base}/?mute=1")
        page.wait_for_function("() => !!window.__m2", timeout=15000)
        page.add_style_tag(content=FEATURE_CSS)
        for lang in langs:
            ko, en, tag = FEATURE_TEXT[lang]
            page.evaluate(
                """([ko, en, tag]) => {
                  document.getElementById('feat')?.remove()
                  const el = document.createElement('div')
                  el.id = 'feat'
                  el.innerHTML = '<div class="bg"></div><div class="shade"></div><div class="txt"><div class="ko"></div><div class="en"></div><div class="tag"></div></div>'
                  el.querySelector('.ko').textContent = ko
                  el.querySelector('.en').textContent = en
                  el.querySelector('.tag').textContent = tag
                  document.body.appendChild(el)
                }""",
                [ko, en, tag],
            )
            page.wait_for_function("() => document.fonts.ready.then(() => true)")
            page.wait_for_timeout(1500)  # the background image
            dest = out / f"feature-{lang}.png"
            page.screenshot(path=str(dest))
            Image.open(dest).convert("RGB").save(dest)  # Play: 24-bit PNG, no alpha
            written.append(dest)
            print(f"  feature-{lang}.png")
        browser.close()
    return written


def icon(out: Path) -> Path:
    glyph, bg = make_icons.load_glyph()
    dest = out / "icon-512.png"
    make_icons.place(glyph, bg, (512, 512), 0.66).convert("RGB").save(dest, optimize=True)
    print("  icon-512.png")
    return dest


def check(paths: list[Path]) -> None:
    """Play's limits: PNG/JPEG, ≤ 8 MB, screenshots 320–3840 px with the long side ≤ 2x the short side."""
    for path in paths:
        with Image.open(path) as im:
            w, h = im.size
            if path.stat().st_size > 8 * 1024 * 1024:
                raise SystemExit(f"{path.name}: over 8 MB")
            if "shots" in path.parts and not (
                min(w, h) >= 320 and max(w, h) <= 3840 and max(w, h) <= 2 * min(w, h)
            ):
                raise SystemExit(f"{path.name}: {w}x{h} outside Play's screenshot limits")
            if im.mode not in ("RGB", "P", "L"):
                im.convert("RGB").save(path)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", type=Path, default=ROOT / "outputs" / "play-store")
    ap.add_argument("--only", default="icon,feature,shots")
    ap.add_argument("--langs", default="ko,en")
    args = ap.parse_args()
    parts = set(args.only.split(","))
    langs = [lang for lang in args.langs.split(",") if lang in ("ko", "en")]
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    if "icon" in parts:
        written.append(icon(out))
    if not parts & {"feature", "shots"}:
        check(written)
        return 0
    api_port, ui_port = rt.free_port(), rt.free_port()
    if {api_port, ui_port} & {8010, 5173, 8000}:
        raise SystemExit("picked an owner dev port; rerun")
    env = {
        **os.environ,
        "MYTHOS_V2_STORE": "memory",
        "MYTHOS_AUTH": "open",
        "MYTHOS_FIREBASE_WEB_CONFIG": "{}",
        "MYTHOS_V2_GM": "off",
        "MYTHOS_LOG_LEVEL": "ERROR",
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
        cwd=rt.UI,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        rt.wait_http(f"http://127.0.0.1:{api_port}/api/v2/health")
        rt.wait_http(f"http://localhost:{ui_port}/")
        base = f"http://localhost:{ui_port}"
        if "feature" in parts:
            written += feature_graphics(base, out, langs)
        if "shots" in parts:
            written += screenshots(base, out, langs)
    finally:
        ui.terminate()
        api.terminate()
        ui.wait(timeout=10)
        api.wait(timeout=10)
    check(written)
    print(f"done → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

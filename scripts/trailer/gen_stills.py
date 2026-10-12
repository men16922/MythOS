"""Photoreal stills for the cinematic trailer: the 2.0 key art's composition, re-shot as live-action film frames.

  .venv/bin/python scripts/trailer/gen_stills.py --shot all          # every missing still
  .venv/bin/python scripts/trailer/gen_stills.py --shot ix --force   # regenerate one

Each still is a Gemini image edit of the game's own key art (composition reference) with an optional photoreal
reference from the 1.x art set (branch ``1.0``: resources/neo-seoul/opening, the owner-liked live-action look).
``gen_veo.py --style photo`` then animates these instead of the painted art. Billed; counted in
scripts/v2_assets/ledger.json (``image_calls`` / ``image_failed``). Output: ``outputs/trailer/cinematic/stills/``.
"""

from __future__ import annotations

import argparse
import io
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "v2_assets"))

from common import ledger_bump, ledger_record, load_env  # noqa: E402

ART = ROOT / "resources" / "neo-seoul" / "v2"
OUT = ROOT / "outputs" / "trailer" / "cinematic" / "stills"
MODEL = os.getenv("TRAILER_IMAGE_MODEL", "gemini-3-pro-image")
FALLBACK = "gemini-3.1-flash-image"

LOOK = (
    "Photorealistic live-action film still, shot on an ARRI Alexa with anamorphic lenses, shallow depth of field, "
    "real rain, wet reflective asphalt, practical neon light in cyan, magenta and red, volumetric haze, film grain, "
    "high dynamic range, Blade Runner 2049 / Ghost in the Shell (2017) production design, set in a near-future Seoul. "
    "Not a painting, not an illustration, not anime, not 3D-render plastic. No text, no letters, no subtitles, "
    "no watermark, no logo. 16:9."
)
# 1.x live-action references (read from git branch 1.0 so they need not live in the 2.0 tree).
SERIN_REF = "resources/neo-seoul/opening/opening-01-serin-arrival.png"
CITY_REF = "resources/neo-seoul/scenes/spire_gate.png"

SHOTS: dict[str, dict] = {
    "title": {
        "art": "art/title.webp",
        "refs": [CITY_REF],
        "prompt": "A lone hooded figure in a long dark coat seen from behind on the edge of a rain-soaked rooftop "
        "at night, water tanks and cables around, looking over a dense neon city towards a distant white "
        "monolithic spire with one glowing red eye near its top, small drones with red lights in the stormy sky.",
    },
    "blackout": {
        "art": "art/act1.webp",
        "refs": [],
        "prompt": "A blacked-out narrow alley between old concrete apartment blocks at night in heavy rain, an orange "
        "tarp shelter and parked scooters, two surveillance drones overhead casting red searchlight beams onto the "
        "flooded ground, steam drifting.",
    },
    "se_rin": {
        "art": "cutscenes/se_rin_first_light.webp",
        "refs": [SERIN_REF],
        "prompt": "The young Korean woman from the second reference image (same face, long black hair with bangs, "
        "black leather jacket) standing in a rainy neon alley at night holding a steaming paper coffee cup, magenta "
        "neon above her, blurred red and blue police lights far behind, guarded wry look at the camera. Framing and "
        "pose from the first reference image.",
    },
    "haetae": {
        "art": "boss/a1_boss_haetae.webp",
        "refs": [],
        "prompt": "A massive real-world military suppression tank designed like a Korean haetae guardian lion: heavy "
        "tank treads, weathered bronze-and-steel armour scales, a single horn, glowing amber eyes, red warning "
        "beacons, advancing through a rainy neon street at night. Practical-effects / film VFX realism, huge scale.",
    },
    "echo_eater": {
        "art": "boss/a2_boss_echo_eater.webp",
        "refs": [],
        "prompt": "A tall hooded spectral figure made of torn black cloth and shredded data fragments, a single violet "
        "glowing eye, long clawed hands lit violet from within, floating in a flooded underground market tunnel "
        "with paper lanterns, broken screens orbiting it. Film VFX realism, eerie, smoke and rain.",
    },
    "ix": {
        "art": "boss/a3_boss_ix.webp",
        "refs": [],
        "prompt": "A towering humanoid administrator machine with smooth white ceramic armour plates and gold trim, a "
        "glowing red crystal core in its chest, standing calm and symmetrical in front of huge concentric rings of "
        "white light in a dark server hall. Real practical-suit / film VFX realism, cold and monumental.",
    },
    "rewrite": {
        "art": "ending/ending_noble_sacrifice.webp",
        "refs": [],
        "prompt": "A cloaked figure pressing both hands into a burning golden rupture inside a giant sphere of black "
        "cables high above a night city, streams of golden light particles and sparks pouring out over the "
        "skyline. Film VFX realism, heroic and tragic.",
    },
    "spire_dawn": {
        "art": "ending/ending_code_rewrite.webp",
        "refs": [CITY_REF],
        "prompt": "A lone figure in a coat standing on a high glass ledge at night looking at a vast white spire "
        "covered in glowing data panels, a pale cyan full moon, the neon city far below.",
    },
}


def png(data: bytes) -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.open(io.BytesIO(data)).convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


def ref_bytes(ref: str) -> bytes:
    if (ROOT / ref).exists():
        return (ROOT / ref).read_bytes()
    return subprocess.run(
        ["git", "show", f"1.0:{ref}"], cwd=ROOT, capture_output=True, check=True
    ).stdout


def generate(client, types, name: str) -> tuple[str, str]:
    shot = SHOTS[name]
    parts = [
        types.Part.from_bytes(data=png((ART / shot["art"]).read_bytes()), mime_type="image/png")
    ]
    parts += [
        types.Part.from_bytes(data=png(ref_bytes(r)), mime_type="image/png") for r in shot["refs"]
    ]
    style_note = (
        " Match the photographic look, lighting and realism of the later reference image(s)."
        if shot["refs"]
        else ""
    )
    prompt = (
        "Re-shoot the first reference image as a real photograph: keep its composition, camera angle, subject "
        f"placement and colour palette, but make everything photorealistic. {shot['prompt']}{style_note} {LOOK}"
    )
    cfg = types.GenerateContentConfig(
        response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio="16:9")
    )
    last = ""
    # The image models share a dynamic quota: back off on 429 before falling back to the faster model.
    for model in (MODEL, MODEL, MODEL, MODEL, FALLBACK):
        try:
            ledger_bump("image_calls")
            resp = client.models.generate_content(
                model=model, contents=[prompt, *parts], config=cfg
            )
            data = next(
                (
                    p.inline_data.data
                    for c in resp.candidates or []
                    for p in (c.content.parts if c.content else None) or []
                    if getattr(p, "inline_data", None) and p.inline_data.data
                ),
                None,
            )
            if not data:
                raise RuntimeError("no image returned")
            dest = OUT / f"{name}.png"
            dest.write_bytes(png(data))
            ledger_record(
                f"trailer/stills/{name}.png", {"model": model, "art": shot["art"], "prompt": prompt}
            )
            return name, f"ok {model}"
        except Exception as exc:
            ledger_bump("image_failed")
            last = f"{model}: {exc}"[:240]
            print(f"  {name}: {last}", file=sys.stderr)
            if "429" in last:
                time.sleep(45)
    return name, f"FAILED {last}"


CODEX_IMG = Path.home() / ".codex" / "generated_images"
TMP = OUT.parent / "codex_refs"


def codex_still(name: str) -> tuple[str, str]:
    """Same shot through the Codex CLI image tool (`codex exec -i <refs>`), as scripts/v2_assets/sprites/gen.py does."""
    import json
    import shutil

    from PIL import Image

    shot = SHOTS[name]
    TMP.mkdir(parents=True, exist_ok=True)
    refs = [TMP / f"{name}_art.png"]
    refs[0].write_bytes(png((ART / shot["art"]).read_bytes()))
    for k, r in enumerate(shot["refs"]):
        refs.append(TMP / f"{name}_ref{k}.png")
        refs[-1].write_bytes(png(ref_bytes(r)))
    prompt = (
        "Generate exactly one image with your image generation tool, landscape (1536x1024), and do nothing else "
        "(no files, no code). Use the first attached image only as the shot's layout: re-shoot that composition as a "
        "real photograph with real people, real materials and real light — it must NOT look painted, illustrated or "
        f"like concept art. {shot['prompt']}"
        + (
            " Match the photographic realism and the face of the person in the later attached image."
            if shot["refs"]
            else ""
        )
        + f" {LOOK} Keep the important subject inside the central 16:9 band (the top and bottom will be cropped)."
    )
    cmd = [
        "codex",
        "exec",
        prompt,
        "--cd",
        str(ROOT),
        "--sandbox",
        "read-only",
        "-c",
        "approval_policy=never",
        "--skip-git-repo-check",
        "--json",
    ]
    for r in refs:
        cmd += ["-i", str(r)]
    ledger_bump("codex_image_calls")
    proc = subprocess.run(
        cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=900
    )
    thread = next(
        (
            json.loads(line).get("thread_id")
            for line in proc.stdout.splitlines()
            if line.startswith("{") and json.loads(line).get("type") == "thread.started"
        ),
        None,
    )
    pngs = (
        sorted((CODEX_IMG / thread).glob("*.png"), key=lambda p: p.stat().st_mtime)
        if thread
        else []
    )
    if not pngs:
        ledger_bump("codex_image_failed")
        return name, f"FAILED codex thread={thread} {proc.stderr[-200:]}"
    raw = OUT / f"{name}.codex_raw.png"
    shutil.copy2(pngs[-1], raw)
    im = Image.open(raw).convert("RGB")
    h = round(im.width * 9 / 16)
    top = max(0, (im.height - h) // 2)
    im.crop((0, top, im.width, top + h)).resize((1920, 1080), Image.LANCZOS).save(
        OUT / f"{name}.png"
    )
    ledger_record(
        f"trailer/stills/{name}.png", {"model": "codex-image", "art": shot["art"], "prompt": prompt}
    )
    return name, f"ok codex thread={thread}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", required=True, choices=[*SHOTS, "all"])
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--engine", default="gemini", choices=["gemini", "codex"])
    args = ap.parse_args()
    from google import genai
    from google.genai import types

    client = genai.Client(vertexai=True, project=load_env(), location="global")
    OUT.mkdir(parents=True, exist_ok=True)
    names = list(SHOTS) if args.shot == "all" else [args.shot]
    names = [n for n in names if args.force or not (OUT / f"{n}.png").exists()]
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        if args.engine == "codex":
            results = list(pool.map(codex_still, names))
        else:
            results = list(pool.map(lambda n: generate(client, types, n), names))
    for name, msg in results:
        print(f"{name}: {msg}")
    return 0 if all(not m.startswith("FAILED") for _, m in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

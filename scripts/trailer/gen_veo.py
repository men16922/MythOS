"""Generate the cinematic trailer's AI shots with Vertex AI Veo (image-to-video, native ambience audio).

  .venv/bin/python scripts/trailer/gen_veo.py --shot all          # every missing shot
  .venv/bin/python scripts/trailer/gen_veo.py --shot ix --force   # regenerate one

Each shot animates one piece of the game's own key art (resources/neo-seoul/v2), so the cinematic matches the
game's look. Ported from the 1.x teaser pipeline (branch ``1.0``: scripts/cbt/generate_teaser_videos.py).
Auth mirrors scripts/v2_assets: google-genai with ``vertexai=True`` + ``PROJECT_ID`` from ``.env`` (ADC).
Every call is billed and counted in scripts/v2_assets/ledger.json (``veo_calls`` / ``veo_failed``).
Output: ``outputs/trailer/cinematic/veo/<shot>.mp4`` (gitignored).
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "v2_assets"))

from common import ledger_bump, ledger_record, load_env  # noqa: E402

ART = ROOT / "resources" / "neo-seoul" / "v2"
OUT = ROOT / "outputs" / "trailer" / "cinematic" / "veo"

# First model the project serves wins.
VEO_MODELS = ("veo-3.1-generate-001", "veo-3.0-generate-001", "veo-3.1-generate-preview")

AUDIO = " Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices."
STYLE = (
    " Keep the exact composition, characters, palette and painterly style of the reference image."
)
# --style photo animates the live-action stills from gen_stills.py instead of the painted key art.
STILLS = ROOT / "outputs" / "trailer" / "cinematic" / "stills"
PHOTO_STYLE = (
    " Photorealistic live-action film footage, real camera, natural motion blur; keep the exact composition, faces,"
    " costumes and lighting of the reference frame."
)

SHOTS: dict[str, dict[str, str]] = {
    "title": {
        "image": "art/title.webp",
        "prompt": (
            "Cinematic slow push-in on a lone figure in a long coat standing on the edge of a wet rooftop in a "
            "rain-soaked cyberpunk Seoul at night. Heavy rain streaks through cyan and magenta neon. Far away a "
            "white spire rises into storm clouds, a single red eye at its top slowly brightens. Small drones "
            "drift past with blinking red lights. The coat moves in the wind."
        ),
    },
    "blackout": {
        "image": "art/act1.webp",
        "prompt": (
            "A dark blacked-out alley in a cyberpunk city at night, rain falling on puddles. Two surveillance "
            "drones overhead sweep red search beams slowly across the wet ground, the orange tarp and the "
            "parked scooters. Steam drifts. Slow lateral camera move, tense and quiet."
        ),
    },
    "se_rin": {
        "image": "cutscenes/se_rin_first_light.webp",
        "prompt": (
            "A young Korean woman with long black hair in a black leather jacket stands in a rainy neon alley at "
            "night holding a paper coffee cup, steam rising from it. Police lights flash red and blue far behind "
            "her. She slowly lifts her eyes to the camera with a guarded, wry look. Gentle push-in, rain drops, "
            "shallow depth of field."
        ),
    },
    "haetae": {
        "image": "boss/a1_boss_haetae.webp",
        "prompt": (
            "A massive armoured suppression tank shaped like a mythical Korean haetae lion with tank treads, "
            "stone-and-steel scales and glowing golden eyes, advances slowly through a rainy neon street at "
            "night. Its red warning lights spin, treads grind, rain bounces off the armour, the eyes flare "
            "brighter. Low camera angle, slow dolly back, heavy and threatening."
        ),
    },
    "echo_eater": {
        "image": "boss/a2_boss_echo_eater.webp",
        "prompt": (
            "A hooded glitch-wraith made of black shredded data and violet light floats in a flooded underground "
            "market tunnel lit by lanterns. Fragments of broken screens orbit it and flicker. Its single violet "
            "eye pulses, its clawed hands slowly open, digital glitch artefacts ripple across its body. Slow "
            "push-in, eerie."
        ),
    },
    "ix": {
        "image": "boss/a3_boss_ix.webp",
        "prompt": (
            "A towering white humanoid administrator AI made of porcelain-like armour plates stands in front of "
            "concentric white halo rings in a dark void. A red crystal core glows in its chest. The halo rings "
            "slowly rotate, the red core pulses like a heartbeat, faint particles of light rise. The figure "
            "stays perfectly still and calm. Slow, monumental push-in."
        ),
    },
    "rewrite": {
        "image": "ending/ending_noble_sacrifice.webp",
        "prompt": (
            "A cloaked figure presses both hands into a burning golden rupture inside a giant sphere of black "
            "cables above a night city. Streams of golden light particles pour out and flow over the skyline, "
            "sparks and embers flying, cables straining. Slow orbiting camera, triumphant and tragic."
        ),
    },
    "spire_dawn": {
        "image": "ending/ending_code_rewrite.webp",
        "prompt": (
            "A lone figure stands on a high ledge looking at a vast white spire covered in glowing data panels "
            "under a pale moon above a cyberpunk city at night. The data panels slowly flicker and dissolve "
            "into drifting particles, the city lights twinkle below. Slow pull-back, quiet and hopeful."
        ),
    },
}


def png_bytes(path: Path) -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.open(path).convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


def generate(client, types, name: str, duration: int, resolution: str) -> tuple[str, str]:
    shot = SHOTS[name]
    source = STILLS / f"{name}.png" if OUT.name == "veo_photo" else ART / shot["image"]
    image = types.Image(image_bytes=png_bytes(source), mime_type="image/png")
    prompt = shot["prompt"] + STYLE + AUDIO
    last = ""
    for model in VEO_MODELS:
        try:
            ledger_bump("veo_calls")
            op = client.models.generate_videos(
                model=model,
                prompt=prompt,
                image=image,
                config=types.GenerateVideosConfig(
                    aspect_ratio="16:9",
                    resolution=resolution,
                    duration_seconds=duration,
                    number_of_videos=1,
                    generate_audio=True,
                    negative_prompt="text, letters, subtitles, watermark, logo, music, speech, extra limbs",
                ),
            )
            while not op.done:
                time.sleep(10)
                op = client.operations.get(op)
            if op.error:
                raise RuntimeError(str(op.error))
            videos = (op.response and op.response.generated_videos) or []
            video = videos[0].video if videos else None
            if video is None:
                raise RuntimeError("no video returned (safety filter?)")
            if not video.video_bytes and video.uri:
                client.files.download(file=video)
            if not video.video_bytes:
                raise RuntimeError(f"unrecognized video payload: {video!r}")
            dest = OUT / f"{name}.mp4"
            dest.write_bytes(video.video_bytes)
            ledger_record(
                f"trailer/{OUT.name}/{name}.mp4",
                {"model": model, "image": shot["image"], "prompt": prompt, "seconds": duration},
            )
            return name, f"ok {model} -> {dest.relative_to(ROOT)}"
        except Exception as exc:  # next model tier
            ledger_bump("veo_failed")
            last = f"{model}: {exc}"[:300]
            print(f"  {name}: {last}", file=sys.stderr)
    return name, f"FAILED {last}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", required=True, help="shot id or 'all'", choices=[*SHOTS, "all"])
    ap.add_argument("--duration", type=int, default=8)
    ap.add_argument("--resolution", default="1080p", choices=["720p", "1080p"])
    ap.add_argument("--force", action="store_true", help="regenerate shots that already exist")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument(
        "--style",
        default="art",
        choices=["art", "photo"],
        help="photo = animate gen_stills.py output",
    )
    args = ap.parse_args()
    global OUT, STYLE
    if args.style == "photo":
        OUT, STYLE = OUT.with_name("veo_photo"), PHOTO_STYLE

    from google import genai
    from google.genai import types

    project = load_env()
    client = genai.Client(vertexai=True, project=project, location="us-central1")
    OUT.mkdir(parents=True, exist_ok=True)
    names = list(SHOTS) if args.shot == "all" else [args.shot]
    names = [n for n in names if args.force or not (OUT / f"{n}.mp4").exists()]
    if not names:
        print("nothing to generate (use --force)")
        return 0
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        results = list(
            pool.map(lambda n: generate(client, types, n, args.duration, args.resolution), names)
        )
    for name, msg in results:
        print(f"{name}: {msg}")
    return 0 if all(not m.startswith("FAILED") for _, m in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Generate the teaser's AI impact clips via Vertex AI Veo (image-to-video).

Owner direction (2026-07-12): AI video is limited to impact bookends — the scene_01
opening hook and (optionally) the scene_10 CTA background. Everything else is direct
gameplay recording; see docs/cbt/v2/cbt_teaser_footage_division.md.

Auth mirrors the prod image path (`VertexImageProvider`): google-genai with
``vertexai=True`` + ``PROJECT_ID``/``GOOGLE_CLOUD_LOCATION`` from ``.env`` (ADC).
Each run is billed — generate one shot at a time and owner-review before the next.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# Ordered fallback: first model the project/location actually serves wins.
VEO_MODELS = (
    "veo-3.0-generate-001",
    "veo-3.1-generate-preview",
    "veo-2.0-generate-001",
)

SHOTS: dict[str, dict[str, str]] = {
    "serin_arrival": {
        "scene": "scene_01",
        "image": "resources/neo-seoul/opening/opening-01-serin-arrival.png",
        "prompt": (
            "A cinematic, slow-motion tracking shot in a narrow, wet alleyway of a "
            "cyberpunk city at night. Heavy rain falls, catching cyber-cyan and gold "
            "neon lights from Korean Hangul signs. A fierce, young Korean woman with "
            "long dark hair, wearing a worn leather rider jacket, stands next to a "
            "low-slung futuristic motorcycle with its engine softly idling. A red "
            "warning light from an overhead surveillance drone sweeps across her and "
            "the wet concrete. She slowly turns her head toward the camera with quiet "
            "resolve. Moody, tense atmosphere, cinematic lens flare, subtle camera "
            "push-in. Keep her face and outfit exactly as in the reference image."
        ),
    },
    "ix_confrontation": {
        "scene": "scene_09",
        "image": "resources/neo-seoul/scenes/ix_confrontation.png",
        "prompt": (
            "A dramatic, slow push-in shot inside a massive, cold dark server hall. "
            "A lone figure stands small in the foreground, facing a giant holographic "
            "digital entity made of blinking surveillance-camera arrays and cascading "
            "cyan code. The hologram slowly pulses and shifts, fragments of Korean "
            "Hangul warnings scrolling through the air. Red scanning beams sweep down "
            "toward the figure. High-contrast cyber-cyan against deep shadow, volumetric "
            "haze, ominous and monumental. Keep the composition and palette of the "
            "reference image; subtle camera motion only."
        ),
    },
    "cta_logo": {
        "scene": "scene_10",
        "image": "resources/neo-seoul/concept/00-project-mythos-main.png",
        "prompt": (
            "A slow, cinematic aerial pull-back over a massive rain-soaked cyberpunk "
            "city at dusk, revealing a towering white control spire. Millions of tiny "
            "cyber-cyan and gold neon lights flicker across the grid below. The rain "
            "begins to clear as a soft orange sunrise glows at the edge of the sky. "
            "Small drones drift past. Epic scale, highly detailed, gentle camera "
            "motion only. Keep the composition and palette of the reference image."
        ),
    },
}


def _env_from_dotenv(*names: str) -> str | None:
    import os

    for name in names:
        if os.environ.get(name):
            return os.environ[name]
    dotenv = REPO / ".env"
    if dotenv.exists():
        for line in dotenv.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, _, value = line.partition("=")
                if key.strip() in names and value.strip():
                    return value.strip().strip('"').strip("'")
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shot", required=True, choices=sorted(SHOTS))
    parser.add_argument("--duration", type=int, default=8, help="Seconds (model-clamped)")
    parser.add_argument("--resolution", default="1080p", choices=["720p", "1080p"])
    parser.add_argument("--model", default=None, help="Skip fallback and use this Veo model")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    from google import genai
    from google.genai import types

    shot = SHOTS[args.shot]
    image_path = REPO / shot["image"]
    if not image_path.exists():
        print(f"source art missing: {image_path}", file=sys.stderr)
        return 1
    output = args.output or (
        REPO / "docs" / "cbt" / "v2" / shot["scene"] / f"veo_{args.shot}_{args.resolution}.mp4"
    )
    output.parent.mkdir(parents=True, exist_ok=True)

    project = _env_from_dotenv("GOOGLE_CLOUD_PROJECT", "PROJECT_ID")
    location = _env_from_dotenv("GOOGLE_CLOUD_LOCATION") or "us-central1"
    if not project:
        print("PROJECT_ID missing from env/.env", file=sys.stderr)
        return 1
    client = genai.Client(vertexai=True, project=project, location=location)

    image = types.Image(image_bytes=image_path.read_bytes(), mime_type="image/png")
    models = [args.model] if args.model else list(VEO_MODELS)
    last_error: Exception | None = None
    for model in models:
        print(f"trying {model} @ {args.resolution}/{args.duration}s ...")
        try:
            config = types.GenerateVideosConfig(
                aspect_ratio="16:9",
                resolution=args.resolution,
                duration_seconds=args.duration,
                number_of_videos=1,
            )
            operation = client.models.generate_videos(
                model=model, prompt=shot["prompt"], image=image, config=config
            )
            while not operation.done:
                time.sleep(10)
                operation = client.operations.get(operation)
            if operation.error:
                raise RuntimeError(str(operation.error))
            videos = (operation.response and operation.response.generated_videos) or []
            video = videos[0].video if videos else None
            if video is None:
                raise RuntimeError("operation finished with no videos (safety filter?)")
            if not video.video_bytes and video.uri:
                client.files.download(file=video)
            if not video.video_bytes:
                raise RuntimeError(f"unrecognized video payload: {video!r}")
            output.write_bytes(video.video_bytes)
            print(f"saved: {output.relative_to(REPO)} (model={model})")
            return 0
        except Exception as exc:  # try the next model tier
            last_error = exc
            print(f"  {model} failed: {exc}", file=sys.stderr)
    print(f"all models failed; last error: {last_error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

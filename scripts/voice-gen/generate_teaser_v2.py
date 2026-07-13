"""Generate the ordered English Project MythOS CBT Teaser V2 narration MP3s.

Reads docs/cbt/v2/narration.en.json and ELEVENLAB_API_KEY from .env. The manifest
contains the exact timeline and source text, so a different approved narrator can
be regenerated deterministically with --voice-id.
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
MANIFEST_PATH = REPO / "docs" / "cbt" / "v2" / "narration.en.json"
OUTPUT_DIR = MANIFEST_PATH.parent


def api_key() -> str:
    match = re.search(
        r"^ELEVENLAB_API_KEY=(\S+)",
        (REPO / ".env").read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    if not match:
        raise RuntimeError("ELEVENLAB_API_KEY not found in .env")
    return match.group(1)


def synthesize(*, key: str, voice_id: str, model_id: str, text: str, destination: Path) -> None:
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=json.dumps(
            {
                "text": text,
                "model_id": model_id,
                "voice_settings": {"stability": 0.5},
            }
        ).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        destination.write_bytes(response.read())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice-id", help="Override the manifest's provisional narrator voice id")
    parser.add_argument("--force", action="store_true", help="Regenerate files that already exist")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    voice_id = args.voice_id or manifest["voice"]["voice_id"]
    key = api_key()
    for segment in manifest["segments"]:
        destination = OUTPUT_DIR / segment["file"]
        if destination.exists() and not args.force:
            print(f"skip: {destination.relative_to(REPO)}")
            continue
        synthesize(
            key=key,
            voice_id=voice_id,
            model_id=manifest["model_id"],
            text=segment["text"],
            destination=destination,
        )
        print(f"ok: {destination.relative_to(REPO)} ({destination.stat().st_size // 1024}KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

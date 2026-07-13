"""Generate the CBT teaser BGM with the ElevenLabs Music API.

Owner direction (2026-07-12): a dedicated ~2-minute track that keeps the Project
MythOS concept (rainy Neo-Seoul, loop melancholy, tactical resolve) but is easier
on the ear and more mainstream than the in-game ambient set. Instrumental only —
it sits under an English narrator.
"""
from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / "docs" / "cbt" / "v2" / "bgm"

PROMPT = (
    "Cinematic mainstream synthwave / melodic electronic trailer track, instrumental only. "
    "Rainy neon cyberpunk Seoul at night: warm analog synth pads, a simple memorable lead "
    "melody, soft side-chained bass, subtle vinyl rain texture. Structure for a 2-minute "
    "game teaser: 0-15s atmospheric intro with a lonely piano-like motif over rain; "
    "15-50s the motif grows hopeful with pulsing synths and light percussion; 50-85s "
    "tension rises into a driving tactical beat with punchy drums and arpeggios; 85-105s "
    "emotional lift, wide and heroic but restrained; final 15s clean resolving outro that "
    "decays to a single echoing note. Accessible, catchy, modern; no vocals, no harsh "
    "dissonance, no aggressive dubstep."
)


def _api_key() -> str | None:
    import os

    if os.environ.get("ELEVENLAB_API_KEY"):
        return os.environ["ELEVENLAB_API_KEY"]
    dotenv = REPO / ".env"
    if dotenv.exists():
        for line in dotenv.read_text().splitlines():
            if line.startswith("ELEVENLAB_API_KEY="):
                return line.partition("=")[2].strip().strip('"').strip("'")
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--length-ms", type=int, default=120000)
    parser.add_argument("--label", default="teaser_bgm_v1")
    parser.add_argument("--prompt", default=PROMPT)
    args = parser.parse_args()

    key = _api_key()
    if not key:
        print("ELEVENLAB_API_KEY missing", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUT_DIR / f"{args.label}.mp3"

    import json

    body = json.dumps(
        {"prompt": args.prompt, "music_length_ms": args.length_ms}
    ).encode()
    last_error = ""
    for endpoint in (
        "https://api.elevenlabs.io/v1/music",
        "https://api.elevenlabs.io/v1/music/compose",
    ):
        request = urllib.request.Request(
            endpoint,
            data=body,
            headers={"xi-api-key": key, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=600) as response:
                audio = response.read()
            output.write_bytes(audio)
            print(f"saved: {output.relative_to(REPO)} ({len(audio) / 1e6:.1f} MB)")
            return 0
        except Exception as exc:  # try the alternate endpoint shape
            detail = ""
            if hasattr(exc, "read"):
                try:
                    detail = exc.read().decode()[:300]  # type: ignore[attr-defined]
                except Exception:
                    pass
            last_error = f"{endpoint}: {exc} {detail}"
            print(f"  failed: {last_error}", file=sys.stderr)
    print(f"music generation failed; last error: {last_error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

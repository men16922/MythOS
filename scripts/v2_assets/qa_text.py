"""Vision QA: flag generated images that contain legible text (the art direction forbids any lettering) or an
obvious defect. Uses a Gemini text model (not the image budget).

  .venv/bin/python scripts/v2_assets/qa_text.py v2/events v2/cards ...   (paths relative to resources/neo-seoul/)
Writes nothing; prints one line per flagged image and a summary. Results are cached per file mtime in
~/.cache/mythos_v2_assets/qa.json so reruns only check new/changed files.
"""

from __future__ import annotations

import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW_DIR, RES, load_env

CACHE = RAW_DIR.parent / "qa.json"
MODEL = os.getenv("QA_MODEL", "gemini-3.5-flash")
PROMPT = (
    "You are checking game art that must contain NO readable text. Look carefully at signs, banners, screens, "
    "labels, clothing and logos. Report only characters a viewer could actually read as letters, words, numbers or "
    "a logo in any script (Latin, Korean, Japanese, Chinese...). Abstract neon squiggles or glyph-like shapes that do "
    "not form readable characters do NOT count. Also report an obvious anatomy defect (extra limbs, fused or "
    "missing fingers on a prominent hand, a malformed face) or a literal UI element / frame / letterbox band. "
    'Answer JSON: {"legible_text": "<the readable text, or empty>", "defect": "<short description, or empty>"}'
)
_lock = threading.Lock()


def _client():
    from google import genai

    return genai.Client(vertexai=True, project=load_env(), location="global")


def check(client, path: Path) -> dict:
    import io

    from google.genai import types
    from PIL import Image

    im = Image.open(path).convert("RGB")
    im.thumbnail((1280, 1280))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    resp = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg"), PROMPT],
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0),
    )
    try:
        return json.loads(resp.text)
    except Exception:
        return {"legible_text": "", "defect": f"unparsed: {str(resp.text)[:120]}"}


def main(argv: list[str]) -> int:
    files: list[Path] = []
    for it in argv:
        p = RES / it
        files += sorted(p.glob("*.webp")) if p.is_dir() else [p]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    client = _client()
    flagged = 0

    def run(f: Path) -> None:
        nonlocal flagged
        key = str(f.relative_to(RES))
        stamp = f.stat().st_mtime
        hit = cache.get(key)
        if not hit or hit.get("mtime") != stamp:
            try:
                res = check(client, f)
            except Exception as exc:
                res = {"legible_text": "", "defect": f"qa error {type(exc).__name__}"}
            hit = {**res, "mtime": stamp}
            with _lock:
                cache[key] = hit
        text, defect = (hit.get("legible_text") or "").strip(), (hit.get("defect") or "").strip()
        if text or defect:
            with _lock:
                flagged += 1
                print(f"FLAG {key}  text={text!r}  defect={defect!r}", flush=True)

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(run, files))
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, indent=1, ensure_ascii=False))
    print(f"checked {len(files)}  flagged {flagged}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

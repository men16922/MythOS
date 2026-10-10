"""Shared helpers for the Mythos 2.0 asset generators (images via Vertex Gemini, music via Lyria).

Everything lands under resources/neo-seoul/v2/. Every generator is idempotent: an output that already
exists is skipped unless its key is passed to --force. API usage is recorded in ledger.json next to this
file (call counts + the prompt used for each output) so reruns stay inside the budget.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import sys
import threading
import time
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / "resources" / "neo-seoul"
OUT = RES / "v2"
LEDGER_PATH = Path(__file__).resolve().parent / "ledger.json"
# Raw model outputs (PNG) are cached outside the repo so a re-crop never costs a regeneration.
RAW_DIR = Path(os.getenv("V2_ASSETS_RAW", str(Path.home() / ".cache" / "mythos_v2_assets" / "raw")))

IMAGE_BUDGET = int(os.getenv("V2_IMAGE_BUDGET", "220"))
LYRIA_BUDGET = int(os.getenv("V2_LYRIA_BUDGET", "40"))

STYLE = (
    "cinematic painterly concept art, cyberpunk Neo-Seoul noir, rain-slick surfaces, deep navy and teal "
    "shadows, cyan and magenta neon accents, warm gold highlights, volumetric haze, strong rim light, subtle "
    "film grain, high detail, absolutely no text, no letters, no signage lettering, no logos, no watermark, "
    "no UI elements, no frame or border"
)

# Companion id -> portrait (resources/neo-seoul/characters/<sprite>.png) + a short visual description that
# backs up the reference image.
COMPANIONS: dict[str, tuple[str, str]] = {
    "se_rin": (
        "se-rin",
        "Se-rin, a young Korean woman courier with long straight black hair and a black leather jacket",
    ),
    "tae_o": (
        "tae-o",
        "Tae-o, a rugged middle-aged Korean man with a scarred face, short black hair and a heavy black tactical coat",
    ),
    "han": (
        "han",
        "Han, a lean young Korean man hacker with messy black hair and a dark high-collared jacket",
    ),
    "su_ah": (
        "su-ah",
        "Su-ah, a young Korean woman engineer with tied-up black hair, thin glasses and a dark jacket with violet light",
    ),
    "kai": (
        "kai",
        "Kai, a slender android with white ceramic plating, a white faceplate and glowing blue eyes",
    ),
    "lin_yue": (
        "lin-yue",
        "Lin-yue, an elegant woman broker with black hair pinned with a gold hairpin and a black-and-gold high-collared dress",
    ),
}


def portrait(companion_id: str) -> Path:
    return RES / "characters" / f"{COMPANIONS[companion_id][0]}.png"


def load_env() -> str:
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError:  # pragma: no cover
        pass
    project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("PROJECT_ID")
    if not project:
        sys.exit("GOOGLE_CLOUD_PROJECT / PROJECT_ID is not set (.env)")
    return project


# ------------------------------------------------------------------------------------------- ledger

_ledger_lock = threading.Lock()


class _LedgerLock:
    """Thread lock + an flock on a sidecar file, so parallel generator processes never lose an update."""

    def __enter__(self):
        import fcntl

        _ledger_lock.acquire()
        RAW_DIR.parent.mkdir(parents=True, exist_ok=True)
        self._fh = (RAW_DIR.parent / "ledger.lock").open("w")
        fcntl.flock(self._fh, fcntl.LOCK_EX)
        return self

    def __exit__(self, *exc):
        import fcntl

        fcntl.flock(self._fh, fcntl.LOCK_UN)
        self._fh.close()
        _ledger_lock.release()


def _ledger_read() -> dict:
    if LEDGER_PATH.exists():
        return json.loads(LEDGER_PATH.read_text())
    return {"image_calls": 0, "image_failed": 0, "lyria_calls": 0, "lyria_failed": 0, "outputs": {}}


def _ledger_write(d: dict) -> None:
    tmp = LEDGER_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(d, indent=1, ensure_ascii=False, sort_keys=True))
    tmp.replace(LEDGER_PATH)


def ledger_bump(counter: str, n: int = 1) -> int:
    with _LedgerLock():
        d = _ledger_read()
        d[counter] = d.get(counter, 0) + n
        _ledger_write(d)
        return d[counter]


def ledger_record(key: str, info: dict) -> None:
    with _LedgerLock():
        d = _ledger_read()
        prev = d["outputs"].get(key, {})
        info = {
            **info,
            "generations": prev.get("generations", 0) + 1,
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        d["outputs"][key] = info
        _ledger_write(d)


def ledger_count(counter: str) -> int:
    with _LedgerLock():
        return _ledger_read().get(counter, 0)


# ------------------------------------------------------------------------------------------- images


@dataclass
class ImageJob:
    key: str  # output path relative to OUT, e.g. 'art/title.webp'
    prompt: str  # subject + composition; the shared STYLE is appended
    aspect: str  # model aspect ratio: '16:9' | '9:16' | '3:4' | '1:1'
    size: tuple[int, int]  # final (w, h)
    refs: list[Path] = field(default_factory=list)
    image_size: str | None = None  # '2K' for full-HD backgrounds
    post: str | None = None  # optional named post-process ('map_dim')
    trim_frame: bool = (
        False  # cards: cut away a drawn card frame / rounded border if the model painted one
    )

    def full_prompt(self) -> str:
        ref = ""
        if self.refs:
            ref = " Keep the character's face, hair and outfit the same as in the reference image (same character as the reference image), but redraw them in this scene."
        return f"{self.prompt.strip()}{ref} Style: {STYLE}."


_client_lock = threading.Lock()
_client = None


def _genai_client():
    global _client
    with _client_lock:
        if _client is None:
            from google import genai

            _client = genai.Client(
                vertexai=True, project=load_env(), location=os.getenv("IMAGEN_LOCATION", "global")
            )
        return _client


def _gemini_image(job: ImageJob, seed: int | None) -> bytes:
    from google.genai import types

    contents: list = [job.full_prompt()]
    contents.extend(
        types.Part.from_bytes(data=Path(ref).read_bytes(), mime_type="image/png")
        for ref in job.refs
    )
    img_cfg = {"aspect_ratio": job.aspect}
    if job.image_size:
        img_cfg["image_size"] = job.image_size
    cfg = types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(**img_cfg),
        seed=seed,
    )
    resp = _genai_client().models.generate_content(
        model=os.getenv("IMAGEN_MODEL", "gemini-3.1-flash-image"), contents=contents, config=cfg
    )
    for cand in resp.candidates or []:
        for part in (cand.content.parts if cand.content else None) or []:
            data = getattr(getattr(part, "inline_data", None), "data", None)
            if data:
                return bytes(data)
    reasons = [str(getattr(c, "finish_reason", "")) for c in (resp.candidates or [])]
    block = getattr(getattr(resp, "prompt_feedback", None), "block_reason", None)
    raise RuntimeError(f"model returned no images (finish={reasons} block={block})")


def _trim_letterbox(im):
    """Drop solid near-black bars the model sometimes paints at the top/bottom (letterboxing)."""
    import numpy as np

    g = np.asarray(im.convert("L")).astype(np.float32)
    h = g.shape[0]
    flat = (g.mean(axis=1) < 14) & (g.std(axis=1) < 7)
    top = 0
    while top < h // 4 and flat[top]:
        top += 1
    bot = h
    while bot > h - h // 4 and flat[bot - 1]:
        bot -= 1
    if top < 4 and h - bot < 4:
        return im
    return im.crop((0, top + 2 if top else 0, im.width, bot - 2 if bot < h else h))


def _frame_inset(lines, limit: int) -> int:
    """Inset of a painted border along one side: a flat dark run of lines, then a sharp brightness step."""
    import numpy as np

    lines = np.asarray(lines, dtype=np.float32)
    for i in range(6, limit):
        outer = lines[:i]
        om = float(outer.mean())
        if om >= 40:
            break
        # (a) near-black run then a clearly brighter interior (soft-edged frames)
        if outer.std() < 6 and float(lines[i + 4 : i + 12].mean()) > om * 2.0 + 18:
            return i
        # (b) flat dark-grey run then a sharp step (frames on dark artwork)
        if (
            i >= 12
            and outer.std() < 4
            and float(lines[i + 2] - lines[i - 1]) > 10
            and float(lines[i + 2 : i + 10].mean()) - om > 12
        ):
            return i
    return 0


def _trim_frame(im):
    import numpy as np

    g = np.asarray(im.convert("L")).astype(np.float32)
    h, w = g.shape
    lim_x, lim_y = int(w * 0.08), int(h * 0.08)
    left = _frame_inset(g[h // 4 : 3 * h // 4, : lim_x + 12].mean(axis=0), lim_x)
    right = _frame_inset(g[h // 4 : 3 * h // 4, ::-1][:, : lim_x + 12].mean(axis=0), lim_x)
    top = _frame_inset(g[: lim_y + 12, w // 4 : 3 * w // 4].mean(axis=1), lim_y)
    bottom = _frame_inset(g[::-1][: lim_y + 12, w // 4 : 3 * w // 4].mean(axis=1), lim_y)
    if sum(1 for v in (left, right, top, bottom) if v) < 3:
        return im
    m = max(left, right, top, bottom) + int(0.035 * w)  # clear the rounded corners too
    return im.crop((m, m, w - m, h - m))


def fit_image(raw: bytes, size: tuple[int, int], trim_frame: bool = False):
    """Centre-crop to the target aspect, then Lanczos-resize to `size`."""
    from PIL import Image

    im = _trim_letterbox(Image.open(BytesIO(raw)).convert("RGB"))
    if trim_frame:
        im = _trim_frame(im)
    tw, th = size
    w, h = im.size
    target = tw / th
    if w / h > target:  # too wide
        nw = round(h * target)
        x0 = (w - nw) // 2
        im = im.crop((x0, 0, x0 + nw, h))
    elif w / h < target:  # too tall
        nh = round(w / target)
        y0 = (h - nh) // 2
        im = im.crop((0, y0, w, y0 + nh))
    return im.resize((tw, th), Image.LANCZOS)


def post_process(im, name: str | None):
    """Named tone adjustments applied before encoding."""
    if not name:
        return im
    import numpy as np
    from PIL import Image

    a = np.asarray(im).astype(np.float32) / 255.0
    if name == "map_dim":
        # Node-map backdrop: keep it dark and flat so nodes always read on top.
        lum = a.mean(axis=2, keepdims=True)
        a = lum + (a - lum) * 0.85  # slightly desaturate
        a = np.power(a, 1.25)  # darken mids
        # Normalise so the faint line work lands at a fixed level (p99 ~0.17) whatever the raw exposure,
        # while the overall field stays near-black (mean <= 0.05).
        p99 = float(np.percentile(a, 99)) or 1.0
        a *= 0.17 / p99
        mean = float(a.mean())
        if mean > 0.05:
            a *= 0.05 / mean
        a = np.clip(a, 0.0, 0.45)
    elif name == "dim_light":
        a = np.power(a, 1.08) * 0.92
    return Image.fromarray(np.clip(a * 255.0 + 0.5, 0, 255).astype(np.uint8))


def save_webp(im, path: Path, quality: int = 82) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp.webp")
    im.save(tmp, "WEBP", quality=quality, method=6)
    tmp.replace(path)


def _seed_for(key: str, nonce: int) -> int:
    return int(hashlib.sha256(f"{key}#{nonce}".encode()).hexdigest()[:8], 16) % 2_000_000_000


class _RateGate:
    """Process-wide pacing for the image endpoint: a minimum gap between request starts that widens on
    429 (plus a shared cooldown every worker honours) and slowly narrows again on success."""

    def __init__(self, base: float = 3.0, ceiling: float = 30.0) -> None:
        self.base, self.ceiling = base, ceiling
        self.gap = base
        self.next_at = 0.0
        self.lock = threading.Lock()

    def wait(self) -> None:
        while True:
            with self.lock:
                now = time.monotonic()
                if now >= self.next_at:
                    self.next_at = now + self.gap
                    return
                delay = self.next_at - now
            time.sleep(min(delay, 5.0))

    def throttled(self) -> None:
        with self.lock:
            self.gap = min(self.ceiling, self.gap * 1.6)
            self.next_at = max(self.next_at, time.monotonic() + 20.0 + random.random() * 10)

    def succeeded(self) -> None:
        with self.lock:
            self.gap = max(self.base, self.gap * 0.9)


_GATE = _RateGate(base=float(os.getenv("V2_IMAGE_GAP_S", "3.0")))
_MAX_ATTEMPTS = 10


def run_image_job(job: ImageJob, force: bool = False, dry: bool = False) -> str:
    out = OUT / job.key
    raw_path = RAW_DIR / (job.key.rsplit(".", 1)[0] + ".png")
    if out.exists() and not force:
        return f"skip   {job.key}"
    if dry:
        return f"would  {job.key}  [{job.aspect} -> {job.size[0]}x{job.size[1]}{' +ref' if job.refs else ''}]\n        {job.full_prompt()[:240]}"
    if ledger_count("image_calls") >= IMAGE_BUDGET:
        return f"BUDGET {job.key} (image budget {IMAGE_BUDGET} reached)"
    nonce = ledger_read_generations(job.key)
    seed = _seed_for(job.key, nonce)
    data: bytes | None = None
    last_err = ""
    empties = 0
    for attempt in range(_MAX_ATTEMPTS):
        _GATE.wait()
        try:
            data = _gemini_image(job, seed)
            ledger_bump("image_calls")
            _GATE.succeeded()
            break
        except Exception as exc:
            text = str(exc)
            last_err = f"{type(exc).__name__}: {text[:200]}"
            if "image_size" in text or ("INVALID_ARGUMENT" in text and job.image_size):
                job.image_size = None  # model rejected the size hint: fall back to its default
                continue
            ledger_bump("image_failed")
            if "429" in text or "RESOURCE_EXHAUSTED" in text:
                _GATE.throttled()  # quota: not billed, wait and retry
                continue
            if "returned no images" in text:
                ledger_bump("image_calls")  # an empty answer still counts as a generation
                empties += 1
                seed = _seed_for(job.key, nonce + 100 + attempt)
                if empties >= 2:
                    break
                continue
            if attempt >= 3 or any(
                code in text for code in ("400 ", "403 ", "404 ", "NOT_FOUND", "PERMISSION_DENIED")
            ):
                break  # not retryable (bad model id / request / permission)
            time.sleep(5 + random.random() * 5)
    if data is None:
        return f"FAIL   {job.key}  {last_err}"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_bytes(data)
    im = post_process(fit_image(data, job.size, job.trim_frame), job.post)
    save_webp(im, out)
    ledger_record(
        job.key,
        {
            "prompt": job.full_prompt(),
            "seed": seed,
            "model": os.getenv("IMAGEN_MODEL", "gemini-3.1-flash-image"),
            "refs": [str(r.relative_to(ROOT)) for r in job.refs],
        },
    )
    kb = out.stat().st_size // 1024
    return f"ok     {job.key}  {job.size[0]}x{job.size[1]}  {kb} KB"


def repost_image_job(job: ImageJob) -> str:
    """Re-crop / re-post-process an output from its cached raw image (no API call)."""
    raw_path = RAW_DIR / (job.key.rsplit(".", 1)[0] + ".png")
    if not raw_path.exists():
        return f"noraw  {job.key}"
    out = OUT / job.key
    save_webp(
        post_process(fit_image(raw_path.read_bytes(), job.size, job.trim_frame), job.post), out
    )
    return f"repost {job.key}  {out.stat().st_size // 1024} KB"


def ledger_read_generations(key: str) -> int:
    with _LedgerLock():
        return _ledger_read()["outputs"].get(key, {}).get("generations", 0)


def run_image_jobs(
    jobs: Iterable[ImageJob], force: set[str] | None = None, dry: bool = False, workers: int = 4
) -> list[str]:
    force = force or set()
    jobs = list(jobs)
    results: list[str] = []

    def _forced(job: ImageJob) -> bool:
        stem = job.key.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        return "all" in force or job.key in force or stem in force

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(run_image_job, j, _forced(j), dry): j for j in jobs}
        for fut in as_completed(futs):
            try:
                line = fut.result()
            except Exception as exc:
                line = f"ERROR  {futs[fut].key}  {type(exc).__name__}: {exc}"
            print(line, flush=True)
            results.append(line)
    print(
        f"[ledger] image_calls={ledger_count('image_calls')} failed={ledger_count('image_failed')}",
        flush=True,
    )
    return results


def content_json() -> dict:
    """The v2 content registry as JSON (via node, which strips TS types natively)."""
    import subprocess

    out = subprocess.run(
        ["node", str(Path(__file__).resolve().parent / "dump_content.mjs")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return json.loads(out)

"""Generate the Mythos 2.0 score with Vertex Lyria and turn each clip into a seamless loop.

Usage (repo venv):
  .venv/bin/python scripts/v2_assets/gen_music.py                 # every missing track
  .venv/bin/python scripts/v2_assets/gen_music.py --only title,hub
  .venv/bin/python scripts/v2_assets/gen_music.py --force combat2  # new Lyria take (new seed)
  .venv/bin/python scripts/v2_assets/gen_music.py --reprocess      # rebuild loops from cached WAVs (no API)

Per track: one ~32.8 s Lyria take (48 kHz stereo WAV, cached under RAW_DIR/music/) ->
  1. skip a fade-in / fade-out if present (<= 1.5 s each side);
  2. pick the loop end k so the 3 s after it matches the 3 s at the loop start (onset-envelope + chroma
     similarity, then a sample-level phase nudge) — beats and harmony line up across the seam;
  3. loop = x[a:k] with x[k:k+3s] equal-power-crossfaded into its first 3 s, so the wrap from the last
     sample to the first is the original continuous signal (inaudible seam);
  4. constant gain to the target loudness (memoryless soft-clip only if peaks need it; no dynamic
     normalisation, which would break the seam), encode AAC 48 kHz stereo 160 kbps .m4a;
  5. verify: decoded length == loop length (encoder priming trimmed by the MP4 edit list), 27.5-31 s,
     stereo, no silence at either end, loudness within 1.5 LU of target, small wrap discontinuity.
A track failing verification gets one new Lyria take with a different seed.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (
    LYRIA_BUDGET,
    OUT,
    RAW_DIR,
    ledger_bump,
    ledger_count,
    ledger_read_generations,
    ledger_record,
    load_env,
)

SR = 48000
FADE_S = 3.0
NEGATIVE = "vocals, singing, sung lyrics, speech, spoken words, rap, narration, traditional folk instruments, gayageum, haegeum, acoustic folk, country, jazz"
IDENTITY = (
    "Instrumental video game soundtrack, continuous loopable section with no intro and no ending, steady energy "
    "from start to finish. Sleek modern dark cyberpunk synthwave and electronic music with deep pulsing analog sub-bass, "
    "crisp punchy electronic drums, atmospheric neo-noir synth pads, and sharp arpeggiated synthesizers. "
)
CALM, MID, HOT = -17.0, -16.0, -15.0

# key -> (brief, target integrated loudness LUFS)
TRACKS: dict[str, tuple[str, float]] = {
    "title": (
        "Iconic dark cyberpunk main theme, driving 96 bpm: deep resonant Reese bass swells, sleek hypnotic synth arpeggio motif, lush cinematic analog pads, crisp modern electronic slow-burn groove, cool, mysterious, and futuristic.",
        MID,
    ),
    "hub": (
        "Stylish cyberpunk underground safehouse groove, 92 bpm: warm deep synth bassline, crisp tight electronic chillhop beat, Rhodes-style neon synth chords, smooth atmospheric synth lead, sleek and immersive.",
        CALM,
    ),
    "map1": (
        "Tactical cyberpunk infiltration groove, 104 bpm: driving muted bassline, tight crisp hi-hats and electronic snare, dark atmospheric synth pulses, subtle radar-like synth plucks, focused and propulsive.",
        MID,
    ),
    "map2": (
        "Neon undercity night market electronic groove, 108 bpm: deep funky analog synth bass, syncopated electronic percussion, glossy cyberpunk synth leads, dark neon club atmosphere, stylish and energetic.",
        MID,
    ),
    "map3": (
        "High-tech megacorp spire infiltration, 110 bpm: crystalline digital synth arpeggios, deep pulsing sub-bass, tight precision electronic beat, cold futuristic pads, sleek and high-stakes.",
        MID,
    ),
    "event": (
        "Atmospheric cyberpunk narrative tension, 88 bpm: deep warm pulsing bass, subtle minimal electronic beat, evolving dark neon synth pads, clean hypnotic synth pluck melody, immersive and mysterious.",
        CALM,
    ),
    "shop": (
        "Cool black-market cyber-broker beat, 98 bpm: bouncy deep synth bassline, tight snappy electronic drums, sleek retro-futuristic synth chords, confident and stylish.",
        CALM,
    ),
    "rest": (
        "Calm neon rain safehouse synth chill, 84 bpm: warm lush analog synth pads, gentle deep bass pulse, soft muted electronic rhythm, dreamy cyberpunk melody, restorative and modern.",
        CALM,
    ),
    "combat1": (
        "High-energy dark synthwave tactical battle, 126 bpm: hard-hitting punchy electronic drums, relentless driving 16th-note analog bassline, razor-sharp cyberpunk synth lead, energetic arpeggios, adrenaline-fueled.",
        HOT,
    ),
    "combat2": (
        "Aggressive cyberpunk midtempo electro-industrial battle, 130 bpm: heavy gritty synth bass, punchy breakbeat electronic drums, sharp aggressive synth stabs, high-momentum futuristic combat.",
        HOT,
    ),
    "combat3": (
        "Relentless high-tech cyber-tactical battle, 134 bpm: fast driving synth bass, pounding electronic drums, soaring dark synthwave lead melody, intense futuristic arpeggios, urgent and powerful.",
        HOT,
    ),
    "elite": (
        "Deadly cyberpunk elite boss encounter, 132 bpm: massive distorted Reese bass, heavy industrial electronic drums, menacing dark synth lead, relentless driving rhythm, dangerous and thrilling.",
        HOT,
    ),
    "boss1": (
        "Heavy mechanical boss battle, 128 bpm: thundering industrial electronic drums, brassy cyberpunk synth horns, massive sub-bass riffs, relentless dark synthwave energy.",
        HOT,
    ),
    "boss2": (
        "Chaotic glitch-synth cyberpunk boss battle, 136 bpm: aggressive detuned synth leads, hard-hitting fast breakbeats, heavy distorted bassline, intense and futuristic.",
        HOT,
    ),
    "boss_ix": (
        "Epic final AI boss battle, 140 bpm: grand cinematic synth-orchestral hybrid, driving fast electronic drums, massive pulsing bass, soaring dark synth lead melody, climactic and decisive.",
        HOT,
    ),
    "victory": (
        "Triumphant cyberpunk victory groove, 110 bpm: bright heroic synthwave lead melody, punchy upbeat electronic drums, warm driving analog bass, satisfying and victorious.",
        MID,
    ),
    "defeat": (
        "Dark cyberpunk game over, 72 bpm: deep low analog synth drone, slow minimal electronic pulse, melancholic fading synth melody, clean and atmospheric.",
        CALM,
    ),
    "ending": (
        "Cinematic cyberpunk credits theme, 94 bpm: sweeping warm analog synth pads, emotional arpeggiated synth melody, steady modern electronic beat, deep bass, bittersweet and memorable.",
        MID,
    ),
}

_project: str | None = None
_token_lock = threading.Lock()
_creds = None


def _token() -> str:
    global _creds
    import google.auth
    import google.auth.transport.requests

    with _token_lock:
        if _creds is None:
            _creds, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        if not _creds.valid:
            _creds.refresh(google.auth.transport.requests.Request())
        return _creds.token


def lyria(prompt: str, seed: int) -> bytes:
    import requests

    url = (
        f"https://us-central1-aiplatform.googleapis.com/v1/projects/{_project}/locations/us-central1/"
        "publishers/google/models/lyria-002:predict"
    )
    body = {
        "instances": [{"prompt": prompt, "negative_prompt": NEGATIVE, "seed": seed}],
        "parameters": {},
    }
    delays = (15, 30, 60, 90)
    for attempt in range(len(delays) + 1):
        if ledger_count("lyria_calls") >= LYRIA_BUDGET:
            raise RuntimeError(f"Lyria budget {LYRIA_BUDGET} reached")
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"},
            data=json.dumps(body),
            timeout=240,
        )
        if resp.ok:
            ledger_bump("lyria_calls")
            pred = resp.json()["predictions"][0]
            return base64.b64decode(pred.get("bytesBase64Encoded") or pred["audioContent"])
        ledger_bump("lyria_failed")
        if resp.status_code in (429, 500, 503) and attempt < len(delays):
            time.sleep(delays[attempt])
            continue
        raise RuntimeError(f"Lyria HTTP {resp.status_code}: {resp.text[:200]}")
    raise RuntimeError("unreachable")


# ------------------------------------------------------------------------------------------- audio io


def read_wav(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def write_wav(x: np.ndarray, path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-f",
            "f32le",
            "-ar",
            str(SR),
            "-ac",
            "2",
            "-i",
            "-",
            "-c:a",
            "pcm_f32le",
            str(path),
        ],
        input=np.ascontiguousarray(x, dtype=np.float32).tobytes(),
        check=True,
    )


def loudness(path: Path) -> tuple[float, float]:
    """(integrated LUFS, true peak dBTP) via ffmpeg loudnorm's analysis pass."""
    err = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-i",
            str(path),
            "-af",
            "loudnorm=print_format=json",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    ).stderr
    data = json.loads(err[err.rindex("{") : err.rindex("}") + 1])
    return float(data["input_i"]), float(data["input_tp"])


# ------------------------------------------------------------------------------------------- looping


def _frames_rms(mono: np.ndarray, hop: int) -> np.ndarray:
    n = len(mono) // hop
    return np.sqrt((mono[: n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)


def _stft_mag(mono: np.ndarray, hop: int = 480, win: int = 4096) -> np.ndarray:
    n = 1 + (len(mono) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    frames = mono[idx] * np.hanning(win)[None, :]
    return np.abs(np.fft.rfft(frames, axis=1))  # (n, win/2+1); frame i starts at sample i*hop


def _chroma(mag: np.ndarray, win: int = 4096) -> np.ndarray:
    freqs = np.fft.rfftfreq(win, 1.0 / SR)
    ok = (freqs > 60) & (freqs < 4000)
    pc = (np.round(12 * np.log2(freqs[ok] / 440.0)) % 12).astype(int)
    out = np.zeros((mag.shape[0], 12))
    for p in range(12):
        out[:, p] = mag[:, ok][:, pc == p].sum(axis=1)
    return out


def _ncorr(a: np.ndarray, b: np.ndarray) -> float:
    a = a - a.mean()
    b = b - b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d > 0 else 0.0


def make_loop(x: np.ndarray) -> tuple[np.ndarray, dict]:
    mono = x.mean(axis=1)
    n = len(mono)
    hop = 480  # 10 ms
    rms = _frames_rms(mono, hop)
    med = float(np.median(rms))
    loud = np.where(rms >= 0.5 * med)[0]
    max_trim = int(1.5 * SR)
    a = min(int(loud[0]) * hop if len(loud) else 0, max_trim)
    b = max(n - max_trim, min(n, (int(loud[-1]) + 1) * hop if len(loud) else n))
    fade_n = int(FADE_S * SR)
    hi = b - fade_n
    lo = max(a + int(27.5 * SR), hi - int(2.0 * SR))
    if lo >= hi:
        lo = hi - int(0.5 * SR)

    mag = _stft_mag(mono, hop)
    flux = np.maximum(np.diff(np.log1p(mag), axis=0), 0).sum(axis=1)
    flux = np.concatenate([[0.0], flux])
    chroma = _chroma(mag)
    nf = fade_n // hop
    fa = a // hop
    head_flux = flux[fa : fa + nf]
    head_chroma = chroma[fa : fa + nf].mean(axis=0)
    best, best_k = -9.0, hi
    for kf in range(lo // hop, hi // hop + 1):
        if kf + nf > len(flux):
            break
        c1 = _ncorr(head_flux, flux[kf : kf + nf])
        tc = chroma[kf : kf + nf].mean(axis=0)
        c2 = float(head_chroma @ tc / (np.linalg.norm(head_chroma) * np.linalg.norm(tc) + 1e-12))
        score = 0.65 * c1 + 0.35 * c2
        if score > best:
            best, best_k = score, kf * hop
    # Sample-level phase nudge (+-5 ms) on the low-passed waveform.
    w = 4096
    k0 = best_k
    head = mono[a : a + w]
    best_c, k = -9.0, k0
    for d in range(-240, 241, 4):
        kk = k0 + d
        if kk < lo - 240 or kk + fade_n > n:
            continue
        c = _ncorr(head, mono[kk : kk + w])
        if c > best_c:
            best_c, k = c, kk
    loop = x[a:k].copy()
    t = np.linspace(0.0, 1.0, fade_n, endpoint=False, dtype=np.float64)[:, None]
    fin, fout = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)
    loop[:fade_n] = (x[a : a + fade_n] * fin + x[k : k + fade_n] * fout).astype(np.float32)
    info = {
        "start_s": round(a / SR, 3),
        "end_s": round(k / SR, 3),
        "len_s": round(len(loop) / SR, 3),
        "match": round(best, 3),
        "phase": round(best_c, 3),
    }
    return loop, info


def _softclip(y: np.ndarray) -> np.ndarray:
    """Memoryless soft-knee limiter: no envelope state, so the loop seam stays intact."""
    thr, ceil = 0.55, 0.80
    mag = np.abs(y)
    return np.where(
        mag > thr, np.sign(y) * (thr + (ceil - thr) * np.tanh((mag - thr) / (ceil - thr))), y
    )


def gain_to_target(loop: np.ndarray, target: float, tmp: Path) -> tuple[np.ndarray, dict]:
    p = tmp / "pre.wav"
    write_wav(loop, p)
    li, tp = loudness(p)
    g_db = target - li
    clipped = False
    y = loop
    for _ in range(3):
        y = loop * np.float32(10 ** (g_db / 20))
        if tp + g_db <= -1.0:
            break
        clipped = True
        y = _softclip(y)
        write_wav(y, p)
        got, _tp = loudness(p)
        if abs(got - target) <= 0.4:
            break
        g_db += target - got
    return y.astype(np.float32), {
        "in_lufs": round(li, 2),
        "in_tp": round(tp, 2),
        "gain_db": round(g_db, 2),
        "softclip": clipped,
    }


def encode(loop: np.ndarray, out: Path, tmp: Path) -> None:
    src = tmp / "loop.wav"
    write_wav(loop, src)
    out.parent.mkdir(parents=True, exist_ok=True)
    part = out.with_suffix(".part.m4a")
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(src),
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-ar",
            str(SR),
            "-ac",
            "2",
            # Sample-exact edit list: the default movie timescale (1000) rounds the trimmed length to 1 ms,
            # which would skip up to 47 samples at the loop wrap.
            "-movie_timescale",
            str(SR),
            "-movflags",
            "+faststart",
            str(part),
        ],
        check=True,
    )
    part.replace(out)


def verify(out: Path, loop: np.ndarray, target: float, quiet: bool) -> tuple[bool, dict]:
    """Checks the file the way a browser decodes it: the MP4 edit list trims the encoder priming and the
    last packet's duration trims the padding, so the playable length is the stream's duration_ts."""
    expect_len = len(loop)
    probe = json.loads(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(out)],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    )["streams"][0]
    playable = int(probe.get("duration_ts", 0))
    y = read_wav(out)
    # Priming must already be removed: the decoded signal starts where the loop starts.
    m, ym = loop.mean(axis=1), y.mean(axis=1)
    seg = m[SR : SR + 8192]
    offset = max(
        range(-1500, 1501, 4), key=lambda d: float(np.dot(seg, ym[SR + d : SR + d + 8192]))
    )
    y = y[:playable]
    dur = len(y) / SR
    li, tp = loudness(out)
    sil = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-i",
            str(out),
            "-af",
            f"silencedetect=noise={-55 if quiet else -48}dB:d=0.25",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    ).stderr
    starts = [float(v) for v in re.findall(r"silence_start: ([\d.]+)", sil)]
    ends = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", sil)]
    edge_silence = (
        any(s < 0.3 for s in starts)
        or any(e > dur - 0.3 for e in ends)
        or (len(starts) > len(ends))
    )
    diffs = np.abs(np.diff(y, axis=0)).max(axis=1)
    seam = float(np.abs(y[0] - y[-1]).max())
    seam_ratio = seam / (float(np.percentile(diffs, 99.9)) + 1e-9)
    r_end = float(np.sqrt((y[-2400:] ** 2).mean()))
    r_start = float(np.sqrt((y[:2400] ** 2).mean()))
    seam_db = 20 * np.log10((r_start + 1e-9) / (r_end + 1e-9))
    info = {
        "dur_s": round(dur, 3),
        "len_delta": playable - expect_len,
        "priming_offset": offset,
        "channels": probe.get("channels"),
        "sr": probe.get("sample_rate"),
        "codec": probe.get("codec_name"),
        "lufs": round(li, 2),
        "tp": round(tp, 2),
        "edge_silence": edge_silence,
        "seam_ratio": round(seam_ratio, 3),
        "seam_rms_db": round(seam_db, 2),
        "kbps": round(out.stat().st_size * 8 / dur / 1000, 1),
    }
    ok = (
        27.5 <= dur <= 31.0
        and probe.get("channels") == 2
        and str(probe.get("sample_rate")) == str(SR)
        and not edge_silence
        and abs(li - target) <= 1.5
        and abs(seam_db) < 4.0
        and abs(playable - expect_len) <= 2
        and offset == 0
    )
    return ok, info


QUIET = {"defeat", "rest", "event", "title"}


def process(key: str, wav: Path, out: Path) -> tuple[bool, dict]:
    target = TRACKS[key][1]
    x = read_wav(wav)
    loop, linfo = make_loop(x)
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        loop, ginfo = gain_to_target(loop, target, tmp)
        encode(loop, out, tmp)
    ok, vinfo = verify(out, loop, target, key in QUIET)
    return ok, {**linfo, **ginfo, **vinfo}


def seed_for(key: str, nonce: int) -> int:
    import hashlib

    return int(hashlib.sha256(f"music:{key}#{nonce}".encode()).hexdigest()[:8], 16) % 1_000_000_000


def run_track(key: str, force: bool, reprocess: bool) -> str:
    out = OUT / "music" / f"{key}.m4a"
    wav = RAW_DIR / "music" / f"{key}.wav"
    if out.exists() and not force and not reprocess:
        return f"skip   {key}"
    prompt = IDENTITY + TRACKS[key][0]
    takes = 0
    history: list[dict] = []
    need_take = force or not wav.exists()
    while True:
        if need_take:
            seed = seed_for(key, ledger_read_generations(f"music/{key}.m4a"))
            data = lyria(prompt, seed)
            wav.parent.mkdir(parents=True, exist_ok=True)
            wav.write_bytes(data)
            ledger_record(f"music/{key}.m4a", {"prompt": prompt, "seed": seed})
            takes += 1
        ok, info = process(key, wav, out)
        if ok or reprocess or takes >= 2:
            status = "ok    " if ok else "WARN  "
            prior = f"  rejected={json.dumps(history)}" if history else ""
            return f"{status} {key}  takes={takes}  {json.dumps(info)}{prior}"
        history.append(info)
        need_take = True  # one new take with a different seed


def main(argv: list[str] | None = None) -> int:
    global _project
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--only", default="")
    ap.add_argument("--force", default="", help="comma list of keys for a new Lyria take, or 'all'")
    ap.add_argument("--reprocess", action="store_true", help="rebuild loops from cached WAVs only")
    ap.add_argument("--workers", type=int, default=3)
    args = ap.parse_args(argv)
    _project = load_env()
    keys = [k for k in TRACKS if not args.only or k in args.only.split(",")]
    force = set(args.force.split(",")) if args.force else set()
    if args.reprocess:
        keys = [k for k in keys if (RAW_DIR / "music" / f"{k}.wav").exists()]
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {
            pool.submit(run_track, k, "all" in force or k in force, args.reprocess): k for k in keys
        }
        for fut in as_completed(futs):
            try:
                line = fut.result()
            except Exception as exc:
                line = f"FAIL   {futs[fut]}  {type(exc).__name__}: {exc}"
            print(line, flush=True)
            results.append(line)
    print(
        f"[ledger] lyria_calls={ledger_count('lyria_calls')} failed={ledger_count('lyria_failed')}",
        flush=True,
    )
    return 1 if any(r.startswith("FAIL") for r in results) else 0


if __name__ == "__main__":
    os.environ.setdefault("PYTHONUNBUFFERED", "1")
    raise SystemExit(main())

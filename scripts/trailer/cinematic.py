"""Cinematic trailer for Mythos 2.0: Veo key-art shots + real gameplay + IX narration + a dedicated music track.

  .venv/bin/python scripts/trailer/gen_veo.py --shot all                              # 1. AI shots (Vertex Veo)
  .venv/bin/python scripts/trailer/record_trailer.py --out outputs/trailer/hq --scale 1.5 --record-only  # 2. gameplay
  .venv/bin/python scripts/trailer/cinematic.py audio                                # 3. narration + music (ElevenLabs)
  .venv/bin/python scripts/trailer/cinematic.py build                                # 4. cut → outputs/trailer/cinematic/

Ported from the 1.x teaser pipeline (branch ``1.0``: scripts/cbt/*, published teaser V2). Edit TIMELINE / NARRATION
below and rerun ``build``; ``audio --force <id>`` regenerates one line. Narration is English (owner
direction 2026-10-13); voices in VOICES (``--ix-voice`` / ``--se-rin-voice`` override); ``build --skip <id>`` drops a line.
Output: ``outputs/trailer/cinematic/mythos2_cinematic.mp4`` (1920x1080, 30 fps, H.264 + AAC 48 kHz stereo master)
and ``mythos2_cinematic_web.mp4`` (same cut, lighter encode for sharing).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "outputs" / "trailer" / "cinematic"
VEO = OUT / "veo"
VO = OUT / "vo_en"
GAME = ROOT / "outputs" / "trailer" / "hq" / "raw"
ART = ROOT / "resources" / "neo-seoul" / "v2"
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
W, H, FPS = 1920, 1080, 30

# kind, source, start offset in the source (s; negative = from the end), length (s), caption (ko, en)
TIMELINE: list[tuple[str, str, float, float, tuple[str, str] | None]] = [
    ("veo", "title", 0.0, 8.0, None),
    ("veo", "blackout", 0.5, 6.0, None),
    ("veo", "se_rin", 0.5, 6.5, None),
    (
        "game",
        "03_combat",
        -10.0,
        9.0,
        ("적이 칠 칸이 미리 보인다", "Every enemy move is telegraphed"),
    ),
    ("game", "02_event", -5.0, 4.0, ("모든 선택에는 대가가 있다", "Every choice has a price")),
    ("game", "04_cutscene", -5.5, 4.0, ("함께 걸은 사람들", "The people who walk with you")),
    ("game", "05_ix", -4.5, 4.0, ("IX는 당신의 선택을 기억한다", "IX remembers what you chose")),
    ("veo", "haetae", 1.0, 4.5, None),
    ("veo", "echo_eater", 1.0, 4.5, None),
    ("veo", "ix", 0.0, 8.0, None),
    ("veo", "rewrite", 0.5, 6.0, None),
    ("veo", "spire_dawn", 0.5, 6.0, None),
    ("card", "logo", 0.0, 8.0, None),
]

# id, speaker, text (English, from the game's authored IX/Se-rin lines; eleven_v3 delivery tags), cue (timeline s).
# Owner direction 2026-10-13: English narration only; Korean voices are no longer candidates.
NARRATION: list[tuple[str, str, str, float]] = [
    (
        "01_ix_welcome",
        "ix",
        "[cold, measured] Good evening. [pause] You appear to be unregistered.",
        1.2,
    ),
    (
        "02_ix_score",
        "ix",
        "Your citizen score does not exist. [pause] This is a temporary condition.",
        8.6,
    ),
    (
        "03_serin_run",
        "se_rin",
        "[urgent, breathless] Not registered? Then you're still a person. [shouts] Run!",
        15.6,
    ),
    (
        "04_ix_last",
        "ix",
        "Last time, you stopped at the Hae-tae. [pause] This time will not be much different.",
        30.0,
    ),
    (
        "05_ix_hate",
        "ix",
        "[quietly menacing] I do not hate you. [pause] Hatred is inefficient. [whispers] I will simply... conclude you.",
        50.6,
    ),
    ("06_ix_win", "ix", "[slowly] Congratulations. [pause] You defeated me.", 60.4),
    ("07_ix_loop", "ix", "[quietly] And the loop... has begun again.", 66.2),
]
# Owner-picked voices (2026-10-13). IX: "Adam" (deep narrative). Se-rin: shared-library "Ember - Energetic,
# Confident Protagonist", owner's pick from a 14-take audition (outputs/trailer/cinematic/audition_serin). The take in
# vo_en/03_serin_run.mp3 is hand-cleaned (adeclick, light afftdn, a 0.14 s gate on a mouth click before "Run!",
# limiter) — `audio --force 03_serin_run` would replace it with a fresh, uncleaned take.
VOICES = {"ix": "wBXNqKUATyqu0RtYt25i", "se_rin": "WtA85syCrJwasGeHGH2p"}
# Se-rin's take wants the most expressive setting (eleven_v3: 0.0 = creative); IX stays a little steadier.
STABILITY = {"ix": 0.3, "se_rin": 0.0}

MUSIC_PROMPT = (
    "Cinematic dark synthwave trailer score, instrumental only, about 82 seconds, for a cyberpunk tactics game "
    "set in a rainy neon Seoul ruled by a polite, cold AI. 0-20s: rain texture, a lonely detuned synth motif, low "
    "sub pulse, sparse and tense. 20s: a sharp impact hit, then 20-41s a driving tactical beat with punchy drums, "
    "ticking arpeggios and gritty bass. 41-50s: two huge boss impact hits with distorted brass-like synths. "
    "50-58s: sudden drop to near silence, cold choir-like pad and a slow heartbeat. 58-70s: emotional heroic lift "
    "with wide pads and the motif returning in full. 70-82s: resolve into a clean final chord that decays to a single "
    "echoing note. Modern, catchy, cinematic; no vocals, no lyrics, no dubstep wobble."
)
TITLE = (
    "세계:접속",
    "SIGNAL RUN",
    "You decide how this loop ends.",
    "Neo-Seoul · tactical deck-builder roguelite",
)


# --------------------------------------------------------------------------- helpers
def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(out.stdout.strip())


def api_key() -> str:
    m = re.search(
        r"^ELEVENLAB_API_KEY=(\S+)", (ROOT / ".env").read_text(encoding="utf-8"), re.MULTILINE
    )
    if not m:
        raise SystemExit("ELEVENLAB_API_KEY missing from .env")
    return m.group(1).strip("\"'")


def eleven(path: str, body: dict, dest: Path, key: str, timeout: int = 300) -> None:
    req = urllib.request.Request(
        f"https://api.elevenlabs.io{path}",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            dest.write_bytes(resp.read())
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"ElevenLabs {path}: {exc.code} {exc.read().decode()[:300]}") from exc


# --------------------------------------------------------------------------- audio
def cmd_audio(args: argparse.Namespace) -> int:
    key = api_key()
    VO.mkdir(parents=True, exist_ok=True)
    voices = {"ix": args.ix_voice or VOICES["ix"], "se_rin": args.se_rin_voice or VOICES["se_rin"]}
    force = set(args.force or [])
    for vid, speaker, text, _cue in NARRATION:
        dest = VO / f"{vid}.mp3"
        if dest.exists() and vid not in force and "all" not in force:
            continue
        eleven(
            f"/v1/text-to-speech/{voices[speaker]}?output_format=mp3_44100_192",
            {
                "text": text,
                "model_id": "eleven_v3",
                "voice_settings": {"stability": STABILITY[speaker]},
            },
            dest,
            key,
        )
        print(f"vo  {vid} ({duration(dest):.1f}s)")
    music = OUT / "music.mp3"
    if not music.exists() or "music" in force or "all" in force:
        eleven(
            "/v1/music",
            {"prompt": MUSIC_PROMPT, "music_length_ms": args.music_ms},
            music,
            key,
            timeout=900,
        )
        print(f"music ({duration(music):.1f}s)")
    return 0


# --------------------------------------------------------------------------- video
def text_png(
    lines: list[tuple[str, int, tuple[int, int, int], int]], dest: Path, strip: bool
) -> Path:
    """Transparent full frame with centred lines (text, size, colour, y). This ffmpeg build has no drawtext."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if strip:
        draw.rectangle((0, H - 170, W, H), fill=(2, 8, 14, 175))
    for text, size, colour, y in lines:
        font = ImageFont.truetype(FONT, size)
        box = draw.textbbox((0, 0), text, font=font)
        x = (W - (box[2] - box[0])) // 2
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 210))
        draw.text((x, y), text, font=font, fill=(*colour, 255))
    img.save(dest)
    return dest


def segment(
    i: int, kind: str, src: str, start: float, length: float, caption: tuple[str, str] | None
) -> Path:
    """One normalised 1920x1080/30 fps clip with a stereo 48 kHz track (Veo ambience, or silence)."""
    seg = OUT / "segments"
    seg.mkdir(parents=True, exist_ok=True)
    dest = seg / f"{i:02d}_{src}.mp4"
    fade = f"fade=t=in:st=0:d=0.3,fade=t=out:st={length - 0.3:.2f}:d=0.3"
    if kind == "card":
        bg = OUT / "logo_bg.png"
        from PIL import Image, ImageEnhance, ImageFilter

        art = (
            Image.open(
                OUT / "stills" / "title.png"
                if VEO.name == "veo_photo"
                else ART / "art" / "title.webp"
            )
            .convert("RGB")
            .resize((W, H))
        )
        ImageEnhance.Brightness(art.filter(ImageFilter.GaussianBlur(6))).enhance(0.35).save(bg)
        overlay = text_png(
            [
                (TITLE[0], 150, (236, 246, 250), H // 2 - 210),
                (TITLE[1], 62, (92, 242, 216), H // 2 - 20),
                (TITLE[2], 44, (230, 230, 230), H // 2 + 90),
                (TITLE[3], 32, (160, 180, 190), H // 2 + 170),
            ],
            OUT / "logo_text.png",
            strip=False,
        )
        inputs = [
            "-loop",
            "1",
            "-t",
            f"{length}",
            "-i",
            str(bg),
            "-loop",
            "1",
            "-t",
            f"{length}",
            "-i",
            str(overlay),
        ]
        inputs += ["-f", "lavfi", "-t", f"{length}", "-i", "anullsrc=r=48000:cl=stereo"]
        graph = (
            f"[0:v]scale={W}:{H},zoompan=z='1+0.0006*on':d=1:s={W}x{H}:fps={FPS}[b];"
            f"[1:v]format=rgba,fade=t=in:st=0.6:d=1.0:alpha=1[t];[b][t]overlay=0:0,{fade},format=yuv420p[v]"
        )
        audio_map = "2:a"
    else:
        path = VEO / f"{src}.mp4" if kind == "veo" else GAME / f"{src}.mp4"
        if not path.exists():
            raise SystemExit(f"missing source {path}")
        ss = start if start >= 0 else max(0.0, duration(path) + start)
        inputs = ["-ss", f"{ss:.2f}", "-t", f"{length}", "-i", str(path)]
        graph = f"[0:v]scale={W}:{H}:flags=lanczos,fps={FPS},setsar=1"
        if kind == "game":
            # Real UI footage: a slow push-in so it reads as part of the film, not a screen capture.
            graph += f",zoompan=z='1.0+0.0008*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}"
        graph += f",{fade}"
        if caption:
            cap = text_png(
                [
                    (caption[1], 50, (255, 255, 255), H - 150),
                    (caption[0], 30, (170, 225, 230), H - 82),
                ],
                seg / f"{i:02d}_cap.png",
                strip=True,
            )
            inputs += ["-loop", "1", "-t", f"{length}", "-i", str(cap)]
            graph += f"[g];[1:v]format=rgba,fade=t=in:st=0.3:d=0.4:alpha=1,fade=t=out:st={length - 0.6:.2f}:d=0.4:alpha=1[c];[g][c]overlay=0:0"
        graph += ",format=yuv420p[v]"
        if kind == "veo":
            graph += f";[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.3,afade=t=out:st={length - 0.3:.2f}:d=0.3[a]"
            audio_map = "[a]"
        else:
            inputs += ["-f", "lavfi", "-t", f"{length}", "-i", "anullsrc=r=48000:cl=stereo"]
            audio_map = f"{len([x for x in inputs if x == '-i']) - 1}:a"
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            *inputs,
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-map",
            audio_map,
            "-t",
            f"{length}",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "17",
            "-r",
            str(FPS),
            "-c:a",
            "pcm_s16le",
            "-ar",
            "48000",
            "-ac",
            "2",
            str(dest.with_suffix(".mov")),
        ]
    )
    return dest.with_suffix(".mov")


def cmd_build(args: argparse.Namespace) -> int:
    LINES = [n for n in NARRATION if n[0] not in set(args.skip or [])]  # noqa: N806
    segs, t = [], 0.0
    for i, (kind, src, start, length, caption) in enumerate(TIMELINE):
        segs.append(segment(i, kind, src, start, length, caption))
        print(f"seg {i:02d} {src:<12} {t:5.1f}s → {t + length:5.1f}s")
        t += length
    total = t
    lst = OUT / "segments" / "concat.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in segs))
    picture = OUT / "picture.mov"
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(picture),
        ]
    )

    # Narration: each line placed at its cue; warn if a line runs into the next cue.
    cues = sorted(LINES, key=lambda n: n[3])
    for (vid, _s, _t, cue), nxt in zip(cues, [*cues[1:], None], strict=True):
        end = cue + duration(VO / f"{vid}.mp3")
        limit = nxt[3] if nxt else total
        if end > limit:
            print(f"  ! {vid} ends at {end:.1f}s, past {limit:.1f}s — move cues or trim the line")
    inputs = ["-i", str(picture), "-i", str(OUT / "music.mp3")]
    for vid, *_ in LINES:
        inputs += ["-i", str(VO / f"{vid}.mp3")]
    vo_labels = []
    graph = []
    for k, (_vid, speaker, _text, cue) in enumerate(LINES):
        ms = int(cue * 1000)
        tone = "highpass=f=90,acompressor=threshold=-18dB:ratio=3,volume=1.5"
        if speaker == "ix":
            # IX: a faint, clean "system" sheen — a short, quiet echo; Se-rin stays dry.
            tone += ",aecho=0.8:0.5:40:0.18"
        graph.append(
            f"[{k + 2}:a]aresample=48000,aformat=channel_layouts=stereo,{tone},adelay={ms}|{ms}[vo{k}]"
        )
        vo_labels.append(f"[vo{k}]")
    graph.append(
        f"{''.join(vo_labels)}amix=inputs={len(vo_labels)}:normalize=0,apad=whole_dur={total}[vo]"
    )
    graph.append("[vo]asplit=2[vo_a][vo_key]")
    graph.append(
        f"[1:a]aresample=48000,aformat=channel_layouts=stereo,volume={args.music_gain},"
        f"afade=t=out:st={total - 3:.1f}:d=3,apad=whole_dur={total}[mus]"
    )
    graph.append(
        "[mus][vo_key]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=500[duck]"
    )
    graph.append(f"[0:a]volume={args.ambience_gain}[amb]")
    graph.append(
        f"[duck][amb][vo_a]amix=inputs=3:normalize=0,atrim=0:{total},alimiter=limit=0.89,loudnorm=I=-15:TP=-1.5:LRA=11[a]"
    )
    tag = "_photo" if VEO.name == "veo_photo" else ""
    final = OUT / f"mythos2_cinematic{tag}.mp4"
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(graph),
            "-map",
            "0:v",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            "-t",
            f"{total}",
            str(final),
        ]
    )
    # A light copy for sharing (messengers, store upload limits); the master above stays the edit source.
    web = OUT / f"mythos2_cinematic{tag}_web.mp4"
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(final),
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-crf",
            "23",
            "-maxrate",
            "8M",
            "-bufsize",
            "16M",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(web),
        ]
    )
    for f in (final, web):
        print(f"done → {f.relative_to(ROOT)} ({duration(f):.1f}s, {f.stat().st_size / 1e6:.1f} MB)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audio", help="narration + music via ElevenLabs (billed)")
    a.add_argument("--force", nargs="*", help="line ids, 'music' or 'all' to regenerate")
    a.add_argument("--ix-voice")
    a.add_argument("--se-rin-voice")
    a.add_argument("--music-ms", type=int, default=82000)
    b = sub.add_parser("build", help="cut the cinematic from the generated pieces")
    b.add_argument("--skip", nargs="*", help="narration line ids to leave out (e.g. 03_serin_run)")
    b.add_argument(
        "--style", default="art", choices=["art", "photo"], help="photo = the live-action Veo shots"
    )
    b.add_argument("--music-gain", type=float, default=0.55)
    b.add_argument("--ambience-gain", type=float, default=0.55)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.cmd == "build" and args.style == "photo":
        global VEO
        VEO = OUT / "veo_photo"
    return cmd_audio(args) if args.cmd == "audio" else cmd_build(args)


if __name__ == "__main__":
    sys.exit(main())

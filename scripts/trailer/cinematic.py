"""Cinematic trailer for Mythos 2.0: Veo key-art shots + real gameplay + IX narration + a dedicated music track.

  .venv/bin/python scripts/trailer/gen_veo.py --print-prompts                        # 1. AI shot prompts (manual in Gemini web; Vertex Veo API banned)
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
AI_RAW = ROOT / "outputs" / "trailer" / "ai" / "raw"
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
        "09_fight_haetae",
        18.0,
        9.0,
        ("적이 칠 칸이 미리 보인다", "Every enemy move is telegraphed"),
    ),
    ("game", "02_event", -5.0, 4.0, ("모든 선택에는 대가가 있다", "Every choice has a price")),
    ("game", "04_cutscene", -5.5, 4.0, ("함께 걸은 사람들", "The people who walk with you")),
    ("game", "05_ix", -4.5, 4.0, ("IX는 당신의 선택을 기억한다", "IX remembers what you chose")),
    ("veo", "haetae", 1.0, 4.5, ("해태 — 방화벽 수호수", "HAETAE — Firewall Guardian")),
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
    ("06_ix_win", "ix", "[slowly] Congratulations. [pause] You defeated me.", 59.8),
    ("07_ix_loop", "ix", "[quietly] And the loop... has begun again.", 66.2),
]
# Owner-picked voices (2026-10-13). IX: "Adam" (deep narrative). Se-rin: shared-library "Ember - Energetic,
# Confident Protagonist", owner's pick from a 14-take audition (outputs/trailer/cinematic/audition_serin). The take in
# vo_en/03_serin_run.mp3 is hand-cleaned (adeclick, light afftdn, a 0.14 s gate on a mouth click before "Run!",
# limiter) — `audio --force 03_serin_run` would replace it with a fresh, uncleaned take.
VOICES = {"ix": "wBXNqKUATyqu0RtYt25i", "se_rin": "WtA85syCrJwasGeHGH2p"}
# Se-rin's take wants the most expressive setting (eleven_v3: 0.0 = creative); IX stays a little steadier.
STABILITY = {"ix": 0.3, "se_rin": 0.0}

# Store cut (Play Store promo video): the painted Veo shots only (matches the game's art), a ~10 s cinematic hook,
# then mostly real gameplay recorded with `record_trailer.py --scenes store` (expert-bot fights, the map).
STORE_TIMELINE: list[tuple[str, str, float, float, tuple[str, str] | None]] = [
    ("veo", "title", 0.5, 4.5, None),
    ("veo", "se_rin", 1.0, 5.0, None),
    ("game", "09_fight_haetae", 2.6, 3.2, None),
    (
        "game",
        "09_fight_haetae",
        18.0,
        8.0,
        ("적이 칠 칸이 미리 보인다", "Every enemy move is telegraphed"),
    ),
    (
        "game",
        "10_fight_incinerator",
        26.0,
        7.0,
        ("밀어서 불길로, 벽으로, 낭떠러지로", "Push them into fire, walls and the void"),
    ),
    (
        "game",
        "08_map",
        6.0,
        4.0,
        ("네오서울을 가로지를 경로를 짜라", "Plan your route across Neo-Seoul"),
    ),
    ("game", "02_event", -5.0, 4.0, ("모든 선택에는 대가가 있다", "Every choice has a price")),
    ("game", "04_cutscene", -5.5, 3.5, ("함께 걸은 사람들", "The people who walk with you")),
    ("game", "05_ix", -4.5, 4.0, ("IX는 당신의 선택을 기억한다", "IX remembers what you chose")),
    ("veo", "ix", 0.0, 4.0, None),
    ("card", "logo", 0.0, 6.0, None),
]
STORE_LINES = {"01_ix_welcome": 0.5, "03_serin_run": 4.6, "04_ix_last": 36.0, "07_ix_loop": 43.7}
# The score's first impact (≈20 s into music.mp3) lands on the cut to gameplay at 9.5 s.
STORE_MUSIC_OFFSET = 10.5
# Global showcase cut (82.0 s, English captions): combines the store gameplay hook, all four recorded AI features
# (outputs/trailer/ai/raw/*.webm), and an 8 s cloud-architecture diagram card (docs/contest/architecture-en.md).
SHOWCASE_TIMELINE: list[tuple[str, str, float, float, tuple[str, str] | None]] = [
    ("veo", "title", 0.5, 4.5, None),
    ("veo", "se_rin", 1.0, 5.0, None),
    (
        "game",
        "09_fight_haetae",
        18.0,
        7.5,
        ("7×5 tactical board · push, hazard and void kills", "Every enemy move is telegraphed"),
    ),
    (
        "game",
        "10_fight_incinerator",
        26.0,
        6.5,
        (
            "Deterministic pure-TS engine · named RNG streams",
            "Push them into fire, walls and the void",
        ),
    ),
    (
        "game",
        "08_map",
        6.0,
        4.0,
        ("3 acts · 6 districts · replay-verified daily seed", "Plan your route across Neo-Seoul"),
    ),
    (
        "ai",
        "21_ai_improvise",
        -11.0,
        11.0,
        (
            "Type any action → Gemini classifies → engine clamps DC 3–9 & rolls",
            "AI Game Master — Free-Text Improvise",
        ),
    ),
    (
        "ai",
        "22_ai_npc",
        -10.5,
        10.5,
        (
            "Speak in your own words → mapped to authored intent → d20 check",
            "AI NPC Dialogue — In-Character & Grounded",
        ),
    ),
    (
        "ai",
        "23_ai_boss",
        -8.0,
        8.0,
        (
            "IX recalls your past loops · 0 ms authored fallback if late",
            "AI Boss Memory — Never Blocks Gameplay",
        ),
    ),
    (
        "ai",
        "24_ai_companion",
        -9.0,
        9.0,
        (
            "Companions remember what you chose earlier in this run",
            "AI Companion Memory — Safehouse Talk",
        ),
    ),
    ("arch", "architecture", 0.0, 8.0, None),
    ("veo", "ix", 0.0, 3.0, None),
    ("card", "logo", 0.0, 5.0, None),
]
SHOWCASE_LINES = {
    "01_ix_welcome": 0.5,
    "03_serin_run": 4.6,
    "04_ix_last": 49.4,
    "06_ix_win": 66.4,
    "07_ix_loop": 74.1,
}
# Fights: crop in on the board (factor, vertical centre as a fraction of the frame, from source second) so the tiles
# read on a phone. Earlier source time stays full-frame: the boss splash puts its title ("해태") at the left edge,
# which the crop cut to "…태".
ZOOM = {"09_fight_haetae": (1.22, 0.44, 10.0), "10_fight_incinerator": (1.22, 0.44, 10.0)}

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


def arch_png(dest: Path) -> Path:
    """1920x1080 cloud-architecture diagram card matching docs/contest/architecture-en.md."""
    from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

    bg = (
        Image.open(ART / "art" / "title.webp")
        .convert("RGB")
        .resize((W, H))
        .filter(ImageFilter.GaussianBlur(10))
    )
    img = ImageEnhance.Brightness(bg).enhance(0.18).convert("RGBA")
    draw = ImageDraw.Draw(img)

    f_title = ImageFont.truetype(FONT, 46)
    f_sub = ImageFont.truetype(FONT, 26)
    f_col = ImageFont.truetype(FONT, 30)
    f_item = ImageFont.truetype(FONT, 22)
    f_foot = ImageFont.truetype(FONT, 24)

    header = "MYTHOS 2.0 : SIGNAL RUN — GOOGLE CLOUD ARCHITECTURE"
    hb = draw.textbbox((0, 0), header, font=f_title)
    draw.text(((W - (hb[2] - hb[0])) // 2, 54), header, font=f_title, fill=(92, 242, 216, 255))

    sub = "AI off the critical path  ·  Deterministic pure-TS engine  ·  Vertex AI Gemini on Cloud Run"
    sb = draw.textbbox((0, 0), sub, font=f_sub)
    draw.text(((W - (sb[2] - sb[0])) // 2, 118), sub, font=f_sub, fill=(210, 228, 236, 255))

    cols = [
        (
            "1 · CLIENT (Browser / Android)",
            (92, 242, 216),
            [
                "• Pure-TS engine (no Math.random)",
                "• Named RNG streams per act/node/fight",
                "• 0 ms authored line renders immediately",
                "• [AI] badge swaps in if Gemini lands",
                "• Daily replay recorder & offline saves",
                "• Opt-in Architect HUD (?hud=1)",
            ],
        ),
        (
            "2 · CLOUD RUN (FastAPI /api/v2)",
            (255, 204, 102),
            [
                "• Firebase Google Auth / ?demo= code",
                "• 4-Layer Cost Cap ($0.30/mo · $20/day)",
                "• GM: Prompt → Hedge → Clean → Clamp",
                "• Improvise clamped to DC 3–9 & rolled",
                "• NPC talk mapped to authored d20 intent",
                "• Node replay verifier (replay_verify.mjs)",
            ],
        ),
        (
            "3 · GOOGLE CLOUD & VERTEX AI",
            (150, 200, 255),
            [
                "• Vertex AI gemini-3.8-flash",
                "• Hedged retry after 4 s (cuts tail 504s)",
                "• Late-usage token accounting",
                "• Cloud SQL Postgres + memory fallback",
                "• Billing budget → Pub/Sub kill-switch",
                "• Preview tag (git-sha) → verify → promote",
            ],
        ),
    ]
    box_w, box_h, top_y = 540, 560, 195
    xs = [90, 690, 1290]
    for idx, (col_title, accent, items) in enumerate(cols):
        x0 = xs[idx]
        draw.rounded_rectangle(
            (x0, top_y, x0 + box_w, top_y + box_h),
            radius=16,
            fill=(8, 16, 26, 228),
            outline=(*accent, 210),
            width=3,
        )
        draw.text((x0 + 28, top_y + 28), col_title, font=f_col, fill=(*accent, 255))
        draw.line(
            (x0 + 28, top_y + 78, x0 + box_w - 28, top_y + 78),
            fill=(*accent, 110),
            width=2,
        )
        for j, line in enumerate(items):
            draw.text(
                (x0 + 28, top_y + 104 + j * 70),
                line,
                font=f_item,
                fill=(234, 242, 246, 255),
            )
        if idx < 2:
            ax = x0 + box_w + 8
            ay = top_y + box_h // 2
            draw.line((ax, ay, ax + 34, ay), fill=(92, 242, 216, 240), width=4)
            draw.polygon(
                [(ax + 44, ay), (ax + 30, ay - 9), (ax + 30, ay + 9)],
                fill=(92, 242, 216, 240),
            )

    draw.rounded_rectangle(
        (90, 810, W - 90, 905),
        radius=12,
        fill=(6, 14, 22, 235),
        outline=(92, 242, 216, 160),
        width=2,
    )
    foot = "0 ms Critical-Path Wait   |   4 s Hedged Retry   |   ~$0.048 / Full Run   |   4-Layer Spend Cap   |   695 Automated Tests"
    fb = draw.textbbox((0, 0), foot, font=f_foot)
    draw.text(((W - (fb[2] - fb[0])) // 2, 842), foot, font=f_foot, fill=(240, 248, 252, 255))

    img.convert("RGB").save(dest)
    return dest


def segment(
    i: int, kind: str, src: str, start: float, length: float, caption: tuple[str, str] | None
) -> Path:
    """One normalised 1920x1080/30 fps clip with a stereo 48 kHz track (Veo ambience, or silence)."""
    seg = OUT / "segments"
    seg.mkdir(parents=True, exist_ok=True)
    dest = seg / f"{i:02d}_{src}.mp4"
    fade = f"fade=t=in:st=0:d=0.3,fade=t=out:st={length - 0.3:.2f}:d=0.3"
    if kind == "arch":
        card = arch_png(OUT / "arch_card.png")
        inputs = [
            "-loop",
            "1",
            "-t",
            f"{length}",
            "-i",
            str(card),
            "-f",
            "lavfi",
            "-t",
            f"{length}",
            "-i",
            "anullsrc=r=48000:cl=stereo",
        ]
        graph = f"[0:v]scale={W}:{H},{fade},format=yuv420p[v]"
        audio_map = "1:a"
    elif kind == "card":
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
        path = (
            VEO / f"{src}.mp4"
            if kind == "veo"
            else (AI_RAW / f"{src}.webm" if kind == "ai" else GAME / f"{src}.mp4")
        )
        if not path.exists():
            raise SystemExit(f"missing source {path}")
        ss = start if start >= 0 else max(0.0, duration(path) + start)
        inputs = ["-ss", f"{ss:.2f}", "-t", f"{length}", "-i", str(path)]
        graph = f"[0:v]scale={W}:{H}:flags=lanczos,fps={FPS},setsar=1"
        if src in ZOOM and start >= ZOOM[src][2]:
            f, yc, _ = ZOOM[src]
            graph += (
                f",crop=iw/{f}:ih/{f}:(iw-iw/{f})/2:ih*{yc}-ih/{f}/2,scale={W}:{H}:flags=lanczos"
            )
        if kind in ("game", "ai"):
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
    store = args.cut == "store"
    showcase = args.cut == "showcase"
    timeline = STORE_TIMELINE if store else (SHOWCASE_TIMELINE if showcase else TIMELINE)
    line_cues = STORE_LINES if store else (SHOWCASE_LINES if showcase else None)
    LINES = [  # noqa: N806
        (n[0], n[1], n[2], line_cues[n[0]]) if line_cues else n
        for n in NARRATION
        if n[0] not in set(args.skip or []) and (line_cues is None or n[0] in line_cues)
    ]
    segs, t = [], 0.0
    for i, (kind, src, start, length, caption) in enumerate(timeline):
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
    music_ss = ["-ss", f"{STORE_MUSIC_OFFSET}"] if store else []
    inputs = ["-i", str(picture), *music_ss, "-i", str(OUT / "music.mp3")]
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
    tag = ("_photo" if VEO.name == "veo_photo" else "") + (
        "_store" if store else ("_showcase" if showcase else "")
    )
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
    b.add_argument(
        "--cut",
        default="cinematic",
        choices=["cinematic", "store", "showcase"],
        help="store = Play Store promo; showcase = 82s English contest cut (gameplay + AI features + architecture)",
    )
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

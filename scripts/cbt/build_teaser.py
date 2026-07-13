"""Assemble the YouTube-ready CBT Teaser V2 from the per-scene sources.

Owner direction (2026-07-13): produce the finished teaser (video + narration +
BGM v1), impact-first — the edit-plan MDs are guidance, not contract. scene_01,
scene_02 and teaser_bgm_v1 are owner-approved; keep them.

The timeline is a flat list of UNITS (clips or Ken-Burns stills), hard-cut in
trailer rhythm. Narration MP3s are dropped at fixed offsets; BGM runs under
everything. Revise by editing UNITS / NARRATION and re-running.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
V2 = REPO / "docs" / "cbt" / "v2"
RES = REPO / "resources" / "neo-seoul"
OUT_DIR = V2 / "final"
FONT = "/System/Library/Fonts/Menlo.ttc"

FPS = 30
W, H = 1920, 1080


@dataclass
class Unit:
    src: Path
    dur: float
    ss: float = 0.0          # clip start offset
    still: bool = False      # Ken-Burns a PNG instead of trimming a video
    kb: str = "in"           # still motion: in | out | pan
    sub: str = ""            # one-line subtitle
    tpad: bool = False       # freeze last frame if the clip is shorter than dur
    texts: tuple[tuple[str, int, int], ...] = ()  # (text, fontsize, y-px) via PIL overlay


# Owner 2026-07-13: minimize subtitles — narration + imagery carry the teaser;
# on-screen text only on the final CTA card.
UNITS: list[Unit] = [
    # 1 · Hook (owner-approved omni_1) — 0:00
    Unit(V2 / "scene_01/omni_1_serin_arrival_1080p_upscaled.mp4", 10.0),
    # 2 · World landmarks (owner-approved montage) — 0:10
    Unit(V2 / "scene_02/landmarks_montage_v1.mp4", 11.0),
    # 3 · AI GM: choice -> streaming narration — 0:21
    Unit(V2 / "scene_03/hq_story_view.mp4", 14.0),
    # 4 · Operation map — 0:35
    Unit(V2 / "scene_04/route_map_zoom_v2.mp4", 9.0),
    # 5 · Companions — 0:44
    Unit(RES / "cutscenes/se-rin-first-light.png", 4.0, still=True, kb="in"),
    Unit(V2 / "scene_05/hq_character_tab.mp4", 5.0, tpad=True),
    # 6 · Combat entry (live new layout) — 0:53
    Unit(V2 / "scene_06/hq_combat_prod.mp4", 9.0),
    # 7 · Tactical action window (cut-in ~19s) — 1:02
    Unit(V2 / "scene_06/hq_combat_prod.mp4", 18.0, ss=15.0),
    # 8 · Consequence — 1:20
    Unit(RES / "scenes/control_grid_ghost.png", 6.0, still=True, kb="out"),
    # 9 · IX climax (Veo) + endings quick cuts — 1:26
    Unit(V2 / "scene_09/veo_ix_confrontation_1080p.mp4", 8.0),
    Unit(RES / "endings/safe-refuge.png", 1.6, still=True, kb="pan"),
    Unit(RES / "endings/code-rewrite.png", 1.6, still=True, kb="in"),
    Unit(RES / "endings/noble-sacrifice.png", 1.6, still=True, kb="pan"),
    # 10 · Flash montage + CTA card — 1:38.8
    Unit(V2 / "scene_01/omni_1_serin_arrival_1080p_upscaled.mp4", 0.6, ss=2.0),
    Unit(V2 / "scene_03/hq_story_view.mp4", 0.6, ss=8.0),
    Unit(V2 / "scene_06/hq_combat_prod.mp4", 0.6, ss=19.0),
    Unit(V2 / "scene_04/route_map_zoom_v2.mp4", 0.6, ss=5.0),
    Unit(
        RES / "concept/00-project-mythos-main.png", 8.0, still=True, kb="in",
        texts=(
            ("PROJECT MYTHOS", 96, 360),
            ("CLOSED BETA — NOW RECRUITING", 44, 520),
            ("Free · Browser · EN/KO · 30-60 min per run", 30, 600),
            ("Sign-up link in the description", 30, 655),
        ),
    ),
]

# (file, start-seconds) — narration lands shortly into its scene.
NARRATION: list[tuple[str, float]] = [
    ("01_neo_seoul_is_falling.mp3", 0.4),
    ("02_every_street_has_a_price.mp3", 10.4),
    ("03_choices_carry_forward.mp3", 21.4),
    ("04_choose_a_path.mp3", 35.4),
    ("05_when_danger_arrives.mp3", 44.4),
    ("06_read_the_next_move.mp3", 53.4),
    ("07_change_the_fight.mp3", 62.4),
    ("08_neo_seoul_remembers.mp3", 80.4),
    ("09_survive_the_loop.mp3", 86.4),
    ("10_closed_beta_cta.mp3", 102.0),
]

BGM = V2 / "bgm/teaser_bgm_v1.mp3"
BGM_VOL = 0.22


def run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-1500:], file=sys.stderr)
        raise SystemExit(f"ffmpeg failed: {' '.join(cmd[:8])}…")


def text_overlay_png(texts: tuple[tuple[str, int, int], ...], out: Path) -> Path:
    """This ffmpeg build has no drawtext (no libfreetype) — render the CTA text
    as a transparent PNG with PIL and composite it via the overlay filter."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for text, size, y in texts:
        font = ImageFont.truetype(FONT, size)
        x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
        tw = x1 - x0
        x = (W - tw) // 2
        pad = max(10, size // 4)
        draw.rectangle(
            (x - pad, y - pad, x + tw + pad, y + (y1 - y0) + pad),
            fill=(0, 0, 0, 115),
        )
        draw.text((x - x0, y - y0), text, font=font, fill=(255, 255, 255, 240))
    img.save(out)
    return out


def unit_filters(unit: Unit) -> str:
    chains: list[str] = []
    if unit.still:
        frames = int(unit.dur * FPS)
        zoom = {
            "in": f"zoompan=z='min(zoom+0.0011,1.16)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            "out": f"zoompan=z='if(eq(on,1),1.16,max(zoom-0.0011,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            "pan": f"zoompan=z='1.12':x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)'",
        }[unit.kb]
        chains.append(
            f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,"
            f"crop={W * 2}:{H * 2},{zoom}:d={frames}:s={W}x{H}:fps={FPS}"
        )
    else:
        chains.append(
            f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,fps={FPS}"
        )
        if unit.tpad:
            chains.append("tpad=stop_mode=clone:stop_duration=4")
    chains.append("setsar=1")
    return ",".join(chains)


def build(label: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    seg_dir = Path(tempfile.mkdtemp(prefix="teaser_build_"))
    total = sum(u.dur for u in UNITS)
    print(f"{len(UNITS)} units · total {total:.1f}s")

    listing: list[str] = []
    for i, unit in enumerate(UNITS):
        if not unit.src.exists():
            raise SystemExit(f"missing source: {unit.src}")
        out = seg_dir / f"u{i:02d}.mp4"
        cmd = ["ffmpeg", "-y", "-v", "error"]
        if not unit.still and unit.ss:
            cmd += ["-ss", f"{unit.ss}"]
        cmd += ["-i", str(unit.src)]
        if unit.texts:
            overlay = text_overlay_png(unit.texts, seg_dir / f"u{i:02d}_text.png")
            cmd += ["-i", str(overlay),
                    "-filter_complex", f"[0:v]{unit_filters(unit)}[base];[base][1:v]overlay=0:0[v]",
                    "-map", "[v]"]
        else:
            cmd += ["-vf", unit_filters(unit)]
        cmd += ["-t", f"{unit.dur}", "-an",
                "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                "-pix_fmt", "yuv420p", str(out)]
        run(cmd)
        listing.append(f"file '{out}'")
        print(f"  u{i:02d} {unit.dur:>4.1f}s {unit.src.name}")
    concat_file = seg_dir / "list.txt"
    concat_file.write_text("\n".join(listing))

    # Audio is built in SEPARATE audio-only passes and only muxed with the video
    # at the end: on this ffmpeg build (no drawtext; minimal), combining the
    # concat-video input with the multi-input audio mix in one filtergraph
    # silently attenuated/duplicated narration inputs. Each pass below was
    # verified in isolation (silencedetect onsets + volumedetect levels).
    fade_out = total - 2.0
    bgm_fade = total - 4.0

    # Pass A: narration track (10 adelayed inputs -> one wav).
    narr_wav = seg_dir / "narration.wav"
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for name, _ in NARRATION:
        cmd += ["-i", str(V2 / name)]
    parts = []
    narr_labels = []
    for idx, (_, start) in enumerate(NARRATION):
        ms = int(start * 1000)
        # aresample BEFORE adelay: without pinning the rate the graph can negotiate
        # 48k over the 44.1k MP3s and adelay's ms->samples conversion drifts ~8.8%
        # (observed: late narrations sliding seconds late / off the end of the cut).
        parts.append(f"[{idx}:a]aresample=48000,adelay={ms}|{ms}[n{idx}]")
        narr_labels.append(f"[n{idx}]")
    parts.append(f"{''.join(narr_labels)}amix=inputs={len(narr_labels)}:normalize=0[a]")
    cmd += ["-filter_complex", ";".join(parts), "-map", "[a]", "-t", f"{total:.2f}",
            str(narr_wav)]
    run(cmd)

    # Pass B: bgm under narration (2-input mix).
    audio_wav = seg_dir / "audio.wav"
    run([
        "ffmpeg", "-y", "-v", "error", "-i", str(BGM), "-i", str(narr_wav),
        "-filter_complex",
        f"[0:a]aresample=48000,volume={BGM_VOL},afade=in:d=1,"
        f"afade=out:st={bgm_fade:.2f}:d=4[bg];"
        f"[bg][1:a]amix=inputs=2:normalize=0[a]",
        "-map", "[a]", "-t", f"{total:.2f}", str(audio_wav),
    ])

    # Pass C: concat video + global fades, mux the finished audio.
    output = OUT_DIR / f"{label}.mp4"
    run([
        "ffmpeg", "-y", "-v", "error",
        "-f", "concat", "-safe", "0", "-i", str(concat_file), "-i", str(audio_wav),
        "-filter_complex", f"[0:v]fade=in:d=0.5,fade=out:st={fade_out:.2f}:d=2[v]",
        "-map", "[v]", "-map", "1:a", "-t", f"{total:.2f}",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", str(output),
    ])
    print(f"final: {output.relative_to(REPO)} ({total:.1f}s)")
    return output


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "mythos_teaser_v2_draft1")

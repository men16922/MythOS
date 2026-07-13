# Project MythOS CBT Teaser V2

**Deliverable: `final/mythos_teaser_v2.mp4`** — 1:49, 1920×1080/30fps, H.264 + AAC.
Narration (10 English ElevenLabs segments) + `bgm/teaser_bgm_v1.mp3` (owner-approved) mixed in;
no subtitles except the closing CTA card (owner direction 2026-07-13). Human audio/video review
is still required before public release.

## Rebuild / revise

```bash
.venv/bin/python scripts/cbt/build_teaser.py <label>       # edit UNITS/NARRATION in the script
.venv/bin/python scripts/cbt/generate_teaser_bgm.py        # ElevenLabs Music (BGM variants)
.venv/bin/python scripts/cbt/generate_teaser_videos.py --shot <id>   # Vertex Veo impact clips
.venv/bin/python scripts/cbt/hq_record.py --url <invite> --scene <id> # HQ gameplay capture
```

## Contents

- `final/` — the assembled teaser.
- `scene_01..09/` — per-scene video sources (owner picks: `scene_01` omni_1, `scene_02` montage).
  `scene_09/veo_ix_confrontation_1080p.mp4` is the Veo-generated climax clip.
- `01..10_*.mp3` + `narration.en.json` — narration segments (regenerate via
  `scripts/voice-gen/generate_teaser_v2.py`; voice `n1PvBOwxb8X6m7tahp2h`, `eleven_v3`;
  the JSON `text` fields contain v3 delivery tags such as `[pauses]`).
- `bgm/` — v1 (approved, in the cut) and v2 (darker alternate).
- `CBT_TEASER(.ko).md` — the original edit plans (guidance; the final cut is authoritative).
- `cbt_teaser_footage_division.md` — per-scene source manifest and production notes.
- `teaser_video_prompts.md` — Veo/video-generation prompts per shot.

Captured on `mythos-api-00059-8j4` (new desktop combat layout). Playwright/CDP captures are
silent by design; all audio enters at the build-script mix stage.

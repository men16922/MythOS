# CBT Teaser V2 Production — 2026-07-12

## Goal

Publish an approximately two-minute English game teaser that presents Project MythOS as a connected
experience: Neo-Seoul's world, AI-guided choices, companions and loop continuity, then player-led
tactical combat.

## Delivered

- `docs/cbt/CBT_TEASER.ko.md` and `docs/cbt/CBT_TEASER.md` now hold the balanced V2 edit plan.
- `docs/cbt/v2/narration.en.json` maps ten ordered English narration segments to the V2 timeline.
- Ten MP3s, generated with ElevenLabs `eleven_v3` and the owner-selected narrator, are in
  `docs/cbt/v2/01_*.mp3` through `10_*.mp3`.
- `scripts/voice-gen/generate_teaser_v2.py` regenerates those assets from the manifest.
- `scripts/cbt/record_teaser_v2.py` records 1920×1080 Playwright source clips without persisting the
  supplied invite URL. `scene01_entry.webm` is a verified live entry capture.

## Remaining capture plan

1. Capture the opening, route/choice, companion, combat, consequence, ending, and CTA source clips as
   `scene01`–`scene10` in `docs/cbt/v2/captures/`; validate every file with `ffprobe` plus a screenshot.
2. Use only non-fallback gameplay for combat; capture the live output of enemy intent, aim preview,
   collision, grenade/status, and post-combat story return.
3. The supplied account still showed the character-setup screen after a 60-second start attempt; diagnose
   that transition before treating a fresh-loop clip as captured.
4. Playwright WebM captures are silent. Mix the numbered narration MP3s and approved BGM/SFX separately
   during the final ffmpeg edit; live browser audio requires a separate system-audio loopback capture.
5. Human-review every narration take and assembled clip before publishing. Do not expose the invite URL
   or a DEV/admin-only surface in final footage.

## Completion criteria

- Ten verified scene source clips, all at 1920×1080, with a screenshot and duration recorded.
- English subtitle/narration timing matches `CBT_TEASER.md`.
- Final assembly has narration, approved music/SFX, no secret URL, no fallback/static combat, and no
  unverified claims.

# CBT Teaser V2 Footage Division — V2.1 (gameplay-first)

Owner direction 2026-07-12: **this is a game teaser — AI-generated video only where it buys real
impact; everything else is direct gameplay recording.** Curated scene art may be intercut as
*stills with edit effects* (slow pan/zoom, glitch cuts), not as generated video.

Timeline/subtitles/narration authority: [CBT_TEASER.md](CBT_TEASER.md). Narration timing:
[narration.en.json](narration.en.json).

## Footage rules

1. 🎮 **Gameplay recording is the default.** Non-fallback (`?fallback=0`), 1920×1080, smooth
   combat VFX. Playwright's built-in WebM recorder (VP8, ~25fps, headless jank) was judged
   not good enough by the owner — record via the CDP-screencast pipeline
   (`scripts/cbt/`, claude lane) instead.
2. 🖼️ **Curated art = stills + edit effects.** Landmarks, companion meet cuts, IX/ending art are
   cross-cut as stills with pan/zoom/glitch at the ffmpeg/edit stage. No AI video for these.
3. 🤖 **AI video = impact bookends only (≤2 clips).** Opening hook (scene_01) and, optionally,
   the CTA background (scene_10). Generated via **Vertex AI Veo** (same project/auth as the
   prod image path; the Gemini-app lane is blocked). 1080p 16:9; image-to-video from the
   matching curated art so characters stay on-model.
4. Capture with a **clean tester key** — never show the DEV tab / boot simulator (admin keys
   expose them). Final footage must contain nothing that cannot occur in the live build
   (`mythos-api-00057-c2c`).

## Per-scene manifest (`scene_01` … `scene_10`)

Each folder holds its narration MP3 plus the source clips/stills for that segment.

| Folder | Time | Footage | Sources / notes | Status |
| --- | --- | --- | --- | --- |
| `scene_01` | 0:00–0:08 | 🤖 hook + 🎮 1s awakening flash | **Owner pick: `omni_1`** (more dynamic) — 1080p lanczos master `omni_1_serin_arrival_1080p_upscaled.mp4`. `veo_serin_arrival_1080p.mp4` (Vertex Veo) kept as alternate; `omni_3` rejected+deleted. Optional 1s in-game awakening intercut. | AI clip ✅ |
| `scene_02` | 0:08–0:18 | 🖼️ landmark montage video | `landmarks_montage_v1.mp4` (11s Ken Burns crossfade over the four concept plates; owner: images-only is fine here). | ✅ |
| `scene_03` | 0:18–0:32 | 🎮 choice → narration stream | `hq_story_view.mp4` (15.5s: 3-choice prompt → pick → streaming → new scene; post-deploy, no entry/nav, no DEV UI). | ✅ |
| `scene_04` | 0:32–0:43 | 🎮 route map + 🖼️ companion meet stills | `route_map_zoom_v2.mp4` (9s zoom over the 2x-res OPERATION MAP DETAIL modal, all-EN) + quick-cut `kai/su_ah/han/lin_yue_meet.png` stills. | map ✅ |
| `scene_05` | 0:43–0:53 | 🖼️ Se-rin cutscene still + 🎮 CHARACTER tab | `cutscenes/se-rin-first-light.png` still + `hq_character_tab.mp4` (4.1s tab open+scroll, no nav; extend holds in edit) + companion-on-board from the scene_06 sources. | ✅ |
| `scene_06` | 0:53–1:03 | 🎮 combat entry | `hq_combat_prod.mp4` (54.6s, **live `00059-8j4` with the new desktop combat layout**: full 7-party board, intent line, skills, cut-ins; no entry/nav). `hq_combat_newlayout.mp4` = local-sim backup take. | ✅ |
| `scene_07` | 1:03–1:27 | 🎮 tactical play (one readable sequence) | Cut from the `scene_06` sources (aim forecast, cut-in, statuses); add a grenade/collision beat in a follow-up take if the edit needs it. | source ✅ (partial) |
| `scene_08` | 1:27–1:38 | 🎮 post-combat return | Narrative return, Stability/Tension gauge movement; in-game backdrop (no generated video). | TODO |
| `scene_09` | 1:38–1:48 | 🖼️ IX/ending stills + 🎮 Codex/records | `ix_confrontation.png` + 2–3 ending art stills quick-cut + `hq_codex_tab.mp4` (3.8s, no nav; extend holds in edit). | ✅ |
| `scene_10` | 1:48–1:58 | 🎮 montage recut + 🖼️ logo still (🤖 optional) | Fast recut of scenes 1–9 gameplay + `concept/00-project-mythos-main.png` + CTA card. Optional Veo logo-flyover only if it clearly beats the still. | edit-stage |

## Audio

- Narration: ElevenLabs `eleven_v3` MP3s (voice `n1PvBOwxb8X6m7tahp2h`), one per scene folder,
  regenerable via `scripts/voice-gen/generate_teaser_v2.py`.
- Gameplay captures are silent (CDP screencast has no audio) — BGM/SFX and narration are mixed
  at the final ffmpeg edit.

## Division of labor

- **claude**: high-quality gameplay capture pipeline + Vertex Veo generation + per-scene assembly.
- **Antigravity**: earlier Playwright captures/`omni` experiments — superseded for gameplay
  (quality verdict), its approved `omni_1` clip is retained.
- **Owner**: quality gate on every AI clip and the final mix; provides the clean tester key.

# Codex curated art review — 2026-07-13

Generation used the in-session image tool. Source plates were post-processed with
`./.venv/bin/python` + Pillow. No local FLUX/mflux path was used.

| Asset | Outcome | Contract check | Style/self-check verdict |
| --- | --- | --- | --- |
| `combat/backdrops/streets.png` | PASS | RGB, 1024×640, mean RGB 26.33/255 | Low-key cool-blue distant city plate; no text/foreground object. |
| `combat/backdrops/undercity.png` | PASS | RGB, 1024×640, mean RGB 23.49/255 | Low-key violet distant undercity plate; no text/foreground object. |
| `combat/backdrops/industrial.png` | PASS | RGB, 1024×640, mean RGB 19.71/255 | Low-key ember industrial plate; no text/foreground object. |
| `combat/backdrops/spire.png` | PASS | RGB, 1024×640, mean RGB 42.40/255 | Low-key cold cyan spire plate; no text/foreground object. |
| `status/stunned.png` | PASS | RGBA, 256×256, alpha 0–255 | Single white starburst glyph, true transparent field, uniform monoline family. |
| `status/burn.png` | PASS | RGBA, 256×256, alpha 0–255 | Single white flame glyph, true transparent field, uniform monoline family. |
| `status/corrode.png` | PASS | RGBA, 256×256, alpha 0–255 | Single cracked droplet glyph, true transparent field, uniform monoline family. |
| `status/acid.png` | PASS | RGBA, 256×256, alpha 0–255 | Single toxic-droplet glyph, true transparent field, uniform monoline family. |
| `status/freeze.png` | PASS | RGBA, 256×256, alpha 0–255 | Single snowflake glyph, true transparent field, uniform monoline family. |
| `status/shock.png` | PASS | RGBA, 256×256, alpha 0–255 | Single lightning glyph, true transparent field, uniform monoline family. |
| `status/hacked.png` | PASS | RGBA, 256×256, alpha 0–255 | Single circuit-hex glyph, true transparent field, uniform monoline family. |
| `combat/tiles/floor.png` | PASS | RGBA, 512×512; exact diamond alpha mask; 196,608 fully transparent pixels | Brighter muted cyan circuit tile; corners are fully transparent for canvas placement. |
| `combat/tiles/cover_full.png` | PASS | RGBA, 512×512, alpha 0–255 | Bottom-anchored neon server-rack barricade; transparent field; matches `cover_half` metal/cyan/magenta language. |
| `items/incendiary_grenade.png` | PASS | RGB, 512×512 | Dedicated orange flame-core grenade, matching existing dark circuit-board item-icon framing. |
| `items/cryo_grenade.png` | PASS | RGB, 512×512 | Dedicated pale-blue frost-core grenade, matching existing dark circuit-board item-icon framing. |

## Human art judgment

- The generated art is contract-valid and was inspected as a complete contact sheet. Confirm in the live combat canvas that the backdrop opacity at `0.4` remains suitably quiet on target displays.
- Confirm the white glyph-only status family reads well within the existing code-drawn chip discs/rims, especially the visual distinction between acid and corrode at chip scale.

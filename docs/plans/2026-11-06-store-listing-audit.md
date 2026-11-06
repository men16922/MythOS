# Store graphics and Android screenshot audit — 2026-11-06

Follow-up to the [diagnostics candidate](2026-11-05-crash-offline-acceptance.md) and G2 in the [release plan](2026-11-05-play-store-release-plan.md). This is a local listing draft audit, not Play Console acceptance or permission to publish.

## Encoding defect and provenance

The committed exporter generated an RGB icon and its validator rewrote RGBA files to RGB. Running the old and working-tree implementations on the same logo reproduced RGB / 93,351 bytes before versus RGBA / 105,053 bytes after, both 512×512. The old validator also changed an already-valid RGBA icon to RGB. The existing uncommitted fix was retained and verified: the icon stays RGBA; validation rejects incorrect dimensions/encoding/size without rewriting evidence. Four regression tests cover valid assets, preservation of rejected files, icon size and screenshot geometry/alpha. Evidence: `outputs/store-20261106-diagnosis/result.json`.

[Google's preview asset specification](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), checked 2026-11-06, requires a 512×512 32-bit PNG icon up to 1024 KB, a 1024×500 JPEG or 24-bit PNG feature graphic, and screenshots in JPEG or 24-bit PNG with each dimension 320–3840 and the long side at most twice the short side. At least two screenshots are needed to publish; each device type accepts up to eight. For games, recommendation formats require at least three gameplay screenshots at 1920×1080 landscape or 1080×1920 portrait. These dimensions do not guarantee promotion or approval. The exporter's existing 8 MiB non-icon cap is a local conservative guard, not a claim that the phone section specifies that limit.

Historical `outputs/play-store/` files are October browser fixtures. `store_assets.py --only shots` still uses Vite's development hook, injected scene states and a browser viewport; it now labels that limitation explicitly. The prior `outputs/play-store-2026-11-05/` native drafts have raw captures/helper logs but no capture-time APK identity record, so this audit replaces them with identified captures rather than inferring provenance from timestamps.

## Candidate and capture method

- New draft directory: `outputs/play-store-2026-11-06/`; icon, KO/EN feature graphics, five captures per language, with four per language selected for the review ZIP. Each capture has raw PNG and JSON evidence, SHA-256, timestamp, viewport and the installed APK hash. `identity.json` records environment and restoration; `manifest.json` lists export dimensions/encoding/hashes and short KO/EN alt text. Original storage backups are local QA evidence, not listing assets.
- Installed debug APK matches `1398e4b0490b0806ae5312acc6fa652f24e53e83ef06ec6ab1d99ca4456f8c5a` (versionCode 4 / 2.0.0-qa-diagnostics); source HEAD `5cc1e80`. Existing unsigned AAB still matches `01b27b537c69b32511da54dc24c9483693d0083a9aa05b7a1a29d50e20013b35`. All 1,706 packaged public files are byte-identical between APK and AAB. Feature title art and icon source logo also match the APK; evidence: `candidate-assets.json`.
- Owned `mythos-qa16` API 36 / 16 KB ARM64 emulator, offline Wi-Fi/mobile data, muted, native `adb exec-out screencap -p`; 1920×1080 framebuffer, 906×540 CSS viewport at DPR 2. The left safe-area strip is part of the actual app capture. No browser screenshot is relabelled as native. Exports only remove the alpha channel; RGB pixels match raw screencaps exactly, without crop, rescale or compositing.
- Synthetic initial profile selects language and first-run setup; screens are reached through actual UI actions, not injected combat/map states. No login, cloud model call, purchase, push delivery or crash report transmission is part of this capture. The event capture scrolls to show choices and costs; the historical top-of-page frame hid them.
- Graphics are composed locally from existing game art/fonts by the exporter, not gameplay captures. New image generation is unnecessary. The English feature retains the Korean brand mark with English subtitle/tagline, matching the actual title screen.

## Selection and visual review

| Order / file (under `shots/ko/` or `shots/en/`) | Purpose | Selection note |
|---|---|---|
| `01_combat.png` | Telegraphs, party, cards and end turn | Lead with the core tactical gameplay; actual first fight |
| `02_map.png` | Branching path and act directive | Authentic viewport shows reachable nodes; larger map scrolls below |
| `03_event.png` | Authored choices, rewards and costs | Scrolled actual screen; no invented odds or AI-quality claim |
| `04_character.png` | Archetype and starting stats | Held from review ZIP: credit glyph and transient black/missing regions need recapture/diagnosis |
| `05_title.png` | Branding and optional sign-in | Keep last; contains a date-sensitive daily label, refresh before submission |

Native safe-area padding, scroll boundaries and keyboard shortcut labels remain visible; they are not edited out to imply different Android behavior. Gameplay and text readability are reviewed at export size, not certified on physical phones. Character captures have a small credit-symbol concern and the English frame contains black/missing regions (capture/animation versus persistent font/render behavior is not yet distinguished); both are held from the review ZIP. The first three gameplay frames plus title are selected while capture/device/font QA investigates the optional frames. Do not infer a game defect from a screenshot alone or modify unrelated runtime code as part of this audit.

## Verification and remaining gates

Commands run: `.venv/bin/python -m unittest discover -s tests -p test_android_store_assets.py -v`; `.venv/bin/python scripts/android/store_assets.py --out outputs/play-store-2026-11-06 --only icon,feature`; native capture helper `outputs/store-20261106-capture.py`; export validator/ZIP builder `outputs/store-20261106-validate.py`; `make check`. The first gate stopped at formatting of the newly added warning line; formatting that line resolved it, and the complete rerun passed. Changed Markdown links, credential-pattern scan and `git diff --check` also passed.

All 13 image exports passed encoding/dimension/size checks; all ten native exports match the raw RGB pixels. Ten captures have zero attached JS exceptions. All original localStorage entries matched after process restart; native push/Crashlytics flags were unchanged, display size/density restored and rotation settings restored to entry values. The owned emulator and CDP forward were stopped. `outputs/play-store-review-2026-11-06.zip` contains only the 11 selected images, manifest and README (11,176,512 bytes; ZIP integrity passed), excluding storage backups and raw text. Four targeted regression tests passed. Full `make check` passed (Node 594; Python 356 run, 15 database skips), logged in `outputs/store-20261106-check.log`; no runtime/UI source changed, so browser E2E and Android rebuild were not rerun. Final release signing, physical/Play-signed screen parity, reviewer access/account deletion, contact/policy publication, production report-retention scheduling and actual Neon recovery settings remain open. These local debug captures do not close G2 or establish Android release readiness. Refresh any changed screen against the eventual signed release candidate before upload. No deployment, upload, publication, paid generation or push is included.

Next: obtain signing/test-device/reviewer/contact inputs and run the physical/Play-installed acceptance in the release plan. Independent local work can audit expanded-content IARC answers; the old rating worksheet is explicitly historical. Human Deep/Sea/Chronicle fun verdicts remain separate.

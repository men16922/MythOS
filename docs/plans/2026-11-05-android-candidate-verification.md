# Android candidate verification — 2026-11-05

Release authority: [Play Store plan](2026-11-05-play-store-release-plan.md). These are local QA results, not a signed release or Play acceptance.

Latest artifact: superseded by the FCM cleanup candidate in [connected acceptance](2026-11-05-push-connected-acceptance.md). The hashes and device observations below remain historical evidence for `fa41a72`.

## Candidate identity

Built from `fa41a7246eb1e8fb4ca642c128b9a820a4c55082`, including FCM consent controls and the corrected Settings copy. No app source changed during this verification.

| Field | Result |
|---|---|
| QA version | versionCode `1`, versionName `2.0.0`; choose a fresh unused code for upload |
| SDK | min 24 / target 36 |
| AAB | `src/mythos_ui/android/app/build/outputs/bundle/release/app-release.aab` |
| AAB SHA-256 | `4d206d4a47a1546cf10c2e30633c2db7f2c58a00d3315602f57236ddd0a5cd85` |
| AAB file bytes | 369,455,714 |
| Estimated max base download | 368,389,846 bytes; local guard 500,000,000 |
| Signing | unsigned, confirmed with jarsigner; not upload-ready |
| Debug APK SHA-256 | `1e2335ad97da3530f99b366b394863a09d7cd2571e8324719749f51ed81d4837` |
| Native packaging | `PAGE_ALIGNMENT_16K`; all four ELF libraries have minimum LOAD alignment 16,384; debug APK `zipalign -c -P 16 4` passed |
| Release manifest | FCM auto-init and Analytics collection default to false |

Commands: `bash scripts/android/build-web.sh`, Gradle `:app:assembleDebug :app:bundleRelease -PversionCode=1 -PversionName=2.0.0`, `scripts/android/check_bundle_size.py` with bundletool 1.18.3. Source `scripts/android/env.sh` in bash. Existing debug signing was used only for temporary measurement APKs. Evidence: `outputs/android-final-{web-build,native-build}.log`, `outputs/android-final-{artifacts,download-size,bundle-config,elf-alignment}.json`, `outputs/android-final-manifest.xml`, `outputs/android-final-signature.txt`.

The common source gate already passed at this source commit: Node 594, Python 352 with 15 DB skips, browser E2E. This documentation-only verification does not claim a new full gate run. The separate isolated PostgreSQL retention/store checks passed without skips in the preceding checkpoint.

## API 24 environment and limits

Owned headless AVD `mythos-qa24-aosp`, Android 7 / API 24 ARM64, AOSP image revision 9, 1080×2400 / 420 dpi. SDK/image and AVD files are isolated under `outputs/android-sdk` and `outputs/android-avd`. Muted app, no active default network. No accounts or real user data were used.

The Google API 24 image only accepts listed Google providers; it rejected the AOSP package. Instead, the separate AOSP QA image used its writable-system development mode to replace the stock provider. The original SDK image was not edited. Provider `com.android.webview` **111.0.5561.0** came from the official Chromium ARM64 snapshot 1097049 (`SystemWebView.apk`, minimum SDK 24); APK signature and active provider/UA were verified. APK SHA-256: `ec3a4f19c184141cad224fb86d374b8071e7827a615b14bb0443b6ad1b295e4b`. Provenance: `outputs/android-api24-updated/source.json`. This is a development-provider compatibility test, not a Google Play WebView delivery test or a recommendation to install an old snapshot on a personal device.

Provider references: [Chromium provider restrictions](https://chromium.googlesource.com/chromium/src/+/main/android_webview/docs/webview-providers.md), [WPT development WebView setup](https://web-platform-tests.org/running-tests/android_webview.html).

## Input diagnosis

The original helper sent Android keycode 111 (Escape). A stepwise focus trace showed title → setup → prologue retained MainActivity; Escape skipped the prologue in the DOM but also switched focus to the launcher. Replacing that test input with Android Back (keycode 4) kept MainActivity foregrounded. No app fix was made. Android's first-run fullscreen help also blocked taps; tapping its visible “GOT IT” button set `immersive_mode_confirmations=confirmed`. DOM state alone was not accepted as rendered gameplay evidence.

Evidence: `outputs/android-api24-updated/gameplay/diag-*-device.png`, `outputs/android-api24-updated/fullscreen-dismissed.png`; helper `outputs/android-api24-updated-gameplay.py`. The first map tap also exposed old-provider CSS zoom coordinates: raw center y≈1079 lay below the 915 CSS-pixel viewport; multiplying the map zoom 0.64 gave y≈690 and hit the intended visible node. The helper now checks `elementFromPoint` before native taps and excludes the root computed zoom (2.625 device density on this provider). This is an automation correction, not a game layout change.

## Verified API 24 paths

- Fresh local run → setup → prologue (native Back) → Act 1 → opening event → map → first combat, fully offline.
- Android Back during combat opens Pause; Back closes it without minimizing.
- Background/Home then foreground preserves the serialized save byte-for-byte.
- Force-stop/process restart preserves the same save; title Continue returns to the same combat.
- After tutorial dismissal, a native End Turn tap advanced the saved combat from turn 1 to turn 2; `played-next-turn-device.png` was inspected, no attached JS exceptions.
- Active provider UA is Chrome 111.0.5561.0 / Android 7; no attached unhandled JavaScript exceptions.
- Actual device screenshots were inspected, including `resumed-combat-device.png`; this includes the first-run tutorial overlay, not a DOM-only assertion.

Evidence: `outputs/android-api24-updated/gameplay/{result.json,title-device.png,offline-map-device.png,offline-combat-device.png,hardware-back-device.png,restart-device.png,resumed-combat-device.png}` and `outputs/android-api24-updated/gameplay.log`. No authenticated traffic, notification delivery, paid-model call or purchase was exercised.

## Still open

Physical devices and vendor providers; Play-delivered WebView and Play-signed install/update; Google sign-in/account switching/deletion; connected FCM existing-token deletion/renewal/topic retries/upgrade; keyboard and sustained-play coverage; release signing, final Console size/compatibility/pre-launch reports. API 36 / 16 KB results belong to the preceding checkpoint and were not rerun here. Free-first launch remains a recommendation, not approval to publish.

Cleanup: removed the owned TCP 9229 forward and stopped emulator 5584. The writable-system replacement is temporary; recreate the documented development-provider setup before another AVD launch. Host SDK image and unrelated devices/worktrees were left intact.

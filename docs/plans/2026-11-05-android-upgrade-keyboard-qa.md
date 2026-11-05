# Android debug upgrade and keyboard acceptance — 2026-11-05

Scope: isolated API 36 / 16 KB Google APIs ARM64 emulator `mythos-qa16`, owned serial `emulator-5582`. Synthetic game saves; diagnostics disabled and muted. Upgrade probes used real FCM registration but sent no messages and exposed no tokens. Keyboard probes were offline, submitted no input and called no model. Physical devices and Play-signed artifacts remain unverified.

## Upgrade identity and method

Built the old app in an ignored isolated source copy from `fa41a72`, and the new app from `f3e012a`. Both use the same existing debug certificate. Within each acceptance case the update used `adb install -r` without clearing data; clearing/downgrading occurred only between synthetic fixtures.

| Build | Version | APK SHA-256 |
|---|---|---|
| Old `fa41a72` | 1 / 2.0.0 | `33cbb50fd4a6105e115b41597ac181c8b8052aa21b79e354179d3dc6214fb71b` |
| New `f3e012a` | 2 / 2.0.0-qa-upgrade | `e3efb99526c9394fae80e24a45329d550772aacb111e30e5c22cb10a82ecf6da` |

Identity: `outputs/upgrade-artifacts.json`; retained new APK: `outputs/upgrade-new-v2-debug.apk`. The current default debug APK was subsequently replaced by the keyboard build below.

- **Consent on + existing token:** run, profile, mute, diagnostics and push values remained byte-identical. Continue returned to the same combat; registration stayed enabled. The new cleanup marker was established. Actual Settings off then removed registration and pending work.
- **Consent off + old pending topic queue:** all five stored values remained byte-identical through upgrade. Reconnection with off preserved did not recreate a token during 30 seconds; the legacy SDK queue remained dormant, not erased. Explicit re-enable reconciled it; subsequent off left auto-init false, no token, no pending queue and cleanup-required false. Do not generalize this to automatic deletion of all legacy queue state on upgrade.
- Both cases had zero attached JavaScript exceptions. Native preference inspection returned flags only. Evidence: `outputs/upgrade-qa/case-on-result.json`, `case-off-result.json`, before/after snapshots and native screenshots. These debug updates do not prove Play app-signing migration or notification delivery.

## Keyboard defect, fix and same-path verification

The event input was exercised with a controlled stored `a1_welfare_capsule` screen fixture. The original combat save was retained separately; this fixture is not a full-run event-reachability claim. Native Android taps opened the actual IME and entered ASCII `QA_input_keep`.

Before the fix, portrait input was visible. Rotating with the keyboard open retained focus/text but put the field at y=226.74–268.74 in a viewport only 151.24 CSS px high. Manual nearest scrolling brought it back, distinguishing stale scroll placement from focus loss or an unscrollable layout (`keyboard-rotation-diagnosis.json`).

`EventScreen` now repositions only its focused action input on window/visual-viewport resize using the next animation frame, and removes listeners on unmount. Input scroll margins reserve the fixed header and a small bottom gap. No engine rule or input submission behavior changed.

| Actual native path after fix | Result |
|---|---|
| Portrait keyboard | Input y=430.45–472.45, viewport 527.24; visible |
| Portrait → landscape with IME open | Input y=101.40–143.40, viewport 151.24, header ends at 64; fully visible |
| Native Back in landscape | IME hidden, text retained, no pause menu |
| Return to portrait and reopen IME | Input y=477.31–519.31, viewport 527.24; fully visible |
| Native Back in portrait | IME hidden, text retained, no pause menu |
| Reopen IME in landscape | Input y=101.40–143.40; fully visible |

Save unchanged during the keyboard sequence; zero attached JS exceptions. Native screenshots were inspected. Evidence: `outputs/upgrade-qa/keyboard-fixed-result.json`, `keyboard-landscape-reopen-result.json`, corresponding `*-device.png`; helper `outputs/keyboard-regression-qa.py`. An initial rerun began in landscape because the settings-only rotation setup had not taken effect; the valid run explicitly used `wm user-rotation lock` and waited for actual portrait dimensions. Restoration was verified after a separate process restart from the title: original five stored values byte-identical and original combat screen preserved (`keyboard-restored.json`). Rotation settings restored, forward removed, owned emulator stopped. Korean IME composition, vendor keyboards, API 24 keyboard behavior and physical-device sustained play remain unverified.

## Rebuilt local candidate and checks

Built from `f3e012a` plus this checkpoint's keyboard change; exact source hashes in `outputs/keyboard-artifacts.json`.

- `make check` passed: Node 594; Python 352 run, 15 database skips. App web, debug APK and unsigned release AAB builds passed. Muted built-SPA E2E passed (`MYTHOS_V2_GM=off make test-e2e-v2`).
- Debug keyboard build: versionCode 3 / versionName 2.0.0-qa-keyboard; SHA-256 `31394420ac4718e7a44401ce2039b8de68f77cd98f05338baf79e29c235e6785`.
- AAB: versionCode 1 / versionName 2.0.0, unsigned QA only; SHA-256 `70791d6dee9c85315db5c4ca97fea11efde52f04e5542c65d8b44716ede3b3b4`, file 369,456,410 bytes. Max base download estimate **368,390,479 bytes**. Console acceptance and release signing remain open; upload needs a fresh unused versionCode.
- Bundle `PAGE_ALIGNMENT_16K`, all four ELF LOAD minimum alignments 16,384 and debug APK zipalign passed. Evidence: `outputs/keyboard-{download-size,artifacts,bundle-config}.json`, `keyboard-signature.txt`, `keyboard-zipalign.txt`, build/check/E2E logs.

This candidate supersedes the artifact in [connected FCM acceptance](2026-11-05-push-connected-acceptance.md); those earlier connected tests still describe their tested source/artifact. No deployment, policy publication, Play upload, account/permission changes or push occurred. Next independent audit: D7 database backup and provider-region evidence; owner-dependent signing/contact, real reviewer/account deletion, physical/Play-signed and delivery checks remain open in the [release plan](2026-11-05-play-store-release-plan.md).

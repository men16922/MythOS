# Android diagnostics opt-out and pending-report evidence — 2026-11-05

D6 follow-up to the [Play data audit](2026-11-05-play-data-and-review-audit.md). Actual debug app on isolated API 36 / 16 KB ARM64 AVD `mythos-qa16`, serial `emulator-5582`. Wi-Fi and mobile data were disabled before app launch and connectivity showed no active network throughout the probe. No crash report, notification or model request was sent. Only synthetic QA data was used.

## Observed behavior

The baseline debug APK was the keyboard candidate (versionCode 3, SHA-256 `31394420ac4718e7a44401ce2039b8de68f77cd98f05338baf79e29c235e6785`). Firebase Crashlytics is 20.0.3. Native flag checks read only the collection boolean; filesystem checks counted local SDK event/report files without exposing identifiers or report contents.

| Probe | Observed evidence |
|---|---|
| Existing choice off | Local `0`, Settings switch false, persisted SDK flag false |
| Actual Settings on → process restart | Local `1`, switch true, SDK flag true on both launches |
| Actual Settings off → process restart | Local `0`, switch false, SDK flag false on both launches |
| Global JS error event while off | Synthetic `MYTHOS_QA_OFF_JS_SUPPRESSED`; native event count stayed 0 |
| Direct native SDK non-fatal while off | Synthetic `MYTHOS_QA_NATIVE_WHILE_OFF` through the existing bridge; event count 0 → 1 while SDK flag remained false |
| Restart while off | Local event finalized into one retained report; automatic-collection flag remained false |
| Explicit QA cleanup | SDK `deleteUnsentReports` removed the synthetic report; restart confirmed 0 event and 0 finalized-report files. This API invocation was test cleanup, not current Settings behavior |
| No stored app choice | Removing only the local choice, allowing persistence and restarting yielded app default on: local `1`, switch true, SDK flag true. This is an absent-app-choice probe, not a fresh-install/startup-network capture |
| Final state | Actual off restored, five original run/profile/mute/diagnostics/push values verified byte-identical after restart, no synthetic report left; zero attached JS exceptions |

Evidence: `outputs/crash-offline-qa/result.json`, `original-storage.json`, native screenshots, `outputs/crash-offline-qa.py`. The deliberate JS ErrorEvent was dispatched to the app listener, not thrown as an uncaught CDP evaluation error. The native non-fatal probe intentionally bypassed the JS opt-out guard to measure what the SDK retains. No fatal crash, ANR, connected-upload timing or backend deletion was tested.

## Corrected disclosure, without changing collection behavior

The old Settings hint said turning off stopped future reporting without explaining pending device reports or restart timing. The device probe establishes retained local reports while off; [Firebase's API contract](https://firebase.google.com/docs/reference/android/com/google/firebase/crashlytics/FirebaseCrashlytics) separately states that disabling automatic collection applies on the next app run and that unsent reports can be deleted or sent explicitly. Persisted `false` alone is not proof that all already-started network work was cancelled.

KO/EN Settings and privacy drafts now distinguish new JS forwarding from native automatic uploads, tell users to fully close/reopen after off, and disclose that local reports can remain and may send after re-enabling. Off is not a request to delete local unsent or already-sent reports. `crash.ts` comments and Android documentation no longer imply raw error strings cannot contain personal information. Default-on behavior and collection code are unchanged; no new deletion control or forced restart was added.

## Verification and candidate identity

- Actual updated Android Settings displayed both languages, with no horizontal overflow or attached JS exceptions. Screenshots `copy-en-device.png` / `copy-ko-device.png` were inspected; `copy-result.json` verifies restoration, native off and no synthetic reports. Language changes updated the synthetic profile normally; the original profile was restored from the title and verified after another restart. The owned emulator and forward were stopped.
- Initial helper failures were test setup issues: a localStorage removal followed immediately by force-stop had not persisted; waiting before restart corrected the fixture. An unscoped radio selector selected the title screen behind Settings, so final language QA scoped actions to the dialog. Neither is reported as an app regression.
- Eight locally served policy cases passed: contact absent/present × 390/1280 px × privacy/account-deletion, both language sections, no overflow/page errors. Evidence: `outputs/crash-copy-policy/`, `crash-copy-policy.log`. These are unpublished local drafts.
- `make check` passed: Node 594; Python 352 run, 15 DB skips. Muted `MYTHOS_V2_GM=off make test-e2e-v2` passed. Web, debug and unsigned AAB builds passed (`outputs/crash-copy-*.log`).
- Updated debug APK: versionCode 4 / versionName 2.0.0-qa-diagnostics, SHA-256 `1398e4b0490b0806ae5312acc6fa652f24e53e83ef06ec6ab1d99ca4456f8c5a`.
- Unsigned QA AAB: versionCode 1 / versionName 2.0.0; SHA-256 `01b27b537c69b32511da54dc24c9483693d0083a9aa05b7a1a29d50e20013b35`; file 369,456,515 bytes; max base download estimate **368,390,744 bytes**. Base source `7ee862c` plus this checkpoint's copy changes; exact file hashes in `outputs/crash-copy-artifacts.json`.
- Bundle `PAGE_ALIGNMENT_16K`, four ELF LOAD minimum alignments 16,384 and debug APK zipalign passed. Evidence: `outputs/crash-copy-{download-size,artifacts,bundle-config}.json`, `crash-copy-signature.txt`, `crash-copy-zipalign.txt`. This supersedes the artifact in [upgrade/keyboard acceptance](2026-11-05-android-upgrade-keyboard-qa.md), not its scoped behavioral evidence.

Release signing, a fresh unused upload versionCode, Console acceptance, physical/Play-signed checks, connected Crashlytics behavior, raw-string data inventory and policy publication remain open. No deployment, upload, IAM/account change or push occurred. Next independent task: audit store-listing graphics/screenshots against the current Android candidate, preserving provenance and separating browser fixtures from native captures.

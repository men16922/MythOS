# Connected FCM acceptance and interrupted cleanup — 2026-11-05

Scope: D1 in [data/reviewer audit](2026-11-05-play-data-and-review-audit.md). Local debug app on the isolated API 36 / 16 KB AVD `mythos-qa16`. Existing Firebase configuration; no account creation, credentials output, notification send or deployment. Tokens were compared only inside Android instrumentation and never returned through the app bridge or written to reports. Crashlytics collection was off before connecting.

## Reproduction and cause

Ordinary enable → obtain token → off → delete → re-enable with a different token passed. A separate restart preserved off without a cached token. However, an offline queued topic request followed by off and **reconnection in the same process** recreated a token. The regression failed in `outputs/push-pending-same-process-before.txt` (15.534 seconds). Host-side state checks confirmed auto-init false, no cached token and a persisted QA-topic operation before reconnection.

The installed Capacitor messaging plugin resolves subscribe/unsubscribe when it queues the SDK operation, not when the server finishes it. Firebase's pending topic work can obtain a token independently of auto-init. Thus deleting the current token alone does not finish an off request. Source references: [Firebase Android registration/topic methods](https://firebase.google.com/docs/reference/android/com/google/firebase/messaging/FirebaseMessaging), [SDK topic queue implementation](https://github.com/firebase/firebase-android-sdk/blob/master/firebase-messaging/src/main/java/com/google/firebase/messaging/TopicsSubscriber.java). The installed Messaging version is still 25.0.1; no dependency changed.

The first process-restart probe ended before the SDK preference write reached disk and failed its off precondition; it is not evidence of topic replay. After allowing the instrumentation write to settle and verifying persisted false, the old code did not recreate a token during a 30-second restart observation (`push-pending-restart-before2.txt`). The confirmed defect is the same-process reconnect path.

## Change

- The native bridge commits a cleanup-required marker before enabling registration or submitting app topic changes. It disables auto-init immediately on off, completes removal of both daily topics, then deletes the token and clears the marker. Off calls share one in-flight cleanup so duplicate drains cannot recreate a token after an earlier deletion.
- A never-enabled installation skips topic operations. A previously enabled SDK flag also triggers reconciliation. An unfinished cleanup is retried by the existing off reconciliation on app launch; no private SDK queue is edited and the shared Firebase Installation ID is not deleted.
- App topic methods now resolve on SDK completion, accept only `daily-ko` / `daily-en`, and reject when registration is disabled. Tokens do not cross this bridge.
- Settings permits cancelling a pending enable. Request ordering prevents a stale result from restoring on; pending off explains that cleanup needs connectivity. The local off choice is saved immediately. Re-enable waits for cleanup.
- KO/EN privacy drafts disclose that reconnecting to remove earlier subscriptions may temporarily create/transmit registration data. No promise of immediate offline deletion, zero network traffic after off, or an app-wide identifier opt-out is made. Policy publication remains separate.

## Verified

| Path | Evidence |
|---|---|
| Actual bridge obtains, deletes, and renews a token | `outputs/push-drain-lifecycle.txt`, passed |
| Offline pending topic + duplicate off + reconnect in same process | `outputs/push-pending-same-process-after.txt`, passed in 49.795 s; no cached token for 30 s after cleanup |
| Offline off interrupted by process death | `outputs/push-pending-offline-after.txt`, `push-pending-restart-state.json` show auto-init false / cleanup required true |
| Restart completes persisted cleanup | `outputs/push-pending-restart-after.txt`, passed in 36.396 s, including 30 s without token recreation after cleanup |
| Actual Settings UI: pending enable → off → reconnect | `outputs/push-drain-ui/result.json`; off persists, cleanup finishes, late enable cannot restore on, zero attached JS exceptions |
| Actual Settings UI: connected enable → off | Same result file; both complete, final auto-init false / cleanup marker false / no cached token |
| Policy wording/layout | Eight served cases: contact present/absent × 390/1280 px × privacy/account deletion; no overflow or page errors. Updated notification rows captured in KO/EN at 390 px, `outputs/push-drain-policy/` |
| Code/native gates | `make check`: Node 594; Python 352, 15 DB skips. Muted browser E2E passed. App web, debug APK, instrumentation and unsigned AAB builds passed (`outputs/push-drain-*.log`) |

Native UI used a test-granted notification permission and pointer input in the actual WebView; prior permission-denial evidence remains separate. Instrumentation uses a dedicated QA topic; Settings briefly uses the real language topic and removes it on off. No message was sent. Cleanup probe passed, the final UI left no cached token or pending cleanup, the debug forward was removed, networking disabled and the owned emulator stopped. No physical device or other worktree was changed.

## Re-run the opt-in instrumentation

Test source: `src/mythos_ui/android/app/src/androidTest/java/com/projectmythos/signalrun/PushRegistrationConnectedTest.java`. Build `:app:assembleDebug :app:assembleDebugAndroidTest`, install both on an isolated emulator with its diagnostics disabled. Tests skip without `-e connectedPush true`; this opt-in uses real FCM registration.

Use `adb -s <owned-serial> shell am instrument -w -e connectedPush true -e class 'com.projectmythos.signalrun.PushRegistrationConnectedTest#<method>' com.projectmythos.signalrun.test/androidx.test.runner.AndroidJUnitRunner`. Read JUnit results: `am instrument` can exit zero even when a test fails.

- Connected baseline: `bridgeDeletesExistingTokenAndReenableRenewsIt`; separately restart the app process and run `disabledRestartHasNoCachedToken`.
- Pending probes additionally require `-e pendingTopicProbe true`. Start `queueOfflineTopicThenDisable` offline. With `-e sameProcessProbe true`, keep instrumentation running and reconnect from a second shell after the native off flag and cleanup-required marker are persisted; it awaits cleanup, then observes for 30 s.
- Without `sameProcessProbe`, the offline phase returns with cleanup pending. Verify the native flags, force-stop, reconnect, then run `interruptedCleanupFinishesAfterRestart`.
- Run `cleanupProbeTopic` connected even after a failed probe. It unsubscribes the QA topic and disables/deletes registration. Never dump SDK token preferences or log token values. Do not run the whole class with pending-probe arguments: these are explicitly ordered phases.

## Unsigned candidate at this checkpoint

Superseded by [upgrade/keyboard acceptance and rebuilt candidate](2026-11-05-android-upgrade-keyboard-qa.md).

This supersedes the `fa41a72` artifact in [earlier candidate verification](2026-11-05-android-candidate-verification.md). Built from base `1043f88` plus this checkpoint's cleanup changes; production-source SHA-256 hashes are recorded in `outputs/push-drain-artifacts.json`.

- AAB SHA-256: `a536fdf206b2df04d0ebc943cf443ea622a1e7d3fc0428a9e672e329aef14055`; file 369,456,252 bytes; max base download estimate **368,390,232 bytes**.
- QA versionCode 1 / versionName 2.0.0. Unsigned; not upload-ready. A fresh unused version code and owner signing are required for upload.
- Bundle `PAGE_ALIGNMENT_16K`, all four ELF minimum LOAD alignments 16,384, and debug APK zipalign passed. Logs/metadata: `outputs/push-drain-{download-size,artifacts,bundle-config}.json`, `push-drain-signature.txt`, `push-drain-zipalign.txt`.

Unverified at this checkpoint: older-install upgrade (subsequently checked in the follow-up), physical/vendor and Play-signed acceptance, notification delivery/tap behavior, independent Firebase identifier/network inventory, Google sign-in/account deletion, signing/contact and final Console acceptance. Follow-up debug upgrade and keyboard evidence is in the superseding record; physical/Play-signed coverage remains. This does not lift publication/payment holds or the automatic push prohibition.

# Play data disclosure and reviewer-access audit

Date: 2026-11-05. Code baseline: `d609698`; release candidate remains unsigned and unsubmitted. This is an engineering evidence sheet and submission draft, not a compliance approval. Release gates: [release plan](2026-11-05-play-store-release-plan.md). Complete the open evidence before entering final answers in Console.

## Evidence and scope

- Inspected Android source and merged release manifest, resolved Gradle `releaseRuntimeClasspath`, client auth/save/GM/report routes, server auth/store/deletion/logging, and current policy HTML. No credentials, personal data, live purchase tokens or private user records were read.
- Resolved native SDKs: Firebase Auth **24.0.1**, Crashlytics **20.0.3**, Messaging **25.0.1**, Installations **18.0.0**. These differ from the Capacitor plugin version **8.5.2**. No `firebase-analytics` dependency was resolved. Artifact: `outputs/play-data-dependencies.txt`.
- Merged release permissions include INTERNET, POST_NOTIFICATIONS, BILLING, ACCESS_NETWORK_STATE, WAKE_LOCK, RECEIVE, READ_GSERVICES and the app's private dynamic-receiver permission. There are no camera, microphone, contacts or location permissions in this manifest. This alone does not exclude SDK-derived data.
- No FCM auto-init or Crashlytics collection-disabling metadata is present. `native/init.ts` initializes reporting and notification handlers at startup. Source inspection is not an observed network capture.
- Live read-only Cloud Logging check: global `_Default` bucket **30 days**, `_Required` **400 days / locked**; project sinks are the two corresponding defaults. Evidence: `outputs/play-data-log-{retention,sinks}.txt`. Organization-level exports, DB backups, Firebase backend retention and Vertex project-specific logging were not audited.

## Proposed Data safety inventory

“Collected” includes SDK transfers, even if the game database never receives the value. Pseudonymous IDs still count. In-memory processing must still be answered in the form; a service-provider sharing exception needs an actual basis. These distinctions follow [Google's form definitions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en). Treat the table as a candidate mapping; validate the final form's exact categories and all active release variants.

| Candidate category | Observed data path / purpose | Optional / ephemeral assessment | Evidence and unresolved point |
| --- | --- | --- | --- |
| Personal info: email, name, user IDs | Google sign-in → Firebase Auth; signed token → game API; account management and cloud functionality | Sign-in optional. Account and save data are retained, not ephemeral | `native/authNative.ts`, `net/auth.ts`, `mythos_v2/auth.py`. Firebase retains profile attributes; game keys data with `g_ + sha256(uid)[:32]`. This is pseudonymous, not anonymous |
| Profile photo / applicable personal-information category | Firebase user `photoUrl` displayed in account UI | Optional with sign-in; provider retention applies | `authNative.ts:toUser`; identify the Console category for fetched photo/URL rather than blindly copying the old “Other info” row |
| App activity: game activity / other actions | Profile/run JSON, finished-run history, daily result + replay data, AI allowance spend | Cloud paths require sign-in; retained until deletion subject to backups/logs | `net/api.ts`, `mythos_v2/store.py:delete_player`. Daily display name/results are public; assess the user-initiated sharing exception and the disclosure visible before submission |
| App activity: other user-generated content | Typed companion/NPC messages, selected conversation history, improvised actions and scene context → game API → Vertex AI | Optional AI use; **do not mark all content ephemeral** | `net/api.ts:talk/talkNpc/improvise`, `CompanionChat.tsx`, `EndingScreen.tsx`. Full comms log is local, but selected prior lines are sent again as context. Improvisation state and generated chronicle can be part of saved run/history. Vertex retention/exemption evidence is missing |
| App activity: reported content | Reported line, route, kind, language and timestamp → `v2_gm_reports` | User-initiated; retained, not ephemeral | `api.py:v2_gm_report`, `store.py:record_gm_report`. No reporter-id column, but report text can itself contain identifying information. Do not call arbitrary free text anonymous |
| App info/performance: crash logs and diagnostics | Raw JS error message/stack + native SDK diagnostic data → Crashlytics, for error analysis | Default **on**, Settings opt-out. Verify persistence and pending-report behavior on device before final optional answer | `native/crash.ts` limits JS reports to 20 per launch; stack 2,000 chars, message 500. No explicit account ID/save blob attachment, but strings are not redacted. “No personal data can appear” is unproven |
| Device or other IDs | Firebase installation identifiers, Crashlytics installation identity, FCM registration; diagnostics and notification delivery | **No app-wide collection opt-out established**. Notification subscription off is not FCM identifier collection off | Merged manifest, `native/push.ts`, resolved SDKs. Follow [Firebase SDK disclosure guidance](https://firebase.google.com/docs/android/play-data-disclosure) and [FCM auto-init behavior](https://firebase.google.com/docs/cloud-messaging/android/get-started). A notification permission dialog is not evidence of no earlier identifier transfer |
| Security / connection data | IP, user agent, request metadata; app logs may include pseudonymous player ID, outcome, provider/model and latency | Server/SDK contact can occur without gameplay cloud saves; retention differs by sink | `mythos_v2/log.py`, `api.py:record_gm`, Cloud Logging evidence above. Determine the form mapping and whether providers derive approximate location; no GPS permission does not settle it |
| Financial info: purchase history, when enabled | Play token/product/state/expiry and account binding → billing API / entitlement store | Optional purchase; retained. No card number handled by game code | `native/billing.ts`, Android `BillingPlugin.java`, `mythos_v2/billing.py`. Billing code/permission exist even though sale is on hold; omit only after confirming no active release path collects it |

Sharing must be assessed separately for Google/Firebase/Vertex, the DB host and public daily results. Do not submit a blanket “nothing shared” because cloud companies are service providers. Do not submit “not collected” for data processed only by an SDK. For AI, [Google's data-governance documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) describes configuration/contract-dependent retention; no project-specific exemption was verified here.

Transport: app API default is HTTPS, and release mixed-content setting is false for that default. Confirm the **signed candidate** has no plain-HTTP API override and review SDK paths before declaring all traffic encrypted. No independent security certification is claimed.

## Corrections needed before submission

| ID | Current evidence / mismatch | Required resolution and acceptance |
| --- | --- | --- |
| D1 — FCM collection | Reminder defaults off, but FCM automatic identifier generation is not disabled; turning off only unsubscribes topics | Make collection behavior and disclosure agree. If implementing true identifier opt-in, test first launch, denied permission, enable, disable, restart and token renewal with the native SDK; topic unsubscribe alone is insufficient |
| D2 — AI retention / content | Old worksheet says all chat is ephemeral and “not stored”; local comms supplies later prompts, and generated chronicle/improvisation can be saved | Document local persistence, selected context retransmission, cloud save/generated-content retention and provider terms separately; no unconditional ephemeral declaration |
| D3 — report retention | Both stores prune rows older than 90 days only when a new report is inserted (`migrations/015_v2_gm_reports.sql`). No scheduled purge found | Implement/verify time-based retention independent of new reports, or adopt and disclose an accurate approved policy. Until then “deleted automatically after 90 days” is not established |
| D4 — partial account deletion | `DELETE /account` deletes five game-data tables, then tries Firebase deletion; response can have `ok=true` and `sign_in_record_deleted=false`. Client signs out and shows a qualified result | Correct policy's unconditional immediate Firebase-deletion promise; test full and partial paths with dedicated accounts and verify production permission. Account deletion does not cancel a Play subscription, remove local saves, erase reports by identity or prove backup deletion |
| D5 — contact / identity | Policy renderer falls back to the Play listing's developer email; current release is not published and support contact is missing | Owner supplies matching developer identity and reachable email; render live mailto and verify external deletion handling. Never invent an address or publish a placeholder |
| D6 — telemetry / pseudonymity | Privacy summary says no analytics SDKs; diagnostics are default-on. Hash ID remains stable and account-linked; message/stack strings are unredacted | Distinguish no ads/no Google Analytics from Crashlytics diagnostics. Use “pseudonymous” for account hash. Describe actual fields, settings and limits without promising anonymity |
| D7 — retention / locations | `_Default=30` confirmed, `_Required=400` confirmed; DB backup, provider processing geography and Firebase/Vertex settings unverified | State scope of each retention period; verify backup/restore/export policies and provider-specific regions before claiming every record stays in the US or disappears in 30/90 days |
| D8 — reviewer access | Only Google sign-in exists for cloud features; contest demo covers AI only, not saves/deletion/leaderboard writes | Supply a reusable reviewer resource and validate every restricted feature on the Play-signed candidate; choose access implementation only after this actual flow is established |

The source `/privacy` and `/account-deletion` pages still contain the flagged wording. This audit does **not** update their deployed content or resolve these gates. Prioritize D1's native behavior measurement, D3's retention mechanism and D4/D6's policy corrections; contact, signing and real account acceptance require owner-provided resources.

## App access: candidate Console answer and English instructions

Candidate answer: **All or some functionality is restricted.** Core offline play is available without sign-in. Cloud saves, leaderboard posting, account deletion and authenticated AI are restricted. Viewing a leaderboard and posting a result are different paths. Signal+ must be freely accessible for review if enabled in any submitted version.

Google requires reusable, continuously accessible credentials/resources, English instructions, and full details for third-party sign-in; credentials must work regardless of reviewer location. See [review access requirements](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en).

**Not ready to paste:** no dedicated reviewer account or Play-signed device result exists in this audit. Owner enters credentials only in the secured Console fields, not Git or these docs. Do not tell reviewers to create a personal Google account, pay, or contact the developer for a one-time code. Do not add an authentication bypass or weaken token verification to satisfy this draft.

Draft instructions (complete account resources and verify labels on the release candidate first):

> MYTHOS: Signal Run can be played offline without signing in. Open the app, choose English in Settings if needed, then start a new loop and press Connect.
>
> To review online features, use the dedicated Google account supplied in the App access credential fields. Open the account control and choose Sign in with Google. Select the supplied account in the Android account picker. Cloud saves, Daily Signal result submission and AI dialogue use this account. If an account must be added to the device first, follow the supplied account setup instructions.
>
> AI narration and conversations are optional and subject to a usage allowance. Authored fallback text is always available. The supplied review account must have enough allowance for the review; fallback text alone does not demonstrate the live AI path.
>
> Open Settings → Delete account to review deletion. Use the separate disposable deletion account supplied in the additional access instructions, so deleting it does not invalidate the main review account. A replacement must be available for repeated reviews.
>
> Signal+ is not offered in this free-release candidate. If the submitted candidate enables it, replace this sentence with tested, free reviewer access instructions for the paid features.

Do not submit the final paragraph unless the actual candidate matches it. No account, tester invitation, purchase, entitlement grant, Console change or public submission was performed.

## Acceptance record to complete

| Check | Evidence to attach privately | Current result |
| --- | --- | --- |
| Signed install + Google picker | versionCode/hash, Play app-signing SHA registered, device/OS/provider version | Missing |
| Main reviewer resource | Reusable login from a clean device, region/2FA/expiry constraints tested | Missing; do not store credentials in repo |
| Cloud saves / sign-out / second-device restore | Same QA account, explicit before/after save identity | Missing |
| Daily result posting | Submission and visible row from the supplied account | Missing |
| Live AI + report | Allowance available, a model response, report reaches moderation storage | Missing; paid call gate remains |
| Deletion resource | Separate account; all five tables + Firebase record checked, local-save behavior documented | Missing |
| Signal+ if enabled | Free reviewer access, purchase/restore/expiry/revocation evidence | On hold |
| Data declaration | SDK/network evidence + policy/retention/contact matches signed artifact | D1–D7 open |

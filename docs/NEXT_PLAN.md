# Next Plan

Last updated: 2026-11-05

Open work only. Current verification and deployment: `STATUS.md` and the newest `PROGRESS_LOG.md` entry. Completed implementation history: `COMPLETED_SUMMARY.md` and `bin/docs/archive/progress-2026-11-04-oldest.md`.

## Next: feedback and evidence

Route-aware GM runtime `505ccff` is live in `00185-yev`; full gate, route UI checks, preview and production checks passed (see newest log). The 11-05 delegated decisions accepted the four consumables, reviewed art and once-per-act banter. These and deployment are resolved, not pending owner calls.

## Play Store preparation (plan clarified at owner request)

Canonical plan: `docs/plans/2026-11-05-play-store-release-plan.md`. Recommended free app first, Signal+ later; launch/payment/publication hold is not lifted by planning.

- Packaging-size guard and unavailable purchase UI fixed and verified locally (latest log). Unsigned QA AAB max base download estimate: 368,390,479 bytes. 16 KB packaging and API 36 emulator offline/back/resume/restart checks passed. Startup safe-area warning fixed; portrait/landscape rotation passed. API 24 stock WebView 53 now shows update guidance; updated-provider offline start/back/resume/restart passed on a separate AOSP API 24 emulator (development WebView 111). Physical-device and Play-signed install/update/auth checks remain open. No signed release AAB or Play Console acceptance yet.
- Data safety/reviewer audit completed: `docs/plans/2026-11-05-play-data-and-review-audit.md`. D1 connected token deletion/renewal, pending-request reconnect/restart and Settings cancellation passed after fixing a reproduced SDK retry defect; debug upgrade with on/off legacy states passed; physical/Play-signed and delivery acceptance remain. D3 independent purge command is isolated-DB verified; production job/schedule/monitoring remain (operations plan linked from audit). D2/D4/D6 policy/Settings drafts corrected locally; publication, actual contact and dedicated-account deletion acceptance remain. Debug upgrade and actual IME rotation/reopen/Back checks passed after a focused input visibility fix. Next: D7 read-only database backup/provider-region audit, then remaining physical/Play-signed coverage. Physical/Play-signed acceptance requires the owner inputs below. Latest candidate/upgrade/keyboard evidence: `docs/plans/2026-11-05-android-upgrade-keyboard-qa.md`; connected FCM detail remains in `docs/plans/2026-11-05-push-connected-acceptance.md`. SDK/provider retention, contact and real reviewer resources remain gates.
- Owner inputs before upload: account type/date and verification, developer identity/contact, target countries, signing setup, testers and real devices. Production policy pages return 200 but have no mailto contact; account deletion and reviewer access still need device/end-to-end evidence.
- Signal+ remains gated on real purchase/revocation tests and timely entitlement refresh; existing fake API tests are insufficient.

## Human play verdicts

- `[owner]` Play `docs/test/mythos2_fun_check.md` (especially §12–16): Deep/Outside/Sea routes, late damage, tide/rewind, party growth and perks, Paradox 6–10, district/callback variety. Earlier F1–F4 and ultimate sound/cut-in checks remain useful where not yet judged. Automated victories do not establish fun.
- `[owner]` Play the hidden `?chronicle=1` prototype before expanding it. Six chapters, two meters, five agendas, the core-card selection and twist bank exist; see `docs/plans/2026-11-04-chronicle-ch1-slice.md`. Next implementation depends on the verdict; do not rebuild those completed pieces.
- `[manual, optional]` English tone read, SFX/ultimate cue listening and trailer review. New Sea music needs explicit paid Lyria approval.

## Contest readiness

- Re-check Devpost for a Gemini / Google Cloud challenge on **2026-12-01** (a matching contest can pull W2 ahead). Roadmap: `docs/plans/2026-10-24-global-showcase-2026.md`.
- `[owner]` Choose public-repository scope, contest and deadline; publish/submit only with authorization. Drafts: `docs/contest/devpost-en.md`, `pitch-en.md`, `architecture-en.md`, `blog-and-cfp-en.md`. Existing showcase video covers an earlier feature set.
- `[owner, paid]` Vertex evaluation of procedural-event output; local-model results do not prove current Vertex quality. Batch voice generation likewise needs explicit ElevenLabs approval.

## After real-player evidence

- Review production GM outcomes, auth/rate-limit errors, daily push jobs and Crashlytics. The 2026-10-13 traffic observation in older docs is historical, not a current audience count.
- Diagnose reported defects and tune balance only from measured paths. Compare identical seeds and record companion/system usage; do not treat an assisted UI win as balance evidence.
- Extend districts/events/companion arcs only when player repetition or missing coverage justifies it; the old six-district and six-companion counts are obsolete.

## On hold: paid Play / Signal+

- `docs/play-store.md`, `docs/online.md`: owner account/merchant setup, contact details, signing, device release checks and license-tester purchase through `/plan`. Purchase verification remains fake-API tested only; RTDN is not implemented.
- Firebase Auth deletion permission remains an owner-controlled IAM task. Verify actual production permission before changing it.
- Play Games Services follows the Play account. Verify provider pricing before changing GM allowance assumptions.

## Agent operations

- Work on `main`; `1.0` preserves the old runtime. Retired branch commits have a local Git bundle backup; old worktree files were retained in detached-HEAD worktrees (see latest log).
- No unattended `[auto:*]` seeds are queued. New seeds must target the 2.0 tree; held-out 1.x experiments remain historical.

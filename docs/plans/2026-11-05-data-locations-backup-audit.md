# Data locations, provider logging and backup evidence — 2026-11-05

D7 follow-up to the [Play data/reviewer audit](2026-11-05-play-data-and-review-audit.md). Read-only configuration inspection at 13:45–13:49 UTC; no application records, model prompts, database queries, dumps, restores, paid inference, credentials output or cloud changes. This is scoped engineering evidence, not a completed privacy review.

## Verified runtime and configuration

| Component | Current evidence | What it does not establish |
|---|---|---|
| Cloud Run | `mythos-api` in `us-central1`; `00185-yev` still receives 100% traffic | The region of every downstream provider |
| Game database | Live `DATABASE_URL` uses PostgreSQL, a `neon.tech` host and `sslmode=require`; matches the locally configured deployment target. Only provider/region/TLS-mode facts were retained, never the URL, user or password | A database connection test, certificate-verification mode, actual backup configuration or restore success |
| Neon database region | Live connection hostname contains `us-east-1.aws.neon.tech`. Neon documents this segment as the project region: AWS N. Virginia. This is connection-configuration evidence, not a Console/API project inventory | Geography of every provider support/log/backup copy or a verified recovery window |
| Gemini endpoint | Live `MODEL=gemini-3.8-flash`, Vertex enabled, no `GEMINI_LOCATION`, `GOOGLE_CLOUD_LOCATION=us-central1`. Executing the resolver from deployed source `505ccff` yields **global**; current resolver is byte-identical | US-only inference, measured request routing or a model call in this audit |
| Vertex request/response logging | Authenticated GET of `global / google / gemini-3.8-flash :fetchPublisherModelConfig` returned 404 `NOT_FOUND`, explicitly naming missing `PublisherModelConfig`. Official docs define this as no configuration and default-disabled request/response logging | An abuse-monitoring exemption, all-project/model logging status, provider zero retention or deletion of historical exports |
| Cloud Logging | Fresh list: global `_Default` active, 30 days; `_Required` active, locked, 400 days | Regional storage residency, organization-level sinks or retention outside these buckets |

Neon [region identification](https://neon.com/docs/introduction/regions) explicitly documents hostname/Console/API methods. Google [endpoint guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations) distinguishes endpoint choice from residency guarantees. The scoped 404 interpretation follows [request/response logging configuration](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/request-response-logging).

Artifacts: `outputs/data-location-audit/runtime.json`, `vertex-logging.json`, `log-buckets.json`; read-only helpers in that directory. Cloud SQL inventory failed and is not evidence that no Cloud SQL resources exist. The live service's configured database provider is independently established by its connection configuration.

## Provider statements, separate from measured project behavior

- Firebase says Authentication processes data in US data centers; Crashlytics and Cloud Messaging are global services. Its retention statements are service-specific: Auth removal may take up to 180 days after deletion starts; Crashlytics retains reports/identifiers for 90 days before removal starts. FCM installation-ID deletion and registration-token deletion are different operations. Existing app off behavior deletes the registration token, not the shared installation ID. These are provider statements and app-code boundaries, not measured backend erasure times. [Firebase privacy information](https://firebase.google.com/support/privacy).
- Vertex request/response logging is only one retention path. No project contract or abuse-monitoring exemption was obtained. The app's `models.generate_content` path has no explicit Search/Maps grounding, explicit content-cache creation or Interactions API call; that source finding does not establish provider zero retention. Keep the existing qualified policy language. [Google retention conditions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention).
- Neon exposes a project-specific history window for instant restore/Time Travel. Published plan defaults are not evidence of this project's current value. Snapshots, other branches, external dumps and deleted-project recovery have separate scopes; do not infer that deleting current rows erases all copies at once. [History window](https://neon.com/docs/postgres/backup-restore/history-window), [project recovery](https://neon.com/docs/manage/projects#recover-a-deleted-project).

## Remaining backup/restore acceptance

No Neon API authentication is present in the task environment/repo settings and no Neon connector is available. Browser discovery reported unavailable browser access; native Chrome inspection returned `cgWindowNotFound`. No login, key creation or permission expansion was attempted. The owner was asked for non-secret Console facts only; no answer has been received at this checkpoint.

| Needed evidence | Exact next action | State |
|---|---|---|
| Actual project/production branch match, region and history window | In the matching Neon project, confirm Overview region and Settings → Postgres → History window; record time, current value and plan without copying connection credentials | Missing; region has hostname evidence only |
| Separate copies | Inventory existing snapshots, non-production branches containing production data, external dump jobs and their destinations/retention/access | Missing; no conclusion that copies are absent |
| Achievable restore point | Record the actual available recovery interval and selected point; do not substitute the configured maximum or plan default | Missing |
| Restore acceptance | After operator authorization, restore only into a separately isolated target, with production writes/notifications/GM/schedulers disabled; validate known sample integrity and elapsed recovery time before considering promotion | Not executed; may create billable resources and expose copied user data |
| Deletion preservation after restore | Define how already accepted account deletions and expired AI reports are reconciled before a restored target receives traffic; approve the exact reconciliation scope | Missing; no claim that restoring older data preserves later deletions |
| Public retention statement | Reconcile actual copy lifetimes and deletion procedure with the policy and Data safety submission; verify deployed wording after publication | Pending facts and publication |

The existing policy draft already names Neon and avoids blanket US-only processing or immediate all-copy deletion. No policy runtime change was required. The Devpost draft's stale Cloud SQL claim was corrected to Neon PostgreSQL, with Google services and the external database listed separately. Production behavior and Android candidate identity are unchanged.

Next independent task: D6 Android diagnostics toggle/pending-report acceptance without sending a crash report. D7 stays partially open for Neon Console facts, contracts and restore evidence; signing/contact/reviewer/account deletion and physical/Play-signed acceptance remain separate gates.

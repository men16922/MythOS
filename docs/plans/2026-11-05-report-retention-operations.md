# Independent AI-report retention job

Date: 2026-11-05. Data-audit item **D3** in [the Play audit](2026-11-05-play-data-and-review-audit.md). Local implementation and isolated PostgreSQL verification are complete; **no production purge or scheduler has been installed**. The current service still prunes on new report insertion. The public policy draft describes that limitation until scheduled execution is verified.

## Executable contract

The existing application image packages `mythos_v2.report_retention`; build a new image containing this module before configuring a job. The live `505ccff` image does not contain it. Run as a one-shot job, independent of HTTP traffic and Cloud Run service scale-to-zero. An in-process timer cannot guarantee retention while that service is suspended.

- Requires an explicitly supplied `DATABASE_URL`. No `.env` loading, default database, in-memory fallback, schema creation or public maintenance endpoint.
- Default: read-only transaction, count reports with `created_at < database now() - 90 days`. `--apply`: delete matching rows in one transaction. UTC session, 10-second connection timeout, 5-second lock timeout, 60-second statement timeout. A failed transaction rolls back.
- Only `v2_gm_reports` is touched. Output is JSON with `action`, `retention_days`, `expired_reports`; no report text, user data or connection details. The count means eligible rows in dry-run and actually deleted rows in apply.
- Exit codes: `0` success, `1` database failure, `2` missing configuration/invalid arguments. Failures never masquerade as an empty successful purge. Re-running apply is idempotent.

With the intended database injected securely into the process environment (never paste a connection string into Git, logs or shell history):

```bash
# Local checkout; first inspect counts, then explicitly apply only to the approved target.
PYTHONPATH=src .venv/bin/python -m mythos_v2.report_retention
PYTHONPATH=src .venv/bin/python -m mythos_v2.report_retention --apply

# Application container command override for a scheduled job:
python -m mythos_v2.report_retention --apply
```

## Proposed production wiring — owner/operator gate

Use a Cloud Run Job named `mythos-report-retention` in `us-central1`, on a verified new image digest. Configure **one task / parallelism 1**, a five-minute task timeout and at most three retries. Inject the approved database secret; do not put its plaintext value in a generated job manifest or command. Use an execution identity with only the needed secret/database access. No IAM grants or secret creation are performed by this plan.

First deploy the job **without `--apply`** and inspect a successful count-only execution. Once the target and deletion scope have been approved, add `--apply` and run once. Then follow [Cloud Run scheduled execution](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule), using Cloud Scheduler with authenticated Cloud Run Jobs execution (not an unauthenticated app route), proposed `0 3 * * *` / UTC. This is a daily cleanup target, so expired rows can remain until the next successful run; do not promise exact deletion at the 90-day instant. Scheduler invoker permissions and any billing impact require operator review before activation.

Monitor job failures and a missing successful run for more than 26 hours. An execution success and the JSON row count are required evidence; a scheduler definition alone proves nothing. Retrying after failure is safe. Purged report bodies cannot be restored by rolling back code; backups and any restoration/re-purge policy need separate approval and documentation.

The production DB is Neon PostgreSQL, with `us-east-1` in the configured hostname; Cloud Run is in `us-central1`. [D7 audit](2026-11-05-data-locations-backup-audit.md) records the evidence and missing recovery-window/copy inventory. Before any restore is promoted, reconcile previously accepted account deletions and expired reports on the isolated restored target; current-row purge alone does not prove historical-copy erasure. No restore or production purge was performed.

## Acceptance record

| Requirement | Evidence | State |
| --- | --- | --- |
| Missing DB fails; default is dry-run; error output hides driver detail | `tests/test_report_retention.py::CommandTest` | Passed locally |
| No new report needed; old rows deleted; 90-day boundary ±5 minutes; recent/future rows and saves preserved | Isolated PostgreSQL 16 test schema; `outputs/report-retention-tests.txt` | Passed locally |
| Repeat apply returns zero; CLI uses configured DB; missing schema fails without creating tables | Same isolated integration suite | Passed locally |
| Target DB, approved image digest and secret reference | Operator configuration review | Missing |
| Production dry-run, approved apply, next scheduled run with no new reports | Job execution ids + count-only output | Missing; no production rows accessed/deleted |
| Failure alert and missed-run detection; backup/restoration policy | Operator runbook + monitored evidence | Missing |
| Public wording matches actual cadence | Policy release + external rendered check | Pending scheduling/deployment |

For repeatable local QA, set `MYTHOS_RETENTION_TEST_DATABASE_URL` to an **isolated disposable PostgreSQL database**, then run `PYTHONPATH=src .venv/bin/python -m unittest discover -s tests -p test_report_retention.py`. The integration tests create and drop their own uniquely named schemas and never use the ordinary `DATABASE_URL` implicitly. They skip without the dedicated QA variable. Do not point them at operational data.

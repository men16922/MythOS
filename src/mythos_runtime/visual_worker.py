"""Long-running worker that consumes async visual jobs from Redis and runs FLUX.

Run alongside the app (e.g. `make visual-worker` in a second terminal). The worker
keeps the FLUX pipeline warm via `mythos_image_agent.pipeline_cache`, so after the
first job each image is just inference time. It publishes a heartbeat so the runtime
only enqueues async jobs when a live worker exists (otherwise it falls back to
synchronous generation).

    python -m mythos_runtime.visual_worker
"""

from __future__ import annotations

import argparse
import signal

from mythos_memory.postgres_store import PostgresMythOSStore
from mythos_runtime.observability import get_logger
from mythos_runtime.visual_queue import VisualJobQueue
from mythos_runtime.visual_service import (
    FilesystemStorageAdapter,
    MinIOStorageAdapter,
    VisualGenerationRequest,
    VisualGenerationResult,
    VisualService,
)


def process_job(job: dict, store: PostgresMythOSStore) -> VisualGenerationResult:
    request = VisualGenerationRequest(**job["request"])
    storage = (
        MinIOStorageAdapter() if job.get("storage_kind") == "minio" else FilesystemStorageAdapter()
    )
    service = VisualService(storage=storage, store=store)
    # generate() sees request.asset_id, flags the row `processing`, then writes
    # the final succeeded/failed status to the same asset row.
    return service.generate(request)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="MythOS async visual generation worker.")
    parser.add_argument(
        "--poll-timeout",
        type=int,
        default=5,
        help="Seconds to block waiting for a job before refreshing the heartbeat.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logger = get_logger("mythos.visual.worker")
    queue = VisualJobQueue()
    if not queue.is_available():
        print(f"Redis not reachable at {queue.url}; cannot start visual worker.")
        return 1

    # Single-instance guard: refuse to start if another worker already holds the slot,
    # so we never run two FLUX-loading workers at once (memory thrash).
    if not queue.acquire_worker_slot():
        print("another visual worker is already running (lock held); exiting.")
        return 0

    def _request_stop(signum: int, _frame: object) -> None:
        raise KeyboardInterrupt(f"signal {signum}")

    signal.signal(signal.SIGTERM, _request_stop)

    store = PostgresMythOSStore()
    print(f"visual worker started; consuming '{queue.url}' (Ctrl-C to stop)")
    try:
        while True:
            queue.beat()
            job = queue.dequeue(timeout=args.poll_timeout)
            if job is None:
                continue
            asset_id = job.get("asset_id")
            try:
                result = process_job(job, store)
                logger.info(
                    "visual job processed",
                    extra={"asset_id": asset_id, "status": result.status},
                )
                print(f"  job {asset_id} -> {result.status}")
            except Exception as exc:  # keep the worker alive across job failures
                logger.error(
                    "visual job failed",
                    extra={"asset_id": asset_id, "status": "failed", "error": str(exc)},
                )
                print(f"  job {asset_id} -> error: {exc}")
            finally:
                # A FLUX job can outlast the lock TTL; re-assert the slot right after.
                queue.beat()
    except KeyboardInterrupt:
        print("\nvisual worker stopped")
        return 0
    finally:
        queue.release_worker_slot()
        store.close()
        PostgresMythOSStore.close_pool(timeout=0.2)
        queue.close()


if __name__ == "__main__":
    raise SystemExit(main())

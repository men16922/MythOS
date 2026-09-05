"""Entry point: run the MythOS FastAPI adapter with uvicorn.

python -m mythos_api            # or: mythos-api
MYTHOS_API_HOST / MYTHOS_API_PORT override the bind address.
"""

from __future__ import annotations

import os


def main() -> None:
    import uvicorn

    from mythos_runtime.observability import configure_logging

    # Set up the structured JSON logger on the "mythos" tree so the runtime's INFO
    # logs actually reach the console — narration/streaming events ("narrative
    # streaming finished" latency, "token streaming pipeline finished") and timed()
    # spans. Without this the "mythos" logger has no handler and propagates to the
    # root logger (default WARNING), silently swallowing them. MYTHOS_LOG_LEVEL=DEBUG
    # for verbose; defaults to INFO.
    configure_logging()
    host = os.getenv("MYTHOS_API_HOST", "127.0.0.1")
    port = int(os.getenv("MYTHOS_API_PORT", "8000"))
    # Keep uvicorn/websockets at INFO regardless of MYTHOS_LOG_LEVEL. Driving uvicorn
    # to DEBUG floods the console with one ">> TEXT '{"type":"token",...}'" frame log
    # per streamed token. MYTHOS_LOG_LEVEL controls only our own "mythos" structured
    # logs (set above via configure_logging); the finished scene narration is logged
    # once at INFO (session._commit_scene), so the final sentence shows without spam.
    uvicorn.run("mythos_api.app:create_app", host=host, port=port, factory=True, log_level="info")


if __name__ == "__main__":
    main()

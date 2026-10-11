"""Entry point: run the Mythos 2.0 web server with uvicorn.

python -m mythos_api            # or: mythos-api
MYTHOS_API_HOST / MYTHOS_API_PORT override the bind address.
"""

from __future__ import annotations

import os


def main() -> None:
    import uvicorn

    from mythos_v2.log import configure_logging

    # Structured JSON logs on the "mythos" tree (MYTHOS_LOG_LEVEL, default INFO); without a handler they
    # would propagate to the root logger (WARNING) and vanish.
    configure_logging()
    host = os.getenv("MYTHOS_API_HOST", "127.0.0.1")
    port = int(os.getenv("MYTHOS_API_PORT", "8000"))
    # uvicorn stays at INFO; MYTHOS_LOG_LEVEL only drives our own "mythos" logs.
    uvicorn.run("mythos_api.app:create_app", host=host, port=port, factory=True, log_level="info")


if __name__ == "__main__":
    main()

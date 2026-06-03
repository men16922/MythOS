"""Entry point: run the MythOS FastAPI adapter with uvicorn.

    python -m mythos_api            # or: mythos-api
    MYTHOS_API_HOST / MYTHOS_API_PORT override the bind address.
"""

from __future__ import annotations

import os


def main() -> None:
    import uvicorn

    host = os.getenv("MYTHOS_API_HOST", "127.0.0.1")
    port = int(os.getenv("MYTHOS_API_PORT", "8000"))
    uvicorn.run("mythos_api.app:create_app", host=host, port=port, factory=True)


if __name__ == "__main__":
    main()

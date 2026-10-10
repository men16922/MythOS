"""Mythos 2.0 ("Signal Run") backend: save blobs + AI GM under ``/api/v2``.

The game itself is client-side TypeScript (``src/mythos_ui/src/v2``); this package
only persists the browser's JSON (``store``) and voices the GM (``gm`` + ``llm``).
``api.create_v2_router`` is mounted by ``mythos_api.app.create_app``.
"""

from mythos_v2.api import V2Settings, create_v2_router

__all__ = ["V2Settings", "create_v2_router"]

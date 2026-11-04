"""scripts/dev/verify_preview.py: PASS only when health, google sign-in and the committed bundle all match."""

import contextlib
import importlib.util
import io
import json
import threading
import unittest
import unittest.mock
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "verify_preview", ROOT / "scripts/dev/verify_preview.py"
)
assert SPEC and SPEC.loader
vp = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(vp)


def serve(auth: str, bundle: bytes, stale_chunk: bool = False):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/assets/"):
                f = vp.ASSETS / self.path[len("/assets/") :]
                body = f.read_bytes() if f.is_file() else None
                if body is not None and stale_chunk and f.suffix == ".js":
                    body = b"old chunk"
                self.send_response(200 if body is not None else 404)
                self.end_headers()
                self.wfile.write(body or b"")
                return
            routes = {
                "/api/health": json.dumps({"status": "ok"}).encode(),
                "/api/v2/health": json.dumps({"status": "ok"}).encode(),
                "/api/v2/config": json.dumps({"auth": auth}).encode(),
                "/app.js": bundle,
            }
            body = routes.get(self.path)
            self.send_response(200 if body is not None else 404)
            self.end_headers()
            self.wfile.write(body or b"")

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class VerifyPreviewTest(unittest.TestCase):
    def run_against(self, auth: str, bundle: bytes, stale_chunk: bool = False) -> int:
        server = serve(auth, bundle, stale_chunk)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        argv = ["verify_preview.py", "--url", f"http://127.0.0.1:{server.server_port}"]
        with (
            contextlib.redirect_stdout(io.StringIO()),
            unittest.mock.patch("sys.argv", argv),
        ):
            return int(vp.main())

    def test_all_matching_passes(self):
        self.assertEqual(self.run_against("google", vp.BUNDLE.read_bytes()), 0)

    def test_open_auth_fails(self):
        self.assertEqual(self.run_against("open", vp.BUNDLE.read_bytes()), 1)

    def test_stale_bundle_fails(self):
        self.assertEqual(self.run_against("google", b"old bundle"), 1)

    def test_same_loader_but_stale_code_chunk_fails(self):
        # app.js identical, a code chunk old: the content-only deploy case the loader check alone misses.
        self.assertEqual(self.run_against("google", vp.BUNDLE.read_bytes(), stale_chunk=True), 1)


if __name__ == "__main__":
    unittest.main()

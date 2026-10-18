"""Server-side daily replay check (``mythos_v2.replay``): the bundled verifier re-runs a real recorded daily
(produced by ``src/v2/ui/replay/sample.cli.ts``) and marks the leaderboard entry. Needs ``node`` ≥ 22.6 (it runs
the TypeScript sample directly); skipped otherwise. No network."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from mythos_v2 import replay
from mythos_v2.api import V2Settings, create_v2_router
from mythos_v2.auth import AuthConfig
from mythos_v2.store import MemoryV2Store

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "src" / "mythos_ui"
DAY = "2026-10-18"
NOW = datetime(2026, 10, 18, 3, 0, tzinfo=UTC)  # 12:00 KST


def _node_ok() -> bool:
    node = shutil.which("node")
    if not node or not replay.VERIFIER.exists():
        return False
    out = subprocess.run([node, "--version"], capture_output=True, text=True, check=False).stdout
    major, minor = (int(x) for x in out.strip().lstrip("v").split(".")[:2])
    return (major, minor) >= (22, 6)


NODE_OK = _node_ok()


def _sample() -> dict[str, Any]:
    out = subprocess.run(
        ["node", "src/v2/ui/replay/sample.cli.ts", DAY, "2"],
        cwd=UI,
        capture_output=True,
        text=True,
        check=True,
        timeout=120,
    )
    sample: dict[str, Any] = json.loads(out.stdout)
    # Self-play has no wall clock (secs 0); the API wants secs >= 1 or none, and replays never check it.
    sample["result"].pop("secs", None)
    return sample


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(
        create_v2_router(
            store_factory=MemoryV2Store,
            llm_factory=lambda: None,
            settings=V2Settings(),
            auth=AuthConfig(mode="open", project_id="demo-mythos"),
            now=lambda: NOW,
        )
    )
    return TestClient(app)


class ReplayOffTest(unittest.TestCase):
    def test_nothing_to_check_is_none(self) -> None:
        self.assertIsNone(replay.verify(None, {}, DAY))
        with mock.patch.dict(os.environ, {"MYTHOS_REPLAY_VERIFY": "off"}):
            self.assertIsNone(replay.verify({"v": 1}, {}, DAY))
        with mock.patch.dict(os.environ, {"MYTHOS_NODE": "no-such-node-binary"}):
            self.assertIsNone(replay.verify({"v": 1}, {}, DAY))


@unittest.skipUnless(
    NODE_OK, "needs node >= 22.6 and src/mythos_v2/replay_verify.mjs (make frontend-build)"
)
class ReplayVerifyTest(unittest.TestCase):
    sample: dict[str, Any]

    @classmethod
    def setUpClass(cls) -> None:
        cls.sample = _sample()

    def test_real_log_verifies_and_an_inflated_claim_does_not(self) -> None:
        log, result = self.sample["replay"], self.sample["result"]
        self.assertIs(replay.verify(log, result, DAY), True)
        self.assertIs(replay.verify(log, {**result, "kills": result["kills"] + 3}, DAY), False)
        self.assertIs(replay.verify({**log, "steps": log["steps"][:-1]}, result, DAY), False)
        self.assertIs(replay.verify(log, result, "2026-10-17"), False)

    def test_submit_marks_the_board_entry(self) -> None:
        client = _client()
        headers = {"X-Player-Id": "player_000000000001"}
        body = {"name": "Ghost", "result": self.sample["result"], "replay": self.sample["replay"]}
        out = client.put(f"/api/v2/daily/{DAY}", headers=headers, json=body)
        self.assertEqual(out.status_code, 200, out.text)
        self.assertIs(out.json()["verified"], True)
        board = client.get(
            f"/api/v2/daily/{DAY}", params={"archetype": "ghost"}, headers=headers
        ).json()
        self.assertIs(board["entries"][0]["verified"], True)
        cheat = {**body, "result": {**body["result"], "kills": body["result"]["kills"] + 9}}
        other = {"X-Player-Id": "player_000000000002"}
        out = client.put(f"/api/v2/daily/{DAY}", headers=other, json=cheat)
        self.assertIs(out.json()["verified"], False)


if __name__ == "__main__":
    unittest.main()

"""Unit tests for the FastAPI adapter (P3 Web UI decoupling, first slice).

Uses Starlette's TestClient with an in-memory store injected via FastAPI's
dependency override, so no Postgres or Ollama is required. The narrative path
runs in fallback mode (canned scenes); combat uses the deterministic fallback
encounter, mirroring tests/test_combat_server.py.
"""

from __future__ import annotations

import sys
import unittest
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from test_session_combat import _InMemoryStore, _seed_loop

from mythos_api.app import _find_asset, _terminal_visual_frame, create_app
from mythos_api.serializers import (
    _resolve_inventory,
    memory_overview_to_dict,
    snapshot_to_dict,
)
from mythos_api.service import get_service, get_storage_adapter
from mythos_core import AssetRecord, Choice, LoopPhase, LoopState, PlayerProfile, Scene
from mythos_runtime.options import MemoryOverview, RuntimeSnapshot
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import VisualGenerationResult


def _asset(asset_id: str, status: str, storage_uri: str, loop_id: str = "loop_x") -> AssetRecord:
    return AssetRecord(
        asset_id=asset_id,
        scene_id="scene_x",
        loop_id=loop_id,
        provider="flux_local_mps",
        model_id="m",
        prompt="p",
        seed=1,
        width=8,
        height=8,
        steps=1,
        storage_uri=storage_uri,
        metadata={},
        created_at=datetime(2026, 6, 3, tzinfo=UTC),
        status=status,
    )


def _client(store: _InMemoryStore) -> TestClient:
    app = create_app()

    def _override() -> Iterator[RuntimeSessionService]:
        yield RuntimeSessionService(store, director=None)

    app.dependency_overrides[get_service] = _override
    return TestClient(app)


class ApiHealthTest(unittest.TestCase):
    def test_health_ok(self) -> None:
        client = _client(_InMemoryStore())
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class ApiSerializerTest(unittest.TestCase):
    def test_resolve_inventory_accepts_table_form_equipment(self) -> None:
        inventory = _resolve_inventory(
            {
                "scenario_id": "neo-seoul",
                "_inventory": [
                    {"item_id": "signal_blade", "quantity": 1, "equipped": True},
                    {"item_id": "nanopatch", "quantity": 2, "equipped": False},
                ],
            }
        )

        by_id = {item["id"]: item for item in inventory}
        self.assertEqual(by_id["signal_blade"]["kind"], "equipment")
        self.assertEqual(by_id["signal_blade"]["slot"], "weapon")
        self.assertEqual(by_id["signal_blade"]["stats"], {"strength": 2})
        self.assertTrue(by_id["signal_blade"]["equipped"])
        self.assertEqual(by_id["nanopatch"]["count"], 2)


class ApiRelationshipSerializerTest(unittest.TestCase):
    """Lock the relationship-exposure contract produced by seeds L/M/N.

    The runtime accumulates companion affection into live ``loop.state``
    ("relationships") and carries it across loops via
    ``meta_progression["relationships"]``. The serializers must surface both so
    a frontend gauge has data to read; this guards against a future state-field
    filter silently dropping the affection payload (the dead-data failure mode
    that motivated seed L in the first place).
    """

    def _snapshot(self, state: dict[str, Any]) -> RuntimeSnapshot:
        now = datetime(2026, 6, 16, tzinfo=UTC)
        return RuntimeSnapshot(
            player=PlayerProfile(
                player_id="p1",
                display_name="당신",
                created_at=now,
                updated_at=now,
                traits={"archetype": "비접속자 (Ghost)"},
            ),
            loop=LoopState(
                loop_id="loop_p1",
                player_id="p1",
                seed="seed_p1",
                phase=LoopPhase.EXPLORE,
                location_id="loc",
                stability=70,
                tension=20,
                started_at=now,
                state=state,
            ),
            scene=Scene(
                scene_id="scene_1",
                loop_id="loop_p1",
                turn_index=3,
                title="회랑",
                location="loc",
                narration="세린이 곁에 선다.",
                choices=[Choice("c1", "함께 간다", "interact")],
                visual_brief="",
                created_at=now,
            ),
            assets=[],
        )

    def test_snapshot_surfaces_live_relationships(self) -> None:
        snap = self._snapshot({"relationships": {"se_rin": 3, "kai": 1}})
        payload = snapshot_to_dict(snap)
        self.assertEqual(payload["state"]["relationships"], {"se_rin": 3, "kai": 1})

    def test_snapshot_without_relationships_omits_key(self) -> None:
        # An untouched loop has no affection yet; the serializer must not
        # fabricate the field, so the gauge can render an empty state.
        payload = snapshot_to_dict(self._snapshot({}))
        self.assertNotIn("relationships", payload["state"])

    def test_memory_overview_surfaces_cross_loop_relationships(self) -> None:
        overview = MemoryOverview(
            world_archives=[],
            narrative_shards=[],
            novelty_notes=[],
            meta_progression={"insight": 7, "relationships": {"se_rin": 5}},
        )
        payload = memory_overview_to_dict(overview)
        self.assertEqual(
            payload["meta_progression"]["relationships"], {"se_rin": 5}
        )


class ApiStaticClientTest(unittest.TestCase):
    def test_root_serves_poc_client(self) -> None:
        client = _client(_InMemoryStore())
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("API PoC", response.text)

    def test_app_js_is_served(self) -> None:
        client = _client(_InMemoryStore())
        response = client.get("/app.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("loops/stream", response.text)
        # combat is playable: the client drives the combat action endpoint.
        self.assertIn("/api/v1/combat/action", response.text)

    def test_api_route_not_shadowed_by_static_mount(self) -> None:
        # The catch-all static mount must not intercept /api/v1 routes.
        client = _client(_InMemoryStore())
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class ApiScenariosTest(unittest.TestCase):
    def test_scenarios_lists_archetypes(self) -> None:
        client = _client(_InMemoryStore())
        response = client.get("/api/v1/scenarios")
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()["scenarios"]
        ids = {s["id"] for s in scenarios}
        self.assertIn("neo-seoul", ids)
        neo = next(s for s in scenarios if s["id"] == "neo-seoul")
        self.assertTrue(neo["name"])
        self.assertTrue(neo["archetypes"])
        self.assertTrue(neo["archetypes"][0]["name"])
        self.assertIn("endings", neo)


class ApiNarrativeFlowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)

    def test_connect_creates_player(self) -> None:
        response = self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["player_id"], "player_api")
        self.assertEqual(body["display_name"], "테스터")

    def test_begin_loop_returns_snapshot(self) -> None:
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        response = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_api", "fallback": True},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["loop_id"].startswith("loop_"))
        # The fallback first scene advances CONNECT -> EXPLORE on apply.
        self.assertEqual(body["phase"], "explore")
        self.assertIn("active_scene", body)
        self.assertIn("narration", body["active_scene"])
        self.assertIsInstance(body["active_scene"]["choices"], list)
        self.assertIn("stakes_summary", body["active_scene"])
        self.assertIn("axis_label", body["active_scene"]["choices"][0])
        self.assertIn("result_preview", body["active_scene"]["choices"][0])

    def test_choose_advances_snapshot(self) -> None:
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        begin = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_api", "fallback": True},
        ).json()
        loop_id = begin["loop_id"]
        first_choice = begin["active_scene"]["choices"][0]["choice_id"]

        response = self.client.post(
            "/api/v1/loops/choose",
            json={"loop_id": loop_id, "choice_id": first_choice, "fallback": True},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["loop_id"], loop_id)
        self.assertGreaterEqual(body["active_scene"]["turn_index"], 1)
        self.assertIn("choice_result", body["active_scene"])
        self.assertIsInstance(body["active_scene"]["choice_result"]["summary"], str)

    def test_begin_loop_missing_player_is_not_found(self) -> None:
        response = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "ghost", "fallback": True},
        )
        self.assertEqual(response.status_code, 404)


def _drain_to_snapshot(ws: Any) -> dict[str, Any]:
    frame = ws.receive_json()
    while frame["type"] == "token":
        frame = ws.receive_json()
    return cast(dict[str, Any], frame)


class ApiStreamTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_ws"},
        )

    def test_begin_streams_token_then_snapshot(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            first = ws.receive_json()
            self.assertEqual(first["type"], "token")
            self.assertTrue(first["content"])
            snapshot = _drain_to_snapshot(ws)
            self.assertEqual(snapshot["type"], "snapshot")
            self.assertTrue(snapshot["data"]["loop_id"].startswith("loop_"))

    def test_choose_streams_on_same_socket(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            begin = _drain_to_snapshot(ws)
            loop_id = begin["data"]["loop_id"]
            choice_id = begin["data"]["active_scene"]["choices"][0]["choice_id"]

            ws.send_json(
                {"event": "choose", "loop_id": loop_id, "choice_id": choice_id, "fallback": True}
            )
            advanced = _drain_to_snapshot(ws)
            self.assertEqual(advanced["data"]["loop_id"], loop_id)
            self.assertGreaterEqual(advanced["data"]["active_scene"]["turn_index"], 1)

    def test_unknown_event_returns_error(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "nope"})
            frame = ws.receive_json()
            self.assertEqual(frame["type"], "error")

    def test_begin_missing_player_returns_error(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "ghost", "fallback": True})
            frame = ws.receive_json()
            self.assertEqual(frame["type"], "error")


class _FakeStorage:
    """Storage adapter stub that signs s3 URIs without hitting boto3/MinIO."""

    def presigned_url(self, storage_uri: str, expires_in: int = 600) -> str:
        if not storage_uri.startswith("s3://"):
            return storage_uri
        return f"https://signed.example/{storage_uri[len('s3://') :]}?ttl={expires_in}"


class ApiAssetResolveTest(unittest.TestCase):
    def test_non_s3_uri_passes_through(self) -> None:
        # Real adapter, but non-s3 input returns early without any boto3 call.
        client = _client(_InMemoryStore())
        response = client.post(
            "/api/v1/assets/resolve",
            json={"storage_uri": "/tmp/outputs/scene.png"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["url"], "/tmp/outputs/scene.png")

    def test_malformed_s3_uri_is_bad_request(self) -> None:
        client = _client(_InMemoryStore())
        response = client.post(
            "/api/v1/assets/resolve",
            json={"storage_uri": "s3://bucket-only"},
        )
        self.assertEqual(response.status_code, 400)

    def test_s3_uri_is_presigned(self) -> None:
        app = create_app()
        app.dependency_overrides[get_storage_adapter] = lambda: _FakeStorage()
        client = TestClient(app)
        response = client.post(
            "/api/v1/assets/resolve",
            json={"storage_uri": "s3://mythos-assets/images/p/l/s.png", "expires_in": 120},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["expires_in"], 120)
        self.assertTrue(body["url"].startswith("https://signed.example/"))
        self.assertIn("ttl=120", body["url"])


class VisualStatusTest(unittest.TestCase):
    def test_succeeded_result_signs_url(self) -> None:
        result = VisualGenerationResult(
            asset=_asset("asset_1", "succeeded", "s3://mythos-assets/i/s.png"),
            status="succeeded",
            storage_uri="s3://mythos-assets/i/s.png",
            error=None,
        )
        frame = _terminal_visual_frame(cast(Any, _FakeStorage()), result)
        assert frame is not None
        self.assertEqual(frame["status"], "succeeded")
        self.assertEqual(frame["asset_id"], "asset_1")
        self.assertTrue(frame["url"].startswith("https://signed.example/"))

    def test_failed_result_has_no_url(self) -> None:
        result = VisualGenerationResult(
            asset=_asset("asset_2", "failed", ""),
            status="failed",
            storage_uri="",
            error="backend down",
        )
        frame = _terminal_visual_frame(cast(Any, _FakeStorage()), result)
        assert frame is not None
        self.assertEqual(frame["status"], "failed")
        self.assertNotIn("url", frame)

    def test_pending_result_is_in_flight(self) -> None:
        result = VisualGenerationResult(
            asset=_asset("asset_3", "pending", ""),
            status="pending",
            storage_uri="",
            error=None,
        )
        self.assertIsNone(_terminal_visual_frame(cast(Any, _FakeStorage()), result))

    def test_find_asset_by_id(self) -> None:
        asset = _asset("asset_4", "succeeded", "s3://b/k.png", loop_id="loop_find")

        class _AssetStore:
            def list_assets(self, loop_id: str) -> list[AssetRecord]:
                return [asset] if loop_id == "loop_find" else []

        class _Svc:
            store = _AssetStore()

        service = cast(RuntimeSessionService, _Svc())
        found = _find_asset(service, "loop_find", "asset_4")
        self.assertIsNotNone(found)
        assert found is not None
        self.assertEqual(found.asset_id, "asset_4")
        self.assertIsNone(_find_asset(service, "loop_find", "missing"))


class ApiCombatFlowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)
        self.loop_id = _seed_loop(self.store, "player_combat", "비접속자 (Ghost)")

    def test_combat_begin_returns_active_payload(self) -> None:
        response = self.client.post(
            "/api/v1/combat/begin",
            json={"loop_id": self.loop_id, "encounter_id": "patrol_ambush"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertIn("radar", body["combat"])
        self.assertFalse(body["combat"]["finished"])

    def test_combat_action_applies_skill(self) -> None:
        self.client.post(
            "/api/v1/combat/begin",
            json={"loop_id": self.loop_id, "encounter_id": "patrol_ambush"},
        )
        response = self.client.post(
            "/api/v1/combat/action",
            json={"loop_id": self.loop_id, "action": {"type": "skill", "skill_id": "packet_shot"}},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertIn("combat", body)


class ApiParityEndpointsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_test"},
        )
        self.begin_resp = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_test", "fallback": True},
        ).json()
        self.loop_id = self.begin_resp["loop_id"]

    def test_get_memory_overview(self) -> None:
        response = self.client.get("/api/v1/memory", params={"player_id": "player_test"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("narrative_shards", body)
        self.assertIn("run_summaries", body)

    def test_save_slots_flow(self) -> None:
        # 1. Get initial slots
        response = self.client.get("/api/v1/save-slots", params={"player_id": "player_test"})
        self.assertEqual(response.status_code, 200)
        slots_before = response.json()["slots"]
        self.assertEqual(len(slots_before), 1)
        self.assertNotEqual(slots_before[0]["label"], "테스트 수동 저장")

        # 2. Make a manual save slot
        save_resp = self.client.post(
            "/api/v1/save-slots",
            json={"loop_id": self.loop_id, "label": "테스트 수동 저장"},
        )
        self.assertEqual(save_resp.status_code, 200)
        saved_slot = save_resp.json()
        self.assertEqual(saved_slot["loop_id"], self.loop_id)
        self.assertEqual(saved_slot["label"], "테스트 수동 저장")

        # 3. Verify slot list has the updated slot
        response = self.client.get("/api/v1/save-slots", params={"player_id": "player_test"})
        self.assertEqual(response.status_code, 200)
        slots_after = response.json()["slots"]
        self.assertEqual(len(slots_after), 1)
        self.assertEqual(slots_after[0]["label"], "테스트 수동 저장")

    def test_get_runs(self) -> None:
        response = self.client.get("/api/v1/runs", params={"player_id": "player_test"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("runs", body)


class ApiSkillTreeTest(unittest.TestCase):
    def setUp(self) -> None:
        from mythos_runtime.progression import MetaProgression, _meta_progression_memory

        self.store = _InMemoryStore()
        self.client = _client(self.store)
        self.client.post(
            "/api/v1/auth/connect",
            json={
                "display_name": "테스터",
                "player_id": "player_skill",
                "archetype": "비접속자 (Ghost)",
            },
        )
        self.store.save_player_memory(
            _meta_progression_memory(
                MetaProgression(
                    player_id="player_skill",
                    scenario_id="neo-seoul",
                    unlocked_skills=["overload_strike"],
                    insight_points=5,
                )
            )
        )

    def test_skill_tree_reports_actions(self) -> None:
        response = self.client.get(
            "/api/v1/players/player_skill/skills",
            params={"scenario_id": "neo-seoul"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["insight_points"], 5)
        nodes = {n["id"]: n for n in body["skills"]}
        self.assertEqual(nodes["overload_strike"]["status"], "unlocked")
        self.assertEqual(nodes["overload_strike"]["action"], "learn")
        self.assertEqual(nodes["signal_step"]["status"], "learned")

    def test_learn_skill_spends_insight_and_persists(self) -> None:
        response = self.client.post(
            "/api/v1/players/player_skill/skills/learn",
            json={"scenario_id": "neo-seoul", "skill_id": "overload_strike"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["insight_points"], 2)
        nodes = {n["id"]: n for n in body["skills"]}
        self.assertEqual(nodes["overload_strike"]["status"], "learned")

        # Persisted: a fresh tree read reflects the spend.
        again = self.client.get(
            "/api/v1/players/player_skill/skills",
            params={"scenario_id": "neo-seoul"},
        ).json()
        self.assertEqual(again["insight_points"], 2)

    def test_learn_locked_skill_is_bad_request(self) -> None:
        response = self.client.post(
            "/api/v1/players/player_skill/skills/learn",
            json={"scenario_id": "neo-seoul", "skill_id": "covering_noise"},
        )
        self.assertEqual(response.status_code, 400)


class ApiScenarioGatingTest(unittest.TestCase):
    def _scenarios(self, client: TestClient, player_id: str | None = None) -> dict[str, Any]:
        params = {"player_id": player_id} if player_id else None
        body = client.get("/api/v1/scenarios", params=params).json()
        return {s["id"]: s for s in body["scenarios"]}

    def test_tutorial_always_unlocked_others_gated_for_new_player(self) -> None:
        client = _client(_InMemoryStore())
        scenarios = self._scenarios(client)
        self.assertTrue(scenarios["neo-seoul"]["unlocked"])
        self.assertFalse(scenarios["glass-library"]["unlocked"])
        self.assertTrue(scenarios["glass-library"]["unlock_hint"])

    def test_completing_tutorial_unlocks_others(self) -> None:
        from mythos_runtime.progression import MetaProgression, _meta_progression_memory

        store = _InMemoryStore()
        client = _client(store)
        client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_gate"},
        )
        store.save_player_memory(
            _meta_progression_memory(
                MetaProgression(player_id="player_gate", scenario_id="neo-seoul", runs_completed=1)
            )
        )
        scenarios = self._scenarios(client, "player_gate")
        self.assertTrue(scenarios["glass-library"]["unlocked"])


if __name__ == "__main__":
    unittest.main()

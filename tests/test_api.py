"""Unit tests for the FastAPI adapter (P3 Web UI decoupling, first slice).

Uses Starlette's TestClient with an in-memory store injected via FastAPI's
dependency override, so no Postgres or Ollama is required. The narrative path
runs in fallback mode (canned scenes); combat uses the deterministic fallback
encounter, mirroring tests/test_combat_server.py.
"""

from __future__ import annotations

import os
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
from mythos_core import AssetRecord, Choice, LoopPhase, LoopState, PlayerProfile, Scene, WorldMemory
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


class ApiClientConfigTest(unittest.TestCase):
    """DEFAULT_BGM_ON env → /api/v1/client-config (owner 2026-07-12: server-driven
    BGM default; production true, `make api` exports false)."""

    def test_bgm_defaults_on(self) -> None:
        os.environ.pop("DEFAULT_BGM_ON", None)
        client = _client(_InMemoryStore())
        response = client.get("/api/v1/client-config")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"default_bgm_on": True})

    def test_bgm_env_false_wins(self) -> None:
        os.environ["DEFAULT_BGM_ON"] = "false"
        try:
            client = _client(_InMemoryStore())
            self.assertEqual(
                client.get("/api/v1/client-config").json(), {"default_bgm_on": False}
            )
        finally:
            os.environ.pop("DEFAULT_BGM_ON", None)

    def test_client_config_is_open_pre_invite(self) -> None:
        from mythos_api.invite import _is_gated_path

        self.assertFalse(_is_gated_path("/api/v1/client-config"))
        self.assertFalse(_is_gated_path("/api/v1/health"))
        self.assertTrue(_is_gated_path("/api/v1/scenarios"))


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


class RouteChoiceAxisSerializerTest(unittest.TestCase):
    """§3 2026-07-19: the value-axis chip on a junction (route:) choice must come
    from the destination node's real semantics, never the keyword heuristic.

    Measured failure: every stored junction label of the style-pair loops
    classified as "단서 찾기" (words like 데이터/단서/추적도 in titles and badges),
    including the rn4 anchor whose applied perspective was people-axis
    ``p_rescue`` — the UI promised evidence while the tally moved people.
    """

    def _state(self) -> dict[str, Any]:
        return {
            "flags": [],
            "_route_map": {
                "nodes": {
                    "rn_anchor": {
                        "id": "rn_anchor",
                        "type": "story",
                        "title": "데이터 소각로",
                        "default_perspective": "p_rescue",
                        "perspectives": [
                            {"id": "p_rescue", "axis": "people", "when": ["humanity_first"]},
                            {"id": "p_steal", "axis": "evidence", "when": ["insight_focus"]},
                        ],
                    },
                    "rn_clue": {"id": "rn_clue", "type": "clue", "title": "암호화된 흔적"},
                    "rn_patrol": {"id": "rn_patrol", "type": "patrol", "title": "순찰 우회로"},
                    "rn_market": {"id": "rn_market", "type": "market", "title": "환전 부스"},
                },
            },
        }

    def _serialize(self, choice_id: str, label: str) -> dict[str, Any]:
        from mythos_api.serializers import _choice_to_dict

        choice = Choice(choice_id=choice_id, label=label, intent="explore")
        return _choice_to_dict(choice, state=self._state())

    def test_anchor_destination_uses_selected_perspective_axis(self) -> None:
        # "데이터" in the label used to classify this as 단서 찾기 (data) while the
        # entry perspective (default p_rescue) tallies people.
        data = self._serialize("route:rn_anchor", "데이터 소각로(으)로 향한다 — 이야기가 크게 갈라지는 장면입니다.")
        self.assertEqual(data["axis"], "people")
        self.assertEqual(data["axis_label"], "사람 돕기")

    def test_anchor_destination_axis_follows_accumulated_flags(self) -> None:
        from mythos_api.serializers import _choice_to_dict

        state = self._state()
        state["flags"] = ["insight_focus"]
        choice = Choice(choice_id="route:rn_anchor", label="데이터 소각로(으)로 향한다", intent="explore")
        data = _choice_to_dict(choice, state=state)
        self.assertEqual(data["axis"], "data")
        self.assertEqual(data["axis_label"], "단서 찾기")

    def test_clue_destination_is_data_axis(self) -> None:
        data = self._serialize("route:rn_clue", "암호화된 흔적(으)로 향한다 — 기록과 단서를 찾아 진실에 가까워집니다.")
        self.assertEqual(data["axis"], "data")
        self.assertEqual(data["axis_label"], "단서 찾기")

    def test_patrol_badge_keywords_no_longer_leak_into_axis(self) -> None:
        # "추적도 +3" in the badge used to keyword-match 추적 → data.
        data = self._serialize(
            "route:rn_patrol", "순찰 우회로(으)로 향한다 — 감시망을 파고드는 지름길 · 위험 2 · 추적도 +3 ⚠"
        )
        self.assertEqual(data["axis"], "safety")
        self.assertEqual(data["axis_label"], "안전하게 가기")

    def test_axisless_destination_renders_no_chip(self) -> None:
        data = self._serialize("route:rn_market", "환전 부스(으)로 향한다 — 보급과 거래로 장비를 정비합니다.")
        self.assertNotIn("axis", data)
        self.assertNotIn("axis_label", data)
        self.assertNotIn("result_preview", data)
        self.assertEqual([s for s in data["stakes"] if s.startswith("가치축")], [])

    def test_director_choices_keep_keyword_heuristic(self) -> None:
        data = self._serialize("choice_1", "무너진 서가에서 기록을 뒤진다")
        self.assertEqual(data["axis"], "data")
        self.assertEqual(data["axis_label"], "단서 찾기")

    def test_interact_intent_alone_does_not_promise_rescue(self) -> None:
        # The `interact` fallback returned "people" whatever the choice did, so an
        # evasion action advertised "사람 돕기" (live EN evidence 2026-08-08). A
        # terminal, a door and a person are all interactions: the intent alone is
        # not evidence of an axis, so the label has to carry it.
        from mythos_api.serializers import _choice_axis

        # An evasion action under `interact` reads as evasion, not rescue...
        self.assertEqual(_choice_axis("Slip away down the service duct", "interact"), "safety")
        # ...and a signal-free label under `interact` promises nothing at all.
        self.assertIsNone(_choice_axis("Step toward the far end", "interact"))
        # The label still decides when it does carry a signal.
        self.assertEqual(_choice_axis("Help the wounded civilian up", "interact"), "people")

    def test_english_labels_are_classified(self) -> None:
        # The vocabulary was Korean-only, so on an EN loop nothing in the label
        # could match and every choice fell to the intent fallback — measured over
        # three banked EN arms, 96/98 labels came back "people" with intent
        # `interact`, and both choices in a scene always drew the same chip.
        from mythos_api.serializers import _choice_axis

        self.assertEqual(_choice_axis("Rescue the child from the stall", None), "people")
        self.assertEqual(_choice_axis("Decrypt the maintenance log", None), "data")
        self.assertEqual(_choice_axis("Hide in the drainage alcove", None), "safety")
        self.assertEqual(_choice_axis("Breach the sealed bulkhead", None), "control")

    def test_substring_cannot_decide_an_axis(self) -> None:
        # "ix" matched inside *Fix* and *Prefix*, so an observation choice was
        # advertised as control. ASCII keywords must stand alone.
        from mythos_api.serializers import _choice_axis

        self.assertNotEqual(_choice_axis("Fix the alley layout in your memory", None), "control")
        self.assertEqual(_choice_axis("Confront Administrator IX", None), "control")

    def test_unreadable_label_renders_no_chip(self) -> None:
        # No signal in the label is a real answer: the chip is a promise about
        # what the choice does, and an invented one is worse than none — the same
        # rule an axisless junction destination already follows.
        from mythos_api.serializers import _choice_axis

        self.assertIsNone(_choice_axis("Step through the archway", "explore"))

    def test_traversal_under_threat_is_safety(self) -> None:
        # The largest remaining gap after the 2026-08-09 EN fix: this scenario
        # phrases escape as a body moving through a gap, not as flee/evade/
        # retreat, and 47 such labels rendered no chip at all.
        from mythos_api.serializers import _choice_axis

        for label in (
            "Sprint through the blinding searchlight gaps during the calibration cycle",
            "Squeeze through the narrow exhaust vent before the door collapses",
            "Slide under the closing fire-door before it seals the exit",
            "Scramble up the wet bamboo scaffolding to the rooftops",
            "Leap over the guardrail into the dark drainage canal",
        ):
            self.assertEqual(_choice_axis(label, "interact"), "safety", label)

    def test_sabotage_and_choosing_the_fight_are_control(self) -> None:
        from mythos_api.serializers import _choice_axis

        for label in (
            "Overload the substation's auxiliary grid to blind the searchlights",
            "Sever the high-tension line to plunge the scaffolding into darkness",
            "Kick the rusted release mechanism with all your weight",
            "Prepare to ambush the leading Enforcer as it rounds the corner",
        ):
            self.assertEqual(_choice_axis(label, "interact"), "control", label)

    def test_evasion_still_wins_over_the_fight_it_evades(self) -> None:
        # `fight` is only safe to carry because safety is scanned before
        # control. If that order is ever swapped, avoiding a fight starts
        # advertising as choosing one.
        from mythos_api.serializers import _choice_axis

        self.assertEqual(_choice_axis("Avoid the fight and slip out the back", None), "safety")
        self.assertEqual(_choice_axis("Flee the fight through the vent", None), "safety")

    def test_plurals_are_their_own_keywords(self) -> None:
        # ASCII matching is word-bounded, so "civilian" never matched
        # "civilians". Two labels leading people to safety disagreed with each
        # other because of it — one read safety, the other nothing at all.
        from mythos_api.serializers import _choice_axis

        self.assertEqual(
            _choice_axis("Lead the survivors through the unpowered maintenance tunnels", None),
            "people",
        )
        self.assertEqual(
            _choice_axis("Lead the survivors through the pipes to evade the sweep", None),
            "people",
        )
        self.assertEqual(
            _choice_axis("Guide the civilians through the drainage pipes", None), "people"
        )

    def test_blending_into_a_crowd_is_still_evasion(self) -> None:
        # "crowd" is deliberately absent from the people axis: it is a place to
        # hide in, not someone to help. Re-pinned because the plural pass above
        # is exactly the change that would tempt someone to add it.
        from mythos_api.serializers import _choice_axis

        self.assertEqual(
            _choice_axis("Blend into the crowd of the night-market stalls to lose the drones", None),
            "safety",
        )

    def test_widening_did_not_take_terms_the_audit_rejected(self) -> None:
        # Each of these was measured against the banked arms and dropped
        # because it read a real label wrongly — see
        # docs/plans/2026-08-09-value-axis-vocabulary-coverage.md.
        from mythos_api.serializers import _choice_axis

        # "brace" as enduring, not imposing.
        self.assertIsNone(
            _choice_axis("Brace yourself against the wall and ride out the feedback loop", None)
        )
        # A theft the safety axis would have hidden behind "run".
        self.assertEqual(
            _choice_axis("Wrench the slate from her hands and run into the drainage system", None),
            "control",
        )
        # Drawing fire away *from the civilians* is not choosing a fight; it
        # stays unclassified here rather than being mislabelled control.
        self.assertNotEqual(
            _choice_axis("Draw your weapon and draw the drones' attention away from them", None),
            "control",
        )


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
        self.assertEqual(payload["meta_progression"]["relationships"], {"se_rin": 5})

    def test_memory_overview_resolves_cutscene_gallery(self) -> None:
        # Cross-loop unlocked ids (meta progression) → resolved gallery (image+body
        # for unlocked, locked stub for the rest) using real neo-seoul directives.
        overview = MemoryOverview(
            world_archives=[],
            narrative_shards=[],
            novelty_notes=[],
            meta_progression={
                "scenario_id": "neo-seoul",
                "unlocked_cutscenes": ["SERIN_FIRST_LIGHT"],
            },
        )
        gallery = memory_overview_to_dict(overview)["cutscene_gallery"]
        by_id = {g["id"]: g for g in gallery}
        self.assertIn("SERIN_FIRST_LIGHT", by_id)
        self.assertIn("SERIN_PROMISE", by_id)
        # unlocked → full content
        self.assertTrue(by_id["SERIN_FIRST_LIGHT"]["unlocked"])
        self.assertTrue(by_id["SERIN_FIRST_LIGHT"]["image"])
        self.assertTrue(by_id["SERIN_FIRST_LIGHT"]["body"])
        # locked → stub only (threshold visible, content withheld)
        self.assertFalse(by_id["SERIN_PROMISE"]["unlocked"])
        self.assertIsNone(by_id["SERIN_PROMISE"]["image"])
        self.assertEqual(by_id["SERIN_PROMISE"]["affection_required"], 4)

    def test_memory_overview_without_scenario_has_empty_gallery(self) -> None:
        overview = MemoryOverview(
            world_archives=[],
            narrative_shards=[],
            novelty_notes=[],
            meta_progression={"insight": 7},
        )
        self.assertEqual(memory_overview_to_dict(overview)["cutscene_gallery"], [])

    def test_memory_overview_uses_localized_companion_directives(self) -> None:
        overview = MemoryOverview(
            world_archives=[],
            narrative_shards=[],
            novelty_notes=[],
            meta_progression={"scenario_id": "neo-seoul", "unlocked_cutscenes": []},
        )
        gallery = memory_overview_to_dict(overview, language="en")["cutscene_gallery"]
        by_id = {entry["id"]: entry for entry in gallery}
        self.assertEqual(by_id["HAN_DEAD_CHANNEL"]["title"], "A Voice on the Dead Channel")
        self.assertEqual(by_id["KAI_COUNTING_STARS"]["title"], "The Machine That Counts Stars")


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
        self.assertTrue(neo["archetypes"][0]["play_hint"])
        self.assertIn("endings", neo)

    def test_scenarios_lang_en_localizes_prose(self) -> None:
        import re

        hangul = re.compile(r"[가-힣]")
        client = _client(_InMemoryStore())
        ko = client.get("/api/v1/scenarios").json()["scenarios"]
        en = client.get("/api/v1/scenarios?lang=en").json()["scenarios"]
        ko_neo = next(s for s in ko if s["id"] == "neo-seoul")
        en_neo = next(s for s in en if s["id"] == "neo-seoul")
        # EN: brief + session_intro prose + ending titles localized via the overlay.
        self.assertIn("WORLD: Neo-Seoul", en_neo["brief"])
        self.assertNotRegex(en_neo["brief"], hangul)
        en_intro = en_neo["ui_copy"]["session_intro"]
        ko_intro = ko_neo["ui_copy"]["session_intro"]
        self.assertNotRegex(str(en_intro["title"]), hangul)
        self.assertNotRegex(str(en_intro["cinematic_shots"][0]["body"]), hangul)
        # The language-neutral cinematic-shot `image` path must survive the overlay
        # merge (EN overlay has no image → must keep the KO/base path, not blank it).
        for i, shot in enumerate(en_intro["cinematic_shots"]):
            self.assertEqual(shot.get("image"), ko_intro["cinematic_shots"][i].get("image"))
            self.assertTrue(shot.get("image"))
        en_titles = " ".join(str(e["title"]) for e in en_neo["endings"])
        self.assertIn("Safe Refuge", en_titles)
        self.assertNotRegex(en_titles, hangul)
        # EN: scenario name + archetype name/attributes/starting_item localized.
        self.assertNotRegex(en_neo["name"], hangul)
        en_ghost = next(a for a in en_neo["archetypes"] if a["id"] == "ghost")
        self.assertEqual(en_ghost["name"], "Ghost")
        self.assertEqual(en_ghost["play_hint"], "Pick this if you want evasive movement and clue hunting.")
        self.assertNotRegex(" ".join(en_ghost["attributes"]), hangul)
        self.assertNotRegex(str(en_ghost["play_hint"]), hangul)
        self.assertNotRegex(str(en_ghost["starting_item"]), hangul)
        # Archetype ids stay identical across languages (combat join keys unchanged).
        self.assertEqual(
            [a["id"] for a in en_neo["archetypes"]],
            [a["id"] for a in ko_neo["archetypes"]],
        )
        # KO (default) unchanged — same structure, Korean prose preserved.
        self.assertRegex(ko_neo["brief"], hangul)
        self.assertRegex(str(ko_neo["ui_copy"]["session_intro"]["title"]), hangul)
        # Ending ids stay identical across languages (structure parity).
        self.assertEqual([e["id"] for e in en_neo["endings"]], [e["id"] for e in ko_neo["endings"]])

    def test_scenarios_lang_en_localizes_data(self) -> None:
        # The onboarding DATA (archetype unlock_hint, character name/role/keywords,
        # skill names) is glossary-localized at the serving boundary in EN.
        import re

        hangul = re.compile(r"[가-힣]")
        client = _client(_InMemoryStore())
        en = client.get("/api/v1/scenarios?lang=en").json()["scenarios"]
        ko = client.get("/api/v1/scenarios").json()["scenarios"]
        en_neo = next(s for s in en if s["id"] == "neo-seoul")
        ko_neo = next(s for s in ko if s["id"] == "neo-seoul")
        # Locked archetypes' unlock hints are English (no player => only ghost unlocked).
        locked_hints = [a["unlock_hint"] for a in en_neo["archetypes"] if a["unlock_hint"]]
        self.assertTrue(locked_hints)
        for hint in locked_hints:
            self.assertNotRegex(hint, hangul)
        # Scene-character portrait data (name/role/keywords) is English.
        self.assertTrue(en_neo["characters"])
        for c in en_neo["characters"]:
            self.assertNotRegex(str(c["name"]), hangul)
            self.assertNotRegex(str(c["role"]), hangul)
            self.assertNotRegex(" ".join(map(str, c.get("keywords", []))), hangul)
        se_rin = next((c for c in en_neo["characters"] if "Se-rin" in str(c["name"])), None)
        self.assertIsNotNone(se_rin)
        # KO unchanged — character names stay Korean by default.
        self.assertRegex(" ".join(str(c["name"]) for c in ko_neo["characters"]), hangul)


class ApiNarrativeFlowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)

    def test_favicon_returns_204_not_404(self) -> None:
        # AGY live-QA finding: the catch-all static mount 404'd /favicon.ico on
        # every page load; the explicit route now silences it cleanly.
        response = self.client.get("/favicon.ico")
        self.assertEqual(response.status_code, 204)

    def test_connect_creates_player(self) -> None:
        response = self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["player_id"], "player_api")
        self.assertEqual(body["display_name"], "테스터")

    def test_connect_is_idempotent_for_stable_player_id(self) -> None:
        # Closed-beta identity (Option B): a tester re-opening their invite URL
        # reconnects with the SAME derived player_id. Connect must upsert (not error)
        # and their existing save slots must remain reachable under that id.
        first = self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_stable"},
        )
        self.assertEqual(first.status_code, 200)
        begin = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_stable", "fallback": True},
        )
        loop_id = begin.json()["loop_id"]
        self.client.post(
            "/api/v1/save-slots",
            json={"loop_id": loop_id, "label": "checkpoint"},
        )
        # Reconnect with the same id (e.g. from a different browser): no error, same id.
        again = self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_stable"},
        )
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json()["player_id"], "player_stable")
        # The earlier save is still listed under the stable id.
        slots = self.client.get("/api/v1/save-slots?player_id=player_stable")
        self.assertEqual(slots.status_code, 200)
        loop_ids = [s["loop_id"] for s in slots.json()["slots"]]
        self.assertIn(loop_id, loop_ids)

    def test_save_slot_carries_character_and_thumbnail(self) -> None:
        # The save/load screen shows character + a representative thumbnail. The slot
        # captures display_name + archetype from the loop, and resolves a thumb_url
        # from the curated anchor image the player saw (free static /resources/ URL).
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "Runner", "player_id": "player_card", "archetype": "ghost"},
        )
        begin = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_card", "fallback": True},
        )
        loop_id = begin.json()["loop_id"]
        self.client.post("/api/v1/save-slots", json={"loop_id": loop_id, "label": "ch1"})
        slots = self.client.get("/api/v1/save-slots?player_id=player_card").json()["slots"]
        slot = next(s for s in slots if s["loop_id"] == loop_id)
        self.assertEqual(slot["display_name"], "Runner")
        self.assertTrue(slot["archetype"])  # archetype name captured from the loop
        # The neo-seoul opening is a curated anchor, so the slot gets a static thumb.
        if (slot.get("metadata") or {}).get("curated_image"):
            self.assertTrue(slot["thumb_url"].startswith("/resources/"))

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

    def test_duplicate_choice_from_old_scene_is_idempotent(self) -> None:
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "Retry", "player_id": "player_retry"},
        )
        begin = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_retry", "fallback": True},
        ).json()
        payload = {
            "loop_id": begin["loop_id"],
            "scene_id": begin["active_scene"]["scene_id"],
            "choice_id": begin["active_scene"]["choices"][0]["choice_id"],
            "fallback": True,
        }
        first = self.client.post("/api/v1/loops/choose", json=payload)
        retry = self.client.post("/api/v1/loops/choose", json=payload)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(
            retry.json()["active_scene"]["scene_id"],
            first.json()["active_scene"]["scene_id"],
        )
        self.assertEqual(
            retry.json()["active_scene"]["turn_index"],
            first.json()["active_scene"]["turn_index"],
        )

    def test_begin_loop_missing_player_is_not_found(self) -> None:
        response = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "ghost", "fallback": True},
        )
        self.assertEqual(response.status_code, 404)


def _drain_to_snapshot(ws: Any) -> dict[str, Any]:
    frame = ws.receive_json()
    # `loop_meta` (opening-variant announce) precedes tokens on a `begin` stream.
    while frame["type"] in ("token", "loop_meta"):
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

    def test_begin_streams_meta_then_token_then_snapshot(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            # The opening variant is announced up front — before the (slow)
            # first-scene generation — so the client intro reveals the correct
            # sequence immediately instead of timing out onto the default cut
            # and then swapping when the snapshot finally lands.
            meta = ws.receive_json()
            self.assertEqual(meta["type"], "loop_meta")
            self.assertEqual(meta["opening_variant"], "default")  # loop 1 is always default
            self.assertEqual(meta["runs_completed"], 0)
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

    def test_duplicate_stream_choice_returns_current_snapshot(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            begin = _drain_to_snapshot(ws)
            scene = begin["data"]["active_scene"]
            message = {
                "event": "choose",
                "loop_id": begin["data"]["loop_id"],
                "scene_id": scene["scene_id"],
                "choice_id": scene["choices"][0]["choice_id"],
                "fallback": True,
            }
            ws.send_json(message)
            advanced = _drain_to_snapshot(ws)
            ws.send_json(message)
            retry = _drain_to_snapshot(ws)
            self.assertEqual(retry["type"], "snapshot")
            self.assertEqual(
                retry["data"]["active_scene"]["scene_id"],
                advanced["data"]["active_scene"]["scene_id"],
            )

    def test_ping_returns_pong_without_entering_stream(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "ping"})
            frame = ws.receive_json()
            self.assertEqual(frame, {"type": "pong"})
            # The socket must remain usable for gameplay after a keepalive.
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            snapshot = _drain_to_snapshot(ws)
            self.assertEqual(snapshot["type"], "snapshot")

    def test_ping_between_turns_keeps_choose_working(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            begin = _drain_to_snapshot(ws)
            ws.send_json({"event": "ping"})
            self.assertEqual(ws.receive_json(), {"type": "pong"})
            ws.send_json(
                {
                    "event": "choose",
                    "loop_id": begin["data"]["loop_id"],
                    "choice_id": begin["data"]["active_scene"]["choices"][0]["choice_id"],
                    "fallback": True,
                }
            )
            advanced = _drain_to_snapshot(ws)
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

    def test_signing_failure_degrades_to_failed_frame(self) -> None:
        # Live regression (2026-07-05): a presign exception must not escape —
        # it would kill the WS stream that carries the narrative snapshot.
        class _BrokenStorage:
            def presigned_url(self, storage_uri: str, expires_in: int = 600) -> str:
                raise AttributeError("you need a private key to sign credentials.")

        result = VisualGenerationResult(
            asset=_asset("asset_5", "succeeded", "gs://mythos-assets/i/s.png"),
            status="succeeded",
            storage_uri="gs://mythos-assets/i/s.png",
            error=None,
        )
        frame = _terminal_visual_frame(cast(Any, _BrokenStorage()), result)
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

        # 3. A manual save is a NEW distinct slot (snapshot) alongside the per-loop
        # autosave bookmark — it must not overwrite it (2026-07-04: "세이브 하나뿐").
        response = self.client.get("/api/v1/save-slots", params={"player_id": "player_test"})
        self.assertEqual(response.status_code, 200)
        slots_after = response.json()["slots"]
        self.assertEqual(len(slots_after), 2)
        labels = {slot["label"] for slot in slots_after}
        self.assertIn("테스트 수동 저장", labels)
        manual = next(s for s in slots_after if s["label"] == "테스트 수동 저장")
        self.assertNotEqual(manual["slot_id"], slots_before[0]["slot_id"])

        # 4. Loading the manual slot restores + returns a playable snapshot.
        load_resp = self.client.post(
            "/api/v1/save-slots/load",
            json={"player_id": "player_test", "slot_id": manual["slot_id"]},
        )
        self.assertEqual(load_resp.status_code, 200)
        self.assertEqual(load_resp.json()["loop_id"], self.loop_id)

    def test_get_runs(self) -> None:
        response = self.client.get("/api/v1/runs", params={"player_id": "player_test"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("runs", body)

    def test_get_runs_localizes_legacy_ending_and_outcome_backfill(self) -> None:
        now = datetime(2026, 7, 29, tzinfo=UTC)
        loop = LoopState(
            loop_id="loop_legacy_ending",
            player_id="player_test",
            seed="seed_legacy",
            phase=LoopPhase.ENDED,
            location_id="ix_confrontation",
            stability=12,
            tension=97,
            started_at=now,
            ended_at=now,
            state={
                "scenario_id": "neo-seoul",
                "ending_id": "ending_erasure",
                "ending_label": "강제 최적화 (Forced Erasure)",
                "ending_narration": (
                    "모든 것이 하얗게 비워집니다. 당신이라는 버그는 수정되었고, "
                    "도시는 다시 완벽한 통계 속으로 침잠합니다. 하지만 어딘가에서, "
                    "작은 글리치가 다시 시작됩니다."
                ),
                "flags": ["incinerator_rescued", "trusted_se_rin"],
            },
        )
        self.store.save_loop(loop)
        self.store.save_world_memory(
            WorldMemory(
                memory_id="memory_legacy_ending",
                world_id="world_mythos",
                kind="run_summary",
                content={
                    "run_id": "run_loop_legacy_ending",
                    "loop_id": loop.loop_id,
                    "player_id": loop.player_id,
                    "scenario_id": "neo-seoul",
                    "started_at": now.isoformat(),
                    "ended_at": now.isoformat(),
                    "ending_id": "ending_erasure",
                    "ending_label": "강제 최적화 (Forced Erasure)",
                    "phase": "ended",
                    "turns": 61,
                    "summary": "루프는 combat_finished의 잔향을 남기고 접혔다.",
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            )
        )

        response = self.client.get(
            "/api/v1/runs",
            params={
                "player_id": "player_test",
                "scenario_id": "neo-seoul",
                "lang": "en",
            },
        )

        self.assertEqual(response.status_code, 200)
        run = next(
            item for item in response.json()["runs"] if item["loop_id"] == loop.loop_id
        )
        self.assertEqual(run["ending_label"], "Forced Erasure")
        self.assertIn("Everything empties into white.", run["ending_narration"])
        self.assertEqual(
            run["outcome"]["saved"],
            ["The unregistered civilians rescued from the incinerator"],
        )
        self.assertEqual(
            run["outcome"]["lost"],
            ["This loop's body and signal"],
        )
        self.assertEqual(
            run["outcome"]["carried"],
            [
                "The bond forged with Se-rin",
                "The small glitch that opens the next loop",
            ],
        )


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

    def test_disabled_scenario_stays_locked_even_after_tutorial(self) -> None:
        # CBT hold: glass-library carries ``unlock.disabled`` so it stays locked
        # (selectbox-disabled) even for a player who completed the tutorial.
        # When the scenario reopens, drop ``disabled`` from its unlock block and
        # flip this back to asserting the tutorial-completion unlock.
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
        self.assertFalse(scenarios["glass-library"]["unlocked"])
        self.assertTrue(scenarios["glass-library"]["unlock_hint"])


class InviteGateTest(unittest.TestCase):
    """MYTHOS_INVITE_KEYS gates /api/v1/* (except /health); unset → fully open."""

    def test_open_when_unset(self) -> None:
        from unittest import mock

        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_INVITE_KEYS", None)
            client = _client(_InMemoryStore())
            self.assertEqual(client.get("/api/v1/scenarios").status_code, 200)

    def test_gated_rest_requires_valid_key(self) -> None:
        from unittest import mock

        with mock.patch.dict(os.environ, {"MYTHOS_INVITE_KEYS": "alpha, beta"}):
            client = _client(_InMemoryStore())
            # health stays open
            self.assertEqual(client.get("/api/v1/health").status_code, 200)
            # no key → 401
            self.assertEqual(client.get("/api/v1/scenarios").status_code, 401)
            # valid key via header → 200
            self.assertEqual(
                client.get("/api/v1/scenarios", headers={"X-Invite-Key": "beta"}).status_code,
                200,
            )
            # valid key via query param → 200
            self.assertEqual(client.get("/api/v1/scenarios?invite=alpha").status_code, 200)
            # wrong key → 401
            self.assertEqual(
                client.get("/api/v1/scenarios", headers={"X-Invite-Key": "nope"}).status_code,
                401,
            )

    def test_verify_invite_probe(self) -> None:
        # The SPA gate screen probes /auth/verify-invite: 200 when open or key valid,
        # 401 when gated and the key is missing/invalid.
        from unittest import mock

        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_INVITE_KEYS", None)
            client = _client(_InMemoryStore())
            self.assertEqual(client.get("/api/v1/auth/verify-invite").status_code, 200)
        with mock.patch.dict(os.environ, {"MYTHOS_INVITE_KEYS": "alpha"}):
            client = _client(_InMemoryStore())
            self.assertEqual(client.get("/api/v1/auth/verify-invite").status_code, 401)
            ok = client.get("/api/v1/auth/verify-invite?invite=alpha")
            self.assertEqual(ok.status_code, 200)
            self.assertTrue(ok.json()["ok"])

    def test_verify_invite_is_admin_gates_dev_console(self) -> None:
        # is_admin drives the operator-only Dev Console: ONLY an admin key → true.
        # Plain tester key, and an ungated/keyless visitor, both → false (hidden).
        from unittest import mock

        with mock.patch.dict(
            os.environ, {"MYTHOS_INVITE_KEYS": "tester, owner", "MYTHOS_ADMIN_KEYS": "owner"}
        ):
            client = _client(_InMemoryStore())
            admin = client.get("/api/v1/auth/verify-invite", headers={"X-Invite-Key": "owner"})
            self.assertEqual(admin.status_code, 200)
            self.assertTrue(admin.json()["is_admin"])
            tester = client.get("/api/v1/auth/verify-invite", headers={"X-Invite-Key": "tester"})
            self.assertEqual(tester.status_code, 200)
            self.assertFalse(tester.json()["is_admin"])
        # Ungated/keyless (no admin keys) → not admin: Dev Console hidden by default.
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_INVITE_KEYS", None)
            os.environ.pop("MYTHOS_ADMIN_KEYS", None)
            client = _client(_InMemoryStore())
            self.assertFalse(client.get("/api/v1/auth/verify-invite").json()["is_admin"])

    def test_verify_invite_gated_flag_gates_boot_simulator(self) -> None:
        # `gated` tells the SPA whether the install runs a keyed beta: gated+non-admin
        # hides the boot combat simulator (real-loop creation burns the tester loop
        # cap — triage decision 2026-07-05). Keyless/open installs stay ungated so
        # local dev and QA tooling keep the simulator.
        from unittest import mock

        with mock.patch.dict(os.environ, {"MYTHOS_INVITE_KEYS": "tester"}):
            client = _client(_InMemoryStore())
            body = client.get(
                "/api/v1/auth/verify-invite", headers={"X-Invite-Key": "tester"}
            ).json()
            self.assertTrue(body["gated"])
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_INVITE_KEYS", None)
            client = _client(_InMemoryStore())
            self.assertFalse(client.get("/api/v1/auth/verify-invite").json()["gated"])

    def test_gated_websocket_requires_key(self) -> None:
        from unittest import mock

        from starlette.websockets import WebSocketDisconnect

        with mock.patch.dict(os.environ, {"MYTHOS_INVITE_KEYS": "alpha"}):
            client = _client(_InMemoryStore())
            with self.assertRaises(WebSocketDisconnect):
                with client.websocket_connect("/api/v1/loops/stream"):
                    pass
            # valid key connects (then close immediately)
            with client.websocket_connect("/api/v1/loops/stream?invite=alpha") as ws:
                ws.close()


class LoopCapTest(unittest.TestCase):
    """MYTHOS_MAX_LOOPS_PER_PLAYER caps new loops per player; unset/0 → unlimited."""

    def _connect_and_begin(self, client: TestClient) -> int:
        client.post("/api/v1/auth/connect", json={"display_name": "T", "player_id": "p_cap"})
        return int(
            client.post(
                "/api/v1/loops/begin", json={"player_id": "p_cap", "fallback": True}
            ).status_code
        )

    def test_unlimited_when_unset(self) -> None:
        from unittest import mock

        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_MAX_LOOPS_PER_PLAYER", None)
            client = _client(_InMemoryStore())
            self.assertEqual(self._connect_and_begin(client), 200)
            self.assertEqual(self._connect_and_begin(client), 200)  # 2nd begin fine

    def test_cap_blocks_extra_loops_with_429(self) -> None:
        from unittest import mock

        with mock.patch.dict(os.environ, {"MYTHOS_MAX_LOOPS_PER_PLAYER": "1"}):
            client = _client(_InMemoryStore())
            self.assertEqual(self._connect_and_begin(client), 200)  # 1st OK
            self.assertEqual(self._connect_and_begin(client), 429)  # 2nd capped

    def test_admin_key_exempt_from_cap(self) -> None:
        from unittest import mock

        from mythos_api.limits import loop_cap_exceeded, stable_player_id

        # cyrb53 parity with the SPA's stablePlayerId (cross-checked vs node).
        self.assertEqual(stable_player_id("admin-43dc07f266c2"), "player_1d34fcf029cd64")

        class _Svc:
            class store:
                @staticmethod
                def list_loops(_pid: str) -> list[int]:
                    return [0] * 999  # far over any cap

        with mock.patch.dict(
            os.environ,
            {"MYTHOS_ADMIN_KEYS": "admin-43dc07f266c2", "MYTHOS_MAX_LOOPS_PER_PLAYER": "1"},
        ):
            # The admin key's derived player_id is exempt; a normal player is capped.
            svc = cast(RuntimeSessionService, _Svc())
            self.assertFalse(loop_cap_exceeded(svc, stable_player_id("admin-43dc07f266c2")))
            self.assertTrue(loop_cap_exceeded(svc, "player_normaltester"))


class ApiEquipLangTest(unittest.TestCase):
    """Regression lock: /loops/{id}/equip returns localized snapshot per body.lang.

    The 2026-07-04 equip KO-leak fix (EquipRequest.lang) has no API-level
    regression test; this guards against re-introducing the bug where an EN
    session's equip toggle silently swapped the snapshot back to Korean.
    """

    def setUp(self) -> None:
        import re

        self.hangul = re.compile(r"[가-힣]")
        self.store = _InMemoryStore()
        self.client = _client(self.store)
        # Create a player and begin a fallback loop (seeds scenario_id + scene).
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "Tester", "player_id": "player_equip_lang"},
        )
        begin = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_equip_lang", "fallback": True},
        ).json()
        self.loop_id = begin["loop_id"]
        # Inject an equipment item into the loop's inventory so equip can toggle it.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        from dataclasses import replace

        new_state = {
            **(loop.state if isinstance(loop.state, dict) else {}),
            "_inventory": [{"item_id": "signal_blade", "quantity": 1, "equipped": False}],
        }
        self.store.save_loop(replace(loop, state=new_state))

    def test_equip_with_lang_en_returns_english_axis_labels(self) -> None:
        response = self.client.post(
            f"/api/v1/loops/{self.loop_id}/equip",
            json={"loop_id": self.loop_id, "item_id": "signal_blade", "lang": "en"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        # The equip response is a full snapshot; choices carry axis_label.
        choices = body["active_scene"]["choices"]
        self.assertTrue(choices, "fallback scene must have at least one choice")
        for choice in choices:
            # EN axis labels must not contain Hangul.
            self.assertNotRegex(
                choice["axis_label"],
                self.hangul,
                f"axis_label should be English but got: {choice['axis_label']}",
            )
        # stakes_summary (if present) should also be localized.
        stakes = body["active_scene"].get("stakes_summary") or []
        for s in stakes:
            self.assertNotRegex(str(s), self.hangul)

    def test_equip_with_default_lang_ko_returns_korean_axis_labels(self) -> None:
        response = self.client.post(
            f"/api/v1/loops/{self.loop_id}/equip",
            json={"loop_id": self.loop_id, "item_id": "signal_blade"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        choices = body["active_scene"]["choices"]
        self.assertTrue(choices)
        # Default (KO) axis labels must be Korean.
        for choice in choices:
            self.assertRegex(
                choice["axis_label"],
                self.hangul,
                f"axis_label should be Korean but got: {choice['axis_label']}",
            )

    def test_equip_en_inventory_item_is_equipped(self) -> None:
        # The item is actually toggled ON regardless of language.
        response = self.client.post(
            f"/api/v1/loops/{self.loop_id}/equip",
            json={"loop_id": self.loop_id, "item_id": "signal_blade", "lang": "en"},
        )
        self.assertEqual(response.status_code, 200)
        inventory = response.json()["inventory"]
        blade = next((i for i in inventory if i["id"] == "signal_blade"), None)
        self.assertIsNotNone(blade)
        assert blade is not None
        self.assertTrue(blade["equipped"])


class StorageBackendSelectionTest(unittest.TestCase):
    """The API asset-URL signer is env-driven so the GCP container honors
    MYTHOS_STORAGE_BACKEND (cloud deploy = gcs); default stays MinIO."""

    def test_gcs_backend_selected(self) -> None:
        import os
        from unittest import mock

        from mythos_api.service import get_storage_adapter
        from mythos_runtime.visual_service import GCSStorageAdapter, MinIOStorageAdapter

        with mock.patch.dict(os.environ, {"MYTHOS_STORAGE_BACKEND": "gcs"}):
            self.assertIsInstance(get_storage_adapter(), GCSStorageAdapter)
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_STORAGE_BACKEND", None)
            self.assertIsInstance(get_storage_adapter(), MinIOStorageAdapter)


if __name__ == "__main__":
    unittest.main()

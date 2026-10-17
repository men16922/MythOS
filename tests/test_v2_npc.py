"""Signal+ NPC talk (``mythos_v2.npc`` + ``POST /gm/talk`` mode ``npc``): personas, intent parsing, the keyword
fallback and the route — memory store + fake LLM, no network."""

from __future__ import annotations

import json
import unittest
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from test_v2_api import HEADERS, FakeDeleter, FakeLLM, FakeVerifier

from mythos_v2 import npc
from mythos_v2.api import V2Settings, create_v2_router
from mythos_v2.auth import AuthConfig
from mythos_v2.npcs import PERSONAS
from mythos_v2.store import MemoryV2Store

OPTIONS = [
    {"intent": "deceive", "label": "“전력공사 검침원입니다.”"},
    {"intent": "sneak", "label": "바리케이드를 피해 돌아간다"},
    {"intent": "leave", "label": "돌아선다"},
    {"intent": "deceive", "label": "duplicate intent is dropped"},
    {"intent": "hack_the_planet", "label": "unknown intents are dropped"},
]


class PersonaTest(unittest.TestCase):
    def test_every_persona_is_complete(self) -> None:
        self.assertIn("oh_gisa", PERSONAS)
        for npc_id, p in PERSONAS.items():
            self.assertRegex(npc_id, r"^[a-z][a-z0-9_]{0,31}$")
            for text in (p.name_ko, p.name_en, p.ko, p.en):
                self.assertTrue(text.strip(), npc_id)

    def test_only_known_npcs_are_valid(self) -> None:
        self.assertTrue(npc.valid_npc("sgt_yun"))
        self.assertFalse(npc.valid_npc("ix"))
        self.assertFalse(npc.valid_npc("Sgt_Yun"))


class IntentTest(unittest.TestCase):
    def test_open_intents_sanitises_and_dedupes(self) -> None:
        got = npc.open_intents(OPTIONS)
        self.assertEqual([i for i, _ in got], ["deceive", "sneak", "leave"])

    def test_reply_and_intent_from_json(self) -> None:
        intents = npc.open_intents(OPTIONS)
        raw = json.dumps(
            {"intent": "deceive", "reply": "검침원이라. 장비는 어디 두셨습니까?"},
            ensure_ascii=False,
        )
        reply, intent = npc.clean_npc_reply(raw, "sgt_yun", "ko", {}, intents)
        self.assertEqual(intent, "deceive")
        self.assertEqual(reply, "검침원이라. 장비는 어디 두셨습니까?")

    def test_an_intent_not_open_here_is_ignored(self) -> None:
        intents = npc.open_intents(OPTIONS)
        raw = json.dumps({"intent": "intimidate", "reply": "그건 협박입니까?"}, ensure_ascii=False)
        reply, intent = npc.clean_npc_reply(raw, "sgt_yun", "ko", {}, intents)
        self.assertIsNone(intent)
        self.assertIsNotNone(reply)

    def test_meta_talk_is_dropped(self) -> None:
        intents = npc.open_intents(OPTIONS)
        raw = json.dumps({"intent": "none", "reply": "As an AI language model I cannot."})
        reply, intent = npc.clean_npc_reply(raw, "sgt_yun", "en", {}, intents)
        self.assertIsNone(reply)
        self.assertIsNone(intent)
        self.assertEqual(
            npc.clean_npc_reply("not json", "sgt_yun", "en", {}, intents), (None, None)
        )

    def test_keyword_fallback_picks_only_open_intents(self) -> None:
        intents = npc.open_intents(OPTIONS)
        self.assertEqual(npc.fallback_intent("몰래 돌아갈게", intents), "sneak")
        self.assertEqual(npc.fallback_intent("I'm with the power company", intents), "deceive")
        self.assertEqual(
            npc.fallback_intent("give me money", intents), None
        )  # offer is not open here
        self.assertEqual(npc.fallback_intent("나중에 다시 올게", intents), "leave")

    def test_prompt_carries_persona_menu_and_message_but_no_client_persona(self) -> None:
        intents = npc.open_intents(OPTIONS)
        system, user = npc.npc_messages(
            "sgt_yun", "ko", {"district": "변전소 17", "node": "정지."}, [], "검침원입니다", intents
        )
        self.assertIn("윤 경사", system)
        self.assertIn(PERSONAS["sgt_yun"].ko[:20], system)
        self.assertIn("deceive", user)
        self.assertIn("검침원입니다", user)


def _client(llm: FakeLLM | None, **settings: Any) -> TestClient:
    app = FastAPI()
    app.include_router(
        create_v2_router(
            store_factory=MemoryV2Store,
            llm_factory=lambda: llm,
            settings=V2Settings(**settings),
            auth=AuthConfig(mode="open", project_id="demo-mythos", web_config=None),
            verifier=FakeVerifier(),
            account_deleter=FakeDeleter(),
        )
    )
    return TestClient(app)


def _body(message: str = "전력공사 검침원입니다.", **extra: Any) -> dict[str, Any]:
    return {
        "mode": "npc",
        "lang": "ko",
        "npc": "sgt_yun",
        "message": message,
        "options": OPTIONS[:3],
        "context": {"district": "변전소 17", "node": "정지. 용무를 말씀하십시오."},
        **extra,
    }


class NpcRouteTest(unittest.TestCase):
    def test_the_model_answers_and_names_the_intent(self) -> None:
        llm = FakeLLM(
            json.dumps(
                {"intent": "deceive", "reply": "검침원이라. 장비는 차에 두셨습니까?"},
                ensure_ascii=False,
            )
        )
        res = _client(llm).post("/api/v2/gm/talk", headers=HEADERS, json=_body())
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(
            res.json(),
            {"text": "검침원이라. 장비는 차에 두셨습니까?", "source": "llm", "intent": "deceive"},
        )
        self.assertEqual(llm.calls[0]["json"], npc.NPC_JSON_SCHEMA)

    def test_no_model_falls_back_to_a_keyword_intent_and_no_line(self) -> None:
        res = _client(None).post("/api/v2/gm/talk", headers=HEADERS, json=_body("몰래 지나갈게"))
        self.assertEqual(res.json(), {"text": "", "source": "fallback", "intent": "sneak"})

    def test_unknown_npc_or_empty_message_is_rejected(self) -> None:
        client = _client(FakeLLM("{}"))
        self.assertEqual(
            client.post("/api/v2/gm/talk", headers=HEADERS, json=_body(npc="ix")).status_code, 422
        )
        self.assertEqual(
            client.post("/api/v2/gm/talk", headers=HEADERS, json=_body("   ")).status_code, 422
        )

    def test_rate_limit_still_applies(self) -> None:
        llm = FakeLLM(json.dumps({"intent": "leave", "reply": "가십시오."}, ensure_ascii=False))
        client = _client(llm, gm_per_minute=1)
        self.assertEqual(
            client.post("/api/v2/gm/talk", headers=HEADERS, json=_body()).json()["source"], "llm"
        )
        self.assertEqual(
            client.post("/api/v2/gm/talk", headers=HEADERS, json=_body()).json()["source"],
            "fallback",
        )


if __name__ == "__main__":
    unittest.main()

"""Enemy taunts (``mythos_v2.taunt`` + ``POST /api/v2/gm/talk`` mode ``enemy``): server-side personas only,
cleaned model lines, and an empty fallback (the client shows its own authored line first)."""

from __future__ import annotations

import re
import unittest
from pathlib import Path
from typing import Any, ClassVar

from fastapi import FastAPI
from fastapi.testclient import TestClient

from mythos_v2 import taunt
from mythos_v2.api import V2Settings, create_v2_router
from mythos_v2.auth import AuthConfig
from mythos_v2.store import MemoryV2Store

HEADERS = {"X-Player-Id": "player_0123456789abcd"}


class FakeLLM:
    name = "fake"

    def __init__(self, reply: str = "", *, exc: Exception | None = None) -> None:
        self.reply = reply
        self.exc = exc
        self.calls: list[dict[str, Any]] = []

    def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        self.calls.append({"system": system, "user": user, "max_tokens": max_tokens})
        if self.exc is not None:
            raise self.exc
        return self.reply


def _client(*, llm: FakeLLM | None = None) -> TestClient:
    app = FastAPI()
    app.include_router(
        create_v2_router(
            store_factory=MemoryV2Store,
            llm_factory=lambda: llm,
            settings=V2Settings(),
            auth=AuthConfig(),
        )
    )
    return TestClient(app)


class TauntPromptTest(unittest.TestCase):
    def test_every_persona_and_trigger_builds_a_prompt(self) -> None:
        for enemy, persona in taunt.ENEMY_PERSONAS.items():
            for trigger in taunt.TAUNT_TRIGGERS:
                for lang in ("ko", "en"):
                    with self.subTest(enemy=enemy, trigger=trigger, lang=lang):
                        system, user = taunt.taunt_messages(enemy, trigger, lang)
                        self.assertIn(persona.name[lang], system)
                        self.assertIn(persona.voice[lang], system)
                        self.assertIn(persona.name[lang], user)
        self.assertTrue(taunt.valid_speaker("haetae"))
        self.assertFalse(taunt.valid_speaker("scrap_drone"))

    def test_clean_strips_label_quotes_numbers_and_meta(self) -> None:
        self.assertEqual(
            taunt.clean_taunt('해태: "해산하십시오. 반복합니다, 해산하십시오."', "haetae", "ko"),
            "해산하십시오. 반복합니다, 해산하십시오.",
        )
        # A sentence quoting game numbers is dropped; nothing usable left → None.
        self.assertIsNone(taunt.clean_taunt("체력 12 남았다.", "trooper_captain", "ko"))
        self.assertIsNone(taunt.clean_taunt("I am an AI language model.", "incinerator", "en"))


class ClientPoolSyncTest(unittest.TestCase):
    def test_client_authored_pool_and_server_personas_name_the_same_enemies(self) -> None:
        source = (
            Path(__file__).resolve().parents[1] / "src/mythos_ui/src/v2/content/taunts.ts"
        ).read_text(encoding="utf-8")
        body = source[source.index("export const TAUNTS") :]
        client_ids = set(re.findall(r"^  (\w+): \{$", body, re.MULTILINE))
        self.assertEqual(client_ids, set(taunt.ENEMY_PERSONAS))


class TauntEndpointTest(unittest.TestCase):
    BODY: ClassVar[dict[str, Any]] = {
        "mode": "enemy",
        "lang": "ko",
        "enemy": "echo_eater",
        "moment": "hurt",
        "context": {"act": 2},
    }

    def test_llm_line_is_cleaned_and_logged(self) -> None:
        llm = FakeLLM('잔향 포식자: "아파… 그래도 네 기억은 따뜻하겠지."')
        res = _client(llm=llm).post("/api/v2/gm/talk", headers=HEADERS, json=self.BODY)
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(
            res.json(), {"text": "아파… 그래도 네 기억은 따뜻하겠지.", "source": "llm"}
        )
        self.assertIn("삼킨 기억들의 목소리", llm.calls[0]["system"])
        self.assertEqual(llm.calls[0]["max_tokens"], taunt.TAUNT_MAX_TOKENS)

    def test_misses_return_an_empty_fallback(self) -> None:
        for llm in (FakeLLM(exc=RuntimeError("down")), FakeLLM(""), None):
            with self.subTest(llm=llm.reply if llm else None):
                res = _client(llm=llm).post("/api/v2/gm/talk", headers=HEADERS, json=self.BODY)
                self.assertEqual(res.json(), {"text": "", "source": "fallback"})

    def test_only_known_speakers_and_triggers(self) -> None:
        client = _client(llm=FakeLLM("무엇이든."))
        for patch in (
            {"enemy": "scrap_drone"},
            {"enemy": ""},
            {"moment": None},
            {"moment": "gloat"},
        ):
            with self.subTest(patch=patch):
                res = client.post("/api/v2/gm/talk", headers=HEADERS, json={**self.BODY, **patch})
                self.assertEqual(res.status_code, 422, res.text)


if __name__ == "__main__":
    unittest.main()

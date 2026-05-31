from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from mythos_core import Scene

from .schemas import ScenePayload


@dataclass(frozen=True)
class NarrativeStreamEvent:
    kind: Literal["text", "final", "fallback"]
    text: str = ""
    scene: Scene | None = None
    payload: ScenePayload | None = None
    outcome: str | None = None


class NarrationFieldExtractor:
    """Incrementally extracts the JSON string value for the `narration` field."""

    def __init__(self) -> None:
        self._buffer = ""
        self._started = False
        self._done = False
        self._escaped = False

    def feed(self, chunk: str) -> list[str]:
        if self._done or not chunk:
            return []
        self._buffer += chunk
        if not self._started and not self._start_value():
            return []
        return self._consume_value()

    def _start_value(self) -> bool:
        key_index = self._buffer.find('"narration"')
        if key_index < 0:
            self._buffer = self._buffer[-32:]
            return False
        colon_index = self._buffer.find(":", key_index)
        if colon_index < 0:
            self._buffer = self._buffer[key_index:]
            return False
        quote_index = self._buffer.find('"', colon_index)
        if quote_index < 0:
            self._buffer = self._buffer[key_index:]
            return False
        self._buffer = self._buffer[quote_index + 1 :]
        self._started = True
        return True

    def _consume_value(self) -> list[str]:
        emitted: list[str] = []
        index = 0
        while index < len(self._buffer):
            char = self._buffer[index]
            if self._escaped:
                emitted.append(_decode_escape(char))
                self._escaped = False
            elif char == "\\":
                self._escaped = True
            elif char == '"':
                self._done = True
                self._buffer = self._buffer[index + 1 :]
                return ["".join(emitted)] if emitted else []
            else:
                emitted.append(char)
            index += 1
        self._buffer = ""
        return ["".join(emitted)] if emitted else []


def _decode_escape(char: str) -> str:
    escapes = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        "b": "\b",
        "f": "\f",
        "n": "\n",
        "r": "\r",
        "t": "\t",
    }
    return escapes.get(char, char)

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


class PlainTextStoryExtractor:
    """Incrementally extracts only the narrative text between [SCENE] and [TITLE] from raw storyteller stream.
    
    Strips the '[SCENE]' header and blocks any text once '[TITLE]' or other headers start,
    preventing technical markups and choices from leaking to the player's narration UI.
    """

    def __init__(self) -> None:
        self._buffer = ""
        self._active = False
        self._finished = False

    def feed(self, chunk: str) -> str:
        if self._finished or not chunk:
            return ""
        self._buffer += chunk

        # 1. Wait for [SCENE] tag to start active streaming
        if not self._active:
            if "[SCENE]" in self._buffer:
                parts = self._buffer.split("[SCENE]", 1)
                self._buffer = parts[1]
                self._active = True
            else:
                # If no [SCENE] is seen but the buffer gets unusually long without bracket,
                # fallback activate to avoid complete silence on prompt variations.
                if len(self._buffer) > 30 and "[" not in self._buffer:
                    self._active = True
                else:
                    return ""

        # 2. Check for stop headers indicating end of narration
        headers = ["[TITLE]", "[LOCATION]", "[CHOICES]", "[SCENE]"]
        for header in headers:
            if header in self._buffer:
                self._finished = True
                narration_part = self._buffer.split(header, 1)[0]
                return narration_part.rstrip()

        # 3. Stream characters with a safety margin to prevent split-header leaks (e.g. "[TI" ... "TLE]")
        safety_margin = 15
        if len(self._buffer) > safety_margin:
            to_yield = self._buffer[:-safety_margin]
            self._buffer = self._buffer[-safety_margin:]
            return to_yield
        return ""

    def flush(self) -> str:
        if self._finished or not self._active:
            return ""
        # Check if a header ended up in the final safety margin
        headers = ["[TITLE]", "[LOCATION]", "[CHOICES]"]
        for header in headers:
            if header in self._buffer:
                return self._buffer.split(header, 1)[0].rstrip()
        return self._buffer.rstrip()

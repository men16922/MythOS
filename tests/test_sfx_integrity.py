"""SFX reference <-> file integrity (overnight QA seed 2026-07-07).

Every `sfx_*` id referenced anywhere the client can play it — scenario.json,
the serializer cue layer, SPA sources, and the served static bundle — must map
to a real WAV file in `resources/neo-seoul/audio/sfx/`. `useAudio.playSfx`
resolves `/resources/<scenario>/audio/sfx/<key>.wav` and fails *silently*
(console note only), so a typo'd or deleted file is an invisible regression;
this test makes it a red gate instead.
"""

import re
import unittest

from mythos_runtime.scenario import PROJECT_ROOT

SFX_DIR = PROJECT_ROOT / "resources" / "neo-seoul" / "audio" / "sfx"
SPA_SRC_DIR = PROJECT_ROOT / "src" / "mythos_ui" / "src"
SERIALIZERS = PROJECT_ROOT / "src" / "mythos_api" / "serializers.py"
CUES_HOOK = SPA_SRC_DIR / "hooks" / "usePresentationCues.ts"
STATIC_BUNDLE = PROJECT_ROOT / "src" / "mythos_api" / "static" / "app.js"
SCENARIO_JSON = PROJECT_ROOT / "resources" / "neo-seoul" / "scenario.json"

SFX_ID_RE = re.compile(r"\bsfx_[a-z0-9_]+\b")


def _referenced_sfx_ids() -> dict[str, set[str]]:
    """All distinct `sfx_*` ids per source group (raw text scan)."""
    groups: dict[str, set[str]] = {}
    spa_ids: set[str] = set()
    for path in sorted(SPA_SRC_DIR.rglob("*.ts")) + sorted(SPA_SRC_DIR.rglob("*.tsx")):
        spa_ids |= set(SFX_ID_RE.findall(path.read_text(encoding="utf-8")))
    groups["spa"] = spa_ids
    groups["static_bundle"] = set(SFX_ID_RE.findall(STATIC_BUNDLE.read_text(encoding="utf-8")))
    groups["scenario_json"] = set(SFX_ID_RE.findall(SCENARIO_JSON.read_text(encoding="utf-8")))
    return groups


def _serializer_cues() -> set[str]:
    """Cue names `_presentation_cues` can emit (string literals on `cues` lines)."""
    cues: set[str] = set()
    in_func = False
    for line in SERIALIZERS.read_text(encoding="utf-8").splitlines():
        if line.startswith("def _presentation_cues("):
            in_func = True
            continue
        if in_func and line and not line.startswith((" ", "\t")):
            break
        if in_func and ("cues +=" in line or "cues.append(" in line):
            cues |= set(re.findall(r'"([a-z0-9_]+)"', line))
    return cues


def _cue_sfx_map() -> dict[str, str]:
    """The SPA's CUE_SFX cue->sfx-file mapping, parsed from the hook source."""
    source = CUES_HOOK.read_text(encoding="utf-8")
    match = re.search(r"CUE_SFX[^=]*=\s*{(.*?)}", source, re.DOTALL)
    if not match:
        return {}
    return dict(re.findall(r'([a-z0-9_]+):\s*"(sfx_[a-z0-9_]+)"', match.group(1)))


class SfxReferenceIntegrityTest(unittest.TestCase):
    def test_every_referenced_sfx_id_is_a_real_wav(self) -> None:
        missing: list[str] = []
        not_wav: list[str] = []
        all_ids: set[str] = set()
        for group, ids in _referenced_sfx_ids().items():
            all_ids |= ids
            for sfx_id in sorted(ids):
                path = SFX_DIR / f"{sfx_id}.wav"
                if not path.is_file():
                    missing.append(f"{sfx_id} (referenced in {group})")
                    continue
                header = path.read_bytes()[:12]
                if header[:4] != b"RIFF" or header[8:12] != b"WAVE":
                    not_wav.append(f"{sfx_id}: {header!r}")
        self.assertEqual(missing, [], f"Referenced SFX without a file: {missing}")
        self.assertEqual(not_wav, [], f"SFX files without RIFF/WAVE magic: {not_wav}")
        # Guard-the-guard: the scan must actually see the known id population.
        # If the regex or source paths rot, this catches the vacuous pass.
        self.assertGreaterEqual(
            len(all_ids), 8, f"SFX scan looks vacuous — only found {sorted(all_ids)}"
        )

    def test_serializer_audio_cues_map_to_real_wavs(self) -> None:
        cues = _serializer_cues()
        cue_sfx = _cue_sfx_map()
        # Guard-the-guard: both parsers must find the known populations
        # (serializers emits alarm/shake/sting/glitch/vignette/drone/pickup;
        # CUE_SFX maps the five audible ones).
        self.assertGreaterEqual(len(cues), 5, f"cue parse looks vacuous: {sorted(cues)}")
        self.assertGreaterEqual(len(cue_sfx), 5, f"CUE_SFX parse looks vacuous: {cue_sfx}")
        self.assertTrue(
            set(cue_sfx) & cues, "CUE_SFX and serializer cues share no names — parser rot?"
        )
        for cue in sorted(cues):
            sfx_id = cue_sfx.get(cue)
            if sfx_id is None:
                continue  # visual-only cue (shake/vignette) — no audio half
            path = SFX_DIR / f"{sfx_id}.wav"
            self.assertTrue(path.is_file(), f"cue '{cue}' -> {sfx_id}.wav missing")
            header = path.read_bytes()[:12]
            self.assertEqual(header[:4], b"RIFF", f"{sfx_id}.wav lacks RIFF magic")
            self.assertEqual(header[8:12], b"WAVE", f"{sfx_id}.wav lacks WAVE magic")


if __name__ == "__main__":
    unittest.main()

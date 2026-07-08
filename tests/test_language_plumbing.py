"""Language plumbing + EN generation (S0 + S1).

S0 threaded the target output language end-to-end from RuntimeOptions through
build_runtime_narrative_context into the NarrativeContext the Narrative Director receives
and the dual-model prompt builders (behavior-preserving — both languages rendered Korean).

S1 lands the English surface: an English storyteller/system prompt, an English JSON
contract, an English opening instruction, and an English deterministic fallback scene,
all selected by ``context.language == "en"``. See docs/plans/2026-06-27-en-ko-localization.md §3.
"""

import re
import unittest
from datetime import UTC, datetime

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_narrative.director import NarrativeDirector
from mythos_narrative.prompts import (
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_SYSTEM_PROMPT_EN,
    JSON_CONTRACT_EN,
    STORY_SYSTEM_PROMPT_EN,
    _json_contract,
    _opening_first_scene_instruction,
    _story_system_prompt,
    _system_prompt,
    build_first_scene_messages,
    build_first_story_messages,
    build_next_story_messages,
)
from mythos_narrative.schemas import NarrativeContext
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.scenario import load_scenario, load_scenario_i18n
from mythos_runtime.scenario_context import (
    CHOICE_MIRROR_RULE,
    CHOICE_MIRROR_RULE_EN,
    LANGUAGE_RULE,
    LANGUAGE_RULE_EN,
    _choice_mirror_rule,
    _language_rule,
    _opening_continuity_notes,
    _scenario_structure_notes,
    build_runtime_narrative_context,
)
from mythos_runtime.scenario_directives import load_scenario_directives
from mythos_runtime.story_bible import load_story_bible

_HANGUL = re.compile(r"[가-힣]")

_NOW = datetime(2026, 6, 27, tzinfo=UTC)


def _player() -> PlayerProfile:
    return PlayerProfile("p1", "T", _NOW, _NOW, {"archetype": "ghost"})


def _loop() -> LoopState:
    return LoopState(
        "l", "p1", "neo-seoul", LoopPhase.CONNECT, "data-layer-01", 70, 30, _NOW, None, {}, []
    )


def _context(language: str = "ko") -> NarrativeContext:
    return build_runtime_narrative_context(
        player=_player(),
        loop=_loop(),
        scenario=load_scenario("neo-seoul"),
        turn_index=0,
        recent_events=[],
        memories=[],
        world_memories=[],
        narrative_shards=[],
        novelty_notes=[],
        language=language,
    )


class RuntimeOptionsLanguageTest(unittest.TestCase):
    def test_default_is_ko(self) -> None:
        self.assertEqual(RuntimeOptions().language, "ko")

    def test_accepts_en(self) -> None:
        self.assertEqual(RuntimeOptions(language="en").language, "en")


class NarrativeContextLanguageTest(unittest.TestCase):
    def test_field_default_is_ko(self) -> None:
        self.assertEqual(NarrativeContext.__dataclass_fields__["language"].default, "ko")

    def test_builder_threads_language_to_context(self) -> None:
        # This NarrativeContext is exactly what the director receives, so threading
        # it here == the language reaching the director.
        self.assertEqual(_context(language="en").language, "en")
        self.assertEqual(_context(language="ko").language, "ko")

    def test_builder_default_language_is_ko(self) -> None:
        ctx = build_runtime_narrative_context(
            player=_player(),
            loop=_loop(),
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )
        self.assertEqual(ctx.language, "ko")


class StoryPromptLanguageSeamTest(unittest.TestCase):
    def test_story_builders_consume_language_without_crashing(self) -> None:
        for language in ("ko", "en"):
            ctx = _context(language=language)
            for messages in (build_first_story_messages(ctx), build_next_story_messages(ctx)):
                self.assertEqual(messages[0]["role"], "system")
                self.assertTrue(messages[0]["content"].strip())


def _bare_context(language: str = "ko", *, player_action: str | None = None) -> NarrativeContext:
    """A NarrativeContext built directly (no scenario directives, fallback_scene=None) —
    mirrors mythos_narrative.smoke so the deterministic fallback uses the code default."""
    return NarrativeContext(
        player=_player(),
        loop=_loop(),
        turn_index=0,
        recent_events=[],
        player_action=player_action,
        language=language,
    )


class StorySystemPromptLanguageTest(unittest.TestCase):
    def test_en_selects_english_storyteller_prompt(self) -> None:
        prompt = _story_system_prompt(_context(language="en"))
        self.assertEqual(prompt, STORY_SYSTEM_PROMPT_EN.strip())
        self.assertIn("cinematic English", prompt)
        # The English storyteller prompt must not instruct Korean output.
        self.assertNotIn("한국어", prompt)

    def test_ko_keeps_korean_storyteller_prompt(self) -> None:
        prompt = _story_system_prompt(_context(language="ko"))
        self.assertIn("한국어", prompt)


class SystemPromptAndContractLanguageTest(unittest.TestCase):
    def test_default_system_prompt_selected_by_language(self) -> None:
        # bare context has empty system_prompt → code default, language-selected.
        self.assertEqual(_system_prompt(_bare_context("en")), DEFAULT_SYSTEM_PROMPT_EN)
        self.assertEqual(_system_prompt(_bare_context("ko")), DEFAULT_SYSTEM_PROMPT)

    def test_authored_system_prompt_wins_over_language_default(self) -> None:
        ctx = NarrativeContext(
            player=_player(), loop=_loop(), turn_index=0, recent_events=[],
            system_prompt="AUTHORED", language="en",
        )
        self.assertEqual(_system_prompt(ctx), "AUTHORED")

    def test_json_contract_selected_by_language(self) -> None:
        self.assertIs(_json_contract(_context(language="en")), JSON_CONTRACT_EN)
        # EN contract narration hint is English.
        scene = JSON_CONTRACT_EN["scene"]
        assert isinstance(scene, dict)
        self.assertNotRegex(str(scene["narration"]), _HANGUL)

    def test_en_opening_instruction_is_english(self) -> None:
        instr = _opening_first_scene_instruction(_context(language="en"))
        self.assertIn("FIRST scene", instr)
        self.assertNotRegex(instr, _HANGUL)


class EnglishFallbackSceneTest(unittest.TestCase):
    def test_en_fallback_renders_english_no_action(self) -> None:
        director = NarrativeDirector()
        scene, _payload = director.fallback_scene(_bare_context("en"))
        self.assertNotRegex(scene.narration, _HANGUL)
        self.assertNotRegex(scene.title, _HANGUL)
        for choice in scene.choices:
            self.assertNotRegex(choice.label, _HANGUL)
        # Sanity: it is the C-17 opening beat, in English. (The fallback is now
        # variant-neutral — no named companion — so assert a stable setting word.)
        self.assertIn("C-17", scene.title)
        self.assertIn("underpass", scene.narration)

    def test_en_fallback_renders_english_with_action(self) -> None:
        director = NarrativeDirector()
        ctx = _bare_context("en", player_action="step into the alley")
        scene, payload = director.fallback_scene(ctx)
        self.assertNotRegex(scene.narration, _HANGUL)
        self.assertTrue(scene.narration.startswith("You step into the alley."))
        self.assertEqual(payload.action_result, "Your action has been applied.")

    def test_ko_fallback_still_korean(self) -> None:
        director = NarrativeDirector()
        scene, _payload = director.fallback_scene(_bare_context("ko"))
        self.assertRegex(scene.narration, _HANGUL)
        self.assertIn("정전 구역", scene.title)


class T3aChoiceMirrorRuleTest(unittest.TestCase):
    """P1.5 T3a: narrative↔choice contract — when the prose poses an explicit fork,
    the rendered choices must mirror those options. The rule is a stable-head GM
    note, so it must reach BOTH prompt formats (single-model JSON prompt and the
    dual-model DIRECTIVE NOTES block) in both languages."""

    def test_rule_selected_by_language(self) -> None:
        self.assertIs(_choice_mirror_rule("en"), CHOICE_MIRROR_RULE_EN)
        self.assertIs(_choice_mirror_rule("ko"), CHOICE_MIRROR_RULE)
        self.assertNotRegex(CHOICE_MIRROR_RULE_EN, _HANGUL)
        self.assertRegex(CHOICE_MIRROR_RULE, _HANGUL)

    def test_rule_lands_in_context_notes(self) -> None:
        self.assertIn(CHOICE_MIRROR_RULE, _context("ko").novelty_notes)
        self.assertIn(CHOICE_MIRROR_RULE_EN, _context("en").novelty_notes)

    def test_rule_survives_into_both_prompt_formats(self) -> None:
        # Assert against the rendered messages (not just the context) so the
        # MAX_PROMPT_NOTES windows can never silently drop the contract: the
        # single-model prompt keeps the FIRST notes, the dual-model prompt keeps
        # the LAST — this locks both. The single-model body is JSON-encoded, so
        # match on the newline-free header line rather than the full rule text.
        header = "NARRATIVE-CHOICE CONTRACT"
        for language, rule in (("ko", CHOICE_MIRROR_RULE), ("en", CHOICE_MIRROR_RULE_EN)):
            ctx = _context(language)
            single_body = build_first_scene_messages(ctx)[1]["content"]
            dual_body = build_first_story_messages(ctx)[1]["content"]
            self.assertIn(header, single_body)
            self.assertIn(rule, dual_body)


class S2DirectiveLanguageTest(unittest.TestCase):
    """S2: directives load `<name>.<lang>.md` (graceful fallback to `<name>.md`), and the
    neo-seoul EN directive set is structurally parity with KO (ids/flags/placeholders)."""

    def test_language_rule_selected_by_language(self) -> None:
        self.assertIs(_language_rule("en"), LANGUAGE_RULE_EN)
        self.assertIs(_language_rule("ko"), LANGUAGE_RULE)
        self.assertNotRegex(LANGUAGE_RULE_EN, _HANGUL)

    def test_en_opening_directives_are_english_with_structural_parity(self) -> None:
        ko = load_scenario_directives("neo-seoul", "ko")
        en = load_scenario_directives("neo-seoul", "en")
        self.assertEqual(len(en.opening_beats), len(ko.opening_beats))
        self.assertGreater(len(en.opening_beats), 0)
        for b_ko, b_en in zip(ko.opening_beats, en.opening_beats):
            # Structural ids/flags/encounter must be byte-identical across languages.
            self.assertEqual(b_en.turn, b_ko.turn)
            self.assertEqual(b_en.beat_id, b_ko.beat_id)
            self.assertEqual(b_en.flags, b_ko.flags)
            self.assertEqual(b_en.start_combat, b_ko.start_combat)
            self.assertEqual(b_en.shot_ref, b_ko.shot_ref)
            # Prose is English (no Hangul), KO retains Hangul.
            self.assertNotRegex(b_en.body, _HANGUL)
            self.assertRegex(b_ko.body, _HANGUL)
        # The first combat trigger id survives translation.
        self.assertEqual(en.opening_beats[-1].start_combat, "patrol_ambush")
        # Placeholders are preserved verbatim.
        self.assertIn("{archetype}", en.opening_beats[0].body)
        self.assertIn("{player_action}", en.opening_beats[1].body)
        self.assertIn("{shot_title}", en.opening_beats[1].body)

    def test_en_fallback_directive_is_english_with_parity(self) -> None:
        ko = load_scenario_directives("neo-seoul", "ko").fallback_scene
        en = load_scenario_directives("neo-seoul", "en").fallback_scene
        assert ko is not None and en is not None
        self.assertNotRegex(str(en["narration_no_action"]), _HANGUL)
        self.assertEqual(
            [c["suffix"] for c in en["choices"]], [c["suffix"] for c in ko["choices"]]
        )
        self.assertEqual(
            [c["intent"] for c in en["choices"]], [c["intent"] for c in ko["choices"]]
        )

    def test_en_stat_voices_and_encounters_preserve_placeholders(self) -> None:
        en = load_scenario_directives("neo-seoul", "en")
        ko = load_scenario_directives("neo-seoul", "ko")
        assert en.stat_voices is not None and ko.stat_voices is not None
        self.assertEqual(set(en.stat_voices.descriptions), set(ko.stat_voices.descriptions))
        self.assertIn("{name}", en.stat_voices.max_template)
        self.assertIn("{name_first}", en.stat_voices.min_template)
        assert en.encounters is not None
        self.assertIn("{player_action}", en.encounters.travel_template)
        self.assertIn("{stability}", en.encounters.emergency_low_stability_template)
        self.assertIn("{tension}", en.encounters.emergency_high_tension_template)
        self.assertNotRegex(en.naming_rule, _HANGUL)
        self.assertIn("Se-rin", en.naming_rule)

    def test_unlocalized_scenario_falls_back_to_korean(self) -> None:
        # glass-library ships no .en.md directives → en load returns the .md (Korean) ones.
        en = load_scenario_directives("glass-library", "en")
        ko = load_scenario_directives("glass-library", "ko")
        self.assertEqual(
            [b.beat_id for b in en.opening_beats], [b.beat_id for b in ko.opening_beats]
        )


class S2bScenarioProseOverlayTest(unittest.TestCase):
    """S2b: additive i18n/<lang>.json overlay supplies English scenario prose
    (brief + session_intro) at point of injection; ko / no-overlay is unchanged."""

    def test_overlay_loads_for_en_empty_for_ko(self) -> None:
        ov = load_scenario_i18n("neo-seoul", "en")
        self.assertTrue(str(ov.get("brief", "")).startswith("WORLD: Neo-Seoul"))
        self.assertNotRegex(str(ov["brief"]), _HANGUL)
        # ko (and any scenario/language without an overlay file) returns {} → KO source as-is.
        self.assertEqual(load_scenario_i18n("neo-seoul", "ko"), {})
        self.assertEqual(load_scenario_i18n("neo-seoul", "fr"), {})
        # glass-library now ships an EN overlay too (both scenarios localized).
        self.assertNotRegex(str(load_scenario_i18n("glass-library", "en").get("brief", "")), _HANGUL)
        self.assertEqual(load_scenario_i18n("glass-library", "ko"), {})

    def test_opening_continuity_uses_english_overlay_prose_and_framing(self) -> None:
        scenario = load_scenario("neo-seoul")
        ov = load_scenario_i18n("neo-seoul", "en")
        lines = _opening_continuity_notes(scenario, turn_index=1, language="en", scenario_i18n=ov)
        blob = "\n".join(lines)
        self.assertIn("OPENING CINEMATIC CONTINUITY — top-priority", blob)
        self.assertIn("Se-rin finds you in the rain", blob)  # overlay shot title (English)
        self.assertNotRegex(blob, _HANGUL)

    def test_opening_continuity_ko_unchanged(self) -> None:
        scenario = load_scenario("neo-seoul")
        lines = _opening_continuity_notes(scenario, turn_index=1)  # default ko, no overlay
        blob = "\n".join(lines)
        self.assertIn("오프닝 시네마틱 연속성", blob)
        self.assertIn("빗속에서 세린이", blob)  # KO source shot title

    def test_brief_note_localized_in_en_context(self) -> None:
        ctx_en = _context(language="en")
        ctx_ko = _context(language="ko")
        brief_en = next(n for n in ctx_en.novelty_notes if n.startswith("SCENARIO_BRIEF"))
        brief_ko = next(n for n in ctx_ko.novelty_notes if n.startswith("SCENARIO_BRIEF"))
        self.assertNotRegex(brief_en, _HANGUL)
        self.assertRegex(brief_ko, _HANGUL)

    def test_structure_notes_localized_in_en(self) -> None:
        scenario = load_scenario("neo-seoul")
        en = _scenario_structure_notes(scenario, load_scenario_i18n("neo-seoul", "en"))
        ko = _scenario_structure_notes(scenario)  # no overlay
        en_blob, ko_blob = "\n".join(en), "\n".join(ko)
        self.assertNotRegex(en_blob, _HANGUL)
        self.assertIn("Act 1: The Falling Signal", en_blob)
        self.assertIn("Safe Refuge", en_blob)  # ending name localized despite source id
        self.assertIn("Administrator IX", en_blob)  # npc agenda key localized
        # KO unchanged (same note count, Korean prose).
        self.assertEqual(len(en), len(ko))
        self.assertRegex(ko_blob, _HANGUL)

    def test_localized_named_items_never_drops_on_short_overlay(self) -> None:
        scenario = load_scenario("neo-seoul")
        # A truncated overlay must still emit every source item (per-item fallback).
        partial = {"main_arcs": [{"title": "Act 1: The Falling Signal", "summary": "x"}]}  # 1 of N
        notes = _scenario_structure_notes(scenario, partial)
        arcs_note = next(n for n in notes if n.startswith("SCENARIO_MAIN_ARCS"))
        self.assertIn("Act 1: The Falling Signal", arcs_note)  # localized item 0
        self.assertRegex(arcs_note, _HANGUL)  # remaining arcs fall back to KO source


class S4StoryBibleLanguageTest(unittest.TestCase):
    """S4: the story bible loads `bible.<lang>.json` (graceful fallback to bible.json),
    and the neo-seoul EN bible is structurally parity with KO (ids/when/tags/priority)
    so the same entries are selected — only the prose is English."""

    def test_en_bible_parity_with_ko(self) -> None:
        ko = load_story_bible("neo-seoul", "ko")
        en = load_story_bible("neo-seoul", "en")
        self.assertGreater(len(en.entries), 0)
        self.assertEqual(len(en.entries), len(ko.entries))
        for e_ko, e_en in zip(ko.entries, en.entries):
            # Selection-driving / machine fields must be byte-identical across languages.
            self.assertEqual(e_en.entry_id, e_ko.entry_id)
            self.assertEqual(e_en.when, e_ko.when)
            self.assertEqual(e_en.tags, e_ko.tags)
            self.assertEqual(e_en.priority, e_ko.priority)
            self.assertEqual(e_en.kind, e_ko.kind)
            # Prose is English (no Hangul); KO retains Hangul.
            self.assertNotRegex(e_en.title + e_en.summary + e_en.content, _HANGUL)
            self.assertRegex(e_ko.title + e_ko.summary + e_ko.content, _HANGUL)

    def test_unlocalized_scenario_bible_falls_back_to_ko(self) -> None:
        # glass-library ships no bible.en.json → en load returns the bible.json entries.
        en = load_story_bible("glass-library", "en")
        ko = load_story_bible("glass-library", "ko")
        self.assertEqual(
            [e.entry_id for e in en.entries], [e.entry_id for e in ko.entries]
        )


if __name__ == "__main__":
    unittest.main()

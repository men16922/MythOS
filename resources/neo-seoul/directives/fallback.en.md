# Neo-Seoul Fallback Scene Directives (English)
#
# English variant of fallback.md. The deterministic fallback SCENE the Narrative
# Director serves when LLM generation fails. Branch logic stays in
# director._fallback_payload; all prose lives here. Loaded for language="en" via
# load_scenario_directives(..., "en") → NarrativeContext.fallback_scene; falls back to
# fallback.md (Korean) when absent, and to mythos_narrative.fallbacks when neither exists.
#
# Scalar fields are file-level meta; multi-line prose lives in `##` blocks.
# novelty_hint bodies are appended directly after a narration, so the loader
# re-adds the single leading space they need (authored here without it).

title_default: C-17 Blackout Zone
title_novelty: C-17's Changed Warning Signal
title_with_action: The Next Alley in the Rain
location: C-17 Neon Alley (outdoors, rain)
objective_turn0: Escape the C-17 blackout zone together with Se-rin.

## narration_no_action
---
The emergency lights of the C-17 underpass go out one row at a time. Across the wet concrete your nameless signal bleeds faintly, and from the exit a surveillance drone's red searchlight cuts down through the rain.

Jung Se-rin keeps her bike upright and looks back. She does not explain much. She checks the deletion mark on your wrist, then says low, "Not registered, right? Then you're still a person. Run."

The shutter is halfway down. You have to grab Se-rin's hand and bolt for the drainage channel, or read the drone's search pattern first and pick a path that won't be cut off.

## narration_with_action
---
Se-rin hauls you by your wet jacket sleeve, and the surveillance lens on the underpass ceiling turns its head a beat too late. Rainwater streams down the stairs, and from far off a patrol drone's propellers push their sound into the narrow corridor. Stop now and the control grid catches your signal again. You have to keep moving forward.

## novelty_hint (variant=notes)
---
As if avoiding the same path as the last loop, the signal light at the alley's end turns red a beat late.

## novelty_hint (variant=memories)
---
An afterimage of a stored memory grazes past, but this time it does not harden into the same scene.

## visual_brief
---
Neo-Seoul C-17 underpass in heavy rain, emergency lights failing, red surveillance drone beams, Jung Se-rin on a motorbike reaching for the player, wet concrete, half-closed security shutter, cinematic cyberpunk chase scene.

## choice (suffix=approach, intent=explore)
---
Follow Se-rin into the drainage channel

## choice (suffix=listen, intent=interact)
---
Read the drone's searchlight pattern first

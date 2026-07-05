# Neo-Seoul Opening Variant — Han (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 0

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // SHORTCUT)
location_lock: Outdoors, rainy C-17 welfare-block passage — before a closing shutter
mandatory_event: Re-entry awakening + a stranger points out a shortcut and vanishes (a brushing encounter, no joining)
forbidden: Confirming the man's identity / recruiting him, Jung Se-rin appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // SHORTCUT): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes in a narrow welfare-block passage with the déjà vu of repetition; they know this city is not new to them (past-loop afterimages in one or two sensory fragments only). At the end of the passage a security shutter begins to descend with a warning tone — the patrol-hour sector lockdown. The scene's mandatory event: just before the shutter seals, a **big man in work clothes brushes out of the dark**, wordlessly taps a drainage cover on the wall with the toe of his boot — a shortcut the patrols never reach — and disappears to the far side of the shutter leaving neither name nor reason. Too gruff to be kindness, too precise to be chance. Important: do not reveal the man's (Han's) identity or complete any conversation/recruitment — leave only a passing silhouette and the gesture. Jung Se-rin does not appear either. Focus on filmable sensations: the pressure of the descending shutter, the smell of rain-soaked work clothes, the dark below the drainage cover. All narration and choices for this scene must be written in English.
Choice generation guide (no combat):
 1) A shortcut-taking choice like "Slip into the drain he pointed out"
 2) A remembering choice like "Fix the vanishing man's back in your memory"
 3) A wary choice like "Decline unexplained favors — find another way"
Important: this is an awakening/hook beat — never start combat. world_delta.start_combat must be null, and do not set met_han or any meeting flag (the meeting is completed by its arc on the operation map).
